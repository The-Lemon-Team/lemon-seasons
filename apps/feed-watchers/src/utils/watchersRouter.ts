import { StreamNewsStatus } from '../types';

export interface WatchersRouteState {
  category: string;
  watcher: string;
  status: StreamNewsStatus | 'ALL';
  search: string;
  manage: boolean;
}

const VALID_STATUSES = new Set<string>(['NEW', 'PROMOTED', 'DISMISSED', 'ALL']);

export function parseWatchersRoute(
  pathname = typeof window !== 'undefined' ? window.location.pathname : '/',
  search = typeof window !== 'undefined' ? window.location.search : ''
): WatchersRouteState {
  const params = new URLSearchParams(search);
  const segments = pathname.replace(/\/+$/, '').split('/').filter(Boolean);

  let category = '';
  if (segments[0]?.toLowerCase() === 'watchers') {
    category = segments[1] ? decodeURIComponent(segments[1]) : '';
  } else if (segments.length === 1 && segments[0]) {
    category = decodeURIComponent(segments[0]);
  }

  const rawStatus = (params.get('status') || 'NEW').toUpperCase();
  const status: StreamNewsStatus | 'ALL' = VALID_STATUSES.has(rawStatus)
    ? (rawStatus as StreamNewsStatus | 'ALL')
    : 'NEW';

  const watcher = params.get('watcher') || '';
  const searchQuery = params.get('q') || params.get('search') || '';
  const manageParam = (params.get('manage') || '').toLowerCase();
  const manage = manageParam === '1' || manageParam === 'true';

  return {
    category,
    watcher,
    status,
    search: searchQuery,
    manage,
  };
}

export function buildWatchersRouteUrl(
  state: WatchersRouteState,
  options: { embedded?: boolean } = {}
): string {
  if (typeof window === 'undefined') return '/watchers';

  const currentUrl = new URL(window.location.href);
  const params = new URLSearchParams(currentUrl.search);

  if (state.status && state.status !== 'NEW') {
    params.set('status', state.status);
  } else {
    params.delete('status');
  }

  if (state.watcher) {
    params.set('watcher', state.watcher);
  } else {
    params.delete('watcher');
  }

  if (state.search.trim()) {
    params.set('q', state.search.trim());
  } else {
    params.delete('q');
  }
  params.delete('search');

  if (state.manage) {
    params.set('manage', '1');
  } else {
    params.delete('manage');
  }

  let nextPathname = currentUrl.pathname;
  if (!options.embedded) {
    nextPathname = state.category
      ? `/watchers/${encodeURIComponent(state.category)}`
      : '/watchers';
  }

  const qs = params.toString();
  return qs ? `${nextPathname}?${qs}` : nextPathname;
}

export function pushWatchersRoute(
  state: WatchersRouteState,
  options: { embedded?: boolean; replace?: boolean } = {}
): void {
  if (typeof window === 'undefined') return;
  try {
    const nextUrl = buildWatchersRouteUrl(state, { embedded: options.embedded });
    const currentUrl = window.location.pathname + window.location.search;
    if (nextUrl === currentUrl) return;
    if (options.replace) {
      window.history.replaceState(null, '', nextUrl);
    } else {
      window.history.pushState(null, '', nextUrl);
    }
  } catch (err) {
    console.warn('[watchersRouter] Failed to sync URL:', err);
  }
}
