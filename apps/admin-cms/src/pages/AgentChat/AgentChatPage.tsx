import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { message } from 'antd';
import dayjs from 'dayjs';
import {
  useChatFolders,
  useCreateChatFolder,
  useDeleteChatFolder,
  useChatThreads,
  useChatThread,
  useCreateChatThread,
  useUpdateChatThread,
  useDeleteChatThread,
  useCurators,
  useCreateCurator,
  useThreadMessages,
  useSendThreadMessage,
  useGeneratePhoto,
  useGenerateThreadPodcast,
  useFeeds,
  useCreateNote,
} from '../../api/queries';
import { ChatMessageRecord, TelegramNewsPreview } from '../../types';
import { useDebounce } from './hooks/useDebounce';
import { ChatFolderNav } from './components/ChatFolderNav';
import { ChatListColumn } from './components/ChatListColumn';
import { ChatHeader } from './components/ChatHeader';
import { ChatMessageList } from './components/ChatMessageList';
import { ChatInputBar } from './components/ChatInputBar';
import { CreateFolderModal } from './components/CreateFolderModal';
import { CreateCuratorModal } from './components/CreateCuratorModal';
import { CreateTopicModal } from './components/CreateTopicModal';
import { GeneratePhotoModal } from './components/GeneratePhotoModal';
import { GeneratePodcastModal } from './components/GeneratePodcastModal';
import { SaveCardDrawer } from './components/SaveCardDrawer';
import { AddToNoteModal, NoteAttachmentItem } from './components/AddToNoteModal';

