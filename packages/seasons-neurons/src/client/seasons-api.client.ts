import {
  NoteOrigin,
  SeasonsTopologySnapshot,
  TopologyFeedNode,
  TopologyStreamNode,
} from '@lenta/shared';
import { PaginatedNotesWindow } from '../types/neuron-models.types.js';

export interface SeasonsApiClientOptions {
  baseUrl: string;
  token?: string;
  fetchImpl?: typeof fetch;
}

export interface NotesPageQuery {
  limit?: number;
  offset?: number;
  feedId?: string;
  feedSlug?: string;
  streamSource?: string;
  type?: string;
  privacy?: 'public' | 'private' | 'all';
  author?: string;
  parentNoteId?: string;
  hashtag?: string;
  search?: string;
  startDateFrom?: string;
  startDateTo?: string;
  sortBy?: 'startDate' | 'type' | 'folder' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface IngestSeasonNoteInput {
  externalId?: string;
  title?: string;
  content: string;
  summary?: string;
  type?: 'SINGLE' | 'PERIOD' | 'EVENT' | 'FILM_RELEASE' | 'MENTION' | 'DONE';
  privacy?: 'public' | 'private';
  status?: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';
  feedSlug?: string;
  feedId?: string;
  streamSlug?: string;
  author?: string;
  parentNoteId?: string;
  startDate?: string;
  endDate?: string;
  icon?: string;
  tags?: string[];
  folder?: string;
  origin?: NoteOrigin;
  metadata?: Record<string, any>;
}

/**
 * Strongly-typed HTTP client for Lemon Seasons API v1.
 * Enforces honest pagination on all note queries and uses /api/v1/topology for counters.
 */
export class SeasonsApiClient {
  public readonly baseUrl: string;
  private token: string | undefined;
  private readonly fetchFn: typeof fetch;

  constructor(options: SeasonsApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.token = options.token;
    this.fetchFn = options.fetchImpl || globalThis.fetch;
  }

  setToken(token?: string): void {
    this.token = token;
  }

  getToken(): string | undefined {
    return this.token;
  }

  // ── 1. Каркас / Topology API ────────────────────────────────────────────────

  async getTopology(params?: {
    streamSlug?: string;
    privacy?: 'public' | 'private' | 'all';
    days?: number;
  }): Promise<SeasonsTopologySnapshot> {
    const qs = this.buildQuery(params || {});
    return this.request<SeasonsTopologySnapshot>(`/api/v1/topology${qs}`);
  }

  async getStreamTopology(
    streamIdOrSlug: string,
    params?: { days?: number },
  ): Promise<{
    revision: number;
    stream: TopologyStreamNode;
    dateBuckets: Array<{ dateKey: string; count: number }>;
    authors: Array<{ author: string; count: number }>;
    hashtags: Array<{ name: string; count: number }>;
  }> {
    const qs = this.buildQuery(params || {});
    return this.request(`/api/v1/topology/streams/${encodeURIComponent(streamIdOrSlug)}${qs}`);
  }

  async getFeedTopology(
    feedIdOrSlug: string,
    params?: { days?: number },
  ): Promise<{
    revision: number;
    feed: TopologyFeedNode;
    dateBuckets: Array<{ dateKey: string; count: number }>;
    authors: Array<{ author: string; count: number }>;
    hashtags: Array<{ name: string; count: number }>;
  }> {
    const qs = this.buildQuery(params || {});
    return this.request(`/api/v1/topology/feeds/${encodeURIComponent(feedIdOrSlug)}${qs}`);
  }

  // ── 2. Honest Paginated Note Queries ────────────────────────────────────────

  async getNotesPage<T = any>(query: NotesPageQuery = {}): Promise<PaginatedNotesWindow<T>> {
    const safeLimit = Math.min(200, Math.max(1, query.limit ?? 30));
    const safeOffset = Math.max(0, query.offset ?? 0);
    const qs = this.buildQuery({ ...query, limit: safeLimit, offset: safeOffset });
    const res = await this.request<{ total: number; limit: number; offset: number; items: T[] }>(
      `/api/v1/notes${qs}`,
    );
    return {
      total: res.total,
      limit: res.limit,
      offset: res.offset,
      hasMore: res.offset + res.items.length < res.total,
      items: res.items,
    };
  }

