import { useQuery } from '@tanstack/react-query';
import { calendarApi } from './client';
import { NoteType, QueryNotesParams } from '@lenta/shared';

export interface TimeSliceFilter {
  start: string;
  end: string;
  feed?: string;
  containers?: string[];
  obsidianFolders?: string[];
  tags?: string[];
  hashtags?: string[];
  types?: NoteType[];
  search?: string;
  folder?: string;
  author?: string;
  curator?: string;
  minResonance?: number;
  privacy?: string;
  status?: string;
  appMode?: 'dev' | 'staging' | 'public';
}

export const queryKeys = {
  allNotes: ['notes'] as const,
  timeSliceNotes: (filter: TimeSliceFilter) => ['notes', 'time-slice', filter] as const,
  noteDetail: (id: string) => ['notes', 'detail', id] as const,
  feeds: ['feeds'] as const,
  taxonomyTree: ['taxonomy', 'tree'] as const,
  taxonomyFlat: ['taxonomy', 'flat'] as const,
  hashtags: ['hashtags'] as const,
  folders: ['folders'] as const,
  folderTree: ['folders', 'tree'] as const,
  folderDetail: (id: string) => ['folders', 'detail', id] as const,
};

/**
 * Scoped Time-Slice query for notes in range [start, end]
 */
