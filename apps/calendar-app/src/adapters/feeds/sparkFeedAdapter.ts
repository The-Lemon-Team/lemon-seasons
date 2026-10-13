import { Note } from '@lenta/shared';
import {
  FeedAdapter,
  FeedAdapterContext,
  UnifiedFeedItem,
  UnifiedFeedTab,
} from './types';
import { resolveSparkFeeds, getThematicCategoryBadge, isSparkSlug } from '../../utils/sparkFeeds';

function resolveAvatarIcon(note: Note): string {
  if (note.icon) {
    if (Array.from(note.icon).length <= 2) return note.icon;
    const iconKey = note.icon.toLowerCase();
    if (iconKey.includes('bot') || iconKey.includes('ai')) return '🤖';
    if (iconKey.includes('code') || iconKey.includes('habr')) return '💻';
    if (iconKey.includes('ghost')) return '👻';
    if (iconKey.includes('palett')) return '🎨';
    if (iconKey.includes('globe') || iconKey.includes('world')) return '🌐';
    if (iconKey.includes('radio') || iconKey.includes('news')) return '📡';
  }
  const slug = note.feed?.slug?.toLowerCase() || '';
  if (slug.includes('ai')) return '🤖';
  if (slug.includes('habr')) return '💻';
  return '✨';
}

export const SparkFeedAdapter: FeedAdapter = {
  sourceType: 'spark',
  label: 'Spark Ленты',
  shortLabel: 'Spark',
  emoji: '✨',
  description: 'AI, LLM релизы, агентные технологии и инженерное IT-сообщество',

  getTabs(context: FeedAdapterContext): UnifiedFeedTab[] {
    const rawSparkFeeds = resolveSparkFeeds(context.allFeeds as any, context.notes);
    return rawSparkFeeds.map((f) => ({
      id: f.id,
      slug: f.slug,
      title: f.title,
      shortTitle: f.shortTitle,
      emoji: f.emoji,
      category: f.category,
      count: f.notesCount,
      accentColor: f.accentColor,
      badgeBgLight: f.badgeBgLight,
      badgeTextLight: f.badgeTextLight,
      badgeBgDark: f.badgeBgDark,
      badgeTextDark: f.badgeTextDark,
      description: f.description,
      isCustomFolder: f.isCustomFolder,
    }));
  },

  adaptNotes(notes: Note[], activeFeedSlug?: string, searchQuery?: string): UnifiedFeedItem[] {
    // 1. Strictly filter only Spark ecosystem notes
    let matched = notes.filter((n) => {
      if (n.feed?.slug && isSparkSlug(n.feed.slug)) return true;
      if (n.folders && Array.isArray(n.folders)) {
        return n.folders.some((f) => {
          const p = (f.folder?.path || f.folder?.name || '').toLowerCase();
          return p.startsWith('spark/');
        });
      }
      return false;
    });

    // 2. Specific feed filter
    if (activeFeedSlug) {
      matched = matched.filter((n) => {
        if (n.feed?.slug === activeFeedSlug) return true;
        if (n.folders && Array.isArray(n.folders)) {
          return n.folders.some((f) => {
            const p = (f.folder?.path || f.folder?.name || '').toLowerCase();
            return p.includes(activeFeedSlug.replace(/^spark-/, ''));
          });
        }
        return false;
      });
    }

    // 3. Search query filter
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      matched = matched.filter((n) => {
        const titleMatch = n.title.toLowerCase().includes(q);
        const descMatch = Boolean(n.description?.toLowerCase().includes(q));
        const feedMatch = Boolean(n.feed?.title?.toLowerCase().includes(q));
        const tagMatch = n.hashtags?.some((h) => h.name.toLowerCase().includes(q));
        return titleMatch || descMatch || feedMatch || tagMatch;
      });
    }

    // 4. Sort newest first
    matched.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

    // 5. Convert to UnifiedFeedItem
    return matched.map((n) => {
      const rawTitle = n.feed?.title || 'Spark News';
      const cleanChannelTitle = rawTitle.replace(/\s*\(Spark\)/i, '').replace(/^Spark\s*[—–-]\s*/i, '').trim();
      const badge = getThematicCategoryBadge(rawTitle);

      return {
        id: n.id,
        sourceType: 'spark',
        feedSlug: n.feed?.slug || 'spark',
        channelTitle: cleanChannelTitle,
        channelHandle: n.feed?.slug || 'spark',
        avatarIcon: resolveAvatarIcon(n),
        category: badge,
        title: n.title,
        description: n.description || '',
        summary: (n as any).summary || null,
        publishedAt: n.startDate,
        timeSlot: (n.metadata as any)?.timeSlot,
        resonanceScore: (n.metadata as any)?.resonanceScore ?? (n as any).resonanceScore,
        sourceLink: n.sourceLink,
        curator: n.curator,
        hashtags: n.hashtags?.map((h) => h.name) || [],
        rawPayload: n,
      };
    });
  },
};
