import { Note } from '@lenta/shared';
import {
  FeedAdapter,
  FeedAdapterContext,
  UnifiedFeedItem,
  UnifiedFeedTab,
} from './types';
import { getThematicCategoryBadge } from '../../utils/sparkFeeds';

export const SEASONS_FEED_PRESETS: Array<{
  slug: string;
  title: string;
  shortTitle: string;
  emoji: string;
  category: string;
  accentColor: string;
  badgeBgLight: string;
  badgeTextLight: string;
  badgeBgDark: string;
  badgeTextDark: string;
  description: string;
}> = [
  {
    slug: 'tech-strategy',
    title: 'Technical Architecture & Strategy',
    shortTitle: 'Tech Strategy',
    emoji: '💻',
    category: 'Инженерия',
    accentColor: '#0284c7',
    badgeBgLight: 'rgba(2, 132, 199, 0.1)',
    badgeTextLight: '#0369a1',
    badgeBgDark: 'rgba(2, 132, 199, 0.25)',
    badgeTextDark: '#7dd3fc',
    description: 'Архитектурные планы, системные спецификации и дорожная карта разработки',
  },
  {
    slug: 'product-milestones',
    title: 'Product Milestones',
    shortTitle: 'Product',
    emoji: '🚀',
    category: 'Продукт',
    accentColor: '#10b981',
    badgeBgLight: 'rgba(16, 185, 129, 0.1)',
    badgeTextLight: '#047857',
    badgeBgDark: 'rgba(16, 185, 129, 0.25)',
    badgeTextDark: '#6ee7b7',
    description: 'Ключевые майлстоуны продукта, синхронизация с Obsidian и релизы Lenta',
  },
  {
    slug: 'design-systems',
    title: 'Design Systems & UI',
    shortTitle: 'Design UI',
    emoji: '🎨',
    category: 'Дизайн',
    accentColor: '#ec4899',
    badgeBgLight: 'rgba(236, 72, 153, 0.1)',
    badgeTextLight: '#be185d',
    badgeBgDark: 'rgba(236, 72, 153, 0.25)',
    badgeTextDark: '#f472b6',
    description: 'Токены дизайн-системы, компоненты интерфейса и визуальный стиль Lemon Seasons',
  },
  {
    slug: 'devops-infra',
    title: 'DevOps & Infrastructure',
    shortTitle: 'DevOps',
    emoji: '⚙️',
    category: 'Инфраструктура',
    accentColor: '#8b5cf6',
    badgeBgLight: 'rgba(139, 92, 246, 0.1)',
    badgeTextLight: '#6d28d9',
    badgeBgDark: 'rgba(139, 92, 246, 0.25)',
    badgeTextDark: '#c4b5fd',
    description: 'Docker-окружения, базы данных PostgreSQL и надежность сервисов',
  },
  {
    slug: 'notebooklm-ai',
    title: 'NotebookLM AI Daily Briefing',
    shortTitle: 'NotebookLM AI',
    emoji: '🎙️',
    category: 'ИИ & Аудио',
    accentColor: '#a855f7',
    badgeBgLight: 'rgba(168, 85, 247, 0.1)',
    badgeTextLight: '#7e22ce',
    badgeBgDark: 'rgba(168, 85, 247, 0.25)',
    badgeTextDark: '#d8b4fe',
    description: 'Ежедневный дайджест новостей искусственного интеллекта и подкаст от NotebookLM',
  },
];

const SEASONS_SLUGS = new Set(SEASONS_FEED_PRESETS.map((p) => p.slug));

export const SeasonsFeedAdapter: FeedAdapter = {
  sourceType: 'seasons',
  label: 'Lemon Seasons',
  shortLabel: 'Seasons',
  emoji: '🍋',
  description: 'Официальные ленты, городские хроники и новости Lemon Seasons',

  getTabs(context: FeedAdapterContext): UnifiedFeedTab[] {
    const countsBySlug: Record<string, number> = {};
    for (const n of context.notes) {
      if (n.feed?.slug && SEASONS_SLUGS.has(n.feed.slug)) {
        countsBySlug[n.feed.slug] = (countsBySlug[n.feed.slug] || 0) + 1;
      }
    }

    return SEASONS_FEED_PRESETS.map((preset) => {
      const dbFeed = context.allFeeds.find((f) => f.slug === preset.slug);
      let count = countsBySlug[preset.slug] ?? dbFeed?._count?.notes ?? 0;

      // Always guarantee at least 1 note for jm-daily (fallback note)
      if (preset.slug === 'jm-daily' && count === 0) {
        count = 1;
      }

      return {
        id: dbFeed?.id || preset.slug,
        slug: preset.slug,
        title: dbFeed?.title || preset.title,
        shortTitle: preset.shortTitle,
        emoji: preset.emoji,
        category: preset.category,
        count,
        accentColor: preset.accentColor,
        badgeBgLight: preset.badgeBgLight,
        badgeTextLight: preset.badgeTextLight,
        badgeBgDark: preset.badgeBgDark,
        badgeTextDark: preset.badgeTextDark,
        description: dbFeed?.description || preset.description,
      };
    });
  },

  adaptNotes(notes: Note[], activeFeedSlug?: string, searchQuery?: string): UnifiedFeedItem[] {
    // 1. Filter notes belonging to Seasons ecosystem
    let matched = notes.filter((n) => n.feed?.slug && SEASONS_SLUGS.has(n.feed.slug));

    // 2. Specific feed filter
    if (activeFeedSlug) {
      matched = matched.filter((n) => n.feed?.slug === activeFeedSlug);
    }

    // 3. Map notes to UnifiedFeedItem
    const convertedItems: UnifiedFeedItem[] = matched.map((n) => {
      const preset = SEASONS_FEED_PRESETS.find((p) => p.slug === n.feed?.slug);
      const badge = preset
        ? {
            label: preset.category,
            emoji: preset.emoji,
            colorClass: `border-[${preset.accentColor}]/30 text-[${preset.accentColor}]`,
          }
        : getThematicCategoryBadge(n.feed?.title || 'Lemon Seasons');

      return {
        id: n.id,
        sourceType: 'seasons',
        feedSlug: n.feed?.slug || 'tech-strategy',
        channelTitle: preset?.title || n.feed?.title || 'Lemon Seasons',
        channelHandle: `@${n.feed?.slug || 'lemon-seasons'}`,
        avatarIcon: preset?.emoji || '🍋',
        category: badge,
        title: n.title,
        description: n.description || '',
        publishedAt: n.startDate,
        timeSlot: (n.metadata as any)?.timeSlot,
        resonanceScore: (n.metadata as any)?.resonanceScore ?? (n as any).resonanceScore ?? 85,
        sourceLink: n.sourceLink,
        author: (n as any).author || n.curator || 'Lemon Seasons',
        curator: (n as any).author || n.curator || 'Lemon Seasons',
        hashtags: n.hashtags?.map((h) => h.name) || [],
        rawPayload: n,
      };
    });

    // 4. Search query filter
    let results = convertedItems;
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      results = results.filter((n) => {
        const titleMatch = n.title.toLowerCase().includes(q);
        const descMatch = Boolean(n.description?.toLowerCase().includes(q));
        const feedMatch = Boolean(n.channelTitle.toLowerCase().includes(q));
        const tagMatch = n.hashtags?.some((h) => h.toLowerCase().includes(q));
        return titleMatch || descMatch || feedMatch || tagMatch;
      });
    }

    // 5. Sort newest first
    results.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    return results;
  },
};