export function useTimeSliceNotes(filter: TimeSliceFilter, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.timeSliceNotes(filter),
    placeholderData: (previousData, previousQuery) => {
      const prevFilter = previousQuery?.queryKey?.[2] as TimeSliceFilter | undefined;
      if (prevFilter?.appMode !== filter?.appMode) {
        return undefined;
      }
      return previousData;
    },
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const params: QueryNotesParams = {
        startDateFrom: filter.start,
        startDateTo: filter.end,
        search: filter.search || undefined,
        limit: 500, // Rich volume for virtualized timeline & gantt
      };

      // If feed filter active
      if (filter.feed) {
        params.feedSlug = filter.feed;
      }

      // If folder hierarchy filter active
      if (filter.tags && filter.tags.length === 1) {
        params.folder = filter.tags[0];
      }

      // If hashtag filter active
      if (filter.hashtags && filter.hashtags.length === 1) {
        params.hashtag = filter.hashtags[0];
      }

      // If container filter active
      if (filter.containers && filter.containers.length > 0) {
        params.containers = filter.containers;
      }

            const authorFilter = filter.author || filter.curator;
    if (authorFilter) {
      params.author = authorFilter;
    }

      if (filter.appMode === 'public') {
        params.appMode = 'public';
        params.privacy = 'public';
        params.status = 'PUBLISHED';
      } else if (filter.appMode === 'staging') {
        params.appMode = 'staging';
        params.privacy = 'public';
      } else if (filter.appMode === 'dev') {
        params.appMode = 'dev';
        if (filter.privacy && filter.privacy !== 'all') {
          params.privacy = filter.privacy as any;
        } else {
          params.privacy = 'all';
        }
      } else {
        if (filter.privacy) params.privacy = filter.privacy as any;
        if (filter.status) params.status = filter.status;
      }

      const response = await calendarApi.getNotes(params);
      let items = response.items;

      // Helper to check if a note matches a hierarchy tag/folder path
      const matchesHierarchyPath = (note: typeof items[0], filterTag: string): boolean => {
        const lower = filterTag.toLowerCase().trim();
        const parts = lower.split('/');
        const lastPart = parts[parts.length - 1];

        // 1. Check folder paths and names
        if (
          note.folders?.some((f) => {
            const fp = (f.folder?.path || '').toLowerCase();
            const fn = (f.folder?.name || '').toLowerCase();
            return fp === lower || fp.startsWith(lower + '/') || fn === lastPart;
          })
        ) {
          return true;
        }

        // 2. Check direct folderPath string property if present
        if ((note as any).folderPath) {
          const fp = ((note as any).folderPath as string).toLowerCase();
          if (fp === lower || fp.startsWith(lower + '/')) {
            return true;
          }
        }

        // 3. Check hashtags
        if (
          note.hashtags?.some((h) => {
            const hn = (h.name || '').toLowerCase();
            return hn === lastPart || hn === lower;
          })
        ) {
          return true;
        }

        // 4. Preset and semantic aliases
        if (lastPart === 'marvel') {
          return Boolean(
            note.title.toLowerCase().includes('marvel') ||
            note.title.toLowerCase().includes('avengers') ||
            note.hashtags?.some((h) => h.name.includes('marvel')) ||
            note.feed?.slug?.includes('mcu')
          );
        }
        if (lastPart === 'fantastic') {
          return Boolean(
            note.title.toLowerCase().includes('fantastic') ||
            note.title.toLowerCase().includes('sci-fi') ||
            note.title.toLowerCase().includes('universe')
          );
        }
        if (lastPart === 'usa') {
          return Boolean(
            note.title.toLowerCase().includes('usa') ||
            note.title.toLowerCase().includes('america') ||
            note.title.toLowerCase().includes('election')
          );
        }
        if (lastPart === 'russia') {
          return Boolean(
            note.title.toLowerCase().includes('russia') ||
            note.title.toLowerCase().includes('moscow') ||
            note.title.toLowerCase().includes('foreign')
          );
        }
        if (lower === 'films') {
          return Boolean(
            matchesHierarchyPath(note, 'Films/Marvel') ||
            matchesHierarchyPath(note, 'Films/Fantastic') ||
            note.type === 'FILM_RELEASE' ||
            note.tags?.some((t) => t.path.startsWith('movies') || t.path.startsWith('films')) ||
            note.folders?.some((f) => (f.folder?.path || '').toLowerCase().startsWith('news/marvel') || (f.folder?.path || '').toLowerCase().startsWith('news/cinema'))
          );
        }
        if (lower === 'politics') {
          return Boolean(matchesHierarchyPath(note, 'Politics/USA') || matchesHierarchyPath(note, 'Politics/Russia'));
        }

        return false;
      };

      // Environment / App Mode filter refinement
      if (filter.appMode === 'dev') {
        if (filter.privacy && filter.privacy !== 'all') {
          items = items.filter((n) => n.privacy === filter.privacy);
        }
      } else if (filter.appMode === 'staging') {
        items = items.filter((n) => n.privacy === 'public' && n.status !== 'PUBLISHED');
      } else if (filter.appMode === 'public') {
        items = items.filter((n) => n.privacy === 'public' && n.status === 'PUBLISHED');
      }

      // Client-side feed filter refinement
      if (filter.feed) {
        items = items.filter((n) => n.feed?.slug === filter.feed);
      }

      // Container filter refinement
      if (filter.containers && filter.containers.length > 0) {
        items = items.filter((n) => n.containerId && filter.containers!.includes(n.containerId));
      }

      if (filter.tags && filter.tags.length > 0) {
        items = items.filter((n) =>
          filter.tags!.some((filterTag) => matchesHierarchyPath(n, filterTag))
        );
      }

      if (filter.hashtags && filter.hashtags.length > 0) {
        const hashSet = new Set(filter.hashtags.map((h) => h.toLowerCase().replace(/^#/, '')));
        items = items.filter((n) =>
          n.hashtags?.some((h) => hashSet.has(h.name.toLowerCase().replace(/^#/, '')))
        );
      }

      if (filter.types && filter.types.length > 0) {
        const typeSet = new Set(filter.types);
        items = items.filter((n) => typeSet.has(n.type));
      }

      return {
        ...response,
        items,
        total: items.length,
      };
    },
    staleTime: 30_000,
  });
}

export function useNoteDetail(id?: string | null) {
  return useQuery({
    queryKey: queryKeys.noteDetail(id || ''),
    queryFn: () => (id ? calendarApi.getNoteById(id) : null),
    enabled: Boolean(id),
  });
}

export function useFeeds() {
  return useQuery({
    queryKey: queryKeys.feeds,
    queryFn: () => calendarApi.getFeeds(),
    staleTime: 60_000,
  });
}

export function useTaxonomyTree() {
  return useQuery({
    queryKey: queryKeys.taxonomyTree,
    queryFn: () => calendarApi.getTaxonomyTree(),
    staleTime: 60_000,
  });
}

export function useHashtags() {
  return useQuery({
    queryKey: queryKeys.hashtags,
    queryFn: () => calendarApi.getHashtags(),
    staleTime: 60_000,
  });
}

export function useFolders(search?: string) {
  return useQuery({
    queryKey: [...queryKeys.folders, search],
    queryFn: () => calendarApi.getFolders(false, search),
    staleTime: 30_000,
  });
}

export function useFolderTree() {
  return useQuery({
    queryKey: queryKeys.folderTree,
    queryFn: () => calendarApi.getFolderTree(),
    staleTime: 30_000,
  });
}



export function useDailySummaryQuery(date?: string | null) {
  return useQuery({
    queryKey: ['daily-summary', date],
    queryFn: () => (date ? calendarApi.getDailySummary(date) : null),
    enabled: Boolean(date),
    staleTime: 30_000,
  });
}



