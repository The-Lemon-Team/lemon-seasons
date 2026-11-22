import { WatchersApiClient } from '@lenta/seasons-neurons';
import {
  CreateWatcherInput,
  PaginatedStreamNews,
  StreamNewsStatus,
  ValidateWatcherFeedResult,
  WatcherFolder,
  WatcherPingRecord,
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

export const watchersClient = new WatchersApiClient({
  baseUrl: resolveWatchersApiBaseUrl(),
});

export const watchersStreamApi = {
  getSseUrl(options: { categories?: string[]; watchers?: string[]; replay?: number } = {}): string {
    return watchersClient.getSseUrl(options);
  },

  async getFolders(): Promise<WatcherFolder[]> {
    return watchersClient.getFolders();
  },

  async getWatchers(): Promise<WatcherState[]> {
    return watchersClient.getWatchers();
  },

  async getStreamItems(
    params: {
      categories?: string[];
      watchers?: string[];
      status?: StreamNewsStatus | 'ALL';
      search?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<PaginatedStreamNews> {
    return watchersClient.getStreamItems(params);
  },

  async promoteItem(id: string): Promise<{ item: WatcherStreamItem; article: any }> {
    return watchersClient.promoteItem(id);
  },

  async batchPromote(ids: string[]): Promise<{ count: number; articles: any[] }> {
    return watchersClient.batchPromote(ids);
  },

  async dismissItem(id: string): Promise<{ item: WatcherStreamItem }> {
    return watchersClient.dismissItem(id);
  },

  async batchDismiss(ids: string[]): Promise<{ count: number; items: WatcherStreamItem[] }> {
    return watchersClient.batchDismiss(ids);
  },

  async triggerAllWatchers(): Promise<{ message: string }> {
    return watchersClient.triggerAllWatchers();
  },

  async pauseAllWatchers(): Promise<{ message: string }> {
    return watchersClient.pauseAllWatchers();
  },

  async resumeAllWatchers(): Promise<{ message: string }> {
    return watchersClient.resumeAllWatchers();
  },

  async setWatcherEnabled(
    idOrSlug: string,
    enabled: boolean
  ): Promise<{ message: string; watcher: WatcherState }> {
    return watchersClient.setWatcherEnabled(idOrSlug, enabled);
  },

  async triggerWatcher(idOrSlug: string): Promise<WatcherPingRecord> {
    return watchersClient.triggerWatcher(idOrSlug);
  },

  async validateFeed(
    url: string,
    protocol: 'rss' | 'atom' | 'json' = 'rss'
  ): Promise<ValidateWatcherFeedResult> {
    return watchersClient.validateFeed(url, protocol);
  },

  async createWatcher(
    input: CreateWatcherInput
  ): Promise<{ config: any; state: WatcherState }> {
    return watchersClient.createWatcher(input);
  },

  async updateWatcher(
    idOrSlug: string,
    patch: Record<string, any>
  ): Promise<{ message: string; watcher: WatcherState }> {
    return watchersClient.updateWatcher(idOrSlug, patch);
  },

  async pruneExpired(ttlHours?: number): Promise<{ pruned: number; ttlHours: number }> {
    return watchersClient.pruneExpired(ttlHours);
  },
};
