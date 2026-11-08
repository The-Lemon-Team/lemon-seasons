import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import * as chokidar from 'chokidar';
import { Observable, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import {
  BusCursor,
  BusEventsPage,
  BusEventsQuery,
  BusNodeStats,
  BusSubscriptionPattern,
  BusTransportStatus,
  ILemonBusTransport,
  LemonBusEnvelope,
  LemonBusNotePayload,
  PublishSparkInput,
} from '../types/bus-contract.types.js';
import { resolveNoteOrigin } from '../types/provenance.types.js';
import { processSparkDocument } from '../sparks/spark-document.processor.js';
import { parseSparkMarkdown } from '../sparks/markdown-frontmatter.util.js';
import { compileBusPattern, matchesCompiledBusPattern } from './pattern-matcher.util.js';

export interface GoogleDriveFsTransportOptions {
  deviceId: string;
  busDir?: string;
  sparksDir?: string | null;
  watchSparks?: boolean;
}

export class GoogleDriveFsTransport implements ILemonBusTransport {
  public readonly driver = 'gdrive-fs' as const;
  public readonly deviceId: string;
  public readonly busDir: string;
  public readonly eventsDir: string;
  public readonly sparksDir: string | null;

  private readonly watermarkFile: string;
  private readonly watchSparks: boolean;
  private readonly stream$ = new Subject<LemonBusEnvelope>();
  private readonly knownHashes = new Set<string>();
  private eventsWatcher: chokidar.FSWatcher | null = null;
  private sparksWatcher: chokidar.FSWatcher | null = null;
  private lastWatermarkTimestamp: string | null = null;
  private running = false;

  constructor(options: GoogleDriveFsTransportOptions) {
    this.deviceId = options.deviceId;
    this.busDir =
      options.busDir ||
      (process.env.GDRIVE_SYNC_FOLDER ? path.join(process.env.GDRIVE_SYNC_FOLDER, 'LemonBus') : null) ||
      path.join(os.homedir(), '.lemon', 'bus');
    this.eventsDir = path.join(this.busDir, 'events');
    this.watermarkFile = path.join(this.busDir, `.watermark_${this.deviceId}.json`);
    this.sparksDir = options.sparksDir || null;
    this.watchSparks = Boolean(options.watchSparks && this.sparksDir);
  }

  async start(): Promise<void> {
    this.ensureDirectories();
    this.loadWatermark();
    await this.warmRecentHashes();
    this.running = true;

    this.eventsWatcher = chokidar.watch(this.eventsDir, {
      ignored: /(^|[\/\\])\../,
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 400, pollInterval: 100 },
    });

    this.eventsWatcher
      .on('add', (fp) => this.handleIncomingJsonFile(fp))
      .on('change', (fp) => this.handleIncomingJsonFile(fp));

    if (this.watchSparks && this.sparksDir && fs.existsSync(this.sparksDir)) {
      this.sparksWatcher = chokidar.watch(this.sparksDir, {
        ignored: (fp: string) => path.basename(fp).startsWith('.'),
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: { stabilityThreshold: 800, pollInterval: 250 },
      });
      this.sparksWatcher
        .on('add', (fp) => this.handleIncomingSparkMd(fp))
        .on('change', (fp) => this.handleIncomingSparkMd(fp));
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.eventsWatcher) {
      await this.eventsWatcher.close();
      this.eventsWatcher = null;
    }
    if (this.sparksWatcher) {
      await this.sparksWatcher.close();
      this.sparksWatcher = null;
    }
  }

  async publish<T = any>(
    partial: Omit<LemonBusEnvelope<T>, 'eventId' | 'timestamp' | 'deviceId' | 'transportVia'> & {
      eventId?: string;
      timestamp?: string;
      deviceId?: string;
    },
  ): Promise<LemonBusEnvelope<T>> {
    this.ensureDirectories();
    const nowIso = partial.timestamp || new Date().toISOString();
    const eventId = partial.eventId || crypto.randomUUID();
    const devId = partial.deviceId || this.deviceId;
    const envelope: LemonBusEnvelope<T> = {
      ...partial,
      eventId,
      timestamp: nowIso,
      deviceId: devId,
      transportVia: 'gdrive-fs',
    };

    const safeTime = nowIso.replace(/[:.]/g, '-');
    const entityKey = String((partial.payload as any)?.id || eventId)
      .replace(/[^a-z0-9_-]/gi, '')
      .slice(0, 12);
    const fileName = `${safeTime}_${devId}_${entityKey}.json`;
    const fullPath = path.join(this.eventsDir, fileName);

    await fs.promises.writeFile(fullPath, JSON.stringify(envelope, null, 2), 'utf-8');
    if (envelope.contentHash) {
      this.knownHashes.add(envelope.contentHash);
    }
    return envelope;
  }

  async publishSparkDocument(
    input: PublishSparkInput,
  ): Promise<LemonBusEnvelope<LemonBusNotePayload>> {
    const processed = processSparkDocument({
      ...input,
      origin: input.origin || 'GDRIVE_SPARK',
    });

    return this.publish<LemonBusNotePayload>({
      entityType: 'NOTE',
      action: 'UPSERT',
      origin: processed.notePayload.origin,
      feedSlug: processed.feedTarget.slug,
      externalId: processed.canonicalPath,
      contentHash: processed.contentHash,
      privacy: processed.notePayload.privacy,
      payload: processed.notePayload,
    });
  }

  subscribe(pattern?: BusSubscriptionPattern): Observable<LemonBusEnvelope> {
    const compiled = compileBusPattern(pattern);
    return this.stream$.asObservable().pipe(
      filter((env) => matchesCompiledBusPattern(compiled, env)),
    );
  }

  async pullSince(
    cursor: BusCursor,
    limit = 200,
  ): Promise<{ items: LemonBusEnvelope[]; nextCursor: BusCursor }> {
    if (!fs.existsSync(this.eventsDir)) {
      return { items: [], nextCursor: cursor };
    }

    const sinceTs = cursor.lastTimestamp ?? this.lastWatermarkTimestamp;
    const safePrefix = sinceTs ? sinceTs.replace(/[:.]/g, '-') : null;
    const files = (await fs.promises.readdir(this.eventsDir))
      .filter((f) => f.toLowerCase().endsWith('.json') && !f.startsWith('.'))
      .sort();

    // Coalesce multiple rewrites of the same note key into the latest file
    const latestByNote = new Map<string, string>();
    for (const fileName of files) {
      if (fileName.includes(`_${this.deviceId}_`)) continue;
      const parts = fileName.split('_');
      if (safePrefix && parts[0] && parts[0] <= safePrefix) continue;
      latestByNote.set(parts[2] || fileName, fileName);
    }

    const items: LemonBusEnvelope[] = [];
    for (const fileName of Array.from(latestByNote.values()).slice(0, limit)) {
      const env = await this.readJsonEnvelope(path.join(this.eventsDir, fileName));
      if (!env || env.deviceId === this.deviceId) continue;
      if (sinceTs && env.timestamp <= sinceTs) continue;
      items.push(env);
    }

    const last = items[items.length - 1];
    return {
      items,
      nextCursor: {
        lastTimestamp: last?.timestamp ?? sinceTs ?? null,
      },
    };
  }

  async acknowledgeCursor(cursor: BusCursor): Promise<void> {
    if (cursor.lastTimestamp) {
      this.lastWatermarkTimestamp = cursor.lastTimestamp;
      this.ensureDirectories();
      await fs.promises
        .writeFile(
          this.watermarkFile,
          JSON.stringify(
            { deviceId: this.deviceId, lastProcessedTimestamp: cursor.lastTimestamp },
            null,
            2,
          ),
          'utf-8',
        )
        .catch(() => {});
    }
  }

  async hasContentHash(contentHash: string): Promise<boolean> {
    if (!contentHash) return false;
    return this.knownHashes.has(contentHash);
  }

  async queryEvents(query: BusEventsQuery): Promise<BusEventsPage> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
    if (!fs.existsSync(this.eventsDir)) {
      return { total: 0, page, limit, totalPages: 0, items: [] };
    }

    const allFiles = (await fs.promises.readdir(this.eventsDir))
      .filter((f) => f.toLowerCase().endsWith('.json') && !f.startsWith('.'))
      .sort()
      .reverse();

    const searchLower = query.search?.toLowerCase().trim() || null;
    const matched: LemonBusEnvelope[] = [];

    for (const f of allFiles.slice(0, 250)) {
      if (query.deviceId) {
        const dev = f.split('_')[1] || '';
        if (dev.toLowerCase() !== query.deviceId.toLowerCase()) continue;
      }
      const env = await this.readJsonEnvelope(path.join(this.eventsDir, f));
      if (!env) continue;
      if (query.action && env.action !== query.action) continue;
      if (query.feedSlug && env.feedSlug !== query.feedSlug) continue;
      if (searchLower) {
        const text = JSON.stringify({
          id: env.eventId,
          title: env.payload?.title,
          summary: env.payload?.summary,
          folder: env.payload?.folderPath,
        }).toLowerCase();
        if (!text.includes(searchLower)) continue;
      }
      matched.push(env);
    }

    const total = matched.length;
    const items = matched.slice((page - 1) * limit, page * limit);
    return { total, page, limit, totalPages: Math.ceil(total / limit), items };
  }

  async getStatus(): Promise<BusTransportStatus> {
    const watermarks: Record<string, string> = {};
    const nodeMap = new Map<string, { count: number; lastTime: string | null }>();
    let totalEventsCount = 0;
    let lastEventTimestamp: string | null = null;

    if (fs.existsSync(this.busDir)) {
      const busFiles = await fs.promises.readdir(this.busDir).catch(() => []);
      for (const f of busFiles) {
        if (f.startsWith('.watermark_') && f.endsWith('.json')) {
          try {
            const parsed = JSON.parse(await fs.promises.readFile(path.join(this.busDir, f), 'utf-8'));
            if (parsed?.deviceId && parsed?.lastProcessedTimestamp) {
              watermarks[parsed.deviceId] = parsed.lastProcessedTimestamp;
            }
          } catch {
            // ignore
          }
        }
      }
    }

    if (fs.existsSync(this.eventsDir)) {
      const jsonFiles = (await fs.promises.readdir(this.eventsDir).catch(() => []))
        .filter((f) => f.toLowerCase().endsWith('.json') && !f.startsWith('.'))
        .sort();
      totalEventsCount = jsonFiles.length;
      for (const f of jsonFiles) {
        const parts = f.split('_');
        const iso = this.safeTimeToIso(parts[0]);
        const dev = parts[1] || 'unknown';
        const cur = nodeMap.get(dev) || { count: 0, lastTime: null };
        cur.count += 1;
        if (!cur.lastTime || (iso && iso > cur.lastTime)) cur.lastTime = iso;
        nodeMap.set(dev, cur);
        lastEventTimestamp = iso || lastEventTimestamp;
      }
    }

    if (!nodeMap.has(this.deviceId)) {
      nodeMap.set(this.deviceId, { count: 0, lastTime: null });
    }

    const nodes: BusNodeStats[] = Array.from(nodeMap.entries()).map(([dev, st]) => ({
      deviceId: dev,
      eventsCount: st.count,
      lastEventTimestamp: st.lastTime,
      watermarkTimestamp: watermarks[dev] || null,
      lastSeq: null,
      driver: 'gdrive-fs',
      isCurrentDevice: dev.toLowerCase() === this.deviceId.toLowerCase(),
    }));

    return {
      driver: 'gdrive-fs',
      isWatching: this.running,
      supabaseConnected: false,
      gdriveConnected: fs.existsSync(this.eventsDir),
      currentDeviceId: this.deviceId,
      busDir: this.busDir,
      eventsDir: this.eventsDir,
      totalEventsCount,
      lastEventTimestamp,
      lastSeq: totalEventsCount,
      watermarks,
      nodes,
    };
  }

  private async handleIncomingJsonFile(filePath: string): Promise<void> {
    const fileName = path.basename(filePath);
    if (!fileName.toLowerCase().endsWith('.json') || fileName.startsWith('.')) return;
    if (fileName.includes(`_${this.deviceId}_`)) return;

    const env = await this.readJsonEnvelope(filePath);
    if (!env || env.deviceId === this.deviceId) return;
    if (env.contentHash) this.knownHashes.add(env.contentHash);
    this.stream$.next(env);
  }

  private async handleIncomingSparkMd(filePath: string): Promise<void> {
    const base = path.basename(filePath).toLowerCase();
    if (!base.endsWith('.md') || base.startsWith('_') || base.includes('template')) return;
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const stats = await fs.promises.stat(filePath);
      const channelOverride = await this.readChannelOverride(path.dirname(filePath));
      const relPath = this.sparksDir ? path.relative(this.sparksDir, filePath) : filePath;
      const processed = processSparkDocument({
        virtualPath: `Spark/${relPath.replace(/\\/g, '/')}`,
        contentMarkdown: content,
        origin: 'GDRIVE_SPARK',
        channelOverride,
        mtime: stats.mtime,
      });
      if (this.knownHashes.has(processed.contentHash)) return;
      this.knownHashes.add(processed.contentHash);

      this.stream$.next({
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
      });
    } catch {
      // ignore transient cloud-drive read locks
    }
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

  private async readJsonEnvelope(filePath: string): Promise<LemonBusEnvelope | null> {
    try {
      const raw = await fs.promises.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.entityType) return null;
      const origin = resolveNoteOrigin({
        origin: parsed.origin || parsed.payload?.origin,
        sourceType: parsed.payload?.sourceType,
        metadata: parsed.payload?.metadata,
      });
      return {
        ...parsed,
        origin,
        transportVia: parsed.transportVia || 'gdrive-fs',
        privacy: parsed.privacy || parsed.payload?.privacy || 'private',
        contentHash: parsed.contentHash || parsed.payload?.fileHash || null,
        feedSlug: parsed.feedSlug || parsed.payload?.feedSlug || null,
      };
    } catch {
      return null;
    }
  }

  private async warmRecentHashes(): Promise<void> {
    if (!fs.existsSync(this.eventsDir)) return;
    try {
      const files = (await fs.promises.readdir(this.eventsDir))
        .filter((f) => f.toLowerCase().endsWith('.json') && !f.startsWith('.'))
        .sort()
        .slice(-200);
      for (const f of files) {
        const env = await this.readJsonEnvelope(path.join(this.eventsDir, f));
        if (env?.contentHash) this.knownHashes.add(env.contentHash);
      }
    } catch {
      // ignore
    }
  }

  private loadWatermark(): void {
    try {
      if (fs.existsSync(this.watermarkFile)) {
        const data = JSON.parse(fs.readFileSync(this.watermarkFile, 'utf-8'));
        this.lastWatermarkTimestamp = data.lastProcessedTimestamp || null;
      }
    } catch {
      this.lastWatermarkTimestamp = null;
    }
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.busDir)) fs.mkdirSync(this.busDir, { recursive: true });
    if (!fs.existsSync(this.eventsDir)) fs.mkdirSync(this.eventsDir, { recursive: true });
  }

  private safeTimeToIso(safeTime?: string): string | null {
    if (!safeTime) return null;
    const match = safeTime.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/);
    return match ? `${match[1]}T${match[2]}:${match[3]}:${match[4]}.${match[5]}Z` : safeTime;
  }
}
