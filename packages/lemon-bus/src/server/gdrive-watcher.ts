import * as crypto from 'node:crypto';
import { BusDatabase } from './db.js';
import { SseManager } from './sse.js';
import { processSparkDocument, normalizeCanonicalSparkPath } from '../sparks/spark-document.processor.js';
import { LemonBusEnvelope, LemonBusNotePayload } from '../types/bus-contract.types.js';

export interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
  token_uri?: string;
  project_id?: string;
}

export interface GDriveWatcherOptions {
  serviceAccount: ServiceAccountCredentials | string;
  rootFolderId: string;
  db: BusDatabase;
  sse: SseManager;
  pollIntervalMs?: number;
  fetchImpl?: typeof fetch;
}

interface DriveFolderNode {
  id: string;
  name: string;
  parentId: string | null;
  path: string;
}

export class GoogleDriveCloudWatcher {
  private readonly credentials: ServiceAccountCredentials;
  private readonly rootFolderId: string;
  private readonly db: BusDatabase;
  private readonly sse: SseManager;
  private readonly pollIntervalMs: number;
  private readonly fetchFn: typeof fetch;

  private folderMap = new Map<string, DriveFolderNode>();
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;
  private pageToken: string | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private polling = false;

  constructor(options: GDriveWatcherOptions) {
    if (typeof options.serviceAccount === 'string') {
      let raw = options.serviceAccount.trim();
      if (!raw.startsWith('{')) {
        try {
          raw = Buffer.from(raw, 'base64').toString('utf8');
        } catch {
          // ignore decode error, will fail on JSON.parse
        }
      }
      this.credentials = JSON.parse(raw);
    } else {
      this.credentials = options.serviceAccount;
    }
    this.rootFolderId = options.rootFolderId;
    this.db = options.db;
    this.sse = options.sse;
    this.pollIntervalMs = options.pollIntervalMs || 30_000;
    this.fetchFn = options.fetchImpl || globalThis.fetch;
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    console.log(`[GDriveCloudWatcher] Starting watcher for root folder: ${this.rootFolderId}`);
    await this.refreshFolderTree();
    await this.scanRecentFiles(30);
    await this.initStartPageToken();

    this.pollTimer = setInterval(() => {
      this.pollChanges().catch((err) => {
        console.error('[GDriveCloudWatcher] Poll cycle error:', err?.message);
      });
    }, this.pollIntervalMs);

    if (this.pollTimer.unref) {
      this.pollTimer.unref();
    }
  }

