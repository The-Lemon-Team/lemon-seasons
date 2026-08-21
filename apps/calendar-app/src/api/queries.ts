import { useQuery } from '@tanstack/react-query';
import { calendarApi } from './client';
import { NoteType, QueryNotesParams } from '@lenta/shared';

export interface TimeSliceFilter {
  start: string;
  end: string;
  feeds?: string[];
  tags?: string[];
  hashtags?: string[];
  types?: NoteType[];
  search?: string;
  folder?: string;
}

export const queryKeys = {
  allNotes: ['notes'] as const,
  timeSliceNotes: (filter: TimeSliceFilter) => ['notes', 'time-slice', filter] as const,
  noteDetail: (id: string) => ['notes', 'detail', id] as const,
  feeds: ['feeds'] as const,
  taxonomyTree: ['taxonomy', 'tree'] as const,
  taxonomyFlat: ['taxonomy', 'flat'] as const,
  hashtags: ['hashtags'] as const,
};

/**
 * Scoped Time-Slice query for notes in range [start, end]
 */
export function useTimeSliceNotes(filter: TimeSliceFilter) {
  return useQuery({
    queryKey: queryKeys.timeSliceNotes(filter),
    queryFn: async () => {
      const params: QueryNotesParams = {
        startDateFrom: filter.start,
        startDateTo: filter.end,
        search: filter.search || undefined,
        limit: 500, // Rich volume for virtualized timeline & gantt
      };

      // If feed filter active
      if (filter.feeds && filter.feeds.length === 1) {
        params.feedSlug = filter.feeds[0];
      }

      // If tag path filter active
      if (filter.tags && filter.tags.length === 1) {
        params.tagPath = filter.tags[0];
      }

      // If hashtag filter active
      if (filter.hashtags && filter.hashtags.length === 1) {
        params.hashtag = filter.hashtags[0];
      }

      const response = await calendarApi.getNotes(params);
      let items = response.items;

      // Client-side multi-filter refinement if multiple feeds/tags/types are selected
      if (filter.feeds && filter.feeds.length > 1) {
        const feedSet = new Set(filter.feeds);
        items = items.filter((n) => n.feed?.slug && feedSet.has(n.feed.slug));
      }

      if (filter.tags && filter.tags.length > 1) {
        items = items.filter((n) =>
          n.tags?.some((t) => filter.tags!.some((filterTag) => t.path.startsWith(filterTag)))
        );
      }

      if (filter.hashtags && filter.hashtags.length > 1) {
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

export function useTaxonomyNodes() {
  return useQuery({
    queryKey: queryKeys.taxonomyFlat,
    queryFn: () => calendarApi.getTaxonomyNodes(),
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
