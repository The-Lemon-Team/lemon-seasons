import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as crypto from 'node:crypto';
import * as chokidar from 'chokidar';
import { BusDatabase } from './db.js';
import { SseManager } from './sse.js';
import type { UpstreamBusRelay } from './upstream-relay.js';
import { parseSparkMarkdown } from '../sparks/markdown-frontmatter.util.js';
import {
  computeContentSha256,
  normalizeCanonicalSparkPath,
  processSparkDocument,
} from '../sparks/spark-document.processor.js';
import { LemonBusEnvelope, LemonBusNotePayload } from '../types/bus-contract.types.js';

export interface LocalSparksWatcherOptions {
  watchedDir?: string;
  deviceId?: string;
  db: BusDatabase;
  sse: SseManager;
  upstreamRelay?: UpstreamBusRelay;
  scanOnStart?: boolean;
}

export interface LocalWatcherStatus {
  isWatching: boolean;
  watchedDir: string;
  filesProcessed: number;
  filesPending: number;
  filesFailed: number;
}

export function resolveDefaultSparksDir(explicitDir?: string): string {
  if (explicitDir && explicitDir.trim()) {
    return explicitDir.trim();
  }
  if (process.env.SPARKS_INCOMING_DIR && process.env.SPARKS_INCOMING_DIR.trim()) {
    return process.env.SPARKS_INCOMING_DIR.trim();
  }
  if (process.env.GDRIVE_SYNC_FOLDER && process.env.GDRIVE_SYNC_FOLDER.trim()) {
    const upper = path.join(process.env.GDRIVE_SYNC_FOLDER.trim(), 'Sparks');
    const lower = path.join(process.env.GDRIVE_SYNC_FOLDER.trim(), 'spark');
    if (fs.existsSync(lower) && !fs.existsSync(upper)) {
      return lower;
    }
    return upper;
  }
  return path.join(os.homedir(), '.lemon', 'sparks-incoming');
}

/**
 * Local filesystem Spark Markdown watcher living inside `@lenta/lemon-bus`.
 * Replaces backend-coupled Chokidar watchers by normalizing `.md` files into
 * Claim Check (`lemon_spark_documents`) and Hot Stack (`lemon_bus_events`) + SSE.
 */
export class LocalSparksWatcher {
  public readonly watchedDir: string;
  private readonly deviceId: string;
  private readonly db: BusDatabase;
  private readonly sse: SseManager;
  private readonly upstreamRelay?: UpstreamBusRelay;
  private readonly scanOnStart: boolean;

  private watcher: chokidar.FSWatcher | null = null;
  private running = false;
  private scanning = false;
  private filesPending = 0;
  private filesFailed = 0;
  private queue: Promise<void> = Promise.resolve();

  constructor(options: LocalSparksWatcherOptions) {
    this.watchedDir = resolveDefaultSparksDir(options.watchedDir);
    this.deviceId = options.deviceId || process.env.DEVICE_ID || 'local-sparks-watcher';
    this.db = options.db;
    this.sse = options.sse;
    this.upstreamRelay = options.upstreamRelay;
    this.scanOnStart = options.scanOnStart !== false;
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.ensureDirectoryExists(this.watchedDir);
    this.running = true;

    this.watcher = chokidar.watch(this.watchedDir, {
      ignored: /(^|[\/\\])\../,
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 800,
        pollInterval: 250,
      },
    });

    this.watcher
      .on('add', (filePath) => this.enqueueFile(filePath))
      .on('change', (filePath) => this.enqueueFile(filePath));

    console.log(`[LemonBus:LocalWatcher] Watching local Sparks folder: ${this.watchedDir}`);

    if (this.scanOnStart) {
      await this.scanDirectory();
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
    await this.queue.catch(() => {});
  }

  public getStatus(): LocalWatcherStatus {
    const stats = this.db.getStats();
    return {
      isWatching: this.running && Boolean(this.watcher),
      watchedDir: this.watchedDir,
      filesProcessed: stats.totalSparks,
      filesPending: this.filesPending,
      filesFailed: this.filesFailed,
    };
  }

  public async scanDirectory(): Promise<{ scanned: number; ingested: number }> {
    if (this.scanning) {
      return { scanned: 0, ingested: 0 };
    }
    this.scanning = true;
    let scanned = 0;
    let ingested = 0;

    try {
      this.ensureDirectoryExists(this.watchedDir);
      const mdFiles = await this.findMarkdownFilesRecursive(this.watchedDir);
      scanned = mdFiles.length;

      for (const fullPath of mdFiles) {
        if (!this.running && this.watcher !== null) break;
        const ok = await this.ingestLocalFile(fullPath);
        if (ok) ingested++;
      }

      if (ingested > 0) {
        console.log(
          `[LemonBus:LocalWatcher] Initial/manual scan completed: scanned=${scanned}, ingested=${ingested}`,
        );
      }
      return { scanned, ingested };
    } finally {
      this.scanning = false;
    }
  }

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

