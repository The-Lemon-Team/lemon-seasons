import type {
  CreateWatcherInput,
  UpdateWatcherInput,
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
  UpdateWatcherInput,
  ValidateWatcherFeedResult,
  WatcherPingRecord,
  WatcherStreamItem,
  WatcherFolder,
  WatcherState,
};
export type StreamCounts = WatcherStreamCounts;
export type PaginatedStreamNews = PaginatedWatcherStreamNews;
export type StreamLiveEvent = WatcherStreamLiveEvent;
