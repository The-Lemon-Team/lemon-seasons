import { Note } from '@lenta/shared';

export type FeedSourceMode = 'spark' | 'seasons' | 'classic' | 'telegram';

export interface ThematicCategoryBadge {
  label: string;
  emoji: string;
  colorClass: string;
}

export interface UnifiedFeedItem {
  id: string;
  sourceType: FeedSourceMode;
  feedSlug: string;
  channelTitle: string;
  channelHandle: string;
  avatarIcon: string;
  category: ThematicCategoryBadge;
  title: string;
  description: string;
  summary?: string | null;
  publishedAt: string;
  timeSlot?: 'MORNING' | 'AFTERNOON' | 'EVENING';
  resonanceScore?: number;
  sourceLink?: string | null;
  curator?: string | null;
  hashtags?: string[];
  rawPayload: Note | any;
}

export interface UnifiedFeedTab {
  id: string;
  slug: string;
  title: string;
  shortTitle: string;
  emoji: string;
  category: string;
  count: number;
  accentColor?: string;
  badgeBgLight?: string;
  badgeTextLight?: string;
  badgeBgDark?: string;
  badgeTextDark?: string;
  description?: string;
  isCustomFolder?: boolean;
}

export interface FeedAdapterContext {
  allFeeds: Array<{ id: string; slug: string; title: string; description?: string | null; _count?: { notes: number } }>;
  notes: Note[];
}

export interface FeedAdapter {
  sourceType: FeedSourceMode;
  label: string;
  shortLabel: string;
  emoji: string;
  description: string;
  getTabs: (context: FeedAdapterContext) => UnifiedFeedTab[];
  adaptNotes: (notes: Note[], activeFeedSlug?: string, searchQuery?: string) => UnifiedFeedItem[];
}
