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
// Curator & Assistant Personas Registry (Lenta Lens System)
// ---------------------------------------------------------------------------

export interface CuratorPersona {
  id: string;
  name: string;
  shortName: string;
  role: string;
  scope: string;
  accentColor: string;
  borderAccent: string;
  bgLight: string;
  badgeBg: string;
  emoji: string;
  iconName: string;
  description: string;
  isStandby?: boolean;
}

export const CURATOR_PERSONAS: Record<string, CuratorPersona> = {
  'ivan-bely': {
    id: 'ivan-bely',
    name: 'Иван Белый',
    shortName: 'Иван',
    role: 'Обозреватель обстановки и внутреннего контура РФ',
    scope: 'Политика, экономика, регуляторика ФАС/ЦБ, выборы (ЕДГ-2026), внутренний рынок РФ',
    accentColor: '#38bdf8', // Sky/Cyan
    borderAccent: '#0284c7',
    bgLight: 'rgba(56, 189, 248, 0.12)',
    badgeBg: 'rgba(56, 189, 248, 0.22)',
    emoji: '🇷🇺',
    iconName: 'ShieldCheck',
    description: 'Аналитическая оптика внутреннего контура России. Фокусируется на законах, постановлениях правительства, ценовом балансе и влиянии на граждан и бизнес.',
  },
  'kirk-kitten': {
    id: 'kirk-kitten',
    name: 'Kirk Kitten',
    shortName: 'Kirk',
    role: 'Специальный международный корреспондент и обозреватель рынков',
    scope: 'США, ЕС, санкции OFAC, глобальная логистика, решения ФРС, саммиты Davos/G20, выборы в Конгресс',
    accentColor: '#fbbf24', // Amber/Gold
    borderAccent: '#d97706',
    bgLight: 'rgba(251, 191, 36, 0.12)',
    badgeBg: 'rgba(251, 191, 36, 0.22)',
    emoji: '🌐',
    iconName: 'Radar',
    description: 'Аналитическая оптика внешнего международного контура. Проверяет первичные факты по англоязычным реестрам, биржевым данным и решениям зарубежных регуляторов.',
  },
  'okatsiya': {
    id: 'okatsiya',
    name: 'Окация',
    shortName: 'Окация',
    role: 'Архитектор и куратор контура IT & AI',
    scope: 'AI/LLM, BigTech, DevOps, Backend, Frontend, Cloud, InfoSec, Data & Chips',
    accentColor: '#a855f7', // Neon Violet/Purple
    borderAccent: '#9333ea',
    bgLight: 'rgba(168, 85, 247, 0.12)',
    badgeBg: 'rgba(168, 85, 247, 0.22)',
    emoji: '⚡',
    iconName: 'Cpu',
    description: 'Технологическая и архитектурная оптика. Мониторит релизы ИИ-моделей, BigTech, инфраструктурные платформы, уязвимости и ключевые инженерные отрасли IT.',
  },
  'chen-wei': {
    id: 'chen-wei',
    name: 'Чэнь Вэй',
    shortName: 'Чэнь',
    role: 'Обозреватель АТР, Китая и глобальных цепочек поставок',
    scope: 'Китай, Юго-Восточная Азия, БРИКС, расчеты в нацвалютах, торговые коридоры, электроника и сырье',
    accentColor: '#ef4444', // Red
    borderAccent: '#dc2626',
    bgLight: 'rgba(239, 68, 68, 0.12)',
    badgeBg: 'rgba(239, 68, 68, 0.22)',
    emoji: '🇨🇳',
    iconName: 'Globe2',
    description: 'Аналитическая оптика Азиатско-Тихоокеанского региона и стран БРИКС. Мониторит товарооборот, логистические коридоры (МТК Север-Юг, Севморпуть) и финансовый клиринг.',
  },
  'alex-vector': {
    id: 'alex-vector',
    name: 'Breaking News',
    shortName: 'Breaking News',
    role: 'Шеф мирового пульса и Breaking News',
    scope: 'Мировые молнии, экстренные коммюнике, виральные сюжеты, X/Twitter, саммиты, чрезвычайные события',
    accentColor: '#f97316', // Orange / Flame
    borderAccent: '#ea580c',
    bgLight: 'rgba(249, 115, 22, 0.12)',
    badgeBg: 'rgba(249, 115, 22, 0.22)',
    emoji: '🔥',
    iconName: 'Flame',
    description: 'Оптика глобального оперативного пульса. Отслеживает взрывные инфоповоды, breaking-ньюс мировых агентств и отделяет виральный шум от тектонических сдвигов.',
  },
  'marcus-vane': {
    id: 'marcus-vane',
    name: 'Маркус Вейн',
    shortName: 'Маркус',
    role: 'Аналитик эффекта домино и ветвления событий [Standby]',
    scope: 'Каскадные риски, вакуум силы, геостратегические узлы, триггеры бифуркации, ветвление сюжетов',
    accentColor: '#10b981', // Emerald
    borderAccent: '#059669',
    bgLight: 'rgba(16, 185, 129, 0.12)',
    badgeBg: 'rgba(16, 185, 129, 0.22)',
    emoji: '♟️',
    iconName: 'GitBranch',
    description: 'Оптика системных каскадов и теории игр (в режиме ожидания до активации автоматической аналитики).',
    isStandby: true,
  },
  'tariq-said': {
    id: 'tariq-said',
    name: 'Тарик Саид',
    shortName: 'Тарик',
    role: 'Обозреватель Ближнего Востока и зоны Залива (MENA)',
    scope: 'Ближний Восток, Ирак, Иран, монархии Залива, Левант, безопасность баз, OPEC+, суннитско-шиитский баланс',
    accentColor: '#eab308', // Desert Gold
    borderAccent: '#ca8a04',
    bgLight: 'rgba(234, 179, 8, 0.12)',
    badgeBg: 'rgba(234, 179, 8, 0.22)',
    emoji: '🕌',
    iconName: 'Compass',
    description: 'Оптика региона MENA и исламского мира. Анализирует закрытые договоренности монархий Залива, влияние проиранских осей, турецкий фактор и безопасность инфраструктуры.',
  },
  'helena-brandt': {
    id: 'helena-brandt',
    name: 'Хелена Брандт',
    shortName: 'Хелена',
    role: 'Аналитик критических артерий, сырья и глобальной логистики',
    scope: 'Нефть Brent/WTI, СПГ, морские узлы (Ормуз, Суэц, Баб-эль-Мандеб), страховой фрахт Lloyd\'s, редкоземельные металлы',
    accentColor: '#06b6d4', // Maritime Cyan
    borderAccent: '#0891b2',
    bgLight: 'rgba(6, 182, 212, 0.12)',
    badgeBg: 'rgba(6, 182, 212, 0.22)',
    emoji: '⚓',
    iconName: 'Anchor',
    description: 'Оптика физических артерий глобальной экономики. Измеряет материальные последствия геополитики: уязвимость проливов, стоимость фрахта танкеров и дефициты сырья.',
  },
  'german-kernel': {
    id: 'german-kernel',
    name: 'Герман «Кернел»',
    shortName: 'Герман',
    role: 'Обозреватель Habr, IT-публикаций и редактор дайджестов',
    scope: 'Habr, журнал «Хакер» (xakep.ru), статьи IT-сообщества, олдскул-разборы плат и схемотехники, создание тематических Note',
    accentColor: '#10b981', // Emerald CRT / Terminal Green
    borderAccent: '#059669',
    bgLight: 'rgba(16, 185, 129, 0.12)',
    badgeBg: 'rgba(16, 185, 129, 0.22)',
    emoji: '📟',
    iconName: 'Terminal',
    description: 'Инженерная и комьюнити-оптика. Главный навык — мониторинг публикаций на Habr и IT-статей из сети, разбор олдскульных тем и создание структурированных тематических Note по материалам.',
  },
};

