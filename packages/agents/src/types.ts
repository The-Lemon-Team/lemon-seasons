import {
  NoteType,
  CuratorId,
  WorkerAgentId,
  CuratorSurveyRequest,
  CuratorSurveyResult,
  CuratorTake,
  SurveyTimeframe,
  CrossDomainResonance,
  SideWorkTaskType,
  SideWorkRequest,
  SideWorkResult,
  SideWorkMediaItem,
  SideWorkCommentaryItem,
  TelegramNewsPreview,
} from '@lenta/shared';

export type {
  CuratorId,
  WorkerAgentId,
  CuratorSurveyRequest,
  CuratorSurveyResult,
  CuratorTake,
  SurveyTimeframe,
  CrossDomainResonance,
  SideWorkTaskType,
  SideWorkRequest,
  SideWorkResult,
  SideWorkMediaItem,
  SideWorkCommentaryItem,
  TelegramNewsPreview,
};

export type DailyNewsStatus = 'PENDING' | 'ACCEPTED' | 'DISMISSED';

export interface DailyNewsCard {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  source: string;
  url?: string;
  publishedAt: string;
  category: string;
  summary: string;
  keyPoints: string[];
  suggestedCurator: CuratorId | 'general';
  suggestedType: NoteType;
  resonanceScore: number; // 0 - 100
  branchingPotentialScore?: number; // 0 - 100 (BPI: Ripple & Contagion potential)
  isBreaking?: boolean; // Hot World Pulse indicator
  likelyBranches?: string[]; // Anticipated ripple paths across sectors/regions
  suggestedTags: string[];
  status: DailyNewsStatus;
  transformedNoteId?: string | null;
}

export interface PodcastDialogueTurn {
  speaker: string;
  role: 'host1' | 'host2';
  text: string;
  highlight?: boolean;
}

export interface PodcastScript {
  id: string;
  date: string;
  title: string;
  tagline: string;
  host1Name: string;
  host2Name: string;
  turns: PodcastDialogueTurn[];
  estimatedDurationSec: number;
  sourceNewsIds: string[];
  createdAt: string;
}

export interface DailySummaryData {
  date: string;
  totalNewsCount: number;
  acceptedNotesCount: number;
  pendingReviewCount: number;
  averageResonance: number;
  topThemes: string[];
  headlineSynthesis: string;
  hasPodcast: boolean;
  podcast?: PodcastScript | null;
}

// ---------------------------------------------------------------------------
// Agent Chat & Independent Synthesis Types
// ---------------------------------------------------------------------------

export type AgentId =
  | CuratorId
  | WorkerAgentId
  | 'user'
  | 'political-group'
  | 'tech-group'
  | 'macro-group'
  | 'hot-pulse-group'
  | 'domino-nexus-group'
  | 'mena-security-group'
  | 'all-curators'
  | 'all';

export interface ResonanceNodeCandidate {
  id: string;
  title: string;
  curatorIds: string[];
  curatorNames: string[];
  resonanceScore: number; // 0 - 100
  topic: string;
  reasoning: string;
  sharedKeywords: string[];
  suggestedPrompt?: string;
}

export interface CuratorSummarySection {
  curatorId: string;
  curatorName: string;
  curatorRole: string;
  emoji: string;
  accentColor: string;
  bullets: string[];
  sources: string[];
  actionPrompt?: string;
  threadTargetAgent?: string;
}

export interface GroupSummaryPayload {
  groupId: string;
  groupName: string;
  date: string;
  headline: string;
  sections: CuratorSummarySection[];
  resonanceNodes: ResonanceNodeCandidate[];
  newsPosts?: TelegramNewsPreview[];
}

