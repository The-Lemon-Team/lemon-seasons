import * as crypto from 'crypto';
import { Observable, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import {
  BusCursor,
  BusEventsPage,
  BusEventsQuery,
  BusSubscriptionPattern,
  BusTransportStatus,
  ILemonBusTransport,
  LemonBusEnvelope,
  LemonBusNotePayload,
  NoteContentReference,
  PublishSparkInput,
} from '../types/bus-contract.types.js';
import { processSparkDocument } from '../sparks/spark-document.processor.js';
import { compileBusPattern, matchesCompiledBusPattern } from './pattern-matcher.util.js';

export interface CloudHttpTransportOptions {
  busUrl: string;
  deviceId?: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
}

export class CloudHttpBusTransport implements ILemonBusTransport {
  public readonly driver = 'cloud' as const;
  public readonly deviceId: string;

  private readonly busUrl: string;
  private readonly apiKey?: string;
  private readonly fetchFn: typeof fetch;
  private readonly stream$ = new Subject<LemonBusEnvelope>();
  private readonly knownHashes = new Set<string>();

  private running = false;
  private lastKnownSeq = 0;
  private abortController: AbortController | null = null;

  constructor(options: CloudHttpTransportOptions) {
    if (!options.busUrl) {
      throw new Error('CloudHttpBusTransport requires busUrl');
    }
    this.busUrl = options.busUrl.replace(/\/+$/, '');
    this.deviceId = options.deviceId || 'cloud-node';
    this.apiKey = options.apiKey;
    this.fetchFn = options.fetchImpl || globalThis.fetch;
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    // Probe server and initialize watermark
    await this.refreshStatusQuietly();
    this.startSseLoop();
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.abortController) {
      try {
        this.abortController.abort();
      } catch {
        // ignore abort errors
      }
      this.abortController = null;
    }
  }

  async publish<T = any>(
    partial: Omit<LemonBusEnvelope<T>, 'eventId' | 'timestamp' | 'deviceId' | 'transportVia'> & {
      eventId?: string;
      timestamp?: string;
      deviceId?: string;
    },
  ): Promise<LemonBusEnvelope<T>> {
    const envelope: LemonBusEnvelope<T> = {
      ...partial,
      eventId: partial.eventId || crypto.randomUUID(),
      timestamp: partial.timestamp || new Date().toISOString(),
      deviceId: partial.deviceId || this.deviceId,
      transportVia: 'cloud',
    } as LemonBusEnvelope<T>;

    const res = await this.fetchFn(`${this.busUrl}/events`, {
      method: 'POST',
      headers: this.buildHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(envelope),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Failed to publish event to cloud bus: ${res.status} ${errText}`);
    }

    const saved: LemonBusEnvelope<T> = await res.json();
    if (saved.contentHash) {
      this.knownHashes.add(saved.contentHash);
    }
    if (saved.seq && saved.seq > this.lastKnownSeq) {
      this.lastKnownSeq = saved.seq;
    }

    this.stream$.next(saved);
    return saved;
  }

  async publishSparkDocument(
    input: PublishSparkInput,
  ): Promise<LemonBusEnvelope<LemonBusNotePayload>> {
    const processed = processSparkDocument({
      ...input,
      origin: input.origin || 'SUPABASE_SPARK',
    });

    const sparkRes = await this.fetchFn(`${this.busUrl}/sparks`, {
      method: 'POST',
      headers: this.buildHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        id: processed.notePayload.id,
        canonicalPath: processed.canonicalPath,
        fileName: processed.fileName,
        folderPath: processed.folderPath,
        feedSlug: processed.feedTarget.slug,
        title: processed.frontmatter.title || processed.notePayload.title,
        contentMarkdown: input.contentMarkdown,
        frontmatter: processed.frontmatter,
        contentHash: processed.contentHash,
        privacy: processed.notePayload.privacy,
        originProvider: input.origin || 'CLOUD_SPARK',
        updatedByDevice: this.deviceId,
      }),
    });

    if (!sparkRes.ok) {
      const errText = await sparkRes.text().catch(() => '');
      throw new Error(`Failed to upload spark to cloud bus: ${sparkRes.status} ${errText}`);
    }

    return this.publish<LemonBusNotePayload>({
      entityType: 'NOTE',
      action: 'UPSERT',
      origin: processed.notePayload.origin,
      feedSlug: processed.feedTarget.slug,
      externalId: processed.canonicalPath,
      contentHash: processed.contentHash,
      privacy: processed.notePayload.privacy,
      payload: processed.notePayload,
    });
  }

  subscribe(pattern?: BusSubscriptionPattern): Observable<LemonBusEnvelope> {
    const compiled = compileBusPattern(pattern);
    return this.stream$.asObservable().pipe(
      filter((envelope) => matchesCompiledBusPattern(compiled, envelope)),
    );
  }

  async pullSince(cursor: BusCursor, limit = 100): Promise<{
    items: LemonBusEnvelope[];
    nextCursor: BusCursor;
  }> {
    const afterSeq = cursor.lastSeq ?? 0;
    const url = `${this.busUrl}/events?afterSeq=${afterSeq}&limit=${limit}`;
    const res = await this.fetchFn(url, {
      method: 'GET',
      headers: this.buildHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Failed to pull events from cloud bus: ${res.statusText}`);
    }

    const data: BusEventsPage = await res.json();
    const items = data.items || [];
    let maxSeq = afterSeq;
    let lastTs = cursor.lastTimestamp || null;

    for (const item of items) {
      if (item.seq && item.seq > maxSeq) maxSeq = item.seq;
      if (item.timestamp) lastTs = item.timestamp;
      if (item.contentHash) this.knownHashes.add(item.contentHash);
    }

    return {
      items,
      nextCursor: {
        lastSeq: maxSeq,
        lastTimestamp: lastTs,
      },
    };
  }

  async acknowledgeCursor(cursor: BusCursor): Promise<void> {
    if (cursor.lastSeq && cursor.lastSeq > this.lastKnownSeq) {
      this.lastKnownSeq = cursor.lastSeq;
    }
  }

  async hasContentHash(contentHash: string): Promise<boolean> {
    if (this.knownHashes.has(contentHash)) return true;
    try {
      const url = `${this.busUrl}/events?contentHash=${encodeURIComponent(contentHash)}&limit=1`;
      const res = await this.fetchFn(url, {
        headers: this.buildHeaders(),
      });
      if (!res.ok) return false;
      const data: BusEventsPage = await res.json();
      const exists = (data.items || []).length > 0;
      if (exists) this.knownHashes.add(contentHash);
      return exists;
    } catch {
      return false;
    }
  }

  async queryEvents(query: BusEventsQuery): Promise<BusEventsPage> {
    const params = new URLSearchParams();
    if (query.page) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit));
    if (query.feedSlug) params.set('feedSlug', query.feedSlug);
    if (query.action) params.set('action', query.action);
    if (query.search) params.set('search', query.search);
    if (query.deviceId) params.set('deviceId', query.deviceId);

    const res = await this.fetchFn(`${this.busUrl}/events?${params.toString()}`, {
      headers: this.buildHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Failed to query events: ${res.statusText}`);
    }
    return res.json();
  }

  async getStatus(): Promise<BusTransportStatus> {
    let stats: any = {};
    let connected = false;

    try {
      const res = await this.fetchFn(`${this.busUrl}/stats`, {
        headers: this.buildHeaders(),
      });
      if (res.ok) {
        stats = await res.json();
        connected = true;
      }
    } catch {
      connected = false;
    }

    return {
      driver: 'cloud',
      isWatching: this.running && connected,
      supabaseConnected: false,
      gdriveConnected: false,
      currentDeviceId: this.deviceId,
      busDir: this.busUrl,
      eventsDir: `${this.busUrl}/events`,
      totalEventsCount: (stats as any).totalEvents ?? (stats as any).eventsCount ?? 0,
      lastEventTimestamp: stats.timestamp || null,
      lastSeq: (stats as any).lastSeq ?? (stats as any).maxSeq ?? this.lastKnownSeq,
      watermarks: { [this.deviceId]: String(this.lastKnownSeq) },
      nodes: [
        {
          deviceId: this.deviceId,
          eventsCount: (stats as any).totalEvents ?? (stats as any).eventsCount ?? 0,
          lastEventTimestamp: stats.timestamp || null,
          watermarkTimestamp: null,
          lastSeq: (stats as any).lastSeq ?? (stats as any).maxSeq ?? this.lastKnownSeq,
          driver: 'cloud',
          isCurrentDevice: true,
        },
      ],
    };
  }

  async fetchNoteContent(ref: NoteContentReference): Promise<string | null> {
    const target = ref.canonicalPath || ref.externalId || ref.documentId;
    if (!target) return null;

    try {
      const res = await this.fetchFn(
        `${this.busUrl}/sparks?canonicalPath=${encodeURIComponent(target)}`,
        { headers: this.buildHeaders() },
      );

      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

      const data = await res.json();
      return data.contentMarkdown || data.rawContent || null;
    } catch {
      return null;
    }
  }

  private buildHeaders(extra: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = {
      'x-device-id': this.deviceId,
      ...extra,
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  private async refreshStatusQuietly(): Promise<void> {
    try {
      const res = await this.fetchFn(`${this.busUrl}/stats`, {
        headers: this.buildHeaders(),
      });
      if (res.ok) {
        const stats = await res.json();
        if (stats.maxSeq && stats.maxSeq > this.lastKnownSeq) {
          this.lastKnownSeq = stats.maxSeq;
        }
      }
    } catch {
      // Quiet ignore on initial status check
    }
  }

  private startSseLoop(): void {
    const runStream = async () => {
      while (this.running) {
        try {
          this.abortController = new AbortController();
          const sseUrl = `${this.busUrl}/events/stream?afterSeq=${this.lastKnownSeq}&excludeDeviceId=${encodeURIComponent(this.deviceId)}`;

          const res = await this.fetchFn(sseUrl, {
            headers: this.buildHeaders({ Accept: 'text/event-stream' }),
            signal: this.abortController.signal,
          });

          if (!res.ok || !res.body) {
            throw new Error(`SSE stream connection failed: HTTP ${res.status}`);
          }

          const reader = (res.body as any).getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (this.running) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split('\n\n');
            buffer = parts.pop() || '';

            for (const part of parts) {
              const lines = part.split('\n');
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const envelope: LemonBusEnvelope = JSON.parse(line.slice(6).trim());
                    if (envelope && envelope.eventId) {
                      if (envelope.seq && envelope.seq > this.lastKnownSeq) {
                        this.lastKnownSeq = envelope.seq;
                      }
                      if (envelope.contentHash) {
                        this.knownHashes.add(envelope.contentHash);
                      }
                      this.stream$.next(envelope);
                    }
                  } catch {
                    // Ignore malformed sse frames
                  }
                }
              }
            }
          }
        } catch {
          // Stream interrupted or network glitch
        }

        if (this.running) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    };

    runStream().catch(() => {});
  }
}
