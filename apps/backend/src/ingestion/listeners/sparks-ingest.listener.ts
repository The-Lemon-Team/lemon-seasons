import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { NotesService } from '../../notes/notes.service';
import { SparksParserService } from '../services/sparks-parser.service';
import { RelatedNotesResolverService } from '../services/related-notes-resolver.service';
import { FileDetectedEvent, NotePublishedEvent } from '../../events';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DriveBusRelayService } from '../../bus/services/drive-bus-relay.service';

@Injectable()
export class SparksIngestListener {
  private readonly logger = new Logger(SparksIngestListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notesService: NotesService,
    private readonly sparksParser: SparksParserService,
    private readonly relatedNotesResolver: RelatedNotesResolverService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(forwardRef(() => DriveBusRelayService))
    private readonly driveBusRelay: DriveBusRelayService,
  ) {}

  @OnEvent('file.detected', { async: true })
  public async handleFileDetected(event: FileDetectedEvent): Promise<void> {
    const { filePath, fileName, folderPath, fileHash, eventType, mtime, size } = event;

    // Only process Markdown files from Spark folders or root
    const lowerName = fileName.toLowerCase();
    if (!lowerName.endsWith('.md') || lowerName.includes('template') || fileName.startsWith('_') || lowerName.includes('config')) {
      return;
    }

    // 1. DRV-03: Jitter on secondary PC to give primary PC priority
    const jitterMs = parseInt(process.env.INGESTION_JITTER_MS || '0', 10);
    if (jitterMs > 0) {
      this.logger.debug(`⏳ [DRV-03] Применение jitter ${jitterMs}ms перед обработкой "${fileName}"...`);
      await new Promise((resolve) => setTimeout(resolve, jitterMs));
    }

    // 2. DRV-03: Check if file was already ingested by another PC into the cloud bus
    const alreadyInBus = await this.driveBusRelay.isFileAlreadyInBus(filePath, fileHash);
    if (alreadyInBus) {
      this.logger.log(`⏩ [DRV-03:SKIP] Файл "${fileName}" уже обработан другой машиной в шине. Пропускаем.`);
      await this.prisma.ingestionFile
        .update({
          where: { filePath },
          data: {
            status: 'COMPLETED',
            errorMessage: null,
          },
        })
        .catch(() => {});
      return;
    }

    this.logger.log(`⚡ [SparksIngestListener] Принято событие шины для "${fileName}" [${folderPath}]`);

    try {
      // 3. Mark file as PROCESSING in IngestionFile
      const ingestionRecord = await this.prisma.ingestionFile.upsert({
        where: { filePath },
        create: {
          filePath,
          fileName,
          fileHash,
          fileSize: size,
          mtime,
          status: 'PROCESSING',
        },
        update: {
          status: 'PROCESSING',
          errorMessage: null,
        },
      });

      // 2. Read content and parse via SparksParserService
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const parsed = this.sparksParser.parseSparkFile(filePath, content, {
        mtime,
        size,
      });

      // 3. Folder assignment
      parsed.noteDto.folders = [folderPath];
      parsed.noteDto.folderPath = folderPath;
      parsed.noteDto.metadata = {
        ...(parsed.noteDto.metadata || {}),
        fileHash,
      };

      // 4. Resolve Target Feed (or auto-provision feed for folder)
      const targetFeed = await this.resolveFeedForFolder(folderPath, filePath, parsed.noteDto.metadata?.feedSlug);
      if (targetFeed) {
        parsed.noteDto.feedId = parsed.noteDto.feedId || targetFeed.id;
      }

      // 5. Create or Update Note in Database
      let targetNoteId: string;
      let isNew = false;
      let resultingNote: any;

      if (ingestionRecord.noteId) {
        resultingNote = await this.notesService.update(ingestionRecord.noteId, parsed.noteDto);
        targetNoteId = resultingNote.id;
        this.logger.log(`🔄 Заметка "${resultingNote.title}" обновлена по событию шины`);
      } else {
        // Idempotency check: check if note already exists by externalId
        const existingByExt = await this.prisma.note.findFirst({
          where: { externalId: filePath, deletedAt: null },
        });

        if (existingByExt) {
          resultingNote = await this.notesService.update(existingByExt.id, parsed.noteDto);
          targetNoteId = resultingNote.id;
          this.logger.log(`🔄 Идемпотентное обновление заметки "${resultingNote.title}" (externalId: ${filePath})`);
        } else {
          resultingNote = await this.notesService.create(parsed.noteDto);
          targetNoteId = resultingNote.id;
          isNew = true;
          this.logger.log(`✨ Создана новая Note "${resultingNote.title}" [id: ${resultingNote.id}]`);
        }
      }

      // 5.5 Resolve related wikilinks and note dependencies
      try {
        const resolveRes = await this.relatedNotesResolver.resolveNoteRelatedLinks(targetNoteId);
        if (resolveRes.totalCount > 0) {
          this.logger.log(`🔗 [SparksIngestListener] Перелинковка для "${resultingNote.title}": разрезолвлено ${resolveRes.resolvedCount}/${resolveRes.totalCount}`);
        }
      } catch (relErr: any) {
        this.logger.warn(`⚠️ Не удалось разрезолвить связи для заметки ${targetNoteId}: ${relErr?.message}`);
      }

      // 6. Mark IngestionFile as COMPLETED
      await this.prisma.ingestionFile.update({
        where: { id: ingestionRecord.id },
        data: {
          status: 'COMPLETED',
          noteId: targetNoteId,
          errorMessage: null,
        },
      });

      // 7. Emit note.published event onto the Event Bus
      this.eventEmitter.emit(
        'note.published',
        new NotePublishedEvent(
          targetNoteId,
          resultingNote.title,
          folderPath,
          resultingNote.status || 'PUBLISHED',
          resultingNote.publishAt,
          resultingNote.feedId,
          isNew,
          resultingNote,
        ),
      );

      this.logger.log(`📢 [note.published] Опубликовано событие в шину для Note ID: ${targetNoteId}`);
    } catch (err: any) {
      this.logger.error(`❌ Ошибка обработки файла в SparksIngestListener: ${err.message}`, err.stack);
      await this.prisma.ingestionFile
        .update({
          where: { filePath },
          data: {
            status: 'FAILED',
            errorMessage: err.message || String(err),
          },
        })
        .catch(() => {});
    }
  }