export interface ChatMessage {
  id: string;
  sender: AgentId;
  senderName: string;
  senderRole: string;
  avatar?: string;
  text: string;
  timestamp: string;
  messageType?: 'DEFAULT' | 'TELEGRAM_POST' | 'SUMMARY_DAY' | 'SUMMARY_WEEK' | 'SURVEY_RESULT';
  metadata?: Record<string, any>;
  resonanceScore?: number;
  sources?: string[];
  resonanceNodes?: ResonanceNodeCandidate[];
  groupSummary?: GroupSummaryPayload;
  curatorSurvey?: CuratorSurveyResult;
  sideWorkResult?: SideWorkResult;
  newsPosts?: TelegramNewsPreview[];
  suggestedCard?: {
    title: string;
    description: string;
    type: NoteType;
    folder: string;
    taxonomyPath: string;
    hashtags: string[];
    curator: string;
    resonanceScore: number;
    sourceLink?: string;
  };
}

export interface ChatSnippet {
  id: string;
  command: string; // e.g. '/ivan'
  label: string; // e.g. '🇷🇺 Иван: Контур РФ'
  prompt: string; // Text to send or insert
  description: string;
  targetAgent: AgentId | 'all';
}

export const DEFAULT_CHAT_SNIPPETS: ChatSnippet[] = [
  // --- 0. Telegram Post Snippets ---
  {
    id: 'snip-tg-today',
    command: '/post today',
    label: '📱 TG Пост: Сводка дня',
    prompt: '/post today Сформируй сводку за сегодня в формате Telegram Post с ключевыми тезисами, эмодзи и тегами.',
    description: 'Оформить сводку текущей даты в виде ёмкого Telegram-поста для публикации',
    targetAgent: 'all',
  },
  {
    id: 'snip-tg-week',
    command: '/post week',
    label: '📱 TG Пост: Панорама недели',
    prompt: '/post week Сформируй недельный дайджест в формате Telegram Post с главными выводами и тегами.',
    description: 'Сформировать недельный дайджест в виде структурированного Telegram-поста',
    targetAgent: 'all',
  },
  // --- 1. Опрос Кураторов (Survey Coordinator Agent) ---
  {
    id: 'snip-survey-today',
    command: '/survey-today',
    label: '🧭 Опрос: Срез на сегодня',
    prompt: 'Опросчик, собери позиции всех кураторов по главным событиям на сегодняшнюю дату и выдели узлы пересечения.',
    description: 'Агент-опросчик опрашивает кураторов (Иван, Kirk, Окация, Чэнь) по повестке дня',
    targetAgent: 'survey-coordinator',
  },
  {
    id: 'snip-survey-yesterday',
    command: '/survey-yesterday',
    label: '⏪ Опрос: Срез за вчера',
    prompt: 'Опросчик, опроси группу политических кураторов и Окацию по событиям за вчерашний день.',
    description: 'Опрос кураторов за вчерашний день с анализом реакции рынков и регуляторов',
    targetAgent: 'survey-coordinator',
  },
  {
    id: 'snip-survey-week',
    command: '/survey-week',
    label: '📊 Опрос: Панорама за неделю',
    prompt: 'Опросчик, проведи комплексный опрос всех кураторов по ключевым сюжетам и трендам за последние 7 дней.',
    description: 'Недельный аналитический опрос с определением главных долгосрочных резонансов',
    targetAgent: 'survey-coordinator',
  },

  // --- 2. Сайд-Работа и Медиа (Side-Work & Content Producer Agent) ---
  {
    id: 'snip-sidework-post',
    command: '/sidework-post',
    label: '📝 Сайд: Создать пост/дайджест',
    prompt: 'Сайд-воркер, на основе последних собранных данных подготовь структурированный пост/дайджест для публикации с ключевыми выводами.',
    description: 'Агент сайд-работы создает готовый пост/статью на основе курированных новостей',
    targetAgent: 'sidework-producer',
  },
  {
    id: 'snip-sidework-media',
    command: '/media',
    label: '🎨 Сайд: Медиа и промпты для AI',
    prompt: 'Сайд-воркер, сгенерируй профессиональные промпты для иллюстраций (DALL-E / Midjourney) и составь диаграмму связей Mermaid для этой темы.',
    description: 'Медиа-обогащение: генерация визуальных промптов, обложек, схем связей и цитат',
    targetAgent: 'sidework-producer',
  },
  {
    id: 'snip-sidework-comment',
    command: '/comment',
    label: '💬 Сайд: Дополнить комментарием',
    prompt: 'Сайд-воркер, дополни собранные материалы аналитическим комментарием кураторов и фактологической справкой.',
    description: 'Обогащение материала экспертным комментарием и проверкой фактов',
    targetAgent: 'sidework-producer',
  },

  // --- 3. Предметные Кураторы (Domain Curators) ---
  {
    id: 'snip-okatsiya-it-ai',
    command: '/it',
    label: '⚡ Окация: IT & AI сводка',
    prompt: 'Окация, какие ключевые события в мире IT и искусственного интеллекта актуальны на сегодня?',
    description: 'Комплексный технологический контур: нейросети, BigTech, инфраструктура и инженерные отрасли',
    targetAgent: 'okatsiya',
  },
  {
    id: 'snip-okatsiya-ai-only',
    command: '/ai',
    label: '🧠 Окация: Только AI & LLM',
    prompt: 'Окация, выдели исключительно новости и прорывы в сфере AI, LLM, нейросетей и машинного обучения на сегодня.',
    description: 'Фокус только на искусственном интеллекте, моделях, весах и исследованиях без общего IT',
    targetAgent: 'okatsiya',
  },
  {
    id: 'snip-okatsiya-devops',
    command: '/devops',
    label: '🚢 Окация: DevOps & Cloud',
    prompt: 'Окация, какова обстановка в инфраструктуре, Kubernetes, CI/CD, контейнерах и облачных платформах?',
    description: 'Инфраструктурный срез: Kubernetes, SRE, облака, автоматизация и отказоустойчивость',
    targetAgent: 'okatsiya',
  },
  {
    id: 'snip-okatsiya-backend',
    command: '/backend',
    label: '⚙️ Окация: Backend & HighLoad',
    prompt: 'Окация, какие ключевые обновления в бэкенде, распределенных системах, базах данных и системных языках?',
    description: 'Серверная архитектура, базы данных, микросервисы, Go/Rust/Java и высоконагруженные системы',
    targetAgent: 'okatsiya',
  },
  {
    id: 'snip-okatsiya-bigtech',
    command: '/bigtech',
    label: '🏢 Окация: BigTech & Корпорации',
    prompt: 'Окация, что происходит у технологических гигантов (BigTech), антимонопольных регуляторов и на IT-рынках?',
    description: 'Рыночные маневры корпораций: Nvidia, Apple, Google, Microsoft, Meta, инвестиции и антитраст',
    targetAgent: 'okatsiya',
  },
  {
    id: 'snip-okatsiya-infosec',
    command: '/infosec',
    label: '🛡️ Окация: InfoSec & Уязвимости',
    prompt: 'Окация, какие критические уязвимости CVE, инциденты информационной безопасности и патчи зафиксированы?',
    description: 'Кибербезопасность, эксплойты нулевого дня, аудит защищенности и безопасность инфраструктуры',
    targetAgent: 'okatsiya',
  },
  {
    id: 'snip-ivan-rf',
    command: '/ivan',
    label: '🇷🇺 Иван: Контур РФ',
    prompt: 'Иван, какие ключевые события, законы и решения регуляторов в РФ актуальны на сегодня?',
    description: 'Внутренний контур: Госдума, Правительство, ЦБ РФ, ФАС, налоги и рынок РФ',
    targetAgent: 'ivan-bely',
  },
  {
    id: 'snip-kirk-world',
    command: '/kirk',
    label: '🌐 Kirk: Внешний контур',
    prompt: 'Kirk, какие последние сигналы по санкциям OFAC, ЕС, морской логистике и мировым рынкам?',
    description: 'Международный контур: санкции, танкерный флот, ООН, сырьевые рынки',
    targetAgent: 'kirk-kitten',
  },
  {
    id: 'snip-chen-asia',
    command: '/chen',
    label: '🇨🇳 Чэнь: АТР и БРИКС',
    prompt: 'Чэнь, какие ключевые сигналы по Китаю, торговым коридорам, расчетам в нацвалютах и БРИКС актуальны на сегодня?',
    description: 'Восточный контур: Китай, АТР, товарооборот, логистические коридоры и расчеты',
    targetAgent: 'chen-wei',
  },
  {
    id: 'snip-breaking-news',
    command: '/breaking',
    label: '🔥 Breaking News: Мировой пульс',
    prompt: 'Какие самые горячие и важные мировые новости происходят прямо сейчас?',
    description: 'Экстренные мировые молнии, виральные тренды и срочные новости глобальной повестки',
    targetAgent: 'alex-vector',
  },

  // --- 4. Коллегии и Арбитраж ---
  {
    id: 'snip-group-politics',
    command: '/politics',
    label: '🏛️ Политическая коллегия: Резюме',
    prompt: 'Коллегия, сформируйте модульное резюме политической повестки на сегодня по всем контурам с выявлением ключевых точек пересечения для синтеза.',
    description: 'Сводный срез от кураторов РФ, международного контура и АТР с точками резонанса',
    targetAgent: 'political-group',
  },
  {
    id: 'snip-synthesis',
    command: '/synthesis',
    label: '⚖️ Независимый синтез',
    prompt: 'Проведи независимый кросс-контурный анализ: сопоставь внешние факторы и внутренние маркеры РФ без эмоций.',
    description: 'Беспристрастный арбитраж фактов и расчет реальной причинно-следственной связи',
    targetAgent: 'independent-analyst',
  },
  {
    id: 'snip-harvest',
    command: '/harvest',
    label: '📡 Харвестер: Сбор данных',
    prompt: 'Харвестер, выполни проверку входящих фидов и источников, собери свежие сигналы для передачи кураторам.',
    description: 'Агент сбора новостей сканирует первоисточники и формирует карточки на триаж',
    targetAgent: 'harvester-agent',
  },
  {
    id: 'snip-german-habr',
    command: '/habr',
    label: '📟 Герман: Разбор Habr & IT-статей',
    prompt: 'Герман, сделай подборку и аналитический разбор публикаций с Habr и IT-статей, выдели олдскульные темы и сформируй Note.',
    description: 'Мониторинг Habr, IT-сообществ, разбор интересных тем и создание тематических заметок',
    targetAgent: 'german-kernel',
  },
  {
    id: 'snip-german-xakep',
    command: '/xakep',
    label: '📟 Герман: Журнал «Хакер»',
    prompt: 'Герман, покажи разбор материалов журнала «Хакер» (xakep.ru), выдели статьи выпуска и сгруппируй в тематическую Super Note.',
    description: 'Помесячный разбор журнала Хакер, группировка статей по темам выпуска для передачи в NotebookLM',
    targetAgent: 'german-kernel',
  },
  {
    id: 'snip-notebook-producer',
    command: '/notebook',
    label: '📓 NotebookLM: Создать дневник',
    prompt: 'NotebookLM Агент, возьми Super Note темы и начни создание дневника и подкаста в фоне с расчетом времени готовности.',
    description: 'Фоновая сборка блокнота NotebookLM, генерация аудио-дневника и обновление заметки по коллбэку',
    targetAgent: 'notebook-producer',
  },
];

export interface AgentChatRequest {
  message: string;
  date?: string;
  targetAgent?: AgentId | 'all';
  history?: ChatMessage[];
  geminiApiKey?: string;
}

export interface AgentChatResponse {
  date: string;
  replies: ChatMessage[];
}


