import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Subscription } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  BusCursor,
  createLemonBusTransport,
  ILemonBusTransport,
  LemonBusEnvelope,
  LemonBusNotePayload,
  NoteOrigin,
} from '@lenta/lemon-bus';
import { PrismaService } from '../../prisma/prisma.service';
import { NotesService } from '../../notes/notes.service';
import { NotePublishedEvent } from '../../events';
import { CreateNoteDto } from '../../notes/dto/create-note.dto';

@Injectable()
export class DriveBusRelayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DriveBusRelayService.name);
  private readonly busDir: string;
  private readonly eventsDir: string;
  private readonly mediaDir: string;
  private readonly deviceId: string;
  private readonly transport: ILemonBusTransport;
  private busSub: Subscription | null = null;
  private cursor: BusCursor = {};
  private watching = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notesService: NotesService,
  ) {
    this.deviceId =
      process.env.DEVICE_ID ||
      os.hostname().toLowerCase().replace(/[^a-z0-9_-]/g, '-') ||
      'pc-node';

    this.busDir =
      process.env.LEMON_BUS_DIR ||
      (process.env.GDRIVE_SYNC_FOLDER
        ? path.join(process.env.GDRIVE_SYNC_FOLDER, 'LemonBus')
        : null) ||
      path.join(os.homedir(), '.lemon', 'bus');

    this.eventsDir = path.join(this.busDir, 'events');
    this.mediaDir = path.join(this.busDir, 'media');

    this.transport = createLemonBusTransport({
      deviceId: this.deviceId,
      busDir: this.busDir,
    });
  }

  async onModuleInit() {
    this.ensureDirectories();
    try {
      await this.transport.start();
      this.watching = true;
      this.busSub = this.transport
        .subscribe({ entityTypes: ['NOTE'], excludeDeviceId: this.deviceId })
        .subscribe((envelope) => {
          this.applyEventToLocalDatabase(envelope).catch((err) =>
            this.logger.warn(`Failed to apply bus event ${envelope.eventId}: ${err?.message}`),
          );
        });
      this.runCatchUpSync().catch((err) =>
        this.logger.warn(`Catch-up warning: ${err?.message}`),
      );
    } catch (err: any) {
      this.logger.warn(`LemonBus transport init warning: ${err?.message}`);
    }
  }

  async onModuleDestroy() {
    this.watching = false;
    if (this.busSub) {
      this.busSub.unsubscribe();
      this.busSub = null;
    }
    await this.transport.stop();
  }

  public getDeviceId(): string {
    return this.deviceId;
  }

  public getDriverKind(): string {
    return this.transport.driver;
  }

  public getBusDirectory(): string {
    return this.busDir;
  }

  public getEventsDirectory(): string {
    return this.eventsDir;
  }

  public isWatching(): boolean {
    return this.watching;
  }

  public async getTransportStatus() {
    return this.transport.getStatus();
  }

  public async queryEvents(query: any) {
    return this.transport.queryEvents(query);
  }

  public async purgeExpiredBuffer(retentionDays = 30) {
    if (this.transport.purgeExpiredRecords) {
      return this.transport.purgeExpiredRecords(retentionDays);
    }
    return { purgedEvents: 0, purgedSparkDocs: 0 };
  }

  // ── 1. OUTBOUND: Публикация локального события в шину @lenta/lemon-bus ──────

  @OnEvent('note.published', { async: true })
  public async handleLocalNotePublished(event: NotePublishedEvent): Promise<void> {
    if (event.payload?.metadata?.isRemoteSync || event.payload?.isRemoteSync) {
      return;
    }

    try {
      const p = event.payload || {};
      const origin: NoteOrigin =
        p.metadata?.origin ||
        (p.sourceType === 'GOOGLE_DRIVE'
          ? 'GDRIVE_SPARK'
          : p.sourceType === 'NEURON_PARTY'
            ? 'NEURON_PARTY'
            : p.sourceType === 'CODING_AGENT'
              ? 'CODING_AGENT'
              : 'DIRECT_UI');

      const hashtags: string[] = Array.isArray(p.hashtags)
        ? p.hashtags
            .map((h: any) => (typeof h === 'string' ? h : h?.name))
            .filter(Boolean)
        : [];

      const payload: LemonBusNotePayload = {
        id: event.noteId,
        externalId: p.externalId || null,
        parentNoteId: p.parentNoteId || null,
        title: event.title,
        description: p.description || p.rawContent || null,
        summary: p.summary || null,
        type: p.type || 'SINGLE',
        status: (event.status || p.status || 'PUBLISHED') as any,
        privacy: p.privacy === 'public' ? 'public' : 'private',
        publishAt: event.publishAt ? new Date(event.publishAt).toISOString() : null,
        startDate: p.startDate ? new Date(p.startDate).toISOString() : new Date().toISOString(),
        endDate: p.endDate ? new Date(p.endDate).toISOString() : null,
        folderPath: event.folderPath || p.folderPath || null,
        feedId: event.feedId || p.feedId || null,
        feedSlug: p.feed?.slug || null,
        author: p.author || null,
        icon: p.icon || null,
        sourceLink: p.sourceLink || null,
        sourceType: p.sourceType || origin,
        origin,
        hashtags,
        fileHash: p.metadata?.fileHash || p.fileHash || null,
        provenance: {
          origin,
          fileHash: p.metadata?.fileHash || null,
          canonicalPath: p.folderPath || null,
          transportVia: this.transport.driver,
          deviceId: this.deviceId,
          actorId: p.author || null,
        },
        metadata: p.metadata || {},
      };

      await this.transport.publish({
        entityType: 'NOTE',
        action: 'UPSERT',
        streamSlug: p.metadata?.streamSlug || null,
        feedSlug: p.feed?.slug || null,
        privacy: payload.privacy,
        origin,
        payload,
      });

      this.logger.log(
        `☁️ [LemonBus:${this.transport.driver}:OUT] Note "${event.title}" published (origin=${origin}, id=${event.noteId})`,
      );
    } catch (err: any) {
      this.logger.error(`❌ Ошибка публикации в LemonBus: ${err.message}`, err.stack);
    }
  }

  @OnEvent('note.deleted', { async: true })
  public async handleLocalNoteDeleted(data: { noteId: string; previousState?: any }): Promise<void> {
    if (data.previousState?.metadata?.isRemoteSync) return;
    try {
      await this.transport.publish({
        entityType: 'NOTE',
        action: 'DELETE',
        feedSlug: data.previousState?.feed?.slug || null,
        privacy: data.previousState?.privacy === 'public' ? 'public' : 'private',
        origin: 'DIRECT_API',
        payload: {
          id: data.noteId,
          title: data.previousState?.title || 'Deleted Note',
          type: 'SINGLE',
          status: 'ARCHIVED',
          privacy: data.previousState?.privacy === 'public' ? 'public' : 'private',
          startDate: new Date().toISOString(),
          origin: 'DIRECT_API',
          hashtags: [],
          provenance: {
            origin: 'DIRECT_API',
            transportVia: this.transport.driver,
            deviceId: this.deviceId,
          },
        } satisfies LemonBusNotePayload,
      });
    } catch (err: any) {
      this.logger.warn(`Failed to publish DELETE to LemonBus: ${err?.message}`);
    }
  }

  // ── 2. INBOUND: Накат событий из @lenta/lemon-bus в локальную БД ───────────

  public async applyEventToLocalDatabase(
    envelope: LemonBusEnvelope<LemonBusNotePayload>,
  ): Promise<void> {
    if (envelope.entityType !== 'NOTE' || !envelope.payload?.id) return;
    if (envelope.deviceId === this.deviceId) return;

    const payload = envelope.payload;

    // Ignore candidate/unapproved events from moderation queue
    if (
      envelope.action === 'PROPOSE' ||
      (envelope.action as string) === 'REJECT' ||
      payload.status === 'PENDING_MODERATION' ||
      payload.status === 'PENDING'
    ) {
      return;
    }

    if (envelope.action === 'DELETE') {
      const existingToDelete = await this.prisma.note.findFirst({
        where: { id: payload.id, deletedAt: null },
      });
      if (existingToDelete) {
        await this.notesService.softDelete(existingToDelete.id);
      }
      return;
    }

    const extFileName = payload.externalId ? path.basename(payload.externalId) : null;
    const existing = await this.prisma.note.findFirst({
      where: {
        OR: [
          { id: payload.id },
          ...(payload.externalId ? [{ externalId: payload.externalId }] : []),
          ...(extFileName && payload.folderPath
            ? [
                {
                  folderPath: payload.folderPath,
                  externalId: { endsWith: extFileName, mode: 'insensitive' as const },
                },
              ]
            : []),
        ],
        deletedAt: null,
      },
    });

    const existingHash = (existing?.metadata as any)?.fileHash;
    if (existing && payload.fileHash && existingHash && existingHash === payload.fileHash) {
      return;
    }

    // Preserve true origin instead of overwriting everything with GOOGLE_DRIVE!
    const preservedOrigin: NoteOrigin =
      payload.provenance?.origin ||
      payload.origin ||
      envelope.origin ||
      (payload.sourceType === 'GOOGLE_DRIVE' ? 'GDRIVE_SPARK' : 'DIRECT_API');

    const preservedSourceType =
      payload.sourceType ||
      (preservedOrigin === 'GDRIVE_SPARK' || preservedOrigin === 'SUPABASE_SPARK'
        ? 'GOOGLE_DRIVE'
        : preservedOrigin);

    const rawTags = Array.isArray(payload.hashtags)
      ? payload.hashtags
          .map((t: any) => (typeof t === 'string' ? t : t?.name))
          .filter(Boolean)
      : Array.isArray((payload as any).tags)
        ? (payload as any).tags
            .map((t: any) => (typeof t === 'string' ? t : t?.name))
            .filter(Boolean)
        : [];

    let contentDescription = payload.description || payload.rawContent;
    if (!contentDescription && payload.externalId && this.transport.fetchNoteContent) {
      contentDescription = await this.transport
        .fetchNoteContent({ canonicalPath: payload.externalId, externalId: payload.externalId })
        .catch(() => null);
    }

    const noteDto: CreateNoteDto = {
      title: payload.title || 'Untitled Note',
      description: contentDescription || undefined,
      type: (payload.type as any) || 'SINGLE',
      status: (payload.status as any) || 'PUBLISHED',
      privacy: payload.privacy === 'public' ? 'public' : 'private',
      publishAt: payload.publishAt || undefined,
      folderPath: payload.folderPath || undefined,
      startDate: payload.startDate || envelope.timestamp,
      endDate: payload.endDate || undefined,
      sourceLink: payload.sourceLink || undefined,
      sourceType: preservedSourceType,
      origin: preservedOrigin,
      externalId: payload.externalId || undefined,
      summary: payload.summary || undefined,
      author: payload.author || undefined,
      parentNoteId: payload.parentNoteId || undefined,
      icon: payload.icon || undefined,
      hashtags: rawTags,
      folders: payload.folderPath ? [payload.folderPath] : undefined,
      feedId: payload.feedId || undefined,
      feedSlug: payload.feedSlug || envelope.feedSlug || undefined,
      metadata: {
        ...(payload.metadata || {}),
        origin: preservedOrigin,
        provenance: payload.provenance,
        isRemoteSync: true,
        syncedFromDevice: envelope.deviceId,
        syncedEventId: envelope.eventId,
        syncedViaDriver: this.transport.driver,
        syncedAt: new Date().toISOString(),
        fileHash: payload.fileHash,
      },
    };

    if (existing) {
      await this.notesService.update(existing.id, noteDto);
      this.logger.log(
        `🔄 [LemonBus:IN] Note "${noteDto.title}" updated (origin=${preservedOrigin})`,
      );
    } else {
      await this.notesService.create(noteDto);
      this.logger.log(
        `✨ [LemonBus:IN] Note "${noteDto.title}" created (origin=${preservedOrigin})`,
      );
    }
  }

  // ── 3. CATCH-UP SYNC & CLOUD SPARK DOCUMENT PUBLISH ────────────────────────

  public async runCatchUpSync(): Promise<{ processed: number; skipped: number }> {
    const pulled = await this.transport.pullSince(this.cursor, 200);
    let processed = 0;
    let skipped = 0;

    for (const envelope of pulled.items) {
      if (envelope.deviceId === this.deviceId) {
        skipped++;
        continue;
      }
      await this.applyEventToLocalDatabase(envelope);
      processed++;
    }

    this.cursor = pulled.nextCursor;
    if (processed > 0) {
      await this.transport.acknowledgeCursor(this.cursor);
    }

    return { processed, skipped };
  }

  /**
   * Publishes a Markdown Spark file directly into the active LemonBus transport
   * (e.g. Supabase `lemon_spark_documents` or Hybrid) and ingests it locally.
   */
  public async publishSparkDocument(input: {
    relativePath: string;
    rawMarkdown: string;
    origin?: 'SUPABASE_SPARK' | 'GDRIVE_SPARK';
  }) {
    const envelope = await this.transport.publishSparkDocument({
      virtualPath: input.relativePath,
      contentMarkdown: input.rawMarkdown,
      origin: input.origin || 'SUPABASE_SPARK',
    });

    await this.applyEventToLocalDatabase({
      ...envelope,
      deviceId: `${this.deviceId}:spark`,
    });
    return envelope;
  }

  public async isFileAlreadyInBus(_filePath: string, fileHash?: string): Promise<boolean> {
    if (!fileHash) return false;
    return this.transport.hasContentHash(fileHash);
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.busDir)) fs.mkdirSync(this.busDir, { recursive: true });
    if (!fs.existsSync(this.eventsDir)) fs.mkdirSync(this.eventsDir, { recursive: true });
    if (!fs.existsSync(this.mediaDir)) fs.mkdirSync(this.mediaDir, { recursive: true });
  }
}
