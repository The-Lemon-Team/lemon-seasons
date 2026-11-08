import { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { SeasonsTopologyPatch } from '@lenta/shared';
import {
  SeasonsLiveNoteImpulse,
  SeasonsSsePacket,
  SseSubscriptionTemplate,
} from '../types/neuron-models.types.js';

export interface SeasonsSseBusOptions {
  baseUrl: string;
  token?: string;
  template?: SseSubscriptionTemplate;
  eventSourceFactory?: (url: string) => EventSourceLike;
}

export interface EventSourceLike {
  onopen: ((ev: any) => any) | null;
  onmessage: ((ev: any) => any) | null;
  onerror: ((ev: any) => any) | null;
  addEventListener?: (type: string, listener: (ev: any) => void) => void;
  close(): void;
}

/**
 * Unified Multiplexed SSE Bus Client.
 * Opens a single HTTP/SSE stream with server-side template filtering (?streams=...&feeds=...&authors=...)
 * and demultiplexes incoming packets into topologyPatch$ and per-feed / per-stream observables.
 */
export class SeasonsSseBus {
  private readonly baseUrl: string;
  private token?: string;
  private template: SseSubscriptionTemplate;
  private readonly eventSourceFactory?: (url: string) => EventSourceLike;

  private readonly packet$ = new Subject<SeasonsSsePacket>();
  private es: EventSourceLike | null = null;
  private lastEventId: string | null = null;
  private connected = false;

  constructor(options: SeasonsSseBusOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.token = options.token;
    this.template = options.template || { includeTopology: true };
    this.eventSourceFactory = options.eventSourceFactory;
    if (options.template?.sinceEventId) {
      this.lastEventId = options.template.sinceEventId;
    }
  }

  connect(overrideTemplate?: SseSubscriptionTemplate): void {
    if (overrideTemplate) {
      this.template = { ...this.template, ...overrideTemplate };
      if (overrideTemplate.sinceEventId) {
        this.lastEventId = overrideTemplate.sinceEventId;
      }
    }
    this.disconnect();

    const url = this.buildStreamUrl();
    const factory =
      this.eventSourceFactory ||
      (typeof globalThis.EventSource !== 'undefined'
        ? (u: string): EventSourceLike => new globalThis.EventSource(u) as unknown as EventSourceLike
        : null);

    if (!factory) {
      return;
    }

    const es = factory(url);
    this.es = es;
    es.onopen = () => {
      this.connected = true;
    };

    const handleNoteRaw = (ev: { data: string; lastEventId?: string }) => {
      if (ev.lastEventId) {
        this.lastEventId = ev.lastEventId;
      }
      this.ingestRawJson(ev.data);
    };

    es.onmessage = handleNoteRaw;
    if (es.addEventListener) {
      es.addEventListener('note', handleNoteRaw);
      es.addEventListener('topology', (ev: any) => {
        if (ev?.lastEventId) this.lastEventId = ev.lastEventId;
        this.ingestRawJson(ev.data);
      });
    }

    es.onerror = () => {
      this.connected = false;
    };
  }

  disconnect(): void {
    this.connected = false;
    if (this.es) {
      this.es.close();
      this.es = null;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getLastEventId(): string | null {
    return this.lastEventId;
  }

  /**
   * Direct injection helper for unit testing or forwarding from LemonBus WebSocket.
   */
  emitPacket(packet: SeasonsSsePacket): void {
    if (packet.kind === 'note' && packet.event.id) {
      this.lastEventId = packet.event.id;
    }
    this.packet$.next(packet);
  }

  get packets$(): Observable<SeasonsSsePacket> {
    return this.packet$.asObservable();
  }

  get noteEvents$(): Observable<SeasonsLiveNoteImpulse> {
    return this.packet$.pipe(
      filter((p): p is { kind: 'note'; event: SeasonsLiveNoteImpulse } => p.kind === 'note'),
      map((p) => p.event),
    );
  }

  get topologyPatches$(): Observable<SeasonsTopologyPatch> {
    return this.packet$.pipe(
      filter((p): p is { kind: 'topology'; patch: SeasonsTopologyPatch } => p.kind === 'topology'),
      map((p) => p.patch),
    );
  }

  /**
   * Demultiplexes events for a specific feed (including NOTE_LEFT when a note moves out of this feed).
   */
  selectFeed$(feedSlug: string): Observable<SeasonsLiveNoteImpulse> {
    const norm = feedSlug.toLowerCase().trim();
    return this.noteEvents$.pipe(
      filter(
        (e) =>
          e.feedSlug?.toLowerCase() === norm ||
          e.previousFeedSlug?.toLowerCase() === norm ||
          e.type === 'NOTE_DELETED',
      ),
    );
  }

  /**
   * Demultiplexes events for a specific stream.
   */
  selectStream$(streamSlug: string): Observable<SeasonsLiveNoteImpulse> {
    const norm = streamSlug.toLowerCase().trim();
    return this.noteEvents$.pipe(
      filter(
        (e) =>
          e.streamSlug?.toLowerCase() === norm ||
          Boolean(e.streamSlugs?.some((s) => s.toLowerCase() === norm)) ||
          e.type === 'NOTE_DELETED',
      ),
    );
  }

  buildStreamUrl(): string {
    const params = new URLSearchParams();
    if (this.token) params.set('token', this.token);
    if (this.lastEventId) params.set('since', this.lastEventId);
    if (this.template.streams?.length) params.set('streams', this.template.streams.join(','));
    if (this.template.feeds?.length) params.set('feeds', this.template.feeds.join(','));
    if (this.template.authors?.length) params.set('authors', this.template.authors.join(','));
    if (this.template.hashtags?.length) params.set('hashtags', this.template.hashtags.join(','));
    if (this.template.noteTypes?.length) params.set('types', this.template.noteTypes.join(','));
    if (this.template.parentNoteId) params.set('parentNoteId', this.template.parentNoteId);
    if (this.template.noteId) params.set('noteId', this.template.noteId);
    if (this.template.includeTopology !== undefined) {
      params.set('topology', String(this.template.includeTopology));
    }

    const qs = params.toString();
    return `${this.baseUrl}/api/v1/events/stream${qs ? `?${qs}` : ''}`;
  }

  private ingestRawJson(raw: string): void {
    try {
      const parsed = JSON.parse(raw);
      if (!parsed) return;
      if (parsed.type === 'TOPOLOGY_PATCH') {
        this.packet$.next({ kind: 'topology', patch: parsed as SeasonsTopologyPatch });
      } else if (parsed.type && parsed.id) {
        this.packet$.next({ kind: 'note', event: parsed as SeasonsLiveNoteImpulse });
      }
    } catch {
      // ignore ping or malformed frames
    }
  }
}
