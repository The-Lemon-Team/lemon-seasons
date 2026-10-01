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

export type FolderPrivacy = 'private' | 'public' | 'obsidian';
export type FolderScope = 'external' | 'internal';

export interface Folder {
  id: string;
  name: string;
  path: string;
  icon: string | null;
  color: string | null;
  privacy?: FolderPrivacy;
  containerId?: string | null;
  scope?: FolderScope;
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
  containerId?: string | null;
  scope?: FolderScope;
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
  containerId?: string | null;
  filePath?: string | null;
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
  curator?: string | null;
  resonanceScore?: number | null;
  parentNoteId?: string | null;
  parentNote?: Note | null;
  childNotes?: Note[];
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
  containerId?: string;
  containers?: string[] | string;
  userId?: string;
  curator?: string;
  minResonance?: number;
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
  feedId?: string;
  containerId?: string | null;
  title: string;
  description?: string;
  type: NoteType;
  startDate: string;
  endDate?: string | null;
  sourceLink?: string;
  icon?: string;
  curator?: string;
  resonanceScore?: number;
  parentNoteId?: string;
  tagIds?: string[];
  hashtags?: string[];
  folders?: (string | FolderInputItem)[];
  folder?: string;
  folderIds?: string[];
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
  containerId?: string | null;
  curator?: string | null;
  resonanceScore?: number | null;
  parentNoteId?: string | null;
  tagIds?: string[];
  hashtags?: string[];
  folders?: (string | FolderInputItem)[];
  folder?: string;
  folderIds?: string[];
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
  containerId?: string | null;
  scope?: FolderScope;
}

export interface UpdateFolderInput {
  name?: string;
  path?: string;
  icon?: string;
  color?: string;
  privacy?: FolderPrivacy;
  containerId?: string | null;
  scope?: FolderScope;
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
  curator?: string;
  persona?: string;
  assistants?: string[];
  resonance_score?: number | null;
  parent_note_id?: string | null;
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
  containers?: string[];
  obsidianFolders?: string[];
  tags: string[];
  hashtags: string[];
  types: NoteType[];
  search: string;
  curator?: string;
  minResonance?: number;
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
  externalFolderId?: string;
  scope?: FolderScope;
}

export interface ObsidianContainer {
  id: string;
  name: string;
  title?: string;
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
  title?: string;
  vaultPath: string;
  isPrivate: boolean;
  token: string;
  createdAt: string;
  lastSyncedAt?: string;
  notesCount: number;
}

// AI Quick Add & Chat Parse Types
export interface ParsedNoteCard {
  tempId: string;
  title: string;
  type: NoteType;
  displayType: string;
  startDate: string;
  endDate?: string | null;
  feedId?: string;
  feedSlug?: string;
  feedTitle?: string;
  folder?: string;
  taxonomyPath?: string;
  tagIds?: string[];
  hashtags?: string[];
  icon?: string;
  sourceLink?: string;
  description?: string;
  curator?: string;
  resonanceScore?: number;
  selected?: boolean;
}

export interface ParseNotesContext {
  defaultDate?: string;
  defaultFeedId?: string;
  defaultFeedSlug?: string;
  defaultContainerId?: string;
  defaultFolder?: string;
  availableTaxonomy?: string[];
  availableFeeds?: Array<{ id: string; title: string; slug: string }>;
  useExternalAi?: boolean;
  templateId?: string;
}

export interface ParseNotesInput {
  text: string;
  context?: ParseNotesContext;
}

export interface ParseNotesResponse {
  cards: ParsedNoteCard[];
  rawText?: string;
}

export interface BatchCreateNotesInput {
  notes: CreateNoteInput[];
}

export interface BatchCreateNotesResponse {
  createdCount: number;
  notes: Note[];
}

export interface SystemStats {
  notesTotal: number;
  notesByType: Record<string, number>;
  feedsCount: number;
  containersCount: {
    total: number;
    public: number;
    private: number;
  };
  foldersCount: number;
  taxonomyCount: number;
  hashtagsCount: number;
  activeKeysCount: number;
  usersCount: number;
  storage: {
    imagesCount: number;
    totalBytes: number;
  };
  system: {
    status: 'healthy' | 'degraded';
    uptime: number;
    lastActivityAt?: string;
    database: string;
  };
}

// ---------------------------------------------------------------------------
// Chat Architecture Types (Folders, Threads & Persisted Messages)
// ---------------------------------------------------------------------------

export type ChatType = 'DIRECT' | 'GROUP';