  private async resolveFeedForFolder(folderPath: string, filePath: string, frontmatterFeed?: string) {
    const parts = folderPath.split('/');
    const subfolder = parts.length > 1 ? parts[1] : (parts[0] || 'AI');

    let targetSlug = 'spark-general';
    let targetTitle = 'Spark — Общая лента';
    let targetDesc = 'Автоматически импортированные новости и дайджесты из Google Drive';

    if (subfolder && subfolder.toLowerCase() !== 'spark') {
      const lowerFolder = subfolder.toLowerCase();
      targetSlug = `spark-${lowerFolder.replace(/[^a-z0-9а-яё]/gi, '-')}`;
      targetTitle = `${subfolder} (Spark)`;
      targetDesc = `Тематическая новостная лента по категории ${subfolder} от Spark`;
    } else if (frontmatterFeed && frontmatterFeed !== 'news') {
      targetSlug = `spark-${frontmatterFeed.toLowerCase()}`;
      targetTitle = `Spark — ${frontmatterFeed}`;
    }

    let feed = await this.prisma.feed.findUnique({
      where: { slug: targetSlug },
    });

    if (!feed) {
      try {
        feed = await this.prisma.feed.create({
          data: {
            slug: targetSlug,
            title: targetTitle,
            description: targetDesc,
            folderPaths: [folderPath],
          },
        });
        this.logger.log(`📢 Автоматически создана лента новостей: "${targetTitle}" [slug: ${targetSlug}]`);
      } catch {
        feed = await this.prisma.feed.findUnique({ where: { slug: targetSlug } });
      }
    } else if (feed && (!feed.folderPaths || !feed.folderPaths.includes(folderPath))) {
      // Ensure folderPath is linked to feed
      feed = await this.prisma.feed.update({
        where: { id: feed.id },
        data: {
          folderPaths: Array.from(new Set([...(feed.folderPaths || []), folderPath])),
        },
      });
    }

    return feed;
  }
}
