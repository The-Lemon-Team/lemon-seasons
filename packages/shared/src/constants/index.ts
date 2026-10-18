export const NoteType = {
  SINGLE: 'SINGLE',
  PERIOD: 'PERIOD',
  EVENT: 'EVENT',
  FILM_RELEASE: 'FILM_RELEASE',
  MENTION: 'MENTION',
  DONE: 'DONE',
} as const;

export type NoteType = (typeof NoteType)[keyof typeof NoteType];
export type NoteTypeValue = NoteType;

export const NOTE_TYPES: NoteType[] = [
  'SINGLE',
  'PERIOD',
  'EVENT',
  'FILM_RELEASE',
  'MENTION',
  'DONE',
];

export const NoteStatus = {
  DRAFT: 'DRAFT',
  SCHEDULED: 'SCHEDULED',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
} as const;

export type NoteStatus = (typeof NoteStatus)[keyof typeof NoteStatus];
export type NoteStatusValue = NoteStatus;

export const NOTE_STATUSES: NoteStatus[] = [
  'DRAFT',
  'SCHEDULED',
  'PUBLISHED',
  'ARCHIVED',
];

export const NoteStatusLabelsRu: Record<NoteStatus, string> = {
  DRAFT: 'Черновик',
  SCHEDULED: 'Запланировано',
  PUBLISHED: 'Опубликовано',
  ARCHIVED: 'В архиве',
};

export const NoteStatusLabelsEn: Record<NoteStatus, string> = {
  DRAFT: 'Draft',
  SCHEDULED: 'Scheduled',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
};

export function getNoteStatusLabel(status: NoteStatus, lang: Language = 'ru'): string {
  if (lang === 'ru') {
    return NoteStatusLabelsRu[status] || status;
  }
  return NoteStatusLabelsEn[status] || status;
}

export type Language = 'ru' | 'en';

export const NoteTypeLabelsEn: Record<NoteType, string> = {
  SINGLE: 'Point Note',
  PERIOD: 'Time Period',
  EVENT: 'Scheduled Event',
  FILM_RELEASE: 'Media / Release',
  MENTION: 'Citation / Mention',
  DONE: 'Milestone / Done',
};

export const NoteTypeLabelsRu: Record<NoteType, string> = {
  SINGLE: 'Точечная заметка',
  PERIOD: 'Период времени',
  EVENT: 'Событие',
  FILM_RELEASE: 'Медиа / Релиз',
  MENTION: 'Цитата / Упоминание',
  DONE: 'Веха / Выполнено',
};

export const NoteTypeLabels = NoteTypeLabelsEn;

export function getNoteTypeLabel(type: NoteType, lang: Language = 'ru'): string {
  if (lang === 'ru') {
    return NoteTypeLabelsRu[type] || type;
  }
  return NoteTypeLabelsEn[type] || type;
}

export const TREND_LABEL_RU = 'Тренд';
export const TREND_LABEL_EN = 'Trend';

/**
 * Resolves physical NoteType for a Trend:
 * If an endDate is provided, maps to PERIOD; otherwise maps to SINGLE (point note).
 */
export function resolveTrendNoteType(endDate?: string | null): NoteType {
  return endDate && endDate.trim() ? NoteType.PERIOD : NoteType.SINGLE;
}

export const NoteTypeColors: Record<NoteType, { bg: string; text: string; border: string; accent: string }> = {

  SINGLE: { bg: '#232924', text: '#d4e157', border: '#384435', accent: '#c9cd58' },
  PERIOD: { bg: '#1c2833', text: '#5dade2', border: '#2e4053', accent: '#3498db' },
  EVENT: { bg: '#2c2233', text: '#bb8fce', border: '#4a3b53', accent: '#9b59b6' },
  FILM_RELEASE: { bg: '#33271e', text: '#f39c12', border: '#533c2a', accent: '#e67e22' },
  MENTION: { bg: '#1e2b2e', text: '#48c9b0', border: '#2d454a', accent: '#1abc9c' },
  DONE: { bg: '#1f2e24', text: '#52be80', border: '#2d4734', accent: '#27ae60' },
};

export const ConflictStrategy = {
  SERVER_WINS: 'server_wins',
  CLIENT_WINS: 'client_wins',
  CREATE_BACKUP_FORK: 'create_backup_fork',
  MANUAL_MERGE: 'manual_merge',
} as const;

