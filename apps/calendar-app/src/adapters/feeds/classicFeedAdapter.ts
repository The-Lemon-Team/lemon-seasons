import { Note } from '@lenta/shared';
import {
  FeedAdapter,
  FeedAdapterContext,
  UnifiedFeedItem,
  UnifiedFeedTab,
} from './types';
import { getThematicCategoryBadge } from '../../utils/sparkFeeds';

export const CLASSIC_FEED_PRESETS: Array<{
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
    slug: 'russian-official',
    title: 'Русские государственные праздники',
    shortTitle: 'Госпраздники РФ',
    emoji: '🇷🇺',
    category: 'Праздники РФ',
    accentColor: '#ef4444',
    badgeBgLight: 'rgba(239, 68, 68, 0.1)',
    badgeTextLight: '#b91c1c',
    badgeBgDark: 'rgba(239, 68, 68, 0.25)',
    badgeTextDark: '#fca5a5',
    description: 'Официальные нерабочие праздничные дни по ст. 112 ТК РФ и памятные даты России',
  },
  {
    slug: 'russian-military',
    title: 'Дни воинской славы России',
    shortTitle: 'Воинская слава',
    emoji: '🎖️',
    category: 'Воинская слава',
    accentColor: '#b45309',
    badgeBgLight: 'rgba(180, 83, 9, 0.1)',
    badgeTextLight: '#92400e',
    badgeBgDark: 'rgba(180, 83, 9, 0.25)',
    badgeTextDark: '#fcd34d',
    description: 'Дни воинской славы и памятные даты России по 32-ФЗ, рода войск ВС РФ',
  },
  {
    slug: 'orthodox-holidays',
    title: 'Православный календарь',
    shortTitle: 'Православие',
    emoji: '☦️',
    category: 'Православие',
    accentColor: '#f59e0b',
    badgeBgLight: 'rgba(245, 158, 11, 0.1)',
    badgeTextLight: '#b45309',
    badgeBgDark: 'rgba(245, 158, 11, 0.25)',
    badgeTextDark: '#fde68a',
    description: 'Двунадесятые праздники, Пасха Христова, посты и дни памяти святых',
  },
  {
    slug: 'catholic-holidays',
    title: 'Католический календарь',
    shortTitle: 'Католицизм',
    emoji: '✝️',
    category: 'Католицизм',
    accentColor: '#8b5cf6',
    badgeBgLight: 'rgba(139, 92, 246, 0.1)',
    badgeTextLight: '#6d28d9',
    badgeBgDark: 'rgba(139, 92, 246, 0.25)',
    badgeTextDark: '#c4b5fd',
    description: 'Литургический год латинского обряда Римско-католической церкви',
  },
  {
    slug: 'islamic-holidays',
    title: 'Исламский календарь',
    shortTitle: 'Ислам',
    emoji: '☪️',
    category: 'Ислам (Хиджра)',
    accentColor: '#10b981',
    badgeBgLight: 'rgba(16, 185, 129, 0.1)',
    badgeTextLight: '#047857',
    badgeBgDark: 'rgba(16, 185, 129, 0.25)',
    badgeTextDark: '#6ee7b7',
    description: 'Календарь Хиджры 1447–1448: Рамадан, Ураза-байрам, Курбан-байрам',
  },
  {
    slug: 'world-religions',
    title: 'Мировые религии: Ислам, Иудаизм, Буддизм',
    shortTitle: 'Религии мира',
    emoji: '🕊️',
    category: 'Межконфессиональный',
    accentColor: '#06b6d4',
    badgeBgLight: 'rgba(6, 182, 212, 0.1)',
    badgeTextLight: '#0e7490',
    badgeBgDark: 'rgba(6, 182, 212, 0.25)',
    badgeTextDark: '#67e8f9',
    description: 'Священные даты мировых духовных традиций: Ислам, Иудаизм, Буддизм',
  },
  {
    slug: 'world-holidays',
    title: 'Праздники стран мира',
    shortTitle: 'Страны мира',
    emoji: '🌍',
    category: 'Мировые праздники',
    accentColor: '#3b82f6',
    badgeBgLight: 'rgba(59, 130, 246, 0.1)',
    badgeTextLight: '#1d4ed8',
    badgeBgDark: 'rgba(59, 130, 246, 0.25)',
    badgeTextDark: '#93c5fd',
    description: 'Знаменитые национальные и культурные праздники стран мира',
  },
  {
    slug: 'mcu-radar',
    title: 'Marvel Cinematic Universe',
    shortTitle: 'MCU Радар',
    emoji: '🛡️',
    category: 'MCU Радар',
    accentColor: '#ec4899',
    badgeBgLight: 'rgba(236, 72, 153, 0.1)',
    badgeTextLight: '#be185d',
    badgeBgDark: 'rgba(236, 72, 153, 0.25)',
    badgeTextDark: '#f472b6',
    description: 'Радар релизов Фаз 5 и 6 и хронология Саги Мультивселенной',
  },
  {
    slug: 'politics-2026',
    title: 'Политика 2026',
    shortTitle: 'Политика',
    emoji: '🏛️',
    category: 'Геополитика',
    accentColor: '#64748b',
    badgeBgLight: 'rgba(100, 116, 139, 0.1)',
    badgeTextLight: '#334155',
    badgeBgDark: 'rgba(100, 116, 139, 0.25)',
    badgeTextDark: '#cbd5e1',
    description: 'Международные саммиты, выборы, парламентские сессии 2026 года',
  },
];

