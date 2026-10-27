import { Feed, Note } from '@lenta/shared';
import { FeedThemeConfig, getFeedTheme } from './feedThemes';

export interface SparkFeedItem {
  id: string;
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
  notesCount: number;
  isCustomFolder?: boolean;
  folderPath?: string;
}

/**
 * The two primary, standard feeds from Spark.
 */
export const PRIMARY_SPARK_FEEDS: Array<{
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
    slug: 'spark-ai',
    title: 'AI & Нейросети (daily)',
    shortTitle: 'AI',
    emoji: '🤖',
    category: 'AI & Нейросети',
    accentColor: '#8b5cf6',
    badgeBgLight: 'rgba(139, 92, 246, 0.1)',
    badgeTextLight: '#6d28d9',
    badgeBgDark: 'rgba(139, 92, 246, 0.25)',
    badgeTextDark: '#c4b5fd',
    description: 'Релизы LLM, агентные вычисления, прорывы и локальный инференс (daily sync)',
  },
  {
    slug: 'spark-habr',
    title: 'Хабр & IT (daily)',
    shortTitle: 'Хабр',
    emoji: '💻',
    category: 'IT & Разработка',
    accentColor: '#0284c7',
    badgeBgLight: 'rgba(2, 132, 199, 0.1)',
    badgeTextLight: '#0369a1',
    badgeBgDark: 'rgba(2, 132, 199, 0.25)',
    badgeTextDark: '#7dd3fc',
    description: 'Инженерные статьи, архитектура ПО, DevOps и сообщество Хабр (daily sync)',
  },
];

/**
 * Check if a feed slug belongs to the Spark ecosystem.
 */
export function isSparkSlug(slug?: string | null): boolean {
  if (!slug) return false;
  const s = slug.toLowerCase();
  return s.startsWith('spark-') || s === 'spark';
}

/**
 * Palette generator for dynamically discovered Spark folders.
 */
const DYNAMIC_FOLDER_PALETTES = [
  {
    accent: '#10b981',
    emoji: '🌱',
    badgeBgLight: 'rgba(16, 185, 129, 0.1)',
    badgeTextLight: '#047857',
    badgeBgDark: 'rgba(16, 185, 129, 0.25)',
    badgeTextDark: '#6ee7b7',
  },
  {
    accent: '#f59e0b',
    emoji: '⚡',
    badgeBgLight: 'rgba(245, 158, 11, 0.1)',
    badgeTextLight: '#b45309',
    badgeBgDark: 'rgba(245, 158, 11, 0.25)',
    badgeTextDark: '#fcd34d',
  },
  {
    accent: '#ec4899',
    emoji: '🎯',
    badgeBgLight: 'rgba(236, 72, 153, 0.1)',
    badgeTextLight: '#be185d',
    badgeBgDark: 'rgba(236, 72, 153, 0.25)',
    badgeTextDark: '#f472b6',
  },
  {
    accent: '#6366f1',
    emoji: '🔮',
    badgeBgLight: 'rgba(99, 102, 241, 0.1)',
    badgeTextLight: '#4338ca',
    badgeBgDark: 'rgba(99, 102, 241, 0.25)',
    badgeTextDark: '#a5b4fc',
  },
  {
    accent: '#06b6d4',
    emoji: '🌐',
    badgeBgLight: 'rgba(6, 182, 212, 0.1)',
    badgeTextLight: '#0e7490',
    badgeBgDark: 'rgba(6, 182, 212, 0.25)',
    badgeTextDark: '#67e8f9',
  },
];

function getDynamicPalette(key: string) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return DYNAMIC_FOLDER_PALETTES[Math.abs(hash) % DYNAMIC_FOLDER_PALETTES.length];
}

/**
 * Resolves all available Spark feeds:
 * 1. The two primary feeds ('spark-ai', 'spark-habr').
 * 2. Any additional feeds from the backend whose slug starts with 'spark-'.
 * 3. Any new subfolders discovered dynamically in notes metadata (e.g. 'Spark/Crypto', 'Spark/Robotics').
 */
