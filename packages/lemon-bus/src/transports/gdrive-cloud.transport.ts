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

export interface GoogleDriveCloudTransportOptions {
  deviceId: string;
  getAccessToken: () => Promise<string | null>;
  sparksFolderId?: string;
  pollIntervalMs?: number;
  fetchImpl?: typeof fetch;
}

/**
 * Cloud-Direct Google Drive REST API v3 Transport.
 * Polls Google Drive Changes API over HTTPS without needing Google Drive Desktop installed!
 */
export class GoogleDriveCloudTransport implements ILemonBusTransport {
  public readonly driver = 'gdrive-cloud' as const;
  public readonly deviceId: string;

  private readonly getAccessToken: () => Promise<string | null>;
  private readonly pollIntervalMs: number;
  private readonly fetchFn: typeof fetch;
  private readonly stream$ = new Subject<LemonBusEnvelope>();
  private readonly recentEvents: LemonBusEnvelope[] = [];
  private readonly knownHashes = new Set<string>();
  private pageToken: string | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private connected = false;

  constructor(options: GoogleDriveCloudTransportOptions) {
    this.deviceId = options.deviceId;
    this.getAccessToken = options.getAccessToken;
    this.pollIntervalMs = options.pollIntervalMs || 15_000;
    this.fetchFn = options.fetchImpl || globalThis.fetch;
  }

  async start(): Promise<void> {
    this.running = true;
    await this.initStartPageToken().catch(() => {});
    this.pollTimer = setInterval(() => {
      this.pollCloudChanges().catch(() => {});
    }, this.pollIntervalMs);
  }

  async stop(): Promise<void> {
    this.running = false;
    this.connected = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
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
      transportVia: 'gdrive-cloud',
    };

    const token = await this.getAccessToken();
    if (token) {
      await this.uploadMultipartJson(
        token,
        `${envelope.timestamp.replace(/[:.]/g, '-')}_${envelope.deviceId}_${envelope.eventId.slice(0, 8)}.json`,
        JSON.stringify(envelope),
      ).catch(() => {});
      this.connected = true;
    }

    if (envelope.contentHash) this.knownHashes.add(envelope.contentHash);
    this.pushRecent(envelope);
    return envelope;
  }

  async publishSparkDocument(
    input: PublishSparkInput,
  ): Promise<LemonBusEnvelope<LemonBusNotePayload>> {
    const processed = processSparkDocument({
      ...input,
      origin: 'GDRIVE_SPARK',
    });
    return this.publish<LemonBusNotePayload>({
      entityType: 'NOTE',
      action: 'UPSERT',
      origin: 'GDRIVE_SPARK',
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

  async pullSince(cursor: BusCursor): Promise<{ items: LemonBusEnvelope[]; nextCursor: BusCursor }> {
    await this.pollCloudChanges().catch(() => {});
    const minTs = cursor.lastTimestamp;
    const items = minTs
      ? this.recentEvents.filter((e) => e.timestamp > minTs)
      : [...this.recentEvents];
    const last = items[items.length - 1];
    return {
      items,
      nextCursor: { lastTimestamp: last?.timestamp ?? cursor.lastTimestamp ?? null },
    };
  }

  async acknowledgeCursor(_cursor: BusCursor): Promise<void> {}

  async hasContentHash(contentHash: string): Promise<boolean> {
    return Boolean(contentHash && this.knownHashes.has(contentHash));
  }

  async queryEvents(query: BusEventsQuery): Promise<BusEventsPage> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
    const rev = [...this.recentEvents].reverse();
    return {
      total: rev.length,
      page,
      limit,
      totalPages: Math.ceil(rev.length / limit),
      items: rev.slice((page - 1) * limit, page * limit),
    };
  }

  async getStatus(): Promise<BusTransportStatus> {
    const lastEvt = this.recentEvents[this.recentEvents.length - 1] || null;
    return {
      driver: 'gdrive-cloud',
      isWatching: this.running,
      supabaseConnected: false,
      gdriveConnected: this.connected,
      currentDeviceId: this.deviceId,
      busDir: 'gdrive://cloud/changes',
      eventsDir: 'gdrive://cloud/events',
      totalEventsCount: this.recentEvents.length,
      lastEventTimestamp: lastEvt?.timestamp || null,
      lastSeq: this.recentEvents.length,
      watermarks: {},
      nodes: [
        {
          deviceId: this.deviceId,
          eventsCount: this.recentEvents.length,
          lastEventTimestamp: lastEvt?.timestamp || null,
          watermarkTimestamp: null,
          lastSeq: null,
          driver: 'gdrive-cloud',
          isCurrentDevice: true,
        },
      ],
    };
  }

  private async initStartPageToken(): Promise<void> {
    const token = await this.getAccessToken();
    if (!token) return;
    const res = await this.fetchFn('https://www.googleapis.com/drive/v3/changes/startPageToken', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = (await res.json()) as { startPageToken?: string };
      this.pageToken = data.startPageToken || null;
      this.connected = true;
    }
  }

  public async pollCloudChanges(): Promise<number> {
    const token = await this.getAccessToken();
    if (!token) return 0;
    if (!this.pageToken) {
      await this.initStartPageToken();
      if (!this.pageToken) return 0;
    }

    const url = `https://www.googleapis.com/drive/v3/changes?pageToken=${encodeURIComponent(
      this.pageToken,
    )}&fields=newStartPageToken,nextPageToken,changes(fileId,removed,file(id,name,mimeType,trashed))`;

    const res = await this.fetchFn(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return 0;

    const data = (await res.json()) as any;
    this.pageToken = data.newStartPageToken || data.nextPageToken || this.pageToken;
    let ingested = 0;

    for (const ch of data.changes || []) {
      const file = ch.file;
      if (!file || ch.removed || file.trashed) continue;
      const name: string = file.name || '';
      if (name.toLowerCase().endsWith('.md') && !name.startsWith('_')) {
        const mdRes = await this.fetchFn(
          `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!mdRes.ok) continue;
        const markdown = await mdRes.text();
        const processed = processSparkDocument({
          virtualPath: `Spark/${name}`,
          contentMarkdown: markdown,
          origin: 'GDRIVE_SPARK',
        });
        if (this.knownHashes.has(processed.contentHash)) continue;
        this.knownHashes.add(processed.contentHash);

        const env: LemonBusEnvelope<LemonBusNotePayload> = {
          eventId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          deviceId: this.deviceId,
          entityType: 'NOTE',
          action: 'UPSERT',
          origin: 'GDRIVE_SPARK',
          transportVia: 'gdrive-cloud',
          feedSlug: processed.feedTarget.slug,
          externalId: processed.canonicalPath,
          contentHash: processed.contentHash,
          privacy: processed.notePayload.privacy,
          payload: processed.notePayload,
        };
        this.pushRecent(env);
        this.stream$.next(env);
        ingested += 1;
      }
    }

    return ingested;
  }

  private pushRecent(env: LemonBusEnvelope): void {
    this.recentEvents.push(env);
    if (this.recentEvents.length > 250) {
      this.recentEvents.shift();
    }
  }

  private async uploadMultipartJson(token: string, name: string, jsonBody: string): Promise<void> {
    const boundary = 'lemon_bus_gdrive_boundary';
    const body =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
      JSON.stringify({ name, mimeType: 'application/json' }) +
      `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
      jsonBody +
      `\r\n--${boundary}--`;

    await this.fetchFn('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    });
  }
}