export const CURATOR_PERSONAS_LIST = Object.values(CURATOR_PERSONAS);
export const ACTIVE_CURATOR_PERSONAS_LIST = CURATOR_PERSONAS_LIST.filter((p) => !p.isStandby);

export function getCuratorPersona(idOrName?: string | null): CuratorPersona | null {
  if (!idOrName) return null;
  const clean = idOrName.trim().toLowerCase();
  if (CURATOR_PERSONAS[clean]) return CURATOR_PERSONAS[clean];

  // Specific alias mappings
  if (clean === 'окация' || clean === 'акация' || clean === 'okatsiya' || clean === 'it' || clean === 'ai') {
    return CURATOR_PERSONAS['okatsiya'];
  }
  if (clean === 'герман' || clean === 'герман кернел' || clean === 'german' || clean === 'german-kernel' || clean === 'хабр' || clean === 'habr' || clean === 'хакер' || clean === 'xakep') {
    return CURATOR_PERSONAS['german-kernel'];
  }
  if (clean === 'иван' || clean === 'иван белый' || clean === 'ivan') {
    return CURATOR_PERSONAS['ivan-bely'];
  }
  if (clean === 'kirk' || clean === 'kirk kitten' || clean === 'кирк') {
    return CURATOR_PERSONAS['kirk-kitten'];
  }
  if (clean === 'чэнь' || clean === 'чэнь вэй' || clean === 'chen' || clean === 'chen-wei') {
    return CURATOR_PERSONAS['chen-wei'];
  }
  if (clean === 'алекс' || clean === 'алекс вектор' || clean === 'alex' || clean === 'alex-vector' || clean === 'breaking' || clean === 'breaking news' || clean === 'пульс') {
    return CURATOR_PERSONAS['alex-vector'];
  }
  if (clean === 'маркус' || clean === 'маркус вейн' || clean === 'marcus' || clean === 'marcus-vane' || clean === 'nexus' || clean === 'домино' || clean === 'ветвление') {
    return CURATOR_PERSONAS['marcus-vane'];
  }
  if (clean === 'тарик' || clean === 'тарик саид' || clean === 'tariq' || clean === 'tariq-said' || clean === 'мена' || clean === 'mena' || clean === 'восток') {
    return CURATOR_PERSONAS['tariq-said'];
  }
  if (clean === 'хелена' || clean === 'хелена брандт' || clean === 'helena' || clean === 'helena-brandt' || clean === 'логистика' || clean === 'сырье' || clean === 'нефть') {
    return CURATOR_PERSONAS['helena-brandt'];
  }

  const found = CURATOR_PERSONAS_LIST.find(
    (p) =>
      p.id.toLowerCase() === clean ||
      p.name.toLowerCase() === clean ||
      p.shortName.toLowerCase() === clean
  );
  return found || null;
}