export type ConflictStrategy = (typeof ConflictStrategy)[keyof typeof ConflictStrategy];
export type ConflictStrategyValue = ConflictStrategy;

export const ConflictStrategyLabelsEn: Record<ConflictStrategy, string> = {
  server_wins: 'Server Wins (Keep Remote)',
  client_wins: 'Client Wins (Overwrite Remote)',
  create_backup_fork: 'Create Backup Fork',
  manual_merge: 'Manual Merge Required',
};

export const ConflictStrategyLabelsRu: Record<ConflictStrategy, string> = {
  server_wins: 'Приоритет сервера (Оставить удалённую версию)',
  client_wins: 'Приоритет клиента (Перезаписать удалённую версию)',
  create_backup_fork: 'Создать резервную копию (Форк)',
  manual_merge: 'Требуется ручное слияние',
};

// ---------------------------------------------------------------------------
// Note Templates & Aliases Constants (Private Deterministic Engine)
// ---------------------------------------------------------------------------

export const NOTE_TEMPLATE_TRENDS_TODAY = 'trends_today';
export const NOTE_TEMPLATE_TREND_PERIOD = 'trend_period';
export const NOTE_TEMPLATE_EVENT = 'event';
export const NOTE_TEMPLATE_DONE = 'done';
export const NOTE_TEMPLATE_POINT_NOTE = 'point_note';

export interface NoteTemplateDefinition {
  id: string;
  name: string;
  aliases: string[];
  defaultType: NoteType;
  defaultDisplayType: string;
  defaultFolder: string;
  defaultHashtags: string[];
  icon: string;
}

export const DEFAULT_NOTE_TEMPLATES: Record<string, NoteTemplateDefinition> = {
  [NOTE_TEMPLATE_TRENDS_TODAY]: {
    id: NOTE_TEMPLATE_TRENDS_TODAY,
    name: 'Тренды на сегодня',
    aliases: [
      'тренды на сегодня',
      'тренды',
      'тренд сегодня',
      'тренд',
      'trends today',
      'trends',
      'trend',
      '/today',
      '/trend',
      '/tr',
      '!тренды',
      '!тренд',
      '!today',
    ],
    defaultType: NoteType.SINGLE,
    defaultDisplayType: 'Trend',
    defaultFolder: 'Trends',
    defaultHashtags: ['тренд'],
    icon: 'trending-up',
  },
  [NOTE_TEMPLATE_TREND_PERIOD]: {
    id: NOTE_TEMPLATE_TREND_PERIOD,
    name: 'Тренд Период',
    aliases: [
      'тренд период',
      'тренд-период',
      'период тренда',
      'период',
      'марафон',
      'сезон',
      'trend period',
      'trend-period',
      'period',
      '/period',
      '/trp',
      '!период',
      '!trend-period',
    ],
    defaultType: NoteType.PERIOD,
    defaultDisplayType: 'Trend',
    defaultFolder: 'Trends',
    defaultHashtags: ['тренд'],
    icon: 'trending-up',
  },
  [NOTE_TEMPLATE_EVENT]: {
    id: NOTE_TEMPLATE_EVENT,
    name: 'Событие с датой',
    aliases: [
      'событие',
      'ивент',
      'митап',
      'встреча',
      'созвон',
      'вебинар',
      'event',
      '/event',
      '!event',
    ],
    defaultType: NoteType.EVENT,
    defaultDisplayType: 'Scheduled Event',
    defaultFolder: 'Notes',
    defaultHashtags: ['событие'],
    icon: 'calendar',
  },
  [NOTE_TEMPLATE_DONE]: {
    id: NOTE_TEMPLATE_DONE,
    name: 'Сделано',
    aliases: [
      'сделано',
      'готово',
      'done',
      'выполнено',
      'чек',
      'v',
      '+',
      '/done',
      '!done',
    ],
    defaultType: NoteType.DONE,
    defaultDisplayType: 'Done',
    defaultFolder: 'Notes',
    defaultHashtags: ['done'],
    icon: 'check-circle',
  },
  [NOTE_TEMPLATE_POINT_NOTE]: {
    id: NOTE_TEMPLATE_POINT_NOTE,
    name: 'Заметка',
    aliases: ['заметка', 'мысль', 'note', 'point', 'факт', '/note', '!note'],
    defaultType: NoteType.SINGLE,
    defaultDisplayType: 'Point Note',
    defaultFolder: 'Notes',
    defaultHashtags: [],
    icon: 'file-text',
  },
};

