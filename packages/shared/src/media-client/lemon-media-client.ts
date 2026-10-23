/**
 * Lemon Media Hub — Standalone Client SDK
 * Lightweight TypeScript client for consuming Lemon Media Hub APIs
 * from Lemon Calendarium, Admin CMS, Calendar App, or any external service.
 */

export interface MediaFolder {
  id: string;
  name: string;
  path: string;
  description?: string;
  isSystem?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFolderDto {
  name: string;
  path: string;
  description?: string;
}

export interface MediaAsset {
  id: string;
  url: string;
  thumbnailUrl: string;
  filename: string;
  prompt: string;
  userPrompt?: string;
  style?: string;
  aspectRatio: string;
  model: string;
  width: number | null;
  height: number | null;
  sizeBytes: number;
  mimeType: string;
  tags: string[];
  folderId?: string;
  folderPath?: string;
  sourceAssetId?: string;
  sourceNoteId?: string;
  isFavorite: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface QueryAssetsOptions {
  folderId?: string;
  folderPath?: string;
  search?: string;
  style?: string;
  tag?: string;
  isFavorite?: boolean;
  limit?: number;
  offset?: number;
}

export interface GenerateImagesRequest {
  prompt: string;
  style?: string;
  aspectRatio?: '16:9' | '1:1' | '9:16' | '4:3' | '3:4';
  folderPath?: string;
  count?: number;
  tags?: string[];
  context?: string;
}

export interface RemixImageRequest {
  sourceAssetId: string;
  instruction: string;
  style?: string;
  aspectRatio?: '16:9' | '1:1' | '9:16' | '4:3' | '3:4';
  folderPath?: string;
  count?: number;
}

export interface GenerateNoteRequest {
  title?: string;
  topic?: string;
  tags?: string[];
  tone?: 'professional' | 'creative' | 'concise' | 'academic';
}

export interface QuickAddResult {
  title: string;
  content: string;
  tags: string[];
  eventDate: string | null;
  priority: 'low' | 'normal' | 'high';
  suggestedCoverPrompt: string;
}

export class LemonMediaClient {
  readonly baseUrl: string;

  constructor(options?: { baseUrl?: string }) {
    this.baseUrl = (options?.baseUrl || 'http://localhost:3005').replace(/\/$/, '');
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    };

    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`LemonMediaClient error (${res.status} ${res.statusText}): ${errBody}`);
    }

    return res.json();
  }

  // --- Folders API ---
  readonly folders = {
    list: async (): Promise<MediaFolder[]> => {
      return this.request<MediaFolder[]>('/api/folders');
    },

    create: async (data: { name: string; path: string; description?: string }): Promise<MediaFolder> => {
      return this.request<MediaFolder>('/api/folders', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    delete: async (id: string): Promise<{ success: boolean }> => {
      return this.request<{ success: boolean }>(`/api/folders/${id}`, {
        method: 'DELETE',
      });
    },
  };

  // --- Assets API ---
  readonly assets = {
    list: async (query?: QueryAssetsOptions): Promise<{ items: MediaAsset[]; total: number }> => {
      const params = new URLSearchParams();
      if (query?.folderId) params.append('folderId', query.folderId);
      if (query?.folderPath) params.append('folderPath', query.folderPath);
      if (query?.search) params.append('search', query.search);
      if (query?.style) params.append('style', query.style);
      if (query?.tag) params.append('tag', query.tag);
      if (query?.isFavorite !== undefined) params.append('isFavorite', String(query.isFavorite));
      if (query?.limit) params.append('limit', String(query.limit));
      if (query?.offset) params.append('offset', String(query.offset));

      const qs = params.toString();
      return this.request<{ items: MediaAsset[]; total: number }>(`/api/assets${qs ? `?${qs}` : ''}`);
    },

    getById: async (id: string): Promise<MediaAsset> => {
      return this.request<MediaAsset>(`/api/assets/${id}`);
    },

    toggleFavorite: async (id: string): Promise<MediaAsset> => {
      return this.request<MediaAsset>(`/api/assets/${id}/favorite`, {
        method: 'PATCH',
      });
    },

    incrementUsage: async (id: string): Promise<{ success: boolean }> => {
      return this.request<{ success: boolean }>(`/api/assets/${id}/usage`, {
        method: 'POST',
      });
    },

    delete: async (id: string): Promise<{ success: boolean }> => {
      return this.request<{ success: boolean }>(`/api/assets/${id}`, {
        method: 'DELETE',
      });
    },
  };

  // --- AI Engine API ---
  readonly ai = {
    status: async (): Promise<{ configured: boolean; textModels: string[]; imageModels: string[] }> => {
      return this.request('/api/ai/status');
    },

    generateText: async (prompt: string, systemInstruction?: string, temperature = 0.7): Promise<{ text: string }> => {
      return this.request<{ text: string }>('/api/ai/generate-text', {
        method: 'POST',
        body: JSON.stringify({ prompt, systemInstruction, temperature }),
      });
    },

    generateNote: async (req: GenerateNoteRequest): Promise<{ title: string; content: string; tags: string[]; summary: string }> => {
      return this.request('/api/ai/generate-note', {
        method: 'POST',
        body: JSON.stringify(req),
      });
    },

    parseQuickAdd: async (rawText: string): Promise<QuickAddResult> => {
      return this.request<QuickAddResult>('/api/ai/parse-quick-add', {
        method: 'POST',
        body: JSON.stringify({ rawText }),
      });
    },

    generateImages: async (
      dto: GenerateImagesRequest,
    ): Promise<{
      synthesizedPrompt: string;
      model: string;
      isFallback: boolean;
      folderPath: string;
      items: MediaAsset[];
    }> => {
      return this.request('/api/ai/generate-images', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },

    remixImage: async (
      dto: RemixImageRequest,
    ): Promise<{
      sourceAsset: MediaAsset;
      remixPrompt: string;
      description: string;
      model: string;
      isFallback: boolean;
      folderPath: string;
      items: MediaAsset[];
    }> => {
      return this.request('/api/ai/remix-image', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
  };

  /**
   * Resolves a relative asset URL (e.g. `/uploads/media/xyz.webp`) to an absolute URL on the media hub.
   */
  resolveUrl(relativeUrl: string): string {
    if (!relativeUrl) return '';
    if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) return relativeUrl;
    return `${this.baseUrl}${relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`}`;
  }
}
