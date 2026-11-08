import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import {
  IngestSeasonNoteInput,
  NotesPageQuery,
  SeasonsApiClient,
} from '../client/seasons-api.client.js';
import { SeasonsSseBus } from '../client/seasons-sse.bus.js';
import { SeasonsLiveNoteImpulse } from '../types/neuron-models.types.js';

export interface FeedNeuronState<TNote = any> {
  feedSlug: string;
  items: TNote[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  isLoading: boolean;
  lastImpulse: SeasonsLiveNoteImpulse | null;
}

export interface FeedNeuronOptions {
  feedSlug: string;
  apiClient: SeasonsApiClient;
  sseBus: SeasonsSseBus;
  pageSize?: number;
  baseQuery?: Omit<NotesPageQuery, 'feedSlug' | 'feedId' | 'limit' | 'offset'>;
}

/**
 * Reactive Feed Neuron (represents a single Lemon Seasons Feed as a live Neuron).
 * Combines honest paginated loading with real-time SSE impulse reconciliation
 * (including boundary removal on NOTE_LEFT / NOTE_DELETED).
 */
export class FeedNeuron<TNote extends { id: string } = any> {
  public readonly feedSlug: string;
  private readonly apiClient: SeasonsApiClient;
  private readonly sseBus: SeasonsSseBus;
  private readonly pageSize: number;
  private baseQuery: Omit<NotesPageQuery, 'feedSlug' | 'feedId' | 'limit' | 'offset'>;

  private readonly state$: BehaviorSubject<FeedNeuronState<TNote>>;
  private sseSub: Subscription | null = null;

  constructor(options: FeedNeuronOptions) {
    this.feedSlug = options.feedSlug;
    this.apiClient = options.apiClient;
    this.sseBus = options.sseBus;
    this.pageSize = Math.min(200, Math.max(1, options.pageSize || 30));
    this.baseQuery = options.baseQuery || {};

    this.state$ = new BehaviorSubject<FeedNeuronState<TNote>>({
      feedSlug: this.feedSlug,
      items: [],
      total: 0,
      limit: this.pageSize,
      offset: 0,
      hasMore: false,
      isLoading: false,
      lastImpulse: null,
    });
  }

  async connect(loadFirstPage = true): Promise<FeedNeuronState<TNote>> {
    if (this.sseSub) {
      this.sseSub.unsubscribe();
    }
    this.sseSub = this.sseBus.selectFeed$(this.feedSlug).subscribe((impulse) => {
      this.handleLiveImpulse(impulse);
    });

    if (loadFirstPage) {
      return this.loadInitialPage();
    }
    return this.state$.getValue();
  }

  disconnect(): void {
    if (this.sseSub) {
      this.sseSub.unsubscribe();
      this.sseSub = null;
    }
  }

  /**
   * Switches the active feed of this neuron with immediate unsubscription,
   * state reset, and reconnect to the new feed's stream and first page.
   */
  async switchFeed(
    newFeedSlug: string,
    loadFirstPage = true,
  ): Promise<FeedNeuronState<TNote>> {
    this.disconnect();
    (this as any).feedSlug = newFeedSlug;
    this.patchState({
      feedSlug: newFeedSlug,
      items: [],
      total: 0,
      offset: 0,
      hasMore: false,
      lastImpulse: null,
    });
    return this.connect(loadFirstPage);
  }

  get value(): FeedNeuronState<TNote> {
    return this.state$.getValue();
  }

  get stateObservable$(): Observable<FeedNeuronState<TNote>> {
    return this.state$.asObservable();
  }

  async loadInitialPage(
    overrideQuery?: Omit<NotesPageQuery, 'feedSlug' | 'feedId' | 'limit' | 'offset'>,
  ): Promise<FeedNeuronState<TNote>> {
    if (overrideQuery) {
      this.baseQuery = overrideQuery;
    }
    this.patchState({ isLoading: true });
    try {
      const page = await this.apiClient.getFeedNotesPage<TNote>(this.feedSlug, {
        ...this.baseQuery,
        limit: this.pageSize,
        offset: 0,
      });
      return this.patchState({
        items: page.items,
        total: page.total,
        limit: page.limit,
        offset: page.items.length,
        hasMore: page.hasMore,
        isLoading: false,
      });
    } catch (err) {
      this.patchState({ isLoading: false });
      throw err;
    }
  }

  async loadNextPage(): Promise<FeedNeuronState<TNote>> {
    const cur = this.state$.getValue();
    if (cur.isLoading || !cur.hasMore) return cur;

    this.patchState({ isLoading: true });
    try {
      const page = await this.apiClient.getFeedNotesPage<TNote>(this.feedSlug, {
        ...this.baseQuery,
        limit: this.pageSize,
        offset: cur.offset,
      });

      const existingIds = new Set(cur.items.map((i) => i.id));
      const appended = [...cur.items];
      for (const item of page.items) {
        if (!existingIds.has(item.id)) {
          appended.push(item);
        }
      }

      return this.patchState({
        items: appended,
        total: page.total,
        offset: cur.offset + page.items.length,
        hasMore: page.hasMore,
        isLoading: false,
      });
    } catch (err) {
      this.patchState({ isLoading: false });
      throw err;
    }
  }

  async ingestNote(
    input: Omit<IngestSeasonNoteInput, 'feedSlug'>,
  ): Promise<{ noteId: string; note: TNote; isNew: boolean }> {
    const res = await this.apiClient.ingestNote({
      ...input,
      feedSlug: this.feedSlug,
    });
    return {
      noteId: res.noteId,
      note: res.note as TNote,
      isNew: res.isNew,
    };
  }

  private handleLiveImpulse(impulse: SeasonsLiveNoteImpulse): void {
    const cur = this.state$.getValue();
    const normSlug = this.feedSlug.toLowerCase();
    const leftThisFeed =
      impulse.type === 'NOTE_DELETED' ||
      impulse.type === 'NOTE_LEFT' ||
      (impulse.previousFeedSlug?.toLowerCase() === normSlug &&
        impulse.feedSlug?.toLowerCase() !== normSlug);

    if (leftThisFeed && impulse.noteId) {
      const filtered = cur.items.filter((item) => item.id !== impulse.noteId);
      const removed = filtered.length < cur.items.length;
      this.patchState({
        items: filtered,
        total: removed ? Math.max(0, cur.total - 1) : cur.total,
        lastImpulse: impulse,
      });
      return;
    }

    if (impulse.note && impulse.note.id) {
      const idx = cur.items.findIndex((i) => i.id === impulse.note.id);
      if (idx >= 0) {
        const nextItems = [...cur.items];
        nextItems[idx] = { ...nextItems[idx], ...impulse.note };
        this.patchState({ items: nextItems, lastImpulse: impulse });
      } else {
        this.patchState({
          items: [impulse.note as TNote, ...cur.items],
          total: cur.total + 1,
          offset: cur.offset + 1,
          lastImpulse: impulse,
        });
      }
    } else {
      this.patchState({ lastImpulse: impulse });
    }
  }

  private patchState(partial: Partial<FeedNeuronState<TNote>>): FeedNeuronState<TNote> {
    const next = { ...this.state$.getValue(), ...partial };
    this.state$.next(next);
    return next;
  }
}