export const METADATA_FIELD_ALIASES = {
  FOLDER: ['папка', 'folder', 'dir', 'п', 'ф'],
  TAXONOMY: ['тег', 'tag', 'таксономия', 'tax', 'т'],
  FEED: ['лента', 'feed', 'календарь', 'л'],
  TIME: ['в', 'at', '@', 'время', 'time'],
  LINK: ['ссылка', 'link', 'url'],
  ICON: ['иконка', 'icon', 'и'],
} as const;

export const DATE_MACRO_ALIASES = {
  TODAY: ['сегодня', 'today', 'тд', 'td'],
  YESTERDAY: ['вчера', 'yesterday', 'вч'],
  TOMORROW: ['завтра', 'tomorrow', 'зм', 'tm'],
  DAY_BEFORE_YESTERDAY: ['позавчера'],
  DAY_AFTER_TOMORROW: ['послезавтра'],
} as const;

export const SYSTEM_USERS = {
  admin: {
    id: 'usr-admin-999',
    name: 'Администратор (Admin)',
    email: 'admin@lemon.team',
    role: 'admin' as const,
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    createdAt: '2025-11-01T08:00:00.000Z',
  },
  user: {
    id: 'usr-member-001',
    name: 'Пользователь (User)',
    email: 'user@lemon.team',
    role: 'user' as const,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-01-10T10:00:00.000Z',
  },
  guest: {
    id: 'usr-guest-000',
    name: 'Гость (Guest)',
    email: 'guest@lemon.team',
    role: 'guest' as const,
  },
} as const;

// ---------------------------------------------------------------------------
// Compact IT & AI Sectors Registry (Архитектура отраслей IT)
// ---------------------------------------------------------------------------

export type ItSectorId =
  | 'ai'
  | 'devops'
  | 'bigtech'
  | 'backend'
  | 'frontend'
  | 'mobile'
  | 'infosec'
  | 'cloud'
  | 'data'
  | 'hardware'
  | 'gamedev'
  | 'qa';

export interface ItSectorDefinition {
  id: ItSectorId;
  name: string;
  shortName: string;
  emoji: string;
  category: 'ai' | 'engineering' | 'business';
  folder: string;
  taxonomyPath: string;
  hashtags: string[];
  keywords: string[];
  description: string;
}

