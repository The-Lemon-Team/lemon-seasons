import {
  LemonModerationItem,
  ModerationApprovalResult,
  ModerationBatchResult,
  ModerationQueryOptions,
  ModerationRejectResult,
  ModerationStats,
  PaginatedModerationItems,
} from '@lenta/lemon-bus';

export interface ModerationApiClientOptions {
  baseUrl: string;
  token?: string;
  fetchImpl?: typeof fetch;
}

export class ModerationApiClient {
  public readonly baseUrl: string;
  private token?: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: ModerationApiClientOptions) {
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

  async getStats(): Promise<ModerationStats> {
    return this.request<ModerationStats>('/moderation/stats');
  }

  async queryItems(options: ModerationQueryOptions = {}): Promise<PaginatedModerationItems> {
    const qs = this.buildQuery(options);
    return this.request<PaginatedModerationItems>(`/moderation/notes${qs}`);
  }

  async getItem(id: string): Promise<LemonModerationItem> {
    return this.request<LemonModerationItem>(`/moderation/notes/${encodeURIComponent(id)}`);
  }

  async proposeItem(
    item: Partial<LemonModerationItem> & { title: string }
  ): Promise<{ ok: boolean; item: LemonModerationItem }> {
    return this.request('/moderation/notes', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }

  async approveItem(
    id: string,
    overrides?: Partial<LemonModerationItem>,
    moderatorId?: string
  ): Promise<ModerationApprovalResult> {
    return this.request<ModerationApprovalResult>(`/moderation/notes/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
      body: JSON.stringify({ overrides, moderatorId }),
    });
  }

  async rejectItem(
    id: string,
    reason?: string,
    moderatorId?: string
  ): Promise<ModerationRejectResult> {
    return this.request<ModerationRejectResult>(`/moderation/notes/${encodeURIComponent(id)}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason, moderatorId }),
    });
  }

  async updateItem(
    id: string,
    patch: Partial<LemonModerationItem>
  ): Promise<{ ok: boolean; item: LemonModerationItem }> {
    return this.request(`/moderation/notes/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  }

  async batchApprove(ids: string[], moderatorId?: string): Promise<ModerationBatchResult> {
    return this.request<ModerationBatchResult>('/moderation/notes/batch-approve', {
      method: 'POST',
      body: JSON.stringify({ ids, moderatorId }),
    });
  }

  async batchReject(ids: string[], reason?: string, moderatorId?: string): Promise<ModerationBatchResult> {
    return this.request<ModerationBatchResult>('/moderation/notes/batch-reject', {
      method: 'POST',
      body: JSON.stringify({ ids, reason, moderatorId }),
    });
  }

  async importWatcherItems(limit = 200): Promise<{ ok: boolean; imported: number; skipped: number }> {
    return this.request('/moderation/import-watcher-items', {
      method: 'POST',
      body: JSON.stringify({ limit }),
    });
  }

  private buildQuery(params: Record<string, any>): string {
    const entries = Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== ''
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
      headers['apikey'] = this.token;
    }

    const res = await this.fetchFn(`${this.baseUrl}${path}`, {
      ...init,
      headers,
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => res.statusText);
      throw new Error(`ModerationApiClient HTTP ${res.status} on ${path}: ${errBody}`);
    }
    return (await res.json()) as T;
  }
}
