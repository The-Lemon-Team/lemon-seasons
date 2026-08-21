import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  feedsApi,
  notesApi,
  taxonomyApi,
  hashtagsApi,
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
      queryClient.invalidateQueries({ queryKey: ['hashtags'] });
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
      queryClient.invalidateQueries({ queryKey: ['hashtags'] });
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
      queryClient.invalidateQueries({ queryKey: ['hashtags'] });
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
      queryClient.invalidateQueries({ queryKey: ['hashtags'] });
    },
  });
}

export function useUploadNoteImages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, files }: { id: string; files: File[] }) =>
      notesApi.uploadImages(id, files),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notes', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

export function useSetMainNoteImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, imageId }: { noteId: string; imageId: string }) =>
      notesApi.setMainImage(noteId, imageId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notes', variables.noteId] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

export function useReorderNoteImages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      noteId,
      items,
    }: {
      noteId: string;
      items: { id: string; order: number }[];
    }) => notesApi.reorderImages(noteId, items),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notes', variables.noteId] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

export function useUpdateNoteImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      noteId,
      imageId,
      data,
    }: {
      noteId: string;
      imageId: string;
      data: { caption?: string; alt?: string };
    }) => notesApi.updateImage(noteId, imageId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notes', variables.noteId] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

export function useDeleteNoteImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, imageId }: { noteId: string; imageId: string }) =>
      notesApi.deleteImage(noteId, imageId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notes', variables.noteId] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

// Note Links Hooks
export function useAddNoteLinks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      links,
    }: {
      id: string;
      links: { url: string; title?: string; isSource?: boolean; order?: number }[];
    }) => notesApi.addLinks(id, links),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notes', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

export function useSetSourceNoteLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, linkId }: { noteId: string; linkId: string }) =>
      notesApi.setSourceLink(noteId, linkId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notes', variables.noteId] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

export function useReorderNoteLinks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      noteId,
      items,
    }: {
      noteId: string;
      items: { id: string; order: number }[];
    }) => notesApi.reorderLinks(noteId, items),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notes', variables.noteId] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

export function useUpdateNoteLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      noteId,
      linkId,
      data,
    }: {
      noteId: string;
      linkId: string;
      data: { url?: string; title?: string; isSource?: boolean; order?: number };
    }) => notesApi.updateLink(noteId, linkId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notes', variables.noteId] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

export function useDeleteNoteLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, linkId }: { noteId: string; linkId: string }) =>
      notesApi.deleteLink(noteId, linkId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notes', variables.noteId] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

export function useUploadMedia() {
  return useMutation({
    mutationFn: (file: File) => notesApi.uploadMedia(file),
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

// Hashtags Queries & Mutations
export function useHashtags(includeDeleted = false, search?: string) {
  return useQuery({
    queryKey: ['hashtags', { includeDeleted, search }],
    queryFn: () => hashtagsApi.getAll(includeDeleted, search),
  });
}

export function useHashtagSuggestions(query?: string, limit = 10) {
  return useQuery({
    queryKey: ['hashtags', 'suggestions', { query, limit }],
    queryFn: () => hashtagsApi.suggest(query, limit),
    enabled: query !== undefined,
  });
}

export function useHashtag(id: string) {
  return useQuery({
    queryKey: ['hashtags', id],
    queryFn: () => hashtagsApi.getOne(id),
    enabled: Boolean(id),
  });
}

export function useDeleteHashtag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => hashtagsApi.softDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hashtags'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

export function useRestoreHashtag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => hashtagsApi.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hashtags'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
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
