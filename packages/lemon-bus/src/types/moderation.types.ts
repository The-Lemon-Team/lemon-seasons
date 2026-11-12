import { NoteOrigin } from './provenance.types.js';
import { LemonBusEnvelope } from './bus-contract.types.js';

export type ModerationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface LemonModerationItem {
  id: string;
  title: string;
  description?: string | null;
  summary?: string | null;
  rawContent?: string | null;
  folderPath?: string | null;
  feedSlug?: string | null;
  streamSlug?: string | null;
  category?: string | null;
  type: string;
  privacy: 'public' | 'private';
  startDate?: string | null;
  endDate?: string | null;
  sourceLink?: string | null;
  sourceType?: string | null;
  origin: NoteOrigin;
  author?: string | null;
  resonanceScore?: number | null;
  icon?: string | null;
  hashtags: string[];
  status: ModerationStatus;
  rejectReason?: string | null;
  moderatedAt?: string | null;
  moderatedBy?: string | null;
  metadata: Record<string, any>;
  deviceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ModerationQueryOptions {
  status?: ModerationStatus | 'ALL';
  feedSlug?: string;
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'resonanceScore' | 'startDate';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedModerationItems {
  items: LemonModerationItem[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface ModerationStats {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  totalCount: number;
}

export interface ModerationApprovalResult {
  ok: boolean;
  action: 'APPROVED';
  item: LemonModerationItem;
  publishedEvent: LemonBusEnvelope;
}

export interface ModerationRejectResult {
  ok: boolean;
  action: 'REJECTED';
  item: LemonModerationItem;
}

export interface ModerationBatchResult {
  ok: boolean;
  processedCount: number;
  failedCount: number;
  items: LemonModerationItem[];
  errors?: Array<{ id: string; error: string }>;
}
