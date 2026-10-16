import { FeedAdapter, FeedSourceMode } from './types';
import { SparkFeedAdapter } from './sparkFeedAdapter';
import { SeasonsFeedAdapter } from './seasonsFeedAdapter';
import { ClassicFeedAdapter } from './classicFeedAdapter';
import { TelegramFeedAdapter } from './telegramFeedAdapter';

export * from './types';
export * from './sparkFeedAdapter';
export * from './seasonsFeedAdapter';
export * from './classicFeedAdapter';
export * from './telegramFeedAdapter';

export const FEED_ADAPTERS: Record<FeedSourceMode, FeedAdapter> = {
  spark: SparkFeedAdapter,
  seasons: SeasonsFeedAdapter,
  classic: ClassicFeedAdapter,
  telegram: TelegramFeedAdapter,
};

export const ALL_FEED_SOURCES: FeedSourceMode[] = ['spark', 'seasons', 'classic', 'telegram'];
