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
    feed: undefined,
    containers: [],
    tags: [],
    hashtags: [],
    types: [],
    search: '',
  };
}

export function getPathForView(view: CalendarViewMode): string {
  switch (view) {
    case 'month':
      return '/calendar';
    case 'gantt':
      return '/gantts';
    case 'feeds':
      return '/feeds';
    case 'folders':
      return '/folders';
    case 'obsidian':
      return '/obsidian';
    case 'timeline':
    default:
      return '/';
  }
}

export function getViewFromPath(pathname: string = window.location.pathname, viewQueryParam?: string | null): CalendarViewMode {
  const path = (pathname || '/').toLowerCase().replace(/\/+$/, '');
  if (path.endsWith('/calendar')) return 'month';
  if (path.endsWith('/gantt') || path.endsWith('/gantts') || path.endsWith('/gannts')) return 'gantt';
  if (path.endsWith('/feeds')) return 'feeds';
  if (path.endsWith('/folders')) return 'folders';
  if (path.endsWith('/obsidian')) return 'obsidian';

  if (viewQueryParam) {
    if (
      viewQueryParam === 'gantt' ||
      viewQueryParam === 'month' ||
      viewQueryParam === 'timeline' ||
      viewQueryParam === 'feeds' ||
      viewQueryParam === 'obsidian' ||
      viewQueryParam === 'folders'
    ) {
      return viewQueryParam as CalendarViewMode;
    }
  }

  return 'timeline';
}

export function parseUrlSearch(pathname: string = window.location.pathname, searchString: string = window.location.search): CalendarFilterState {
  const defaults = getDefaultFilterState();
  const params = new URLSearchParams(searchString);

  const start = params.get('start') || defaults.start;
  const end = params.get('end') || defaults.end;
  const viewRaw = params.get('view');
  const view: CalendarViewMode = getViewFromPath(pathname, viewRaw);

  const feedParam = params.get('feed') || params.get('feeds');
  const feed = feedParam ? feedParam.split(',')[0].trim() || undefined : undefined;

  const containers = params.get('containers')
    ? params.get('containers')!.split(',').map((s) => s.trim()).filter(Boolean)
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
    feed,
    containers,
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
  if (state.feed) params.set('feed', state.feed);
  if (state.containers && state.containers.length > 0) params.set('containers', state.containers.join(','));
  if (state.tags && state.tags.length > 0) params.set('tags', state.tags.join(','));
  if (state.hashtags && state.hashtags.length > 0) params.set('hashtags', state.hashtags.join(','));
  if (state.types && state.types.length > 0) params.set('types', state.types.join(','));
  if (state.search && state.search.trim()) params.set('search', state.search.trim());

  const str = params.toString();
  return str ? `?${str}` : '';
}

