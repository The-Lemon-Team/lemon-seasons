import { Note } from '@lenta/shared';
import {
  FeedAdapter,
  FeedAdapterContext,
  UnifiedFeedItem,
  UnifiedFeedTab,
  UnifiedSubtopic,
  ThematicCategoryBadge,
} from './types';

import {
  KNOWN_CHANGELOG_SUBTOPICS,
  KNOWN_NOTEBOOKLM_SUBTOPICS,
  buildChangelogSubtopics,
  extractChangelogSubfolder,
  isChangelogsNote,
  isNotebooklmNote,
  extractNotebooklmSubtopic,
} from './devFeedSubtopics';

export {
  KNOWN_CHANGELOG_SUBTOPICS,
  KNOWN_NOTEBOOKLM_SUBTOPICS,
  buildChangelogSubtopics,
  extractChangelogSubfolder,
  isChangelogsNote,
  isNotebooklmNote,
  extractNotebooklmSubtopic,
} from './devFeedSubtopics';

export interface DevFeedPresetConfig {
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
  matcher: (note: Note) => boolean;
  isChangelogs?: boolean;
  isNotebooklm?: boolean;
}

export const DEV_PRESETS: DevFeedPresetConfig[] = [
  {
    slug: 'spark-ai',
    title: 'AI & Нейросети (Spark)',
    shortTitle: 'AI & Нейросети',
    emoji: '🤖',
    category: 'AI & Нейросети',
    accentColor: '#8b5cf6',
    badgeBgLight: 'rgba(139, 92, 246, 0.1)',
    badgeTextLight: '#6d28d9',
    badgeBgDark: 'rgba(139, 92, 246, 0.25)',
    badgeTextDark: '#c4b5fd',
    description: 'Релизы LLM моделей, рассуждения (reasoning), агентные вычисления и прорывы',
    matcher: (n: Note) => {
      const slug = (n.feed?.slug || '').toLowerCase();
      if (slug === 'spark-ai' || slug === 'dev-ai') return true;
      const fp = (n.folderPath || '').toLowerCase();
      if (fp.startsWith('spark/ai') || fp === 'ai') return true;
      if (n.folders && Array.isArray(n.folders)) {
        return n.folders.some((f) => {
          const p = (f.folder?.path || f.folder?.name || '').toLowerCase();
          return p.startsWith('spark/ai') || p === 'ai';
        });
      }
      return false;
    },
  },
  {
    slug: 'spark-habr',
    title: 'Хабр & IT (Spark)',
    shortTitle: 'Хабр & IT',
    emoji: '💻',
    category: 'IT & Разработка',
    accentColor: '#0284c7',
    badgeBgLight: 'rgba(2, 132, 199, 0.1)',
    badgeTextLight: '#0369a1',
    badgeBgDark: 'rgba(2, 132, 199, 0.25)',
    badgeTextDark: '#7dd3fc',
    description: 'Инженерные статьи, архитектура ПО, DevOps и сообщество Хабр',
    matcher: (n: Note) => {
      const slug = (n.feed?.slug || '').toLowerCase();
      if (slug === 'spark-habr' || slug === 'dev-habr') return true;
      const fp = (n.folderPath || '').toLowerCase();
      if (fp.startsWith('spark/habr') || fp === 'habr') return true;
      if (n.folders && Array.isArray(n.folders)) {
        return n.folders.some((f) => {
          const p = (f.folder?.path || f.folder?.name || '').toLowerCase();
          return p.startsWith('spark/habr') || p === 'habr';
        });
      }
      return false;
    },
  },
  {
    slug: 'spark-cyber-security',
    title: 'Cyber Security & InfoSec (Spark)',
    shortTitle: 'Cyber Security',
    emoji: '🛡️',
    category: 'Кибербезопасность',
    accentColor: '#10b981',
    badgeBgLight: 'rgba(16, 185, 129, 0.1)',
    badgeTextLight: '#047857',
    badgeBgDark: 'rgba(16, 185, 129, 0.25)',
    badgeTextDark: '#6ee7b7',
    description: 'Информационная безопасность, бюллетени CVE, SecOps и защита инфраструктуры',
    matcher: (n: Note) => {
      const slug = (n.feed?.slug || '').toLowerCase();
      if (slug.includes('cyber-security') || slug.includes('cybersec')) return true;
      const fp = (n.folderPath || '').toLowerCase();
      if (fp.includes('cyber security') || fp.includes('cybersecurity') || fp.includes('cybersec')) return true;
      if (n.folders && Array.isArray(n.folders)) {
        return n.folders.some((f) => {
          const p = (f.folder?.path || f.folder?.name || '').toLowerCase();
          return p.includes('cyber security') || p.includes('cybersecurity') || p.includes('cybersec');
        });
      }
      return false;
    },
  },
  {
    slug: 'spark-xakep',
    title: 'Журнал «Хакер» (Spark)',
    shortTitle: 'Журнал «Хакер»',
    emoji: '👾',
    category: 'AppSec & Реверс',
    accentColor: '#22c55e',
    badgeBgLight: 'rgba(34, 197, 94, 0.1)',
    badgeTextLight: '#15803d',
    badgeBgDark: 'rgba(34, 197, 94, 0.25)',
    badgeTextDark: '#86efac',
    description: 'Материалы журнала «Хакер», эксплойты, reverse engineering и разборы атак',
    matcher: (n: Note) => {
      const slug = (n.feed?.slug || '').toLowerCase();
      if (slug === 'spark-xakep' || slug === 'xakep') return true;
      const fp = (n.folderPath || '').toLowerCase();
      if (fp.startsWith('spark/xakep') || fp === 'xakep') return true;
      if (n.folders && Array.isArray(n.folders)) {
        return n.folders.some((f) => {
          const p = (f.folder?.path || f.folder?.name || '').toLowerCase();
          return p.startsWith('spark/xakep') || p === 'xakep';
        });
      }
      return false;
    },
  },
  {
    slug: 'spark-notebooklmai',
    title: 'NotebookLM AI (Spark)',
    shortTitle: 'NotebookLM AI',
    emoji: '🎙️',
    category: 'Аналитика & Подкасты',
    accentColor: '#a855f7',
    badgeBgLight: 'rgba(168, 85, 247, 0.1)',
    badgeTextLight: '#7e22ce',
    badgeBgDark: 'rgba(168, 85, 247, 0.25)',
    badgeTextDark: '#d8b4fe',
    description: 'Глубокие структурированные аудио-обзоры и аналитические синтезы от NotebookLM (Обычные и Telegram)',
    isNotebooklm: true,
    matcher: isNotebooklmNote,
  },
  {
    slug: 'spark-changelogsfeed',
    title: 'Changelogs & Релизы (Spark)',
    shortTitle: 'Changelogs & Релизы',
    emoji: '🚀',
    category: 'Changelogs & Релизы',
    accentColor: '#f97316',
    badgeBgLight: 'rgba(249, 115, 22, 0.1)',
    badgeTextLight: '#c2410c',
    badgeBgDark: 'rgba(249, 115, 22, 0.25)',
    badgeTextDark: '#fdba74',
    description: 'Официальные обновления и ченджлоги вендоров: Google, OpenAI, Anthropic и др.',
    isChangelogs: true,
    matcher: isChangelogsNote,
  },
  {
    slug: 'spark-youtube-oneday',
    title: 'YouTube • OneDay (Spark)',
    shortTitle: 'YouTube',
    emoji: '📺',
    category: 'Политическая аналитика',
    accentColor: '#ef4444',
    badgeBgLight: 'rgba(239, 68, 68, 0.1)',
    badgeTextLight: '#b91c1c',
    badgeBgDark: 'rgba(239, 68, 68, 0.25)',
    badgeTextDark: '#fca5a5',
    description: 'Ежедневная политическая выжимка и аналитические разборы YouTube-канала OneDay',
    matcher: (n: Note) => {
      const slug = (n.feed?.slug || '').toLowerCase();
      if (slug.includes('youtube') || slug.includes('oneday')) return true;
      const fp = (n.folderPath || '').toLowerCase();
      if (fp.includes('youtube') || fp.includes('oneday')) return true;
      if (n.folders && Array.isArray(n.folders)) {
        return n.folders.some((f) => {
          const p = (f.folder?.path || f.folder?.name || '').toLowerCase();
          return p.includes('youtube') || p.includes('oneday');
        });
      }
      return false;
    },
  },
];

