import dayjs from 'dayjs';
import {
  ObsidianContainer,
  BoundFolder,
  getContainerDisplayTitle,
} from '@lenta/shared';

export interface ChangeLogItem {
  id: string;
  noteId?: string;
  type: 'add' | 'update' | 'delete' | 'commit';
  symbol: string;
  colorClass: string;
  badgeClass?: string;
  badgeText?: string;
  text: string;
  rawTitle?: string;
  curator?: string | null;
  curatorLabel?: string;
  date: string;
  timestamp: number;
  isUnread?: boolean;
}

export const CONTAINER_LAST_VISITED_KEY = 'lemon_lenta_container_last_visited_v1';

export function getStoredContainerLastVisited(containerId: string): number {
  try {
    const raw = localStorage.getItem(`${CONTAINER_LAST_VISITED_KEY}_${containerId}`);
    if (raw) {
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  } catch {}
  // Default to 24 hours ago if no previous visit was saved
  return Date.now() - 24 * 60 * 60 * 1000;
}

export function setStoredContainerLastVisited(containerId: string, timestamp = Date.now()): void {
  try {
    localStorage.setItem(`${CONTAINER_LAST_VISITED_KEY}_${containerId}`, timestamp.toString());
  } catch {}
}

export function formatCuratorLabel(curator?: string | null): string {
  if (!curator) return 'Система';
  const c = curator.toLowerCase();
  if (c.includes('spark') || c.includes('gemini')) return '⚡ Gemini Spark';
  if (c === 'bus' || c.includes('command')) return '🚌 Command Bus';
  if (c.includes('obsidian')) return '💎 Obsidian';
  return curator;
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
 * Computes note additions/updates for the container change stream,
 * checking against the lastVisitedAt watermark.
 */
export function computeNoteChanges(
  containerNotes: any[],
  lastVisitedAt?: number,
): ChangeLogItem[] {
  return [...containerNotes]
    .sort(
      (a, b) =>
        new Date(b.updatedAt || b.startDate).getTime() -
        new Date(a.updatedAt || a.startDate).getTime(),
    )
    .map((note) => {
      const isNew = dayjs(note.createdAt).isSame(dayjs(note.updatedAt), 'minute') ||
        Math.abs(new Date(note.createdAt).getTime() - new Date(note.updatedAt).getTime()) < 3000;
      const noteTime = new Date(note.updatedAt || note.createdAt).getTime();
      const isUnread = Boolean(lastVisitedAt && noteTime > lastVisitedAt);
      const curatorLabel = formatCuratorLabel(note.curator);

      return {
        id: `note-${note.id}`,
        noteId: note.id,
        type: isNew ? ('add' as const) : ('update' as const),
        symbol: isNew ? '+' : '~',
        colorClass: isNew ? 'text-[#22c55e]' : 'text-[#e5e971]',
        badgeClass: isNew
          ? 'bg-[#22c55e]/15 text-[#86efac] border-[#22c55e]/30'
          : 'bg-[#e5e971]/15 text-[#fef08a] border-[#e5e971]/30',
        badgeText: isNew ? 'НОВОЕ' : 'ОБНОВЛЕНО',
        rawTitle: note.title,
        curator: note.curator,
        curatorLabel,
        text: isNew ? `Добавлено: ${note.title}` : `Обновлено: ${note.title}`,
        date: dayjs(note.updatedAt || note.createdAt).format('DD.MM.YY HH:mm'),
        timestamp: noteTime,
        isUnread,
      };
    });
}

/**
 * Computes delta metrics (unread count and total recent count).
 */
export function getContainerDeltaStats(
  container: ObsidianContainer,
  notes: any[],
  lastVisitedAt?: number,
) {
  const containerNotes = filterNotesForContainer(notes, container);
  const items = computeNoteChanges(containerNotes, lastVisitedAt);
  const unreadCount = items.filter((i) => i.isUnread).length;
  return {
    totalNotes: containerNotes.length,
    unreadCount,
    items,
  };
}

/**
 * Combines real note changes and optional server commits into a unified stream for display.
 * Prioritizes actual note data over server commits.
 */
export function getContainerChangeLogItems(
  container: ObsidianContainer,
  notesOrCommits: any[],
  maybeNotes?: any[],
  limit = 6,
  lastVisitedAt?: number,
): ChangeLogItem[] {
  // Support both (container, serverCommits, notes) and (container, notes) signatures
  const rawNotes = Array.isArray(maybeNotes) ? maybeNotes : notesOrCommits;
  const containerNotes = filterNotesForContainer(rawNotes, container);
  const noteChanges = computeNoteChanges(containerNotes, lastVisitedAt);

  if (noteChanges.length > 0) {
    return noteChanges.slice(0, limit);
  }

  // Graceful empty state placeholder
  return [
    {
      id: `empty-${container.id}`,
      type: 'add' as const,
      symbol: '●',
      colorClass: 'text-[#93927e]',
      badgeClass: 'bg-[#93927e]/15 text-[#c9c7b2] border-[#93927e]/30',
      badgeText: 'ОЖИДАНИЕ',
      rawTitle: container.name,
      curatorLabel: 'Система',
      text: `Контейнер готов к приёму заметок (Gemini Spark, Bus, Obsidian)`,
      date: dayjs(container.createdAt || Date.now()).format('DD.MM.YY'),
      timestamp: new Date(container.createdAt || Date.now()).getTime(),
      isUnread: false,
    },
  ];
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
