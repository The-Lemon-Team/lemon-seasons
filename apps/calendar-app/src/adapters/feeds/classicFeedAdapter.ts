import { Note } from '@lenta/shared';
import {
  FeedAdapter,
  FeedAdapterContext,
  UnifiedFeedItem,
  UnifiedFeedTab,
} from './types';
import { getThematicCategoryBadge } from '../../utils/sparkFeeds';

export interface ClassicFeedPreset {
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
  matchingSlugs: string[];
}

export const CLASSIC_FEED_PRESETS: ClassicFeedPreset[] = [
  {
    slug: 'russian-holidays',
    title: 'Российские праздники',
    shortTitle: 'Российские праздники',
    emoji: '🇷🇺',
    category: 'Российские праздники',
    accentColor: '#ef4444',
    badgeBgLight: 'rgba(239, 68, 68, 0.1)',
    badgeTextLight: '#b91c1c',
    badgeBgDark: 'rgba(239, 68, 68, 0.25)',
    badgeTextDark: '#fca5a5',
    description: 'Официальные нерабочие праздничные дни по ТК РФ, памятные даты и Дни воинской славы России по 32-ФЗ',
    matchingSlugs: ['russian-holidays', 'russian-official', 'russian-military'],
  },
  {
    slug: 'orthodox-holidays',
    title: 'Православные праздники',
    shortTitle: 'Православные праздники',
    emoji: '☦️',
    category: 'Православные праздники',
    accentColor: '#f59e0b',
    badgeBgLight: 'rgba(245, 158, 11, 0.1)',
    badgeTextLight: '#b45309',
    badgeBgDark: 'rgba(245, 158, 11, 0.25)',
    badgeTextDark: '#fde68a',
    description: 'Двунадесятые праздники, Пасха Христова, посты и дни памяти святых',
    matchingSlugs: ['orthodox-holidays', 'christian-holidays'],
  },
  {
    slug: 'wiki',
    title: 'Этот день в истории (Wiki)',
    shortTitle: 'Wiki история',
    emoji: '📖',
    category: 'Wiki история',
    accentColor: '#0ea5e9',
    badgeBgLight: 'rgba(14, 165, 233, 0.1)',
    badgeTextLight: '#0284c7',
    badgeBgDark: 'rgba(14, 165, 233, 0.25)',
    badgeTextDark: '#7dd3fc',
    description: 'Сводка исторических событий, открытий и памятных вех текущего дня из свободной энциклопедии Wikipedia',
    matchingSlugs: ['wiki', 'wiki-history', 'wikipedia'],
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
    matchingSlugs: ['mcu-radar'],
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
    matchingSlugs: ['politics-2026'],
  },
];

export function getPresetForSlug(feedSlug?: string | null): ClassicFeedPreset | undefined {
  if (!feedSlug) return undefined;
  return CLASSIC_FEED_PRESETS.find(
    (p) => p.slug === feedSlug || p.matchingSlugs.includes(feedSlug)
  );
}

export function isClassicSlug(feedSlug?: string | null): boolean {
  return Boolean(getPresetForSlug(feedSlug));
}

export const ClassicFeedAdapter: FeedAdapter = {
  sourceType: 'classic',
  label: 'Classic Календари',
  shortLabel: 'Classic',
  emoji: '🏛️',
  description: 'Российские и православные праздники, историческая хроника Wiki, мировые события и радары',

  getTabs(context: FeedAdapterContext): UnifiedFeedTab[] {
    const countsByPreset: Record<string, number> = {};
    for (const n of context.notes) {
      const preset = getPresetForSlug(n.feed?.slug);
      if (preset) {
        countsByPreset[preset.slug] = (countsByPreset[preset.slug] || 0) + 1;
      }
    }

    return CLASSIC_FEED_PRESETS.map((preset) => {
      const dbFeed = context.allFeeds.find((f) => preset.matchingSlugs.includes(f.slug));
      const dbCount = context.allFeeds
        .filter((f) => preset.matchingSlugs.includes(f.slug))
        .reduce((sum, f) => sum + (f._count?.notes || 0), 0);

      const count = countsByPreset[preset.slug] ?? dbCount;

      return {
        id: dbFeed?.id || preset.slug,
        slug: preset.slug,
        title: preset.title,
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
    const activePreset = getPresetForSlug(activeFeedSlug);

    // 1. Strictly filter Classic feed notes
    let matched = notes.filter((n) => {
      const preset = getPresetForSlug(n.feed?.slug);
      if (!preset) return false;
      if (activePreset) {
        return preset.slug === activePreset.slug;
      }
      return true;
    });

    // 2. Search query filter
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

    // 3. Sort chronologically
    matched.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

    // 4. Convert to UnifiedFeedItem
    const items: UnifiedFeedItem[] = matched.map((n) => {
      const preset = getPresetForSlug(n.feed?.slug);
      const badge = preset
        ? { label: preset.category, emoji: preset.emoji, colorClass: `border-[${preset.accentColor}]/30 text-[${preset.accentColor}]` }
        : getThematicCategoryBadge(n.feed?.title || 'Classic');

      return {
        id: n.id,
        sourceType: 'classic',
        feedSlug: preset?.slug || n.feed?.slug || 'classic',
        channelTitle: preset?.title || n.feed?.title || 'Classic Feed',
        channelHandle: preset?.slug || n.feed?.slug || 'classic',
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

    return items;
  },
};
