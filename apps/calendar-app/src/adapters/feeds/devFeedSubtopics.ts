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