export const AgentChatPage: React.FC = () => {
  // Navigation & Folder Filter State
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => dayjs().format('YYYY-MM-DD'));
  const [searchThreadText, setSearchThreadText] = useState('');
  const debouncedSearch = useDebounce(searchThreadText, 250);

  // Modals & Drawers State
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [isNewCuratorModalOpen, setIsNewCuratorModalOpen] = useState(false);
  const [isNewTopicModalOpen, setIsNewTopicModalOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isPodcastModalOpen, setIsPodcastModalOpen] = useState(false);
  const [cardDrawerMsg, setCardDrawerMsg] = useState<ChatMessageRecord | null>(null);
  const [addToNoteItem, setAddToNoteItem] = useState<NoteAttachmentItem | null>(null);

  // Queries
  const { data: folders = [] } = useChatFolders();
  const { data: curators = [] } = useCurators();
  const { data: threads = [], isLoading: threadsLoading } = useChatThreads({
    search: debouncedSearch || undefined,
  });
  const { data: activeThreadQuery } = useChatThread(selectedThreadId || undefined);
  const { data: threadMessages = [], isLoading: messagesLoading } = useThreadMessages(
    selectedThreadId || undefined,
  );
  const { data: feeds = [] } = useFeeds();

  // Active Thread derived synchronously to avoid jumps
  const activeThread = useMemo(() => {
    if (!selectedThreadId) return null;
    if (activeThreadQuery && activeThreadQuery.id === selectedThreadId) {
      return activeThreadQuery;
    }
    const fromList = threads.find((t: any) => t.id === selectedThreadId);
    return fromList || activeThreadQuery || null;
  }, [activeThreadQuery, selectedThreadId, threads]);

  // Active Folder derived from selectedFolderId
  const activeFolder = useMemo(() => {
    if (selectedFolderId === 'all') return null;
    return folders.find((f: any) => f.id === selectedFolderId) || null;
  }, [folders, selectedFolderId]);

  // Mutations
  const sendThreadMessageMutation = useSendThreadMessage();
  const createThreadMutation = useCreateChatThread();
  const updateThreadMutation = useUpdateChatThread();
  const deleteThreadMutation = useDeleteChatThread();
  const createFolderMutation = useCreateChatFolder();
  const deleteFolderMutation = useDeleteChatFolder();
  const createCuratorMutation = useCreateCurator();
  const generatePhotoMutation = useGeneratePhoto();
  const generatePodcastMutation = useGenerateThreadPodcast();
  const createNoteMutation = useCreateNote();

  // Auto-select first or pinned thread on initial load
  useEffect(() => {
    if (threads.length > 0 && !selectedThreadId) {
      const defaultThread = threads.find((t: any) => t.isPinned) || threads[0];
      setSelectedThreadId(defaultThread.id);
    }
  }, [threads, selectedThreadId]);

  // Sync date when active thread changes
  useEffect(() => {
    if (!activeThread) return;
    if (activeThread.dateScope) {
      setSelectedDate(activeThread.dateScope);
    } else {
      setSelectedDate(dayjs().format('YYYY-MM-DD'));
    }
  }, [activeThread?.id]);

  // Send message handler
  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!selectedThreadId || sendThreadMessageMutation.isPending) return;
      try {
        await sendThreadMessageMutation.mutateAsync({
          threadId: selectedThreadId,
          data: {
            message: text,
            date: selectedDate,
          },
        });
      } catch (err: any) {
        message.error(err?.message || 'Ошибка отправки сообщения');
      }
    },
    [selectedThreadId, selectedDate, sendThreadMessageMutation],
  );

  // Skill: Generate Photo (Gemini Imagen)
  const handleGeneratePhotoSubmit = useCallback(
    async (prompt?: string, aspectRatio?: string) => {
      if (!selectedThreadId) return;
      try {
        await generatePhotoMutation.mutateAsync({
          threadId: selectedThreadId,
          data: {
            prompt: prompt || undefined,
            aspectRatio: aspectRatio || '16:9',
          },
        });
        message.success('Изображение успешно сгенерировано через Gemini Imagen!');
      } catch (err: any) {
        message.error(err?.message || 'Ошибка генерации фото');
      }
    },
    [selectedThreadId, generatePhotoMutation],
  );

  // Skill: Generate Podcast (NotebookLM)
  const handleGeneratePodcastSubmit = useCallback(
    async (data: { host1Name?: string; host2Name?: string; tone?: string }) => {
      if (!selectedThreadId) return;
      try {
        await generatePodcastMutation.mutateAsync({
          threadId: selectedThreadId,
          data,
        });
        message.success('Сценарий NotebookLM подкаста успешно создан!');
      } catch (err: any) {
        message.error(err?.message || 'Ошибка генерации подкаста');
      }
    },
    [selectedThreadId, generatePodcastMutation],
  );

  // Clipboard & Card / Note Helpers
  const handleCopyText = useCallback((txt: string) => {
    navigator.clipboard.writeText(txt);
    message.success('Текст скопирован в буфер обмена');
  }, []);

  const handleOpenCardDrawer = useCallback((msg: ChatMessageRecord) => {
    setCardDrawerMsg(msg);
  }, []);

  const handleCloseCardDrawer = useCallback(() => {
    setCardDrawerMsg(null);
  }, []);

  const handleOpenAddToNote = useCallback((item: NoteAttachmentItem) => {
    setAddToNoteItem(item);
  }, []);

  const handleCloseAddToNote = useCallback(() => {
    setAddToNoteItem(null);
  }, []);

  const handleDispatchChatMessage = useCallback(
    async (prompt: string) => {
      if (!selectedThreadId) return;
      try {
        await sendThreadMessageMutation.mutateAsync({
          threadId: selectedThreadId,
          data: {
            message: prompt,
            date: selectedDate,
          },
        });
      } catch (err: any) {
        message.error(err?.message || 'Ошибка отправки сообщения');
      }
    },
    [selectedThreadId, selectedDate, sendThreadMessageMutation],
  );

  const handleSaveCardToCalendar = useCallback(
    async (payload: any) => {
      try {
        await createNoteMutation.mutateAsync(payload);
        message.success('Карточка успешно добавлена в календарь хроники!');
        setCardDrawerMsg(null);
      } catch (err: any) {
        message.error(err?.message || 'Ошибка сохранения карточки в календарь');
      }
    },
    [createNoteMutation],
  );

  const handleNavigateToCurator = useCallback(
    async (curatorIdOrName: string, contextPrompt?: string) => {
      const curator = curators.find(
        (c: any) =>
          c.id === curatorIdOrName ||
          c.shortName?.toLowerCase() === curatorIdOrName.toLowerCase() ||
          c.name.toLowerCase() === curatorIdOrName.toLowerCase(),
      );

      const targetThread = threads.find(
        (t: any) =>
          (curator && t.curatorId === curator.id) ||
          t.targetAgent === curatorIdOrName ||
          t.title.toLowerCase().includes(curatorIdOrName.toLowerCase()),
      );

      if (targetThread) {
        setSelectedThreadId(targetThread.id);
        if (targetThread.folderId) {
          setSelectedFolderId(targetThread.folderId);
        }
        if (contextPrompt) {
          try {
            await sendThreadMessageMutation.mutateAsync({
              threadId: targetThread.id,
              data: { message: contextPrompt, date: selectedDate },
            });
          } catch {
            // ignore
          }
        }
      } else if (curator) {
        try {
          const created = await createThreadMutation.mutateAsync({
            title: `${curator.emoji} ${curator.name}: ${curator.roleTitle}`,
            type: 'CURATOR',
            curatorId: curator.id,
            folderId: curator.folderId || (selectedFolderId !== 'all' ? selectedFolderId : undefined),
          });
          setSelectedThreadId(created.id);
          if (curator.folderId) {
            setSelectedFolderId(curator.folderId);
          }
          if (contextPrompt) {
            await sendThreadMessageMutation.mutateAsync({
              threadId: created.id,
              data: { message: contextPrompt, date: selectedDate },
            });
          }
        } catch (err: any) {
          message.error(err?.message || 'Не удалось открыть чат куратора');
        }
      }
    },
    [curators, threads, selectedFolderId, selectedDate, sendThreadMessageMutation, createThreadMutation],
  );

  const handleSaveNewsPostToCalendar = useCallback(
    (post: TelegramNewsPreview) => {
      let folder = 'Politics/Russia';
      let taxonomyPath = 'politics.russia';
      if (post.curatorId === 'ivan-bely') {
        folder = 'Politics/Russia';
        taxonomyPath = 'politics.russia';
      } else if (post.curatorId === 'kirk-kitten') {
        folder = 'Politics/Sanctions';
        taxonomyPath = 'politics.international.sanctions';
      } else if (post.curatorId === 'chen-wei') {
        folder = 'Politics/Asia';
        taxonomyPath = 'politics.international.asia';
      } else if (post.curatorId === 'okatsiya') {
        folder = 'Tech/AI';
        taxonomyPath = 'tech.ai.infrastructure';
      } else if (post.curatorId === 'german-kernel') {
        folder = 'Tech/Habr';
        taxonomyPath = 'tech.community.habr';
      }

      setCardDrawerMsg({
        id: `news-card-${Date.now()}`,
        threadId: selectedThreadId || '',
        sender: post.curatorId,
        senderName: post.curatorName,
        senderRole: post.curatorRole,
        text: post.summary,
        createdAt: new Date().toISOString(),
        suggestedCard: {
          title: post.title,
          description: `## ${post.title}\n\n> **Куратор:** ${post.curatorEmoji || '👤'} ${post.curatorName}  \n> **Источник:** [${post.sourceName || 'Первоисточник'}](${post.sourceUrl || '#'})  \n\n${post.summary}\n\n### Фактологическая справка:\n${post.rawText || ''}\n\n### Ключевые аспекты:\n${(post.keyPoints || []).map((k) => `- ${k}`).join('\n')}\n\n---\n*Зафиксировано из хроники Project Lenta.*`,
          type: 'EVENT' as any,
          folder,
          taxonomyPath,
          hashtags: post.tags || ['новости', 'хроника'],
          curator: post.curatorName,
          sourceLink: post.sourceUrl,
        },
      } as any);
    },
    [selectedThreadId],
  );

  const handleAskNewsDetails = useCallback(
    async (post: TelegramNewsPreview) => {
      const prompt = `Расскажи подробнее про новость: «${post.title}». Каковы ключевой контекст, предыстория и значение для контура?`;
      if (selectedThreadId) {
        await handleDispatchChatMessage(prompt);
      }
    },
    [selectedThreadId, handleDispatchChatMessage],
  );

  const handleGenerateMediaPrompt = useCallback(
    async (msg: ChatMessageRecord) => {
      setIsPhotoModalOpen(true);
    },
    [],
  );

  // Create Handlers for Modals
  const handleCreateTopic = useCallback(
    async (payload: {
      title: string;
      folderId: string;
      curatorId?: string | null;
      starterMessage?: string;
    }) => {
      try {
        const created = await createThreadMutation.mutateAsync({
          title: payload.title,
          folderId: payload.folderId,
          curatorId: payload.curatorId || undefined,
          type: 'TOPIC',
        });
        message.success('Топик успешно создан!');
        setIsNewTopicModalOpen(false);
        setSelectedThreadId(created.id);
        setSelectedFolderId(payload.folderId);

        if (payload.starterMessage) {
          await sendThreadMessageMutation.mutateAsync({
            threadId: created.id,
            data: {
              message: payload.starterMessage,
              date: selectedDate,
            },
          });
        }
      } catch (err: any) {
        message.error(err?.message || 'Ошибка создания топика');
      }
    },
    [createThreadMutation, sendThreadMessageMutation, selectedDate],
  );

  const handleCreateCurator = useCallback(
    async (payload: {
      name: string;
      shortName?: string;
      roleTitle: string;
      personality?: string;
      systemPrompt: string;
      emoji: string;
      accentColor: string;
      folderId?: string | null;
    }) => {
      try {
        const createdCurator = await createCuratorMutation.mutateAsync(payload);
        message.success(`Куратор ${createdCurator.name} успешно создан!`);
        setIsNewCuratorModalOpen(false);

        // Create an initial dialogue thread for the new curator
        const createdThread = await createThreadMutation.mutateAsync({
          title: `${createdCurator.emoji} ${createdCurator.name}: ${createdCurator.roleTitle}`,
          type: 'CURATOR',
          curatorId: createdCurator.id,
          folderId: createdCurator.folderId || (selectedFolderId !== 'all' ? selectedFolderId : undefined),
        });
        setSelectedThreadId(createdThread.id);
        if (createdCurator.folderId) {
          setSelectedFolderId(createdCurator.folderId);
        }
      } catch (err: any) {
        message.error(err?.message || 'Ошибка создания куратора');
      }
    },
    [createCuratorMutation, createThreadMutation, selectedFolderId],
  );

  const handleCreateFolder = useCallback(
    async (payload: any) => {
      try {
        const createdFolder = await createFolderMutation.mutateAsync(payload);
        message.success('Папка контура успешно создана!');
        setIsNewFolderModalOpen(false);
        setSelectedFolderId(createdFolder.id);
      } catch (err: any) {
        message.error(err?.message || 'Ошибка создания папки');
      }
    },
    [createFolderMutation],
  );

  const handlePinThread = useCallback(
    (threadId: string, isPinned: boolean) => {
      updateThreadMutation.mutate({ id: threadId, data: { isPinned } });
    },
    [updateThreadMutation],
  );

  const handleDeleteThread = useCallback(
    (threadId: string) => {
      deleteThreadMutation.mutate(threadId);
      if (selectedThreadId === threadId) {
        setSelectedThreadId(null);
      }
    },
    [deleteThreadMutation, selectedThreadId],
  );

  const handleDeleteFolder = useCallback(
    (folderId: string) => {
      deleteFolderMutation.mutate(folderId);
      if (selectedFolderId === folderId) {
        setSelectedFolderId('all');
      }
    },
    [deleteFolderMutation, selectedFolderId],
  );

  const isPendingAny =
    sendThreadMessageMutation.isPending ||
    generatePhotoMutation.isPending ||
    generatePodcastMutation.isPending;

  return (
    <div className="flex h-full w-full max-h-full min-h-0 bg-[#0d1117] text-[#e6edf3] font-sans overflow-hidden rounded-2xl border border-white/10 shadow-2xl relative">
      {/* 1. Left Vertical Telegram-Style Folders Column */}
      <ChatFolderNav
        folders={folders}
        threads={threads}
        selectedFolderId={selectedFolderId}
        onSelectFolder={setSelectedFolderId}
        onOpenCreateFolderModal={() => setIsNewFolderModalOpen(true)}
      />

      {/* 2. Middle Telegram-Style Unified Chat List */}
      <ChatListColumn
        threads={threads}
        activeFolder={activeFolder}
        selectedFolderId={selectedFolderId}
        selectedThreadId={selectedThreadId}
        threadsLoading={threadsLoading}
        searchThreadText={searchThreadText}
        onSearchChange={setSearchThreadText}
        onSelectThread={setSelectedThreadId}
        onPinThread={handlePinThread}
        onDeleteThread={handleDeleteThread}
        onDeleteFolder={handleDeleteFolder}
        onOpenCreateTopicModal={() => setIsNewTopicModalOpen(true)}
        onOpenCreateCuratorModal={() => setIsNewCuratorModalOpen(true)}
      />

      {/* 3. Main Active Chat Section */}
      <section className="flex-1 flex flex-col min-w-0 bg-[#0d1117] h-full relative">
        <ChatHeader
          activeThread={activeThread}
          onPinThread={(isPinned) => selectedThreadId && handlePinThread(selectedThreadId, isPinned)}
          onDeleteThread={() => selectedThreadId && handleDeleteThread(selectedThreadId)}
          onGeneratePhoto={() => setIsPhotoModalOpen(true)}
          onGeneratePodcast={() => setIsPodcastModalOpen(true)}
          isGeneratingPhoto={generatePhotoMutation.isPending}
          isGeneratingPodcast={generatePodcastMutation.isPending}
        />

        <ChatMessageList
          messages={threadMessages}
          isLoading={messagesLoading}
          isPending={isPendingAny}
          selectedThreadId={selectedThreadId}
          onOpenCardDrawer={handleOpenCardDrawer}
          onCopyText={handleCopyText}
          onNavigateToCurator={handleNavigateToCurator}
          onSaveNewsPostToCalendar={handleSaveNewsPostToCalendar}
          onAddToNote={handleOpenAddToNote}
          onGenerateMediaPrompt={handleGenerateMediaPrompt}
          onAskNewsDetails={handleAskNewsDetails}
        />

        <ChatInputBar
          activeThread={activeThread}
          isPending={isPendingAny}
          disabled={!selectedThreadId}
          onSendMessage={handleSendMessage}
          onGeneratePhoto={() => setIsPhotoModalOpen(true)}
          onGeneratePodcast={() => setIsPodcastModalOpen(true)}
          isGeneratingPhoto={generatePhotoMutation.isPending}
          isGeneratingPodcast={generatePodcastMutation.isPending}
        />
      </section>

      {/* 4. Modal: Create New Folder */}
      <CreateFolderModal
        open={isNewFolderModalOpen}
        isPending={createFolderMutation.isPending}
        onClose={() => setIsNewFolderModalOpen(false)}
        onSubmit={handleCreateFolder}
      />

      {/* 5. Modal: Create New Curator */}
      <CreateCuratorModal
        open={isNewCuratorModalOpen}
        isPending={createCuratorMutation.isPending}
        folders={folders}
        defaultFolderId={selectedFolderId !== 'all' ? selectedFolderId : null}
        onClose={() => setIsNewCuratorModalOpen(false)}
        onSubmit={handleCreateCurator}
      />

      {/* 6. Modal: Create New Topic */}
      <CreateTopicModal
        open={isNewTopicModalOpen}
        isPending={createThreadMutation.isPending}
        folders={folders}
        curators={curators}
        defaultFolderId={selectedFolderId !== 'all' ? selectedFolderId : null}
        onClose={() => setIsNewTopicModalOpen(false)}
        onSubmit={handleCreateTopic}
      />

      {/* 7. Modal: Generate Photo with Gemini */}
      <GeneratePhotoModal
        open={isPhotoModalOpen}
        activeThread={activeThread}
        isPending={generatePhotoMutation.isPending}
        onClose={() => setIsPhotoModalOpen(false)}
        onSubmit={handleGeneratePhotoSubmit}
      />

      {/* 8. Modal: Generate NotebookLM Podcast */}
      <GeneratePodcastModal
        open={isPodcastModalOpen}
        activeThread={activeThread}
        isPending={generatePodcastMutation.isPending}
        onClose={() => setIsPodcastModalOpen(false)}
        onSubmit={handleGeneratePodcastSubmit}
      />

      {/* 9. Card Creator Drawer: Turn Message to Calendar Note */}
      <SaveCardDrawer
        open={Boolean(cardDrawerMsg)}
        msg={cardDrawerMsg}
        selectedDate={selectedDate}
        feeds={feeds}
        isPending={createNoteMutation.isPending}
        onClose={handleCloseCardDrawer}
        onSave={handleSaveCardToCalendar}
      />

      {/* 10. Modal: Add to Note + NotebookLM Cluster Builder */}
      <AddToNoteModal
        isOpen={Boolean(addToNoteItem)}
        onClose={handleCloseAddToNote}
        item={addToNoteItem}
        activeThread={activeThread}
        onDispatchChatMessage={handleDispatchChatMessage}
      />
    </div>
  );
};

export default AgentChatPage;
