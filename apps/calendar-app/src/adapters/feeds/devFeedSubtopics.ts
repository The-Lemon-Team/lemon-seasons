import { Note } from '@lenta/shared';

export const KNOWN_CHANGELOG_SUBTOPICS: Array<{
  subfolder: string;
  title: string;
  emoji: string;
  accentColor: string;
}> = [
  { subfolder: 'google', title: 'Google', emoji: '🌐', accentColor: '#4285f4' },
  { subfolder: 'openai', title: 'OpenAI', emoji: '🧠', accentColor: '#10a37f' },
  { subfolder: 'anthropic', title: 'Anthropic', emoji: '⚡', accentColor: '#d97706' },
];

export function buildChangelogSubtopics(
  changelogSubCounts: Record<string, number>,
  allFeeds: Array<{ slug: string; _count?: { notes: number } }> = [],
): Array<{
  id: string;
  slug: string;
  subfolder: string;
  title: string;
  emoji: string;
  count: number;
  accentColor: string;
}> {
  const mergedCounts: Record<string, number> = { ...changelogSubCounts };

  for (const f of allFeeds) {
    if (f.slug && f.slug.toLowerCase().startsWith('spark-changelogsfeed-')) {
      const rawSub = f.slug.toLowerCase().replace(/^spark-changelogsfeed-/, '').trim();
      const sub = rawSub === 'antropic' ? 'anthropic' : rawSub;
      if (sub && !(sub in mergedCounts)) {
        mergedCounts[sub] = f._count?.notes ?? 0;
      }
    }
  }

  const discovered = new Set<string>();
  const subtopics: Array<{
    id: string;
    slug: string;
    subfolder: string;
    title: string;
    emoji: string;
    count: number;
    accentColor: string;
  }> = [];

  for (const known of KNOWN_CHANGELOG_SUBTOPICS) {
    discovered.add(known.subfolder);
    subtopics.push({
      id: `sub-${known.subfolder}`,
      slug: `spark-changelogsfeed-${known.subfolder}`,
      subfolder: known.subfolder,
      title: known.title,
      emoji: known.emoji,
      count: mergedCounts[known.subfolder] || 0,
      accentColor: known.accentColor,
    });
  }

  for (const [sub, count] of Object.entries(mergedCounts)) {
    if (sub !== 'other' && !discovered.has(sub)) {
      const cap = sub.charAt(0).toUpperCase() + sub.slice(1);
      subtopics.push({
        id: `sub-${sub}`,
        slug: `spark-changelogsfeed-${sub}`,
        subfolder: sub,
        title: cap,
        emoji: '📦',
        count,
        accentColor: '#f97316',
      });
      discovered.add(sub);
    }
  }

  return subtopics;
}

export const KNOWN_NOTEBOOKLM_SUBTOPICS: Array<{
  subfolder: 'regular' | 'telegram';
  title: string;
  emoji: string;
  accentColor: string;
}> = [
  { subfolder: 'regular', title: 'Обычные', emoji: '🎙️', accentColor: '#a855f7' },
  { subfolder: 'telegram', title: 'Telegram', emoji: '✈️', accentColor: '#2481cc' },
];

/**
 * Extracts the changelog subfolder from a note (e.g. 'google', 'openai', 'anthropic').
 */
export function extractChangelogSubfolder(note: Note): string | null {
  const checkString = (str?: string | null): string | null => {
    if (!str) return null;
    const normalized = str.replace(/\\/g, '/').toLowerCase();
    const match = normalized.match(/changelogsfeed\/([^/]+)/);
    if (match && match[1]) {
      const clean = match[1].trim().toLowerCase();
      return clean === 'antropic' ? 'anthropic' : clean;
    }
    return null;
  };

  const fromFolderPath = checkString(note.folderPath);
  if (fromFolderPath) return fromFolderPath;

  if (note.folders && Array.isArray(note.folders)) {
    for (const f of note.folders) {
      const p = f.folder?.path || f.folder?.name || '';
      const res = checkString(p);
      if (res) return res;
    }
  }

  const slug = (note.feed?.slug || '').toLowerCase();
  if (slug.startsWith('spark-changelogsfeed-')) {
    const sub = slug.replace(/^spark-changelogsfeed-/, '').trim();
    return sub === 'antropic' ? 'anthropic' : sub;
  }

  return null;
}

