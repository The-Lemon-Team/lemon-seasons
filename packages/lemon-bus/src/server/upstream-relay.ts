import { BusDatabase } from './db.js';
import { SseManager } from './sse.js';
import { CloudHttpBusTransport } from '../transports/cloud-http.transport.js';
import { LemonBusEnvelope } from '../types/bus-contract.types.js';

export interface UpstreamBusRelayOptions {
  upstreamUrl: string;
  db: BusDatabase;
  sse: SseManager;
  apiKey?: string;
  deviceId?: string;
  pollIntervalMs?: number;
}

/**
 * UpstreamBusRelay bridges a local Lemon Bus node to an upstream Cloud Bus (e.g. on Fly.io).
 *
 * Flow:
 * 1. Pulls events and Spark documents from Cloud Bus into local SQLite database.
 * 2. Listens to real-time Cloud Bus SSE stream and broadcasts down to local clients.
 * 3. Supports forwarding locally published events to the upstream Cloud Bus.
 */
export class UpstreamBusRelay {
  private readonly upstreamUrl: string;
  private readonly db: BusDatabase;
  private readonly sse: SseManager;
  private readonly deviceId: string;
  private readonly pollIntervalMs: number;
  private readonly transport: CloudHttpBusTransport;
  private sub: any = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private running = false;
  private syncing = false;

  constructor(options: UpstreamBusRelayOptions) {
    this.upstreamUrl = options.upstreamUrl.replace(/\/+$/, '');
    this.db = options.db;
    this.sse = options.sse;
    this.deviceId = options.deviceId || 'local-bus-relay';
    this.pollIntervalMs = options.pollIntervalMs || 15000;
    this.transport = new CloudHttpBusTransport({
      busUrl: this.upstreamUrl,
      deviceId: this.deviceId,
    });
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    try {
      await this.transport.start();
      console.log(`[UpstreamRelay] Connected to upstream Cloud Bus: ${this.upstreamUrl}`);
    } catch (err: any) {
      console.warn(`[UpstreamRelay] Initial connect warning: ${err?.message}`);
    }

    // Initial Catch-Up Sync
    try {
      await this.runCatchUp();
    } catch (err: any) {
      console.warn(`[UpstreamRelay] Catch-up error: ${err?.message}`);
    }

    // Real-time SSE stream from upstream
    this.sub = this.transport
      .subscribe({ excludeDeviceId: this.deviceId })
      .subscribe({
        next: async (envelope) => {
          await this.ingestEnvelope(envelope);
        },
        error: (err) => {
          console.warn(`[UpstreamRelay] Stream error: ${err?.message}`);
        },
      });

    // Periodic poll for catch-up in case SSE missed any events
    this.pollTimer = setInterval(() => {
      if (this.running && !this.syncing) {
        this.runCatchUp().catch(() => {});
      }
    }, this.pollIntervalMs);
    if (this.pollTimer.unref) {
      this.pollTimer.unref();
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.sub) {
      this.sub.unsubscribe();
      this.sub = null;
    }
    await this.transport.stop().catch(() => {});
  }

  async publish(envelope: LemonBusEnvelope): Promise<void> {
    if (!this.transport) return;
    try {
      await this.transport.publish(envelope);
    } catch (err: any) {
      console.warn(`[UpstreamRelay] Failed to forward event to upstream: ${err?.message}`);
    }
  }

  public async runCatchUp(): Promise<void> {
    if (this.syncing || !this.transport) return;
    this.syncing = true;
    try {
      let lastSeq = this.db.getWatermark('upstream-fly');
      let hasMore = true;

      while (hasMore && this.running) {
        const pullRes = await this.transport.pullSince({ lastSeq }, 100);
        const items = pullRes.items || [];
        if (items.length === 0) {
          hasMore = false;
          break;
        }

        for (const item of items) {
          await this.ingestEnvelope(item);
          if (item.seq && item.seq > lastSeq) {
            lastSeq = item.seq;
          }
        }

        this.db.updateWatermark('upstream-fly', lastSeq);
        if (items.length < 100) {
          hasMore = false;
        }
      }
    } catch {
      // Quiet fail if network temporarily unavailable
    } finally {
      this.syncing = false;
    }
  }

  private async ingestEnvelope(envelope: LemonBusEnvelope): Promise<void> {
    try {
      if (this.db.hasEvent(envelope.eventId)) {
        return;
      }

      // If envelope references a Spark Document, fetch and store it locally
      if (envelope.contentHash && !this.db.hasSparkDocumentByHash(envelope.contentHash)) {
        await this.pullSparkDocument(envelope);
      }

      const localEnvelope: Omit<LemonBusEnvelope, 'seq'> = {
        eventId: envelope.eventId,
        entityType: envelope.entityType,
        action: envelope.action,
        origin: envelope.origin,
        transportVia: 'cloud',
        deviceId: envelope.deviceId,
        streamSlug: envelope.streamSlug,
        feedSlug: envelope.feedSlug,
        externalId: envelope.externalId,
        contentHash: envelope.contentHash,
        privacy: envelope.privacy || 'private',
        payload: envelope.payload || {},
        timestamp: envelope.timestamp,
      };

      const saved = this.db.insertEvent(localEnvelope);
      this.sse.broadcast(saved);
    } catch (err: any) {
      if (!err?.message?.includes('UNIQUE constraint failed')) {
        console.warn(`[UpstreamRelay] Ingestion warning: ${err?.message}`);
      }
    }
  }

  private async pullSparkDocument(envelope: LemonBusEnvelope): Promise<void> {
    try {
      const canonicalPath = envelope.externalId;
      if (!canonicalPath) return;

      const res = await fetch(
        `${this.upstreamUrl}/sparks?canonicalPath=${encodeURIComponent(canonicalPath)}`,
      );
      if (!res.ok) return;

      const doc = await res.json();
      if (doc && doc.canonicalPath && doc.contentMarkdown) {
        this.db.upsertSparkDocument({
          id: doc.id || envelope.eventId,
          canonicalPath: doc.canonicalPath,
          fileName: doc.fileName || doc.canonicalPath.split('/').pop() || 'untitled.md',
          folderPath: doc.folderPath || '',
          feedSlug: doc.feedSlug || envelope.feedSlug || 'sparks',
          title: doc.title || (envelope.payload as any)?.title || 'Untitled Spark',
          contentMarkdown: doc.contentMarkdown,
          frontmatter: doc.frontmatter || {},
          contentHash: doc.contentHash || envelope.contentHash || '',
          privacy: doc.privacy || envelope.privacy || 'private',
          originProvider: doc.originProvider || envelope.origin || 'CLOUD_SPARK',
          updatedByDevice: doc.updatedByDevice || envelope.deviceId || 'upstream',
        });
      }
    } catch {
      // Ignore spark pull error
    }
  }
}
