import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { message } from 'antd';
import dayjs from 'dayjs';
import { AgentId, ResonanceNodeCandidate } from '@lemon/agents';
import {
  useChatFolders,
  useCreateChatFolder,
  useDeleteChatFolder,
  useChatThreads,
  useChatThread,
  useCreateChatThread,
  useUpdateChatThread,
  useDeleteChatThread,
  useThreadMessages,
  useSendThreadMessage,
  useSeedChatDefaults,
  useFeeds,
  useCreateNote,
} from '../../api/queries';
import { ChatMessageRecord, TelegramNewsPreview } from '../../types';
import { useDebounce } from './hooks/useDebounce';
import { ChatSidebar } from './components/ChatSidebar';
import { ChatHeader } from './components/ChatHeader';
import { ChatMessageList } from './components/ChatMessageList';
import { ChatInputBar } from './components/ChatInputBar';
import { CommandsSidebar } from './components/CommandsSidebar';
import { CHAT_COMMANDS_REGISTRY } from './components/commandRegistry';
import { CreateThreadModal } from './components/CreateThreadModal';
import { CreateFolderModal } from './components/CreateFolderModal';
import { SaveCardDrawer } from './components/SaveCardDrawer';
import { AddToNoteModal, NoteAttachmentItem } from './components/AddToNoteModal';

