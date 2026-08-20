import axios from 'axios';
import {
  Feed,
  Note,
  TaxonomyNode,
  TaxonomyTreeNode,
  QueryNotesParams,
  NotesResponse,
  CreateNoteInput,
  CreateFeedInput,
  CreateTaxonomyInput,
  SyncChangesResponse,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Feeds API
export const feedsApi = {
  getAll: async (includeDeleted = false, search?: string): Promise<Feed[]> => {
    const res = await apiClient.get<Feed[]>('/feeds', {
      params: { includeDeleted, search },
    });
    return res.data;
  },
  getOne: async (id: string): Promise<Feed> => {
    const res = await apiClient.get<Feed>(`/feeds/${id}`);
    return res.data;
  },
  create: async (data: CreateFeedInput): Promise<Feed> => {
    const res = await apiClient.post<Feed>('/feeds', data);
    return res.data;
  },
  update: async (id: string, data: Partial<CreateFeedInput>): Promise<Feed> => {
    const res = await apiClient.patch<Feed>(`/feeds/${id}`, data);
    return res.data;
  },
  softDelete: async (id: string): Promise<Feed> => {
    const res = await apiClient.delete<Feed>(`/feeds/${id}`);
    return res.data;
  },
  restore: async (id: string): Promise<Feed> => {
    const res = await apiClient.post<Feed>(`/feeds/${id}/restore`);
    return res.data;
  },
};

// Notes API
export const notesApi = {
  getAll: async (params?: QueryNotesParams): Promise<NotesResponse> => {
    const res = await apiClient.get<NotesResponse>('/notes', { params });
    return res.data;
  },
  getOne: async (id: string): Promise<Note> => {
    const res = await apiClient.get<Note>(`/notes/${id}`);
    return res.data;
  },
  create: async (data: CreateNoteInput): Promise<Note> => {
    const res = await apiClient.post<Note>('/notes', data);
    return res.data;
  },
  update: async (id: string, data: Partial<CreateNoteInput>): Promise<Note> => {
    const res = await apiClient.patch<Note>(`/notes/${id}`, data);
    return res.data;
  },
  softDelete: async (id: string): Promise<Note> => {
    const res = await apiClient.delete<Note>(`/notes/${id}`);
    return res.data;
  },
  restore: async (id: string): Promise<Note> => {
    const res = await apiClient.post<Note>(`/notes/${id}/restore`);
    return res.data;
  },
};

// Taxonomy API
export const taxonomyApi = {
  getFlat: async (includeDeleted = false, search?: string): Promise<TaxonomyNode[]> => {
    const res = await apiClient.get<TaxonomyNode[]>('/taxonomy', {
      params: { includeDeleted, search },
    });
    return res.data;
  },
  getTree: async (includeDeleted = false): Promise<TaxonomyTreeNode[]> => {
    const res = await apiClient.get<TaxonomyTreeNode[]>('/taxonomy/tree', {
      params: { includeDeleted },
    });
    return res.data;
  },
  getOne: async (id: string): Promise<TaxonomyNode> => {
    const res = await apiClient.get<TaxonomyNode>(`/taxonomy/${id}`);
    return res.data;
  },
  create: async (data: CreateTaxonomyInput): Promise<TaxonomyNode> => {
    const res = await apiClient.post<TaxonomyNode>('/taxonomy', data);
    return res.data;
  },
  update: async (id: string, data: Partial<CreateTaxonomyInput>): Promise<TaxonomyNode> => {
    const res = await apiClient.patch<TaxonomyNode>(`/taxonomy/${id}`, data);
    return res.data;
  },
  softDelete: async (id: string): Promise<TaxonomyNode> => {
    const res = await apiClient.delete<TaxonomyNode>(`/taxonomy/${id}`);
    return res.data;
  },
  restore: async (id: string): Promise<TaxonomyNode> => {
    const res = await apiClient.post<TaxonomyNode>(`/taxonomy/${id}/restore`);
    return res.data;
  },
};

// Sync API
export const syncApi = {
  getChanges: async (since?: string): Promise<SyncChangesResponse> => {
    const res = await apiClient.get<SyncChangesResponse>('/sync/changes', {
      params: { since },
    });
    return res.data;
  },
};
