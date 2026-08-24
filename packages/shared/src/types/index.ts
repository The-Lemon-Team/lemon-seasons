import { NoteType, ConflictStrategy } from '../constants';

export interface Feed {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  _count?: {
    notes: number;
  };
  notes?: Note[];
}

export type FolderPrivacy = 'private' | 'public';

export interface Folder {
  id: string;
  name: string;
  path: string;
  icon: string | null;
  color: string | null;
  privacy?: FolderPrivacy;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  _count?: {
    noteFolders: number;
  };
}

export interface FolderTreeNode {
  id: string;
  name: string;
  path: string;
  icon: string | null;
  color: string | null;
  privacy?: FolderPrivacy;
  notesCount: number;
  directNotesCount: number;
  updatedAt: string;
  deletedAt: string | null;
  children: FolderTreeNode[];
}

export interface NoteFolder {
  id: string;
  noteId: string;
  folderId: string;
  isPrimary: boolean;
  order: number;
  folder?: Folder;
}

export interface FolderInputItem {
  path: string;
  isPrimary?: boolean;
  order?: number;
}

export interface TaxonomyNode {
  id: string;
  name: string;
  path: string;
  icon: string | null;
  updatedAt: string;
  deletedAt: string | null;
  _count?: {
    notes: number;
  };
}

export interface TaxonomyTreeNode {
  id: string;
  name: string;
  path: string;
  icon: string | null;
  notesCount: number;
  updatedAt: string;
  deletedAt: string | null;
  children: TaxonomyTreeNode[];
}

export interface Hashtag {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  _count?: {
    notes: number;
  };
}

