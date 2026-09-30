import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Button,
  Input,
  DatePicker,
  Select,
  Drawer,
  Tag,
  Tooltip,
  Badge,
  Spin,
  message,
  Modal,
  Radio,
  Checkbox,
  Popconfirm,
  Dropdown,
} from 'antd';
import dayjs from 'dayjs';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ChatMessage,
  ChatSnippet,
  DEFAULT_CHAT_SNIPPETS,
  AgentId,
  ResonanceNodeCandidate,
} from '@lemon/agents';
import { NoteType, CURATOR_PERSONAS_LIST, CURATOR_GROUPS_LIST } from '@lenta/shared';
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
import { FolderSelect } from '../../components/FolderSelect';
import { HashtagInput } from '../../components/HashtagInput';
import { NoteTypeSelect } from '../../components/NoteTypeSelect';
import { FolderInputItem, ChatFolder, ChatThread, ChatMessageRecord } from '../../types';
import {
  Folder as FolderIcon,
  FolderPlus,
  MessageSquarePlus,
  Pin,
  Trash2,
  Users,
  User,
  Search,
  Send as SendIcon,
  MoreVertical,
  ChevronDown,
  ChevronRight,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

const { TextArea } = Input;

// Custom markdown components for crisp bullets, blockquotes and headings
const markdownComponents = {
  p: ({ children }: any) => <p className="my-1.5 leading-relaxed text-gray-200">{children}</p>,
  ul: ({ children }: any) => <ul className="list-disc pl-5 my-2 space-y-1 text-gray-200">{children}</ul>,
  ol: ({ children }: any) => <ol className="list-decimal pl-5 my-2 space-y-1 text-gray-200">{children}</ol>,
  li: ({ children }: any) => <li className="my-0.5 leading-relaxed">{children}</li>,
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-4 border-primary/70 bg-white/5 pl-3.5 py-1.5 my-2.5 rounded-r text-gray-300 italic">
      {children}
    </blockquote>
  ),
  h3: ({ children }: any) => (
    <h3 className="text-sm font-bold text-white mt-3 mb-1.5 pb-1 border-b border-white/5">
      {children}
    </h3>
  ),
  h4: ({ children }: any) => (
    <h4 className="text-xs font-bold text-gray-200 uppercase tracking-wider mt-2.5 mb-1">
      {children}
    </h4>
  ),
  code: ({ inline, children }: any) =>
    inline ? (
      <code className="bg-white/10 px-1 py-0.5 rounded text-[12px] font-mono text-primary">
        {children}
      </code>
    ) : (
      <pre className="bg-[#0d1117] p-3 rounded-lg border border-white/10 overflow-x-auto my-2 text-xs font-mono text-gray-300">
        <code>{children}</code>
      </pre>
    ),
};

