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
  isPublic?: boolean;
  visibility?: 'public' | 'private';
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
  /** Base URL of the Project Lenta NestJS backend (port 3001 by default). */
  serverUrl: string;
  /** Bearer token for authenticating with the Lenta backend. */
  authToken?: string;
  username?: string;
  userEmail?: string;
  isPrivateContainerConnected?: boolean;
  activeContainerId: string;
  /** Key of the connected Obsidian container. */
  containerKey: string;
  /** Optional metadata of the connected container */
  connectedContainerName?: string;
  connectedContainerType?: 'git' | 'simple';
  vaultRootFolder: string;
  autoSyncIntervalMinutes: number;
  defaultFeedSlug: string;
  lastSyncedAt: string;
  lastSyncedCommit: string;
  defaultConflictStrategy: ConflictStrategy;
  autoSyncOnEdit: boolean;

  /** Base URL of the Obsidian Container Sync Server (port 3000 by default). */
  containerServerUrl: string;
  /**
   * API key sent as `X-Api-Key` header to the container sync server.
   * Must match the `API_KEY` env var set on the server.
   * Leave empty when the server runs in open mode (no API_KEY set).
   */
  containerApiKey: string;
  containerPrivacyFilter: 'all' | 'public' | 'private';
}

export const DEFAULT_SETTINGS: LentaPluginSettings = {
  serverUrl: 'http://localhost:3001',
  authToken: '',
  username: '',
  userEmail: '',
  isPrivateContainerConnected: false,
  activeContainerId: '',
  containerKey: '',
  connectedContainerName: '',
  connectedContainerType: 'git',
  vaultRootFolder: 'Lenta',
  autoSyncIntervalMinutes: 0,
  defaultFeedSlug: '',
  lastSyncedAt: '',
  lastSyncedCommit: '',
  defaultConflictStrategy: 'create_backup_fork',
  autoSyncOnEdit: false,
  containerServerUrl: 'http://localhost:3000',
  containerApiKey: '',
  containerPrivacyFilter: 'all',
};

export interface CommitSummaryDto {
  hash: string;
  shortHash: string;
  author: string;
  authorEmail?: string;
  date: string;
  relativeDate?: string;
  message: string;
  body?: string;
  filesChanged?: number;
  insertions?: number;
  deletions?: number;
}

export interface CommitFileDiffDto {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied' | 'unmodified';
  patch?: string;
  insertions?: number;
  deletions?: number;
}

export interface CommitDetailDto extends CommitSummaryDto {
  files: CommitFileDiffDto[];
}

export interface FileVersionDto {
  commitHash: string;
  shortHash: string;
  path: string;
  content: string;
  author: string;
  date: string;
  message: string;
  patch?: string;
}

export interface RestoreFileVersionRequestDto {
  path: string;
  commitHash: string;
  message?: string;
}

