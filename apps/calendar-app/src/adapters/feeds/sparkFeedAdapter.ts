import { Note } from '@lenta/shared';
import {
  FeedAdapter,
  FeedAdapterContext,
  UnifiedFeedItem,
  UnifiedFeedTab,
  UnifiedSubtopic,
} from './types';
import { resolveSparkFeeds, getThematicCategoryBadge, isSparkSlug } from '../../utils/sparkFeeds';
import {
  KNOWN_NOTEBOOKLM_SUBTOPICS,
  isNotebooklmNote,
  extractNotebooklmSubtopic,
  isChangelogsNote,
  extractChangelogSubfolder,
} from './devFeedAdapter';

function resolveAvatarIcon(note: Note): string {
  const nbSub = extractNotebooklmSubtopic(note);
  if (nbSub === 'telegram') return '✈️';
  if (nbSub === 'regular') return '🎙️';
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

    const notebooklmSubCounts: Record<'regular' | 'telegram', number> = {
      regular: 0,
      telegram: 0,
    };
    const changelogSubCounts: Record<string, number> = {};

    for (const n of context.notes) {
      if (isNotebooklmNote(n)) {
        const nbSub = extractNotebooklmSubtopic(n) || 'regular';
        notebooklmSubCounts[nbSub] = (notebooklmSubCounts[nbSub] || 0) + 1;
      }
      if (isChangelogsNote(n)) {
        const sub = extractChangelogSubfolder(n) || 'other';
        changelogSubCounts[sub] = (changelogSubCounts[sub] || 0) + 1;
      }
    }

    return rawSparkFeeds.map((f) => {
      let subtopics: UnifiedSubtopic[] | undefined;

      if (f.slug === 'spark-notebooklmai') {
        subtopics = KNOWN_NOTEBOOKLM_SUBTOPICS.map((known) => ({
          id: `sub-notebooklm-${known.subfolder}`,
          slug: `spark-notebooklmai-${known.subfolder}`,
          subfolder: known.subfolder,
          title: known.title,
          emoji: known.emoji,
          count: notebooklmSubCounts[known.subfolder] || 0,
          accentColor: known.accentColor,
        }));
      } else if (f.slug === 'spark-changelogsfeed') {
        const knownChangelog = [
          { subfolder: 'google', title: 'Google', emoji: '🌐', accentColor: '#4285f4' },
          { subfolder: 'openai', title: 'OpenAI', emoji: '🧠', accentColor: '#10a37f' },
          { subfolder: 'anthropic', title: 'Anthropic', emoji: '⚡', accentColor: '#d97706' },
        ];
        subtopics = knownChangelog.map((known) => ({
          id: `sub-${known.subfolder}`,
          slug: `spark-changelogsfeed-${known.subfolder}`,
          subfolder: known.subfolder,
          title: known.title,
          emoji: known.emoji,
          count: changelogSubCounts[known.subfolder] || 0,
          accentColor: known.accentColor,
        }));
      }

      return {
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
        subtopics,
      };
    });
  },

  adaptNotes(notes: Note[], activeFeedSlug?: string, searchQuery?: string): UnifiedFeedItem[] {
    // 1. Strictly filter only Spark ecosystem notes
    let matched = notes.filter((n) => {
      if (n.feed?.slug && isSparkSlug(n.feed.slug)) return true;
      if (n.folderPath && n.folderPath.toLowerCase().startsWith('spark/')) return true;
      if (n.folders && Array.isArray(n.folders)) {
        return n.folders.some((f) => {
          const p = (f.folder?.path || f.folder?.name || '').toLowerCase();
          return p.startsWith('spark/');
        });
      }
      return false;
    });

    // 2. Specific feed or subtopic filter
    if (activeFeedSlug) {
      if (activeFeedSlug.startsWith('spark-notebooklmai-')) {
        const targetSub = activeFeedSlug.replace(/^spark-notebooklmai-/, '').toLowerCase();
        matched = matched.filter((n) => extractNotebooklmSubtopic(n) === targetSub);
      } else if (activeFeedSlug.startsWith('spark-changelogsfeed-')) {
        const targetSub = activeFeedSlug.replace(/^spark-changelogsfeed-/, '').toLowerCase();
        matched = matched.filter((n) => extractChangelogSubfolder(n) === targetSub);
      } else {
        matched = matched.filter((n) => {
          if (n.feed?.slug === activeFeedSlug) return true;
          const sub = activeFeedSlug.replace(/^spark-/, '').toLowerCase();
          if (n.folderPath && n.folderPath.toLowerCase().includes(sub)) return true;
          if (n.folders && Array.isArray(n.folders)) {
            return n.folders.some((f) => {
              const p = (f.folder?.path || f.folder?.name || '').toLowerCase();
              return p.includes(sub);
            });
          }
          return false;
        });
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
        return titleMatch || descMatch || feedMatch || tagMatch;
      });
    }

    // 4. Sort newest first
    matched.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

    // 5. Convert to UnifiedFeedItem
    return matched.map((n) => {
      const rawTitle = n.feed?.title || 'Spark News';
      const nbSub = extractNotebooklmSubtopic(n);
      const cleanChannelTitle =
        nbSub === 'telegram'
          ? 'NotebookLM • Telegram'
          : nbSub === 'regular'
          ? 'NotebookLM AI'
          : rawTitle.replace(/\s*\(Spark\)/i, '').replace(/^Spark\s*[—–-]\s*/i, '').trim();
      const badge =
        nbSub === 'telegram'
          ? {
              label: 'NotebookLM / Telegram',
              emoji: '✈️',
              colorClass: 'bg-sky-50 text-sky-700 border-sky-200/70 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/40',
            }
          : nbSub === 'regular'
          ? {
              label: 'NotebookLM / Обычные',
              emoji: '🎙️',
              colorClass: 'bg-purple-50 text-purple-700 border-purple-200/70 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40',
            }
          : getThematicCategoryBadge(rawTitle);

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
