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
  PublishSparkInput,
} from '../types/bus-contract.types.js';
import { processSparkDocument } from '../sparks/spark-document.processor.js';
import { compileBusPattern, matchesCompiledBusPattern } from './pattern-matcher.util.js';

export interface InMemoryTransportOptions {
  deviceId?: string;
  maxBufferSize?: number;
}

export class InMemoryBusTransport implements ILemonBusTransport {
  public readonly driver = 'memory' as const;
  public readonly deviceId: string;

  private readonly maxBufferSize: number;
  private readonly stream$ = new Subject<LemonBusEnvelope>();
  private readonly eventsLog: LemonBusEnvelope[] = [];
  private readonly knownHashes = new Set<string>();
  private readonly watermarks = new Map<string, { seq: number; timestamp: string }>();
  private readonly sparkDocs = new Map<string, string>();
  private seqCounter = 0;
  private running = false;

  constructor(options?: InMemoryTransportOptions) {
    this.deviceId = options?.deviceId || 'memory-node';
    this.maxBufferSize = options?.maxBufferSize || 500;
  }

  async start(): Promise<void> {
    this.running = true;
  }

  async stop(): Promise<void> {
    this.running = false;
  }

  async publish<T = any>(
    partial: Omit<LemonBusEnvelope<T>, 'eventId' | 'timestamp' | 'deviceId' | 'transportVia'> & {
      eventId?: string;
      timestamp?: string;
      deviceId?: string;
    },
  ): Promise<LemonBusEnvelope<T>> {
    this.seqCounter += 1;
    const now = partial.timestamp || new Date().toISOString();
    const devId = partial.deviceId || this.deviceId;
    const envelope: LemonBusEnvelope<T> = {
      ...partial,
      eventId: partial.eventId || crypto.randomUUID(),
      seq: this.seqCounter,
      timestamp: now,
      deviceId: devId,
      transportVia: 'memory',
    };

    if (envelope.contentHash) {
      this.knownHashes.add(envelope.contentHash);
    }

    this.eventsLog.push(envelope);
    if (this.eventsLog.length > this.maxBufferSize) {
      this.eventsLog.shift();
    }

    this.watermarks.set(devId, { seq: envelope.seq!, timestamp: now });
    this.stream$.next(envelope);
    return envelope;
  }

  async publishSparkDocument(
    input: PublishSparkInput,
  ): Promise<LemonBusEnvelope<LemonBusNotePayload>> {
    const processed = processSparkDocument({
      ...input,
      origin: input.origin || 'SUPABASE_SPARK',
    });

    this.sparkDocs.set(processed.canonicalPath, input.contentMarkdown);
    if (processed.notePayload.id) {
      this.sparkDocs.set(processed.notePayload.id, input.contentMarkdown);
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
      filter((env) => matchesCompiledBusPattern(compiled, env)),
    );
  }

  async pullSince(
    cursor: BusCursor,
    limit = 100,
  ): Promise<{ items: LemonBusEnvelope[]; nextCursor: BusCursor }> {
    const minSeq = cursor.lastSeq ?? 0;
    const minTs = cursor.lastTimestamp ?? null;

    const filtered = this.eventsLog
      .filter((e) => {
        if (minSeq > 0 && e.seq !== undefined) return e.seq > minSeq;
        if (minTs) return e.timestamp > minTs;
        return true;
      })
      .slice(0, limit);

    const last = filtered[filtered.length - 1];
    return {
      items: filtered,
      nextCursor: {
        lastSeq: last?.seq ?? cursor.lastSeq ?? this.seqCounter,
        lastTimestamp: last?.timestamp ?? cursor.lastTimestamp ?? null,
      },
    };
  }

  async acknowledgeCursor(cursor: BusCursor): Promise<void> {
    this.watermarks.set(this.deviceId, {
      seq: cursor.lastSeq ?? this.seqCounter,
      timestamp: cursor.lastTimestamp || new Date().toISOString(),
    });
  }

  async hasContentHash(contentHash: string): Promise<boolean> {
    return Boolean(contentHash && this.knownHashes.has(contentHash));
  }

  async queryEvents(query: BusEventsQuery): Promise<BusEventsPage> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
    const searchLower = query.search?.toLowerCase().trim() || null;

    const reversed = [...this.eventsLog].reverse().filter((env) => {
      if (query.deviceId && env.deviceId.toLowerCase() !== query.deviceId.toLowerCase()) {
        return false;
      }
      if (query.action && env.action !== query.action) {
        return false;
      }
      if (query.feedSlug && env.feedSlug !== query.feedSlug) {
        return false;
      }
      if (searchLower) {
        const hay = JSON.stringify({
          id: env.eventId,
          feed: env.feedSlug,
          title: env.payload?.title,
          summary: env.payload?.summary,
        }).toLowerCase();
        if (!hay.includes(searchLower)) return false;
      }
      return true;
    });

    const total = reversed.length;
    const items = reversed.slice((page - 1) * limit, page * limit);
    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items,
    };
  }

  async purgeExpiredRecords(
    retentionDays = 30,
  ): Promise<{ purgedEvents: number; purgedSparkDocs: number }> {
    const cutoff = Date.now() - retentionDays * 86_400_000;
    const initialLen = this.eventsLog.length;
    let removeIdx = 0;
    while (
      removeIdx < this.eventsLog.length &&
      new Date(this.eventsLog[removeIdx].timestamp).getTime() < cutoff
    ) {
      if (this.eventsLog[removeIdx].contentHash) {
        this.knownHashes.delete(this.eventsLog[removeIdx].contentHash!);
      }
      removeIdx++;
    }
    if (removeIdx > 0) {
      this.eventsLog.splice(0, removeIdx);
    }
    return { purgedEvents: initialLen - this.eventsLog.length, purgedSparkDocs: 0 };
  }

  async fetchNoteContent(ref: {
    canonicalPath?: string;
    documentId?: string;
    externalId?: string;
  }): Promise<string | null> {
    const key = ref.canonicalPath || ref.externalId || ref.documentId;
    if (key && this.sparkDocs.has(key)) {
      return this.sparkDocs.get(key)!;
    }
    return null;
  }

  async getStatus(): Promise<BusTransportStatus> {
    const watermarksRecord: Record<string, string> = {};
    for (const [dev, wm] of this.watermarks.entries()) {
      watermarksRecord[dev] = wm.timestamp;
    }

    const lastEvt = this.eventsLog[this.eventsLog.length - 1] || null;
    return {
      driver: 'memory',
      isWatching: this.running,
      supabaseConnected: false,
      gdriveConnected: false,
      currentDeviceId: this.deviceId,
      busDir: 'memory://lemon-bus',
      eventsDir: 'memory://lemon-bus/events',
      totalEventsCount: this.eventsLog.length,
      lastEventTimestamp: lastEvt?.timestamp || null,
      lastSeq: this.seqCounter,
      watermarks: watermarksRecord,
      nodes: [
        {
          deviceId: this.deviceId,
          eventsCount: this.eventsLog.length,
          lastEventTimestamp: lastEvt?.timestamp || null,
          watermarkTimestamp: watermarksRecord[this.deviceId] || null,
          lastSeq: this.seqCounter,
          driver: 'memory',
          isCurrentDevice: true,
        },
      ],
    };
  }
}