export interface ChatFolder {
  id: string;
  name: string;
  path: string;
  icon?: string | null;
  color?: string | null;
  order: number;
  parentId?: string | null;
  parent?: ChatFolder | null;
  children?: ChatFolder[];
  threads?: ChatThread[];
  _count?: {
    threads: number;
  };
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface ChatThread {
  id: string;
  title: string;
  type: ChatType;
  folderId?: string | null;
  folder?: ChatFolder | null;
  targetAgent?: string | null;
  participantAgents: string[];
  dateScope?: string | null;
  isPinned: boolean;
  isArchived: boolean;
  lastMessageAt?: string | null;
  messages?: ChatMessageRecord[];
  _count?: {
    messages: number;
  };
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface ChatMessageRecord {
  id: string;
  threadId: string;
  sender: string;
  senderName: string;
  senderRole: string;
  avatar?: string | null;
  text: string;
  resonanceScore?: number | null;
  sources?: string[];
  resonanceNodes?: any;
  groupSummary?: any;
  suggestedCard?: any;
  createdAt: string;
}

export interface CreateChatFolderInput {
  name: string;
  path?: string;
  icon?: string;
  color?: string;
  order?: number;
  parentId?: string;
}

export interface UpdateChatFolderInput {
  name?: string;
  path?: string;
  icon?: string;
  color?: string;
  order?: number;
  parentId?: string | null;
}

export interface CreateChatThreadInput {
  title: string;
  type?: ChatType;
  folderId?: string;
  targetAgent?: string;
  participantAgents?: string[];
  dateScope?: string;
  isPinned?: boolean;
}

export interface UpdateChatThreadInput {
  title?: string;
  folderId?: string | null;
  targetAgent?: string;
  participantAgents?: string[];
  dateScope?: string | null;
  isPinned?: boolean;
  isArchived?: boolean;
}

export interface SendThreadMessageInput {
  message: string;
  forcedTarget?: string;
  date?: string;
}

// ==========================================
// Distributed Sync, Sessions & Commit Contracts
// ==========================================

export type SyncSessionStatus = 'ACTIVE' | 'COMMITTED' | 'CANCELLED';

export type PendingChangeAction = 'UPSERT' | 'DELETE' | 'INSERT';

export type PendingChangeEntityType =
  | 'NOTE'
  | 'CHAT_THREAD'
  | 'CHAT_MESSAGE'
  | 'LINK'
  | 'FOLDER'
  | 'TAG';

export interface PendingChange {
  id: string;
  sessionId: string;
  entityType: PendingChangeEntityType;
  entityId: string;
  action: PendingChangeAction;
  payload: any;
  createdAt: string;
}

export interface SyncSession {
  id: string;
  title: string;
  deviceId: string;
  author: string;
  status: SyncSessionStatus;
  startedAt: string;
  closedAt?: string | null;
  summary?: string | null;
  changes?: PendingChange[];
  commit?: SyncCommit | null;
  _count?: {
    changes: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SyncCommit {
  id: string;
  parentCommitIds: string[];
  deviceId: string;
  author: string;
  sessionId?: string | null;
  session?: SyncSession | null;
  summary?: string | null;
  entitiesCount: number;
  payloadJson: CommitPackage;
  isPushed: boolean;
  pushedAt?: string | null;
  createdAt: string;
}

export interface CommitPackage {
  commitId: string;
  parentCommitIds: string[];
  deviceId: string;
  author: string;
  timestamp: string; // ISO 8601
  session: {
    sessionId: string;
    title: string;
    summary?: string;
  };
  changes: {
    notes?: Array<{
      action: 'UPSERT' | 'DELETE';
      id: string;
      version: number;
      data?: Partial<Note>;
    }>;
    chatThreads?: Array<{
      action: 'UPSERT' | 'DELETE';
      id: string;
      data?: Partial<ChatThread>;
    }>;
    chatMessages?: Array<{
      action: 'INSERT';
      id: string;
      threadId: string;
      sender: string;
      senderName: string;
      senderRole: string;
      avatar?: string | null;
      text: string;
      createdAt: string;
      resonanceScore?: number | null;
      sources?: string[];
    }>;
    links?: Array<{
      action: 'INSERT' | 'DELETE';
      id: string;
      url: string;
      title?: string | null;
      noteId?: string;
    }>;
    folders?: Array<{
      action: 'UPSERT' | 'DELETE';
      id: string;
      path: string;
      name: string;
    }>;
  };
}

export interface DeviceRef {
  deviceId: string;
  deviceName?: string;
  headCommitId: string;
  updatedAt: string;
}

export interface GDriveAuthStatus {
  authenticated: boolean;
  userEmail?: string | null;
  tokenExpiry?: string | null;
}

export interface SyncStatusResponse {
  deviceId: string;
  activeSession: SyncSession | null;
  lastCommit: {
    id: string;
    createdAt: string;
    entitiesCount: number;
    summary?: string | null;
    isPushed: boolean;
  } | null;
  pendingChangesCount: number;
  gdrive: {
    connected: boolean;
    userEmail?: string | null;
    remoteHeadCommitId?: string | null;
    unpushedCommitsCount: number;
  };
}

export interface StartSessionInput {
  title?: string;
  author?: string;
  deviceId?: string;
}

export interface CommitSessionInput {
  summary?: string;
  autoPush?: boolean;
}

export interface RecordChangeInput {
  entityType: PendingChangeEntityType;
  entityId: string;
  action: PendingChangeAction;
  payload: any;
}

export interface GDriveSyncResult {
  pushedCommits: string[];
  pulledCommits: string[];
  conflictNotes: string[];
  syncedAt: string;
}

// ---------------------------------------------------------------------------
// Curator vs Operational Worker Agent Types (Lenta Architecture)
// ---------------------------------------------------------------------------

export type CuratorId = 'ivan-bely' | 'kirk-kitten' | 'okatsiya' | 'chen-wei';

export type WorkerAgentId =
  | 'harvester-agent'
  | 'survey-coordinator'
  | 'sidework-producer'
  | 'podcast-agent'
  | 'independent-analyst'
  | 'dispatcher';

export type AgentRoleType = 'curator' | 'operational_agent' | 'user';

export type SurveyTimeframe = 'today' | 'yesterday' | 'three_days' | 'week' | 'custom';

export interface CuratorSurveyRequest {
  targetCurators?: (CuratorId | string)[] | 'all';
  groupId?: string; // e.g. 'political-group', 'tech-group'
  timeframe: SurveyTimeframe;
  customStartDate?: string; // YYYY-MM-DD
  customEndDate?: string; // YYYY-MM-DD
  focusTopic?: string;
}

export interface CuratorTake {
  curatorId: string;
  curatorName: string;
  emoji: string;
  domain: string;
  itemsCount: number;
  keyTheses: string[];
  resonancePoints: string[];
  sourceCitations: string[];
}

export interface CrossDomainResonance {
  title: string;
  score: number;
  involvedCurators: string[];
  analysis: string;
  suggestedFollowupPrompt?: string;
}

export interface CuratorSurveyResult {
  id: string;
  timeframe: SurveyTimeframe;
  dateRange: { from: string; to: string };
  requestedCurators: string[];
  headline: string;
  executiveSummary: string;
  curatorTakes: CuratorTake[];
  crossDomainResonances: CrossDomainResonance[];
  generatedAt: string;
}

export type SideWorkTaskType =
  | 'content_draft'      // Написание статьи, лонгрида, дайджеста, заметки типа DONE/EVENT/PERIOD
  | 'media_enrichment'   // Генерация промптов для иллюстраций (DALL-E, Midjourney), подбор визуалов, диаграммы Mermaid
  | 'expert_commentary'  // Дополнение аналитическим комментарием, фактчеком, историческим бэкграундом
  | 'digest_synthesis'   // Сводный дайджест по материалам опроса или новостной подборке
  | 'podcast_script';    // Аудио-сценарий NotebookLM

export interface SideWorkMediaItem {
  type: 'image_prompt' | 'mermaid_diagram' | 'quote_card' | 'key_stat' | 'external_media';
  title: string;
  content: string; // The prompt, Mermaid code, or quote text
  aspectRatio?: string;
  suggestedCaption?: string;
  styleKeywords?: string[];
}

export interface SideWorkCommentaryItem {
  curatorId: string;
  curatorName: string;
  emoji: string;
  commentary: string;
}

export interface SideWorkRequest {
  taskType: SideWorkTaskType;
  title?: string;
  sourceContext: string;
  sourceNewsIds?: string[];
  surveyResultId?: string;
  targetFormat?: 'obsidian_note' | 'telegram_post' | 'longread' | 'quick_brief';
  requestedCuratorCommentary?: (CuratorId | string)[];
  mediaPreferences?: {
    includeImagePrompts?: boolean;
    includeMermaidDiagrams?: boolean;
    style?: 'modern_minimal' | 'cyberpunk' | 'editorial_infographic' | 'realistic';
  };
}

export interface SideWorkResult {
  id: string;
  taskType: SideWorkTaskType;
  title: string;
  targetFormat: string;
  contentMarkdown: string;
  enrichedMedia: SideWorkMediaItem[];
  curatorCommentaries: SideWorkCommentaryItem[];
  suggestedObsidianFrontmatter?: Record<string, any>;
  createdAt: string;
}





