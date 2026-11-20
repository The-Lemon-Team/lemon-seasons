import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { TopologyService } from '../topology/topology.service';
import { EventsSseService } from '../events/events-sse.service';
import { NotePublishedEvent } from '../events';

export interface CombinatorNeuronSummary {
  key: 'dbGateway' | 'topology' | 'ingest' | 'media';
  path: string;
  folderId: string;
  observerFlowId?: string;
  contextFlowId?: string;
}

@Injectable()
export class NeuronsBridgeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NeuronsBridgeService.name);
  public readonly combinatorUrl: string;
  public readonly mediaHubUrl: string;

  private initTimer: NodeJS.Timeout | null = null;
  private combinatorSynced = false;
  private registeredNeurons: Record<string, CombinatorNeuronSummary> = {};

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly topologyService?: TopologyService,
    @Optional() private readonly eventsSseService?: EventsSseService,
  ) {
    this.combinatorUrl = (
      process.env.LEMON_CORE_COMBINATOR_URL || 'http://127.0.0.1:3000/api'
    ).replace(/\/+$/, '');
    this.mediaHubUrl = (
      process.env.LEMON_MEDIA_HUB_URL || 'http://127.0.0.1:3005'
    ).replace(/\/+$/, '');
  }

  onModuleInit(): void {
    // Defer Core Combinator registration until HTTP server is listening
    this.initTimer = setTimeout(() => {
      void this.ensureCompositeNeurons();
    }, 2000);
    this.initTimer.unref();
  }

  onModuleDestroy(): void {
    if (this.initTimer) {
      clearTimeout(this.initTimer);
      this.initTimer = null;
    }
  }

  /**
   * Idempotently registers Lemon Seasons composite neurons in Core Combinator
   * so the platform orchestrates DB mutations, topology snapshots, ingest, and media.
   */
  async ensureCompositeNeurons(): Promise<{
    synced: boolean;
    combinatorUrl: string;
    neurons: CombinatorNeuronSummary[];
    error?: string;
  }> {
    try {
      const specs: Array<{
        key: CombinatorNeuronSummary['key'];
        name: string;
        path: string;
        flows: Array<{
          type: string;
          name: string;
          config: Record<string, any> | null;
          isExclusive?: boolean;
          orchestratorRules?: Record<string, any>;
        }>;
      }> = [
        {
          key: 'dbGateway',
          name: 'Seasons PostgreSQL Gateway',
          path: '/seasons/db-gateway',
          flows: [
            {
              type: 'CONTEXT',
              name: 'Seasons DB Gateway Context',
              config: {
                service: 'lemon-lenta-backend',
                storage: 'postgresql+prisma',
                endpoints: [
                  '/api/v1/topology',
                  '/api/v1/streams/:slug/notes',
                  '/api/v1/feeds/:slug/notes',
                  '/api/v1/notes/ingest',
                  '/api/v1/events/stream',
                ],
              },
            },
            { type: 'OBSERVER', name: 'Seasons DB Mutation Telemetry', config: null },
          ],
        },
        {
          key: 'topology',
          name: 'Seasons Topology & Streams',
          path: '/seasons/topology',
          flows: [
            {
              type: 'CONTEXT',
              name: 'Seasons Topology Context',
              config: { capabilities: ['streams', 'feeds', 'dateBuckets', 'sse-patches'] },
            },
            { type: 'TIMER', name: 'Seasons Topology Heartbeat', config: { intervalSeconds: 30 } },
            { type: 'OBSERVER', name: 'Seasons Topology Telemetry', config: null },
          ],
        },
        {
          key: 'ingest',
          name: 'Seasons Note Ingest Flow',
          path: '/seasons/ingest',
          flows: [
            {
              type: 'CONTEXT',
              name: 'Seasons Ingest Context',
              config: { pipeline: 'ingest -> postgres-upsert -> topology-diff -> sse' },
            },
            {
              type: 'BATCH',
              name: 'Seasons Ingest Batch',
              config: {
                maxBatchSize: 15,
                maxWaitSeconds: 30,
                idleTimeoutSeconds: 5,
                deduplicationKey: 'externalId',
                pendingCount: 0,
              },
            },
            {
              type: 'MUTEX',
              name: 'Seasons Ingest Mutex',
              config: null,
              isExclusive: false,
              orchestratorRules: { onConflict: 'queue', leaseTimeoutSeconds: 90 },
            },
            { type: 'OBSERVER', name: 'Seasons Ingest Telemetry', config: null },
          ],
        },
        {
          key: 'media',
          name: 'Seasons Note Media Bridge',
          path: '/seasons/media',
          flows: [
            {
              type: 'CONTEXT',
              name: 'Seasons Media Hub Bridge Context',
              config: {
                mediaHubUrl: this.mediaHubUrl,
                pipeline: 'media-hub -> note-image-attach -> sse',
              },
            },
            { type: 'OBSERVER', name: 'Seasons Media Telemetry', config: null },
          ],
        },
      ];

      const folders = await this.combinatorRequest<Array<{ id: string; path: string }>>(
        'GET',
        '/folders',
      );

      for (const spec of specs) {
        let folder = folders.find((f) => f.path === spec.path);
        if (!folder) {
          folder = await this.combinatorRequest<{ id: string; path: string }>(
            'POST',
            '/folders',
            { name: spec.name, parentId: null, profileId: null },
          );
        }

        const existingFlows = await this.combinatorRequest<
          Array<{ id: string; type: string; name: string }>
        >('GET', `/flows?folderId=${encodeURIComponent(folder.id)}`);

        let observerFlowId: string | undefined;
        let contextFlowId: string | undefined;

        for (const flowSpec of spec.flows) {
          let flow = existingFlows.find(
            (f) => f.type === flowSpec.type || f.name === flowSpec.name,
          );
          if (!flow) {
            flow = await this.combinatorRequest<{ id: string; type: string; name: string }>(
              'POST',
              '/flows',
              {
                name: flowSpec.name,
                type: flowSpec.type,
                isExclusive: flowSpec.isExclusive ?? false,
                folderId: folder.id,
                profileId: null,
                config: flowSpec.config,
                orchestratorRules: flowSpec.orchestratorRules,
              },
            );
          }
          if (flow.type === 'OBSERVER') observerFlowId = flow.id;
          if (flow.type === 'CONTEXT') contextFlowId = flow.id;
        }

        this.registeredNeurons[spec.key] = {
          key: spec.key,
          path: spec.path,
          folderId: folder.id,
          observerFlowId,
          contextFlowId,
        };
      }

      this.combinatorSynced = true;
      this.logger.log(
        `🧠 Synced ${Object.keys(this.registeredNeurons).length} Lemon Seasons composite neurons with Core Combinator`,
      );
      return {
        synced: true,
        combinatorUrl: this.combinatorUrl,
        neurons: Object.values(this.registeredNeurons),
      };
    } catch (error) {
      this.combinatorSynced = false;
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.debug(`Core Combinator sync deferred (${this.combinatorUrl}): ${msg}`);
      return {
        synced: false,
        combinatorUrl: this.combinatorUrl,
        neurons: Object.values(this.registeredNeurons),
        error: msg,
      };
    }
  }

  @OnEvent('note.published')
  async handleNotePublished(event: NotePublishedEvent): Promise<void> {
    await this.emitTelemetry('dbGateway', event.isNew ? 'DB_NOTE_CREATED' : 'DB_NOTE_UPDATED', {
      noteId: event.noteId,
      title: event.title,
      feedId: event.feedId,
      status: event.status,
      hasImages: Array.isArray(event.payload?.images) && event.payload.images.length > 0,
    });
  }

  @OnEvent('note.deleted')
  async handleNoteDeleted(payload: any): Promise<void> {
    await this.emitTelemetry('dbGateway', 'DB_NOTE_DELETED', {
      noteId: payload?.noteId || payload?.id,
    });
  }

  @OnEvent('feed.created')
  @OnEvent('feed.updated')
  @OnEvent('stream.created')
  @OnEvent('stream.updated')
  async handleTopologyMutation(): Promise<void> {
    await this.emitTelemetry('topology', 'TOPOLOGY_DB_MUTATION', {
      revision: this.topologyService?.getCurrentRevision() ?? 1,
    });
  }

  async getGatewayStatus() {
    let dbConnected = false;
    let counts = { streams: 0, feeds: 0, notes: 0, noteImages: 0 };

    try {
      const [streams, feeds, notes, noteImages] = await Promise.all([
        this.prisma.stream.count({ where: { deletedAt: null } }),
        this.prisma.feed.count({ where: { deletedAt: null } }),
        this.prisma.note.count({ where: { deletedAt: null } }),
        this.prisma.noteImage.count(),
      ]);
      dbConnected = true;
      counts = { streams, feeds, notes, noteImages };
    } catch {
      dbConnected = false;
    }

    let mediaHubConnected = false;
    try {
      const res = await fetch(`${this.mediaHubUrl}/api/health`, {
        signal: AbortSignal.timeout(2500),
      });
      mediaHubConnected = res.ok;
    } catch {
      mediaHubConnected = false;
    }

    return {
      service: 'lemon-seasons-backend',
      database: {
        connected: dbConnected,
        provider: 'postgresql',
        counts,
      },
      topology: {
        revision: this.topologyService?.getCurrentRevision() ?? 1,
      },
      sse: this.eventsSseService?.getSubscriberStats() ?? { activeSubscribers: 0 },
      combinator: {
        url: this.combinatorUrl,
        synced: this.combinatorSynced,
        neurons: Object.values(this.registeredNeurons),
      },
      mediaHub: {
        url: this.mediaHubUrl,
        connected: mediaHubConnected,
      },
    };
  }

  private async emitTelemetry(
    channel: CombinatorNeuronSummary['key'],
    eventType: string,
    payload: Record<string, any>,
  ): Promise<void> {
    const neuron = this.registeredNeurons[channel];
    const flowId = neuron?.observerFlowId || neuron?.contextFlowId;
    if (!flowId) return;

    try {
      await this.combinatorRequest('POST', `/flows/${encodeURIComponent(flowId)}/events`, {
        eventType,
        source: 'lemon-seasons-backend',
        payload,
      });
    } catch {
      // Best-effort telemetry: never block database mutations
    }
  }

  private async combinatorRequest<T = any>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const res = await fetch(`${this.combinatorUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} on ${path}`);
    }
    return (await res.json()) as T;
  }
}
