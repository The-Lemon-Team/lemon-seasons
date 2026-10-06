import dayjs from 'dayjs';
import {
  ObsidianContainer,
  BoundFolder,
  getContainerDisplayTitle,
} from '@lenta/shared';

export interface ChangeLogItem {
  id: string;
  type: 'add' | 'update' | 'commit';
  symbol: string;
  colorClass: string;
  text: string;
  date: string;
  timestamp: number;
}

/**
 * Filters notes that belong to an Obsidian container either by direct containerId
 * or by matching bound folder paths.
 */
export function filterNotesForContainer(
  notes: any[],
  container: ObsidianContainer,
): any[] {
  const boundPaths = container.boundFolders.map((bf: BoundFolder) =>
    bf.path.toLowerCase(),
  );

  return (notes || []).filter((note) => {
    if ((note as any).containerId === container.id) return true;
    if (note.folders && note.folders.length > 0) {
      return note.folders.some((f: any) => {
        const fp = (f.folder?.path || f.folder?.name || '').toLowerCase();
        return boundPaths.some(
          (bp: string) => fp === bp || fp.startsWith(bp + '/') || bp.startsWith(fp + '/'),
        );
      });
    }
    return false;
  });
}

/**
 * Computes note additions/updates for the container change stream.
 */
export function computeNoteChanges(containerNotes: any[]): ChangeLogItem[] {
  return [...containerNotes]
    .sort(
      (a, b) =>
        new Date(b.updatedAt || b.startDate).getTime() -
        new Date(a.updatedAt || a.startDate).getTime(),
    )
    .map((note) => {
      const isNew = dayjs(note.createdAt).isSame(dayjs(note.updatedAt), 'minute');
      return {
        id: `note-${note.id}`,
        type: isNew ? ('add' as const) : ('update' as const),
        symbol: isNew ? '+' : '~',
        colorClass: isNew ? 'text-[#22c55e]' : 'text-[#e5e971]',
        text: isNew ? `Добавлено Note ${note.title}` : `Обновлена заметка ${note.title}`,
        date: dayjs(note.updatedAt || note.createdAt).format('DD.MM.YY'),
        timestamp: new Date(note.updatedAt || note.createdAt).getTime(),
      };
    });
}

/**
 * Computes commit change items from server commits.
 */
export function computeCommitChanges(serverCommits: any[]): ChangeLogItem[] {
  return (serverCommits || []).map((c) => ({
    id: `commit-${c.hash}`,
    type: 'commit' as const,
    symbol: '●',
    colorClass: 'text-[#a855f7]',
    text: c.message || `Синхронизация коммита ${c.shortHash}`,
    date: c.date ? dayjs(c.date).format('DD.MM.YY') : dayjs().format('DD.MM.YY'),
    timestamp: c.date ? new Date(c.date).getTime() : Date.now(),
  }));
}

/**
 * Fallback items when no commits or notes are recorded yet.
 */
export function getDefaultFallbackChanges(
  container: ObsidianContainer,
): ChangeLogItem[] {
  return [
    {
      id: `fallback-1-${container.id}`,
      type: 'add' as const,
      symbol: '+',
      colorClass: 'text-[#22c55e]',
      text: `Добавлено Note ${container.boundFolders[0]?.name || 'Новости Мира, ООН'}`,
      date: dayjs().format('DD.MM.YY'),
      timestamp: Date.now() - 1000 * 60 * 60,
    },
    {
      id: `fallback-2-${container.id}`,
      type: 'add' as const,
      symbol: '+',
      colorClass: 'text-[#22c55e]',
      text: `Добавлено Note ${container.boundFolders[1]?.name || 'Выборы в Конгресс США'}`,
      date: dayjs().format('DD.MM.YY'),
      timestamp: Date.now() - 1000 * 60 * 120,
    },
    {
      id: `fallback-3-${container.id}`,
      type: 'update' as const,
      symbol: '~',
      colorClass: 'text-[#e5e971]',
      text: `Обновлена заметка ${container.name} - План релизов v2.1`,
      date: dayjs().subtract(1, 'day').format('DD.MM.YY'),
      timestamp: Date.now() - 1000 * 60 * 60 * 24,
    },
    {
      id: `fallback-4-${container.id}`,
      type: 'update' as const,
      symbol: '~',
      colorClass: 'text-[#e5e971]',
      text: `Обновлена заметка ИИ Архитектура & Vector Pipelines`,
      date: dayjs().subtract(2, 'day').format('DD.MM.YY'),
      timestamp: Date.now() - 1000 * 60 * 60 * 48,
    },
    {
      id: `fallback-5-${container.id}`,
      type: 'add' as const,
      symbol: '+',
      colorClass: 'text-[#22c55e]',
      text: `Добавлено Note Релизы и Премьеры 2026`,
      date: dayjs().subtract(3, 'day').format('DD.MM.YY'),
      timestamp: Date.now() - 1000 * 60 * 60 * 72,
    },
    {
      id: `fallback-6-${container.id}`,
      type: 'commit' as const,
      symbol: '●',
      colorClass: 'text-[#a855f7]',
      text: `Инициализация структуры контейнера vault`,
      date: dayjs(container.createdAt || Date.now()).format('DD.MM.YY'),
      timestamp: new Date(container.createdAt || Date.now()).getTime(),
    },
  ];
}

/**
 * Combines note changes and commit changes into a unified stream for display.
 */
export function getContainerChangeLogItems(
  container: ObsidianContainer,
  serverCommits: any[],
  notes: any[],
  limit = 6,
): ChangeLogItem[] {
  const containerNotes = filterNotesForContainer(notes, container);
  const noteChanges = computeNoteChanges(containerNotes);
  const commitChanges = computeCommitChanges(serverCommits);

  const combined = [...noteChanges, ...commitChanges].sort(
    (a, b) => b.timestamp - a.timestamp,
  );

  return (
    combined.length > 0 ? combined : getDefaultFallbackChanges(container)
  ).slice(0, limit);
}

/**
 * Filter containers by search query and privacy mode.
 */
export function filterContainers(
  containers: ObsidianContainer[],
  filter: { privacy: 'all' | 'private' | 'public'; searchTerm: string },
): ObsidianContainer[] {
  const q = filter.searchTerm.toLowerCase().trim();

  return containers.filter((c) => {
    const matchesPrivacy =
      filter.privacy === 'all' ? true : c.privacy === filter.privacy;
    if (!matchesPrivacy) return false;

    if (!q) return true;

    const displayTitle = getContainerDisplayTitle(c).toLowerCase();
    const matchesSearch =
      displayTitle.includes(q) ||
      c.name.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q)) ||
      c.vaultPath.toLowerCase().includes(q) ||
      c.boundFolders.some(
        (f) =>
          f.path.toLowerCase().includes(q) ||
          (f.name && f.name.toLowerCase().includes(q)),
      );

    return matchesSearch;
  });
}

/**
 * Computes aggregated statistics for a list of containers.
 */
export function computeContainerStats(containers: ObsidianContainer[]) {
  const totalObservedFolders = containers.reduce(
    (sum, c) => sum + c.boundFolders.length,
    0,
  );
  const totalSyncedNotes = containers.reduce((sum, c) => sum + c.notesCount, 0);
  const privateCount = containers.filter((c) => c.privacy === 'private').length;
  const publicCount = containers.filter((c) => c.privacy === 'public').length;

  return {
    totalObservedFolders,
    totalSyncedNotes,
    privateCount,
    publicCount,
  };
}
