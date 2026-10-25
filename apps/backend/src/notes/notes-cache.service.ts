import { Injectable, Logger } from '@nestjs/common';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

@Injectable()
export class NotesCacheService {
  private readonly logger = new Logger(NotesCacheService.name);
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL_MS = 20_000; // 20 seconds TTL

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set<T>(key: string, data: T, ttlMs: number = this.DEFAULT_TTL_MS): void {
    // Keep max 100 cached queries in memory for lightweight production footprint
    if (this.cache.size >= 100) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  invalidateAll(): void {
    const size = this.cache.size;
    if (size > 0) {
      this.cache.clear();
      this.logger.debug(`Notes cache invalidated (${size} entries cleared)`);
    }
  }

  generateKey(prefix: string, params: Record<string, any>): string {
    const sortedKeys = Object.keys(params).sort();
    const sortedParams: Record<string, any> = {};
    for (const k of sortedKeys) {
      if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
        sortedParams[k] = params[k];
      }
    }
    return `${prefix}:${JSON.stringify(sortedParams)}`;
  }
}
