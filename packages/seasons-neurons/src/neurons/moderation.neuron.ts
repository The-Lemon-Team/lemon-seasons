import { BehaviorSubject, Observable } from 'rxjs';
import {
  LemonModerationItem,
  ModerationApprovalResult,
  ModerationBatchResult,
  ModerationQueryOptions,
  ModerationRejectResult,
  ModerationStats,
} from '@lenta/lemon-bus';
import { ModerationApiClient } from '../client/moderation-api.client.js';

export interface ModerationNeuronState {
  items: LemonModerationItem[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  isLoading: boolean;
  filter: ModerationQueryOptions;
  stats: ModerationStats | null;
  lastAction: { action: string; noteId?: string; timestamp: string } | null;
}

export interface ModerationNeuronOptions {
  apiClient: ModerationApiClient;
  initialFilter?: ModerationQueryOptions;
  pageSize?: number;
}

export class ModerationNeuron {
  private readonly apiClient: ModerationApiClient;
  private readonly pageSize: number;
  private readonly state$: BehaviorSubject<ModerationNeuronState>;

  constructor(options: ModerationNeuronOptions) {
    this.apiClient = options.apiClient;
    this.pageSize = Math.min(200, Math.max(1, options.pageSize || 30));

    const initialFilter: ModerationQueryOptions = {
      status: 'PENDING',
      limit: this.pageSize,
      offset: 0,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      ...(options.initialFilter || {}),
    };

    this.state$ = new BehaviorSubject<ModerationNeuronState>({
      items: [],
      total: 0,
      limit: this.pageSize,
      offset: 0,
      hasMore: false,
      isLoading: false,
      filter: initialFilter,
      stats: null,
      lastAction: null,
    });
  }

  get state(): ModerationNeuronState {
    return this.state$.getValue();
  }

  get stateObservable(): Observable<ModerationNeuronState> {
    return this.state$.asObservable();
  }

  async loadInitial(filter?: Partial<ModerationQueryOptions>): Promise<ModerationNeuronState> {
    const current = this.state$.getValue();
    const mergedFilter: ModerationQueryOptions = {
      ...current.filter,
      ...(filter || {}),
      offset: 0,
      limit: this.pageSize,
    };

    this.patchState({ isLoading: true, filter: mergedFilter });

    try {
      const [page, stats] = await Promise.all([
        this.apiClient.queryItems(mergedFilter),
        this.apiClient.getStats().catch(() => null),
      ]);

      return this.patchState({
        items: page.items,
        total: page.total,
        limit: page.limit,
        offset: page.offset,
        hasMore: page.hasMore,
        stats: stats || current.stats,
        isLoading: false,
      });
    } catch (error) {
      this.patchState({ isLoading: false });
      throw error;
    }
  }

  async loadMore(): Promise<ModerationNeuronState> {
    const current = this.state$.getValue();
    if (current.isLoading || !current.hasMore) {
      return current;
    }

    const nextOffset = current.offset + current.items.length;
    const query: ModerationQueryOptions = {
      ...current.filter,
      offset: nextOffset,
      limit: this.pageSize,
    };

    this.patchState({ isLoading: true });

    try {
      const page = await this.apiClient.queryItems(query);
      const existingIds = new Set(current.items.map((i) => i.id));
      const newItems = page.items.filter((i) => !existingIds.has(i.id));

      return this.patchState({
        items: [...current.items, ...newItems],
        total: page.total,
        offset: nextOffset,
        hasMore: page.hasMore,
        isLoading: false,
      });
    } catch (error) {
      this.patchState({ isLoading: false });
      throw error;
    }
  }

  async refresh(): Promise<ModerationNeuronState> {
    const current = this.state$.getValue();
    return this.loadInitial(current.filter);
  }

  async refreshStats(): Promise<ModerationStats> {
    const stats = await this.apiClient.getStats();
    this.patchState({ stats });
    return stats;
  }

