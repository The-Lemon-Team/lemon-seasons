import axios from 'axios';
import {
  Feed,
  Note,
  NoteImage,
  NoteLink,
  CreateNoteLinkInput,
  UpdateNoteLinkInput,
  Folder,
  FolderTreeNode,
  CreateFolderInput,
  UpdateFolderInput,
  TaxonomyNode,
  TaxonomyTreeNode,
  Hashtag,
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
  uploadImages: async (id: string, files: File[]): Promise<NoteImage[]> => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    const res = await apiClient.post<NoteImage[]>(`/notes/${id}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  setMainImage: async (noteId: string, imageId: string): Promise<NoteImage> => {
    const res = await apiClient.patch<NoteImage>(`/notes/${noteId}/images/${imageId}/main`);
    return res.data;
  },
  reorderImages: async (
    noteId: string,
    items: { id: string; order: number }[],
  ): Promise<NoteImage[]> => {
    const res = await apiClient.put<NoteImage[]>(`/notes/${noteId}/images/reorder`, { items });
    return res.data;
  },
  updateImage: async (
    noteId: string,
    imageId: string,
    data: { caption?: string; alt?: string },
  ): Promise<NoteImage> => {
    const res = await apiClient.patch<NoteImage>(`/notes/${noteId}/images/${imageId}`, data);
    return res.data;
  },
  deleteImage: async (noteId: string, imageId: string): Promise<{ success: boolean; newMainId?: string }> => {
    const res = await apiClient.delete<{ success: boolean; newMainId?: string }>(
      `/notes/${noteId}/images/${imageId}`,
    );
    return res.data;
  },
  uploadMedia: async (file: File): Promise<{ url: string; thumbnailUrl?: string; filename: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<{ url: string; thumbnailUrl?: string; filename: string }>(
      '/notes/upload-media',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
    return res.data;
  },
  addLinks: async (id: string, links: CreateNoteLinkInput[]): Promise<NoteLink[]> => {
    const res = await apiClient.post<NoteLink[]>(`/notes/${id}/links`, { links });
    return res.data;
  },
  setSourceLink: async (noteId: string, linkId: string): Promise<NoteLink[]> => {
    const res = await apiClient.patch<NoteLink[]>(`/notes/${noteId}/links/${linkId}/source`);
    return res.data;
  },
  reorderLinks: async (
    noteId: string,
    items: { id: string; order: number }[],
  ): Promise<NoteLink[]> => {
    const res = await apiClient.put<NoteLink[]>(`/notes/${noteId}/links/reorder`, { items });
    return res.data;
  },
  updateLink: async (
    noteId: string,
    linkId: string,
    data: UpdateNoteLinkInput,
  ): Promise<NoteLink> => {
    const res = await apiClient.patch<NoteLink>(`/notes/${noteId}/links/${linkId}`, data);
    return res.data;
  },
  deleteLink: async (noteId: string, linkId: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(
      `/notes/${noteId}/links/${linkId}`,
    );
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

// Hashtags API
export const hashtagsApi = {
  getAll: async (includeDeleted = false, search?: string): Promise<Hashtag[]> => {
    const res = await apiClient.get<Hashtag[]>('/hashtags', {
      params: { includeDeleted, search },
    });
    return res.data;
  },
  suggest: async (q?: string, limit = 10): Promise<Hashtag[]> => {
    const res = await apiClient.get<Hashtag[]>('/hashtags/suggest', {
      params: { q, limit },
    });
    return res.data;
  },
  getOne: async (id: string): Promise<Hashtag & { notes: Note[] }> => {
    const res = await apiClient.get<Hashtag & { notes: Note[] }>(`/hashtags/${id}`);
    return res.data;
  },
  softDelete: async (id: string): Promise<Hashtag> => {
    const res = await apiClient.delete<Hashtag>(`/hashtags/${id}`);
    return res.data;
  },
  restore: async (id: string): Promise<Hashtag> => {
    const res = await apiClient.post<Hashtag>(`/hashtags/${id}/restore`);
    return res.data;
  },
};

// Folders API (Obsidian Hierarchy)
export const foldersApi = {
  getAll: async (includeDeleted = false, search?: string): Promise<Folder[]> => {
    const res = await apiClient.get<Folder[]>('/folders', {
      params: { includeDeleted, search },
    });
    return res.data;
  },
  getTree: async (includeDeleted = false): Promise<FolderTreeNode[]> => {
    const res = await apiClient.get<FolderTreeNode[]>('/folders/tree', {
      params: { includeDeleted },
    });
    return res.data;
  },
  getOne: async (id: string): Promise<Folder & { noteFolders: any[] }> => {
    const res = await apiClient.get<Folder & { noteFolders: any[] }>(`/folders/${id}`);
    return res.data;
  },
  create: async (data: CreateFolderInput): Promise<Folder> => {
    const res = await apiClient.post<Folder>('/folders', data);
    return res.data;
  },
  update: async (id: string, data: UpdateFolderInput): Promise<Folder> => {
    const res = await apiClient.patch<Folder>(`/folders/${id}`, data);
    return res.data;
  },
  softDelete: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/folders/${id}`);
    return res.data;
  },
  restore: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post<{ success: boolean; message: string }>(`/folders/${id}/restore`);
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