// ---------------------------------------------------------------------------
// Curator Groups Registry (Группы и Коллегии Кураторов)
// ---------------------------------------------------------------------------

export interface CuratorGroup {
  id: string;
  name: string;
  shortName: string;
  emoji: string;
  description: string;
  curatorIds: string[];
  coordinatorId?: string;
  accentColor: string;
  badgeBg: string;
  defaultScope: string;
  isStandby?: boolean;
}

export const CURATOR_GROUPS: Record<string, CuratorGroup> = {
  'political-group': {
    id: 'political-group',
    name: 'Политическая коллегия',
    shortName: 'Политика',
    emoji: '🏛️',
    description: 'Объединенная группа кураторов внутренней политики РФ, международных рынков и восточного контура',
    curatorIds: ['ivan-bely', 'kirk-kitten', 'chen-wei'],
    coordinatorId: 'survey-coordinator',
    accentColor: '#38bdf8',
    badgeBg: 'rgba(56, 189, 248, 0.16)',
    defaultScope: 'Внутренний контур РФ, международная дипломатия, санкции, рынки АТР и сырьевой баланс',
  },
  'tech-group': {
    id: 'tech-group',
    name: 'IT & AI Совет',
    shortName: 'Технологии',
    emoji: '⚡',
    description: 'Технологический совет по искусственному интеллекту, BigTech, инфраструктуре, Habr-сообществу и журналу «Хакер»',
    curatorIds: ['okatsiya', 'german-kernel'],
    coordinatorId: 'survey-coordinator',
    accentColor: '#a855f7',
    badgeBg: 'rgba(168, 85, 247, 0.16)',
    defaultScope: 'AI/LLM, системная разработка, BigTech, мониторинг Habr, журнал «Хакер», олдскул-железо и безопасность',
  },
  'macro-group': {
    id: 'macro-group',
    name: 'Макроэкономический консилиум',
    shortName: 'Макро',
    emoji: '📊',
    description: 'Аналитический консилиум по сбалансированности внутреннего и внешнего экономических контуров',
    curatorIds: ['ivan-bely', 'kirk-kitten'],
    coordinatorId: 'survey-coordinator',
    accentColor: '#fbbf24',
    badgeBg: 'rgba(251, 191, 36, 0.16)',
    defaultScope: 'Демпфер, валютные курсы, санкционное воздействие, фрахт и инфляция',
  },
  'hot-pulse-group': {
    id: 'hot-pulse-group',
    name: 'Группа быстрого реагирования (Мировой пульс)',
    shortName: 'Горячий пульс',
    emoji: '🔥',
    description: 'Оперативный консилиум по экстренным мировым событиям, breaking news и виральным трендам',
    curatorIds: ['alex-vector', 'kirk-kitten'],
    coordinatorId: 'survey-coordinator',
    accentColor: '#f97316',
    badgeBg: 'rgba(249, 115, 22, 0.16)',
    defaultScope: 'Свежие мировые молнии и первичная проверка фактов',
  },
  'domino-nexus-group': {
    id: 'domino-nexus-group',
    name: 'Коллегия каскадных рисков и ветвления [Standby]',
    shortName: 'Эффект домино',
    emoji: '♟️',
    description: 'Группа каскадных рисков (в режиме Standby до активации автоматической аналитики)',
    curatorIds: ['tariq-said', 'helena-brandt', 'chen-wei'],
    coordinatorId: 'survey-coordinator',
    accentColor: '#10b981',
    badgeBg: 'rgba(168, 85, 247, 0.16)',
    defaultScope: 'Оценка точек бифуркации, ветвление региональных конфликтов, цепочки сырьевых и логистических шоков',
    isStandby: true,
  },
  'mena-security-group': {
    id: 'mena-security-group',
    name: 'Консилиум Ближнего Востока и Южного периметра',
    shortName: 'Ближний Восток',
    emoji: '🕌',
    description: 'Коллегия безопасности зоны Залива, Леванта, Суэцкого коридора и энергетического баланса',
    curatorIds: ['tariq-said', 'ivan-bely', 'kirk-kitten', 'helena-brandt'],
    coordinatorId: 'survey-coordinator',
    accentColor: '#eab308',
    badgeBg: 'rgba(234, 179, 8, 0.16)',
    defaultScope: 'Военно-политическая динамика MENA, Ормузский пролив, рынок нефти и позиция РФ/США',
  },
  'all-curators': {
    id: 'all-curators',
    name: 'Полная коллегия кураторов',
    shortName: 'Все кураторы',
    emoji: '🌐',
    description: 'Объединенный совет всех активных предметных кураторов Project Lenta',
    curatorIds: [
      'ivan-bely',
      'kirk-kitten',
      'chen-wei',
      'okatsiya',
      'german-kernel',
      'alex-vector',
      'tariq-said',
      'helena-brandt',
    ],
    coordinatorId: 'survey-coordinator',
    accentColor: '#3b82f6',
    badgeBg: 'rgba(59, 130, 246, 0.16)',
    defaultScope: 'Сквозная 360-панорама всех ключевых мировых, внутренних, энергетических, прикладных и технологических событий',
  },
};

