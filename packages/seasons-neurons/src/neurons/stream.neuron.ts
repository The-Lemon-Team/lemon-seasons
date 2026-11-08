import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import {
  NotesPageQuery,
  SeasonsApiClient,
} from '../client/seasons-api.client.js';
import { SeasonsSseBus } from '../client/seasons-sse.bus.js';
import { SeasonsLiveNoteImpulse } from '../types/neuron-models.types.js';
import { FeedNeuron } from './feed.neuron.js';

export interface StreamNeuronState<TNote = any> {
  streamSlug: string;
  activeFeedSlug: string | null;
  items: TNote[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  isLoading: boolean;
  lastImpulse: SeasonsLiveNoteImpulse | null;
}

export interface StreamNeuronOptions {
  streamSlug: string;
  apiClient: SeasonsApiClient;
  sseBus: SeasonsSseBus;
  pageSize?: number;
  baseQuery?: Omit<NotesPageQuery, 'streamSource' | 'limit' | 'offset'>;
}

/**
 * Reactive Stream Neuron (represents a Lemon Seasons Stream and spawns/caches child FeedNeurons).
 * Uses honest paginated loading via GET /api/v1/streams/:slug/notes and live SSE impulses.
 */
export class StreamNeuron<TNote extends { id: string } = any> {
  public readonly streamSlug: string;
  private readonly apiClient: SeasonsApiClient;
  private readonly sseBus: SeasonsSseBus;
  private readonly pageSize: number;
  private baseQuery: Omit<NotesPageQuery, 'streamSource' | 'limit' | 'offset'>;

  private readonly state$: BehaviorSubject<StreamNeuronState<TNote>>;
  private readonly feedNeurons = new Map<string, FeedNeuron<TNote>>();
  private sseSub: Subscription | null = null;

  constructor(options: StreamNeuronOptions) {
    this.streamSlug = options.streamSlug;
    this.apiClient = options.apiClient;
    this.sseBus = options.sseBus;
    this.pageSize = Math.min(200, Math.max(1, options.pageSize || 30));
    this.baseQuery = options.baseQuery || {};

    this.state$ = new BehaviorSubject<StreamNeuronState<TNote>>({
      streamSlug: this.streamSlug,
      activeFeedSlug: null,
      items: [],
      total: 0,
      limit: this.pageSize,
      offset: 0,
      hasMore: false,
      isLoading: false,
      lastImpulse: null,
    });
  }

  async connect(loadFirstPage = true): Promise<StreamNeuronState<TNote>> {
    if (this.sseSub) {
      this.sseSub.unsubscribe();
    }
    this.sseSub = this.sseBus.selectStream$(this.streamSlug).subscribe((impulse) => {
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
    for (const child of this.feedNeurons.values()) {
      child.disconnect();
    }
  }

  get value(): StreamNeuronState<TNote> {
    return this.state$.getValue();
  }

  get stateObservable$(): Observable<StreamNeuronState<TNote>> {
    return this.state$.asObservable();
  }

  /**
   * Gets or spawns a dedicated FeedNeuron sharing the same SeasonsApiClient and SeasonsSseBus.
   */
  getOrCreateFeedNeuron(feedSlug: string): FeedNeuron<TNote> {
    const norm = feedSlug.toLowerCase().trim();
    const existing = this.feedNeurons.get(norm);
    if (existing) return existing;

    const created = new FeedNeuron<TNote>({
      feedSlug,
      apiClient: this.apiClient,
      sseBus: this.sseBus,
      pageSize: this.pageSize,
    });
    this.feedNeurons.set(norm, created);
    return created;
  }

  async setActiveFeedFilter(feedSlug: string | null): Promise<StreamNeuronState<TNote>> {
    this.patchState({ activeFeedSlug: feedSlug });
    return this.loadInitialPage({
      ...this.baseQuery,
      feedSlug: feedSlug || undefined,
    });
  }

  async loadInitialPage(
    overrideQuery?: Omit<NotesPageQuery, 'streamSource' | 'limit' | 'offset'>,
  ): Promise<StreamNeuronState<TNote>> {
    if (overrideQuery) {
      this.baseQuery = overrideQuery;
    }
    this.patchState({ isLoading: true });
    try {
      const page = await this.apiClient.getStreamNotesPage<TNote>(this.streamSlug, {
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

  async loadNextPage(): Promise<StreamNeuronState<TNote>> {
    const cur = this.state$.getValue();
    if (cur.isLoading || !cur.hasMore) return cur;

    this.patchState({ isLoading: true });
    try {
      const page = await this.apiClient.getStreamNotesPage<TNote>(this.streamSlug, {
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

  private handleLiveImpulse(impulse: SeasonsLiveNoteImpulse): void {
    const cur = this.state$.getValue();
    if (
      cur.activeFeedSlug &&
      impulse.feedSlug &&
      impulse.feedSlug.toLowerCase() !== cur.activeFeedSlug.toLowerCase() &&
      impulse.type !== 'NOTE_DELETED' &&
      impulse.type !== 'NOTE_LEFT'
    ) {
      return;
    }

    if ((impulse.type === 'NOTE_DELETED' || impulse.type === 'NOTE_LEFT') && impulse.noteId) {
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

  private patchState(partial: Partial<StreamNeuronState<TNote>>): StreamNeuronState<TNote> {
    const next = { ...this.state$.getValue(), ...partial };
    this.state$.next(next);
    return next;
  }
}