const CLASSIC_SLUGS = new Set(CLASSIC_FEED_PRESETS.map((p) => p.slug));

export const ClassicFeedAdapter: FeedAdapter = {
  sourceType: 'classic',
  label: 'Classic Календари',
  shortLabel: 'Classic',
  emoji: '🏛️',
  description: 'Государственные и религиозные праздники, мировые события и радары',

  getTabs(context: FeedAdapterContext): UnifiedFeedTab[] {
    const countsBySlug: Record<string, number> = {};
    for (const n of context.notes) {
      if (n.feed?.slug && CLASSIC_SLUGS.has(n.feed.slug)) {
        countsBySlug[n.feed.slug] = (countsBySlug[n.feed.slug] || 0) + 1;
      }
    }

    return CLASSIC_FEED_PRESETS.map((preset) => {
      const dbFeed = context.allFeeds.find((f) => f.slug === preset.slug);
      const count = countsBySlug[preset.slug] ?? dbFeed?._count?.notes ?? 0;

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
    // 1. Strictly filter only Classic feed notes
    let matched = notes.filter((n) => n.feed?.slug && CLASSIC_SLUGS.has(n.feed.slug));

    // 2. Specific feed filter
    if (activeFeedSlug) {
      matched = matched.filter((n) => n.feed?.slug === activeFeedSlug);
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

    // 4. Sort chronologically
    matched.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    // 5. Convert to UnifiedFeedItem
    return matched.map((n) => {
      const preset = CLASSIC_FEED_PRESETS.find((p) => p.slug === n.feed?.slug);
      const badge = preset
        ? { label: preset.category, emoji: preset.emoji, colorClass: `border-[${preset.accentColor}]/30 text-[${preset.accentColor}]` }
        : getThematicCategoryBadge(n.feed?.title || 'Classic');

      return {
        id: n.id,
        sourceType: 'classic',
        feedSlug: n.feed?.slug || 'classic',
        channelTitle: preset?.title || n.feed?.title || 'Classic Feed',
        channelHandle: n.feed?.slug || 'classic',
        avatarIcon: preset?.emoji || '📅',
        category: badge,
        title: n.title,
        description: n.description || '',
        publishedAt: n.startDate,
        timeSlot: (n.metadata as any)?.timeSlot,
        resonanceScore: (n.metadata as any)?.resonanceScore ?? (n as any).resonanceScore,
        sourceLink: n.sourceLink,
        curator: n.curator || 'Календарь',
        hashtags: n.hashtags?.map((h) => h.name) || [],
        rawPayload: n,
      };
    });
  },
};
