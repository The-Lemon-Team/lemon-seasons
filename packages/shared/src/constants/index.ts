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
