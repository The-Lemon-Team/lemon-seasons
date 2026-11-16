export const API_PROXY_PREFIX = '/_api';

const PROD_CONTAINER_PORTS = new Set(['5173', '5174', '5175', '8080', '8090', '80', '443']);

/**
 * Resolves the API base URL for browser clients.
 * Returns `API_PROXY_PREFIX` (`'/_api'`) in production builds, Docker nginx ports, or remote LAN/VPN hosts
 * so nginx/Vite proxy forwards API and `/uploads` requests without colliding with SPA routes like `/notes` or `/feeds`.
 */
export function resolveClientApiBaseUrl(
  viteApiUrl?: string,
  isProdBuild = false,
  devPort = 3002,
): string {
  if (typeof window !== 'undefined') {
    const { hostname, port } = window.location;
    if (
      (hostname !== 'localhost' && hostname !== '127.0.0.1') ||
      PROD_CONTAINER_PORTS.has(port)
    ) {
      return API_PROXY_PREFIX;
    }
  }

  if (viteApiUrl !== undefined && viteApiUrl !== '') {
    if (isProdBuild && viteApiUrl.includes(`:${devPort}`)) {
      return API_PROXY_PREFIX;
    }
    return viteApiUrl.replace(/\/+$/, '');
  }

  return isProdBuild ? API_PROXY_PREFIX : `http://localhost:${devPort}`;
}

/**
 * Resolves a peer web-app URL (e.g. Calendar, Admin CMS, Feed App) dynamically based on
 * the current browser host when running in production containers or accessed remotely.
 */
export function resolvePeerAppUrl(
  envUrl: string | undefined,
  prodPort: number,
  devPort: number,
  isProdBuild = false,
): string {
  const isBrowser = typeof window !== 'undefined';
  const hostname = isBrowser ? window.location.hostname : 'localhost';
  const protocol = isBrowser ? window.location.protocol : 'http:';
  const port = isBrowser ? window.location.port : '';
  const isRemoteHost = hostname !== 'localhost' && hostname !== '127.0.0.1';
  const isProdContext = isProdBuild || isRemoteHost || PROD_CONTAINER_PORTS.has(port);

  if (envUrl) {
    const normalized = envUrl.replace(/\/+$/, '');
    const pointsToLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(normalized);
    if (!isProdContext || !pointsToLocalhost) {
      return normalized;
    }
  }

  const targetPort = isProdContext ? prodPort : devPort;
  return `${protocol}//${hostname}:${targetPort}`;
}

/**
 * Builds an absolute or relative asset URL using the resolved API base URL.
 */
export function resolveMediaAssetUrl(url: string | null | undefined, apiBase: string): string {
  if (!url) return '';
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  const cleanBase = apiBase.replace(/\/+$/, '');
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${cleanBase}${cleanPath}`;
}