export function isChangelogsNote(note: Note): boolean {
  if (extractChangelogSubfolder(note)) return true;
  const slug = (note.feed?.slug || '').toLowerCase();
  if (slug.startsWith('spark-changelogsfeed') || slug === 'changelogsfeed') return true;
  const fp = (note.folderPath || '').replace(/\\/g, '/').toLowerCase();
  if (fp.includes('changelogsfeed')) return true;
  if (note.folders && Array.isArray(note.folders)) {
    return note.folders.some((f) => {
      const p = (f.folder?.path || f.folder?.name || '').replace(/\\/g, '/').toLowerCase();
      return p.includes('changelogsfeed');
    });
  }
  return false;
}

export function isNotebooklmNote(note: Note): boolean {
  const slug = (note.feed?.slug || '').toLowerCase();
  if (
    slug === 'spark-notebooklmai' ||
    slug.startsWith('spark-notebooklmai-') ||
    slug === 'notebooklm-ai' ||
    slug === 'notebooklm-podcasts'
  ) {
    return true;
  }
  const fp = (note.folderPath || '').replace(/\\/g, '/').toLowerCase();
  if (fp.includes('notebooklm') || fp.includes('podcasts/ai')) return true;
  if (note.folders && Array.isArray(note.folders)) {
    return note.folders.some((f) => {
      const p = (f.folder?.path || f.folder?.name || '').replace(/\\/g, '/').toLowerCase();
      return p.includes('notebooklm') || p.includes('podcasts/ai');
    });
  }
  return false;
}

/**
 * Classifies a NotebookLM note into 'telegram' or 'regular' subtopic.
 */
export function extractNotebooklmSubtopic(note: Note): 'telegram' | 'regular' | null {
  if (!isNotebooklmNote(note)) return null;

  const slug = (note.feed?.slug || '').toLowerCase();
  if (slug === 'spark-notebooklmai-telegram') return 'telegram';
  if (slug === 'spark-notebooklmai-regular') return 'regular';

  const checkPath = (str?: string | null): 'telegram' | 'regular' | null => {
    if (!str) return null;
    const normalized = str.replace(/\\/g, '/').toLowerCase();
    if (normalized.includes('notebooklmai/telegram') || normalized.includes('notebooklm/telegram')) {
      return 'telegram';
    }
    if (normalized.includes('notebooklmai/regular') || normalized.includes('notebooklm/regular')) {
      return 'regular';
    }
    return null;
  };

  const fromFolderPath = checkPath(note.folderPath);
  if (fromFolderPath) return fromFolderPath;

  if (note.folders && Array.isArray(note.folders)) {
    for (const f of note.folders) {
      const res = checkPath(f.folder?.path || f.folder?.name);
      if (res) return res;
    }
  }

  const meta = (note.metadata || {}) as Record<string, any>;
  const subtype = String(meta.subtype || '').toLowerCase();
  if (subtype.includes('telegram')) return 'telegram';

  const fileName = String(meta.fileName || meta.filePath || note.externalId || '').toLowerCase();
  if (fileName.includes('telegram')) return 'telegram';

  const title = (note.title || '').toLowerCase();
  if (title.includes('telegram')) return 'telegram';

  if (note.hashtags && Array.isArray(note.hashtags)) {
    const hasTgTag = note.hashtags.some((h) => (h.name || '').toLowerCase() === 'telegram');
    if (hasTgTag) return 'telegram';
  }

  return 'regular';
}