export function isDevNote(note: Note): boolean {
  return DEV_PRESETS.some((preset) => preset.matcher(note));
}

function resolveDevBadge(note: Note): ThematicCategoryBadge {
  const subfolder = extractChangelogSubfolder(note);
  if (subfolder) {
    if (subfolder === 'google') {
      return {
        label: 'Changelog / Google',
        emoji: '🌐',
        colorClass: 'bg-blue-50 text-blue-700 border-blue-200/70 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40',
      };
    }
    if (subfolder === 'openai') {
      return {
        label: 'Changelog / OpenAI',
        emoji: '🧠',
        colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40',
      };
    }
    if (subfolder === 'anthropic') {
      return {
        label: 'Changelog / Anthropic',
        emoji: '⚡',
        colorClass: 'bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40',
      };
    }
    const cap = subfolder.charAt(0).toUpperCase() + subfolder.slice(1);
    return {
      label: `Changelog / ${cap}`,
      emoji: '🚀',
      colorClass: 'bg-orange-50 text-orange-700 border-orange-200/70 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/40',
    };
  }

  if (isChangelogsNote(note)) {
    return {
      label: 'Changelogs',
      emoji: '🚀',
      colorClass: 'bg-orange-50 text-orange-700 border-orange-200/70 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/40',
    };
  }

  const notebooklmSub = extractNotebooklmSubtopic(note);
  if (notebooklmSub === 'telegram') {
    return {
      label: 'NotebookLM / Telegram',
      emoji: '✈️',
      colorClass: 'bg-sky-50 text-sky-700 border-sky-200/70 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/40',
    };
  }
  if (notebooklmSub === 'regular') {
    return {
      label: 'NotebookLM / Обычные',
      emoji: '🎙️',
      colorClass: 'bg-purple-50 text-purple-700 border-purple-200/70 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40',
    };
  }

  for (const preset of DEV_PRESETS) {
    if (preset.matcher(note)) {
      return {
        label: preset.category,
        emoji: preset.emoji,
        colorClass: 'bg-slate-50 text-slate-700 border-slate-200/70 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-700/40',
      };
    }
  }

  return {
    label: 'Dev Hub',
    emoji: '💻',
    colorClass: 'bg-sky-50 text-sky-700 border-sky-200/70 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/40',
  };
}

