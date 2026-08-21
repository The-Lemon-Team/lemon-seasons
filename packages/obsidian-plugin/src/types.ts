export type NoteType = 'SINGLE' | 'PERIOD' | 'EVENT' | 'FILM_RELEASE' | 'MENTION' | 'DONE';

export interface LentaFeedDto {
  id: string;
  title: string;
  description?: string | null;
  slug: string;
  _count?: {
    notes: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface LentaTaxonomyNodeDto {
  id: string;
  name: string;
  path: string;
  icon?: string | null;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface LentaFolderDto {
  id: string;
  name: string;
  path: string;
  icon?: string | null;
  color?: string | null;
  noteCount?: number;
  updatedAt?: string;
}

export interface LentaNoteDto {
  id: string;
  feedId: string;
  feed?: LentaFeedDto;
  title: string;
  description?: string | null;
  type: NoteType;
  startDate: string;
  endDate?: string | null;
  sourceLink?: string | null;
  icon?: string | null;
  tags?: LentaTaxonomyNodeDto[];
  hashtags?: { id: string; name: string }[];
  folders?: {
    id: string;
    folderId: string;
    folder: LentaFolderDto;
    isPrimary: boolean;
    order: number;
  }[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface LentaFrontmatter {
  id?: string;
  title?: string;
  feed?: string;
  type?: NoteType;
  startDate?: string;
  endDate?: string;
  taxonomy?: string;
  folders?: string[];
  sourceLink?: string;
  icon?: string;
  tags?: string[];
  [key: string]: any;
}

export type ConflictStrategy = 'client_wins' | 'server_wins' | 'create_backup_fork' | 'manual_merge';

export interface LentaContainerScope {
  type: 'all' | 'feed' | 'preset';
  feedSlug?: string;
  taxonomyPath?: string;
  noteType?: NoteType;
  startDateFrom?: string;
  startDateTo?: string;
  folderPath?: string;
}

export interface LentaContainerSummaryDto {
  id: string;
  name: string;
  type: 'git' | 'simple';
  scope: LentaContainerScope;
  totalNotes: number;
  currentCommit?: string;
  lastCommitMessage?: string;
  lastCommitDate?: string;
}

export interface FileDiffItemDto {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'unmodified' | 'conflict';
  patch?: string;
  clientContent?: string;
  serverContent?: string;
  metadata?: {
    title?: string;
    tags?: string[];
    frontmatter?: Record<string, any>;
  };
}

export interface LentaPluginSettings {
  serverUrl: string;
  activeContainerId: string;
  vaultRootFolder: string;
  autoSyncIntervalMinutes: number;
  defaultFeedSlug: string;
  lastSyncedAt: string;
  lastSyncedCommit: string;
  defaultConflictStrategy: ConflictStrategy;
}

export const DEFAULT_SETTINGS: LentaPluginSettings = {
  serverUrl: 'http://localhost:3001',
  activeContainerId: 'feed-all',
  vaultRootFolder: 'Lenta',
  autoSyncIntervalMinutes: 0,
  defaultFeedSlug: '',
  lastSyncedAt: '',
  lastSyncedCommit: '',
  defaultConflictStrategy: 'create_backup_fork',
};
