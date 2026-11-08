import { Injectable, Logger, OnModuleInit, OnModuleDestroy, OnApplicationBootstrap } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import * as chokidar from 'chokidar';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { FileDetectedEvent } from '../../events';
import { toCanonicalSparkPath, WatcherInstanceLock } from '../utils/spark-path.util';

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
  private readonly instanceLock = new WatcherInstanceLock();
  private isStandby = false;

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
    const acquired = this.instanceLock.tryAcquire((holder) => {
      this.logger.warn(
        `⚠️ [SingleInstanceGuard] Активный слушатель уже запущен в другом инстансе (${holder.hostname}:${holder.port}, PID ${holder.pid}, ${holder.nodeEnv}). Переход в режим ожидания без дублирования файловых вотчеров.`,
      );
    });
    if (!acquired) {
      this.isStandby = true;
      return;
    }
    this.startWatching();
  }

  async onApplicationBootstrap() {
    if (this.isStandby) return;
    // Run an initial graceful sequential scan once all event listeners are ready
    this.scanDirectory().catch((err) => {
      this.logger.warn(`Ошибка при стартовом сканировании Sparks: ${err?.message}`);
    });
  }

  async onModuleDestroy() {
    this.instanceLock.release();
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
      ignored: (filePath: string, stats?: fs.Stats) => {
        const base = path.basename(filePath);
        if (base.startsWith('.')) return true;
        // Ignore non-markdown files to prevent thousands of unnecessary FSWatcher handles on cloud drives
        if (stats && !stats.isDirectory() && !base.toLowerCase().endsWith('.md')) {
          return true;
        }
        return false;
      },
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 1000,
        pollInterval: 300,
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
      const canonicalPath = toCanonicalSparkPath(filePath, this.watchedDir);

      // 1. Fast pre-check by mtime & size before reading file content over Google Drive FS
      let existingRecord = await this.prisma.ingestionFile.findUnique({
        where: { filePath: canonicalPath },
      });
      if (!existingRecord && canonicalPath !== filePath) {
        existingRecord = await this.prisma.ingestionFile.findUnique({
          where: { filePath },
        });
      }

      if (
        existingRecord &&
        existingRecord.status === 'COMPLETED' &&
        existingRecord.noteId &&
        existingRecord.fileSize === stats.size &&
        existingRecord.mtime &&
        Math.abs(new Date(existingRecord.mtime).getTime() - stats.mtime.getTime()) < 1000
      ) {
        return;
      }

      const content = await fs.promises.readFile(filePath, 'utf-8');
      const fileHash = crypto.createHash('sha256').update(content).digest('hex');

      // 2. Idempotency: check if file was already completed and unchanged by SHA-256 hash BEFORE setting to PENDING
      if (
        existingRecord &&
        existingRecord.status === 'COMPLETED' &&
        existingRecord.fileHash === fileHash &&
        existingRecord.noteId
      ) {
        this.logger.debug(`⏩ Файл "${fileName}" без изменений по хэшу и уже завершен, пропускаем.`);
        return;
      }

      // 2. Initial IngestionFile tracking (PENDING) for new or changed files using canonicalPath
      await this.prisma.ingestionFile.upsert({
        where: { filePath: canonicalPath },
        create: {
          filePath: canonicalPath,
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

      // 2. Emit event to EventBus (await async listeners so batch scans do not flood the DB connection pool)
      this.logger.log(`📢 [file.detected] Отправка события в шину: "${fileName}" [${assignedFolder}]`);
      await this.eventEmitter.emitAsync(
        'file.detected',
        new FileDetectedEvent(
          filePath,
          fileName,
          assignedFolder,
          fileHash,
          event,
          stats.mtime,
          stats.size,
          content,
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
    if (mdFiles.length === 0) return { scanned: 0 };

    // Preload completed IngestionFile records in a single query to avoid N+1 DB lookups on 1900+ files
    const completedMap = new Map<string, { fileSize: number; mtime: Date }>();
    try {
      if (typeof (this.prisma.ingestionFile as any)?.findMany === 'function') {
        const records = await this.prisma.ingestionFile.findMany({
          where: { status: 'COMPLETED', noteId: { not: null } },
          select: { filePath: true, fileSize: true, mtime: true },
        });
        for (const r of records) {
          const entry = {
            fileSize: r.fileSize,
            mtime: new Date(r.mtime),
          };
          completedMap.set(toCanonicalSparkPath(r.filePath, this.watchedDir), entry);
          completedMap.set(path.normalize(r.filePath), entry);
        }
      }
    } catch {
      // Fallback to individual checks if findMany fails
    }

    for (const fullPath of mdFiles) {
      const normalizedPath = path.normalize(fullPath);
      const canonicalPath = toCanonicalSparkPath(normalizedPath, this.watchedDir);
      const cached = completedMap.get(canonicalPath) || completedMap.get(normalizedPath);
      if (cached) {
        try {
          const stats = await fs.promises.stat(normalizedPath);
          if (
            cached.fileSize === stats.size &&
            Math.abs(cached.mtime.getTime() - stats.mtime.getTime()) < 1000
          ) {
            continue;
          }
        } catch {
          // Proceed to handleFileEvent if stat fails
        }
      }
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