  async getFeedNotesPage<T = any>(
    feedIdOrSlug: string,
    query: Omit<NotesPageQuery, 'feedId' | 'feedSlug'> = {},
  ): Promise<PaginatedNotesWindow<T>> {
    const safeLimit = Math.min(200, Math.max(1, query.limit ?? 30));
    const safeOffset = Math.max(0, query.offset ?? 0);
    const qs = this.buildQuery({ ...query, limit: safeLimit, offset: safeOffset });
    const res = await this.request<{ total: number; limit: number; offset: number; items: T[] }>(
      `/api/v1/feeds/${encodeURIComponent(feedIdOrSlug)}/notes${qs}`,
    );
    return {
      total: res.total,
      limit: res.limit,
      offset: res.offset,
      hasMore: res.offset + res.items.length < res.total,
      items: res.items,
    };
  }

  async getStreamNotesPage<T = any>(
    streamIdOrSlug: string,
    query: Omit<NotesPageQuery, 'streamSource'> = {},
  ): Promise<PaginatedNotesWindow<T>> {
    const safeLimit = Math.min(200, Math.max(1, query.limit ?? 30));
    const safeOffset = Math.max(0, query.offset ?? 0);
    const qs = this.buildQuery({ ...query, limit: safeLimit, offset: safeOffset });
    const res = await this.request<{ total: number; limit: number; offset: number; items: T[] }>(
      `/api/v1/streams/${encodeURIComponent(streamIdOrSlug)}/notes${qs}`,
    );
    return {
      total: res.total,
      limit: res.limit,
      offset: res.offset,
      hasMore: res.offset + res.items.length < res.total,
      items: res.items,
    };
  }

  // ── 3. Streams & Feeds CRUD (Admin API) ─────────────────────────────────────

  async ensureStream(input: {
    slug: string;
    title: string;
    description?: string;
    icon?: string;
    color?: string;
    privacy?: 'public' | 'private';
    feedIds?: string[];
    tags?: string[];
  }): Promise<any> {
    try {
      return await this.request(`/api/v1/streams/${encodeURIComponent(input.slug)}`);
    } catch {
      return this.request(`/api/v1/streams`, {
        method: 'POST',
        body: JSON.stringify(input),
      });
    }
  }

  async ensureFeed(input: {
    slug: string;
    title: string;
    description?: string;
    icon?: string;
    color?: string;
    privacy?: 'public' | 'private';
    folderPaths?: string[];
    hashtags?: string[];
  }): Promise<any> {
    try {
      return await this.request(`/api/v1/feeds/${encodeURIComponent(input.slug)}?includeNotes=false`);
    } catch {
      return this.request(`/api/v1/feeds`, {
        method: 'POST',
        body: JSON.stringify(input),
      });
    }
  }

  async attachFeedToStream(streamId: string, feedId: string): Promise<any> {
    return this.request(
      `/api/v1/streams/${encodeURIComponent(streamId)}/feeds/${encodeURIComponent(feedId)}`,
      { method: 'POST' },
    );
  }

  // ── 4. Notes Ingest, Create, Update & Delete ────────────────────────────────

  async ingestNote(input: IngestSeasonNoteInput): Promise<{
    success: boolean;
    action: 'CREATED' | 'UPDATED';
    isNew: boolean;
    noteId: string;
    note: any;
  }> {
    return this.request(`/api/v1/notes/ingest`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async createNote(input: Record<string, any>): Promise<any> {
    return this.request(`/api/v1/notes`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateNote(noteId: string, patch: Record<string, any>): Promise<any> {
    return this.request(`/api/v1/notes/${encodeURIComponent(noteId)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  }

  async deleteNote(noteId: string): Promise<any> {
    return this.request(`/api/v1/notes/${encodeURIComponent(noteId)}`, {
      method: 'DELETE',
    });
  }

  private buildQuery(params: Record<string, any>): string {
    const entries = Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== '',
    );
    if (entries.length === 0) return '';
    const searchParams = new URLSearchParams();
    for (const [k, v] of entries) {
      searchParams.set(k, String(v));
    }
    return `?${searchParams.toString()}`;
  }

  private async request<T = any>(path: string, init?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((init?.headers as Record<string, string>) || {}),
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
      headers['x-api-key'] = this.token;
    }

    const res = await this.fetchFn(`${this.baseUrl}${path}`, {
      ...init,
      headers,
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => res.statusText);
      throw new Error(`SeasonsApiClient HTTP ${res.status} on ${path}: ${errBody}`);
    }
    return (await res.json()) as T;
  }
}
