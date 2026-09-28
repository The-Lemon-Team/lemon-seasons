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
};

export const CURATOR_PERSONAS_LIST = Object.values(CURATOR_PERSONAS);

export function getCuratorPersona(idOrName?: string | null): CuratorPersona | null {
  if (!idOrName) return null;
  const clean = idOrName.trim().toLowerCase();
  if (CURATOR_PERSONAS[clean]) return CURATOR_PERSONAS[clean];
  const found = CURATOR_PERSONAS_LIST.find(
    (p) =>
      p.id.toLowerCase() === clean ||
      p.name.toLowerCase() === clean ||
      p.shortName.toLowerCase() === clean
  );
  return found || null;
}