export function useCalendarState() {
  const [filterState, setFilterState] = useState<CalendarFilterState>(() =>
    parseUrlSearch(window.location.pathname, window.location.search)
  );

  // Sync with browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setFilterState(parseUrlSearch(window.location.pathname, window.location.search));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update URL whenever filter state changes
  const updateFilter = useCallback((updater: Partial<CalendarFilterState> | ((prev: CalendarFilterState) => CalendarFilterState)) => {
    setFilterState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      const path = getPathForView(next.view);
      const search = serializeFilterToUrl(next);
      const newUrl = `${path}${search}${window.location.hash}`;
      const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (newUrl !== currentUrl) {
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

  const selectFeed = useCallback((feedSlug?: string | null) => {
    updateFilter({ feed: feedSlug || undefined });
  }, [updateFilter]);

  const toggleFeed = useCallback((feedSlug: string) => {
    updateFilter((prev) => ({
      ...prev,
      feed: prev.feed === feedSlug ? undefined : feedSlug,
    }));
  }, [updateFilter]);

  const selectOnlyFeed = useCallback((feedSlug: string) => {
    updateFilter({ feed: feedSlug });
  }, [updateFilter]);

  const clearFeed = useCallback(() => {
    updateFilter({ feed: undefined });
  }, [updateFilter]);

  const toggleContainer = useCallback((containerId: string) => {
    updateFilter((prev) => {
      const current = prev.containers || [];
      const exists = current.includes(containerId);
      const containers = exists
        ? current.filter((id: string) => id !== containerId)
        : [...current, containerId];
      return { ...prev, containers };
    });
  }, [updateFilter]);

  const selectOnlyContainer = useCallback((containerId: string) => {
    updateFilter({ containers: [containerId] });
  }, [updateFilter]);

  const setAllContainers = useCallback((containers: string[]) => {
    updateFilter({ containers });
  }, [updateFilter]);

  const clearContainers = useCallback(() => {
    updateFilter({ containers: [] });
  }, [updateFilter]);

  const toggleTag = useCallback((tagPath: string) => {
    updateFilter((prev) => {
      const exists = prev.tags.includes(tagPath);
      const tags = exists ? prev.tags.filter((t) => t !== tagPath) : [...prev.tags, tagPath];
      return { ...prev, tags };
    });
  }, [updateFilter]);

  const selectOnlyTag = useCallback((tagPath: string) => {
    updateFilter({ tags: [tagPath] });
  }, [updateFilter]);

  const setAllTags = useCallback((tags: string[]) => {
    updateFilter({ tags });
  }, [updateFilter]);

  const clearTags = useCallback(() => {
    updateFilter({ tags: [] });
  }, [updateFilter]);

  const toggleHashtag = useCallback((hashtag: string) => {
    updateFilter((prev) => {
      const clean = hashtag.replace(/^#/, '');
      const exists = prev.hashtags.includes(clean);
      const hashtags = exists ? prev.hashtags.filter((h) => h !== clean) : [...prev.hashtags, clean];
      return { ...prev, hashtags };
    });
  }, [updateFilter]);

  const selectOnlyHashtag = useCallback((hashtag: string) => {
    const clean = hashtag.replace(/^#/, '');
    updateFilter({ hashtags: [clean] });
  }, [updateFilter]);

  const setAllHashtags = useCallback((hashtags: string[]) => {
    updateFilter({ hashtags: hashtags.map((h) => h.replace(/^#/, '')) });
  }, [updateFilter]);

  const clearHashtags = useCallback(() => {
    updateFilter({ hashtags: [] });
  }, [updateFilter]);

  const toggleType = useCallback((type: NoteType) => {
    updateFilter((prev) => {
      const exists = prev.types.includes(type);
      const types = exists ? prev.types.filter((t) => t !== type) : [...prev.types, type];
      return { ...prev, types };
    });
  }, [updateFilter]);

  const selectOnlyType = useCallback((type: NoteType) => {
    updateFilter({ types: [type] });
  }, [updateFilter]);

  const setAllTypes = useCallback((types: NoteType[]) => {
    updateFilter({ types });
  }, [updateFilter]);

  const clearTypes = useCallback(() => {
    updateFilter({ types: [] });
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
      const path = getPathForView(next.view);
      const search = serializeFilterToUrl(next);
      window.history.pushState(null, '', `${path}${search}${window.location.hash}`);
      return next;
    });
  }, []);

  const nextMonth = useCallback(() => {
    setFilterState((prev) => {
      const cur = dayjs(prev.start || undefined);
      const target = cur.add(1, 'month');
      const bounds = getMonthBounds(target.year(), target.month());
      const next = { ...prev, start: bounds.start, end: bounds.end };
      const path = getPathForView(next.view);
      const search = serializeFilterToUrl(next);
      window.history.pushState(null, '', `${path}${search}${window.location.hash}`);
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
      feed: undefined,
      containers: [],
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
    selectFeed,
    toggleFeed,
    selectOnlyFeed,
    clearFeed,
    clearFeeds: clearFeed,
    toggleContainer,
    selectOnlyContainer,
    setAllContainers,
    clearContainers,
    toggleTag,
    selectOnlyTag,
    setAllTags,
    clearTags,
    toggleHashtag,
    selectOnlyHashtag,
    setAllHashtags,
    clearHashtags,
    toggleType,
    selectOnlyType,
    setAllTypes,
    clearTypes,
    setSearch,
    prevMonth,
    nextMonth,
    setToday,
    resetFilters,
  };
}