  /**
   * Initial scan to catch up on existing notes within the 30-day retention window.
   */
  public async scanRecentFiles(days = 30): Promise<number> {
    try {
      const token = await this.getAccessToken();
      const pastDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const query = `mimeType = 'text/markdown' and trashed = false and modifiedTime > '${pastDate}'`;
      let pageToken: string | undefined = undefined;
      let totalIngested = 0;

      do {
        const url: string = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
          query,
        )}&fields=nextPageToken,files(id,name,parents,modifiedTime)&pageSize=100${
          pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''
        }`;

        const res = await this.fetchFn(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) break;
        const data: any = await res.json();
        const files = data.files || [];

        for (const file of files) {
          if (this.isMarkdownFile(file.name)) {
            const ok = await this.ingestDriveFile(file, token);
            if (ok) {
              totalIngested++;
              // Mild yield between actual downloads to prevent burst rate-limits from Google
              await new Promise((r) => setTimeout(r, 50));
            }
          }
        }

        pageToken = data.nextPageToken;
      } while (pageToken);

      if (totalIngested > 0) {
        console.log(`[GDriveCloudWatcher] Initial catch-up completed: ingested ${totalIngested} notes.`);
      }
      return totalIngested;
    } catch (err: any) {
      console.warn(`[GDriveCloudWatcher] Recent scan error: ${err?.message}`);
      return 0;
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  public async getAccessToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    if (this.accessToken && this.tokenExpiresAt > now + 60) {
      return this.accessToken;
    }

    const tokenUri = this.credentials.token_uri || 'https://oauth2.googleapis.com/token';
    const header = { alg: 'RS256', typ: 'JWT' };
    const claimSet = {
      iss: this.credentials.client_email,
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      aud: tokenUri,
      exp: now + 3600,
      iat: now,
    };

    const b64url = (o: any) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const unsignedJwt = `${b64url(header)}.${b64url(claimSet)}`;

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(unsignedJwt);
    const signature = signer.sign(this.credentials.private_key, 'base64url');
    const assertion = `${unsignedJwt}.${signature}`;

    const res = await this.fetchFn(tokenUri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Google OAuth error: HTTP ${res.status} ${errText}`);
    }

    const data = (await res.json()) as { access_token: string; expires_in: number };
    this.accessToken = data.access_token;
    this.tokenExpiresAt = now + (data.expires_in || 3600);
    return this.accessToken;
  }

  /**
   * Discovers and maps all subfolders recursively starting from root.
   */
  public async refreshFolderTree(): Promise<void> {
    try {
      const token = await this.getAccessToken();
      const query = `mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        query,
      )}&fields=files(id,name,parents)&pageSize=1000`;

      const res = await this.fetchFn(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) return;

      const data = (await res.json()) as { files?: Array<{ id: string; name: string; parents?: string[] }> };
      const rawFolders = data.files || [];

      // Build parent-child relationships
      const rawMap = new Map<string, { id: string; name: string; parentId: string | null }>();
      for (const rf of rawFolders) {
        rawMap.set(rf.id, {
          id: rf.id,
          name: rf.name,
          parentId: rf.parents && rf.parents.length > 0 ? rf.parents[0] : null,
        });
      }

      // Root entry
      this.folderMap.clear();
      this.folderMap.set(this.rootFolderId, {
        id: this.rootFolderId,
        name: 'Spark',
        parentId: null,
        path: 'Spark',
      });

      // Resolve paths recursively
      const resolvePath = (folderId: string, visited = new Set<string>()): string => {
        if (folderId === this.rootFolderId) return 'Spark';
        if (visited.has(folderId)) return 'Spark/nested';
        visited.add(folderId);

        const node = rawMap.get(folderId);
        if (!node) return 'Spark';

        const parentPath = node.parentId ? resolvePath(node.parentId, visited) : 'Spark';
        return `${parentPath}/${node.name}`;
      };

      for (const [id, node] of rawMap.entries()) {
        const fullPath = resolvePath(id);
        this.folderMap.set(id, {
          id,
          name: node.name,
          parentId: node.parentId,
          path: fullPath,
        });
      }

      console.log(`[GDriveCloudWatcher] Cached ${this.folderMap.size} folder paths.`);
    } catch (err: any) {
      console.warn(`[GDriveCloudWatcher] Failed to refresh folder tree: ${err?.message}`);
    }
  }

  private async initStartPageToken(): Promise<void> {
    try {
      const token = await this.getAccessToken();
      const res = await this.fetchFn('https://www.googleapis.com/drive/v3/changes/startPageToken', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = (await res.json()) as { startPageToken?: string };
        this.pageToken = data.startPageToken || null;
      }
    } catch {
      // Quiet ignore
    }
  }

  public async pollChanges(): Promise<number> {
    if (this.polling) return 0;
    this.polling = true;

    try {
      const token = await this.getAccessToken();

      // If pageToken not yet set, do a files query
      if (!this.pageToken) {
        return await this.scanFilesFallback(token);
      }

      const url = `https://www.googleapis.com/drive/v3/changes?pageToken=${encodeURIComponent(
        this.pageToken,
      )}&fields=newStartPageToken,nextPageToken,changes(fileId,removed,file(id,name,mimeType,parents,trashed,modifiedTime))&pageSize=100`;

      const res = await this.fetchFn(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        return await this.scanFilesFallback(token);
      }

      const data = (await res.json()) as any;
      this.pageToken = data.newStartPageToken || data.nextPageToken || this.pageToken;

      let processedCount = 0;
      for (const ch of data.changes || []) {
        const file = ch.file;
        if (!file || ch.removed || file.trashed) continue;

        if (file.mimeType === 'application/vnd.google-apps.folder') {
          await this.refreshFolderTree();
          continue;
        }

        if (this.isMarkdownFile(file.name)) {
          const ok = await this.ingestDriveFile(file, token);
          if (ok) processedCount++;
        }
      }

      return processedCount;
    } finally {
      this.polling = false;
    }
  }

  private async scanFilesFallback(token: string): Promise<number> {
    const query = `mimeType = 'text/markdown' and trashed = false`;
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      query,
    )}&fields=files(id,name,parents,modifiedTime)&pageSize=100`;

    const res = await this.fetchFn(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return 0;
    const data = (await res.json()) as { files?: any[] };
    let processed = 0;

    for (const file of data.files || []) {
      if (this.isMarkdownFile(file.name)) {
        const ok = await this.ingestDriveFile(file, token);
        if (ok) processed++;
      }
    }

    await this.initStartPageToken();
    return processed;
  }

  private async ingestDriveFile(
    file: { id: string; name: string; parents?: string[]; modifiedTime?: string },
    token: string,
  ): Promise<boolean> {
    try {
      // Determine folder path from parent
      const parentId = file.parents && file.parents[0] ? file.parents[0] : this.rootFolderId;
      const folderNode = this.folderMap.get(parentId);
      const folderPath = folderNode ? folderNode.path : 'Spark';
      const virtualPath = `${folderPath}/${file.name}`;
      const { canonicalPath } = normalizeCanonicalSparkPath(virtualPath);

      // Pre-check against local DB before issuing network request to download file content
      const existingDoc = this.db.getSparkDocument(canonicalPath);
      if (existingDoc && file.modifiedTime) {
        const fileMtime = new Date(file.modifiedTime).getTime();
        const docMtime = new Date(existingDoc.updatedAt).getTime();
        if (!isNaN(fileMtime) && !isNaN(docMtime) && fileMtime <= docMtime) {
          // File has not been modified in Google Drive since last ingestion
          return false;
        }
      }

      // Download content with rate limit protection
      const contentRes = await this.fetchFn(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!contentRes.ok) {
        if (contentRes.status === 429 || contentRes.status === 503) {
          console.warn(`[GDriveCloudWatcher] Rate limit (HTTP ${contentRes.status}) on ${file.name}. Pausing...`);
          await new Promise((r) => setTimeout(r, 2000));
        }
        return false;
      }
      const rawMarkdown = await contentRes.text();

      // Process via SparkDocumentProcessor
      const processed = processSparkDocument({
        virtualPath,
        contentMarkdown: rawMarkdown,
        origin: 'GDRIVE_SPARK',
      });

      // Content hash deduplication against DB
      if (existingDoc && existingDoc.contentHash === processed.contentHash) {
        return false;
      }

      // 1. Store in lemon_spark_documents (Claim Check buffer)
      this.db.upsertSparkDocument({
        id: processed.notePayload.id,
        canonicalPath: processed.canonicalPath,
        fileName: processed.fileName,
        folderPath: processed.folderPath,
        feedSlug: processed.feedTarget.slug,
        title: processed.frontmatter.title || processed.notePayload.title,
        contentMarkdown: rawMarkdown,
        frontmatter: processed.frontmatter,
        contentHash: processed.contentHash,
        privacy: processed.notePayload.privacy,
        originProvider: 'GDRIVE_SPARK',
        updatedByDevice: 'gdrive-cloud-watcher',
      });

      // 2. Insert into lemon_bus_events (Hot Stack)
      const envelope: Omit<LemonBusEnvelope<LemonBusNotePayload>, 'seq'> = {
        eventId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        deviceId: 'gdrive-cloud-watcher',
        entityType: 'NOTE',
        action: 'UPSERT',
        origin: 'GDRIVE_SPARK',
        transportVia: 'cloud',
        feedSlug: processed.feedTarget.slug,
        externalId: processed.canonicalPath,
        contentHash: processed.contentHash,
        privacy: processed.notePayload.privacy,
        payload: processed.notePayload,
      };

      const saved = this.db.insertEvent(envelope);

      // 3. Broadcast to all active SSE subscribers
      this.sse.broadcast(saved);
      console.log(`[GDriveCloudWatcher] ✨ Ingested note "${saved.payload.title}" from ${processed.canonicalPath} (seq=${saved.seq})`);
      return true;
    } catch (err: any) {
      console.warn(`[GDriveCloudWatcher] Ingestion error on ${file.name}: ${err?.message}`);
      return false;
    }
  }

  private isMarkdownFile(name?: string): boolean {
    if (!name) return false;
    const lower = name.toLowerCase();
    return (
      (lower.endsWith('.md') || lower.endsWith('.markdown')) &&
      !name.startsWith('_') &&
      !lower.includes('template') &&
      !lower.includes('правила_генерации')
    );
  }
}