export const IT_SECTOR_REGISTRY: Record<ItSectorId, ItSectorDefinition> = {
  ai: {
    id: 'ai',
    name: 'Искусственный Интеллект & LLM',
    shortName: 'AI & ML',
    emoji: '🧠',
    category: 'ai',
    folder: 'Tech/AI',
    taxonomyPath: 'tech.ai.llm',
    hashtags: ['AI', 'LLM', 'Нейросети', 'MachineLearning', 'GenAI'],
    keywords: ['ai', 'ии', 'llm', 'нейросеть', 'нейросети', 'deepseek', 'openai', 'anthropic', 'gemini', 'gpt', 'transformers', 'diffusion', 'rag', 'агент', 'prompt', 'rag'],
    description: 'Большие языковые модели, мультимодальные сети, локальные веса, архитектуры трансформеров и агентные фреймворки.',
  },
  devops: {
    id: 'devops',
    name: 'DevOps, SRE & Инфраструктура',
    shortName: 'DevOps',
    emoji: '🚢',
    category: 'engineering',
    folder: 'Tech/DevOps',
    taxonomyPath: 'tech.devops.infra',
    hashtags: ['DevOps', 'SRE', 'Kubernetes', 'CICD', 'Infrastructure'],
    keywords: ['devops', 'девопс', 'sre', 'kubernetes', 'k8s', 'docker', 'ci/cd', 'helm', 'terraform', 'ansible', 'container', 'контейнер', 'кластер', 'observability'],
    description: 'Контейнеризация, оркестрация Kubernetes, автоматизация CI/CD пайплайнов, мониторинг и надежность сервисов.',
  },
  bigtech: {
    id: 'bigtech',
    name: 'Бигтех & Рынок Технологий',
    shortName: 'BigTech',
    emoji: '🏢',
    category: 'business',
    folder: 'Tech/BigTech',
    taxonomyPath: 'tech.bigtech.market',
    hashtags: ['BigTech', 'Бигтех', 'ITBusiness', 'Рынок', 'TechКорпорации'],
    keywords: ['bigtech', 'бигтех', 'google', 'apple', 'microsoft', 'meta', 'nvidia', 'amazon', 'яндекс', 'yandex', 'антимонопол', 'm&a', 'капитализаци', 'квартальный отчет', 'акции'],
    description: 'Корпоративные гиганты индустрии, инвестиции, антимонопольные расследования, поглощения (M&A) и финансовые результаты.',
  },
  backend: {
    id: 'backend',
    name: 'Backend & Распределенные Системы',
    shortName: 'Backend',
    emoji: '⚙️',
    category: 'engineering',
    folder: 'Tech/Backend',
    taxonomyPath: 'tech.backend.systems',
    hashtags: ['Backend', 'Бэкенд', 'Architecture', 'Databases', 'HighLoad'],
    keywords: ['backend', 'бэкенд', 'микросервис', 'сервер', 'база данных', 'бд', 'postgres', 'postgresql', 'redis', 'kafka', 'grpc', 'rest', 'golang', 'rust', 'java', 'node.js', 'highload', 'распределенн'],
    description: 'Серверная архитектура, базы данных, брокеры сообщений, масштабируемость HighLoad и системные языки программирования.',
  },
  frontend: {
    id: 'frontend',
    name: 'Frontend & Web-Платформа',
    shortName: 'Frontend',
    emoji: '🌐',
    category: 'engineering',
    folder: 'Tech/Frontend',
    taxonomyPath: 'tech.frontend.web',
    hashtags: ['Frontend', 'Фронтенд', 'WebDev', 'React', 'UIUX'],
    keywords: ['frontend', 'фронтенд', 'react', 'vue', 'svelte', 'angular', 'nextjs', 'vite', 'javascript', 'typescript', 'css', 'браузер', 'webassembly', 'wasm', 'ui'],
    description: 'Веб-стандарты, клиентские интерфейсы, производительность рендеринга, фреймворки и браузерные движки.',
  },
  mobile: {
    id: 'mobile',
    name: 'Mobile Разработка (iOS & Android)',
    shortName: 'Mobile',
    emoji: '📱',
    category: 'engineering',
    folder: 'Tech/Mobile',
    taxonomyPath: 'tech.mobile.apps',
    hashtags: ['Mobile', 'iOS', 'Android', 'Flutter', 'ReactNative'],
    keywords: ['mobile', 'мобильн', 'ios', 'android', 'swift', 'kotlin', 'flutter', 'react native', 'app store', 'google play', 'apk'],
    description: 'Нативная и кроссплатформенная мобильная разработка, мобильные ОС, магазины приложений и экосистемы устройств.',
  },
  infosec: {
    id: 'infosec',
    name: 'Информационная Безопасность & SecOps',
    shortName: 'InfoSec',
    emoji: '🛡️',
    category: 'engineering',
    folder: 'Tech/Security',
    taxonomyPath: 'tech.infosec.security',
    hashtags: ['InfoSec', 'CyberSecurity', 'CVE', 'Безопасность', 'SecOps'],
    keywords: ['infosec', 'security', 'безопасност', 'уязвимост', 'cve', 'zero-day', 'взлом', 'хакер', 'malware', 'криптографи', 'ddos', 'фишинг', 'аудит безопасности'],
    description: 'Кибербезопасность, уязвимости CVE, защита периметра, аудит кода, криптография и реагирование на инциденты.',
  },
  cloud: {
    id: 'cloud',
    name: 'Cloud-Платформы & Serverless',
    shortName: 'Cloud',
    emoji: '☁️',
    category: 'engineering',
    folder: 'Tech/Cloud',
    taxonomyPath: 'tech.cloud.platforms',
    hashtags: ['Cloud', 'AWS', 'GCP', 'Azure', 'Serverless'],
    keywords: ['cloud', 'облак', 'aws', 'gcp', 'azure', 'yandex cloud', 'serverless', 'lambda', 's3', 'iaas', 'paas', 'edge'],
    description: 'Облачные провайдеры, бессерверные вычисления, гибридные облака, хранилища и глобальная связность.',
  },
  data: {
    id: 'data',
    name: 'Data Engineering & Big Data',
    shortName: 'Data',
    emoji: '📊',
    category: 'engineering',
    folder: 'Tech/Data',
    taxonomyPath: 'tech.data.engineering',
    hashtags: ['DataEngineering', 'BigData', 'Analytics', 'ClickHouse', 'ETL'],
    keywords: ['data', 'данные', 'big data', 'etl', 'elt', 'clickhouse', 'spark', 'hadoop', 'snowflake', 'dbt', 'lakehouse', 'аналитик данных', 'пайплайн данных'],
    description: 'Пайплайны обработки данных, хранилища DWH/Lakehouse, аналитические СУБД и потоковая обработка.',
  },
  hardware: {
    id: 'hardware',
    name: 'Hardware, Чипы & Полупроводники',
    shortName: 'Hardware',
    emoji: '🔬',
    category: 'engineering',
    folder: 'Tech/Hardware',
    taxonomyPath: 'tech.hardware.semiconductors',
    hashtags: ['Hardware', 'Chips', 'Semiconductors', 'Nvidia', 'TSMC'],
    keywords: ['hardware', 'железо', 'чип', 'чипы', 'полупроводник', 'процессор', 'gpu', 'cpu', 'nvidia', 'tsmc', 'asml', 'intel', 'amd', 'arm', 'risc-v', 'квантов'],
    description: 'Кремниевая литография, ускорители вычислений (GPU/TPU/NPU), RISC-V, серверные архитектуры и дата-центры.',
  },
  gamedev: {
    id: 'gamedev',
    name: 'GameDev & Компьютерная Графика',
    shortName: 'GameDev',
    emoji: '🎮',
    category: 'engineering',
    folder: 'Tech/GameDev',
    taxonomyPath: 'tech.gamedev.graphics',
    hashtags: ['GameDev', 'UnrealEngine', 'Unity', 'Graphics', 'RayTracing'],
    keywords: ['gamedev', 'геймдев', 'игры', 'unreal engine', 'unity', 'godot', 'шейдер', 'ray tracing', '3d', 'графика', 'directx', 'vulkan'],
    description: 'Игровые движки, рендеринг реального времени, физические симуляции и технологии видеоигр.',
  },
  qa: {
    id: 'qa',
    name: 'QA & Инженерия Качества',
    shortName: 'QA',
    emoji: '🧪',
    category: 'engineering',
    folder: 'Tech/QA',
    taxonomyPath: 'tech.qa.testing',
    hashtags: ['QA', 'Testing', 'Automation', 'QualityEngineering'],
    keywords: ['qa', 'тестирован', 'e2e', 'cypress', 'playwright', 'unit test', 'автотест', 'нагрузочное тестирование', 'qa engineering'],
    description: 'Автоматизация тестирования, E2E проверки, нагрузочные испытания, обеспечение надежности и качество ПО.',
  },
};