  async approve(
    id: string,
    overrides?: Partial<LemonModerationItem>,
    moderatorId?: string
  ): Promise<ModerationApprovalResult> {
    const res = await this.apiClient.approveItem(id, overrides, moderatorId);
    const current = this.state$.getValue();

    // If viewing PENDING, remove the approved item from list
    const viewingPending = current.filter.status === 'PENDING' || !current.filter.status;
    const nextItems = viewingPending
      ? current.items.filter((i) => i.id !== id)
      : current.items.map((i) => (i.id === id ? res.item : i));

    const nextTotal = viewingPending ? Math.max(0, current.total - 1) : current.total;

    const nextStats: ModerationStats | null = current.stats
      ? {
          ...current.stats,
          pendingCount: Math.max(0, current.stats.pendingCount - 1),
          approvedCount: current.stats.approvedCount + 1,
        }
      : null;

    this.patchState({
      items: nextItems,
      total: nextTotal,
      stats: nextStats,
      lastAction: { action: 'APPROVED', noteId: id, timestamp: new Date().toISOString() },
    });

    return res;
  }

  async reject(
    id: string,
    reason?: string,
    moderatorId?: string
  ): Promise<ModerationRejectResult> {
    const res = await this.apiClient.rejectItem(id, reason, moderatorId);
    const current = this.state$.getValue();

    const viewingPending = current.filter.status === 'PENDING' || !current.filter.status;
    const nextItems = viewingPending
      ? current.items.filter((i) => i.id !== id)
      : current.items.map((i) => (i.id === id ? res.item : i));

    const nextTotal = viewingPending ? Math.max(0, current.total - 1) : current.total;

    const nextStats: ModerationStats | null = current.stats
      ? {
          ...current.stats,
          pendingCount: Math.max(0, current.stats.pendingCount - 1),
          rejectedCount: current.stats.rejectedCount + 1,
        }
      : null;

    this.patchState({
      items: nextItems,
      total: nextTotal,
      stats: nextStats,
      lastAction: { action: 'REJECTED', noteId: id, timestamp: new Date().toISOString() },
    });

    return res;
  }

  async updateItem(
    id: string,
    patch: Partial<LemonModerationItem>
  ): Promise<LemonModerationItem> {
    const res = await this.apiClient.updateItem(id, patch);
    const current = this.state$.getValue();

    const nextItems = current.items.map((i) => (i.id === id ? res.item : i));
    this.patchState({ items: nextItems });

    return res.item;
  }

  async batchApprove(ids: string[], moderatorId?: string): Promise<ModerationBatchResult> {
    const res = await this.apiClient.batchApprove(ids, moderatorId);
    await this.refresh();
    return res;
  }

  async batchReject(ids: string[], reason?: string, moderatorId?: string): Promise<ModerationBatchResult> {
    const res = await this.apiClient.batchReject(ids, reason, moderatorId);
    await this.refresh();
    return res;
  }

  async importWatcherItems(limit = 200): Promise<{ ok: boolean; imported: number; skipped: number }> {
    const res = await this.apiClient.importWatcherItems(limit);
    if (res.imported > 0) {
      await this.refresh();
    }
    return res;
  }

  /**
   * Reconciles incoming real-time SSE impulse into reactive state
   */
  handleImpulse(event: {
    type: string;
    action?: string;
    noteId?: string;
    item?: LemonModerationItem;
  }): void {
    const current = this.state$.getValue();

    if (event.type === 'MODERATION_ITEM_ADDED' && event.item) {
      if (current.items.some((i) => i.id === event.item!.id)) return;
      if (current.filter.status === 'PENDING' || current.filter.status === 'ALL') {
        this.patchState({
          items: [event.item, ...current.items],
          total: current.total + 1,
          stats: current.stats
            ? {
                ...current.stats,
                totalCount: current.stats.totalCount + 1,
                pendingCount: current.stats.pendingCount + 1,
              }
            : null,
        });
      }
    } else if (event.type === 'MODERATION_ITEM_APPROVED' && event.noteId) {
      if (current.filter.status === 'PENDING') {
        this.patchState({
          items: current.items.filter((i) => i.id !== event.noteId),
          total: Math.max(0, current.total - 1),
        });
      }
    } else if (event.type === 'MODERATION_ITEM_REJECTED' && event.noteId) {
      if (current.filter.status === 'PENDING') {
        this.patchState({
          items: current.items.filter((i) => i.id !== event.noteId),
          total: Math.max(0, current.total - 1),
        });
      }
    }
  }

  private patchState(patch: Partial<ModerationNeuronState>): ModerationNeuronState {
    const next = { ...this.state$.getValue(), ...patch };
    this.state$.next(next);
    return next;
  }
}
