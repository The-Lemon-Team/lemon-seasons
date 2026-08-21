import axios from 'axios';
import {
  Note,
  Feed,
  TaxonomyTreeNode,
  TaxonomyNode,
  Hashtag,
  NotesResponse,
  QueryNotesParams,
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
};
