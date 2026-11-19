import {
  CreateWatcherInput,
  PaginatedWatcherStreamNews,
  ValidateWatcherFeedResult,
  WatcherFolder,
  WatcherPingRecord,
  WatcherSseUrlOptions,
  WatcherState,
  WatcherStreamItem,
  WatcherStreamQueryOptions,
} from '../types/watchers.types.js';

export interface WatchersApiClientOptions {
  baseUrl: string;
  token?: string;
  fetchImpl?: typeof fetch;
}

/**
 * Strongly-typed HTTP client for Lemon Watchers pre-moderation stream API.
 * Mirrors SeasonsApiClient and ModerationApiClient conventions.
 */
export class WatchersApiClient {
  public readonly baseUrl: string;
  private token?: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: WatchersApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.token = options.token;
    this.fetchFn =
      options.fetchImpl ||
      ((input: RequestInfo | URL, init?: RequestInit) => globalThis.fetch(input, init));
  }

  setToken(token?: string): void {
    this.token = token;
  }

  getToken(): string | undefined {
    return this.token;
  }

  getSseUrl(options: WatcherSseUrlOptions = {}): string {
    const params = new URLSearchParams();
    if (options.categories && options.categories.length > 0) {
      params.set('categories', options.categories.join(','));
    }
    if (options.watchers && options.watchers.length > 0) {
      params.set('watchers', options.watchers.join(','));
    }
    params.set('replay', String(options.replay ?? 20));
    return `${this.baseUrl}/api/v1/streams/live?${params.toString()}`;
  }

  async getFolders(): Promise<WatcherFolder[]> {
    const data = await this.request<{ items?: WatcherFolder[] }>('/api/v1/folders');
    return data.items || [];
  }

  async getWatchers(): Promise<WatcherState[]> {
    const data = await this.request<{ items?: WatcherState[] }>('/api/v1/watchers');
    return data.items || [];
  }

  async getStreamItems(
    params: WatcherStreamQueryOptions = {}
  ): Promise<PaginatedWatcherStreamNews> {
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

    return this.request<PaginatedWatcherStreamNews>(
      `/api/v1/streams/items?${query.toString()}`
    );
  }

  async promoteItem(id: string): Promise<{ item: WatcherStreamItem; article: any }> {
    return this.request<{ item: WatcherStreamItem; article: any }>(
      `/api/v1/streams/items/${encodeURIComponent(id)}/promote`,
      { method: 'POST' }
    );
  }

  async batchPromote(ids: string[]): Promise<{ count: number; articles: any[] }> {
    return this.request<{ count: number; articles: any[] }>(
      '/api/v1/streams/items/batch-promote',
      {
        method: 'POST',
        body: JSON.stringify({ ids }),
      }
    );
  }

  async dismissItem(id: string): Promise<{ item: WatcherStreamItem }> {
    return this.request<{ item: WatcherStreamItem }>(
      `/api/v1/streams/items/${encodeURIComponent(id)}/dismiss`,
      { method: 'POST' }
    );
  }

  async batchDismiss(ids: string[]): Promise<{ count: number; items: WatcherStreamItem[] }> {
    return this.request<{ count: number; items: WatcherStreamItem[] }>(
      '/api/v1/streams/items/batch-dismiss',
      {
        method: 'POST',
        body: JSON.stringify({ ids }),
      }
    );
  }

  async triggerAllWatchers(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/api/v1/watchers/trigger-all', {
      method: 'POST',
    });
  }

  async pauseAllWatchers(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/api/v1/watchers/pause-all', {
      method: 'POST',
    });
  }

  async resumeAllWatchers(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/api/v1/watchers/resume-all', {
      method: 'POST',
    });
  }

  async setWatcherEnabled(
    idOrSlug: string,
    enabled: boolean
  ): Promise<{ message: string; watcher: WatcherState }> {
    return this.updateWatcher(idOrSlug, { enabled });
  }

  async updateWatcher(
    idOrSlug: string,
    patch: Record<string, any>
  ): Promise<{ message: string; watcher: WatcherState }> {
    return this.request<{ message: string; watcher: WatcherState }>(
      `/api/v1/watchers/${encodeURIComponent(idOrSlug)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }
    );
  }

  async triggerWatcher(idOrSlug: string): Promise<WatcherPingRecord> {
    return this.request<WatcherPingRecord>(
      `/api/v1/watchers/${encodeURIComponent(idOrSlug)}/trigger`,
      { method: 'POST' }
    );
  }

  async validateFeed(
    url: string,
    protocol: 'rss' | 'atom' | 'json' = 'rss'
  ): Promise<ValidateWatcherFeedResult> {
    return this.request<ValidateWatcherFeedResult>('/api/v1/watchers/validate', {
      method: 'POST',
      body: JSON.stringify({ url, protocol }),
    });
  }

  async createWatcher(
    input: CreateWatcherInput
  ): Promise<{ config: any; state: WatcherState }> {
    return this.request<{ config: any; state: WatcherState }>('/api/v1/watchers', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async pruneExpired(ttlHours?: number): Promise<{ pruned: number; ttlHours: number }> {
    return this.request<{ pruned: number; ttlHours: number }>('/api/v1/streams/prune', {
      method: 'POST',
      body: JSON.stringify(ttlHours ? { ttlHours } : {}),
    });
  }

  private async request<T = any>(path: string, init?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((init?.headers as Record<string, string>) || {}),
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
      headers['apikey'] = this.token;
    }

    const res = await this.fetchFn(`${this.baseUrl}${path}`, {
      ...init,
      headers,
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => res.statusText);
      throw new Error(`WatchersApiClient HTTP ${res.status} on ${path}: ${errBody}`);
    }
    return (await res.json()) as T;
  }
}
