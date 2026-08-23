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
} from '@lenta/shared';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const calendarApi = {
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
  getFolders: async (includeDeleted = false, search?: string): Promise<Folder[]> => {
    const res = await apiClient.get<Folder[]>('/folders', {
      params: { includeDeleted, search },
    });
    return res.data;
  },

  getFolderTree: async (includeDeleted = false): Promise<FolderTreeNode[]> => {
    const res = await apiClient.get<FolderTreeNode[]>('/folders/tree', {
      params: { includeDeleted },
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
};

