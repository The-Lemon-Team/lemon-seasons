import { Observable, Subscription, merge } from 'rxjs';
import { distinct, filter } from 'rxjs/operators';
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
import { compileBusPattern, matchesCompiledBusPattern } from './pattern-matcher.util.js';

export interface HybridTransportOptions {
  deviceId: string;
  primary: ILemonBusTransport; // Typically SupabaseBusTransport
  secondary: ILemonBusTransport; // Typically GoogleDriveFsTransport or GoogleDriveCloudTransport
  mirrorOutboundToSecondary?: boolean;
}

/**
 * Composite Hybrid Transport (Supabase Primary + Google Drive Bridge).
 * Automatically forwards incoming Google Drive Spark .md and .json events into Supabase
 * so all apps receive sub-80ms Realtime updates without running Google Drive Desktop everywhere.
 */
export class HybridBusTransport implements ILemonBusTransport {
  public readonly driver = 'hybrid' as const;
  public readonly deviceId: string;

  private readonly primary: ILemonBusTransport;
  private readonly secondary: ILemonBusTransport;
  private readonly mirrorOutbound: boolean;
  private bridgeSub: Subscription | null = null;

  constructor(options: HybridTransportOptions) {
    this.deviceId = options.deviceId;
    this.primary = options.primary;
    this.secondary = options.secondary;
    this.mirrorOutbound = options.mirrorOutboundToSecondary !== false;
  }

  async start(): Promise<void> {
    await Promise.all([
      this.primary.start().catch(() => {}),
      this.secondary.start().catch(() => {}),
    ]);

    // Bridge incoming events from Secondary (Google Drive) -> Primary (Supabase)
    this.bridgeSub = this.secondary.subscribe().subscribe((env) => {
      this.forwardSecondaryToPrimary(env).catch(() => {});
    });
  }

  async stop(): Promise<void> {
    if (this.bridgeSub) {
      this.bridgeSub.unsubscribe();
      this.bridgeSub = null;
    }
    await Promise.all([
      this.primary.stop().catch(() => {}),
      this.secondary.stop().catch(() => {}),
    ]);
  }

  async publish<T = any>(
    partial: Omit<LemonBusEnvelope<T>, 'eventId' | 'timestamp' | 'deviceId' | 'transportVia'> & {
      eventId?: string;
      timestamp?: string;
      deviceId?: string;
    },
  ): Promise<LemonBusEnvelope<T>> {
    try {
      const published = await this.primary.publish(partial);
      if (this.mirrorOutbound) {
        this.secondary.publish({ ...partial, eventId: published.eventId }).catch(() => {});
      }
      return { ...published, transportVia: 'hybrid' };
    } catch {
      const fallback = await this.secondary.publish(partial);
      return { ...fallback, transportVia: 'hybrid' };
    }
  }

  async publishSparkDocument(
    input: PublishSparkInput,
  ): Promise<LemonBusEnvelope<LemonBusNotePayload>> {
    try {
      const published = await this.primary.publishSparkDocument(input);
      if (this.mirrorOutbound) {
        this.secondary.publish({
          eventId: published.eventId,
          entityType: 'NOTE',
          action: 'UPSERT',
          origin: published.origin,
          feedSlug: published.feedSlug,
          externalId: published.externalId,
          contentHash: published.contentHash,
          privacy: published.privacy,
          payload: published.payload,
        }).catch(() => {});
      }
      return { ...published, transportVia: 'hybrid' };
    } catch {
      return this.secondary.publishSparkDocument(input);
    }
  }

  subscribe(pattern?: BusSubscriptionPattern): Observable<LemonBusEnvelope> {
    const compiled = compileBusPattern(pattern);
    return merge(this.primary.subscribe(), this.secondary.subscribe()).pipe(
      distinct((env) => env.eventId),
      filter((env) => matchesCompiledBusPattern(compiled, env)),
    );
  }

