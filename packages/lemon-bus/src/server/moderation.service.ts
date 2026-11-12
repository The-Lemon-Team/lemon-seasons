import * as crypto from 'node:crypto';
import { BusDatabase } from './db.js';
import { SseManager } from './sse.js';
import type { UpstreamBusRelay } from './upstream-relay.js';
import { LemonBusEnvelope } from '../types/bus-contract.types.js';
import {
  LemonModerationItem,
  ModerationApprovalResult,
  ModerationBatchResult,
  ModerationQueryOptions,
  ModerationRejectResult,
  ModerationStats,
  PaginatedModerationItems,
} from '../types/moderation.types.js';

export interface ModerationServiceContext {
  db: BusDatabase;
  sse: SseManager;
  deviceId?: string;
  upstreamRelay?: UpstreamBusRelay;
}

export class ModerationService {
  constructor(private readonly ctx: ModerationServiceContext) {}

  queryItems(options: ModerationQueryOptions = {}): PaginatedModerationItems {
    return this.ctx.db.moderation.queryItems(options);
  }

  getItemById(id: string): LemonModerationItem | null {
    return this.ctx.db.moderation.getItem(id);
  }

  getStats(): ModerationStats {
    return this.ctx.db.moderation.getStats();
  }

  proposeItem(input: Partial<LemonModerationItem> & { title: string }): LemonModerationItem {
    const id = input.id || crypto.randomUUID();
    const item = this.ctx.db.moderation.upsertItem({
      ...input,
      id,
      status: 'PENDING',
      deviceId: input.deviceId || this.ctx.deviceId || 'direct-propose',
    });

    this.ctx.sse.broadcastModeration({
      type: 'MODERATION_ITEM_ADDED',
      action: 'PROPOSED',
      item,
      timestamp: new Date().toISOString(),
    });

    return item;
  }

  updateItem(id: string, patch: Partial<LemonModerationItem>): LemonModerationItem | null {
    const updated = this.ctx.db.moderation.updateItem(id, patch);
    if (updated) {
      this.ctx.sse.broadcastModeration({
        type: 'MODERATION_ITEM_UPDATED',
        action: 'UPDATED',
        item: updated,
        timestamp: new Date().toISOString(),
      });
    }
    return updated;
  }

  approveItem(
    id: string,
    overrides?: Partial<LemonModerationItem>,
    moderatorId?: string
  ): ModerationApprovalResult | null {
    const approvedItem = this.ctx.db.moderation.approveItem(id, overrides, moderatorId);
    if (!approvedItem) return null;

    const deviceId = this.ctx.deviceId || 'lemon-bus-moderator';

    // Form authoritative published NOTE envelope for downstream services
    const publishedEnvelope: Omit<LemonBusEnvelope, 'seq'> = {
      eventId: crypto.randomUUID(),
      entityType: 'NOTE',
      action: 'UPSERT',
      origin: approvedItem.origin || 'CODING_AGENT',
      transportVia: 'cloud',
      deviceId,
      streamSlug: approvedItem.streamSlug || null,
      feedSlug: approvedItem.feedSlug || null,
      externalId: approvedItem.sourceLink || approvedItem.id,
      contentHash: null,
      privacy: approvedItem.privacy || 'public',
      payload: {
        id: approvedItem.id,
        title: approvedItem.title,
        description: approvedItem.rawContent || approvedItem.summary || approvedItem.description,
        summary: approvedItem.summary || null,
        rawContent: approvedItem.rawContent || null,
        folderPath: approvedItem.folderPath || (approvedItem.category ? `Spark/${approvedItem.category}` : null),
        status: 'PUBLISHED',
        privacy: approvedItem.privacy,
        feedSlug: approvedItem.feedSlug,
        publicFeedId: approvedItem.feedSlug,
        type: approvedItem.type || 'SINGLE',
        startDate: approvedItem.startDate || new Date().toISOString(),
        endDate: approvedItem.endDate || null,
        sourceLink: approvedItem.sourceLink || null,
        sourceType: approvedItem.sourceType || 'LEMON_WATCHERS',
        origin: approvedItem.origin || 'CODING_AGENT',
        author: approvedItem.author || 'Lemon Watchers',
        resonanceScore: approvedItem.resonanceScore != null ? approvedItem.resonanceScore : null,
        icon: approvedItem.icon || '📰',
        hashtags: approvedItem.hashtags || [],
        provenance: {
          origin: approvedItem.origin || 'CODING_AGENT',
          transportVia: 'cloud',
          deviceId,
          actorId: approvedItem.moderatedBy || null,
        },
        metadata: {
          ...(approvedItem.metadata || {}),
          moderatedAt: approvedItem.moderatedAt,
          moderatedBy: approvedItem.moderatedBy,
          approvedVia: 'lemon-bus-moderation',
        },
      },
      timestamp: new Date().toISOString(),
    };

    // 1. Insert into event log
    const savedEvent = this.ctx.db.insertEvent(publishedEnvelope);

    // 2. Broadcast standard envelope to general subscribers (backend, mobile, frontend)
    this.ctx.sse.broadcast(savedEvent);

    // 3. Forward to upstream cloud bus if configured
    if (this.ctx.upstreamRelay) {
      this.ctx.upstreamRelay.publish(savedEvent).catch(() => {});
    }

    // 4. Broadcast dedicated moderation impulse
    this.ctx.sse.broadcastModeration({
      type: 'MODERATION_ITEM_APPROVED',
      action: 'APPROVED',
      noteId: approvedItem.id,
      item: approvedItem,
      publishedEvent: savedEvent,
      timestamp: new Date().toISOString(),
    });

    return {
      ok: true,
      action: 'APPROVED',
      item: approvedItem,
      publishedEvent: savedEvent,
    };
  }

