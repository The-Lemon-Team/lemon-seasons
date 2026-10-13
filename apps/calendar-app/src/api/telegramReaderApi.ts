export interface TelegramMediaItem {
  type: 'photo' | 'video' | 'audio' | 'voice' | 'document';
  url: string;
  thumbnailUrl?: string;
}

export interface TelegramChannelItem {
  id: string;
  username: string;
  title: string;
  description?: string | null;
  avatarUrl?: string | null;
  subscriberCount?: number | null;
  unreadCount?: number;
  lastPostId: number;
  lastCheckedAt?: string | null;
}

export interface TelegramFolderFeed {
  id: string;
  name: string;
  icon?: string | null;
  order: number;
  channelCount: number;
  unreadCount: number;
  channels: TelegramChannelItem[];
}

export interface TelegramFeedPost {
  id: string;
  channelId: string;
  channelUsername: string;
  channelTitle: string;
  channelAvatarUrl?: string | null;
  postId: number;
  postUrl: string;
  text?: string | null;
  htmlContent?: string | null;
  media: TelegramMediaItem[];
  mediaType: string;
  views?: number | null;
  publishedAt: string;
  createdAt: string;
  isUnread?: boolean;
}

export interface TelegramFeedPostsResponse {
  feedId: string;
  feedName: string;
  posts: TelegramFeedPost[];
  unreadCount: number;
  totalInFeed: number;
  hasMore: boolean;
  nextCursor?: string | null;
}

const DEFAULT_READER_BASE_URL = 'http://localhost:4000';
const DEFAULT_READER_KEY = 'twr_master_key_2026';

export class TelegramReaderApi {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl = DEFAULT_READER_BASE_URL, apiKey = DEFAULT_READER_KEY) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.apiKey = apiKey;
  }

  public setCredentials(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.apiKey = apiKey;
  }

  public getBaseUrl() {
    return this.baseUrl;
  }

  public getApiKey() {
    return this.apiKey;
  }

  /**
   * Fetches all thematic folders/feeds configured in telegram-web-reader.
   */
  async getFeeds(): Promise<TelegramFolderFeed[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/external/feeds`, {
        headers: {
          Accept: 'application/json',
          'X-API-Key': this.apiKey,
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }

      return await res.json();
    } catch (err: any) {
      console.warn(`[TelegramReaderApi] Failed to fetch external feeds: ${err.message}`);
      return [];
    }
  }

  /**
   * Fetches posts for a specific thematic folder with optional cursor-based pagination.
   */
  async getFeedPosts(
    feedId: string,
    limit = 20,
    beforeDate?: string | null
  ): Promise<TelegramFeedPostsResponse | null> {
    try {
      let query = `?limit=${limit}`;
      if (beforeDate) {
        query += `&beforeDate=${encodeURIComponent(beforeDate)}`;
      }

      const res = await fetch(`${this.baseUrl}/api/external/feeds/${feedId}/posts${query}`, {
        headers: {
          Accept: 'application/json',
          'X-API-Key': this.apiKey,
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }

      return await res.json();
    } catch (err: any) {
      console.warn(`[TelegramReaderApi] Failed to fetch external posts for feed ${feedId}: ${err.message}`);
      return null;
    }
  }

  /**
   * Marks all channels in a feed as read.
   */
  async markFeedAsRead(feedId: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/external/feeds/${feedId}/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify({ markAllRead: true }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const telegramReaderApi = new TelegramReaderApi();
