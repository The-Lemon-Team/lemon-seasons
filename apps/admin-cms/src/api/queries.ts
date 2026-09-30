import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  feedsApi,
  notesApi,
  taxonomyApi,
  hashtagsApi,
  foldersApi,
  syncApi,
  statsApi,
  curationApi,
  chatsApi,
} from './client';
import {
  CreateFeedInput,
  CreateNoteInput,
  CreateTaxonomyInput,
  CreateFolderInput,
  UpdateFolderInput,
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
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['folder-tree'] });
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
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['folder-tree'] });
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
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['folder-tree'] });
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
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['folder-tree'] });
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

// Folders Queries & Mutations (Obsidian Hierarchy)
export function useFolders(includeDeleted = false, search?: string) {
  return useQuery({
    queryKey: ['folders', { includeDeleted, search }],
    queryFn: () => foldersApi.getAll(includeDeleted, search),
  });
}

export function useFolderTree(includeDeleted = false) {
  return useQuery({
    queryKey: ['folder-tree', { includeDeleted }],
    queryFn: () => foldersApi.getTree(includeDeleted),
  });
}

export function useFolder(id: string) {
  return useQuery({
    queryKey: ['folders', id],
    queryFn: () => foldersApi.getOne(id),
    enabled: Boolean(id),
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFolderInput) => foldersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['folder-tree'] });
    },
  });
}

export function useUpdateFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFolderInput }) =>
      foldersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['folder-tree'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => foldersApi.softDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['folder-tree'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

export function useRestoreFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => foldersApi.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['folder-tree'] });
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

// System Stats Query
export function useSystemStats() {
  return useQuery({
    queryKey: ['system-stats'],
    queryFn: () => statsApi.getStats(),
    refetchInterval: 15000, // Refresh metrics every 15s
  });
}

// Curation & AI News Hooks
export function useDailyNews(date?: string) {
  return useQuery({
    queryKey: ['daily-news', date],
    queryFn: () => curationApi.getDailyNews(date),
  });
}

export function useTransformNews() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      curationApi.transformNews(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['daily-news'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['daily-summary'] });
    },
  });
}

export function useDismissNews() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => curationApi.dismissNews(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-news'] });
      queryClient.invalidateQueries({ queryKey: ['daily-summary'] });
    },
  });
}

export function useGeneratePodcast() {
  return useMutation({
    mutationFn: (payload: { date: string; newsIds?: string[]; host1Name?: string; host2Name?: string; tone?: string }) =>
      curationApi.generatePodcast(payload),
  });
}

export function usePublishPodcast() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { date: string; podcast: any; feedId?: string; containerId?: string }) =>
      curationApi.publishPodcast(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-news'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['daily-summary'] });
    },
  });
}

export function useDailySummary(date?: string) {
  return useQuery({
    queryKey: ['daily-summary', date],
    queryFn: () => curationApi.getDailySummary(date),
  });
}

export function useAgentChat() {
  return useMutation({
    mutationFn: (payload: { message: string; date?: string; targetAgent?: string; history?: any[] }) =>
      curationApi.agentChat(payload),
  });
}

// ---------------------------------------------------------------------------
// Chat Folders, Threads & History Hooks
// ---------------------------------------------------------------------------

export function useChatFolders() {
  return useQuery({
    queryKey: ['chat-folders'],
    queryFn: () => chatsApi.getFolders(),
  });
}

export function useCreateChatFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => chatsApi.createFolder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-folders'] });
    },
  });
}

export function useUpdateChatFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => chatsApi.updateFolder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-folders'] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
    },
  });
}

export function useDeleteChatFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => chatsApi.deleteFolder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-folders'] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
    },
  });
}

export function useChatThreads(params?: { folderId?: string; type?: string; search?: string; includeArchived?: boolean }) {
  return useQuery({
    queryKey: ['chat-threads', params],
    queryFn: () => chatsApi.getThreads(params),
  });
}

export function useChatThread(id?: string) {
  return useQuery({
    queryKey: ['chat-thread', id],
    queryFn: () => chatsApi.getThread(id!),
    enabled: Boolean(id),
  });
}

export function useCreateChatThread() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => chatsApi.createThread(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
      queryClient.invalidateQueries({ queryKey: ['chat-folders'] });
    },
  });
}

export function useUpdateChatThread() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => chatsApi.updateThread(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
      queryClient.invalidateQueries({ queryKey: ['chat-thread', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['chat-folders'] });
    },
  });
}

export function useDeleteChatThread() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => chatsApi.deleteThread(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
      queryClient.invalidateQueries({ queryKey: ['chat-folders'] });
    },
  });
}

export function useThreadMessages(threadId?: string) {
  return useQuery({
    queryKey: ['thread-messages', threadId],
    queryFn: () => chatsApi.getMessages(threadId!),
    enabled: Boolean(threadId),
  });
}

export function useSendThreadMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ threadId, data }: { threadId: string; data: any }) => chatsApi.sendMessage(threadId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['thread-messages', variables.threadId] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
    },
  });
}

export function useSeedChatDefaults() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => chatsApi.seedDefaults(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-folders'] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
    },
  });
}