  rejectItem(id: string, reason?: string, moderatorId?: string): ModerationRejectResult | null {
    const rejectedItem = this.ctx.db.moderation.rejectItem(id, reason, moderatorId);
    if (!rejectedItem) return null;

    this.ctx.sse.broadcastModeration({
      type: 'MODERATION_ITEM_REJECTED',
      action: 'REJECTED',
      noteId: rejectedItem.id,
      reason: rejectedItem.rejectReason,
      item: rejectedItem,
      timestamp: new Date().toISOString(),
    });

    return {
      ok: true,
      action: 'REJECTED',
      item: rejectedItem,
    };
  }

  batchApprove(ids: string[], moderatorId?: string): ModerationBatchResult {
    const processed: LemonModerationItem[] = [];
    const errors: Array<{ id: string; error: string }> = [];

    for (const id of ids) {
      try {
        const res = this.approveItem(id, undefined, moderatorId);
        if (res && res.item) {
          processed.push(res.item);
        } else {
          errors.push({ id, error: 'Item not found or already approved' });
        }
      } catch (err: any) {
        errors.push({ id, error: err?.message || 'Approval failed' });
      }
    }

    return {
      ok: errors.length === 0,
      processedCount: processed.length,
      failedCount: errors.length,
      items: processed,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  batchReject(ids: string[], reason?: string, moderatorId?: string): ModerationBatchResult {
    const processed: LemonModerationItem[] = [];
    const errors: Array<{ id: string; error: string }> = [];

    for (const id of ids) {
      try {
        const res = this.rejectItem(id, reason, moderatorId);
        if (res && res.item) {
          processed.push(res.item);
        } else {
          errors.push({ id, error: 'Item not found' });
        }
      } catch (err: any) {
        errors.push({ id, error: err?.message || 'Reject failed' });
      }
    }

    return {
      ok: errors.length === 0,
      processedCount: processed.length,
      failedCount: errors.length,
      items: processed,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  importWatcherItems(limit = 200): { imported: number; skipped: number } {
    const result = this.ctx.db.moderation.importWatcherItems(limit);
    if (result.imported > 0) {
      this.ctx.sse.broadcastModeration({
        type: 'MODERATION_ITEMS_IMPORTED',
        action: 'IMPORTED',
        importedCount: result.imported,
        timestamp: new Date().toISOString(),
      });
    }
    return result;
  }
}