  async pullSince(
    cursor: BusCursor,
    limit = 200,
  ): Promise<{ items: LemonBusEnvelope[]; nextCursor: BusCursor }> {
    const [primaryBatch, secondaryBatch] = await Promise.all([
      this.primary.pullSince(cursor, limit).catch(() => ({ items: [], nextCursor: cursor })),
      this.secondary.pullSince(cursor, limit).catch(() => ({ items: [], nextCursor: cursor })),
    ]);

    const seenIds = new Set<string>();
    const merged: LemonBusEnvelope[] = [];

    for (const item of [...primaryBatch.items, ...secondaryBatch.items]) {
      if (seenIds.has(item.eventId)) continue;
      seenIds.add(item.eventId);
      merged.push(item);
    }

    // Forward any newly discovered secondary items into primary asynchronously
    for (const secItem of secondaryBatch.items) {
      if (!primaryBatch.items.some((p) => p.eventId === secItem.eventId)) {
        this.forwardSecondaryToPrimary(secItem).catch(() => {});
      }
    }

    return {
      items: merged.slice(0, limit),
      nextCursor: {
        lastSeq: primaryBatch.nextCursor.lastSeq ?? cursor.lastSeq,
        lastTimestamp:
          secondaryBatch.nextCursor.lastTimestamp ||
          primaryBatch.nextCursor.lastTimestamp ||
          cursor.lastTimestamp,
      },
    };
  }

  async acknowledgeCursor(cursor: BusCursor): Promise<void> {
    await Promise.all([
      this.primary.acknowledgeCursor(cursor).catch(() => {}),
      this.secondary.acknowledgeCursor(cursor).catch(() => {}),
    ]);
  }

  async hasContentHash(contentHash: string): Promise<boolean> {
    if (!contentHash) return false;
    const [inPrimary, inSecondary] = await Promise.all([
      this.primary.hasContentHash(contentHash).catch(() => false),
      this.secondary.hasContentHash(contentHash).catch(() => false),
    ]);
    return inPrimary || inSecondary;
  }

  async queryEvents(query: BusEventsQuery): Promise<BusEventsPage> {
    try {
      const res = await this.primary.queryEvents(query);
      if (res.items.length > 0) return res;
    } catch {
      // fallback to secondary
    }
    return this.secondary.queryEvents(query);
  }

  async getStatus(): Promise<BusTransportStatus> {
    const [pStatus, sStatus] = await Promise.all([
      this.primary.getStatus().catch(() => null),
      this.secondary.getStatus().catch(() => null),
    ]);

    const nodes = [...(pStatus?.nodes || []), ...(sStatus?.nodes || [])];
    return {
      driver: 'hybrid',
      isWatching: Boolean(pStatus?.isWatching || sStatus?.isWatching),
      supabaseConnected: Boolean(pStatus?.supabaseConnected),
      gdriveConnected: Boolean(sStatus?.gdriveConnected),
      currentDeviceId: this.deviceId,
      busDir: sStatus?.busDir || pStatus?.busDir || 'hybrid://lemon-bus',
      eventsDir: sStatus?.eventsDir || pStatus?.eventsDir || 'hybrid://lemon-bus/events',
      totalEventsCount: Math.max(pStatus?.totalEventsCount || 0, sStatus?.totalEventsCount || 0),
      lastEventTimestamp: pStatus?.lastEventTimestamp || sStatus?.lastEventTimestamp || null,
      lastSeq: pStatus?.lastSeq || sStatus?.lastSeq || 0,
      watermarks: { ...(sStatus?.watermarks || {}), ...(pStatus?.watermarks || {}) },
      nodes,
    };
  }

  async purgeExpiredRecords(
    retentionDays = 30,
  ): Promise<{ purgedEvents: number; purgedSparkDocs: number }> {
    if (this.primary.purgeExpiredRecords) {
      return this.primary.purgeExpiredRecords(retentionDays);
    }
    return { purgedEvents: 0, purgedSparkDocs: 0 };
  }

  async fetchNoteContent(ref: {
    canonicalPath?: string;
    documentId?: string;
    externalId?: string;
  }): Promise<string | null> {
    if (this.primary.fetchNoteContent) {
      const content = await this.primary.fetchNoteContent(ref);
      if (content) return content;
    }
    if (this.secondary?.fetchNoteContent) {
      return this.secondary.fetchNoteContent(ref);
    }
    return null;
  }

  private async forwardSecondaryToPrimary(env: LemonBusEnvelope): Promise<void> {
    if (env.contentHash) {
      const exists = await this.primary.hasContentHash(env.contentHash).catch(() => false);
      if (exists) return;
    }
    await this.primary.publish({
      eventId: env.eventId,
      timestamp: env.timestamp,
      deviceId: env.deviceId,
      entityType: env.entityType,
      action: env.action,
      origin: env.origin,
      streamSlug: env.streamSlug,
      feedSlug: env.feedSlug,
      externalId: env.externalId,
      contentHash: env.contentHash,
      privacy: env.privacy,
      payload: env.payload,
    });
  }
}
