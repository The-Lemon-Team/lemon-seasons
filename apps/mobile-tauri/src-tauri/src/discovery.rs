//! Backend discovery: decides whether the app is "online", meaning it is on Wi-Fi and a
//! paired backend answers on one of the configured addresses.
//!
//! Network detail comes from the OS interface list (a hint — newer Android versions may hide
//! it, in which case `wifi` is `None` and the backend probe alone decides). The authoritative
//! signal is a successful `GET /health` whose `instanceId` matches the paired server.

use serde::{Deserialize, Serialize};
use std::net::{IpAddr, Ipv4Addr};
use std::time::{Duration, Instant};

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Endpoint {
    pub name: String,
    pub url: String,
    /// LAN endpoints only count as "online" while on Wi-Fi.
    #[serde(default)]
    pub lan: bool,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct NetIface {
    pub name: String,
    pub ip: String,
    pub private: bool,
    pub wifi_like: bool,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ProbeResult {
    pub name: String,
    pub url: String,
    pub lan: bool,
    pub ok: bool,
    pub instance_id: Option<String>,
    pub latency_ms: Option<u64>,
    pub error: Option<String>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveryResult {
    /// `Some(true/false)` when interfaces are visible, `None` when the OS hides them.
    pub wifi: Option<bool>,
    pub interfaces: Vec<NetIface>,
    pub probes: Vec<ProbeResult>,
    pub selected: Option<ProbeResult>,
    /// True when a paired LAN backend is reachable.
    pub online: bool,
}

pub fn is_private_v4(ip: &Ipv4Addr) -> bool {
    ip.is_private() || ip.is_link_local()
}

pub fn is_wifi_like(name: &str) -> bool {
    let n = name.to_lowercase();
    n.starts_with("wlan") || n.starts_with("wl") || n.starts_with("wifi") || n == "en0"
}

pub fn list_interfaces() -> Vec<NetIface> {
    if_addrs::get_if_addrs()
        .unwrap_or_default()
        .into_iter()
        .filter(|i| !i.is_loopback())
        .filter_map(|i| match i.ip() {
            IpAddr::V4(v4) => Some(NetIface {
                wifi_like: is_wifi_like(&i.name),
                private: is_private_v4(&v4),
                name: i.name,
                ip: v4.to_string(),
            }),
            IpAddr::V6(_) => None,
        })
        .collect()
}

pub fn wifi_state(interfaces: &[NetIface]) -> Option<bool> {
    if interfaces.is_empty() {
        return None;
    }
    Some(interfaces.iter().any(|i| i.wifi_like && i.private))
}

/// Picks the first probe (in the user's priority order) that is healthy, matches the paired
/// server and — for LAN endpoints — is allowed by the Wi-Fi state.
pub fn select_probe(
    probes: &[ProbeResult],
    expected_instance_id: Option<&str>,
    wifi: Option<bool>,
) -> Option<ProbeResult> {
    probes
        .iter()
        .find(|p| {
            p.ok
                && expected_instance_id.map_or(true, |id| p.instance_id.as_deref() == Some(id))
                && (!p.lan || wifi != Some(false))
        })
        .cloned()
}

async fn probe(client: &reqwest::Client, ep: &Endpoint) -> ProbeResult {
    let url = format!("{}/health", ep.url.trim_end_matches('/'));
    let started = Instant::now();
    let mut result = ProbeResult {
        name: ep.name.clone(),
        url: ep.url.clone(),
        lan: ep.lan,
        ok: false,
        instance_id: None,
        latency_ms: None,
        error: None,
    };
    match client.get(&url).send().await {
        Ok(resp) if resp.status().is_success() => {
            let body: serde_json::Value = resp.json().await.unwrap_or_default();
            result.ok = body.get("status").and_then(|s| s.as_str()) == Some("ok");
            result.instance_id = body
                .get("instanceId")
                .and_then(|s| s.as_str())
                .map(str::to_owned);
            result.latency_ms = Some(started.elapsed().as_millis() as u64);
            if !result.ok {
                result.error = Some("unhealthy".into());
            }
        }
        Ok(resp) => result.error = Some(format!("HTTP {}", resp.status())),
        Err(e) => result.error = Some(e.to_string()),
    }
    result
}

pub async fn discover(
    endpoints: Vec<Endpoint>,
    expected_instance_id: Option<String>,
    timeout_ms: u64,
) -> Result<DiscoveryResult, String> {
    let interfaces = list_interfaces();
    let wifi = wifi_state(&interfaces);

    let client = reqwest::Client::builder()
        .timeout(Duration::from_millis(timeout_ms))
        .build()
        .map_err(|e| e.to_string())?;

    // Probe all endpoints concurrently, then keep the user's priority order.
    let handles: Vec<_> = endpoints
        .into_iter()
        .map(|ep| {
            let client = client.clone();
            tauri::async_runtime::spawn(async move { probe(&client, &ep).await })
        })
        .collect();
    let mut probes = Vec::with_capacity(handles.len());
    for h in handles {
        if let Ok(p) = h.await {
            probes.push(p);
        }
    }

    let selected = select_probe(&probes, expected_instance_id.as_deref(), wifi);
    let online = selected.as_ref().map_or(false, |p| p.lan);
    Ok(DiscoveryResult { wifi, interfaces, probes, selected, online })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn p(name: &str, lan: bool, ok: bool, id: Option<&str>) -> ProbeResult {
        ProbeResult {
            name: name.into(),
            url: format!("http://{name}"),
            lan,
            ok,
            instance_id: id.map(str::to_owned),
            latency_ms: Some(5),
            error: None,
        }
    }

    #[test]
    fn private_ranges() {
        assert!(is_private_v4(&"192.168.1.10".parse().unwrap()));
        assert!(is_private_v4(&"10.0.0.5".parse().unwrap()));
        assert!(is_private_v4(&"172.16.4.1".parse().unwrap()));
        assert!(!is_private_v4(&"8.8.8.8".parse().unwrap()));
    }

    #[test]
    fn wifi_names() {
        assert!(is_wifi_like("wlan0"));
        assert!(!is_wifi_like("rmnet_data1"));
        assert!(!is_wifi_like("ccmni0"));
    }

    #[test]
    fn wifi_state_from_interfaces() {
        assert_eq!(wifi_state(&[]), None);
        let wifi = NetIface { name: "wlan0".into(), ip: "192.168.1.5".into(), private: true, wifi_like: true };
        let cell = NetIface { name: "rmnet0".into(), ip: "10.1.2.3".into(), private: true, wifi_like: false };
        assert_eq!(wifi_state(&[wifi]), Some(true));
        assert_eq!(wifi_state(&[cell]), Some(false));
    }

    #[test]
    fn selects_first_healthy_in_priority_order() {
        let probes = vec![p("home", true, false, None), p("vpn", true, true, Some("A")), p("pub", false, true, Some("A"))];
        let sel = select_probe(&probes, Some("A"), Some(true)).unwrap();
        assert_eq!(sel.name, "vpn");
    }

    #[test]
    fn rejects_foreign_server_on_same_lan() {
        let probes = vec![p("home", true, true, Some("OTHER"))];
        assert!(select_probe(&probes, Some("MINE"), Some(true)).is_none());
    }

    #[test]
    fn first_pairing_accepts_any_instance() {
        let probes = vec![p("home", true, true, Some("X"))];
        assert!(select_probe(&probes, None, Some(true)).is_some());
    }

    #[test]
    fn lan_endpoint_ignored_when_not_on_wifi() {
        let probes = vec![p("home", true, true, Some("A")), p("pub", false, true, Some("A"))];
        let sel = select_probe(&probes, Some("A"), Some(false)).unwrap();
        assert_eq!(sel.name, "pub");
        assert!(!sel.lan); // reachable, but not "online" (LAN) status
    }
}
