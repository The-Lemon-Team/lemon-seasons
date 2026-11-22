import { BehaviorSubject, Observable } from 'rxjs';
import { WatchersApiClient } from '../client/watchers-api.client.js';
import {
  CreateWatcherInput,
  ValidateWatcherFeedResult,
  WatcherFolder,
  WatcherPingRecord,
  WatcherState,
  WatcherStreamCounts,
  WatcherStreamItem,
  WatcherStreamLiveEvent,
  WatcherStreamQueryOptions,
} from '../types/watchers.types.js';

export interface WatchersNeuronState {
  folders: WatcherFolder[];
  watchers: WatcherState[];
  items: WatcherStreamItem[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  counts: WatcherStreamCounts;
  filter: WatcherStreamQueryOptions;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  mutatingIds: string[];
  togglingWatcherIds: string[];
  triggeringWatcherIds: string[];
  isBulkWatchersMutating: boolean;
  isTriggeringAll: boolean;
  lastHeartbeatAt: string | null;
  pendingLiveItems: WatcherStreamItem[];
}

export interface WatchersNeuronOptions {
  apiClient: WatchersApiClient;
  initialFilter?: WatcherStreamQueryOptions;
  pageSize?: number;
}

const EMPTY_COUNTS: WatcherStreamCounts = {
  newCount: 0,
  promotedCount: 0,
  dismissedCount: 0,
  totalCount: 0,
};

/**
 * Reactive Watchers Pre-Moderation & Source Control Neuron.
 * Manages Lemon-Watchers folders, watcher enable/pause/trigger lifecycle,
 * paginated stream items, live SSE buffering, and promote/dismiss mutations.
 */
export class WatchersNeuron {
  private readonly apiClient: WatchersApiClient;
  private readonly pageSize: number;
  private readonly state$: BehaviorSubject<WatchersNeuronState>;

  constructor(options: WatchersNeuronOptions) {
    this.apiClient = options.apiClient;
    this.pageSize = Math.min(200, Math.max(1, options.pageSize || 30));

    const initialFilter: WatcherStreamQueryOptions = {
      status: 'NEW',
      limit: this.pageSize,
      offset: 0,
      ...(options.initialFilter || {}),
    };

    this.state$ = new BehaviorSubject<WatchersNeuronState>({
      folders: [],
      watchers: [],
      items: [],
      total: 0,
      limit: this.pageSize,
      offset: 0,
      hasMore: false,
      counts: { ...EMPTY_COUNTS },
      filter: initialFilter,
      isLoading: false,
      isLoadingMore: false,
      error: null,
      mutatingIds: [],
      togglingWatcherIds: [],
      triggeringWatcherIds: [],
      isBulkWatchersMutating: false,
      isTriggeringAll: false,
      lastHeartbeatAt: null,
      pendingLiveItems: [],
    });
  }

  get state(): WatchersNeuronState {
    return this.state$.getValue();
  }

  get stateObservable(): Observable<WatchersNeuronState> {
    return this.state$.asObservable();
  }

  async loadMetadata(): Promise<{ folders: WatcherFolder[]; watchers: WatcherState[] }> {
    const [folders, watchers] = await Promise.all([
      this.apiClient.getFolders(),
      this.apiClient.getWatchers(),
    ]);
    this.patchState({ folders, watchers });
    return { folders, watchers };
  }

  async loadInitial(
    filterPatch?: Partial<WatcherStreamQueryOptions>
  ): Promise<WatchersNeuronState> {
    const current = this.state$.getValue();
    const mergedFilter: WatcherStreamQueryOptions = {
      ...current.filter,
      ...(filterPatch || {}),
      limit: this.pageSize,
      offset: 0,
    };

    this.patchState({
      filter: mergedFilter,
      isLoading: true,
      error: null,
    });

    try {
      const res = await this.apiClient.getStreamItems(mergedFilter);
      return this.patchState({
        items: res.items,
        total: res.total,
        limit: res.limit,
        offset: res.items.length,
        hasMore: res.items.length < res.total,
        counts: res.counts || current.counts,
        pendingLiveItems: [],
        isLoading: false,
      });
    } catch (err: any) {
      return this.patchState({
        isLoading: false,
        error: err?.message || 'Не удалось подключиться к Lemon-Watchers (:3040)',
      });
    }
  }