function resolveDevAvatar(note: Note): string {
  const subfolder = extractChangelogSubfolder(note);
  if (subfolder === 'google') return '🌐';
  if (subfolder === 'openai') return '🧠';
  if (subfolder === 'anthropic') return '⚡';
  if (isChangelogsNote(note)) return '🚀';

  const notebooklmSub = extractNotebooklmSubtopic(note);
  if (notebooklmSub === 'telegram') return '✈️';
  if (notebooklmSub === 'regular') return '🎙️';

  const slug = (note.feed?.slug || '').toLowerCase();
  const title = (note.title || '').toLowerCase();
  if (slug.includes('youtube') || slug.includes('oneday') || title.includes('oneday')) return '📺';
  if (slug.includes('xakep') || title.includes('хакер')) return '👾';
  if (slug.includes('cyber') || title.includes('sec')) return '🛡️';
  if (slug.includes('notebooklm') || title.includes('notebooklm')) return '🎙️';
  if (slug.includes('habr') || title.includes('habr')) return '💻';
  if (slug.includes('ai') || title.includes('ai')) return '🤖';
  return '💻';
}

export const DevFeedAdapter: FeedAdapter = {
  sourceType: 'dev',
  label: 'Dev Hub',
  shortLabel: 'Dev Hub',
  emoji: '💻',
  description: 'Инженерные новости, релизы моделей, changelog обновления вендоров и IT сообщество',

  getTabs(context: FeedAdapterContext): UnifiedFeedTab[] {
    const { notes } = context;

    // Discover changelog subfolders and NotebookLM subtopics from notes
    const changelogSubCounts: Record<string, number> = {};
    const notebooklmSubCounts: Record<'regular' | 'telegram', number> = {
      regular: 0,
      telegram: 0,
    };
    for (const n of notes) {
      if (isChangelogsNote(n)) {
        const sub = extractChangelogSubfolder(n) || 'other';
        changelogSubCounts[sub] = (changelogSubCounts[sub] || 0) + 1;
      }
      if (isNotebooklmNote(n)) {
        const nbSub = extractNotebooklmSubtopic(n) || 'regular';
        notebooklmSubCounts[nbSub] = (notebooklmSubCounts[nbSub] || 0) + 1;
      }
    }

    return DEV_PRESETS.map((preset) => {
      const matchingNotes = notes.filter(preset.matcher);
      let subtopics: UnifiedSubtopic[] | undefined;

      if (preset.isChangelogs) {
        subtopics = buildChangelogSubtopics(changelogSubCounts, context.allFeeds);
      } else if (preset.isNotebooklm) {
        subtopics = KNOWN_NOTEBOOKLM_SUBTOPICS.map((known) => ({
          id: `sub-notebooklm-${known.subfolder}`,
          slug: `spark-notebooklmai-${known.subfolder}`,
          subfolder: known.subfolder,
          title: known.title,
          emoji: known.emoji,
          count: notebooklmSubCounts[known.subfolder] || 0,
          accentColor: known.accentColor,
        }));
      }

      return {
        id: preset.slug,
        slug: preset.slug,
        title: preset.title,
        shortTitle: preset.shortTitle,
        emoji: preset.emoji,
        category: preset.category,
        count: matchingNotes.length,
        accentColor: preset.accentColor,
        badgeBgLight: preset.badgeBgLight,
        badgeTextLight: preset.badgeTextLight,
        badgeBgDark: preset.badgeBgDark,
        badgeTextDark: preset.badgeTextDark,
        description: preset.description,
        isCustomFolder: false,
        subtopics,
      };
    });
  },

  adaptNotes(notes: Note[], activeFeedSlug?: string, searchQuery?: string): UnifiedFeedItem[] {
    // 1. Strictly filter to Dev Hub ecosystem notes
    let matched = notes.filter(isDevNote);

    // 2. Specific feed or subtopic filter
    if (activeFeedSlug) {
      if (activeFeedSlug.startsWith('spark-changelogsfeed-')) {
        const targetSub = activeFeedSlug.replace(/^spark-changelogsfeed-/, '').toLowerCase();
        matched = matched.filter((n) => {
          const sub = extractChangelogSubfolder(n);
          return sub === targetSub;
        });
      } else if (activeFeedSlug.startsWith('spark-notebooklmai-')) {
        const targetSub = activeFeedSlug.replace(/^spark-notebooklmai-/, '').toLowerCase();
        matched = matched.filter((n) => {
          const sub = extractNotebooklmSubtopic(n);
          return sub === targetSub;
        });
      } else {
        const preset = DEV_PRESETS.find((p) => p.slug === activeFeedSlug);
        if (preset) {
          matched = matched.filter(preset.matcher);
        } else {
          matched = matched.filter((n) => n.feed?.slug === activeFeedSlug);
        }
      }
    }

    // 3. Search query filter
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      matched = matched.filter((n) => {
        const titleMatch = n.title.toLowerCase().includes(q);
        const descMatch = Boolean(n.description?.toLowerCase().includes(q));
        const feedMatch = Boolean(n.feed?.title?.toLowerCase().includes(q));
        const tagMatch = n.hashtags?.some((h) => h.name.toLowerCase().includes(q));
        const subfolder = extractChangelogSubfolder(n);
        const subMatch = Boolean(subfolder && subfolder.includes(q));
        const nbSub = extractNotebooklmSubtopic(n);
        const nbMatch = Boolean(nbSub && nbSub.includes(q));
        return titleMatch || descMatch || feedMatch || tagMatch || subMatch || nbMatch;
      });
    }

    // 4. Sort newest first
    matched.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

    // 5. Convert to UnifiedFeedItem
    return matched.map((n) => {
      const sub = extractChangelogSubfolder(n);
      const nbSub = extractNotebooklmSubtopic(n);
      let channelTitle = n.feed?.title || 'Dev Feed';
      if (sub) {
        channelTitle = `${sub.charAt(0).toUpperCase() + sub.slice(1)} Changelog`;
      } else if (nbSub === 'telegram') {
        channelTitle = 'NotebookLM • Telegram';
      } else if (nbSub === 'regular') {
        channelTitle = 'NotebookLM AI';
      } else {
        channelTitle = channelTitle.replace(/\s*\(Spark\)/i, '').replace(/^Spark\s*[—–-]\s*/i, '').trim();
      }

      return {
        id: n.id,
        sourceType: 'dev',
        feedSlug:
          n.feed?.slug ||
          (sub
            ? `spark-changelogsfeed-${sub}`
            : nbSub
            ? `spark-notebooklmai-${nbSub}`
            : 'dev'),
        channelTitle,
        channelHandle: n.feed?.slug || 'dev',
        avatarIcon: resolveDevAvatar(n),
        category: resolveDevBadge(n),
        title: n.title,
        description: n.description || '',
        summary: (n as any).summary || null,
        publishedAt: n.startDate,
        timeSlot: (n.metadata as any)?.timeSlot,
        resonanceScore: (n.metadata as any)?.resonanceScore ?? (n as any).resonanceScore,
        sourceLink: n.sourceLink,
        author: (n as any).author || n.curator,
        curator: (n as any).author || n.curator,
        hashtags: n.hashtags?.map((h) => h.name) || [],
        rawPayload: n,
      };
    });
  },
};
