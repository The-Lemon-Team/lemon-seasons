import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCoreLiveStream } from '@feed-core';
import { watchersStreamApi } from '../api/watchersStreamApi';
import {
  StreamCounts,
  StreamLiveEvent,
  StreamNewsStatus,
  WatcherFolder,
  WatcherState,
  WatcherStreamItem,
} from '../types';

const PAGE_SIZE = 30;

export function useWatchersStream() {
  const [folders, setFolders] = useState<WatcherFolder[]>([]);
  const [watchers, setWatchers] = useState<WatcherState[]>([]);
  const [items, setItems] = useState<WatcherStreamItem[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<StreamCounts>({
    newCount: 0,
    promotedCount: 0,
    dismissedCount: 0,
    totalCount: 0,
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedWatcher, setSelectedWatcher] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StreamNewsStatus | 'ALL'>('NEW');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mutatingIds, setMutatingIds] = useState<Set<string>>(() => new Set());
  const [isTriggeringAll, setIsTriggeringAll] = useState(false);
  const [lastHeartbeatAt, setLastHeartbeatAt] = useState<string | null>(null);

  const [pendingLiveItems, setPendingLiveItems] = useState<WatcherStreamItem[]>([]);

  const loadMetadata = useCallback(async () => {
    try {
      const [foldersData, watchersData] = await Promise.all([
        watchersStreamApi.getFolders(),
        watchersStreamApi.getWatchers(),
      ]);
      setFolders(foldersData);
      setWatchers(watchersData);
    } catch (err: any) {
      console.warn('[useWatchersStream] Metadata load warning:', err?.message || err);
    }
  }, []);

  const loadPage = useCallback(
    async (offset = 0, append = false) => {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setError(null);
      }

      try {
        const res = await watchersStreamApi.getStreamItems({
          categories: selectedCategory ? [selectedCategory] : undefined,
          watchers: selectedWatcher ? [selectedWatcher] : undefined,
          status: statusFilter,
          search: searchQuery || undefined,
          limit: PAGE_SIZE,
          offset,
        });

        setItems((prev) => {
          if (!append) return res.items;
          const map = new Map<string, WatcherStreamItem>();
          for (const it of prev) map.set(it.id, it);
          for (const it of res.items) map.set(it.id, it);
          return Array.from(map.values());
        });
        setTotal(res.total);
        if (res.counts) setCounts(res.counts);
        if (!append) setPendingLiveItems([]);
      } catch (err: any) {
        setError(err?.message || 'Не удалось подключиться к Lemon-Watchers (:3040)');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [selectedCategory, selectedWatcher, statusFilter, searchQuery]
  );

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  useEffect(() => {
    loadPage(0, false);
  }, [loadPage]);

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
      if (eventName === 'heartbeat') {
        setLastHeartbeatAt(ev.timestamp || new Date().toISOString());
        return;
      }

      if (eventName === 'news_item' && ev.item) {
        const incoming = ev.item;
        setPendingLiveItems((prev) => {
          if (prev.some((x) => x.id === incoming.id)) return prev;
          return [incoming, ...prev];
        });
        setCounts((prev) => ({
          ...prev,
          newCount: prev.newCount + 1,
          totalCount: prev.totalCount + 1,
        }));
        return;
      }

      if (eventName === 'news_promoted' && ev.item) {
        const promoted = ev.item;
        setPendingLiveItems((prev) => prev.filter((x) => x.id !== promoted.id));
        setItems((prev) => {
          if (statusFilter === 'NEW') {
            return prev.filter((x) => x.id !== promoted.id);
          }
          return prev.map((x) => (x.id === promoted.id ? promoted : x));
        });
        return;
      }

      if (eventName === 'news_dismissed' && ev.item) {
        const dismissed = ev.item;
        setPendingLiveItems((prev) => prev.filter((x) => x.id !== dismissed.id));
        setItems((prev) => {
          if (statusFilter === 'NEW') {
            return prev.filter((x) => x.id !== dismissed.id);
          }
          return prev.map((x) => (x.id === dismissed.id ? dismissed : x));
        });
      }
    },
    [statusFilter]
  );

  const { status: sseStatus } = useCoreLiveStream<StreamLiveEvent>({
    url: sseUrl,
    enabled: true,
    eventNames: ['news_item', 'news_promoted', 'news_dismissed', 'heartbeat'],
    onEvent: handleSseEvent,
  });

  const applyPendingLive = useCallback(() => {
    if (pendingLiveItems.length === 0) return;
    setItems((prev) => {
      const map = new Map<string, WatcherStreamItem>();
      for (const it of pendingLiveItems) map.set(it.id, it);
      for (const it of prev) {
        if (!map.has(it.id)) map.set(it.id, it);
      }
      return Array.from(map.values());
    });
    setTotal((prev) => prev + pendingLiveItems.length);
    setPendingLiveItems([]);
  }, [pendingLiveItems]);

  const dismissPendingLive = useCallback(() => {
    setPendingLiveItems([]);
  }, []);

  const markMutating = (ids: string[], active: boolean) => {
    setMutatingIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (active) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const promoteItem = useCallback(
    async (id: string) => {
      markMutating([id], true);
      try {
        const res = await watchersStreamApi.promoteItem(id);
        setItems((prev) => {
          if (statusFilter === 'NEW') return prev.filter((x) => x.id !== id);
          return prev.map((x) => (x.id === id ? res.item : x));
        });
        setCounts((prev) => ({
          ...prev,
          newCount: Math.max(0, prev.newCount - 1),
          promotedCount: prev.promotedCount + 1,
        }));
        return res;
      } finally {
        markMutating([id], false);
      }
    },
    [statusFilter]
  );

  const batchPromote = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      markMutating(ids, true);
      try {
        await watchersStreamApi.batchPromote(ids);
        await loadPage(0, false);
      } finally {
        markMutating(ids, false);
      }
    },
    [loadPage]
  );

  const dismissItem = useCallback(
    async (id: string) => {
      markMutating([id], true);
      try {
        const res = await watchersStreamApi.dismissItem(id);
        setItems((prev) => {
          if (statusFilter === 'NEW') return prev.filter((x) => x.id !== id);
          return prev.map((x) => (x.id === id ? res.item : x));
        });
        setCounts((prev) => ({
          ...prev,
          newCount: Math.max(0, prev.newCount - 1),
          dismissedCount: prev.dismissedCount + 1,
        }));
      } finally {
        markMutating([id], false);
      }
    },
    [statusFilter]
  );

  const batchDismiss = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      markMutating(ids, true);
      try {
        await watchersStreamApi.batchDismiss(ids);
        await loadPage(0, false);
      } finally {
        markMutating(ids, false);
      }
    },
    [loadPage]
  );

  const triggerAll = useCallback(async () => {
    setIsTriggeringAll(true);
    try {
      await watchersStreamApi.triggerAllWatchers();
    } finally {
      setIsTriggeringAll(false);
    }
  }, []);

  return {
    folders,
    watchers,
    items,
    total,
    counts,
    selectedCategory,
    setSelectedCategory,
    selectedWatcher,
    setSelectedWatcher,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    isLoading,
    isLoadingMore,
    hasMore: items.length < total,
    loadMore: () => loadPage(items.length, true),
    refresh: () => loadPage(0, false),
    error,
    sseStatus,
    lastHeartbeatAt,
    pendingLiveCount: pendingLiveItems.length,
    applyPendingLive,
    dismissPendingLive,
    mutatingIds,
    promoteItem,
    batchPromote,
    dismissItem,
    batchDismiss,
    triggerAll,
    isTriggeringAll,
  };
}