  async loadMore(): Promise<WatchersNeuronState> {
    const current = this.state$.getValue();
    if (current.isLoading || current.isLoadingMore || current.items.length >= current.total) {
      return current;
    }

    this.patchState({ isLoadingMore: true });

    try {
      const res = await this.apiClient.getStreamItems({
        ...current.filter,
        limit: this.pageSize,
        offset: current.items.length,
      });

      const mergedMap = new Map<string, WatcherStreamItem>();
      for (const item of current.items) mergedMap.set(item.id, item);
      for (const item of res.items) mergedMap.set(item.id, item);
      const merged = Array.from(mergedMap.values());

      return this.patchState({
        items: merged,
        total: res.total,
        offset: merged.length,
        hasMore: merged.length < res.total,
        counts: res.counts || current.counts,
        isLoadingMore: false,
      });
    } catch (err: any) {
      return this.patchState({
        isLoadingMore: false,
        error: err?.message || 'Не удалось подключиться к Lemon-Watchers (:3040)',
      });
    }
  }

  async refresh(): Promise<WatchersNeuronState> {
    return this.loadInitial();
  }

  async promote(id: string): Promise<{ item: WatcherStreamItem; article: any }> {
    this.setIdFlag('mutatingIds', [id], true);
    try {
      const res = await this.apiClient.promoteItem(id);
      const current = this.state$.getValue();
      const viewingNew = current.filter.status === 'NEW';
      const nextItems = viewingNew
        ? current.items.filter((x) => x.id !== id)
        : current.items.map((x) => (x.id === id ? res.item : x));

      const nextTotal = viewingNew ? Math.max(0, current.total - 1) : current.total;
      this.patchState({
        items: nextItems,
        total: nextTotal,
        hasMore: nextItems.length < nextTotal,
        counts: {
          ...current.counts,
          newCount: Math.max(0, current.counts.newCount - 1),
          promotedCount: current.counts.promotedCount + 1,
        },
      });
      return res;
    } finally {
      this.setIdFlag('mutatingIds', [id], false);
    }
  }

  async batchPromote(ids: string[]): Promise<{ count: number; articles: any[] } | undefined> {
    if (ids.length === 0) return undefined;
    this.setIdFlag('mutatingIds', ids, true);
    try {
      const res = await this.apiClient.batchPromote(ids);
      await this.refresh();
      return res;
    } finally {
      this.setIdFlag('mutatingIds', ids, false);
    }
  }

  async dismiss(id: string): Promise<{ item: WatcherStreamItem }> {
    this.setIdFlag('mutatingIds', [id], true);
    try {
      const res = await this.apiClient.dismissItem(id);
      const current = this.state$.getValue();
      const viewingNew = current.filter.status === 'NEW';
      const nextItems = viewingNew
        ? current.items.filter((x) => x.id !== id)
        : current.items.map((x) => (x.id === id ? res.item : x));

      const nextTotal = viewingNew ? Math.max(0, current.total - 1) : current.total;
      this.patchState({
        items: nextItems,
        total: nextTotal,
        hasMore: nextItems.length < nextTotal,
        counts: {
          ...current.counts,
          newCount: Math.max(0, current.counts.newCount - 1),
          dismissedCount: current.counts.dismissedCount + 1,
        },
      });
      return res;
    } finally {
      this.setIdFlag('mutatingIds', [id], false);
    }
  }

  async batchDismiss(
    ids: string[]
  ): Promise<{ count: number; items: WatcherStreamItem[] } | undefined> {
    if (ids.length === 0) return undefined;
    this.setIdFlag('mutatingIds', ids, true);
    try {
      const res = await this.apiClient.batchDismiss(ids);
      await this.refresh();
      return res;
    } finally {
      this.setIdFlag('mutatingIds', ids, false);
    }
  }

  async toggleWatcher(idOrSlug: string, enabled: boolean): Promise<WatcherState> {
    this.setIdFlag('togglingWatcherIds', [idOrSlug], true);
    try {
      const res = await this.apiClient.setWatcherEnabled(idOrSlug, enabled);
      const updated = res.watcher;
      const current = this.state$.getValue();
      const nextWatchers = current.watchers.map((w) =>
        w.id === idOrSlug || w.slug === idOrSlug || (updated && w.id === updated.id)
          ? {
              ...w,
              ...(updated || {}),
              enabled,
              status: updated?.status || (enabled ? 'IDLE' : 'PAUSED'),
            }
          : w
      );
      this.patchState({ watchers: nextWatchers });
      return updated;
    } finally {
      this.setIdFlag('togglingWatcherIds', [idOrSlug], false);
    }
  }

  async triggerWatcher(idOrSlug: string): Promise<WatcherPingRecord> {
    this.setIdFlag('triggeringWatcherIds', [idOrSlug], true);
    try {
      const ping = await this.apiClient.triggerWatcher(idOrSlug);
      await this.loadMetadata().catch(() => {});
      if (ping?.newItemsCount > 0) {
        await this.refresh();
      }
      return ping;
    } finally {
      this.setIdFlag('triggeringWatcherIds', [idOrSlug], false);
    }
  }

