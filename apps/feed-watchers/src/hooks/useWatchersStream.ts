import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useCoreLiveStream } from '@feed-core';
import { WatchersApiClient, WatchersNeuron, WatchersNeuronState } from '@lenta/seasons-neurons';
import { watchersStreamApi } from '../api/watchersStreamApi';
import { CreateWatcherInput, StreamLiveEvent, StreamNewsStatus } from '../types';
import { parseWatchersRoute, pushWatchersRoute } from '../utils/watchersRouter';

const PAGE_SIZE = 30;

export interface UseWatchersStreamOptions {
  embedded?: boolean;
  externalCategory?: string;
  onExternalCategoryChange?: (slug?: string) => void;
}

export function useWatchersStream(options: UseWatchersStreamOptions = {}) {
  const { embedded = false, externalCategory, onExternalCategoryChange } = options;
  const initialRoute = useMemo(() => parseWatchersRoute(), []);

  const neuronRef = useRef<WatchersNeuron | null>(null);
  if (!neuronRef.current) {
    neuronRef.current = new WatchersNeuron({
      apiClient: watchersStreamApi as unknown as WatchersApiClient,
      pageSize: PAGE_SIZE,
      initialFilter: { status: initialRoute.status },
    });
  }
  const neuron = neuronRef.current;

  const [neuronState, setNeuronState] = useState<WatchersNeuronState>(() => neuron.state);
  const [internalCategory, setInternalCategory] = useState<string>(() =>
    externalCategory !== undefined ? externalCategory : initialRoute.category
  );
  const [selectedWatcher, setSelectedWatcherState] = useState<string>(() => initialRoute.watcher);
  const [statusFilter, setStatusFilterState] = useState<StreamNewsStatus | 'ALL'>(
    () => initialRoute.status
  );
  const [searchQuery, setSearchQueryState] = useState<string>(() => initialRoute.search);
  const [isManagerRouteOpen, setIsManagerRouteOpen] = useState<boolean>(() => initialRoute.manage);

  const selectedCategory =
    embedded && externalCategory !== undefined ? externalCategory : internalCategory;

  useEffect(() => {
    const sub = neuron.stateObservable.subscribe((next) => {
      setNeuronState(next);
    });
    return () => sub.unsubscribe();
  }, [neuron]);

  useEffect(() => {
    neuron.loadMetadata().catch((err: any) => {
      console.warn('[useWatchersStream] Metadata load warning:', err?.message || err);
    });
  }, [neuron]);

  // Listen to browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const parsed = parseWatchersRoute();
      if (!embedded) {
        setInternalCategory(parsed.category);
      }
      setSelectedWatcherState(parsed.watcher);
      setStatusFilterState(parsed.status);
      setSearchQueryState(parsed.search);
      setIsManagerRouteOpen(parsed.manage);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [embedded]);

  const syncRoute = useCallback(
    (
      patch: Partial<{
        category: string;
        watcher: string;
        status: StreamNewsStatus | 'ALL';
        search: string;
        manage: boolean;
      }>,
      replace = false
    ) => {
      pushWatchersRoute(
        {
          category: patch.category ?? selectedCategory,
          watcher: patch.watcher ?? selectedWatcher,
          status: patch.status ?? statusFilter,
          search: patch.search ?? searchQuery,
          manage: patch.manage ?? isManagerRouteOpen,
        },
        { embedded, replace }
      );
    },
    [selectedCategory, selectedWatcher, statusFilter, searchQuery, isManagerRouteOpen, embedded]
  );

  const setSelectedCategory = useCallback(
    (slug: string) => {
      if (embedded && onExternalCategoryChange) {
        onExternalCategoryChange(slug || undefined);
      } else {
        setInternalCategory(slug);
        syncRoute({ category: slug, watcher: '' });
      }
    },
    [embedded, onExternalCategoryChange, syncRoute]
  );

  const setSelectedWatcher = useCallback(
    (slug: string) => {
      setSelectedWatcherState(slug);
      syncRoute({ watcher: slug });
    },
    [syncRoute]
  );

  const setStatusFilter = useCallback(
    (status: StreamNewsStatus | 'ALL') => {
      setStatusFilterState(status);
      syncRoute({ status });
    },
    [syncRoute]
  );

  const setSearchQuery = useCallback(
    (q: string) => {
      setSearchQueryState(q);
      syncRoute({ search: q }, true);
    },
    [syncRoute]
  );

  const setManagerOpen = useCallback(
    (open: boolean) => {
      setIsManagerRouteOpen(open);
      syncRoute({ manage: open });
    },
    [syncRoute]
  );

  useEffect(() => {
    neuron.loadInitial({
      categories: selectedCategory ? [selectedCategory] : undefined,
      watchers: selectedWatcher ? [selectedWatcher] : undefined,
      status: statusFilter,
      search: searchQuery || undefined,
    });
  }, [neuron, selectedCategory, selectedWatcher, statusFilter, searchQuery]);

  const sseUrl = useMemo(
    () =>
      watchersStreamApi.getSseUrl({
        categories: selectedCategory ? [selectedCategory] : undefined,
        watchers: selectedWatcher ? [selectedWatcher] : undefined,
        replay: 0,
      }),
    [selectedCategory, selectedWatcher]
  );

  const handleSseEvent = useCallback(
    (eventName: string, ev: StreamLiveEvent) => {
      neuron.handleLiveEvent(eventName, ev);
    },
    [neuron]
  );

  const { status: sseStatus } = useCoreLiveStream<StreamLiveEvent>({
    url: sseUrl,
    enabled: true,
    eventNames: ['news_item', 'news_promoted', 'news_dismissed', 'heartbeat'],
    onEvent: handleSseEvent,
  });

  const mutatingIds = useMemo(
    () => new Set(neuronState.mutatingIds),
    [neuronState.mutatingIds]
  );

  const togglingWatcherIds = useMemo(
    () => new Set(neuronState.togglingWatcherIds),
    [neuronState.togglingWatcherIds]
  );

  const triggeringWatcherIds = useMemo(
    () => new Set(neuronState.triggeringWatcherIds),
    [neuronState.triggeringWatcherIds]
  );

  const activeWatchersCount = useMemo(
    () => neuronState.watchers.filter((w) => w.enabled).length,
    [neuronState.watchers]
  );

  return {
    folders: neuronState.folders,
    watchers: neuronState.watchers,
    activeWatchersCount,
    items: neuronState.items,
    total: neuronState.total,
    counts: neuronState.counts,
    selectedCategory,
    setSelectedCategory,
    selectedWatcher,
    setSelectedWatcher,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    isManagerOpen: isManagerRouteOpen,
    setManagerOpen,
    isLoading: neuronState.isLoading,
    isLoadingMore: neuronState.isLoadingMore,
    hasMore: neuronState.hasMore,
    loadMore: useCallback(() => neuron.loadMore(), [neuron]),
    refresh: useCallback(() => neuron.refresh(), [neuron]),
    error: neuronState.error,
    sseStatus,
    lastHeartbeatAt: neuronState.lastHeartbeatAt,
    pendingLiveCount: neuronState.pendingLiveItems.length,
    applyPendingLive: useCallback(() => neuron.applyPendingLive(), [neuron]),
    dismissPendingLive: useCallback(() => neuron.dismissPendingLive(), [neuron]),
    mutatingIds,
    togglingWatcherIds,
    triggeringWatcherIds,
    isBulkWatchersMutating: neuronState.isBulkWatchersMutating,
    promoteItem: useCallback((id: string) => neuron.promote(id), [neuron]),
    batchPromote: useCallback((ids: string[]) => neuron.batchPromote(ids), [neuron]),
    dismissItem: useCallback((id: string) => neuron.dismiss(id), [neuron]),
    batchDismiss: useCallback((ids: string[]) => neuron.batchDismiss(ids), [neuron]),
    triggerAll: useCallback(() => neuron.triggerAll(), [neuron]),
    isTriggeringAll: neuronState.isTriggeringAll,
    toggleWatcher: useCallback(
      (idOrSlug: string, enabled: boolean) => neuron.toggleWatcher(idOrSlug, enabled),
      [neuron]
    ),
    triggerWatcher: useCallback(
      (idOrSlug: string) => neuron.triggerWatcher(idOrSlug),
      [neuron]
    ),
    resumeAllWatchers: useCallback(() => neuron.resumeAllWatchers(), [neuron]),
    pauseAllWatchers: useCallback(() => neuron.pauseAllWatchers(), [neuron]),
    validateFeed: useCallback(
      (url: string, protocol: 'rss' | 'atom' | 'json' = 'rss') =>
        neuron.validateFeed(url, protocol),
      [neuron]
    ),
    createWatcher: useCallback(
      (input: CreateWatcherInput) => neuron.createWatcher(input),
      [neuron]
    ),
    updateWatcher: useCallback(
      (idOrSlug: string, patch: Record<string, any>) => neuron.updateWatcher(idOrSlug, patch),
      [neuron]
    ),
  };
}
