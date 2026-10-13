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

    const lowerName = fileName.toLowerCase();
    if (!lowerName.endsWith('.md') || lowerName.includes('template') || fileName.startsWith('_') || lowerName.includes('config')) {
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

      // Smart Feed Resolution:
      // Map folder (spark/AI, spark/Habr, etc.) to dedicated thematic feeds
      const targetFeed = await this.resolveFeedForFile(filePath, parsed.noteDto.metadata?.feedSlug);
      parsed.noteDto.feedId = parsed.noteDto.feedId || targetFeed.id;

      // Assign folder taxonomy for Obsidian / folder navigation (e.g. "Spark/AI" or "Spark/Habr")
      const relPath = path.relative(this.watchedDir, filePath);
      const parts = relPath.split(path.sep);
      if (parts.length > 1) {
        parsed.noteDto.folders = [`Spark/${parts[0]}`];
      } else {
        parsed.noteDto.folders = ['Spark'];
      }

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

  /**
   * Resolves or automatically provisions a thematic Feed based on subfolder (AI, Habr, etc.)
   */
  private async resolveFeedForFile(filePath: string, frontmatterFeed?: string) {
    const rel = path.relative(this.watchedDir, filePath);
    const relParts = rel.split(path.sep);
    const subfolder = relParts.length > 1 ? relParts[0] : null;

    let targetSlug = 'spark-general';
    let targetTitle = 'Spark — Общая лента';
    let targetDesc = 'Автоматически импортированные новости и дайджесты из Google Drive';

    if (subfolder) {
      const lowerFolder = subfolder.toLowerCase();
      targetSlug = `spark-${lowerFolder.replace(/[^a-z0-9а-яё]/gi, '-')}`;
      targetTitle = `${subfolder} (Spark)`;
      targetDesc = `Тематическая новостная лента по категории ${subfolder} от Spark`;

      const channelConfigPath = path.join(this.watchedDir, subfolder, '_channel.md');
      if (fs.existsSync(channelConfigPath)) {
        try {
          const rawContent = fs.readFileSync(channelConfigPath, 'utf-8');
          const fmMatch = rawContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
          if (fmMatch) {
            const yamlLines = fmMatch[1].split(/\r?\n/);
            for (const line of yamlLines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('title:')) {
                targetTitle = trimmed.replace(/^title:\s*["']?/, '').replace(/["']?$/, '').trim() || targetTitle;
              } else if (trimmed.startsWith('slug:')) {
                targetSlug = trimmed.replace(/^slug:\s*["']?/, '').replace(/["']?$/, '').trim() || targetSlug;
              } else if (trimmed.startsWith('description:')) {
                targetDesc = trimmed.replace(/^description:\s*["']?/, '').replace(/["']?$/, '').trim() || targetDesc;
              }
            }
          }
        } catch (e: any) {
          this.logger.warn(`Не удалось прочитать конфигурацию канала ${channelConfigPath}: ${e.message}`);
        }
      }
    } else if (frontmatterFeed && frontmatterFeed !== 'news') {
      targetSlug = `spark-${frontmatterFeed.toLowerCase()}`;
      targetTitle = `Spark — ${frontmatterFeed}`;
    }

    let feed = await this.prisma.feed.findUnique({
      where: { slug: targetSlug },
    });

    if (!feed) {
      feed = await this.prisma.feed.create({
        data: {
          slug: targetSlug,
          title: targetTitle,
          description: targetDesc,
        },
      });
      this.logger.log(`📢 Автоматически создана лента новостей: "${targetTitle}" [slug: ${targetSlug}]`);
    }

    return feed;
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

