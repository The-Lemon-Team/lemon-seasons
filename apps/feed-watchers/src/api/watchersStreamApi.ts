import axios from 'axios';
import {
  PaginatedStreamNews,
  StreamNewsStatus,
  WatcherFolder,
  WatcherState,
  WatcherStreamItem,
} from '../types';

export function resolveWatchersApiBaseUrl(): string {
  const custom = import.meta.env.VITE_WATCHERS_API_URL;
  if (typeof custom === 'string' && custom.trim().length > 0) {
    return custom.replace(/\/+$/, '');
  }
  return '/watchers-api';
}

const client = axios.create({
  timeout: 30000,
});

export const watchersStreamApi = {
  getSseUrl(options: { categories?: string[]; watchers?: string[]; replay?: number } = {}): string {
    const base = resolveWatchersApiBaseUrl();
    const params = new URLSearchParams();
    if (options.categories && options.categories.length > 0) {
      params.set('categories', options.categories.join(','));
    }
    if (options.watchers && options.watchers.length > 0) {
      params.set('watchers', options.watchers.join(','));
    }
    params.set('replay', String(options.replay ?? 20));
    return `${base}/api/v1/streams/live?${params.toString()}`;
  },

  async getFolders(): Promise<WatcherFolder[]> {
    const base = resolveWatchersApiBaseUrl();
    const { data } = await client.get<{ items: WatcherFolder[] }>(`${base}/api/v1/folders`);
    return data.items || [];
  },

  async getWatchers(): Promise<WatcherState[]> {
    const base = resolveWatchersApiBaseUrl();
    const { data } = await client.get<{ items: WatcherState[] }>(`${base}/api/v1/watchers`);
    return data.items || [];
  },

  async getStreamItems(params: {
    categories?: string[];
    watchers?: string[];
    status?: StreamNewsStatus | 'ALL';
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<PaginatedStreamNews> {
    const base = resolveWatchersApiBaseUrl();
    const query = new URLSearchParams();
    if (params.categories && params.categories.length > 0) {
      query.set('categories', params.categories.join(','));
    }
    if (params.watchers && params.watchers.length > 0) {
      query.set('watchers', params.watchers.join(','));
    }
    if (params.status) query.set('status', params.status);
    if (params.search?.trim()) query.set('search', params.search.trim());
    query.set('limit', String(params.limit ?? 30));
    query.set('offset', String(params.offset ?? 0));

    const { data } = await client.get<PaginatedStreamNews>(
      `${base}/api/v1/streams/items?${query.toString()}`
    );
    return data;
  },

  async promoteItem(id: string): Promise<{ item: WatcherStreamItem; article: any }> {
    const base = resolveWatchersApiBaseUrl();
    const { data } = await client.post<{ item: WatcherStreamItem; article: any }>(
      `${base}/api/v1/streams/items/${encodeURIComponent(id)}/promote`
    );
    return data;
  },

  async batchPromote(ids: string[]): Promise<{ count: number; articles: any[] }> {
    const base = resolveWatchersApiBaseUrl();
    const { data } = await client.post<{ count: number; articles: any[] }>(
      `${base}/api/v1/streams/items/batch-promote`,
      { ids }
    );
    return data;
  },

  async dismissItem(id: string): Promise<{ item: WatcherStreamItem }> {
    const base = resolveWatchersApiBaseUrl();
    const { data } = await client.post<{ item: WatcherStreamItem }>(
      `${base}/api/v1/streams/items/${encodeURIComponent(id)}/dismiss`
    );
    return data;
  },

  async batchDismiss(ids: string[]): Promise<{ count: number; items: WatcherStreamItem[] }> {
    const base = resolveWatchersApiBaseUrl();
    const { data } = await client.post<{ count: number; items: WatcherStreamItem[] }>(
      `${base}/api/v1/streams/items/batch-dismiss`,
      { ids }
    );
    return data;
  },

  async triggerAllWatchers(): Promise<{ message: string }> {
    const base = resolveWatchersApiBaseUrl();
    const { data } = await client.post<{ message: string }>(
      `${base}/api/v1/watchers/trigger-all`
    );
    return data;
  },

  async pruneExpired(ttlHours?: number): Promise<{ pruned: number; ttlHours: number }> {
    const base = resolveWatchersApiBaseUrl();
    const { data } = await client.post<{ pruned: number; ttlHours: number }>(
      `${base}/api/v1/streams/prune`,
      ttlHours ? { ttlHours } : {}
    );
    return data;
  },
};