export const IT_SECTOR_LIST = Object.values(IT_SECTOR_REGISTRY);

/**
 * Fast compact resolver to find IT Sector by ID, short name or alias keyword.
 */
export function getItSector(idOrKeyword?: string | null): ItSectorDefinition | null {
  if (!idOrKeyword) return null;
  const clean = idOrKeyword.trim().toLowerCase();
  if (IT_SECTOR_REGISTRY[clean as ItSectorId]) {
    return IT_SECTOR_REGISTRY[clean as ItSectorId];
  }
  return (
    IT_SECTOR_LIST.find(
      (s) =>
        s.id === clean ||
        s.shortName.toLowerCase() === clean ||
        s.keywords.includes(clean)
    ) || null
  );
}

/**
 * Detects the most relevant IT sector from a piece of text (headline, question or article body).
 */
export function resolveItSectorFromText(text: string): ItSectorDefinition | null {
  if (!text) return null;
  const lower = text.toLowerCase();

  let bestSector: ItSectorDefinition | null = null;
  let maxMatches = 0;

  for (const sector of IT_SECTOR_LIST) {
    let matches = 0;
    for (const kw of sector.keywords) {
      if (lower.includes(kw)) {
        matches += kw.length > 3 ? 2 : 1;
      }
    }
    if (matches > maxMatches) {
      maxMatches = matches;
      bestSector = sector;
    }
  }

  return bestSector;
}

/**
 * Returns all detected IT sectors from a piece of text.
 */
export function detectAllItSectors(text: string): ItSectorDefinition[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  return IT_SECTOR_LIST.filter((s) => s.keywords.some((kw) => lower.includes(kw)));
}