// Ingestion & AI Generator Lab API
export interface IngestionStatus {
  status: string;
  geminiActive: boolean;
  tmdbActive: boolean;
  availableFeeds: Array<{ slug: string; name: string; provider: string }>;
}

export interface IngestionResult {
  feedSlug: string;
  feedTitle: string;
  notesCount: number;
  created: number;
  updated: number;
}

export interface GeneratedNoteEnrichment {
  description: string;
  hashtags: string[];
  suggestedTags?: string[];
  keyQuote?: string;
}

export interface MovieReleaseItem {
  title: string;
  originalTitle?: string;
  releaseDate: string;
  endDate?: string;
  type: any;
  description: string;
  posterUrl: string;
  backdropUrl?: string;
  trailerUrl?: string;
  sourceLink?: string;
  taxonomyPath: string;
  folders: string[];
  hashtags: string[];
  rating?: number;
}

export interface HolidayItem {
  title: string;
  startDate: string;
  endDate?: string;
  type: any;
  description: string;
  icon?: string;
  sourceLink?: string;
  imageUrl?: string;
  imageCaption?: string;
  taxonomyPath: string;
  folders: string[];
  hashtags: string[];
}

export interface PoliticalEventItem {
  title: string;
  startDate: string;
  endDate?: string;
  type: any;
  description: string;
  icon?: string;
  sourceLink?: string;
  imageUrl?: string;
  imageCaption?: string;
  taxonomyPath: string;
  folders: string[];
  hashtags: string[];
}

export interface ImportNoteDto {
  feedSlug: string;
  title: string;
  description: string;
  type: any;
  startDate: string;
  endDate?: string;
  icon?: string;
  sourceLink?: string;
  taxonomyPath: string;
  folders: string[];
  hashtags: string[];
  imageUrl?: string;
  imageCaption?: string;
  trailerUrl?: string;
}

export const ingestionApi = {
  getStatus: async (): Promise<IngestionStatus> => {
    const res = await apiClient.get<IngestionStatus>('/ingestion/status');
    return res.data;
  },
  syncAll: async (): Promise<{ success: boolean; results: IngestionResult[] }> => {
    const res = await apiClient.post<{ success: boolean; results: IngestionResult[] }>('/ingestion/sync-all');
    return res.data;
  },
  syncFeed: async (slug: string): Promise<{ success: boolean; result: IngestionResult }> => {
    const res = await apiClient.post<{ success: boolean; result: IngestionResult }>(`/ingestion/sync/${slug}`);
    return res.data;
  },
  generateAiContent: async (data: { title: string; category: string; dateStr: string; context?: string }): Promise<GeneratedNoteEnrichment> => {
    const res = await apiClient.post<GeneratedNoteEnrichment>('/ingestion/ai/generate-content', data);
    return res.data;
  },
  searchMovies: async (query?: string): Promise<MovieReleaseItem[]> => {
    const res = await apiClient.get<MovieReleaseItem[]>('/ingestion/tmdb/search', {
      params: { query },
    });
    return res.data;
  },
  getHolidaysPreview: async (year = 2026, category: 'russian' | 'christian' = 'russian'): Promise<HolidayItem[]> => {
    const res = await apiClient.get<HolidayItem[]>('/ingestion/holidays/preview', {
      params: { year, category },
    });
    return res.data;
  },
  getPoliticsPreview: async (): Promise<PoliticalEventItem[]> => {
    const res = await apiClient.get<PoliticalEventItem[]>('/ingestion/politics/preview');
    return res.data;
  },
  importNote: async (dto: ImportNoteDto): Promise<{ success: boolean; isNew: boolean; title: string }> => {
    const res = await apiClient.post<{ success: boolean; isNew: boolean; title: string }>('/ingestion/import-note', dto);
    return res.data;
  },
};

