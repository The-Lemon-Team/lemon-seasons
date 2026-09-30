import { NoteType } from '@lenta/shared';

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
  suggestedCurator: 'ivan-bely' | 'kirk-kitten' | 'chen-wei' | 'okatsiya' | 'general';
  suggestedType: NoteType;
  resonanceScore: number; // 0 - 100
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
  | 'ivan-bely'
  | 'kirk-kitten'
  | 'chen-wei'
  | 'okatsiya'
  | 'independent-analyst'
  | 'dispatcher'
  | 'user'
  | 'political-group';

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
}

export interface GroupSummaryPayload {
  groupId: string;
  groupName: string;
  date: string;
  headline: string;
  sections: CuratorSummarySection[];
  resonanceNodes: ResonanceNodeCandidate[];
}

export interface ChatMessage {
  id: string;
  sender: AgentId;
  senderName: string;
  senderRole: string;
  avatar?: string;
  text: string;
  timestamp: string;
  resonanceScore?: number;
  sources?: string[];
  resonanceNodes?: ResonanceNodeCandidate[];
  groupSummary?: GroupSummaryPayload;
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
    id: 'snip-synthesis',
    command: '/synthesis',
    label: '⚖️ Независимый синтез',
    prompt: 'Проведи независимый кросс-контурный анализ: сопоставь внешние факторы и внутренние маркеры РФ без эмоций.',
    description: 'Беспристрастный арбитраж фактов и расчет реальной причинно-следственной связи',
    targetAgent: 'independent-analyst',
  },
  {
    id: 'snip-today',
    command: '/today',
    label: '📅 Повестка на сегодня',
    prompt: 'Собери сводку главных событий и новостных сюжетов по всем контурам на текущую дату.',
    description: 'Комплексный опрос всех агентов с итоговым резюме дня',
    targetAgent: 'all',
  },
  {
    id: 'snip-group-politics',
    command: '/politics',
    label: '🏛️ Политическая коллегия: Резюме дня',
    prompt: 'Коллегия, сформируйте модульное резюме политической повестки на сегодня по всем контурам с выявлением ключевых точек пересечения для синтеза.',
    description: 'Сводный срез от кураторов РФ, международного контура и АТР с точками резонанса',
    targetAgent: 'political-group',
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
    id: 'snip-energy',
    command: '/energy',
    label: '⛽ Топливо и ФАС',
    prompt: 'Какова ситуация с оптовыми ценами на топливо на СПбМТСБ, демпфером и проверками ФАС?',
    description: 'Фокус на оптовом и розничном рынке нефтепродуктов РФ',
    targetAgent: 'ivan-bely',
  },
  {
    id: 'snip-sanctions',
    command: '/sanctions',
    label: '⚓ Санкции и фрахт',
    prompt: 'Какова динамика фрахта танкеров и морского страхования в связи с директивами OFAC и ЕС?',
    description: 'Фокус на морских перевозках, проверках P&I и балтийских портах',
    targetAgent: 'kirk-kitten',
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

