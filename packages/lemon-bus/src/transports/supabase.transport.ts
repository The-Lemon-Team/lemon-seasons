import * as crypto from 'crypto';
import { Observable, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import {
  BusCursor,
  BusEventsPage,
  BusEventsQuery,
  BusNodeStats,
  BusSubscriptionPattern,
  BusTransportStatus,
  ILemonBusTransport,
  LemonBusEnvelope,
  LemonBusNotePayload,
  PublishSparkInput,
} from '../types/bus-contract.types.js';
import { processSparkDocument } from '../sparks/spark-document.processor.js';
import { compileBusPattern, matchesCompiledBusPattern } from './pattern-matcher.util.js';
import { SupabaseRealtimeClient } from './supabase-realtime.client.js';

export interface SupabaseTransportOptions {
  supabaseUrl: string;
  supabaseKey: string;
  deviceId: string;
  eventsTable?: string;
  sparkDocsTable?: string;
  watermarksTable?: string;
  realtimeEnabled?: boolean;
  fetchImpl?: typeof fetch;
}

interface SupabaseEventRow {
  seq: number;
  event_id: string;
  entity_type: any;
  action: any;
  origin: any;
  device_id: string;
  stream_slug: string | null;
  feed_slug: string | null;
  external_id: string | null;
  content_hash: string | null;
  privacy: 'public' | 'private';
  payload: any;
  created_at: string;
}

/**
 * High-speed Cloud Bus & Spark Document Transport backed by Supabase PostgREST + Realtime.
 * Eliminates the requirement for Google Drive Desktop on client/server machines.
 */
export class SupabaseBusTransport implements ILemonBusTransport {
  public readonly driver = 'supabase' as const;
  public readonly deviceId: string;

  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly eventsTable: string;
  private readonly sparkDocsTable: string;
  private readonly watermarksTable: string;
  private readonly realtimeEnabled: boolean;
  private readonly fetchFn: typeof fetch;

  private readonly stream$ = new Subject<LemonBusEnvelope>();
  private readonly knownHashes = new Set<string>();
  private readonly realtimeClient: SupabaseRealtimeClient;
  private running = false;
  private lastKnownSeq = 0;

  constructor(options: SupabaseTransportOptions) {
    this.baseUrl = options.supabaseUrl.replace(/\/+$/, '');
    this.apiKey = options.supabaseKey;
    this.deviceId = options.deviceId;
    this.eventsTable = options.eventsTable || 'lemon_bus_events';
    this.sparkDocsTable = options.sparkDocsTable || 'lemon_spark_documents';
    this.watermarksTable = options.watermarksTable || 'lemon_bus_watermarks';
    this.realtimeEnabled = options.realtimeEnabled !== false;
    this.fetchFn = options.fetchImpl || globalThis.fetch;

    this.realtimeClient = new SupabaseRealtimeClient({
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      eventsTable: this.eventsTable,
      onRecord: (record: SupabaseEventRow) => {
        const envelope = this.mapRowToEnvelope(record);
        if (envelope.seq && envelope.seq > this.lastKnownSeq) {
          this.lastKnownSeq = envelope.seq;
        }
        if (envelope.contentHash) {
          this.knownHashes.add(envelope.contentHash);
        }
        this.stream$.next(envelope);
      },
      onCatchUp: () => {
        this.pullSince({ lastSeq: this.lastKnownSeq })
          .then(({ items }) => {
            for (const env of items) {
              this.stream$.next(env);
            }
          })
          .catch(() => {});
      },
    });
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    await this.loadCloudWatermark().catch(() => {});

    if (this.realtimeEnabled) {
      this.realtimeClient.start();
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    this.realtimeClient.stop();
  }

  async publish<T = any>(
    partial: Omit<LemonBusEnvelope<T>, 'eventId' | 'timestamp' | 'deviceId' | 'transportVia'> & {
      eventId?: string;
      timestamp?: string;
      deviceId?: string;
    },
  ): Promise<LemonBusEnvelope<T>> {
    const eventId = partial.eventId || crypto.randomUUID();
    const deviceId = partial.deviceId || this.deviceId;
    const rowInput = {
      event_id: eventId,
      entity_type: partial.entityType,
      action: partial.action,
      origin: partial.origin,
      device_id: deviceId,
      stream_slug: partial.streamSlug || null,
      feed_slug: partial.feedSlug || null,
      external_id: partial.externalId || null,
      content_hash: partial.contentHash || null,
      privacy: partial.privacy || 'private',
      payload: partial.payload ?? {},
    };

    const rows = await this.restRequest<SupabaseEventRow[]>(
      `/rest/v1/${this.eventsTable}`,
      {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(rowInput),
      },
    );

    const inserted = Array.isArray(rows) && rows[0] ? rows[0] : null;
    const envelope = inserted
      ? this.mapRowToEnvelope<T>(inserted)
      : ({
          ...partial,
          eventId,
          timestamp: partial.timestamp || new Date().toISOString(),
          deviceId,
          transportVia: 'supabase',
        } as LemonBusEnvelope<T>);

    if (envelope.seq && envelope.seq > this.lastKnownSeq) {
      this.lastKnownSeq = envelope.seq;
    }
    if (envelope.contentHash) {
      this.knownHashes.add(envelope.contentHash);
    }

    return envelope;
  }

  async publishSparkDocument(
    input: PublishSparkInput,
  ): Promise<LemonBusEnvelope<LemonBusNotePayload>> {
    const processed = processSparkDocument({
      ...input,
      origin: input.origin || 'SUPABASE_SPARK',
    });

    await this.restRequest(
      `/rest/v1/${this.sparkDocsTable}?on_conflict=canonical_path`,
      {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({
          canonical_path: processed.canonicalPath,
          file_name: processed.fileName,
          folder_path: processed.folderPath,
          feed_slug: processed.feedTarget.slug,
          title: processed.notePayload.title,
          content_markdown: input.contentMarkdown,
          frontmatter: processed.frontmatter,
          content_hash: processed.contentHash,
          privacy: processed.notePayload.privacy,
          origin_provider: processed.notePayload.origin,
          updated_by_device: this.deviceId,
          updated_at: new Date().toISOString(),
        }),
      },
    ).catch(() => {});

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
      filter((env) => matchesCompiledBusPattern(compiled, env)),
    );
  }

  async pullSince(
    cursor: BusCursor,
    limit = 200,
  ): Promise<{ items: LemonBusEnvelope[]; nextCursor: BusCursor }> {
    const filters: string[] = [`order=seq.asc`, `limit=${Math.min(500, Math.max(1, limit))}`];
    if (cursor.lastSeq && cursor.lastSeq > 0) {
      filters.push(`seq=gt.${cursor.lastSeq}`);
    } else if (cursor.lastTimestamp) {
      filters.push(`created_at=gt.${encodeURIComponent(cursor.lastTimestamp)}`);
    }

    const rows = await this.restRequest<SupabaseEventRow[]>(
      `/rest/v1/${this.eventsTable}?${filters.join('&')}`,
      { method: 'GET' },
    );

    const items = (rows || []).map((r) => this.mapRowToEnvelope(r));
    const last = items[items.length - 1];
    if (last?.seq && last.seq > this.lastKnownSeq) {
      this.lastKnownSeq = last.seq;
    }

    return {
      items,
      nextCursor: {
        lastSeq: last?.seq ?? cursor.lastSeq ?? this.lastKnownSeq,
        lastTimestamp: last?.timestamp ?? cursor.lastTimestamp ?? null,
      },
    };
  }

  async acknowledgeCursor(cursor: BusCursor): Promise<void> {
    const nextSeq = cursor.lastSeq ?? this.lastKnownSeq;
    if (nextSeq > this.lastKnownSeq) {
      this.lastKnownSeq = nextSeq;
    }
    await this.restRequest(
      `/rest/v1/${this.watermarksTable}?on_conflict=device_id`,
      {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({
          device_id: this.deviceId,
          last_seq: nextSeq,
          driver: 'supabase',
          last_event_timestamp: cursor.lastTimestamp || new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
        }),
      },
    ).catch(() => {});
  }

  async hasContentHash(contentHash: string): Promise<boolean> {
    if (!contentHash) return false;
    if (this.knownHashes.has(contentHash)) return true;

    const rows = await this.restRequest<Array<{ seq: number }>>(
      `/rest/v1/${this.eventsTable}?content_hash=eq.${encodeURIComponent(contentHash)}&select=seq&limit=1`,
      { method: 'GET' },
    );
    if (rows && rows.length > 0) {
      this.knownHashes.add(contentHash);
      return true;
    }
    return false;
  }

  async queryEvents(query: BusEventsQuery): Promise<BusEventsPage> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
    const offset = (page - 1) * limit;

    const params: string[] = [`order=seq.desc`, `limit=${limit}`, `offset=${offset}`];
    if (query.deviceId) params.push(`device_id=eq.${encodeURIComponent(query.deviceId)}`);
    if (query.action) params.push(`action=eq.${encodeURIComponent(query.action)}`);
    if (query.feedSlug) params.push(`feed_slug=eq.${encodeURIComponent(query.feedSlug)}`);

    const rows = await this.restRequest<SupabaseEventRow[]>(
      `/rest/v1/${this.eventsTable}?${params.join('&')}`,
      { method: 'GET' },
    );
    const items = (rows || []).map((r) => this.mapRowToEnvelope(r));
    return {
      total: items.length < limit ? offset + items.length : offset + limit + 1,
      page,
      limit,
      totalPages: Math.max(1, page + (items.length === limit ? 1 : 0)),
      items,
    };
  }

  async getStatus(): Promise<BusTransportStatus> {
    let watermarksRows: Array<{
      device_id: string;
      last_seq: number;
      last_event_timestamp: string | null;
      driver: string;
    }> = [];
    try {
      watermarksRows = await this.restRequest(
        `/rest/v1/${this.watermarksTable}?order=last_seen_at.desc&limit=50`,
        { method: 'GET' },
      );
    } catch {
      watermarksRows = [];
    }

    const watermarks: Record<string, string> = {};
    const nodes: BusNodeStats[] = watermarksRows.map((w) => {
      if (w.last_event_timestamp) watermarks[w.device_id] = w.last_event_timestamp;
      return {
        deviceId: w.device_id,
        eventsCount: Number(w.last_seq) || 0,
        lastEventTimestamp: w.last_event_timestamp,
        watermarkTimestamp: w.last_event_timestamp,
        lastSeq: Number(w.last_seq) || 0,
        driver: 'supabase',
        isCurrentDevice: w.device_id === this.deviceId,
      };
    });

    return {
      driver: 'supabase',
      isWatching: this.running,
      supabaseConnected: this.realtimeClient.isConnected(),
      gdriveConnected: false,
      currentDeviceId: this.deviceId,
      busDir: `${this.baseUrl}/rest/v1/${this.eventsTable}`,
      eventsDir: `${this.baseUrl}/rest/v1/${this.eventsTable}`,
      totalEventsCount: this.lastKnownSeq,
      lastEventTimestamp: watermarks[this.deviceId] || null,
      lastSeq: this.lastKnownSeq,
      watermarks,
      nodes,
    };
  }

  private async loadCloudWatermark(): Promise<void> {
    const rows = await this.restRequest<Array<{ last_seq: number }>>(
      `/rest/v1/${this.watermarksTable}?device_id=eq.${encodeURIComponent(this.deviceId)}&select=last_seq&limit=1`,
      { method: 'GET' },
    );
    if (rows?.[0]?.last_seq) {
      this.lastKnownSeq = Number(rows[0].last_seq) || 0;
    }
  }

  private mapRowToEnvelope<T = any>(row: SupabaseEventRow): LemonBusEnvelope<T> {
    let payload = row.payload;
    if (row.entity_type === 'SPARK_FILE' && payload?.contentMarkdown) {
      const processed = processSparkDocument({
        virtualPath: payload.canonicalPath || row.external_id || 'Spark/Untitled.md',
        contentMarkdown: payload.contentMarkdown,
        origin: payload.origin === 'GDRIVE_SPARK' ? 'GDRIVE_SPARK' : 'SUPABASE_SPARK',
        privacyOverride: row.privacy,
      });
      payload = processed.notePayload as any;
    }

    return {
      eventId: row.event_id,
      seq: Number(row.seq),
      timestamp: row.created_at,
      deviceId: row.device_id,
      entityType: row.entity_type === 'SPARK_FILE' ? 'NOTE' : row.entity_type,
      action: row.action,
      origin: row.origin || 'DIRECT_API',
      transportVia: 'supabase',
      streamSlug: row.stream_slug,
      feedSlug: row.feed_slug,
      externalId: row.external_id,
      contentHash: row.content_hash,
      privacy: row.privacy === 'public' ? 'public' : 'private',
      payload,
    };
  }

  async purgeExpiredRecords(
    retentionDays = 30,
  ): Promise<{ purgedEvents: number; purgedSparkDocs: number }> {
    try {
      const res = await this.restRequest<
        Array<{ purged_events_count: number; purged_docs_count: number }>
      >('/rest/v1/rpc/fn_purge_expired_bus_events', {
        method: 'POST',
        body: JSON.stringify({ retention_days: retentionDays }),
      });
      if (res && res.length > 0) {
        return {
          purgedEvents: Number(res[0].purged_events_count) || 0,
          purgedSparkDocs: Number(res[0].purged_docs_count) || 0,
        };
      }
    } catch {
      const cutoff = new Date(Date.now() - retentionDays * 86_400_000).toISOString();
      await this.restRequest(
        `/rest/v1/${this.eventsTable}?created_at=lt.${encodeURIComponent(cutoff)}`,
        { method: 'DELETE' },
      ).catch(() => {});
      await this.restRequest(
        `/rest/v1/${this.sparkDocsTable}?updated_at=lt.${encodeURIComponent(cutoff)}`,
        { method: 'DELETE' },
      ).catch(() => {});
    }

    return { purgedEvents: 0, purgedSparkDocs: 0 };
  }

  async fetchNoteContent(ref: {
    canonicalPath?: string;
    documentId?: string;
    externalId?: string;
  }): Promise<string | null> {
    if (ref.documentId) {
      const rows = await this.restRequest<Array<{ content_markdown: string }>>(
        `/rest/v1/${this.sparkDocsTable}?id=eq.${encodeURIComponent(ref.documentId)}&select=content_markdown&limit=1`,
        { method: 'GET' },
      ).catch(() => []);
      if (rows && rows[0]?.content_markdown) return rows[0].content_markdown;
    }
    const targetPath = ref.canonicalPath || ref.externalId;
    if (targetPath) {
      const rows = await this.restRequest<Array<{ content_markdown: string }>>(
        `/rest/v1/${this.sparkDocsTable}?canonical_path=eq.${encodeURIComponent(targetPath)}&select=content_markdown&limit=1`,
        { method: 'GET' },
      ).catch(() => []);
      if (rows && rows[0]?.content_markdown) return rows[0].content_markdown;
    }
    return null;
  }

  private async restRequest<T = any>(path: string, init: RequestInit): Promise<T> {
    const res = await this.fetchFn(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        apikey: this.apiKey,
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`Supabase REST error (${res.status}): ${errText}`);
    }
    const text = await res.text();
    return text ? (JSON.parse(text) as T) : ([] as unknown as T);
  }
}