export const CURATOR_GROUPS_LIST = Object.values(CURATOR_GROUPS);

export function getCuratorGroup(idOrName?: string | null): CuratorGroup | null {
  if (!idOrName) return null;
  const clean = idOrName.trim().toLowerCase();
  if (CURATOR_GROUPS[clean]) return CURATOR_GROUPS[clean];
  if (
    clean === 'политика' ||
    clean === 'политическая группа' ||
    clean === 'коллегия' ||
    clean === 'politics' ||
    clean === 'political-group'
  ) {
    return CURATOR_GROUPS['political-group'];
  }
  if (clean === 'it' || clean === 'ai' || clean === 'технологии' || clean === 'tech-group' || clean === 'tech') {
    return CURATOR_GROUPS['tech-group'];
  }
  if (clean === 'макро' || clean === 'macro' || clean === 'macro-group') {
    return CURATOR_GROUPS['macro-group'];
  }
  if (clean === 'пульс' || clean === 'hot' || clean === 'breaking' || clean === 'горячий пульс' || clean === 'быстрое реагирование' || clean === 'hot-pulse-group') {
    return CURATOR_GROUPS['hot-pulse-group'];
  }
  if (clean === 'домино' || clean === 'nexus' || clean === 'каскад' || clean === 'ветвление' || clean === 'эффект домино' || clean === 'domino-nexus-group') {
    return CURATOR_GROUPS['domino-nexus-group'];
  }
  if (clean === 'ближний восток' || clean === 'мена' || clean === 'mena' || clean === 'залив' || clean === 'восток' || clean === 'mena-security-group') {
    return CURATOR_GROUPS['mena-security-group'];
  }
  if (clean === 'все' || clean === 'all' || clean === 'все кураторы' || clean === 'all-curators') {
    return CURATOR_GROUPS['all-curators'];
  }
  return CURATOR_GROUPS_LIST.find((g) => g.id.toLowerCase() === clean || g.name.toLowerCase() === clean) || null;
}

