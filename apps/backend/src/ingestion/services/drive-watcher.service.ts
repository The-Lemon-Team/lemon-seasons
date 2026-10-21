import { Injectable, Logger, OnModuleInit, OnModuleDestroy, OnApplicationBootstrap } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import * as chokidar from 'chokidar';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { FileDetectedEvent } from '../../events';

export interface WatcherStatus {
  isWatching: boolean;
  watchedDir: string;
  filesProcessed: number;
  filesPending: number;
  filesFailed: number;
}

@Injectable()
export class DriveWatcherService implements OnModuleInit, OnModuleDestroy, OnApplicationBootstrap {
  private readonly logger = new Logger(DriveWatcherService.name);
  private watcher: chokidar.FSWatcher | null = null;
  private readonly watchedDir: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
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

  async onApplicationBootstrap() {
    // Run an initial graceful sequential scan once all event listeners are ready
    this.scanDirectory().catch((err) => {
      this.logger.warn(`Ошибка при стартовом сканировании Sparks: ${err?.message}`);
    });
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
      ignoreInitial: true,
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
   * Detects new or changed file, validates its hash and emits FileDetectedEvent onto the event bus.
   */
  public async handleFileEvent(event: 'ADD' | 'CHANGE', rawFilePath: string): Promise<void> {
    const filePath = path.normalize(rawFilePath);
    const fileName = path.basename(filePath);

    const lowerName = fileName.toLowerCase();
    if (!lowerName.endsWith('.md') || lowerName.includes('template') || fileName.startsWith('_') || lowerName.includes('config')) {
      return;
    }

    this.logger.log(`📥 [${event}] Обнаружен файл Gemini Spark: "${fileName}"`);

    try {
      const stats = await fs.promises.stat(filePath);
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const fileHash = crypto.createHash('sha256').update(content).digest('hex');

      // 1. Idempotency: check if file was already completed and unchanged BEFORE setting to PENDING
      const existingRecord = await this.prisma.ingestionFile.findUnique({
        where: { filePath },
      });

      if (
        existingRecord &&
        existingRecord.status === 'COMPLETED' &&
        existingRecord.fileHash === fileHash &&
        existingRecord.noteId
      ) {
        this.logger.debug(`⏩ Файл "${fileName}" без изменений по хэшу и уже завершен, пропускаем.`);
        return;
      }

      // 2. Initial IngestionFile tracking (PENDING) for new or changed files
      await this.prisma.ingestionFile.upsert({
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

      // Resolve assigned folder path (e.g. "Spark/AI" or "Spark/changelogsfeed/google")
      const relPath = path.relative(this.watchedDir, filePath);
      const relDir = path.dirname(relPath).replace(/\\/g, '/');
      const assignedFolder = relDir && relDir !== '.' ? `Spark/${relDir}` : 'Spark';

      // 2. Emit event to EventBus
      this.logger.log(`📢 [file.detected] Отправка события в шину: "${fileName}" [${assignedFolder}]`);
      this.eventEmitter.emit(
        'file.detected',
        new FileDetectedEvent(
          filePath,
          fileName,
          assignedFolder,
          fileHash,
          event,
          stats.mtime,
          stats.size,
        ),
      );
    } catch (err: any) {
      this.logger.error(`❌ Ошибка проверки файла "${fileName}": ${err.message}`, err.stack);
    }
  }

  /**
   * Recursively finds all .md files in the watched directory and all subdirectories.
   */
  private async findMarkdownFilesRecursive(dir: string): Promise<string[]> {
    if (!fs.existsSync(dir)) return [];
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    const results: string[] = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.')) {
          const subFiles = await this.findMarkdownFilesRecursive(fullPath);
          results.push(...subFiles);
        }
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
        results.push(fullPath);
      }
    }
    return results;
  }

  /**
   * Manually trigger re-scan of the watched directory and all nested topic folders.
   */
  public async scanDirectory(): Promise<{ scanned: number }> {
    this.ensureDirectoryExists(this.watchedDir);
    const mdFiles = await this.findMarkdownFilesRecursive(this.watchedDir);

    for (const fullPath of mdFiles) {
      await this.handleFileEvent('ADD', fullPath);
    }

    return { scanned: mdFiles.length };
  }

  /**
   * Helper to write a test Gemini Spark file for live UI verification.
   */
  public async createTestSparkFile(options?: {
    title?: string;
    summary?: string;
    content?: string;
    tags?: string[];
  }): Promise<{ filePath: string; fileName: string }> {
    this.ensureDirectoryExists(this.watchedDir);
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `spark-demo-${dateStr}.md`;
    const filePath = path.join(this.watchedDir, fileName);

    const title = options?.title || `Gemini Spark: Инсайт от ${new Date().toLocaleDateString('ru-RU')}`;
    const summary = options?.summary || 'Тестовый инсайт Gemini Spark для проверки конвейера обработки заметок.';
    const tags = options?.tags || ['gemini-spark', 'auto-ingest', 'test'];

    const mdContent = `---
title: "${title}"
start_date: "${new Date().toISOString()}"
type: "SINGLE"
tags:
${tags.map((t) => `  - ${t}`).join('\n')}
icon: "⚡"
summary: "${summary}"
---

# ${title}

${options?.content || 'Автоматически сгенерированный тестовый файл для проверки конвейера **DriveWatcher** и сохранения в базу данных Calendarium.'}

- Время генерации: \`${new Date().toISOString()}\`
- Источник: \`${fileName}\`
`;

    await fs.promises.writeFile(filePath, mdContent, 'utf-8');
    this.logger.log(`📝 Создан тестовый файл Spark: ${filePath}`);
    return { filePath, fileName };
  }

  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      this.logger.log(`📁 Создана директория для входящих файлов Sparks: ${dirPath}`);
    }
  }
}
