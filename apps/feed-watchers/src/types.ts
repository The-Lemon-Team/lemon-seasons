import type {
  CreateWatcherInput,
  PaginatedWatcherStreamNews,
  ValidateWatcherFeedResult,
  WatcherFolder,
  WatcherPingRecord,
  WatcherState,
  WatcherStreamCounts,
  WatcherStreamItem,
  WatcherStreamLiveEvent,
  WatcherStreamStatus,
} from '@lenta/seasons-neurons';

export type StreamNewsStatus = WatcherStreamStatus;
export type {
  CreateWatcherInput,
  ValidateWatcherFeedResult,
  WatcherPingRecord,
  WatcherStreamItem,
  WatcherFolder,
  WatcherState,
};
export type StreamCounts = WatcherStreamCounts;
export type PaginatedStreamNews = PaginatedWatcherStreamNews;
export type StreamLiveEvent = WatcherStreamLiveEvent;
