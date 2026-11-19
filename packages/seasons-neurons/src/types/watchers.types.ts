export type WatcherStreamStatus =
  | 'NEW'
  | 'CONVERTING'
  | 'PROMOTED'
  | 'DISMISSED'
  | 'FAILED';

export interface WatcherStreamItem {
  id: string;
  watcherId: string;
  watcherSlug: string;
  watcherTitle: string;
  category: string;
  feedSlug: string;
  guid: string;
  url: string;
  title: string;
  teaser: string;
  imageUrl?: string | null;
  author: string;
  pubDate: string;
  categories: string[];
  status: WatcherStreamStatus;
  noteId?: string | null;
  createdAt: string;
}

export interface WatcherStreamCounts {
  newCount: number;
  promotedCount: number;
  dismissedCount: number;
  totalCount: number;
}

export interface PaginatedWatcherStreamNews {
  items: WatcherStreamItem[];
  total: number;
  limit: number;
  offset: number;
  counts?: WatcherStreamCounts;
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
  lastSuccessAt?: string | null;
  lastError?: string | null;
  consecutiveFailures?: number;
  totalPings?: number;
  lastLatencyMs?: number | null;
  url?: string;
  protocol?: string;
  pollIntervalSeconds?: number;
}

export interface CreateWatcherInput {
  title: string;
  url: string;
  category?: string;
  feedSlug?: string;
  protocol?: 'rss' | 'atom' | 'json';
  pollIntervalSeconds?: number;
  description?: string;
  defaultTags?: string[];
  enabled?: boolean;
}

export interface ValidateWatcherFeedResult {
  valid: boolean;
  statusCode?: number;
  itemsCount?: number;
  error?: string;
  sample?: Array<{
    title: string;
    url: string;
    pubDate?: string;
    guid?: string;
  }>;
}

export interface WatcherPingRecord {
  id: string;
  watcherId: string;
  statusCode?: number;
  latencyMs?: number;
  itemsFound: number;
  newItemsCount: number;
  error?: string | null;
  createdAt: string;
}

export interface WatcherStreamLiveEvent {
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

export interface WatcherStreamQueryOptions {
  categories?: string[];
  watchers?: string[];
  status?: WatcherStreamStatus | 'ALL';
  search?: string;
  limit?: number;
  offset?: number;
}

export interface WatcherSseUrlOptions {
  categories?: string[];
  watchers?: string[];
  replay?: number;
}
