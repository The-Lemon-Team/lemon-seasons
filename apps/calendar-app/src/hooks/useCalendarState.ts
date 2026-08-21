import { useState, useEffect, useCallback } from 'react';
import { CalendarFilterState, CalendarViewMode, NoteType, getMonthBounds } from '@lenta/shared';
import dayjs from 'dayjs';

function getDefaultFilterState(): CalendarFilterState {
  const now = new Date();
  const bounds = getMonthBounds(now.getFullYear(), now.getMonth());
  return {
    start: bounds.start,
    end: bounds.end,
    view: 'timeline',
    feeds: [],
    tags: [],
    hashtags: [],
    types: [],
    search: '',
  };
}

export function parseUrlSearch(searchString: string): CalendarFilterState {
  const defaults = getDefaultFilterState();
  const params = new URLSearchParams(searchString);

  const start = params.get('start') || defaults.start;
  const end = params.get('end') || defaults.end;
  const viewRaw = params.get('view');
  const view: CalendarViewMode =
    viewRaw === 'gantt' || viewRaw === 'month' || viewRaw === 'timeline' ? viewRaw : 'timeline';

  const feeds = params.get('feeds')
    ? params.get('feeds')!.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const tags = params.get('tags')
    ? params.get('tags')!.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const hashtags = params.get('hashtags')
    ? params.get('hashtags')!.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const types = params.get('types')
    ? (params.get('types')!.split(',').map((s) => s.trim()).filter(Boolean) as NoteType[])
    : [];

  const search = params.get('search') || '';

  return {
    start,
    end,
    view,
    feeds,
    tags,
    hashtags,
    types,
    search,
  };
}

export function serializeFilterToUrl(state: CalendarFilterState): string {
  const params = new URLSearchParams();

  if (state.start) params.set('start', state.start);
  if (state.end) params.set('end', state.end);
  if (state.view && state.view !== 'timeline') params.set('view', state.view);
  if (state.feeds && state.feeds.length > 0) params.set('feeds', state.feeds.join(','));
  if (state.tags && state.tags.length > 0) params.set('tags', state.tags.join(','));
  if (state.hashtags && state.hashtags.length > 0) params.set('hashtags', state.hashtags.join(','));
  if (state.types && state.types.length > 0) params.set('types', state.types.join(','));
  if (state.search && state.search.trim()) params.set('search', state.search.trim());

  const str = params.toString();
  return str ? `?${str}` : '';
}

export function useCalendarState() {
  const [filterState, setFilterState] = useState<CalendarFilterState>(() =>
    parseUrlSearch(window.location.search)
  );

  // Sync with browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setFilterState(parseUrlSearch(window.location.search));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update URL whenever filter state changes
  const updateFilter = useCallback((updater: Partial<CalendarFilterState> | ((prev: CalendarFilterState) => CalendarFilterState)) => {
    setFilterState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      const search = serializeFilterToUrl(next);
      const newUrl = `${window.location.pathname}${search}${window.location.hash}`;
      if (newUrl !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
        window.history.pushState(null, '', newUrl);
      }
      return next;
    });
  }, []);

  const setDateRange = useCallback((start: string, end: string) => {
    updateFilter({ start, end });
  }, [updateFilter]);

  const setStartDate = useCallback((start: string) => {
    updateFilter({ start });
  }, [updateFilter]);

  const setEndDate = useCallback((end: string) => {
    updateFilter({ end });
  }, [updateFilter]);

  const setView = useCallback((view: CalendarViewMode) => {
    updateFilter({ view });
  }, [updateFilter]);

  const toggleFeed = useCallback((feedSlug: string) => {
    updateFilter((prev) => {
      const exists = prev.feeds.includes(feedSlug);
      const feeds = exists ? prev.feeds.filter((f) => f !== feedSlug) : [...prev.feeds, feedSlug];
      return { ...prev, feeds };
    });
  }, [updateFilter]);

  const toggleTag = useCallback((tagPath: string) => {
    updateFilter((prev) => {
      const exists = prev.tags.includes(tagPath);
      const tags = exists ? prev.tags.filter((t) => t !== tagPath) : [...prev.tags, tagPath];
      return { ...prev, tags };
    });
  }, [updateFilter]);

  const toggleHashtag = useCallback((hashtag: string) => {
    updateFilter((prev) => {
      const clean = hashtag.replace(/^#/, '');
      const exists = prev.hashtags.includes(clean);
      const hashtags = exists ? prev.hashtags.filter((h) => h !== clean) : [...prev.hashtags, clean];
      return { ...prev, hashtags };
    });
  }, [updateFilter]);

  const toggleType = useCallback((type: NoteType) => {
    updateFilter((prev) => {
      const exists = prev.types.includes(type);
      const types = exists ? prev.types.filter((t) => t !== type) : [...prev.types, type];
      return { ...prev, types };
    });
  }, [updateFilter]);

  const setSearch = useCallback((search: string) => {
    updateFilter({ search });
  }, [updateFilter]);

  const prevMonth = useCallback(() => {
    setFilterState((prev) => {
      const cur = dayjs(prev.start || undefined);
      const target = cur.subtract(1, 'month');
      const bounds = getMonthBounds(target.year(), target.month());
      const next = { ...prev, start: bounds.start, end: bounds.end };
      const search = serializeFilterToUrl(next);
      window.history.pushState(null, '', `${window.location.pathname}${search}${window.location.hash}`);
      return next;
    });
  }, []);

  const nextMonth = useCallback(() => {
    setFilterState((prev) => {
      const cur = dayjs(prev.start || undefined);
      const target = cur.add(1, 'month');
      const bounds = getMonthBounds(target.year(), target.month());
      const next = { ...prev, start: bounds.start, end: bounds.end };
      const search = serializeFilterToUrl(next);
      window.history.pushState(null, '', `${window.location.pathname}${search}${window.location.hash}`);
      return next;
    });
  }, []);

  const setToday = useCallback(() => {
    const now = dayjs();
    const bounds = getMonthBounds(now.year(), now.month());
    updateFilter({ start: bounds.start, end: bounds.end });
  }, [updateFilter]);

  const resetFilters = useCallback(() => {
    updateFilter({
      feeds: [],
      tags: [],
      hashtags: [],
      types: [],
      search: '',
    });
  }, [updateFilter]);

  return {
    filterState,
    filters: filterState,
    updateFilter,
    setDateRange,
    setStartDate,
    setEndDate,
    setView,
    toggleFeed,
    toggleTag,
    toggleHashtag,
    toggleType,
    setSearch,
    prevMonth,
    nextMonth,
    setToday,
    resetFilters,
  };
}
