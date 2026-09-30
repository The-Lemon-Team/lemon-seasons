import React, { useState, useRef, useEffect } from 'react';
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
import { useAgentChat, useFeeds, useCreateNote } from '../../api/queries';
import { FolderSelect } from '../../components/FolderSelect';
import { HashtagInput } from '../../components/HashtagInput';
import { NoteTypeSelect } from '../../components/NoteTypeSelect';
import { FolderInputItem } from '../../types';

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

  const [selectedDate, setSelectedDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [targetAgent, setTargetAgent] = useState<AgentId | 'all'>('all');
  const [inputText, setInputText] = useState('');
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Chat message history
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: 'msg-welcome-0',
        sender: 'dispatcher',
        senderName: 'Информационный Диспетчер',
        senderRole: 'Координатор аналитического деска',
        avatar: '🤖',
        text: `Добро пожаловать в **Аналитический Чат-Деск** Project Lenta!

Здесь вы можете опрашивать профильных агентов и группы кураторов в реальном времени:

- **🏛️ Политическая коллегия** (\`/politics\`) — объединенное модульное резюме по всем контурам с алгоритмическим выявлением узлов пересечения.
- **🇷🇺 Иван Белый** (\`/ivan\`) — внутренний контур: законы, Госдума, бюджет 2027–2029, ФАС, ЦБ РФ, топливный демпфер.
- **🌐 Kirk Kitten** (\`/kirk\`) — международный контур: санкции OFAC, директивы ЕС, морская логистика, фрахт, сырьевые рынки.
- **🇨🇳 Чэнь Вэй** (\`/chen\`) — восточный контур: Китай, АТР, БРИКС, валютный клиринг, логистические коридоры.
- **⚡ Окация** (\`/it\`, \`/ai\`, \`/devops\`) — архитектура IT и искусственный интеллект.
- **⚖️ Независимый аналитик** (\`/synthesis\`) — точечный кросс-контурный синтез по выявленным узлам.

Любую сводку или точечный синтез можно в один клик зафиксировать в календаре хроники!`,
        timestamp: new Date().toISOString(),
      },
    ];
  });

  // Queries & Mutations
  const agentChatMutation = useAgentChat();
  const createNoteMutation = useCreateNote();
  const { data: feeds = [] } = useFeeds();

  // Scroll anchors
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<any>(null);

  // Card Drawer State
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

  // Smooth scroll to bottom strictly inside the message container
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
  }, [messages, agentChatMutation.isPending]);

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
    setTargetAgent(snippet.targetAgent);
    setShowSlashMenu(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleSendSnippetDirectly = async (snippet: ChatSnippet) => {
    await executeSendMessage(snippet.prompt, snippet.targetAgent);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || agentChatMutation.isPending) return;
    const msgToSend = inputText.trim();
    setInputText('');
    setShowSlashMenu(false);
    await executeSendMessage(msgToSend, targetAgent);
  };

  const executeSendMessage = async (msgText: string, forcedTarget?: AgentId | 'all') => {
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      senderName: 'Куратор редакции',
      senderRole: 'Редактор / Пользователь',
      avatar: '👤',
      text: msgText,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);

    try {
      const response = await agentChatMutation.mutateAsync({
        message: msgText,
        date: selectedDate,
        targetAgent: forcedTarget || targetAgent,
        history: messages,
      });

      if (response && response.replies && response.replies.length > 0) {
        setMessages((prev) => [...prev, ...response.replies]);
      } else {
        message.info('Агенты обработали запрос без дополнительных сообщений.');
      }
    } catch (err: any) {
      message.error(err?.message || 'Ошибка соединения с агентным деском');
    }
  };

  const handleTriggerTargetedSynthesis = async (node: ResonanceNodeCandidate) => {
    const prompt = node.suggestedPrompt || `/synthesis ${node.title}`;
    setTargetAgent('independent-analyst');
    await executeSendMessage(prompt, 'independent-analyst');
  };

  // Convert Message or Suggested Card to Note
  const handleOpenCardDrawer = (msg: ChatMessage) => {
    const card = msg.suggestedCard;
    const title = card?.title || msg.senderRole + ': ' + msg.text.substring(0, 60).replace(/[#*`]/g, '') + '...';
    const type = card?.type || NoteType.SINGLE;
    const curator = card?.curator || (msg.sender === 'political-group' ? 'Политическая коллегия' : msg.sender === 'okatsiya' ? 'Окация' : msg.sender);
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
    const hashtags = card?.hashtags || (msg.sender === 'okatsiya' ? ['IT', 'AI', 'Технологии'] : ['новости', 'повестка']);
    const desc = card?.description || `## ${title}\n\n> **Куратор:** ${msg.senderName} (${msg.senderRole})  \n> **Дата:** ${selectedDate}  \n> **Индекс резонанса:** \`${msg.resonanceScore || 75}%\`\n\n${msg.text}\n\n---\n*Материал верифицирован в Lemon Agent Chat.*`;

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
      const primaryFolder = cardFolders.find((f) => f.isPrimary)?.path || cardFolders[0]?.path || 'News/Daily';
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

      message.success('Карточка успешно создана и добавлена в календарь хроники!');
      setCardDrawerOpen(false);
    } catch (err: any) {
      message.error(err?.message || 'Ошибка сохранения карточки в календарь');
    }
  };

  // Run Independent Synthesis on a specific message
  const handleRequestSynthesisOnTopic = (msg: ChatMessage) => {
    executeSendMessage(
      `/synthesis Проведи независимый кросс-контурный анализ следующего тезиса: "${msg.text.substring(0, 150)}..."`,
      'independent-analyst',
    );
  };

  const handleCopyText = (txt: string) => {
    navigator.clipboard.writeText(txt);
    message.success('Текст скопирован в буфер обмена');
  };

  const filteredSnippets = DEFAULT_CHAT_SNIPPETS.filter(
    (s) => s.command.includes(slashFilter) || s.label.toLowerCase().includes(slashFilter),
  );

  const avgSessionResonance =
    messages.filter((m) => m.resonanceScore).length > 0
      ? Math.round(
          messages
            .filter((m) => m.resonanceScore)
            .reduce((acc, m) => acc + (m.resonanceScore || 0), 0) /
            messages.filter((m) => m.resonanceScore).length,
        )
      : 80;

  return (
    <div className="flex h-full w-full max-h-full min-h-0 bg-[#0d1117] text-[#e6edf3] font-sans overflow-hidden rounded-2xl border border-white/10 shadow-2xl relative">
      {/* 1. Left Sidebar: Contours & Quick Presets (Fixed 280px or collapsible) */}
      <aside
        className={`${
          sidebarCollapsed ? 'w-14' : 'w-72'
        } bg-[#161b22] border-r border-white/10 flex flex-col flex-shrink-0 transition-all duration-200 select-none z-20`}
      >
        {/* Sidebar Header */}
        <div className="p-3.5 border-b border-white/5 flex items-center justify-between">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">tune</span>
              <span className="font-bold text-xs uppercase tracking-wider text-white">
                Контуры & Пресеты
              </span>
            </div>
          )}
          <Button
            type="text"
            size="small"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="text-gray-400 hover:text-white p-1 h-7 w-7 flex items-center justify-center mx-auto"
            title={sidebarCollapsed ? 'Развернуть панель' : 'Свернуть панель'}
          >
            <span className="material-symbols-outlined text-base">
              {sidebarCollapsed ? 'chevron_right' : 'chevron_left'}
            </span>
          </Button>
        </div>

        {/* Sidebar Body */}
        {!sidebarCollapsed ? (
          <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
            {/* Target Agent Selector Cards */}
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-2 px-1">
                Фокусный контур
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => setTargetAgent('all')}
                  className={`w-full text-left p-2 rounded-xl border transition-all flex items-center gap-2.5 cursor-pointer ${
                    targetAgent === 'all'
                      ? 'bg-primary/20 border-primary text-primary font-bold shadow-sm'
                      : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <span className="material-symbols-outlined text-primary text-lg">auto_awesome</span>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-xs font-semibold">Все агенты</div>
                    <div className="text-[10px] opacity-70 font-normal truncate">
                      Круглый стол контуров
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setTargetAgent('political-group')}
                  className={`w-full text-left p-2 rounded-xl border transition-all flex items-center gap-2.5 cursor-pointer ${
                    targetAgent === 'political-group'
                      ? 'bg-sky-500/20 border-sky-400 text-sky-200 font-bold shadow-sm'
                      : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <span className="material-symbols-outlined text-sky-400 text-lg">account_balance</span>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-xs font-semibold">🏛️ Политическая коллегия</div>
                    <div className="text-[10px] text-sky-400/80 font-normal truncate">
                      Сводное резюме дня (РФ + Мир + АТР)
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setTargetAgent('ivan-bely')}
                  className={`w-full text-left p-2 rounded-xl border transition-all flex items-center gap-2.5 cursor-pointer ${
                    targetAgent === 'ivan-bely'
                      ? 'bg-sky-500/20 border-sky-400 text-sky-200 font-bold shadow-sm'
                      : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <span className="material-symbols-outlined text-sky-400 text-lg">shield</span>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-xs font-semibold">Иван Белый</div>
                    <div className="text-[10px] text-sky-400/80 font-normal truncate">
                      Внутренний контур РФ
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setTargetAgent('kirk-kitten')}
                  className={`w-full text-left p-2 rounded-xl border transition-all flex items-center gap-2.5 cursor-pointer ${
                    targetAgent === 'kirk-kitten'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold shadow-sm'
                      : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <span className="material-symbols-outlined text-amber-400 text-lg">public</span>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-xs font-semibold">Kirk Kitten</div>
                    <div className="text-[10px] text-amber-400/80 font-normal truncate">
                      Международные рынки & OFAC
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setTargetAgent('chen-wei')}
                  className={`w-full text-left p-2 rounded-xl border transition-all flex items-center gap-2.5 cursor-pointer ${
                    targetAgent === 'chen-wei'
                      ? 'bg-red-500/20 border-red-400 text-red-200 font-bold shadow-sm'
                      : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <span className="material-symbols-outlined text-red-400 text-lg">public</span>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-xs font-semibold">Чэнь Вэй</div>
                    <div className="text-[10px] text-red-400/80 font-normal truncate">
                      АТР, Китай & БРИКС
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setTargetAgent('okatsiya')}
                  className={`w-full text-left p-2 rounded-xl border transition-all flex items-center gap-2.5 cursor-pointer ${
                    targetAgent === 'okatsiya'
                      ? 'bg-purple-500/20 border-purple-400 text-purple-200 font-bold shadow-sm'
                      : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <span className="material-symbols-outlined text-purple-400 text-lg">memory</span>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-xs font-semibold">⚡ Окация</div>
                    <div className="text-[10px] text-purple-400/80 font-normal truncate">
                      IT & AI, DevOps, BigTech, Backend
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setTargetAgent('independent-analyst')}
                  className={`w-full text-left p-2 rounded-xl border transition-all flex items-center gap-2.5 cursor-pointer ${
                    targetAgent === 'independent-analyst'
                      ? 'bg-purple-500/20 border-purple-400 text-purple-200 font-bold shadow-sm'
                      : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <span className="material-symbols-outlined text-purple-400 text-lg">balance</span>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-xs font-semibold">Независимый аналитик</div>
                    <div className="text-[10px] text-purple-400/80 font-normal truncate">
                      Арбитраж и точечный синтез
                    </div>
                  </div>
                </button>
              </div>

            </div>

            {/* Quick Presets / Snippets list */}
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-2 px-1">
                Быстрые сниппеты
              </div>
              <div className="space-y-1.5">
                {DEFAULT_CHAT_SNIPPETS.map((snippet) => (
                  <button
                    key={snippet.id}
                    onClick={() => handleSendSnippetDirectly(snippet)}
                    disabled={agentChatMutation.isPending}
                    className="w-full text-left p-2 rounded-lg bg-[#0d1117] hover:bg-primary/10 border border-white/5 hover:border-primary/30 transition-all text-xs text-gray-300 hover:text-white cursor-pointer group disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-semibold text-gray-200 group-hover:text-primary">
                        {snippet.label}
                      </span>
                      <span className="font-mono text-[10px] text-gray-400">{snippet.command}</span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-tight mb-0 line-clamp-2">
                      {snippet.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Session Stats */}
            <div className="p-2.5 rounded-xl bg-[#0d1117] border border-white/5 text-[11px] space-y-1 font-mono">
              <div className="flex justify-between text-gray-400">
                <span>Сообщений:</span>
                <span className="text-white font-bold">{messages.length}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Ср. резонанс:</span>
                <span className="text-emerald-400 font-bold">{avgSessionResonance}%</span>
              </div>
            </div>

            <Button
              size="small"
              onClick={() => setMessages([messages[0]])}
              className="w-full border-white/10 bg-white/5 text-gray-400 hover:text-white text-xs h-8"
            >
              Сбросить диалог
            </Button>
          </div>
        ) : (
          /* Collapsed Icons Only */
          <div className="flex-1 flex flex-col items-center py-4 space-y-3">
            <button
              onClick={() => setTargetAgent('all')}
              className={`w-9 h-9 rounded-xl flex items-center justify-center border cursor-pointer transition-colors ${
                targetAgent === 'all' ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-white/10 text-gray-400'
              }`}
              title="Все агенты"
            >
              <span className="material-symbols-outlined text-base">auto_awesome</span>
            </button>
            <button
              onClick={() => setTargetAgent('political-group')}
              className={`w-9 h-9 rounded-xl flex items-center justify-center border cursor-pointer transition-colors ${
                targetAgent === 'political-group' ? 'bg-sky-500/20 border-sky-400 text-sky-300' : 'bg-white/5 border-white/10 text-gray-400'
              }`}
              title="🏛️ Политическая коллегия (Сводное резюме)"
            >
              <span className="material-symbols-outlined text-base">account_balance</span>
            </button>
            <button
              onClick={() => setTargetAgent('ivan-bely')}
              className={`w-9 h-9 rounded-xl flex items-center justify-center border cursor-pointer transition-colors ${
                targetAgent === 'ivan-bely' ? 'bg-sky-500/20 border-sky-400 text-sky-300' : 'bg-white/5 border-white/10 text-gray-400'
              }`}
              title="Иван Белый"
            >
              <span className="material-symbols-outlined text-base">shield</span>
            </button>
            <button
              onClick={() => setTargetAgent('kirk-kitten')}
              className={`w-9 h-9 rounded-xl flex items-center justify-center border cursor-pointer transition-colors ${
                targetAgent === 'kirk-kitten' ? 'bg-amber-500/20 border-amber-400 text-amber-300' : 'bg-white/5 border-white/10 text-gray-400'
              }`}
              title="Kirk Kitten"
            >
              <span className="material-symbols-outlined text-base">public</span>
            </button>
            <button
              onClick={() => setTargetAgent('chen-wei')}
              className={`w-9 h-9 rounded-xl flex items-center justify-center border cursor-pointer transition-colors ${
                targetAgent === 'chen-wei' ? 'bg-red-500/20 border-red-400 text-red-300' : 'bg-white/5 border-white/10 text-gray-400'
              }`}
              title="Чэнь Вэй (АТР & БРИКС)"
            >
              <span className="material-symbols-outlined text-base">globe_asia</span>
            </button>
            <button
              onClick={() => setTargetAgent('okatsiya')}
              className={`w-9 h-9 rounded-xl flex items-center justify-center border cursor-pointer transition-colors ${
                targetAgent === 'okatsiya' ? 'bg-purple-500/20 border-purple-400 text-purple-300' : 'bg-white/5 border-white/10 text-gray-400'
              }`}
              title="⚡ Окация (IT & AI)"
            >
              <span className="material-symbols-outlined text-base">memory</span>
            </button>
            <button
              onClick={() => setTargetAgent('independent-analyst')}
              className={`w-9 h-9 rounded-xl flex items-center justify-center border cursor-pointer transition-colors ${
                targetAgent === 'independent-analyst' ? 'bg-purple-500/20 border-purple-400 text-purple-300' : 'bg-white/5 border-white/10 text-gray-400'
              }`}
              title="Независимый аналитик"
            >
              <span className="material-symbols-outlined text-base">balance</span>
            </button>
          </div>

        )}
      </aside>

      {/* 2. Main Chat Workspace (Fixed layout: Header + Scrollable Messages + Fixed Footer) */}
      <section className="flex-1 flex flex-col min-h-0 h-full overflow-hidden bg-[#0d1117] relative">
        {/* Top Control Bar (Fixed height) */}
        <header className="px-5 py-3 border-b border-white/10 bg-[#161b22] flex items-center justify-between gap-4 flex-shrink-0 z-10">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <h2 className="text-sm font-bold text-white tracking-tight m-0">
                {targetAgent === 'all'
                  ? '⚡ Круглый стол контуров и фактологический синтез'
                  : targetAgent === 'political-group'
                  ? '🏛️ Политическая коллегия (Сводное резюме дня)'
                  : targetAgent === 'ivan-bely'
                  ? '🇷🇺 Диалог с Иваном Белым (Внутренний контур РФ)'
                  : targetAgent === 'kirk-kitten'
                  ? '🌐 Диалог с Kirk Kitten (Международный контур & рынки)'
                  : targetAgent === 'chen-wei'
                  ? '🇨🇳 Диалог с Чэнь Вэем (АТР, Китай & БРИКС)'
                  : targetAgent === 'okatsiya'
                  ? '⚡ Диалог с Окацией (Архитектура IT & AI)'
                  : '⚖️ Диалог с Независимым аналитиком (Точечный арбитраж)'}
              </h2>
            </div>
          </div>

          {/* Right Tools: Date Picker and One-click Digest */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-[#0d1117] px-2.5 py-1 rounded-lg border border-white/10 text-xs">
              <span className="text-gray-400 font-mono text-[11px]">Дата:</span>
              <DatePicker
                value={dayjs(selectedDate)}
                onChange={(d) => setSelectedDate(d ? d.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'))}
                allowClear={false}
                size="small"
                className="bg-transparent border-0 text-white"
              />
            </div>

            <Button
              size="small"
              onClick={() => executeSendMessage('/today', 'all')}
              disabled={agentChatMutation.isPending}
              className="bg-primary/10 hover:bg-primary/20 text-primary border-primary/30 font-semibold text-xs flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[15px]">event_note</span>
              Сводка дня (/today)
            </Button>
          </div>
        </header>

        {/* 3. Messages Stream (The ONLY scrollable element in the chat!) */}
        <div
          ref={messagesContainerRef}
          className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-4 select-text"
        >
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            const isGroup = msg.sender === 'political-group';
            const isIvan = msg.sender === 'ivan-bely';
            const isKirk = msg.sender === 'kirk-kitten';
            const isChen = msg.sender === 'chen-wei';
            const isOkatsiya = msg.sender === 'okatsiya';
            const isIndep = msg.sender === 'independent-analyst';
            const isDisp = msg.sender === 'dispatcher';

            const cardBorderColor = isGroup
              ? 'border-sky-500/40 bg-gradient-to-br from-sky-950/30 via-[#161b22] to-amber-950/20'
              : isIvan
              ? 'border-sky-500/30 bg-sky-950/25'
              : isKirk
              ? 'border-amber-500/30 bg-amber-950/25'
              : isChen
              ? 'border-red-500/30 bg-red-950/25'
              : isOkatsiya
              ? 'border-purple-500/40 bg-purple-950/25'
              : isIndep
              ? 'border-purple-500/30 bg-purple-950/25'
              : isUser
              ? 'border-primary/40 bg-primary/10 ml-auto max-w-2xl'
              : 'border-white/10 bg-[#161b22]';

            return (
              <div
                key={msg.id}
                className={`flex gap-3 transition-all ${isUser ? 'justify-end' : 'justify-start max-w-4xl'}`}
              >
                {!isUser && (
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 border shadow-sm ${
                      isGroup
                        ? 'bg-sky-900/60 border-sky-400/50 text-sky-200'
                        : isIvan
                        ? 'bg-sky-900/60 border-sky-400/40 text-sky-200'
                        : isKirk
                        ? 'bg-amber-900/60 border-amber-400/40 text-amber-200'
                        : isChen
                        ? 'bg-red-900/60 border-red-400/40 text-red-200'
                        : isOkatsiya
                        ? 'bg-purple-900/60 border-purple-400/40 text-purple-200'
                        : isIndep
                        ? 'bg-purple-900/60 border-purple-400/40 text-purple-200'
                        : 'bg-gray-800 border-gray-600 text-gray-200'
                    }`}
                  >
                    {isGroup ? (
                      <span className="material-symbols-outlined text-sky-400 text-lg">account_balance</span>
                    ) : isIvan ? (
                      <span className="material-symbols-outlined text-sky-400 text-lg">shield</span>
                    ) : isKirk ? (
                      <span className="material-symbols-outlined text-amber-400 text-lg">public</span>
                    ) : isChen ? (
                      <span className="material-symbols-outlined text-red-400 text-lg">public</span>
                    ) : isOkatsiya ? (
                      <span className="material-symbols-outlined text-purple-400 text-lg">memory</span>
                    ) : isIndep ? (
                      <span className="material-symbols-outlined text-purple-400 text-lg">balance</span>
                    ) : (
                      <span className="material-symbols-outlined text-primary text-lg">smart_toy</span>
                    )}
                  </div>
                )}

                <div className={`p-4 rounded-2xl border shadow-md flex-1 ${cardBorderColor}`}>
                  {/* Message Header */}
                  <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{msg.senderName}</span>
                      <span className="text-[11px] text-gray-400 font-mono">({msg.senderRole})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {msg.resonanceScore !== undefined && (
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                            msg.resonanceScore >= 80
                              ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          }`}
                        >
                          Резонанс {msg.resonanceScore}%
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400 font-mono">
                        {dayjs(msg.timestamp).format('HH:mm:ss')}
                      </span>
                    </div>
                  </div>

                  {/* Markdown Body */}
                  <div className="text-sm leading-relaxed text-gray-200">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                      {msg.text}
                    </ReactMarkdown>
                  </div>


                  {/* Sources tag list */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-white/5 flex flex-wrap items-center gap-1.5 text-xs text-gray-400">
                      <span className="font-mono text-[10px] uppercase">Источники:</span>
                      {msg.sources.map((s, idx) => (
                        <Tag key={idx} color="default" className="text-[11px] bg-white/5 border-white/10 text-gray-300">
                          {s}
                        </Tag>
                      ))}
                    </div>
                  )}

                  {/* Candidate Resonance Nodes for Targeted Synthesis */}
                  {msg.resonanceNodes && msg.resonanceNodes.length > 0 && (
                    <div className="my-3 p-3 rounded-xl bg-purple-950/25 border border-purple-500/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5 font-mono">
                          <span className="material-symbols-outlined text-[16px] text-amber-400">offline_bolt</span>
                          Кандидаты на точечный синтез (Обнаруженные узлы):
                        </span>
                        <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                          {msg.resonanceNodes.length} узла
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                        {msg.resonanceNodes.map((node) => (
                          <div
                            key={node.id}
                            className="p-2.5 rounded-lg bg-[#0d1117]/85 border border-purple-500/20 hover:border-purple-400/50 transition-all flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="text-xs font-bold text-white truncate" title={node.title}>
                                  {node.title}
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  {node.resonanceScore}%
                                </span>
                              </div>
                              <div className="text-[11px] text-gray-300 leading-relaxed mb-2 line-clamp-3">
                                {node.reasoning}
                              </div>
                              <div className="text-[10px] text-purple-300/80 font-mono mb-2.5 flex items-center gap-1">
                                <span>Контуры:</span>
                                <span className="font-semibold text-purple-200">{node.curatorNames.join(' ⟷ ')}</span>
                              </div>
                            </div>
                            <Button
                              type="primary"
                              size="small"
                              onClick={() => handleTriggerTargetedSynthesis(node)}
                              loading={agentChatMutation.isPending}
                              className="bg-purple-600 hover:bg-purple-500 text-white font-medium text-[11px] h-7 flex items-center justify-center gap-1.5 w-full shadow-sm"
                            >
                              <span className="material-symbols-outlined text-[13px]">balance</span>
                              Точечный синтез узла
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action buttons inside message */}
                  {!isUser && !isDisp && (
                    <div className="mt-3.5 pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Button
                          type="primary"
                          size="small"
                          onClick={() => handleOpenCardDrawer(msg)}
                          className="bg-primary hover:bg-primary/90 text-on-primary font-medium flex items-center gap-1.5 shadow-sm text-xs h-7"
                        >
                          <span className="material-symbols-outlined text-[14px]">post_add</span>
                          Превратить в карточку
                        </Button>

                        {!isIndep && (
                          <Button
                            size="small"
                            onClick={() => handleRequestSynthesisOnTopic(msg)}
                            className="border-purple-500/40 text-purple-300 bg-purple-950/30 hover:bg-purple-900/40 hover:text-purple-200 flex items-center gap-1 text-xs h-7"
                          >
                            <span className="material-symbols-outlined text-[14px]">balance</span>
                            Независимый арбитраж
                          </Button>
                        )}
                      </div>

                      <Button
                        size="small"
                        type="text"
                        onClick={() => handleCopyText(msg.text)}
                        className="text-gray-400 hover:text-white flex items-center gap-1 text-xs h-7"
                      >
                        <span className="material-symbols-outlined text-[14px]">content_copy</span>
                        Копировать
                      </Button>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/40 text-primary flex items-center justify-center text-base flex-shrink-0">
                    👤
                  </div>
                )}
              </div>
            );
          })}

          {agentChatMutation.isPending && (
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#161b22] border border-white/10 max-w-md animate-pulse">
              <Spin size="small" />
              <span className="text-xs text-gray-300 font-mono">
                Агенты верифицируют контур и рассчитывают резонанс...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 4. Fixed Input Footer (Strictly anchored at the bottom, never pushed down) */}
        <footer className="p-3.5 bg-[#161b22] border-t border-white/10 flex-shrink-0 relative z-20">
          {/* Floating Slash Autocomplete Popup */}
          {showSlashMenu && (
            <div className="absolute bottom-full left-4 right-4 mb-2 p-2 bg-[#161b22] border border-primary/40 rounded-xl shadow-2xl max-w-xl z-50">
              <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider px-2 py-1 mb-1 border-b border-white/5">
                Быстрые команды & алиасы:
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {filteredSnippets.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => handleSelectSnippet(s)}
                    className="flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-white/10 cursor-pointer text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-primary">{s.command}</span>
                      <span className="text-white font-medium">{s.label}</span>
                    </div>
                    <span className="text-[11px] text-gray-400 truncate max-w-xs">{s.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="max-w-4xl mx-auto space-y-2">
            {/* Quick Agent Pills Selector Bar */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <span className="text-[11px] font-mono text-gray-400 mr-1 hidden sm:inline">
                  Адресат:
                </span>
                <button
                  type="button"
                  onClick={() => setTargetAgent('all')}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                    targetAgent === 'all'
                      ? 'bg-primary/20 border-primary text-primary font-bold'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  ⚡ Все
                </button>
                <button
                  type="button"
                  onClick={() => setTargetAgent('political-group')}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                    targetAgent === 'political-group'
                      ? 'bg-sky-500/20 border-sky-400 text-sky-300 font-bold'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  🏛️ Коллегия
                </button>
                <button
                  type="button"
                  onClick={() => setTargetAgent('ivan-bely')}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                    targetAgent === 'ivan-bely'
                      ? 'bg-sky-500/20 border-sky-400 text-sky-300 font-bold'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  🇷🇺 Иван (РФ)
                </button>
                <button
                  type="button"
                  onClick={() => setTargetAgent('kirk-kitten')}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                    targetAgent === 'kirk-kitten'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  🌐 Kirk (Мир)
                </button>
                <button
                  type="button"
                  onClick={() => setTargetAgent('chen-wei')}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                    targetAgent === 'chen-wei'
                      ? 'bg-red-500/20 border-red-400 text-red-300 font-bold'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  🇨🇳 Чэнь (АТР)
                </button>
                <button
                  type="button"
                  onClick={() => setTargetAgent('okatsiya')}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                    targetAgent === 'okatsiya'
                      ? 'bg-purple-500/20 border-purple-400 text-purple-300 font-bold'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  ⚡ Окация (IT & AI)
                </button>
                <button
                  type="button"
                  onClick={() => setTargetAgent('independent-analyst')}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                    targetAgent === 'independent-analyst'
                      ? 'bg-purple-500/20 border-purple-400 text-purple-300 font-bold'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  ⚖️ Арбитраж
                </button>
              </div>

              <span className="text-[10px] text-gray-400 font-mono hidden md:inline">
                Enter ↵ для отправки
              </span>
            </div>

            {/* Input Box with Send Button */}
            <div className="flex items-end gap-2 bg-[#0d1117] p-2 rounded-xl border border-white/10 focus-within:border-primary/50 transition-colors">
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
                placeholder="Задайте вопрос агентам (например, '/ivan что с ценами на бензин?' или '/synthesis')..."
                autoSize={{ minRows: 1, maxRows: 5 }}
                className="bg-transparent border-0 text-white resize-none shadow-none text-sm focus:shadow-none p-1"
              />

              <Button
                type="primary"
                onClick={handleSendMessage}
                loading={agentChatMutation.isPending}
                disabled={!inputText.trim()}
                className="bg-primary hover:bg-primary/90 text-on-primary font-bold h-9 px-4 rounded-lg flex items-center justify-center flex-shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
              </Button>
            </div>
          </div>
        </footer>
      </section>

      {/* 5. Card Creator Drawer */}
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
              placeholder="например: politics.russia или politics.cross_analysis"
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

export default AgentChatPage;
