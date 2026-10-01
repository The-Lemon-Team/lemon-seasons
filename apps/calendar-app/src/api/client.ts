import axios from 'axios';
import {
  Note,
  Feed,
  TaxonomyTreeNode,
  TaxonomyNode,
  Hashtag,
  NotesResponse,
  QueryNotesParams,
  Folder,
  FolderTreeNode,
  CreateFolderInput,
  UpdateFolderInput,
  CreateNoteInput,
  UpdateNoteInput,
  ParsedNoteCard,
  ParseNotesContext,
  BatchCreateNotesResponse,
  SyncStatusResponse,
  SyncSession,
  StartSessionInput,
  CommitSessionInput,
  GDriveSyncResult,
} from '@lenta/shared';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.warn('[CalendarApp API Error]', error.response?.status, error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const calendarApi = {
  // AI Quick Add & Parse
  parseAiNotes: async (text: string, context?: ParseNotesContext): Promise<{ cards: ParsedNoteCard[] }> => {
    const res = await apiClient.post<{ cards: ParsedNoteCard[] }>('/notes/ai/parse', { text, context });
    return res.data;
  },

  // Batch Create Notes
  createNotesBatch: async (notes: CreateNoteInput[]): Promise<BatchCreateNotesResponse> => {
    const res = await apiClient.post<BatchCreateNotesResponse>('/notes/batch', { notes });
    return res.data;
  },

  // Create Note
  createNote: async (input: CreateNoteInput): Promise<Note> => {
    const res = await apiClient.post<Note>('/notes', input);
    return res.data;
  },


  // Update Note
  updateNote: async (id: string, input: UpdateNoteInput): Promise<Note> => {
    const res = await apiClient.patch<Note>(`/notes/${id}`, input);
    return res.data;
  },

  // Delete Note
  deleteNote: async (id: string): Promise<{ success: boolean }> => {
    const res = await apiClient.delete<{ success: boolean }>(`/notes/${id}`);
    return res.data;
  },

  // Range Notes Query
  getNotes: async (params?: QueryNotesParams): Promise<NotesResponse> => {
    const res = await apiClient.get<NotesResponse>('/notes', { params });
    return res.data;
  },

  getNoteById: async (id: string): Promise<Note> => {
    const res = await apiClient.get<Note>(`/notes/${id}`);
    return res.data;
  },

  // Feeds
  getFeeds: async (): Promise<Feed[]> => {
    const res = await apiClient.get<Feed[]>('/feeds');
    return res.data;
  },

  // Taxonomy Tree
  getTaxonomyTree: async (): Promise<TaxonomyTreeNode[]> => {
    const res = await apiClient.get<TaxonomyTreeNode[]>('/taxonomy/tree');
    return res.data;
  },

  // Flat Taxonomy
  getTaxonomyNodes: async (): Promise<TaxonomyNode[]> => {
    const res = await apiClient.get<TaxonomyNode[]>('/taxonomy');
    return res.data;
  },

  // Hashtags
  getHashtags: async (): Promise<Hashtag[]> => {
    const res = await apiClient.get<Hashtag[]>('/hashtags');
    return res.data;
  },

  // Folders API
  getFolders: async (
    includeDeleted = false,
    search?: string,
    containerId?: string,
    scope: 'external' | 'internal' | 'all' = 'all'
  ): Promise<Folder[]> => {
    const res = await apiClient.get<Folder[]>('/folders', {
      params: { includeDeleted, search, containerId, scope },
    });
    return res.data;
  },

  getFolderTree: async (
    includeDeleted = false,
    containerId?: string,
    scope: 'external' | 'internal' | 'all' = 'all'
  ): Promise<FolderTreeNode[]> => {
    const res = await apiClient.get<FolderTreeNode[]>('/folders/tree', {
      params: { includeDeleted, containerId, scope },
    });
    return res.data;
  },

  getFolderById: async (idOrPath: string): Promise<Folder & { noteFolders?: Array<{ note: Note }> }> => {
    const res = await apiClient.get<Folder & { noteFolders?: Array<{ note: Note }> }>(`/folders/${encodeURIComponent(idOrPath)}`);
    return res.data;
  },

  createFolder: async (input: CreateFolderInput): Promise<Folder> => {
    const res = await apiClient.post<Folder>('/folders', input);
    return res.data;
  },

  updateFolder: async (id: string, input: UpdateFolderInput): Promise<Folder> => {
    const res = await apiClient.patch<Folder>(`/folders/${id}`, input);
    return res.data;
  },

  deleteFolder: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/folders/${id}`);
    return res.data;
  },

  getDailySummary: async (date?: string): Promise<any> => {
    const res = await apiClient.get<any>('/curation/daily-summary', {
      params: { date },
    });
    return res.data;
  },
};

export const syncApi = {
  getStatus: async (deviceId?: string): Promise<SyncStatusResponse> => {
    const res = await apiClient.get<SyncStatusResponse>('/sync/status', { params: { deviceId } });
    return res.data;
  },
  getActiveSession: async (deviceId?: string): Promise<SyncSession | null> => {
    const res = await apiClient.get<SyncSession | null>('/sync/session/active', { params: { deviceId } });
    return res.data;
  },
  startSession: async (data: StartSessionInput): Promise<SyncSession> => {
    const res = await apiClient.post<SyncSession>('/sync/session/start', data);
    return res.data;
  },
  commitSession: async (id: string, data: CommitSessionInput, deviceId?: string): Promise<any> => {
    const res = await apiClient.post(`/sync/session/${id}/commit`, data, { params: { deviceId } });
    return res.data;
  },
  cancelSession: async (id: string): Promise<any> => {
    const res = await apiClient.post(`/sync/session/${id}/cancel`);
    return res.data;
  },
  push: async (deviceId?: string): Promise<{ pushedCount: number; commits: string[] }> => {
    const res = await apiClient.post('/sync/push', {}, { params: { deviceId } });
    return res.data;
  },
  pull: async (deviceId?: string): Promise<GDriveSyncResult> => {
    const res = await apiClient.post('/sync/pull', {}, { params: { deviceId } });
    return res.data;
  },
};