    const title =
      options?.title || `Gemini Spark: Инсайт от ${new Date().toLocaleDateString('ru-RU')}`;
    const summary =
      options?.summary || 'Тестовый инсайт Gemini Spark для проверки конвейера LemonBus.';
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

${options?.content || 'Автоматически сгенерированный тестовый файл для проверки конвейера **LemonBus LocalSparksWatcher**.'}

- Время генерации: \`${new Date().toISOString()}\`
- Источник: \`${fileName}\`
`;

    await fs.promises.writeFile(filePath, mdContent, 'utf-8');
    await this.ingestLocalFile(filePath);
    return { filePath, fileName };
  }

  public async ingestLocalFile(filePath: string): Promise<boolean> {
    if (!this.isSparkMarkdownFile(filePath)) {
      return false;
    }

    this.filesPending++;
    try {
      const stats = await fs.promises.stat(filePath);
      const rel = path.relative(this.watchedDir, filePath).replace(/\\/g, '/');
      const virtualPath = rel.toLowerCase().startsWith('spark/') ? rel : `Spark/${rel}`;
      const { canonicalPath } = normalizeCanonicalSparkPath(virtualPath);

      const existingDoc = this.db.getSparkDocument(canonicalPath);
      const contentMarkdown = await fs.promises.readFile(filePath, 'utf-8');
      const contentHash = computeContentSha256(contentMarkdown);

      if (existingDoc && existingDoc.contentHash === contentHash) {
        return false;
      }
      if (!existingDoc && this.db.hasSparkDocumentByHash(contentHash)) {
        return false;
      }

      const channelOverride = await this.readChannelOverride(path.dirname(filePath));
      const processed = processSparkDocument({
        virtualPath,
        contentMarkdown,
        origin: 'GDRIVE_SPARK',
        channelOverride,
        mtime: stats.mtime,
        fileSize: stats.size,
      });

      this.db.upsertSparkDocument({
        id: processed.notePayload.id,
        canonicalPath: processed.canonicalPath,
        fileName: processed.fileName,
        folderPath: processed.folderPath,
        feedSlug: processed.feedTarget.slug,
        title: processed.frontmatter.title || processed.notePayload.title,
        contentMarkdown,
        frontmatter: processed.frontmatter,
        contentHash: processed.contentHash,
        privacy: processed.notePayload.privacy,
        originProvider: 'GDRIVE_SPARK',
        updatedByDevice: this.deviceId,
      });

      const envelope: Omit<LemonBusEnvelope<LemonBusNotePayload>, 'seq'> = {
        eventId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        deviceId: this.deviceId,
        entityType: 'NOTE',
        action: 'UPSERT',
        origin: 'GDRIVE_SPARK',
        transportVia: 'gdrive-fs',
        feedSlug: processed.feedTarget.slug,
        externalId: processed.canonicalPath,
        contentHash: processed.contentHash,
        privacy: processed.notePayload.privacy,
        payload: processed.notePayload,
      };

      const saved = this.db.insertEvent(envelope);
      this.sse.broadcast(saved);

      if (this.upstreamRelay) {
        this.upstreamRelay.publish(saved).catch(() => {});
      }

      console.log(
        `[LemonBus:LocalWatcher] ✨ Ingested "${saved.payload.title}" (${processed.canonicalPath}, seq=${saved.seq})`,
      );
      return true;
    } catch (err: any) {
      this.filesFailed++;
      console.warn(`[LemonBus:LocalWatcher] Failed ingesting "${filePath}": ${err?.message}`);
      return false;
    } finally {
      this.filesPending = Math.max(0, this.filesPending - 1);
    }
  }

  private enqueueFile(filePath: string): void {
    this.queue = this.queue
      .then(() => this.ingestLocalFile(filePath))
      .then(() => undefined)
      .catch(() => undefined);
  }

  private isSparkMarkdownFile(filePath: string): boolean {
    const fileName = path.basename(filePath);
    const lower = fileName.toLowerCase();
    return (
      (lower.endsWith('.md') || lower.endsWith('.markdown')) &&
      !fileName.startsWith('_') &&
      !lower.includes('template') &&
      !lower.includes('config') &&
      !lower.includes('правила_генерации')
    );
  }

  private async readChannelOverride(dir: string) {
    const channelPath = path.join(dir, '_channel.md');
    if (!fs.existsSync(channelPath)) return undefined;
    try {
      const raw = await fs.promises.readFile(channelPath, 'utf-8');
      const fm = parseSparkMarkdown(raw).frontmatter;
      return {
        slug: typeof fm.slug === 'string' ? fm.slug : undefined,
        title: typeof fm.title === 'string' ? fm.title : undefined,
        description: typeof fm.description === 'string' ? fm.description : undefined,
      };
    } catch {
      return undefined;
    }
  }

  private async findMarkdownFilesRecursive(dir: string): Promise<string[]> {
    if (!fs.existsSync(dir)) return [];
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    const results: string[] = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.')) {
          results.push(...(await this.findMarkdownFilesRecursive(fullPath)));
        }
      } else if (entry.isFile() && this.isSparkMarkdownFile(fullPath)) {
        results.push(fullPath);
      }
    }

    return results;
  }

  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
}
