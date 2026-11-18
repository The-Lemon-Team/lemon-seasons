import type { CoreWatcherStreamItem, CoreWatcherStreamStatus } from '@feed-core';

export type StreamNewsStatus = CoreWatcherStreamStatus;
export type WatcherStreamItem = CoreWatcherStreamItem;

export interface StreamCounts {
  newCount: number;
  promotedCount: number;
  dismissedCount: number;
  totalCount: number;
}

export interface PaginatedStreamNews {
  items: WatcherStreamItem[];
  total: number;
  limit: number;
  offset: number;
  counts?: StreamCounts;
}

export interface WatcherFolder {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  isSystem: boolean;
  watchersCount?: number;
}

export interface WatcherState {
  id: string;
  slug: string;
  title: string;
  category: string;
  feedSlug: string;
  status: string;
  enabled: boolean;
  totalItemsIngested: number;
  lastPingAt: string | null;
}

export interface StreamLiveEvent {
  id: string;
  type: 'news_item' | 'news_promoted' | 'news_dismissed' | 'watcher_ping' | 'heartbeat';
  timestamp: string;
  category?: string;
  watcherId?: string;
  watcherSlug?: string;
  item?: WatcherStreamItem;
  itemIds?: string[];
  articleId?: string;
  noteId?: string | null;
}