  async resumeAllWatchers(): Promise<{ message: string }> {
    this.patchState({ isBulkWatchersMutating: true });
    try {
      const res = await this.apiClient.resumeAllWatchers();
      await this.loadMetadata().catch(() => {});
      return res;
    } finally {
      this.patchState({ isBulkWatchersMutating: false });
    }
  }

  async pauseAllWatchers(): Promise<{ message: string }> {
    this.patchState({ isBulkWatchersMutating: true });
    try {
      const res = await this.apiClient.pauseAllWatchers();
      await this.loadMetadata().catch(() => {});
      return res;
    } finally {
      this.patchState({ isBulkWatchersMutating: false });
    }
  }

  async validateFeed(
    url: string,
    protocol: 'rss' | 'atom' | 'json' = 'rss'
  ): Promise<ValidateWatcherFeedResult> {
    return this.apiClient.validateFeed(url, protocol);
  }

  async createWatcher(input: CreateWatcherInput): Promise<{ config: any; state: WatcherState }> {
    const res = await this.apiClient.createWatcher(input);
    await this.loadMetadata().catch(() => {});
    return res;
  }

  async updateWatcher(
    idOrSlug: string,
    patch: Record<string, any>
  ): Promise<{ message: string; watcher: WatcherState }> {
    const res = await this.apiClient.updateWatcher(idOrSlug, patch);
    await this.loadMetadata().catch(() => {});
    return res;
  }

  async triggerAll(): Promise<{ message: string }> {
    this.patchState({ isTriggeringAll: true });
    try {
      return await this.apiClient.triggerAllWatchers();
    } finally {
      this.patchState({ isTriggeringAll: false });
    }
  }

  async pruneExpired(ttlHours?: number): Promise<{ pruned: number; ttlHours: number }> {
    const res = await this.apiClient.pruneExpired(ttlHours);
    if (res.pruned > 0) {
      await this.refresh();
    }
    return res;
  }

  handleLiveEvent(eventName: string, ev: WatcherStreamLiveEvent): void {
    const current = this.state$.getValue();

    if (eventName === 'heartbeat') {
      this.patchState({
        lastHeartbeatAt: ev.timestamp || new Date().toISOString(),
      });
      return;
    }

    if (eventName === 'news_item' && ev.item) {
      const incoming = ev.item;
      const alreadyPending = current.pendingLiveItems.some((x) => x.id === incoming.id);
      if (alreadyPending) return;

      this.patchState({
        pendingLiveItems: [incoming, ...current.pendingLiveItems],
        counts: {
          ...current.counts,
          newCount: current.counts.newCount + 1,
          totalCount: current.counts.totalCount + 1,
        },
      });
      return;
    }

    if ((eventName === 'news_promoted' || eventName === 'news_dismissed') && ev.item) {
      const updated = ev.item;
      const viewingNew = current.filter.status === 'NEW';
      const nextPending = current.pendingLiveItems.filter((x) => x.id !== updated.id);
      const nextItems = viewingNew
        ? current.items.filter((x) => x.id !== updated.id)
        : current.items.map((x) => (x.id === updated.id ? updated : x));

      this.patchState({
        pendingLiveItems: nextPending,
        items: nextItems,
      });
    }
  }

  applyPendingLive(): void {
    const current = this.state$.getValue();
    if (current.pendingLiveItems.length === 0) return;

    const map = new Map<string, WatcherStreamItem>();
    for (const item of current.pendingLiveItems) map.set(item.id, item);
    for (const item of current.items) {
      if (!map.has(item.id)) map.set(item.id, item);
    }

    const merged = Array.from(map.values());
    const nextTotal = current.total + current.pendingLiveItems.length;

    this.patchState({
      items: merged,
      total: nextTotal,
      offset: merged.length,
      hasMore: merged.length < nextTotal,
      pendingLiveItems: [],
    });
  }

  dismissPendingLive(): void {
    if (this.state$.getValue().pendingLiveItems.length === 0) return;
    this.patchState({ pendingLiveItems: [] });
  }

  private setIdFlag(
    field: 'mutatingIds' | 'togglingWatcherIds' | 'triggeringWatcherIds',
    ids: string[],
    active: boolean
  ): void {
    const current = this.state$.getValue();
    const set = new Set(current[field]);
    for (const id of ids) {
      if (active) set.add(id);
      else set.delete(id);
    }
    this.patchState({ [field]: Array.from(set) } as Partial<WatchersNeuronState>);
  }

  private patchState(partial: Partial<WatchersNeuronState>): WatchersNeuronState {
    const next = { ...this.state$.getValue(), ...partial };
    this.state$.next(next);
    return next;
  }
}
