import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import * as chokidar from 'chokidar';
import { PrismaService } from '../../prisma/prisma.service';
import { NotesService } from '../../notes/notes.service';
import { NotePublishedEvent } from '../../events';
import { BusEventEnvelope, NoteEventPayload } from '../interfaces/bus-event.interface';
import { CreateNoteDto } from '../../notes/dto/create-note.dto';

@Injectable()
export class DriveBusRelayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DriveBusRelayService.name);
  private readonly busDir: string;
  private readonly eventsDir: string;
  private readonly mediaDir: string;
  private readonly deviceId: string;
  private readonly watermarkFile: string;
  private watcher: chokidar.FSWatcher | null = null;
  private lastProcessedTimestamp: string | null = null;

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
      (process.env.GDRIVE_SYNC_FOLDER ? path.join(process.env.GDRIVE_SYNC_FOLDER, 'LemonBus') : null) ||
      path.join(os.homedir(), '.lemon', 'bus');

    this.eventsDir = path.join(this.busDir, 'events');
    this.mediaDir = path.join(this.busDir, 'media');
    this.watermarkFile = path.join(this.busDir, `.watermark_${this.deviceId}.json`);
  }

  async onModuleInit() {
    this.ensureDirectories();
    this.loadWatermark();
    await this.runCatchUpSync();
    this.startWatchingEvents();
  }

  async onModuleDestroy() {
    await this.stopWatchingEvents();
  }

  public getDeviceId(): string {
    return this.deviceId;
  }

  public getBusDirectory(): string {
    return this.busDir;
  }

  // ── 1. OUTBOUND: Публикация локального события в облачную шину ───────────────

  @OnEvent('note.published', { async: true })
  public async handleLocalNotePublished(event: NotePublishedEvent): Promise<void> {
    // Предотвращение эхо-петли: не публиковать обратно в шину то, что пришло из шины
    if (event.payload?.metadata?.isRemoteSync || event.payload?.isRemoteSync) {
      return;
    }

    try {
      const now = new Date();
      const timestampIso = now.toISOString();
      const safeTime = timestampIso.replace(/[:.]/g, '-');
      const safeNoteId = event.noteId.replace(/[^a-z0-9_-]/gi, '').slice(0, 12);
      const fileName = `${safeTime}_${this.deviceId}_${safeNoteId}.json`;
      const targetFilePath = path.join(this.eventsDir, fileName);

      const payload: NoteEventPayload = {
        id: event.noteId,
        title: event.title,
        folderPath: event.folderPath,
        status: (event.status || event.payload?.status || 'PUBLISHED') as any,
        publishAt: event.publishAt ? new Date(event.publishAt).toISOString() : null,
        feedId: event.feedId,
        fileHash: event.payload?.metadata?.fileHash || event.payload?.fileHash || null,
        externalId: event.payload?.externalId || null,
        summary: event.payload?.summary || null,
        type: event.payload?.type || 'SINGLE',
        startDate: event.payload?.startDate || timestampIso,
        endDate: event.payload?.endDate || null,
        sourceLink: event.payload?.sourceLink || null,
        sourceType: event.payload?.sourceType || 'GOOGLE_DRIVE',
        description: event.payload?.description || event.payload?.rawContent || null,
        icon: event.payload?.icon || null,
        tags: event.payload?.hashtags || [],
      };

      const envelope: BusEventEnvelope<NoteEventPayload> = {
        eventId: crypto.randomUUID(),
        timestamp: timestampIso,
        deviceId: this.deviceId,
        entityType: 'NOTE',
        action: 'UPSERT',
        payload,
      };

      await fs.promises.writeFile(targetFilePath, JSON.stringify(envelope, null, 2), 'utf-8');
      this.logger.log(`☁️ [DriveBus:OUT] Событие опубликовано в шину: "${fileName}" (ID: ${event.noteId})`);
    } catch (err: any) {
      this.logger.error(`❌ Ошибка записи события в Google Drive шину: ${err.message}`, err.stack);
    }
  }

  // ── 2. INBOUND: Прием событий из шины и накат в локальную базу ─────────────

  private startWatchingEvents(): void {
    if (this.watcher) return;

    this.logger.log(`👁️ [DriveBus] Слушатель входящих событий шины запущен в: ${this.eventsDir}`);

    this.watcher = chokidar.watch(this.eventsDir, {
      ignored: /(^|[\/\\])\../, // игнорировать скрытые файлы
      persistent: true,
      ignoreInitial: true, // initial catch-up делается через runCatchUpSync
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100,
      },
    });

    this.watcher
      .on('add', (filePath) => this.handleIncomingEventFile(filePath))
      .on('change', (filePath) => this.handleIncomingEventFile(filePath))
      .on('error', (err: any) => this.logger.error(`Ошибка наблюдателя шины: ${err?.message || err}`));
  }

  private async stopWatchingEvents(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
      this.logger.log('🛑 [DriveBus] Слушатель шины остановлен.');
    }
  }

  private async handleIncomingEventFile(filePath: string): Promise<void> {
    const fileName = path.basename(filePath);
    if (!fileName.toLowerCase().endsWith('.json') || fileName.startsWith('.')) return;

    // Игнорируем собственные события
    if (fileName.includes(`_${this.deviceId}_`)) {
      return;
    }

    try {
      const raw = await fs.promises.readFile(filePath, 'utf-8');
      const envelope: BusEventEnvelope = JSON.parse(raw);

      if (!envelope || !envelope.entityType || !envelope.payload) return;

      if (envelope.deviceId === this.deviceId) return;

      this.logger.log(`📥 [DriveBus:IN] Получено удаленное событие от "${envelope.deviceId}" [${envelope.action} ${envelope.entityType}]`);
      await this.applyEventToLocalDatabase(envelope);

      this.updateWatermark(envelope.timestamp);
    } catch (err: any) {
      this.logger.warn(`⚠️ Не удалось разобрать файл события "${fileName}": ${err.message}`);
    }
  }

  private async applyEventToLocalDatabase(envelope: BusEventEnvelope): Promise<void> {
    if (envelope.entityType !== 'NOTE') return;

    const payload: NoteEventPayload = envelope.payload;
    if (!payload || !payload.id) return;

    const existing = await this.prisma.note.findFirst({
      where: {
        OR: [
          { id: payload.id },
          ...(payload.externalId ? [{ externalId: payload.externalId }] : []),
        ],
        deletedAt: null,
      },
    });

    const noteDto: CreateNoteDto = {
      title: payload.title || 'Untitled Note',
      description: payload.description || undefined,
      type: (payload.type as any) || 'SINGLE',
      status: (payload.status as any) || 'PUBLISHED',
      publishAt: payload.publishAt || undefined,
      folderPath: payload.folderPath || undefined,
      startDate: payload.startDate || envelope.timestamp,
      endDate: payload.endDate || undefined,
      sourceLink: payload.sourceLink || undefined,
      sourceType: payload.sourceType || 'GOOGLE_DRIVE',
      externalId: payload.externalId || undefined,
      summary: payload.summary || undefined,
      icon: payload.icon || undefined,
      hashtags: payload.tags || [],
      folders: payload.folderPath ? [payload.folderPath] : undefined,
      metadata: {
        isRemoteSync: true,
        syncedFromDevice: envelope.deviceId,
        syncedEventId: envelope.eventId,
        syncedAt: new Date().toISOString(),
        fileHash: payload.fileHash,
      },
    };

    if (existing) {
      await this.notesService.update(existing.id, noteDto);
      this.logger.log(`🔄 [DriveBus] Локальная Note "${noteDto.title}" обновлена по событию шины`);
    } else {
      await this.notesService.create({
        ...noteDto,
        feedId: payload.feedId || undefined,
      });
      this.logger.log(`✨ [DriveBus] Локальная Note "${noteDto.title}" создана по событию шины`);
    }
  }

  // ── 3. CATCH-UP SYNC: Догоняющая синхронизация при старте ПК ───────────────

  public async runCatchUpSync(): Promise<{ processed: number; skipped: number }> {
    this.logger.log(`🔄 [DriveBus] Проверка очереди событий шины (Watermark: ${this.lastProcessedTimestamp || 'none'})...`);

    if (!fs.existsSync(this.eventsDir)) return { processed: 0, skipped: 0 };

    const files = await fs.promises.readdir(this.eventsDir);
    const jsonFiles = files
      .filter((f) => f.toLowerCase().endsWith('.json') && !f.startsWith('.'))
      .sort(); // Лексикографическая сортировка по дате в имени

    let processed = 0;
    let skipped = 0;

    for (const fileName of jsonFiles) {
      // Пропускаем собственные события
      if (fileName.includes(`_${this.deviceId}_`)) {
        skipped++;
        continue;
      }

      const filePath = path.join(this.eventsDir, fileName);
      try {
        const raw = await fs.promises.readFile(filePath, 'utf-8');
        const envelope: BusEventEnvelope = JSON.parse(raw);

        if (!envelope || envelope.deviceId === this.deviceId) {
          skipped++;
          continue;
        }

        // Если событие старше нашего водяного знака — пропускаем
        if (this.lastProcessedTimestamp && envelope.timestamp <= this.lastProcessedTimestamp) {
          skipped++;
          continue;
        }

        await this.applyEventToLocalDatabase(envelope);
        this.updateWatermark(envelope.timestamp);
        processed++;
      } catch (err: any) {
        this.logger.warn(`Ошибка обработки файла catch-up "${fileName}": ${err.message}`);
        skipped++;
      }
    }

    this.logger.log(`✅ [DriveBus] Catch-up завершен. Обработано новых: ${processed}, пропущено: ${skipped}`);
    return { processed, skipped };
  }

  // ── 4. DRV-03: Проверка шины перед парсингом (Check-Before-Ingest) ──────────

  /**
   * Проверяет, опубликовано ли уже событие для данного файла в шине другими машинами.
   */
  public async isFileAlreadyInBus(filePath: string, fileHash?: string): Promise<boolean> {
    if (!fs.existsSync(this.eventsDir)) return false;

    try {
      const files = await fs.promises.readdir(this.eventsDir);
      // Проверяем последние 200 событий
      const recent = files
        .filter((f) => f.toLowerCase().endsWith('.json') && !f.startsWith('.'))
        .sort()
        .slice(-200);

      const targetFileName = path.basename(filePath).toLowerCase();

      for (const f of recent) {
        const full = path.join(this.eventsDir, f);
        const text = await fs.promises.readFile(full, 'utf-8');
        if (text.toLowerCase().includes(targetFileName)) {
          if (!fileHash || text.includes(fileHash)) {
            return true;
          }
        }
      }
    } catch {
      return false;
    }

    return false;
  }

  // ── Водяной знак (Watermark) ────────────────────────────────────────────────

  private loadWatermark(): void {
    try {
      if (fs.existsSync(this.watermarkFile)) {
        const data = JSON.parse(fs.readFileSync(this.watermarkFile, 'utf-8'));
        this.lastProcessedTimestamp = data.lastProcessedTimestamp || null;
      }
    } catch {
      this.lastProcessedTimestamp = null;
    }
  }

  private updateWatermark(timestamp: string): void {
    if (!this.lastProcessedTimestamp || timestamp > this.lastProcessedTimestamp) {
      this.lastProcessedTimestamp = timestamp;
      try {
        fs.writeFileSync(
          this.watermarkFile,
          JSON.stringify({ deviceId: this.deviceId, lastProcessedTimestamp: this.lastProcessedTimestamp }, null, 2),
          'utf-8',
        );
      } catch (err: any) {
        this.logger.warn(`Не удалось сохранить watermark: ${err.message}`);
      }
    }
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.busDir)) fs.mkdirSync(this.busDir, { recursive: true });
    if (!fs.existsSync(this.eventsDir)) fs.mkdirSync(this.eventsDir, { recursive: true });
    if (!fs.existsSync(this.mediaDir)) fs.mkdirSync(this.mediaDir, { recursive: true });
  }
}
