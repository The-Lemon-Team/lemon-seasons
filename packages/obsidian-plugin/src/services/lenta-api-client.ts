import { requestUrl, RequestUrlParam } from 'obsidian';
import {
  LentaFeedDto,
  LentaTaxonomyNodeDto,
  LentaFolderDto,
  LentaNoteDto,
  LentaContainerSummaryDto,
  FileDiffItemDto,
  ConflictStrategy,
} from '../types';

export interface UploadAttachmentResult {
  url: string;
  thumbnailUrl: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export class LentaApiClient {
  constructor(private getBaseUrl: () => string) {}

  public get baseUrl(): string {
    return this.getBaseUrl().replace(/\/+$/, '');
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

  // --- Dynamic Container Endpoints ---

  async listContainers(): Promise<LentaContainerSummaryDto[]> {
    try {
      return await this.request<LentaContainerSummaryDto[]>({
        url: `${this.baseUrl}/containers`,
        method: 'GET',
      });
    } catch {
      // Fallback: Synthesize containers dynamically from feeds
      const feeds = await this.getFeeds().catch(() => []);
      const containers: LentaContainerSummaryDto[] = [
        {
          id: 'feed-all',
          name: '🍋 All Feeds (Master Vault)',
          type: 'git',
          scope: { type: 'all' },
          totalNotes: feeds.reduce((sum, f) => sum + (f._count?.notes || 0), 0),
        },
      ];

      for (const feed of feeds) {
        containers.push({
          id: `feed-${feed.slug}`,
          name: `📰 Feed: ${feed.title}`,
          type: 'git',
          scope: { type: 'feed', feedSlug: feed.slug },
          totalNotes: feed._count?.notes || 0,
        });
      }

      return containers;
    }
  }

  private async request<T>(params: RequestUrlParam): Promise<T> {
    try {
      const response = await requestUrl({
        ...params,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(params.headers || {}),
        },
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
}
