import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import os from 'node:os';
import path from 'path';

function resolveProjectariumBaseUrl(env: Record<string, string>): string {
  return (
    env.PROJECTARIUM_URL ||
    env.CORE_COMBINATOR_URL ||
    'http://127.0.0.1:3000/api'
  ).replace(/\/+$/, '');
}

function isLocalHostname(hostname: string): boolean {
  const norm = hostname.toLowerCase();
  return norm === 'localhost' || norm === '127.0.0.1' || norm === '::1';
}

function resolveAdvertisedHost(projectariumBaseUrl: string, env: Record<string, string>): {
  host: string;
  networkMode: 'local' | 'lan';
} {
  if (env.PROJECTARIUM_APP_HOST) {
    const h = env.PROJECTARIUM_APP_HOST.trim();
    return { host: h, networkMode: isLocalHostname(h) ? 'local' : 'lan' };
  }

  try {
    const targetHostname = new URL(projectariumBaseUrl).hostname;
    if (!isLocalHostname(targetHostname)) {
      const targetPrefix = targetHostname.split('.').slice(0, 3).join('.');
      const nets = os.networkInterfaces();
      let fallbackIp: string | null = null;
      for (const addrs of Object.values(nets)) {
        for (const addr of addrs || []) {
          if (addr.family === 'IPv4' && !addr.internal) {
            if (addr.address.startsWith(`${targetPrefix}.`)) {
              return { host: addr.address, networkMode: 'lan' };
            }
            if (!fallbackIp) fallbackIp = addr.address;
          }
        }
      }
      if (fallbackIp) {
        return { host: fallbackIp, networkMode: 'lan' };
      }
    }
  } catch {
    // Fall back to localhost
  }

  return { host: 'localhost', networkMode: 'local' };
}

function projectariumVitePlugin(defaultPort: number, env: Record<string, string>): Plugin {
  const enabled = env.ENABLE_PROJECTARIUM !== 'false';
  const baseUrl = resolveProjectariumBaseUrl(env);
  const { host, networkMode } = resolveAdvertisedHost(baseUrl, env);

  let registration: { instanceId: string; leaseToken: string } | null = null;
  let heartbeatTimer: NodeJS.Timeout | null = null;

  const release = async () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    if (!registration) return;
    const reg = registration;
    registration = null;
    try {
      await fetch(`${baseUrl}/projectarium/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceId: reg.instanceId,
          leaseToken: reg.leaseToken,
          author: 'feed-watchers',
        }),
        signal: AbortSignal.timeout(3000),
      });
    } catch {
      // Best-effort release
    }
  };

  return {
    name: 'projectarium-register',
    apply: 'serve',
    configureServer(server) {
      if (!enabled) return;

      server.httpServer?.once('listening', async () => {
        const addr = server.httpServer?.address();
        const actualPort =
          addr && typeof addr === 'object' && 'port' in addr
            ? addr.port
            : defaultPort;

        try {
          const res = await fetch(`${baseUrl}/projectarium/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectSlug: 'lemon-watchers',
              projectName: 'Lemon Watchers',
              appName: 'feed-watchers-ui',
              host,
              role: 'Watchers Pre-Moderation News Feed UI',
              icon: 'newspaper',
              preferredPort: actualPort,
              environment: 'dev',
              networkMode,
              healthUrl: `http://${host}:${actualPort}/`,
              author: 'feed-watchers',
            }),
            signal: AbortSignal.timeout(4000),
          });

          if (!res.ok) {
            console.warn(
              `⚠️ [Projectarium] feed-watchers registration returned HTTP ${res.status}`
            );
            return;
          }

          const data = (await res.json()) as any;
          const app = data.allocatedApp || data.app;
          if (!app?.instanceId || !app?.leaseToken) return;

          registration = {
            instanceId: app.instanceId,
            leaseToken: app.leaseToken,
          };

          console.log(
            `🛡️ [Projectarium] Registered feed-watchers-ui on stand "lemon-watchers" (host: ${host}, port: ${app.port ?? actualPort}, instance: ${app.instanceId})`
          );

          heartbeatTimer = setInterval(() => {
            if (!registration) return;
            fetch(`${baseUrl}/projectarium/heartbeat`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                instanceId: registration.instanceId,
                leaseToken: registration.leaseToken,
              }),
              signal: AbortSignal.timeout(3000),
            }).catch(() => {});
          }, 20_000);
          heartbeatTimer.unref();
        } catch (err: any) {
          console.warn(
            `⚠️ [Projectarium] Unavailable for feed-watchers (${baseUrl}): ${err?.message || err}`
          );
        }
      });

      server.httpServer?.once('close', () => {
        void release();
      });
    },
  };
}

async function resolveWatchersProxyTarget(env: Record<string, string>): Promise<string> {
  if (env.VITE_WATCHERS_PROXY_TARGET) {
    return env.VITE_WATCHERS_PROXY_TARGET;
  }
  const projectariumBase = resolveProjectariumBaseUrl(env);

  try {
    const res = await fetch(`${projectariumBase}/projectarium/pool`, {
      signal: AbortSignal.timeout(1500),
    });
    if (res.ok) {
      const pool = (await res.json()) as Array<{
        projectSlug?: string;
        app?: { appName?: string; host?: string; port?: number; status?: string };
      }>;
      const matches = pool.filter(
        (entry) =>
          entry.projectSlug === 'lemon-watchers' &&
          entry.app?.appName === 'lemon-watchers-api' &&
          typeof entry.app?.port === 'number'
      );
      const online = matches.reverse().find((m) => m.app?.status === 'ONLINE') || matches[0];
      if (online?.app?.port) {
        const projectariumHost = new URL(projectariumBase).hostname;
        const appHost = online.app.host || '127.0.0.1';
        const targetHost =
          isLocalHostname(appHost) && !isLocalHostname(projectariumHost)
            ? projectariumHost
            : appHost;
        return `http://${targetHost}:${online.app.port}`;
      }
    }
  } catch {
    // Fallback to default port
  }
  return 'http://127.0.0.1:3040';
}

export default defineConfig(async ({ mode }) => {
  const envDir = path.resolve(__dirname, '../../');
  const env = { ...loadEnv(mode, envDir, ''), ...(process.env as Record<string, string>) };
  const port = Number(process.env.VITE_PORT || process.env.PORT || env.VITE_WATCHERS_PORT || 5182);
  const watchersTarget = await resolveWatchersProxyTarget(env);

  return {
    envDir,
    plugins: [react(), projectariumVitePlugin(port, env)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@feed-core': path.resolve(__dirname, '../feed-app/src/core'),
        '@lenta/shared': path.resolve(__dirname, '../../packages/shared/src'),
        '@lenta/seasons-neurons': path.resolve(__dirname, '../../packages/seasons-neurons/dist'),
      },
      dedupe: ['react', 'react-dom', 'lucide-react', 'react-markdown', 'remark-gfm'],
    },
    server: {
      port,
      host: true,
      allowedHosts: true,
      fs: {
        allow: [path.resolve(__dirname, '../..')],
      },
      proxy: {
        '/watchers-api': {
          target: watchersTarget,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/watchers-api/, ''),
        },
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      chunkSizeWarningLimit: 600,
    },
  };
});
