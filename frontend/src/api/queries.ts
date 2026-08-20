import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  feedsApi,
  notesApi,
  taxonomyApi,
  syncApi,
} from './client';
import {
  CreateFeedInput,
  CreateNoteInput,
  CreateTaxonomyInput,
  QueryNotesParams,
} from '../types';

// Feeds Queries & Mutations
export function useFeeds(includeDeleted = false, search?: string) {
  return useQuery({
    queryKey: ['feeds', { includeDeleted, search }],
    queryFn: () => feedsApi.getAll(includeDeleted, search),
  });
}

export function useFeed(id: string) {
  return useQuery({
    queryKey: ['feeds', id],
    queryFn: () => feedsApi.getOne(id),
    enabled: Boolean(id),
  });
}

export function useCreateFeed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFeedInput) => feedsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] });
    },
  });
}

export function useUpdateFeed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateFeedInput> }) =>
      feedsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

export function useDeleteFeed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => feedsApi.softDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] });
    },
  });
}

export function useRestoreFeed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => feedsApi.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] });
    },
  });
}

// Notes Queries & Mutations
export function useNotes(params?: QueryNotesParams) {
  return useQuery({
    queryKey: ['notes', params],
    queryFn: () => notesApi.getAll(params),
  });
}

export function useNote(id: string) {
  return useQuery({
    queryKey: ['notes', id],
    queryFn: () => notesApi.getOne(id),
    enabled: Boolean(id),
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateNoteInput) => notesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['feeds'] });
      queryClient.invalidateQueries({ queryKey: ['taxonomy'] });
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateNoteInput> }) =>
      notesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['feeds'] });
      queryClient.invalidateQueries({ queryKey: ['taxonomy'] });
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notesApi.softDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['feeds'] });
    },
  });
}

export function useRestoreNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notesApi.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['feeds'] });
    },
  });
}

// Taxonomy Queries & Mutations
export function useTaxonomyTree(includeDeleted = false) {
  return useQuery({
    queryKey: ['taxonomy', 'tree', { includeDeleted }],
    queryFn: () => taxonomyApi.getTree(includeDeleted),
  });
}

export function useTaxonomyFlat(includeDeleted = false, search?: string) {
  return useQuery({
    queryKey: ['taxonomy', 'flat', { includeDeleted, search }],
    queryFn: () => taxonomyApi.getFlat(includeDeleted, search),
  });
}

export function useCreateTaxonomy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTaxonomyInput) => taxonomyApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxonomy'] });
    },
  });
}

export function useUpdateTaxonomy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateTaxonomyInput> }) =>
      taxonomyApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxonomy'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

export function useDeleteTaxonomy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => taxonomyApi.softDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxonomy'] });
    },
  });
}

export function useRestoreTaxonomy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => taxonomyApi.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxonomy'] });
    },
  });
}

// Sync Queries
export function useSyncChanges(since?: string) {
  return useQuery({
    queryKey: ['sync', since],
    queryFn: () => syncApi.getChanges(since),
    refetchInterval: 30000, // Background sync poll every 30s
  });
}