// ---------------------------------------------------------------------------
// Operational Worker Agents Registry (Функциональные Агенты Lenta)
// ---------------------------------------------------------------------------

export interface WorkerAgentDefinition {
  id: string;
  name: string;
  shortName: string;
  role: string;
  avatar: string;
  category: 'ingestion' | 'survey' | 'sidework' | 'synthesis' | 'orchestration';
  accentColor: string;
  badgeBg: string;
  description: string;
  capabilities: string[];
  suggestedSnippets: string[];
}

export const WORKER_AGENTS: Record<string, WorkerAgentDefinition> = {
  'harvester-agent': {
    id: 'harvester-agent',
    name: 'Информационный Харвестер',
    shortName: 'Харвестер',
    role: 'Агент сбора данных, RSS и мониторинга первоисточников',
    avatar: '📡',
    category: 'ingestion',
    accentColor: '#10b981',
    badgeBg: 'rgba(16, 185, 129, 0.16)',
    description: 'Осуществляет непрерывный сбор сырых новостей, парсинг внешних источников, дедупликацию и первичный триаж материалов перед передачей кураторам.',
    capabilities: ['rss_ingestion', 'web_scraping', 'deduplication', 'source_validation'],
    suggestedSnippets: ['/harvest', '/sources'],
  },
  'survey-coordinator': {
    id: 'survey-coordinator',
    name: 'Координатор Опросов',
    shortName: 'Опросчик',
    role: 'Агент-опросчик и диспетчер групп кураторов',
    avatar: '🧭',
    category: 'survey',
    accentColor: '#6366f1',
    badgeBg: 'rgba(99, 102, 241, 0.16)',
    description: 'Опрашивает выбранную группу кураторов (или всех) за заданный интервал (сегодня, вчера, неделя) и сводит их доменные позиции.',
    capabilities: ['group_polling', 'temporal_slicing', 'cross_curator_comparison'],
    suggestedSnippets: ['/survey', '/survey-today', '/survey-yesterday', '/survey-week'],
  },
  'sidework-producer': {
    id: 'sidework-producer',
    name: 'Продюсер Сайд-Работы',
    shortName: 'Сайд-воркер',
    role: 'Агент контент-продакшна, медиа-обогащения и оформления',
    avatar: '🎨',
    category: 'sidework',
    accentColor: '#ec4899',
    badgeBg: 'rgba(236, 72, 153, 0.16)',
    description: 'Ведет прикладную сайд-работу: создает статьи, посты и дайджесты на основе курированных данных, генерирует промпты для AI-иллюстраций, схемы Mermaid и дополняет аналитическими комментариями.',
    capabilities: ['content_drafting', 'image_prompt_generation', 'mermaid_generation', 'commentary_enrichment', 'obsidian_export'],
    suggestedSnippets: ['/sidework', '/media', '/comment', '/draft'],
  },
  'podcast-producer': {
    id: 'podcast-producer',
    name: 'Режиссер Подкастов',
    shortName: 'Подкастер',
    role: 'Агент генерации аудио-сценариев NotebookLM',
    avatar: '🎙️',
    category: 'sidework',
    accentColor: '#f97316',
    badgeBg: 'rgba(249, 115, 22, 0.16)',
    description: 'Специализированная сайд-работа: превращает подборку курированных новостей в живой диалоговый аудио-сценарий двух ведущих.',
    capabilities: ['podcast_scripting', 'audio_overview', 'dialogue_balancing'],
    suggestedSnippets: ['/podcast'],
  },
  'notebook-producer': {
    id: 'notebook-producer',
    name: 'Режиссер NotebookLM',
    shortName: 'NotebookLM Агент',
    role: 'Агент создания дневников, подкастов и подготовки источников NotebookLM',
    avatar: '📓',
    category: 'sidework',
    accentColor: '#8b5cf6',
    badgeBg: 'rgba(139, 92, 246, 0.16)',
    description: 'Берет тематические Super Note, упаковывает источники в markdown-бандл, запускает создание NotebookLM-дневника в фоне и по коллбэку обновляет целевую заметку.',
    capabilities: ['source_bundling', 'notebooklm_dispatch', 'eta_estimation', 'async_note_callback', 'audio_overview_pipeline'],
    suggestedSnippets: ['/notebook', '/notebook-create', '/notebook-eta'],
  },
};

export const WORKER_AGENTS_LIST = Object.values(WORKER_AGENTS);

export function getWorkerAgent(idOrName?: string | null): WorkerAgentDefinition | null {
  if (!idOrName) return null;
  const clean = idOrName.trim().toLowerCase();
  if (WORKER_AGENTS[clean]) return WORKER_AGENTS[clean];
  if (clean === 'харвестер' || clean === 'сбор' || clean === 'harvester') return WORKER_AGENTS['harvester-agent'];
  if (clean === 'опрос' || clean === 'опросчик' || clean === 'survey' || clean === 'survey-coordinator') return WORKER_AGENTS['survey-coordinator'];
  if (clean === 'сайд' || clean === 'сайд-работа' || clean === 'sidework' || clean === 'контент') return WORKER_AGENTS['sidework-producer'];
  if (clean === 'подкаст' || clean === 'podcast') return WORKER_AGENTS['podcast-producer'];
  if (clean === 'notebook' || clean === 'notebooklm' || clean === 'дневник' || clean === 'блокнот' || clean === 'notebook-producer') return WORKER_AGENTS['notebook-producer'];
  return WORKER_AGENTS_LIST.find((a) => a.id.toLowerCase() === clean || a.name.toLowerCase() === clean) || null;
}


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



