import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import * as chokidar from 'chokidar';
import { PrismaService } from '../../prisma/prisma.service';
import { NotesService } from '../../notes/notes.service';
import { SparksParserService } from './sparks-parser.service';

export interface WatcherStatus {
  isWatching: boolean;
  watchedDir: string;
  filesProcessed: number;
  filesPending: number;
  filesFailed: number;
}

@Injectable()
export class DriveWatcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DriveWatcherService.name);
  private watcher: chokidar.FSWatcher | null = null;
  private readonly watchedDir: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notesService: NotesService,
    private readonly sparksParser: SparksParserService,
  ) {
    this.watchedDir =
      process.env.SPARKS_INCOMING_DIR ||
      (process.env.GDRIVE_SYNC_FOLDER ? path.join(process.env.GDRIVE_SYNC_FOLDER, 'Sparks') : null) ||
      path.join(os.homedir(), '.lemon', 'sparks-incoming');
  }

  async onModuleInit() {
    this.ensureDirectoryExists(this.watchedDir);
    this.startWatching();
  }

  async onModuleDestroy() {
    await this.stopWatching();
  }

  public getWatchedDirectory(): string {
    return this.watchedDir;
  }

  public async getStatus(): Promise<WatcherStatus> {
    const [completed, pending, failed] = await Promise.all([
      this.prisma.ingestionFile.count({ where: { status: 'COMPLETED' } }),
      this.prisma.ingestionFile.count({ where: { status: 'PENDING' } }),
      this.prisma.ingestionFile.count({ where: { status: 'FAILED' } }),
    ]);

    return {
      isWatching: Boolean(this.watcher),
      watchedDir: this.watchedDir,
      filesProcessed: completed,
      filesPending: pending,
      filesFailed: failed,
    };
  }

  /**
   * Starts monitoring the folder for incoming Gemini Sparks Markdown files.
   */
  public startWatching(): void {
    if (this.watcher) {
      return;
    }

    this.logger.log(`👁️ Запуск слушателя Gemini Sparks в папке: ${this.watchedDir}`);

    this.watcher = chokidar.watch(this.watchedDir, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: 600,
        pollInterval: 150,
      },
    });

    this.watcher
      .on('add', (filePath) => this.handleFileEvent('ADD', filePath))
      .on('change', (filePath) => this.handleFileEvent('CHANGE', filePath))
      .on('error', (error: any) => this.logger.error(`Ошибка файлового слушателя: ${error?.message || error}`));
  }

  public async stopWatching(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
      this.logger.log('🛑 Файловый слушатель Gemini Sparks остановлен.');
    }
  }

  /**
   * Processes an incoming or updated file through the 3-stage lifecycle:
   * 1. PENDING -> 2. PROCESSING -> 3. COMPLETED (or FAILED)
   */
  public async handleFileEvent(event: 'ADD' | 'CHANGE', rawFilePath: string): Promise<void> {
    const filePath = path.normalize(rawFilePath);
    const fileName = path.basename(filePath);

    if (!fileName.toLowerCase().endsWith('.md')) {
      return;
    }

    this.logger.log(`📥 [${event}] Обнаружен файл Gemini Spark: "${fileName}"`);

    try {
      const stats = await fs.promises.stat(filePath);
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const fileHash = crypto.createHash('sha256').update(content).digest('hex');

      // ── ЭТАП 1: PENDING ──────────────────────────────────────────────────
      const ingestionRecord = await this.prisma.ingestionFile.upsert({
        where: { filePath },
        create: {
          filePath,
          fileName,
          fileHash,
          fileSize: stats.size,
          mtime: stats.mtime,
          status: 'PENDING',
        },
        update: {
          fileHash,
          fileSize: stats.size,
          mtime: stats.mtime,
          status: 'PENDING',
          errorMessage: null,
        },
      });

      // Идемпотентность: если файл с таким хэшем уже успешно обработан и привязан к Note, пропускаем
      if (
        event === 'CHANGE' &&
        ingestionRecord.status === 'COMPLETED' &&
        ingestionRecord.fileHash === fileHash &&
        ingestionRecord.noteId
      ) {
        this.logger.debug(`⏩ Файл "${fileName}" без изменений по хэшу, пропускаем.`);
        return;
      }

      // ── ЭТАП 2: PROCESSING ───────────────────────────────────────────────
      await this.prisma.ingestionFile.update({
        where: { id: ingestionRecord.id },
        data: { status: 'PROCESSING' },
      });

      const parsed = this.sparksParser.parseSparkFile(filePath, content, {
        mtime: stats.mtime,
        size: stats.size,
      });

      // Обеспечиваем фид по умолчанию для новостей из Google Drive / Sparks
      let defaultFeed = await this.prisma.feed.findFirst({
        where: { slug: 'gdrive-news' },
      });

      if (!defaultFeed) {
        defaultFeed = await this.prisma.feed.findFirst();
        if (!defaultFeed) {
          defaultFeed = await this.prisma.feed.create({
            data: {
              title: 'Новости Google Drive',
              slug: 'gdrive-news',
              description: 'Автоматически импортированные новости и дайджесты из Google Drive',
            },
          });
        }
      }

      parsed.noteDto.feedId = parsed.noteDto.feedId || defaultFeed.id;

      let targetNoteId: string;

      if (ingestionRecord.noteId) {
        // Обновляем уже привязанную заметку
        const updated = await this.notesService.update(ingestionRecord.noteId, parsed.noteDto);
        targetNoteId = updated.id;
        this.logger.log(`🔄 Заметка "${updated.title}" обновлена по файлу: ${fileName}`);
      } else {
        // Создаем новую заметку
        const created = await this.notesService.create(parsed.noteDto);
        targetNoteId = created.id;
        this.logger.log(`✨ Создана новая карточка Note: "${created.title}" [id: ${created.id}]`);
      }

      // ── ЭТАП 3: COMPLETED ────────────────────────────────────────────────
      await this.prisma.ingestionFile.update({
        where: { id: ingestionRecord.id },
        data: {
          status: 'COMPLETED',
          noteId: targetNoteId,
          errorMessage: null,
        },
      });

      this.logger.log(`✅ [COMPLETED] Файл "${fileName}" успешно обработан и зафиксирован в БД.`);
    } catch (err: any) {
      this.logger.error(`❌ [FAILED] Ошибка обработки файла "${fileName}": ${err.message}`, err.stack);

      await this.prisma.ingestionFile
        .upsert({
          where: { filePath },
          create: {
            filePath,
            fileName,
            fileHash: 'error',
            mtime: new Date(),
            status: 'FAILED',
            errorMessage: err.message || String(err),
          },
          update: {
            status: 'FAILED',
            errorMessage: err.message || String(err),
          },
        })
        .catch(() => {});
    }
  }

  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      this.logger.log(`📁 Создана директория для входящих файлов Sparks: ${dirPath}`);
    }
  }
}