export function resolveSparkFeeds(
  allFeeds: Feed[] = [],
  notes: Note[] = []
): SparkFeedItem[] {
  const countsBySlug: Record<string, number> = {};
  for (const n of notes) {
    if (n.feed?.slug) {
      countsBySlug[n.feed.slug] = (countsBySlug[n.feed.slug] || 0) + 1;
      if (n.feed.slug.startsWith('spark-changelogsfeed-')) {
        countsBySlug['spark-changelogsfeed'] = (countsBySlug['spark-changelogsfeed'] || 0) + 1;
      }
      if (n.feed.slug.startsWith('spark-notebooklmai-')) {
        countsBySlug['spark-notebooklmai'] = (countsBySlug['spark-notebooklmai'] || 0) + 1;
      }
    }
  }

  const result: SparkFeedItem[] = [];
  const processedSlugs = new Set<string>();

  // 1. Add primary Spark feeds
  for (const primary of PRIMARY_SPARK_FEEDS) {
    const existing = allFeeds.find((f) => f.slug === primary.slug);
    const count = countsBySlug[primary.slug] || (existing ? existing._count?.notes ?? 0 : 0);

    result.push({
      id: existing?.id || primary.slug,
      slug: primary.slug,
      title: existing?.title || primary.title,
      shortTitle: primary.shortTitle,
      emoji: primary.emoji,
      category: primary.category,
      accentColor: primary.accentColor,
      badgeBgLight: primary.badgeBgLight,
      badgeTextLight: primary.badgeTextLight,
      badgeBgDark: primary.badgeBgDark,
      badgeTextDark: primary.badgeTextDark,
      description: existing?.description || primary.description,
      notesCount: count,
      isCustomFolder: false,
    });
    processedSlugs.add(primary.slug);
  }

  // 2. Discover additional feeds from backend that match spark-*
  for (const feed of allFeeds) {
    const isFolderSpark =
      isSparkSlug(feed.slug) ||
      Boolean((feed as any).folderPaths?.some((fp: string) => fp.toLowerCase().startsWith('spark')));

    if (
      feed.slug &&
      isFolderSpark &&
      !processedSlugs.has(feed.slug) &&
      !feed.slug.startsWith('spark-changelogsfeed-') &&
      !feed.slug.startsWith('spark-notebooklmai-')
    ) {
      const palette = getDynamicPalette(feed.slug);
      const cleanTitle = feed.title
        .replace(/\s*\(Spark\)/gi, '')
        .replace(/^Spark\s*[—–-]\s*/gi, '')
        .replace(/\s*\(daily\)/gi, '')
        .trim();

      result.push({
        id: feed.id,
        slug: feed.slug,
        title: `${cleanTitle} (daily)`,
        shortTitle: cleanTitle.length > 16 ? cleanTitle.slice(0, 16) + '...' : cleanTitle,
        emoji: feed.slug === 'spark-notebooklmai' ? '🎙️' : feed.slug === 'spark-changelogsfeed' ? '🚀' : palette.emoji,
        category: `${cleanTitle} (daily)`,
        accentColor: palette.accent,
        badgeBgLight: palette.badgeBgLight,
        badgeTextLight: palette.badgeTextLight,
        badgeBgDark: palette.badgeBgDark,
        badgeTextDark: palette.badgeTextDark,
        description: feed.description || `Тематическая лента ${cleanTitle} (daily sync)`,
        notesCount: countsBySlug[feed.slug] || feed._count?.notes || 0,
        isCustomFolder: true,
      });
      processedSlugs.add(feed.slug);
    }
  }

  // 3. Scan notes for dynamically ingested folders (e.g. note.folders: ["Spark/Crypto"])
  for (const n of notes) {
    const rawPaths: string[] = [];
    if (n.folderPath) rawPaths.push(n.folderPath);
    if (n.folders && Array.isArray(n.folders)) {
      for (const f of n.folders) {
        const fp = f.folder?.path || f.folder?.name;
        if (fp) rawPaths.push(fp);
      }
    }

    for (const folderPath of rawPaths) {
      if (folderPath.toLowerCase().startsWith('spark/')) {
        const subfolderName = folderPath.slice(6).split('/')[0].trim();
        if (subfolderName) {
          const dynamicSlug = `spark-${subfolderName.toLowerCase().replace(/[^a-z0-9а-яё]/gi, '-')}`;
          if (!processedSlugs.has(dynamicSlug)) {
            const palette = getDynamicPalette(subfolderName);
            result.push({
              id: `dynamic-${dynamicSlug}`,
              slug: dynamicSlug,
              title: `${subfolderName} (daily)`,
              shortTitle: subfolderName,
              emoji: palette.emoji,
              category: `${subfolderName} (daily)`,
              accentColor: palette.accent,
              badgeBgLight: palette.badgeBgLight,
              badgeTextLight: palette.badgeTextLight,
              badgeBgDark: palette.badgeBgDark,
              badgeTextDark: palette.badgeTextDark,
              description: `Папка ${subfolderName} из каталога Spark (daily)`,
              notesCount: countsBySlug[dynamicSlug] || 1,
              isCustomFolder: true,
              folderPath,
            });
            processedSlugs.add(dynamicSlug);
          }
        }
      }
    }
  }

  return result;
}

/**
 * Thematic category tag descriptor for clean visual designation.
 */
export function getThematicCategoryBadge(categoryOrSlug: string): {
  label: string;
  emoji: string;
  colorClass: string;
} {
  const lower = categoryOrSlug.toLowerCase();
  if (lower.includes('ai') || lower.includes('нейро')) {
    return {
      label: 'AI & Нейросети',
      emoji: '🤖',
      colorClass: 'bg-purple-50 text-purple-700 border-purple-200/70 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40',
    };
  }
  if (lower.includes('habr') || lower.includes('хабр') || lower.includes('it') || lower.includes('разработ')) {
    return {
      label: 'IT & Разработка',
      emoji: '💻',
      colorClass: 'bg-sky-50 text-sky-700 border-sky-200/70 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/40',
    };
  }
  if (lower.includes('media') || lower.includes('медиа') || lower.includes('тренд')) {
    return {
      label: 'Медиа & Тренды',
      emoji: '📰',
      colorClass: 'bg-rose-50 text-rose-700 border-rose-200/70 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40',
    };
  }
  if (lower.includes('rf') || lower.includes('рф')) {
    return {
      label: 'Инфополе РФ',
      emoji: '🇷🇺',
      colorClass: 'bg-blue-50 text-blue-700 border-blue-200/70 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40',
    };
  }
  return {
    label: categoryOrSlug,
    emoji: '📁',
    colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40',
  };
}