export interface NoteImage {
  id: string;
  noteId: string;
  url: string;
  thumbnailUrl?: string | null;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  caption?: string | null;
  alt?: string | null;
  isMain: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface NoteLink {
  id: string;
  noteId: string;
  url: string;
  title?: string | null;
  isSource: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteLinkInput {
  url: string;
  title?: string;
  isSource?: boolean;
  order?: number;
}

export interface UpdateNoteLinkInput {
  url?: string;
  title?: string;
  isSource?: boolean;
  order?: number;
}

export interface Note {
  id: string;
  feedId: string;
  feed?: Feed;
  title: string;
  description: string | null;
  type: NoteType;
  startDate: string;
  endDate: string | null;
  sourceLink: string | null;
  icon: string | null;
  tags: TaxonomyNode[];
  hashtags?: Hashtag[];
  folders?: NoteFolder[];
  images?: NoteImage[];
  links?: NoteLink[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface QueryNotesParams {
  feedId?: string;
  feedSlug?: string;
  type?: NoteType;
  startDateFrom?: string;
  startDateTo?: string;
  endDateFrom?: string;
  endDateTo?: string;
  queryStart?: string;
  queryEnd?: string;
  overlapStart?: string;
  overlapEnd?: string;
  tagId?: string;
  tagPath?: string;
  hashtag?: string;
  hashtagId?: string;
  folder?: string;
  folderId?: string;
  folderPrefix?: string;
  unfiled?: boolean;
  search?: string;
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
}

export interface NotesResponse {
  total: number;
  limit: number;
  offset: number;
  items: Note[];
}

export interface CreateNoteInput {
  feedId: string;
  title: string;
  description?: string;
  type: NoteType;
  startDate: string;
  endDate?: string | null;
  sourceLink?: string;
  icon?: string;
  tagIds?: string[];
  hashtags?: string[];
  folders?: (string | FolderInputItem)[];
  folder?: string;
  links?: CreateNoteLinkInput[];
  suggestFolder?: boolean;
}

export interface UpdateNoteInput {
  title?: string;
  description?: string;
  type?: NoteType;
  startDate?: string;
  endDate?: string | null;
  sourceLink?: string;
  icon?: string;
  feedId?: string;
  tagIds?: string[];
  hashtags?: string[];
  folders?: (string | FolderInputItem)[];
  links?: CreateNoteLinkInput[];
}

export interface CreateFeedInput {
  title: string;
  description?: string;
  slug?: string;
}

export interface CreateFolderInput {
  name?: string;
  path: string;
  icon?: string;
  color?: string;
  privacy?: FolderPrivacy;
}

export interface UpdateFolderInput {
  name?: string;
  path?: string;
  icon?: string;
  color?: string;
  privacy?: FolderPrivacy;
}

export interface CreateTaxonomyInput {
  name: string;
  path: string;
  icon?: string;
}

export interface UpdateTaxonomyInput {
  name?: string;
  path?: string;
  icon?: string;
}

export interface SyncChangesResponse {
  syncedAt: string;
  since: string;
  counts: {
    feeds: number;
    notes: number;
    taxonomy: number;
    hashtags?: number;
    folders?: number;
  };
  feeds: Feed[];
  notes: Note[];
  taxonomy: TaxonomyNode[];
  hashtags?: Hashtag[];
  folders?: Folder[];
}

// Frontmatter Structure
export interface LentaFrontmatter {
  lenta_id?: string;
  id?: string; // fallback alias
  title?: string;
  feed?: string;
  type?: NoteType;
  start_date?: string;
  startDate?: string; // fallback alias
  end_date?: string | null;
  endDate?: string | null; // fallback alias
  primary_folder?: string;
  folders?: string[];
  taxonomy?: string[];
  tags?: string[];
  links?: Array<{
    title?: string;
    url: string;
    is_source?: boolean;
    order?: number;
  }>;
  cover_image?: string;
  icon?: string;
  sourceLink?: string;
  source_link?: string;
  updated_at?: string;
  updatedAt?: string;
  deleted?: boolean;
  [key: string]: any;
}

export interface ParsedMarkdownNote {
  frontmatter: LentaFrontmatter;
  body: string;
  title: string;
  hashtags: string[];
  lentaId?: string;
}

// Sync Ledger Types
export interface SyncLedgerEntry {
  lentaId: string;
  localPath: string;
  lastServerUpdatedAt: string;
  lastLocalModifiedAt: number;
  fieldsHash: {
    title?: string;
    description?: string;
    type?: string;
    startDate?: string;
    endDate?: string | null;
    primaryFolder?: string;
    folders?: string;
    taxonomy?: string;
    tags?: string;
  };
}

export interface SyncLedger {
  lastSyncTimestamp: string | null;
  vaultRootFolder: string;
  entries: Record<string, SyncLedgerEntry>;
}

export interface FileDiffItemDto {
  path: string;
  status: 'new' | 'modified' | 'deleted' | 'conflict';
  clientContent?: string;
  serverContent?: string;
  metadata?: Record<string, any>;
  fieldConflicts?: string[];
}

// Calendar View Types & URL Filter State
export type CalendarViewMode = 'timeline' | 'gantt' | 'month' | 'feeds' | 'obsidian' | 'folders';

export interface CalendarFilterState {
  start: string;
  end: string;
  view: CalendarViewMode;
  feed?: string;
  tags: string[];
  hashtags: string[];
  types: NoteType[];
  search: string;
}

// User & Privacy Access Types
export type UserRole = 'guest' | 'user' | 'admin';

export type KeyProvider = 'obsidian' | 'telegram' | 'github' | 'api' | (string & {});

export interface KeyProviderMeta {
  id: KeyProvider;
  name: string;
  icon: string;
  description: string;
  keyPrefix: string;
  available: boolean;
}

export interface UserKey {
  id: string;
  userId: string;
  name: string;
  provider: KeyProvider;
  key: string;
  createdAt: string;
  lastUsedAt?: string;
  isRevoked?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  keys?: UserKey[];
  createdAt: string;
}

export interface AuthSession {
  token: string;
  user: User;
}

export interface LoginInput {
  email: string;
  password?: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password?: string;
}

export interface PublicFeedPreset {
  id: string;
  title: string;
  slug: string;
  icon: string;
  category: string;
  description: string;
  color: string;
  count?: number;
}

export type ContainerPrivacy = 'private' | 'public';

export type ContainerObserveMode = 'all' | 'filtered' | 'recursive';

export interface BoundFolder {
  id: string;
  path: string;
  name?: string;
  isPrimary?: boolean;
  observeMode: ContainerObserveMode;
  filterTag?: string;
  notesCount?: number;
  status?: 'active' | 'paused';
  privacy?: FolderPrivacy;
}

export interface ObsidianContainer {
  id: string;
  name: string;
  description?: string;
  vaultPath: string;
  privacy: ContainerPrivacy;
  token: string;
  boundFolders: BoundFolder[];
  notesCount: number;
  createdAt: string;
  lastSyncedAt?: string;
  status: 'connected' | 'idle' | 'syncing' | 'error';
  color?: string;
}

export interface PrivateContainer {
  id: string;
  name: string;
  vaultPath: string;
  isPrivate: boolean;
  token: string;
  createdAt: string;
  lastSyncedAt?: string;
  notesCount: number;
}