export const AgentChatPage: React.FC = () => {
  // Navigation & Folders State
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [searchThreadText, setSearchThreadText] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Queries
  const { data: folders = [], isLoading: foldersLoading } = useChatFolders();
  const { data: threads = [], isLoading: threadsLoading } = useChatThreads({
    search: searchThreadText,
  });
  const { data: activeThread, isLoading: activeThreadLoading } = useChatThread(selectedThreadId || undefined);
  const { data: threadMessages = [], isLoading: messagesLoading } = useThreadMessages(
    selectedThreadId || undefined,
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

  // Active Thread State
  const [selectedDate, setSelectedDate] = useState<string>(
    dayjs().format('YYYY-MM-DD'),
  );
  const [inputText, setInputText] = useState('');
  const [selectedTargetAgent, setSelectedTargetAgent] = useState<AgentId | 'all'>('all');
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');

  // Modals State
  const [isNewThreadModalOpen, setIsNewThreadModalOpen] = useState(false);
  const [newThreadType, setNewThreadType] = useState<'DIRECT' | 'GROUP'>('GROUP');
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadFolderId, setNewThreadFolderId] = useState<string | undefined>(undefined);
  const [newThreadCurator, setNewThreadCurator] = useState<string>('ivan-bely');
  const [newThreadParticipants, setNewThreadParticipants] = useState<string[]>([
    'ivan-bely',
    'kirk-kitten',
    'chen-wei',
    'independent-analyst',
  ]);

  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#3b82f6');
  const [newFolderIcon, setNewFolderIcon] = useState('Folder');

  // Card Drawer State (Save Message as Calendar Note)
  const [cardDrawerOpen, setCardDrawerOpen] = useState(false);
  const [cardTitle, setCardTitle] = useState('');
  const [cardType, setCardType] = useState<NoteType>(NoteType.EVENT);
  const [cardCurator, setCardCurator] = useState('ivan-bely');
  const [cardFolders, setCardFolders] = useState<FolderInputItem[]>([
    { path: 'Politics/Russia', isPrimary: true, order: 0 },
  ]);
  const [cardTaxonomyPath, setCardTaxonomyPath] = useState('politics.russia');
  const [cardHashtags, setCardHashtags] = useState<string[]>(['повестка', 'хроника']);
  const [cardDescription, setCardDescription] = useState('');
  const [cardFeedId, setCardFeedId] = useState<string>('');
  const [cardResonance, setCardResonance] = useState<number>(85);
  const [cardSourceLink, setCardSourceLink] = useState<string | undefined>(undefined);

  // Scroll anchors
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<any>(null);

  // Auto-select first thread if none selected
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

  // Smooth scroll to bottom on new messages
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [threadMessages, sendThreadMessageMutation.isPending]);

  // Group threads by folder
  const { pinnedThreads, folderGroupedThreads, unassignedThreads } = useMemo(() => {
    const pinned: ChatThread[] = [];
    const grouped: Record<string, ChatThread[]> = {};
    const unassigned: ChatThread[] = [];

    folders.forEach((f: any) => {
      grouped[f.id] = [];
    });

    threads.forEach((t: any) => {
      if (t.isPinned) {
        pinned.push(t);
      }
      if (t.folderId && grouped[t.folderId]) {
        grouped[t.folderId].push(t);
      } else {
        unassigned.push(t);
      }
    });

    return {
      pinnedThreads: pinned,
      folderGroupedThreads: grouped,
      unassignedThreads: unassigned,
    };
  }, [threads, folders]);

  // Handle slash commands input
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);

    if (val.startsWith('/')) {
      setShowSlashMenu(true);
      setSlashFilter(val.slice(1).toLowerCase());
    } else {
      setShowSlashMenu(false);
    }
  };

  const handleSelectSnippet = (snippet: ChatSnippet) => {
    setInputText(snippet.command + ' ');
    if (snippet.targetAgent !== 'all') {
      setSelectedTargetAgent(snippet.targetAgent);
    }
    setShowSlashMenu(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || sendThreadMessageMutation.isPending || !selectedThreadId) return;
    const msgToSend = inputText.trim();
    setInputText('');
    setShowSlashMenu(false);

    try {
      await sendThreadMessageMutation.mutateAsync({
        threadId: selectedThreadId,
        data: {
          message: msgToSend,
          forcedTarget: selectedTargetAgent !== 'all' ? selectedTargetAgent : undefined,
          date: selectedDate,
        },
      });
    } catch (err: any) {
      message.error(err?.message || 'Ошибка отправки сообщения агентам');
    }
  };

  const handleTriggerTargetedSynthesis = async (node: ResonanceNodeCandidate) => {
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
  };

  // Convert Message to Note Drawer
  const handleOpenCardDrawer = (msg: ChatMessageRecord) => {
    const card = msg.suggestedCard;
    const title =
      card?.title ||
      msg.senderRole + ': ' + msg.text.substring(0, 60).replace(/[#*`]/g, '') + '...';
    const type = card?.type || NoteType.SINGLE;
    const curator =
      card?.curator ||
      (msg.sender === 'political-group'
        ? 'Политическая коллегия'
        : msg.sender === 'okatsiya'
        ? 'Окация'
        : msg.sender);
    const folderPath =
      card?.folder ||
      (msg.sender === 'political-group'
        ? 'Politics/Daily'
        : msg.sender === 'okatsiya'
        ? 'Tech/Daily'
        : msg.sender === 'kirk-kitten'
        ? 'Politics/International'
        : msg.sender === 'chen-wei'
        ? 'Politics/Asia'
        : msg.sender === 'independent-analyst'
        ? 'Synthesis/2026'
        : 'Politics/Russia');
    const taxonomy =
      card?.taxonomyPath ||
      (msg.sender === 'political-group'
        ? 'politics.daily_summary'
        : msg.sender === 'okatsiya'
        ? 'tech.overview'
        : msg.sender === 'kirk-kitten'
        ? 'politics.international'
        : msg.sender === 'chen-wei'
        ? 'politics.international.asia'
        : msg.sender === 'independent-analyst'
        ? 'politics.cross_analysis'
        : 'politics.russia');
    const hashtags =
      card?.hashtags ||
      (msg.sender === 'okatsiya' ? ['IT', 'AI', 'Технологии'] : ['новости', 'повестка']);
    const desc =
      card?.description ||
      `## ${title}\n\n> **Куратор:** ${msg.senderName} (${msg.senderRole})  \n> **Дата:** ${selectedDate}  \n> **Индекс резонанса:** \`${
        msg.resonanceScore || 75
      }%\`\n\n${msg.text}\n\n---\n*Материал зафиксирован из Аналитического Чата.*`;

    setCardTitle(title);
    setCardType(type);
    setCardCurator(curator);
    setCardFolders([{ path: folderPath, isPrimary: true, order: 0 }]);
    setCardTaxonomyPath(taxonomy);
    setCardHashtags(hashtags);
    setCardDescription(desc);
    setCardResonance(card?.resonanceScore || msg.resonanceScore || 80);
    setCardSourceLink(card?.sourceLink || (msg.sources && msg.sources[0]) || undefined);
    setCardFeedId(feeds[0]?.id || '');

    setCardDrawerOpen(true);
  };

  const handleSaveCardToCalendar = async () => {
    if (!cardTitle.trim()) {
      message.error('Укажите заголовок карточки');
      return;
    }

    try {
      const primaryFolder =
        cardFolders.find((f) => f.isPrimary)?.path || cardFolders[0]?.path || 'News/Daily';
      await createNoteMutation.mutateAsync({
        title: cardTitle.trim(),
        description: cardDescription,
        type: cardType,
        feedId: cardFeedId || undefined,
        startDate: `${selectedDate}T12:00:00.000Z`,
        curator: cardCurator,
        resonanceScore: cardResonance,
        sourceLink: cardSourceLink,
        folder: primaryFolder,
        folders: cardFolders,
        taxonomyPath: cardTaxonomyPath,
        hashtags: cardHashtags,
      } as any);

      message.success('Карточка успешно добавлена в календарь хроники!');
      setCardDrawerOpen(false);
    } catch (err: any) {
      message.error(err?.message || 'Ошибка сохранения карточки в календарь');
    }
  };

  const handleCopyText = (txt: string) => {
    navigator.clipboard.writeText(txt);
    message.success('Текст скопирован в буфер обмена');
  };

  // Toggle Folder Accordion
  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: prev[folderId] === undefined ? false : !prev[folderId],
    }));
  };

  // Create Thread Handler
  const handleCreateThreadSubmit = async () => {
    if (!newThreadTitle.trim()) {
      message.error('Укажите название чата');
      return;
    }

    try {
      const created = await createThreadMutation.mutateAsync({
        title: newThreadTitle.trim(),
        type: newThreadType,
        folderId: newThreadFolderId,
        targetAgent: newThreadType === 'DIRECT' ? newThreadCurator : undefined,
        participantAgents:
          newThreadType === 'GROUP' ? newThreadParticipants : [newThreadCurator],
        dateScope: selectedDate,
      });

      message.success('Чат успешно создан!');
      setIsNewThreadModalOpen(false);
      setNewThreadTitle('');
      setSelectedThreadId(created.id);
    } catch (err: any) {
      message.error(err?.message || 'Ошибка создания чата');
    }
  };

  // Create Folder Handler
  const handleCreateFolderSubmit = async () => {
    if (!newFolderName.trim()) {
      message.error('Укажите название папки');
      return;
    }

    try {
      await createFolderMutation.mutateAsync({
        name: newFolderName.trim(),
        color: newFolderColor,
        icon: newFolderIcon,
      });
      message.success('Папка успешно создана!');
      setIsNewFolderModalOpen(false);
      setNewFolderName('');
    } catch (err: any) {
      message.error(err?.message || 'Ошибка создания папки');
    }
  };

  const filteredSnippets = DEFAULT_CHAT_SNIPPETS.filter(
    (s) => s.command.includes(slashFilter) || s.label.toLowerCase().includes(slashFilter),
  );

  return (
    <div className="flex h-full w-full max-h-full min-h-0 bg-[#0d1117] text-[#e6edf3] font-sans overflow-hidden rounded-2xl border border-white/10 shadow-2xl relative">
      {/* 1. Left Sidebar: Folders & Threads Navigator */}
      <aside
        className={`${
          sidebarCollapsed ? 'w-16' : 'w-80'
        } bg-[#161b22] border-r border-white/10 flex flex-col flex-shrink-0 transition-all duration-200 select-none z-20`}
      >
        {/* Sidebar Header */}
        <div className="p-3 border-b border-white/5 flex items-center justify-between gap-2">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="material-symbols-outlined text-primary text-xl">forum</span>
              <span className="font-bold text-xs uppercase tracking-wider text-white truncate">
                Чаты & Коллегии
              </span>
            </div>
          )}

          <div className="flex items-center gap-1">
            {!sidebarCollapsed && (
              <>
                <Tooltip title="Создать новый чат">
                  <Button
                    type="text"
                    size="small"
                    onClick={() => {
                      setNewThreadType('GROUP');
                      setNewThreadTitle('');
                      setIsNewThreadModalOpen(true);
                    }}
                    className="text-gray-400 hover:text-primary hover:bg-white/5 p-1 h-7 w-7 flex items-center justify-center"
                  >
                    <MessageSquarePlus className="w-4 h-4" />
                  </Button>
                </Tooltip>

                <Tooltip title="Создать тематическую папку">
                  <Button
                    type="text"
                    size="small"
                    onClick={() => {
                      setNewFolderName('');
                      setIsNewFolderModalOpen(true);
                    }}
                    className="text-gray-400 hover:text-emerald-400 hover:bg-white/5 p-1 h-7 w-7 flex items-center justify-center"
                  >
                    <FolderPlus className="w-4 h-4" />
                  </Button>
                </Tooltip>
              </>
            )}

            <Button
              type="text"
              size="small"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="text-gray-400 hover:text-white p-1 h-7 w-7 flex items-center justify-center"
              title={sidebarCollapsed ? 'Развернуть панель' : 'Свернуть панель'}
            >
              <span className="material-symbols-outlined text-base">
                {sidebarCollapsed ? 'chevron_right' : 'chevron_left'}
              </span>
            </Button>
          </div>
        </div>

        {/* Search Input */}
        {!sidebarCollapsed && (
          <div className="p-2 border-b border-white/5">
            <Input
              prefix={<Search className="w-3.5 h-3.5 text-gray-500 mr-1" />}
              placeholder="Поиск по чатам..."
              value={searchThreadText}
              onChange={(e) => setSearchThreadText(e.target.value)}
              allowClear
              className="bg-white/5 border-white/10 text-xs text-white placeholder-gray-500 h-8 rounded-lg"
            />
          </div>
        )}

        {/* Threads & Folders List */}
        {!sidebarCollapsed ? (
          <div className="flex-1 overflow-y-auto p-2 space-y-3 text-xs custom-scrollbar">
            {threads.length === 0 && !threadsLoading && (
              <div className="text-center py-6 px-3 bg-white/5 rounded-xl border border-white/5">
                <p className="text-gray-400 text-xs mb-3">Чаты еще не созданы</p>
                <Button
                  type="primary"
                  size="small"
                  onClick={() => seedDefaultsMutation.mutate()}
                  loading={seedDefaultsMutation.isPending}
                  className="bg-primary text-on-primary text-xs font-bold"
                >
                  Загрузить стандартные папки
                </Button>
              </div>
            )}

            {/* Pinned Threads */}
            {pinnedThreads.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-mono uppercase tracking-wider text-amber-400/90">
                  <Pin className="w-3 h-3 text-amber-400" />
                  <span>Закрепленные</span>
                </div>
                <div className="space-y-1 mt-1">
                  {pinnedThreads.map((thread) => (
                    <ThreadListItem
                      key={thread.id}
                      thread={thread}
                      isActive={thread.id === selectedThreadId}
                      onSelect={() => setSelectedThreadId(thread.id)}
                      onPin={(isPinned) =>
                        updateThreadMutation.mutate({ id: thread.id, data: { isPinned } })
                      }
                      onDelete={() => deleteThreadMutation.mutate(thread.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Folders Accordion */}
            {folders.map((folder) => {
              const folderThreads = folderGroupedThreads[folder.id] || [];
              const isExpanded = expandedFolders[folder.id] !== false; // expanded by default

              return (
                <div key={folder.id} className="space-y-1">
                  <div
                    onClick={() => toggleFolder(folder.id)}
                    className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer text-gray-300 font-semibold group transition-all"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      )}
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: folder.color || '#3b82f6' }}
                      />
                      <span className="truncate text-xs text-white">{folder.name}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-gray-400 font-mono">
                        {folderThreads.length}
                      </span>
                      <Popconfirm
                        title="Удалить папку?"
                        description="Чаты из папки останутся в общем списке."
                        onConfirm={(e) => {
                          e?.stopPropagation();
                          deleteFolderMutation.mutate(folder.id);
                        }}
                        okText="Удалить"
                        cancelText="Отмена"
                      >
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-0.5 text-gray-500 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </Popconfirm>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="pl-3 space-y-1">
                      {folderThreads.length === 0 ? (
                        <div className="text-[11px] text-gray-500 italic px-2 py-1">
                          В этой папке пусто
                        </div>
                      ) : (
                        folderThreads.map((thread) => (
                          <ThreadListItem
                            key={thread.id}
                            thread={thread}
                            isActive={thread.id === selectedThreadId}
                            onSelect={() => setSelectedThreadId(thread.id)}
                            onPin={(isPinned) =>
                              updateThreadMutation.mutate({ id: thread.id, data: { isPinned } })
                            }
                            onDelete={() => deleteThreadMutation.mutate(thread.id)}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Unassigned Threads */}
            {unassignedThreads.length > 0 && (
              <div className="space-y-1 pt-2 border-t border-white/5">
                <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-mono uppercase tracking-wider text-gray-400">
                  <FolderIcon className="w-3 h-3" />
                  <span>Общие диалоги</span>
                  <span className="ml-auto text-[10px] bg-white/10 px-1.5 py-0.5 rounded font-mono">
                    {unassignedThreads.length}
                  </span>
                </div>
                <div className="space-y-1">
                  {unassignedThreads.map((thread) => (
                    <ThreadListItem
                      key={thread.id}
                      thread={thread}
                      isActive={thread.id === selectedThreadId}
                      onSelect={() => setSelectedThreadId(thread.id)}
                      onPin={(isPinned) =>
                        updateThreadMutation.mutate({ id: thread.id, data: { isPinned } })
                      }
                      onDelete={() => deleteThreadMutation.mutate(thread.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Collapsed Mini Sidebar */
          <div className="flex-1 py-3 flex flex-col items-center gap-2 overflow-y-auto">
            {threads.slice(0, 10).map((thread: any) => (
              <Tooltip key={thread.id} title={thread.title} placement="right">
                <button
                  onClick={() => setSelectedThreadId(thread.id)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    thread.id === selectedThreadId
                      ? 'bg-primary text-black font-bold shadow-md'
                      : 'bg-white/5 hover:bg-white/10 text-gray-300'
                  }`}
                >
                  {thread.type === 'GROUP' ? '👥' : getCuratorEmoji(thread.targetAgent)}
                </button>
              </Tooltip>
            ))}
          </div>
        )}

        {/* Sidebar Footer: Quick Seeding button */}
        {!sidebarCollapsed && (
          <div className="p-2 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-400">
            <span>Project Lenta Desk</span>
            <Button
              type="text"
              size="small"
              onClick={() => seedDefaultsMutation.mutate()}
              loading={seedDefaultsMutation.isPending}
              className="text-gray-400 hover:text-primary text-[11px] flex items-center gap-1"
              title="Перезагрузить папки и стартовые комнаты"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Сброс</span>
            </Button>
          </div>
        )}
      </aside>

      {/* 2. Main Active Chat Section */}
      <section className="flex-1 flex flex-col min-w-0 bg-[#0d1117] h-full relative">
        {/* Top Chat Header */}
        <header className="h-16 px-4 border-b border-white/10 bg-[#161b22]/90 backdrop-blur flex items-center justify-between flex-shrink-0 z-10">
          {activeThread ? (
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl flex-shrink-0">
                {activeThread.type === 'GROUP'
                  ? '🏛️'
                  : getCuratorEmoji(activeThread.targetAgent)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-sm text-white truncate">{activeThread.title}</h2>
                  <Tag
                    color={activeThread.type === 'GROUP' ? 'cyan' : 'purple'}
                    className="text-[10px] font-mono uppercase tracking-wider"
                  >
                    {activeThread.type === 'GROUP' ? '👥 Групповая коллегия' : '👤 Одиночный чат'}
                  </Tag>

                  {activeThread.folder && (
                    <span className="text-[11px] text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/5 flex items-center gap-1">
                      <FolderIcon className="w-3 h-3 text-sky-400" />
                      {activeThread.folder.name}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                  <span>Участники:</span>
                  <div className="flex items-center gap-1">
                    {activeThread.participantAgents?.map((agentId: string) => {
                      const persona = CURATOR_PERSONAS_LIST.find((p) => p.id === agentId);
                      return (
                        <span
                          key={agentId}
                          className="bg-white/5 px-1.5 py-0.2 rounded text-[10px] text-gray-300 font-mono"
                          title={persona?.role || agentId}
                        >
                          {persona ? `${persona.emoji} ${persona.shortName}` : agentId}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-400">Выберите диалог слева для начала общения</div>
          )}

          {/* Header Controls: Date & Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <DatePicker
              value={dayjs(selectedDate)}
              onChange={(d) => d && setSelectedDate(d.format('YYYY-MM-DD'))}
              allowClear={false}
              className="bg-white/5 border-white/10 text-white text-xs h-8 rounded-lg"
            />

            {activeThread && (
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'pin',
                      label: activeThread.isPinned ? 'Открепить' : 'Закрепить вверху',
                      icon: <Pin className="w-3.5 h-3.5" />,
                      onClick: () =>
                        updateThreadMutation.mutate({
                          id: activeThread.id,
                          data: { isPinned: !activeThread.isPinned },
                        }),
                    },
                    {
                      type: 'divider',
                    },
                    {
                      key: 'delete',
                      label: 'Удалить диалог',
                      icon: <Trash2 className="w-3.5 h-3.5 text-red-400" />,
                      danger: true,
                      onClick: () => {
                        deleteThreadMutation.mutate(activeThread.id);
                        setSelectedThreadId(null);
                      },
                    },
                  ],
                }}
              >
                <Button
                  type="text"
                  size="small"
                  className="text-gray-400 hover:text-white h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white/5"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </Dropdown>
            )}
          </div>
        </header>

        {/* Message Stream */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 text-sm custom-scrollbar"
        >
          {messagesLoading ? (
            <div className="flex items-center justify-center h-48">
              <Spin tip="Загрузка истории диалога..." />
            </div>
          ) : threadMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-gray-500">
              <span className="material-symbols-outlined text-4xl mb-2 opacity-40">chat</span>
              <p className="text-sm font-medium">В этом диалоге еще нет сообщений</p>
              <p className="text-xs max-w-sm mt-1 text-gray-400">
                Задайте вопрос агентам ниже или воспользуйтесь быстрой командой через{' '}
                <code className="text-primary font-mono">/</code>
              </p>
            </div>
          ) : (
            threadMessages.map((msg: ChatMessageRecord) => (
              <div
                key={msg.id}
                className={`flex gap-3 group animate-in fade-in duration-200 ${
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {/* Agent Avatar */}
                {msg.sender !== 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-base flex-shrink-0 mt-0.5">
                    {msg.avatar || '🤖'}
                  </div>
                )}

                {/* Message Body */}
                <div
                  className={`max-w-[85%] rounded-2xl p-4 border transition-all ${
                    msg.sender === 'user'
                      ? 'bg-primary/15 border-primary/40 text-white rounded-tr-none'
                      : 'bg-[#161b22] border-white/10 text-gray-200 rounded-tl-none shadow-lg'
                  }`}
                >
                  {/* Sender Metadata Bar */}
                  <div className="flex items-center justify-between gap-3 mb-2 pb-1.5 border-b border-white/5 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white tracking-wide">
                        {msg.senderName}
                      </span>
                      <span className="text-gray-400 opacity-80">· {msg.senderRole}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {msg.resonanceScore && (
                        <Badge
                          count={`${msg.resonanceScore}%`}
                          style={{
                            backgroundColor:
                              msg.resonanceScore > 80
                                ? '#ef4444'
                                : msg.resonanceScore > 60
                                ? '#f59e0b'
                                : '#10b981',
                            color: '#fff',
                            fontSize: '10px',
                            fontWeight: 'bold',
                          }}
                          title="Индекс резонанса"
                        />
                      )}
                      <span className="text-[10px] text-gray-500 font-mono">
                        {dayjs(msg.createdAt).format('HH:mm')}
                      </span>
                    </div>
                  </div>

                  {/* Markdown Content */}
                  <div className="prose prose-invert max-w-none text-xs leading-relaxed">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={markdownComponents as any}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  </div>

                  {/* Sources Footnote */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-white/5 flex flex-wrap gap-1.5 items-center">
                      <span className="text-[10px] font-mono text-gray-400 uppercase">
                        Источники:
                      </span>
                      {msg.sources.map((src, i) => (
                        <a
                          key={i}
                          href={src}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-sky-400 hover:underline max-w-[200px] truncate bg-white/5 px-2 py-0.5 rounded"
                        >
                          {src}
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Modular Group Summary Payload Rendering */}
                  {msg.groupSummary && (
                    <div className="mt-4 space-y-3">
                      <div className="text-xs font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                        <span>{msg.groupSummary.headline}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {msg.groupSummary.sections?.map((sec: any) => (
                          <div
                            key={sec.curatorId}
                            className="p-2.5 rounded-xl border bg-black/20 text-xs"
                            style={{ borderColor: `${sec.accentColor}40` }}
                          >
                            <div className="font-bold mb-1.5 flex items-center gap-1">
                              <span>{sec.emoji}</span>
                              <span style={{ color: sec.accentColor }}>{sec.curatorName}</span>
                            </div>
                            <ul className="space-y-1 list-disc pl-4 text-gray-300 text-[11px]">
                              {sec.bullets?.map((b: string, idx: number) => (
                                <li key={idx}>{b}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Resonance Nodes Candidates (Clickable Synthesis Triggers) */}
                  {msg.resonanceNodes && msg.resonanceNodes.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-white/5 space-y-1.5">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 flex items-center gap-1">
                        <span>⚡ Точки кросс-контурного резонанса:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.resonanceNodes.map((node: ResonanceNodeCandidate) => (
                          <Tooltip key={node.id} title={node.reasoning}>
                            <button
                              onClick={() => handleTriggerTargetedSynthesis(node)}
                              className="bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-[11px] px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer text-left"
                            >
                              <span className="font-semibold">{node.title}</span>
                              <span className="bg-amber-500/20 px-1 rounded text-[9px] font-mono">
                                {node.resonanceScore}%
                              </span>
                            </button>
                          </Tooltip>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons Bar */}
                  {msg.sender !== 'user' && (
                    <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        <Button
                          type="text"
                          size="small"
                          onClick={() => handleOpenCardDrawer(msg)}
                          className="text-primary hover:text-primary/80 hover:bg-primary/10 text-[11px] h-6 px-2 flex items-center gap-1 font-semibold"
                        >
                          <span className="material-symbols-outlined text-[14px]">bookmark_add</span>
                          <span>В календарь заметок</span>
                        </Button>

                        <Button
                          type="text"
                          size="small"
                          onClick={() => handleCopyText(msg.text)}
                          className="text-gray-400 hover:text-white text-[11px] h-6 px-1.5"
                        >
                          Копировать
                        </Button>
                      </div>

                      <Button
                        type="text"
                        size="small"
                        onClick={() =>
                          handleTriggerTargetedSynthesis({
                            id: `synth-${Date.now()}`,
                            title: msg.text.substring(0, 40),
                            curatorIds: [],
                            curatorNames: [],
                            resonanceScore: 90,
                            topic: 'Арбитраж',
                            reasoning: 'Точечный синтез сообщения',
                            sharedKeywords: [],
                            suggestedPrompt: `/synthesis Проанализируй тезис: "${msg.text.substring(
                              0,
                              120,
                            )}..."`,
                          })
                        }
                        className="text-amber-400/90 hover:text-amber-300 text-[11px] h-6 px-1.5 flex items-center gap-1"
                      >
                        <span>⚖️ Синтез</span>
                      </Button>
                    </div>
                  )}
                </div>

                {/* User Avatar */}
                {msg.sender === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-base flex-shrink-0 mt-0.5">
                    👤
                  </div>
                )}
              </div>
            ))
          )}

          {sendThreadMessageMutation.isPending && (
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl max-w-sm border border-white/10 animate-pulse">
              <Spin size="small" />
              <div className="text-xs text-gray-300">
                Кураторы анализируют контекст и формируют ответ...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Input Area */}
        <footer className="p-3 border-t border-white/10 bg-[#161b22] relative z-10">
          {/* Quick Slash Snippets Suggestions Popover */}
          {showSlashMenu && (
            <div className="absolute bottom-full mb-2 left-3 right-3 max-h-56 overflow-y-auto bg-[#1c2128] border border-white/15 rounded-xl shadow-2xl p-1.5 space-y-1 z-30 custom-scrollbar">
              <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider px-2 py-1">
                Быстрые команды и пресеты агентов:
              </div>
              {filteredSnippets.map((snippet) => (
                <div
                  key={snippet.id}
                  onClick={() => handleSelectSnippet(snippet)}
                  className="p-2 rounded-lg hover:bg-white/10 cursor-pointer flex items-center justify-between text-xs transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-primary font-bold">{snippet.command}</span>
                    <span className="text-white font-medium">{snippet.label}</span>
                  </div>
                  <span className="text-[10px] text-gray-400 truncate max-w-xs">
                    {snippet.description}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Group Chat Agent Target Selector Pill Bar */}
          {activeThread?.type === 'GROUP' && (
            <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-1 text-xs">
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mr-1">
                Адресовать:
              </span>
              <button
                onClick={() => setSelectedTargetAgent('all')}
                className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-all ${
                  selectedTargetAgent === 'all'
                    ? 'bg-primary text-black font-bold'
                    : 'bg-white/5 hover:bg-white/10 text-gray-300'
                }`}
              >
                Все кураторы
              </button>
              {activeThread.participantAgents?.map((agentId: string) => {
                const persona = CURATOR_PERSONAS_LIST.find((p) => p.id === agentId);
                const isSelected = selectedTargetAgent === agentId;
                return (
                  <button
                    key={agentId}
                    onClick={() => setSelectedTargetAgent(agentId as any)}
                    className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-all flex items-center gap-1 ${
                      isSelected
                        ? 'bg-sky-500 text-white font-bold'
                        : 'bg-white/5 hover:bg-white/10 text-gray-300'
                    }`}
                  >
                    <span>{persona?.emoji || '👤'}</span>
                    <span>{persona?.shortName || agentId}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Textarea & Send Button */}
          <div className="flex items-end gap-2 bg-[#0d1117] border border-white/10 rounded-xl p-2 focus-within:border-primary/60 transition-colors">
            <TextArea
              ref={textareaRef}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={
                activeThread?.type === 'GROUP'
                  ? "Напишите вопрос совету или обратитесь через @куратора (например, '/politics' или '/it')..."
                  : `Задайте вопрос куратору ${activeThread?.title || ''}...`
              }
              autoSize={{ minRows: 1, maxRows: 5 }}
              className="bg-transparent border-0 text-white resize-none shadow-none text-xs focus:shadow-none p-1 placeholder-gray-500"
            />

            <Button
              type="primary"
              onClick={handleSendMessage}
              loading={sendThreadMessageMutation.isPending}
              disabled={!inputText.trim() || !selectedThreadId}
              className="bg-primary hover:bg-primary/90 text-on-primary font-bold h-8 px-3 rounded-lg flex items-center justify-center flex-shrink-0"
            >
              <SendIcon className="w-4 h-4" />
            </Button>
          </div>
        </footer>
      </section>

      {/* 3. Modal: Create New Thread */}
      <Modal
        title="Создать новый аналитический диалог"
        open={isNewThreadModalOpen}
        onCancel={() => setIsNewThreadModalOpen(false)}
        onOk={handleCreateThreadSubmit}
        confirmLoading={createThreadMutation.isPending}
        okText="Создать чат"
        cancelText="Отмена"
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
              Формат диалога
            </label>
            <Radio.Group
              value={newThreadType}
              onChange={(e) => {
                const val = e.target.value;
                setNewThreadType(val);
                if (val === 'DIRECT') {
                  const p = CURATOR_PERSONAS_LIST.find((x) => x.id === newThreadCurator);
                  setNewThreadTitle(`${p?.emoji || '👤'} ${p?.name || 'Куратор'} (Личный)`);
                } else {
                  setNewThreadTitle('🏛️ Политическая коллегия');
                }
              }}
              className="w-full grid grid-cols-2 gap-2"
            >
              <Radio.Button value="GROUP" className="text-center">
                👥 Групповая коллегия
              </Radio.Button>
              <Radio.Button value="DIRECT" className="text-center">
                👤 Одиночный (1-на-1)
              </Radio.Button>
            </Radio.Group>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
              Название чата
            </label>
            <Input
              value={newThreadTitle}
              onChange={(e) => setNewThreadTitle(e.target.value)}
              placeholder="например: IT & AI Совет или Иван Белый (Налоги)"
            />
          </div>

          {newThreadType === 'DIRECT' ? (
            <div>
              <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
                Выберите персонального куратора
              </label>
              <Select
                value={newThreadCurator}
                onChange={(val) => {
                  setNewThreadCurator(val);
                  const p = CURATOR_PERSONAS_LIST.find((x) => x.id === val);
                  setNewThreadTitle(`${p?.emoji || '👤'} ${p?.name} (Личный)`);
                }}
                className="w-full"
                options={CURATOR_PERSONAS_LIST.map((p) => ({
                  value: p.id,
                  label: `${p.emoji} ${p.name} — ${p.role}`,
                }))}
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
                Участники коллегии (Агенты)
              </label>
              <Checkbox.Group
                value={newThreadParticipants}
                onChange={(vals: any) => setNewThreadParticipants(vals)}
                className="grid grid-cols-2 gap-2 pt-1"
              >
                {CURATOR_PERSONAS_LIST.map((p) => (
                  <Checkbox key={p.id} value={p.id}>
                    {p.emoji} {p.name}
                  </Checkbox>
                ))}
                <Checkbox value="independent-analyst">⚖️ Арбитр (Синтез)</Checkbox>
              </Checkbox.Group>
            </div>
          )}

          <div>
            <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
              Тематическая папка
            </label>
            <Select
              value={newThreadFolderId}
              onChange={setNewThreadFolderId}
              className="w-full"
              placeholder="Выберите папку (необязательно)..."
              allowClear
              options={[
                { value: undefined, label: '📁 Без папки (Общий список)' },
                ...folders.map((f: any) => ({
                  value: f.id,
                  label: `📁 ${f.name}`,
                })),
              ]}
            />
          </div>
        </div>
      </Modal>

      {/* 4. Modal: Create New Folder */}
      <Modal
        title="Создать тематическую папку чатов"
        open={isNewFolderModalOpen}
        onCancel={() => setIsNewFolderModalOpen(false)}
        onOk={handleCreateFolderSubmit}
        confirmLoading={createFolderMutation.isPending}
        okText="Создать папку"
        cancelText="Отмена"
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
              Название папки
            </label>
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="например: Технологии & IT или Политика & РФ"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
              Цветовой акцент
            </label>
            <div className="flex items-center gap-2">
              {['#38bdf8', '#a855f7', '#10b981', '#fbbf24', '#ef4444', '#64748b'].map((col) => (
                <button
                  key={col}
                  onClick={() => setNewFolderColor(col)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    newFolderColor === col ? 'scale-110 ring-2 ring-white' : 'opacity-80'
                  }`}
                  style={{ backgroundColor: col }}
                />
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* 5. Card Creator Drawer: Turn Message to Calendar Note */}
      <Drawer
        title="Преобразование вывода агента в карточку календаря"
        open={cardDrawerOpen}
        onClose={() => setCardDrawerOpen(false)}
        width={640}
        extra={
          <Button
            type="primary"
            onClick={handleSaveCardToCalendar}
            loading={createNoteMutation.isPending}
            className="bg-primary text-on-primary font-bold"
          >
            Опубликовать в календарь
          </Button>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
              Заголовок карточки
            </label>
            <Input
              value={cardTitle}
              onChange={(e) => setCardTitle(e.target.value)}
              placeholder="Название события или синтеза..."
              className="font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
                Тип заметки
              </label>
              <NoteTypeSelect value={cardType} onChange={setCardType} />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
                Куратор карточки
              </label>
              <Select
                value={cardCurator}
                onChange={setCardCurator}
                className="w-full"
                options={[
                  ...CURATOR_PERSONAS_LIST.map((p) => ({
                    value: p.id,
                    label: `${p.emoji} ${p.name} (${p.shortName})`,
                  })),
                  { value: 'Независимый аналитик', label: '⚖️ Независимый аналитик (Арбитр)' },
                  { value: 'usr-admin-999', label: '👤 Администратор редакции' },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
                Целевая лента
              </label>
              <Select
                value={cardFeedId}
                onChange={setCardFeedId}
                className="w-full"
                placeholder="Выберите ленту..."
                options={feeds.map((f) => ({
                  value: f.id,
                  label: f.title,
                }))}
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
                Индекс резонанса (%)
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                value={cardResonance}
                onChange={(e) => setCardResonance(Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
              Папка в хранилище (Folder)
            </label>
            <FolderSelect
              value={cardFolders}
              onChange={(updated) => setCardFolders(updated)}
              placeholder="Укажите папку (например, Politics/Russia)..."
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
              Иерархическая таксономия (Taxonomy Path)
            </label>
            <Input
              value={cardTaxonomyPath}
              onChange={(e) => setCardTaxonomyPath(e.target.value)}
              placeholder="например: politics.russia или tech.ai"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
              Хэштеги (Tags)
            </label>
            <HashtagInput
              value={cardHashtags}
              onChange={setCardHashtags}
              placeholder="Добавьте теги..."
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
              Markdown содержание карточки
            </label>
            <TextArea
              value={cardDescription}
              onChange={(e) => setCardDescription(e.target.value)}
              rows={8}
              className="font-mono text-xs"
            />
          </div>
        </div>
      </Drawer>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Helper Subcomponents
// ---------------------------------------------------------------------------

function ThreadListItem({
  thread,
  isActive,
  onSelect,
  onPin,
  onDelete,
}: {
  thread: any;
  isActive: boolean;
  onSelect: () => void;
  onPin: (pinned: boolean) => void;
  onDelete: () => void;
}) {
  const lastMsg = thread.messages && thread.messages[0];

  return (
    <div
      onClick={onSelect}
      className={`group relative p-2 rounded-xl transition-all cursor-pointer border flex items-start gap-2.5 ${
        isActive
          ? 'bg-primary/15 border-primary/50 text-white shadow-sm'
          : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/5 text-gray-300'
      }`}
    >
      <div className="w-8 h-8 rounded-lg bg-black/30 border border-white/10 flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
        {thread.type === 'GROUP' ? '👥' : getCuratorEmoji(thread.targetAgent)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="font-semibold text-xs truncate text-white">{thread.title}</span>
          {thread.isPinned && <Pin className="w-3 h-3 text-amber-400 flex-shrink-0" />}
        </div>

        <div className="text-[11px] text-gray-400 truncate mt-0.5 font-normal">
          {lastMsg ? `${lastMsg.senderName}: ${lastMsg.text}` : 'Диалог ожидает вопроса...'}
        </div>
      </div>

      {/* Hover Actions */}
      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPin(!thread.isPinned);
          }}
          className="hover:text-amber-400 text-gray-400 p-0.5"
          title={thread.isPinned ? 'Открепить' : 'Закрепить'}
        >
          <Pin className="w-3 h-3" />
        </button>

        <Popconfirm
          title="Удалить диалог?"
          description="Все сообщения треда будут удалены."
          onConfirm={(e) => {
            e?.stopPropagation();
            onDelete();
          }}
          okText="Удалить"
          cancelText="Отмена"
        >
          <button
            onClick={(e) => e.stopPropagation()}
            className="hover:text-red-400 text-gray-400 p-0.5"
            title="Удалить тред"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </Popconfirm>
      </div>
    </div>
  );
}

function getCuratorEmoji(agentId?: string | null): string {
  if (!agentId) return '💬';
  const found = CURATOR_PERSONAS_LIST.find((p) => p.id === agentId);
  return found?.emoji || '👤';
}

export default AgentChatPage;