export const AgentChatPage: React.FC = () => {
  // Navigation & Date State
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => dayjs().format('YYYY-MM-DD'));
  const [searchThreadText, setSearchThreadText] = useState('');
  const debouncedSearch = useDebounce(searchThreadText, 250);

  // Commands Sidebar & Preloaded Command
  const [isCommandsSidebarOpen, setIsCommandsSidebarOpen] = useState(false);
  const [insertedCommand, setInsertedCommand] = useState<string | null>(null);

  // Modals & Drawer State
  const [isNewThreadModalOpen, setIsNewThreadModalOpen] = useState(false);
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [cardDrawerMsg, setCardDrawerMsg] = useState<ChatMessageRecord | null>(null);
  const [addToNoteItem, setAddToNoteItem] = useState<NoteAttachmentItem | null>(null);

  // Queries
  const { data: folders = [] } = useChatFolders();
  const { data: threads = [], isLoading: threadsLoading } = useChatThreads({
    search: debouncedSearch || undefined,
  });
  const { data: activeThreadQuery } = useChatThread(selectedThreadId || undefined);

  // Synchronously derive activeThread from threads list to eliminate any flash or jump during thread switching
  const activeThread = useMemo(() => {
    if (!selectedThreadId) return null;
    if (activeThreadQuery && activeThreadQuery.id === selectedThreadId) {
      return activeThreadQuery;
    }
    const fromList = threads.find((t: any) => t.id === selectedThreadId);
    return fromList || activeThreadQuery || null;
  }, [activeThreadQuery, selectedThreadId, threads]);
  const { data: threadMessages = [], isLoading: messagesLoading } = useThreadMessages(
    selectedThreadId || undefined
  );
  const { data: feeds = [] } = useFeeds();

  // Mutations
  const sendThreadMessageMutation = useSendThreadMessage();
  const createThreadMutation = useCreateChatThread();
  const updateThreadMutation = useUpdateChatThread();
  const deleteThreadMutation = useDeleteChatThread();
  const createFolderMutation = useCreateChatFolder();
  const deleteFolderMutation = useDeleteChatFolder();
  const seedDefaultsMutation = useSeedChatDefaults();
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
    if (activeThread?.dateScope) {
      setSelectedDate(activeThread.dateScope);
    }
  }, [activeThread]);

  // Execute or Redirect Command Handler
  const handleExecuteCommand = useCallback(
    async (commandStr: string, customPrompt?: string) => {
      const fullTrimmed = commandStr.trim().toLowerCase();
      const rawCmd = fullTrimmed.split(' ')[0];
      const cmdMeta =
        CHAT_COMMANDS_REGISTRY.find((c) => c.command.toLowerCase() === fullTrimmed) ||
        CHAT_COMMANDS_REGISTRY.find((c) => c.command.toLowerCase() === rawCmd);

      // 1. Redirect commands (e.g. /politics, /it, /survey, /sidework, /ivan, /kirk, etc.)
      if (cmdMeta?.type === 'REDIRECT') {
        let targetThread: any = null;

        if (
          rawCmd === '/politics' ||
          rawCmd === '/politics-today' ||
          rawCmd === '/politics-week' ||
          rawCmd === '/politics-month' ||
          rawCmd === '/group' ||
          rawCmd === '/board'
        ) {
          targetThread = threads.find(
            (t: any) =>
              t.targetAgent === 'political-group' ||
              t.title.includes('Политическая коллегия') ||
              (t.type === 'GROUP' && t.title.toLowerCase().includes('политик'))
          );
        } else if (
          rawCmd === '/it' ||
          rawCmd === '/it-today' ||
          rawCmd === '/it-week' ||
          rawCmd === '/it-month'
        ) {
          targetThread = threads.find(
            (t: any) =>
              (t.type === 'GROUP' && (t.title.includes('IT') || t.title.includes('Технолог'))) ||
              t.targetAgent === 'okatsiya'
          );
        } else if (
          rawCmd === '/breaking' ||
          rawCmd === '/breaking-today' ||
          rawCmd === '/breaking-week' ||
          rawCmd === '/breaking-month' ||
          rawCmd === '/alex'
        ) {
          targetThread = threads.find(
            (t: any) =>
              t.targetAgent === 'alex-vector' ||
              t.title.includes('Breaking') ||
              t.title.includes('Алекс Вектор')
          );
        } else if (rawCmd === '/survey') {
          targetThread = threads.find(
            (t: any) =>
              t.targetAgent === 'survey-coordinator' ||
              t.title.includes('Координатор Опросов')
          );
        } else if (rawCmd === '/sidework') {
          targetThread = threads.find(
            (t: any) =>
              t.targetAgent === 'sidework-producer' ||
              t.title.includes('Продюсер Сайд-Работы')
          );
        } else if (cmdMeta.targetAgent) {
          targetThread = threads.find(
            (t: any) =>
              t.targetAgent === cmdMeta.targetAgent ||
              (cmdMeta.targetThreadKeyword && t.title.includes(cmdMeta.targetThreadKeyword))
          );
        }

        const promptToSend = customPrompt || (commandStr.includes(' ') ? commandStr : cmdMeta.defaultPrompt);

        if (targetThread) {
          setSelectedThreadId(targetThread.id);
          message.info(`Открыт тред: ${targetThread.title}`);
          if (promptToSend) {
            try {
              await sendThreadMessageMutation.mutateAsync({
                threadId: targetThread.id,
                data: {
                  message: promptToSend,
                  forcedTarget: cmdMeta.targetAgent as any,
                  date: selectedDate,
                },
              });
            } catch (err: any) {
              message.error(err?.message || 'Ошибка отправки сообщения');
            }
          }
        } else {
          // If matching thread doesn't exist, create it automatically
          try {
            const isGroup =
              rawCmd === '/politics' ||
              rawCmd === '/it' ||
              rawCmd === '/survey' ||
              rawCmd === '/sidework' ||
              rawCmd === '/survey-breaking' ||
              rawCmd === '/survey-nexus' ||
              rawCmd === '/survey-mena';

            const newTitle = cmdMeta.label;
            const participants =
              rawCmd === '/politics'
                ? ['ivan-bely', 'kirk-kitten', 'chen-wei', 'independent-analyst']
                : rawCmd === '/it'
                ? ['okatsiya', 'independent-analyst']
                : rawCmd === '/survey'
                ? ['survey-coordinator', 'ivan-bely', 'kirk-kitten', 'chen-wei', 'okatsiya']
                : rawCmd === '/sidework'
                ? ['sidework-producer', 'independent-analyst']
                : rawCmd === '/survey-breaking'
                ? ['alex-vector', 'kirk-kitten', 'marcus-vane']
                : rawCmd === '/survey-nexus'
                ? ['marcus-vane', 'tariq-said', 'helena-brandt', 'chen-wei']
                : rawCmd === '/survey-mena'
                ? ['tariq-said', 'ivan-bely', 'kirk-kitten', 'helena-brandt']
                : [cmdMeta.targetAgent || 'general'];

            const created = await createThreadMutation.mutateAsync({
              title: newTitle,
              targetAgent: cmdMeta.targetAgent as any,
              type: isGroup ? 'GROUP' : 'DIRECT',
              participantAgents: participants,
              dateScope: selectedDate,
            });
            setSelectedThreadId(created.id);
            message.success(`Создан тред: ${newTitle}`);

            if (customPrompt) {
              await sendThreadMessageMutation.mutateAsync({
                threadId: created.id,
                data: {
                  message: customPrompt,
                  forcedTarget: cmdMeta.targetAgent as any,
                  date: selectedDate,
                },
              });
            }
          } catch (err: any) {
            message.error(err?.message || 'Не удалось создать тред');
          }
        }
        return;
      }

      // 2. Auxiliary commands - execute right inside the active thread!
      if (!selectedThreadId) {
        message.warning('Сначала выберите чат для выполнения команды');
        return;
      }

      const promptToSend = customPrompt || cmdMeta?.defaultPrompt || commandStr;
      try {
        await sendThreadMessageMutation.mutateAsync({
          threadId: selectedThreadId,
          data: {
            message: promptToSend,
            forcedTarget: cmdMeta?.targetAgent as any,
            date: selectedDate,
          },
        });
      } catch (err: any) {
        message.error(err?.message || 'Ошибка выполнения команды');
      }
    },
    [threads, selectedThreadId, selectedDate, sendThreadMessageMutation, createThreadMutation]
  );

  // Send message action with redirect detection
  const handleSendMessage = useCallback(
    async (text: string, targetAgent: AgentId | 'all') => {
      if (!selectedThreadId || sendThreadMessageMutation.isPending) return;

      const trimmed = text.trim();
      if (trimmed.startsWith('/')) {
        const parts = trimmed.split(' ');
        const command = parts[0].toLowerCase();
        const twoWordCmd = parts.slice(0, 2).join(' ').toLowerCase();

        const cmdMeta =
          CHAT_COMMANDS_REGISTRY.find((c) => c.command.toLowerCase() === twoWordCmd) ||
          CHAT_COMMANDS_REGISTRY.find((c) => c.command.toLowerCase() === command);

        if (cmdMeta?.type === 'REDIRECT') {
          const isAlreadyInTarget =
            activeThread?.targetAgent === cmdMeta.targetAgent ||
            (cmdMeta.targetThreadKeyword && activeThread?.title.includes(cmdMeta.targetThreadKeyword));

          if (!isAlreadyInTarget) {
            // Redirect to target thread with trimmed prompt
            await handleExecuteCommand(command, trimmed);
            return;
          }
        }
      }

      try {
        await sendThreadMessageMutation.mutateAsync({
          threadId: selectedThreadId,
          data: {
            message: text,
            forcedTarget: targetAgent !== 'all' ? targetAgent : undefined,
            date: selectedDate,
          },
        });
      } catch (err: any) {
        message.error(err?.message || 'Ошибка отправки сообщения агентам');
      }
    },
    [selectedThreadId, activeThread, selectedDate, sendThreadMessageMutation, handleExecuteCommand]
  );

  const handleTriggerSynthesis = useCallback(
    async (node: ResonanceNodeCandidate) => {
      if (!selectedThreadId) return;
      const prompt = node.suggestedPrompt || `/synthesis ${node.title}`;
      try {
        await sendThreadMessageMutation.mutateAsync({
          threadId: selectedThreadId,
          data: {
            message: prompt,
            forcedTarget: 'independent-analyst',
            date: selectedDate,
          },
        });
      } catch (err: any) {
        message.error(err?.message || 'Ошибка запуска синтеза');
      }
    },
    [selectedThreadId, selectedDate, sendThreadMessageMutation]
  );

  const handleTriggerSingleSynthesis = useCallback(
    (msg: ChatMessageRecord) => {
      handleTriggerSynthesis({
        id: `synth-${Date.now()}`,
        title: msg.text.substring(0, 40),
        curatorIds: [],
        curatorNames: [],
        resonanceScore: 90,
        topic: 'Арбитраж',
        reasoning: 'Точечный синтез сообщения',
        sharedKeywords: [],
        suggestedPrompt: `/synthesis Проанализируй тезис: "${msg.text.substring(0, 120)}..."`,
      });
    },
    [handleTriggerSynthesis]
  );

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

  const handleGenerateMediaPrompt = useCallback(
    async (msg: ChatMessageRecord) => {
      if (!selectedThreadId) return;
      const prompt = `/media Сгенерируй профессиональные DALL-E / Midjourney промпты и блок-схему Mermaid для визуализации этого материала: "${msg.text.substring(0, 140)}..."`;
      try {
        await sendThreadMessageMutation.mutateAsync({
          threadId: selectedThreadId,
          data: {
            message: prompt,
            forcedTarget: 'sidework-producer',
            date: selectedDate,
          },
        });
        message.info('Запрос на генерацию медиа-промптов отправлен сайд-воркеру');
      } catch (err: any) {
        message.error(err?.message || 'Ошибка генерации медиа');
      }
    },
    [selectedThreadId, selectedDate, sendThreadMessageMutation]
  );

  const handleDispatchChatMessage = useCallback(
    async (prompt: string, forcedTarget?: string) => {
      if (!selectedThreadId) return;
      try {
        await sendThreadMessageMutation.mutateAsync({
          threadId: selectedThreadId,
          data: {
            message: prompt,
            forcedTarget: forcedTarget as any,
            date: selectedDate,
          },
        });
      } catch (err: any) {
        message.error(err?.message || 'Ошибка отправки сообщения');
      }
    },
    [selectedThreadId, selectedDate, sendThreadMessageMutation]
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
    [createNoteMutation]
  );

  const handleNavigateToCurator = useCallback(
    async (curatorId: string, contextPrompt?: string) => {
      const targetThread = threads.find(
        (t: any) =>
          t.targetAgent === curatorId ||
          (curatorId === 'ivan-bely' && (t.title.includes('Иван Белый') || t.title.includes('Контур РФ'))) ||
          (curatorId === 'kirk-kitten' && (t.title.includes('Kirk Kitten') || t.title.includes('Международный'))) ||
          (curatorId === 'chen-wei' && (t.title.includes('Чэнь Вэй') || t.title.includes('АТР'))) ||
          (curatorId === 'okatsiya' && (t.title.includes('Окация') || t.title.includes('IT')))
      );

      if (targetThread) {
        setSelectedThreadId(targetThread.id);
        message.info(`Открыт тред: ${targetThread.title}`);
        if (contextPrompt) {
          try {
            await sendThreadMessageMutation.mutateAsync({
              threadId: targetThread.id,
              data: {
                message: contextPrompt,
                forcedTarget: curatorId as any,
                date: selectedDate,
              },
            });
          } catch {
            // Keep going even if auto-prompt message fails
          }
        }
      } else {
        const curatorTitle =
          curatorId === 'ivan-bely'
            ? '🇷🇺 Иван Белый: Внутренний контур РФ'
            : curatorId === 'kirk-kitten'
            ? '🌐 Kirk Kitten: Международный контур'
            : curatorId === 'chen-wei'
            ? '🇨🇳 Чэнь Вэй: АТР и БРИКС'
            : curatorId === 'okatsiya'
            ? '⚡ Окация: Архитектура IT & AI'
            : `Куратор (${curatorId})`;

        try {
          const created = await createThreadMutation.mutateAsync({
            title: curatorTitle,
            targetAgent: curatorId as any,
            type: 'DIRECT' as any,
            dateScope: selectedDate,
          });
          setSelectedThreadId(created.id);
          message.success(`Создан диалог: ${curatorTitle}`);
        } catch (err: any) {
          message.error(err?.message || 'Не удалось открыть тред куратора');
        }
      }
    },
    [threads, createThreadMutation, selectedDate, sendThreadMessageMutation]
  );

  const handleSaveNewsPostToCalendar = useCallback(
    (post: TelegramNewsPreview) => {
      setCardDrawerMsg({
        id: `news-card-${Date.now()}`,
        threadId: selectedThreadId || '',
        sender: post.curatorId,
        senderName: post.curatorName,
        senderRole: post.curatorRole,
        text: post.summary,
        resonanceScore: post.resonanceScore,
        createdAt: new Date().toISOString(),
        suggestedCard: {
          title: post.title,
          description: `## ${post.title}\n\n> **Куратор:** ${post.curatorEmoji} ${post.curatorName}  \n> **Источник:** [${post.sourceName}](${post.sourceUrl || '#'})  \n> **Индекс резонанса:** \`${post.resonanceScore}%\`\n\n${post.summary}\n\n### Фактологическая справка:\n${post.rawText || ''}\n\n### Ключевые аспекты:\n${(post.keyPoints || []).map((k) => `- ${k}`).join('\n')}\n\n---\n*Зафиксировано из Telegram-дайджеста хроники Project Lenta.*`,
          type: 'EVENT' as any,
          folder: post.curatorId === 'ivan-bely' ? 'Politics/Russia' : 'Politics/Sanctions',
          taxonomyPath: post.curatorId === 'ivan-bely' ? 'politics.russia' : 'politics.international.sanctions',
          hashtags: post.tags,
          curator: post.curatorName,
          resonanceScore: post.resonanceScore,
          sourceLink: post.sourceUrl,
        },
      } as any);
    },
    [selectedThreadId]
  );

  const handleCreateThread = useCallback(
    async (payload: any) => {
      try {
        const created = await createThreadMutation.mutateAsync(payload);
        message.success('Чат успешно создан!');
        setIsNewThreadModalOpen(false);
        setSelectedThreadId(created.id);
      } catch (err: any) {
        message.error(err?.message || 'Ошибка создания чата');
      }
    },
    [createThreadMutation]
  );

  const handleCreateFolder = useCallback(
    async (payload: any) => {
      try {
        await createFolderMutation.mutateAsync(payload);
        message.success('Папка успешно создана!');
        setIsNewFolderModalOpen(false);
      } catch (err: any) {
        message.error(err?.message || 'Ошибка создания папки');
      }
    },
    [createFolderMutation]
  );

  const handlePinThread = useCallback(
    (threadId: string, isPinned: boolean) => {
      updateThreadMutation.mutate({ id: threadId, data: { isPinned } });
    },
    [updateThreadMutation]
  );

  const handleDeleteThread = useCallback(
    (threadId: string) => {
      deleteThreadMutation.mutate(threadId);
      if (selectedThreadId === threadId) {
        setSelectedThreadId(null);
      }
    },
    [deleteThreadMutation, selectedThreadId]
  );

  const handleDeleteFolder = useCallback(
    (folderId: string) => {
      deleteFolderMutation.mutate(folderId);
    },
    [deleteFolderMutation]
  );

  const handleSeedDefaults = useCallback(() => {
    seedDefaultsMutation.mutate();
  }, [seedDefaultsMutation]);

  return (
    <div className="flex h-full w-full max-h-full min-h-0 bg-[#0d1117] text-[#e6edf3] font-sans overflow-hidden rounded-2xl border border-white/10 shadow-2xl relative">
      {/* 1. Left Sidebar: Folders & Threads Navigator (Compact) */}
      <ChatSidebar
        folders={folders}
        threads={threads}
        selectedThreadId={selectedThreadId}
        threadsLoading={threadsLoading}
        searchThreadText={searchThreadText}
        onSearchChange={setSearchThreadText}
        onSelectThread={setSelectedThreadId}
        onPinThread={handlePinThread}
        onDeleteThread={handleDeleteThread}
        onDeleteFolder={handleDeleteFolder}
        onOpenCreateThreadModal={() => setIsNewThreadModalOpen(true)}
        onOpenCreateFolderModal={() => setIsNewFolderModalOpen(true)}
        onSeedDefaults={handleSeedDefaults}
        isSeeding={seedDefaultsMutation.isPending}
      />

      {/* 2. Main Active Chat Section */}
      <section className="flex-1 flex flex-col min-w-0 bg-[#0d1117] h-full relative">
        <ChatHeader
          activeThread={activeThread}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onPinThread={(isPinned) => selectedThreadId && handlePinThread(selectedThreadId, isPinned)}
          onDeleteThread={() => selectedThreadId && handleDeleteThread(selectedThreadId)}
          onToggleCommandsSidebar={() => setIsCommandsSidebarOpen((prev) => !prev)}
          isCommandsSidebarOpen={isCommandsSidebarOpen}
        />

        <ChatMessageList
          messages={threadMessages}
          isLoading={messagesLoading}
          isPending={sendThreadMessageMutation.isPending}
          selectedThreadId={selectedThreadId}
          onOpenCardDrawer={handleOpenCardDrawer}
          onCopyText={handleCopyText}
          onTriggerSynthesis={handleTriggerSynthesis}
          onTriggerSingleSynthesis={handleTriggerSingleSynthesis}
          onNavigateToCurator={handleNavigateToCurator}
          onSaveNewsPostToCalendar={handleSaveNewsPostToCalendar}
          onAddToNote={handleOpenAddToNote}
          onGenerateMediaPrompt={handleGenerateMediaPrompt}
        />

        <ChatInputBar
          activeThread={activeThread}
          isPending={sendThreadMessageMutation.isPending}
          disabled={!selectedThreadId}
          onSendMessage={handleSendMessage}
          onExecuteCommand={handleExecuteCommand}
          onToggleCommandsSidebar={() => setIsCommandsSidebarOpen((prev) => !prev)}
          isCommandsSidebarOpen={isCommandsSidebarOpen}
          insertedCommand={insertedCommand}
          onClearInsertedCommand={() => setInsertedCommand(null)}
        />
      </section>

      {/* 3. Right Sidebar: Full Commands Map (Collapsible) */}
      {isCommandsSidebarOpen && (
        <CommandsSidebar
          onClose={() => setIsCommandsSidebarOpen(false)}
          onExecuteCommand={handleExecuteCommand}
          onInsertCommand={(cmd) => setInsertedCommand(cmd)}
          activeThreadTitle={activeThread?.title}
        />
      )}

      {/* 4. Modal: Create New Thread */}
      <CreateThreadModal
        open={isNewThreadModalOpen}
        folders={folders}
        selectedDate={selectedDate}
        isPending={createThreadMutation.isPending}
        onClose={() => setIsNewThreadModalOpen(false)}
        onSubmit={handleCreateThread}
      />

      {/* 5. Modal: Create New Folder */}
      <CreateFolderModal
        open={isNewFolderModalOpen}
        isPending={createFolderMutation.isPending}
        onClose={() => setIsNewFolderModalOpen(false)}
        onSubmit={handleCreateFolder}
      />

      {/* 6. Card Creator Drawer: Turn Message to Calendar Note */}
      <SaveCardDrawer
        open={Boolean(cardDrawerMsg)}
        msg={cardDrawerMsg}
        selectedDate={selectedDate}
        feeds={feeds}
        isPending={createNoteMutation.isPending}
        onClose={handleCloseCardDrawer}
        onSave={handleSaveCardToCalendar}
      />

      {/* 7. Modal: Add to Note + (Cluster & Super Note builder for NotebookLM) */}
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
