import { FeedAdapter, FeedSourceMode } from './types';
import { SparkFeedAdapter } from './sparkFeedAdapter';
import { DevFeedAdapter } from './devFeedAdapter';
import { SeasonsFeedAdapter } from './seasonsFeedAdapter';
import { ClassicFeedAdapter } from './classicFeedAdapter';
import { TelegramFeedAdapter } from './telegramFeedAdapter';

export * from './types';
export * from './sparkFeedAdapter';
export * from './devFeedAdapter';
export * from './seasonsFeedAdapter';
export * from './classicFeedAdapter';
export * from './telegramFeedAdapter';

export const FEED_ADAPTERS: Record<FeedSourceMode, FeedAdapter> = {
  spark: SparkFeedAdapter,
  dev: DevFeedAdapter,
  seasons: SeasonsFeedAdapter,
  classic: ClassicFeedAdapter,
  telegram: TelegramFeedAdapter,
};

export const ALL_FEED_SOURCES: FeedSourceMode[] = ['spark', 'dev', 'seasons', 'classic', 'telegram'];
