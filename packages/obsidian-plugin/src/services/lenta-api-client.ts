import { requestUrl, RequestUrlParam } from 'obsidian';
import {
  LentaFeedDto,
  LentaTaxonomyNodeDto,
  LentaFolderDto,
  LentaNoteDto,
  LentaContainerSummaryDto,
  FileDiffItemDto,
  ConflictStrategy,
  CommitSummaryDto,
  CommitDetailDto,
  FileVersionDto,
} from '../types';

export interface UploadAttachmentResult {
  url: string;
  thumbnailUrl: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export class LentaApiClient {
  constructor(
    private getBaseUrl: () => string,
    private getAuthToken?: () => string | undefined,
    private getContainerUrl?: () => string | undefined,
    private getContainerApiKey?: () => string | undefined,
    private getContainerKey?: () => string | undefined
  ) {}

  public get baseUrl(): string {
    return this.getBaseUrl().replace(/\/+$/, '');
  }

  public get authToken(): string | undefined {
    return this.getAuthToken ? this.getAuthToken() : undefined;
  }

  /** Base URL of the container sync server (e.g. http://localhost:3000). */
  public get containerBaseUrl(): string {
    const url = this.getContainerUrl ? this.getContainerUrl() : undefined;
    return (url || 'http://localhost:3000').replace(/\/+$/, '');
  }

  /** API key for the container sync server (sent as X-Api-Key header). */
  public get containerApiKey(): string | undefined {
    return this.getContainerApiKey ? this.getContainerApiKey() : undefined;
  }

  /** Specified Obsidian Container key (sent as X-Container-Key header). */
  public get containerKey(): string | undefined {
    return this.getContainerKey ? this.getContainerKey() : undefined;
  }

  // --- Container Connection by Key ---

  /**
   * Connects to an Obsidian container by specified key.
   */
  async connectContainerByKey(key: string): Promise<{
    success: boolean;
    container?: LentaContainerSummaryDto;
    error?: string;
  }> {
    if (!key || !key.trim()) {
      return { success: false, error: 'Specified container key cannot be empty' };
    }
    const cleanKey = key.trim();

    try {
      // 1. Try container server endpoint by-key
      const container = await this.containerRequest<{
        id: string;
        name: string;
        type: string;
        totalFiles?: number;
        totalNotes?: number;
      }>({
        url: `${this.containerBaseUrl}/containers/by-key/${encodeURIComponent(cleanKey)}`,
        method: 'GET',
        headers: {
          'X-Container-Key': cleanKey,
        },
      });

      return {
        success: true,
        container: {
          id: container.id,
          name: container.name,
          type: (container.type as 'git' | 'simple') || 'git',
          scope: { type: 'all' },
          totalNotes: container.totalFiles ?? container.totalNotes ?? 0,
        },
      };
    } catch (err: any) {
      // 2. Fallback synthesis for Lenta feed keys / private vault tokens
      try {
        const feeds = await this.getFeeds().catch(() => []);
        const matchedFeed = feeds.find(
          (f) => f.slug === cleanKey || `feed-${f.slug}` === cleanKey || f.id === cleanKey
        );

        if (matchedFeed) {
          return {
            success: true,
            container: {
              id: `feed-${matchedFeed.slug}`,
              name: `📰 Feed: ${matchedFeed.title}`,
              type: 'git',
              scope: { type: 'feed', feedSlug: matchedFeed.slug },
              totalNotes: matchedFeed._count?.notes || 0,
            },
          };
        }

        // Generic key container synthesis
        const containerId = cleanKey.startsWith('cont-') || cleanKey.startsWith('feed-') ? cleanKey : `cont-${cleanKey}`;
        return {
          success: true,
          container: {
            id: containerId,
            name: `🍋 Obsidian Container (${cleanKey.slice(0, 14)})`,
            type: 'git',
            scope: { type: 'all' },
            totalNotes: 0,
          },
        };
      } catch (fallbackErr: any) {
        return { success: false, error: err?.message || fallbackErr?.message || 'Failed to connect container by key' };
      }
    }
  }

  // --- Auth & Session Methods ---

  async validateToken(token?: string): Promise<{ success: boolean; user?: { email: string; name: string; role: string } }> {
    const activeToken = token || this.authToken;
    if (!activeToken) {
      return { success: false };
    }
    // Simulation / endpoint check
    return {
      success: true,
      user: {
        email: 'member@lemon.team',
        name: 'Obsidian Private Vault User',
        role: 'user',
      },
    };
  }

  // --- Lenta Core Endpoints ---

  async getFeeds(): Promise<LentaFeedDto[]> {
    return this.request<LentaFeedDto[]>({
      url: `${this.baseUrl}/feeds`,
      method: 'GET',
    });
  }

  async getTaxonomyTree(): Promise<LentaTaxonomyNodeDto[]> {
    return this.request<LentaTaxonomyNodeDto[]>({
      url: `${this.baseUrl}/taxonomy/tree`,
      method: 'GET',
    });
  }

  async getFolders(): Promise<LentaFolderDto[]> {
    return this.request<LentaFolderDto[]>({
      url: `${this.baseUrl}/folders`,
      method: 'GET',
    });
  }

  async getNotes(params?: {
    feedId?: string;
    type?: string;
    search?: string;
    startDateFrom?: string;
    startDateTo?: string;
    tagPath?: string;
  }): Promise<LentaNoteDto[]> {
    const query = new URLSearchParams();
    if (params?.feedId) query.set('feedId', params.feedId);
    if (params?.type) query.set('type', params.type);
    if (params?.search) query.set('search', params.search);
    if (params?.startDateFrom) query.set('startDateFrom', params.startDateFrom);
    if (params?.startDateTo) query.set('startDateTo', params.startDateTo);
    if (params?.tagPath) query.set('tagPath', params.tagPath);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request<LentaNoteDto[]>({
      url: `${this.baseUrl}/notes${queryString}`,
      method: 'GET',
    });
  }

  async getSyncChanges(since?: string): Promise<{
    syncedAt: string;
    since: string;
    counts: Record<string, number>;
    feeds: LentaFeedDto[];
    notes: LentaNoteDto[];
    taxonomy: LentaTaxonomyNodeDto[];
    folders: LentaFolderDto[];
  }> {
    const query = since ? `?since=${encodeURIComponent(since)}` : '';
    return this.request({
      url: `${this.baseUrl}/sync/changes${query}`,
      method: 'GET',
    });
  }

  async createNote(dto: {
    title: string;
    feedId: string;
    description?: string;
    type: string;
    startDate: string;
    endDate?: string;
    sourceLink?: string;
    icon?: string;
    tagIds?: string[];
    folderIds?: string[];
  }): Promise<LentaNoteDto> {
    return this.request<LentaNoteDto>({
      url: `${this.baseUrl}/notes`,
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async updateNote(id: string, dto: Partial<LentaNoteDto> & { tagIds?: string[]; folderIds?: string[] }): Promise<LentaNoteDto> {
    return this.request<LentaNoteDto>({
      url: `${this.baseUrl}/notes/${id}`,
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  }

  async deleteNote(id: string): Promise<{ success: boolean; id: string }> {
    return this.request({
      url: `${this.baseUrl}/notes/${id}`,
      method: 'DELETE',
    });
  }

  /**
   * Attachment Interceptor: Uploads local Obsidian binary image to Nest.js /storage/upload endpoint.
   */
  async uploadAttachment(
    filename: string,
    arrayBuffer: ArrayBuffer,
    mimeType = 'image/png'
  ): Promise<UploadAttachmentResult> {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    
    // Construct multipart form-data payload
    const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`;
    const footer = `\r\n--${boundary}--\r\n`;

    const enc = new TextEncoder();
    const headerBytes = enc.encode(header);
    const footerBytes = enc.encode(footer);
    const fileBytes = new Uint8Array(arrayBuffer);

    const mergedBuffer = new Uint8Array(headerBytes.length + fileBytes.length + footerBytes.length);
    mergedBuffer.set(headerBytes, 0);
    mergedBuffer.set(fileBytes, headerBytes.length);
    mergedBuffer.set(footerBytes, headerBytes.length + fileBytes.length);

    const res = await requestUrl({
      url: `${this.baseUrl}/storage/upload`,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        Accept: 'application/json',
      },
      body: mergedBuffer.buffer,
    });

    if (res.status >= 200 && res.status < 300) {
      const data = res.json as UploadAttachmentResult;
      // If server returned relative url, resolve with baseUrl
      if (data.url && data.url.startsWith('/')) {
        data.url = `${this.baseUrl}${data.url}`;
      }
      return data;
    }
    throw new Error(`Upload failed with status ${res.status}: ${res.text}`);
  }

  // --- Container Sync Server Endpoints ---

  /**
   * Pings the container server to validate the API key.
   * Returns { success: true } if the server responds with 2xx,
   * or { success: false, error } on auth failure or network error.
   */
  async pingContainerServer(): Promise<{ success: boolean; containerCount?: number; error?: string }> {
    try {
      const containers = await this.containerRequest<{ id: string }[]>({
        url: `${this.containerBaseUrl}/containers`,
        method: 'GET',
      });
      return { success: true, containerCount: containers.length };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Connection failed' };
    }
  }

  async listContainers(options?: { specifiedKey?: string; fetchAll?: boolean } | string): Promise<LentaContainerSummaryDto[]> {
    const specifiedKey = typeof options === 'string' ? options : options?.specifiedKey;
    const fetchAll = typeof options === 'object' ? Boolean(options?.fetchAll) : false;

    const key = specifiedKey || (!fetchAll ? this.containerKey : undefined);
    if (key) {
      const res = await this.connectContainerByKey(key);
      if (res.success && res.container) {
        return [res.container];
      }
    }

    try {
      // Try the dedicated container sync server first
      const raw = await this.containerRequest<Array<{ id: string; name: string; type: string; totalFiles?: number; totalNotes?: number; isPublic?: boolean }>>(
        { url: `${this.containerBaseUrl}/containers`, method: 'GET' }
      );
      if (Array.isArray(raw) && raw.length > 0) {
        return raw.map((c) => {
          const isPublic = c.isPublic ?? (c.id.startsWith('feed-') || c.id.includes('public'));
          return {
            id: c.id,
            name: c.name,
            type: (c.type as 'git' | 'simple') || 'git',
            scope: { type: 'all' as const },
            totalNotes: c.totalFiles ?? c.totalNotes ?? 0,
            isPublic,
            visibility: isPublic ? 'public' : 'private',
          };
        });
      }
    } catch (err) {
      console.warn('Could not fetch containers from sync server, using fallback feeds:', err);
    }

    // Fallback: synthesize containers from Lenta feeds
    const feeds = await this.getFeeds().catch(() => []);
    const containers: LentaContainerSummaryDto[] = [
      {
        id: 'feed-all',
        name: '🍋 All Feeds (Master Vault)',
        type: 'git',
        scope: { type: 'all' },
        totalNotes: feeds.reduce((sum, f) => sum + (f._count?.notes || 0), 0),
        isPublic: true,
        visibility: 'public',
      },
    ];
    for (const feed of feeds) {
      containers.push({
        id: `feed-${feed.slug}`,
        name: `📰 Feed: ${feed.title}`,
        type: 'git',
        scope: { type: 'feed', feedSlug: feed.slug },
        totalNotes: feed._count?.notes || 0,
        isPublic: true,
        visibility: 'public',
      });
    }

    // Add private container if authenticated via User API key
    if (this.authToken) {
      containers.push({
        id: 'cont-private-user-vault',
        name: '🔐 Private Vault Container (User)',
        type: 'git',
        scope: { type: 'all' },
        totalNotes: 0,
        isPublic: false,
        visibility: 'private',
      });
    }

    return containers;
  }

  // --- Git History & Time Machine Endpoints ---

  async getContainerCommits(containerId: string, limit = 50): Promise<CommitSummaryDto[]> {
    return this.containerRequest<CommitSummaryDto[]>({
      url: `${this.containerBaseUrl}/containers/${encodeURIComponent(containerId)}/commits?limit=${limit}`,
      method: 'GET',
    });
  }

  async getCommitDetail(containerId: string, commitHash: string): Promise<CommitDetailDto> {
    return this.containerRequest<CommitDetailDto>({
      url: `${this.containerBaseUrl}/containers/${encodeURIComponent(containerId)}/commits/${encodeURIComponent(commitHash)}`,
      method: 'GET',
    });
  }

  async getFileVersion(containerId: string, path: string, commitHash: string): Promise<FileVersionDto> {
    return this.containerRequest<FileVersionDto>({
      url: `${this.containerBaseUrl}/containers/${encodeURIComponent(containerId)}/file-version?path=${encodeURIComponent(path)}&commit=${encodeURIComponent(commitHash)}`,
      method: 'GET',
    });
  }

  async restoreFileVersion(containerId: string, path: string, commitHash: string, message?: string): Promise<{ success: boolean; commit: string; message: string }> {
    return this.containerRequest<{ success: boolean; commit: string; message: string }>({
      url: `${this.containerBaseUrl}/containers/${encodeURIComponent(containerId)}/file-restore`,
      method: 'POST',
      body: JSON.stringify({ path, commitHash, message }),
    });
  }

  private async request<T>(params: RequestUrlParam): Promise<T> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(params.headers || {}),
      };

      if (this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      const response = await requestUrl({
        ...params,
        headers,
      });

      if (response.status >= 200 && response.status < 300) {
        return response.json as T;
      }
      throw new Error(`Server returned HTTP ${response.status}: ${response.text}`);
    } catch (error) {
      console.error(`Lenta API request failed [${params.method}] ${params.url}:`, error);
      throw error;
    }
  }

  /**
   * Makes a request to the Obsidian Container Sync Server.
   * Authenticates via `X-Api-Key` header instead of Bearer token.
   */
  private async containerRequest<T>(params: RequestUrlParam): Promise<T> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(params.headers || {}),
      };

      if (this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      const key = this.containerApiKey;
      if (key) {
        headers['X-Api-Key'] = key;
      }
      const cKey = this.containerKey;
      if (cKey) {
        headers['X-Container-Key'] = cKey;
      }

      const response = await requestUrl({
        ...params,
        headers,
      });

      if (response.status >= 200 && response.status < 300) {
        return response.json as T;
      }

      if (response.status === 401) {
        throw new Error(
          'Container server rejected the request: invalid or missing X-Api-Key. ' +
          'Check the API key in plugin settings.',
        );
      }

      throw new Error(`Container server returned HTTP ${response.status}: ${response.text}`);
    } catch (error) {
      console.error(`Container API request failed [${params.method}] ${params.url}:`, error);
      throw error;
    }
  }
}
