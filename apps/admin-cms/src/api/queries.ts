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
    staleTime: 60_000,
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
    staleTime: 30_000,
  });
}

export function useChatThread(id?: string) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ['chat-thread', id],
    queryFn: () => chatsApi.getThread(id!),
    enabled: Boolean(id),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    placeholderData: (previousData) => {
      if (!id) return undefined;
      const cached = queryClient.getQueryData<any[]>(['chat-threads'])
        || queryClient.getQueriesData<any[]>({ queryKey: ['chat-threads'] })
            .flatMap(([, data]) => (Array.isArray(data) ? data : []));
      const found = cached.find((t) => t.id === id);
      return found || previousData;
    },
  });
}

export function useCreateChatThread() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => chatsApi.createThread(data),
    onSuccess: (newThread) => {
      if (newThread?.id) {
        queryClient.setQueryData(['chat-thread', newThread.id], newThread);
      }
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
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

export function useSendThreadMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ threadId, data }: { threadId: string; data: any }) => chatsApi.sendMessage(threadId, data),
    onMutate: async ({ threadId, data }) => {
      await queryClient.cancelQueries({ queryKey: ['thread-messages', threadId] });
      const previousMessages = queryClient.getQueryData<any[]>(['thread-messages', threadId]);

      const optimisticMsg = {
        id: `optimistic-${Date.now()}`,
        threadId,
        sender: 'user',
        senderName: 'Куратор редакции',
        senderRole: 'Редактор / Пользователь',
        avatar: '👤',
        text: data.message,
        createdAt: new Date().toISOString(),
        isOptimistic: true,
      };

      if (previousMessages) {
        queryClient.setQueryData(['thread-messages', threadId], [...previousMessages, optimisticMsg]);
      } else {
        queryClient.setQueryData(['thread-messages', threadId], [optimisticMsg]);
      }

      return { previousMessages, threadId };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(['thread-messages', context.threadId], context.previousMessages);
      }
    },
    onSuccess: (data, variables) => {
      if (data?.userMessage && data?.replies) {
        queryClient.setQueryData<any[]>(['thread-messages', variables.threadId], (old = []) => {
          const cleaned = old.filter((m) => !m.isOptimistic);
          const hasUserMsg = cleaned.some((m) => m.id === data.userMessage.id);
          const withUser = hasUserMsg ? cleaned : [...cleaned, data.userMessage];
          const existingIds = new Set(withUser.map((m) => m.id));
          const newReplies = data.replies.filter((r: any) => !existingIds.has(r.id));
          return [...withUser, ...newReplies];
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ['thread-messages', variables.threadId] });
      }
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
      queryClient.invalidateQueries({ queryKey: ['curators'] });
      queryClient.invalidateQueries({ queryKey: ['assistants'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Curators Hooks
// ---------------------------------------------------------------------------

export function useCurators(folderId?: string) {
  return useQuery({
    queryKey: ['curators', { folderId }],
    queryFn: () => chatsApi.getCurators(folderId),
    staleTime: 30_000,
  });
}

export function useCurator(id?: string) {
  return useQuery({
    queryKey: ['curator', id],
    queryFn: () => chatsApi.getCurator(id!),
    enabled: Boolean(id),
  });
}

export function useCreateCurator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => chatsApi.createCurator(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curators'] });
      queryClient.invalidateQueries({ queryKey: ['chat-folders'] });
    },
  });
}

export function useUpdateCurator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => chatsApi.updateCurator(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['curators'] });
      queryClient.invalidateQueries({ queryKey: ['curator', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['chat-folders'] });
    },
  });
}

export function useDeleteCurator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => chatsApi.deleteCurator(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curators'] });
      queryClient.invalidateQueries({ queryKey: ['chat-folders'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Assistants Hooks
// ---------------------------------------------------------------------------

export function useAssistants(folderId?: string, skillType?: string) {
  return useQuery({
    queryKey: ['assistants', { folderId, skillType }],
    queryFn: () => chatsApi.getAssistants(folderId, skillType),
    staleTime: 30_000,
  });
}

export function useAssistant(id?: string) {
  return useQuery({
    queryKey: ['assistant', id],
    queryFn: () => chatsApi.getAssistant(id!),
    enabled: Boolean(id),
  });
}

export function useCreateAssistant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => chatsApi.createAssistant(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistants'] });
      queryClient.invalidateQueries({ queryKey: ['chat-folders'] });
    },
  });
}

export function useUpdateAssistant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => chatsApi.updateAssistant(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assistants'] });
      queryClient.invalidateQueries({ queryKey: ['assistant', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['chat-folders'] });
    },
  });
}

export function useDeleteAssistant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => chatsApi.deleteAssistant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistants'] });
      queryClient.invalidateQueries({ queryKey: ['chat-folders'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Action Skills Hooks (Photo & Podcast)
// ---------------------------------------------------------------------------

export function useGeneratePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ threadId, data }: { threadId: string; data: any }) =>
      chatsApi.generatePhoto(threadId, data),
    onSuccess: (newMsg, variables) => {
      queryClient.setQueryData<any[]>(['thread-messages', variables.threadId], (old = []) => [
        ...old,
        newMsg,
      ]);
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
    },
  });
}

export function useGenerateThreadPodcast() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ threadId, data }: { threadId: string; data: any }) =>
      chatsApi.generatePodcast(threadId, data),
    onSuccess: (newMsg, variables) => {
      queryClient.setQueryData<any[]>(['thread-messages', variables.threadId], (old = []) => [
        ...old,
        newMsg,
      ]);
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
    },
  });
}


