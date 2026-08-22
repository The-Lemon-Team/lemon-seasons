import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, NoteType, getNoteTypeLabel, pluralizeRu, pluralizeEn } from '@lenta/shared';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import 'dayjs/locale/en';

export interface Translations {
  // Brand & Common
  brand: string;
  brandTagline: string;
  brandSubtitle: string;
  newEntry: string;
  today: string;
  tomorrow: string;
  yesterday: string;
  searchPlaceholder: string;
  filters: string;
  reset: string;
  selectAll: string;
  clear: string;
  onlyThis: string;
  close: string;
  save: string;
  cancel: string;
  loading: string;
  version: string;
  engine: string;
  adminCms: string;
  previousMonth: string;
  nextMonth: string;

  // Views
  timeline: string;
  calendar: string;
  gantt: string;
  feeds: string;
  feedsAndTags: string;

  // Stats
  entriesInRange: (count: number) => string;
  activeFeeds: (count: number) => string;

  // Timeline
  emptyTimeline: string;
  emptyTimelineSub: string;
  expand: string;
  collapse: string;
  editInAdmin: string;
  active: string;
  completed: string;
  ongoing: string;
  durationDays: (days: number) => string;

  // Month Grid
  monthGridSubtitle: string;
  eventsCount: (count: number) => string;
  moreCount: (count: number) => string;
  weekdays: string[];

  // Gantt
  swimlaneTitle: string;
  computingGantt: string;
  emptyGantt: string;
  emptyGanttSub: string;
  periodsCount: (count: number) => string;

  // Feeds Hub
  hubTitle: string;
  hubSubtitle: string;
  searchFeeds: string;
  activeInCalendar: string;
  allFeedsCat: string;
  mediaCat: string;
  engineeringCat: string;
  productCat: string;
  designCat: string;
  operationsCat: string;
  presetAll: string;
  presetAllDesc: string;
  presetEngOps: string;
  presetEngOpsDesc: string;
  presetProdDesign: string;
  presetProdDesignDesc: string;
  presetMediaCinema: string;
  presetMediaCinemaDesc: string;
  totalNotesCount: string;
  latestUpdate: string;
  openInTimeline: string;
  openInCalendar: string;
  inCalendar: string;
  hidden: string;
  subscribe: string;
  unsubscribe: string;

  // Filter Sidebar
  filtersAndChannels: string;
  taxonomyHierarchy: string;
  newsFeeds: string;
  entryTypes: string;
  hashtags: string;
  searchTags: string;
  searchFeedsFilter: string;
  searchHashtags: string;
  noHashtags: string;

  // Day Sidebar
  dayOverview: string;
  totalEntries: string;
  filterByType: string;
  allTypes: string;
  noNotesForDay: string;
  addEntry: string;
  inDays: (count: number) => string;
  daysAgo: (count: number) => string;

  // Note Detail Modal
  noteDetails: string;
  created: string;
  updated: string;
  timePeriod: string;
  date: string;
  taxonomyPath: string;
  obsidianFolder: string;
  links: string;
  attachments: string;
  editNote: string;
  pressEsc: string;

  // Selectors
  selectFeed: string;
  allFeedsLabel: string;
  filterByFeed: string;
  filterByTypeTitle: string;
  filterByTaxonomy: string;
  searchTaxonomy: string;
  quickFilters: string;
  allChannels: string;
  allFolders: string;
}

export const ruTranslations: Translations = {
  // Brand & Common
  brand: 'Lemon Seasons',
  brandTagline: 'Инструментальный комфорт',
  brandSubtitle: 'Хронологический хаб',
  newEntry: 'Новая запись',
  today: 'Сегодня',
  tomorrow: 'Завтра',
  yesterday: 'Вчера',
  searchPlaceholder: 'Поиск заметок, тегов, лент...',
  filters: 'Фильтры',
  reset: 'Сбросить',
  selectAll: 'Выбрать все',
  clear: 'Очистить',
  onlyThis: 'Только это',
  close: 'Закрыть',
  save: 'Сохранить',
  cancel: 'Отмена',
  loading: 'Загрузка...',
  version: 'Версия',
  engine: 'Движок',
  adminCms: 'Панель управления',
  previousMonth: 'Предыдущий месяц',
  nextMonth: 'Следующий месяц',

  // Views
  timeline: 'Лента',
  calendar: 'Календарь',
  gantt: 'Гант',
  feeds: 'Ленты',
  feedsAndTags: 'Ленты и теги',

  // Stats
  entriesInRange: (count: number) => `${pluralizeRu(count, 'запись', 'записи', 'записей')} в диапазоне`,
  activeFeeds: (count: number) => `${pluralizeRu(count, 'активная лента', 'активные ленты', 'активных лент')}`,

  // Timeline
  emptyTimeline: 'В этом диапазоне заметок не найдено',
  emptyTimelineSub: 'Попробуйте изменить выбранный месяц, сбросить фильтры или добавить новую запись.',
  expand: 'Развернуть',
  collapse: 'Свернуть',
  editInAdmin: 'Открыть в админке',
  active: 'Активно',
  completed: 'Завершено',
  ongoing: 'Продолжается',
  durationDays: (days: number) => pluralizeRu(days, 'день', 'дня', 'дней'),

  // Month Grid
  monthGridSubtitle: 'Сетка месяца • Кликните на день для перехода в ленту',
  eventsCount: (count: number) => pluralizeRu(count, 'событие', 'события', 'событий'),
  moreCount: (count: number) => `+ ещё ${count}`,
  weekdays: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],

  // Gantt
  swimlaneTitle: 'Канал / Лента',
  computingGantt: 'Построение дорожек Ганта...',
  emptyGantt: 'Нет многодневных периодов в этом диапазоне',
  emptyGanttSub: 'Выберите более широкий диапазон дат или перейдите в режим Ленты.',
  periodsCount: (count: number) => pluralizeRu(count, 'период', 'периода', 'периодов'),

  // Feeds Hub
  hubTitle: 'Хаб новостных лент и каналов',
  hubSubtitle: 'Тематические ленты, хронологии релизов и управление подписками',
  searchFeeds: 'Поиск по лентам...',
  activeInCalendar: 'Активны в календаре',
  allFeedsCat: 'Все ленты',
  mediaCat: 'Развлечения и релизы',
  engineeringCat: 'Инженерия и стек',
  productCat: 'Продукт и цели',
  designCat: 'Дизайн и токены',
  operationsCat: 'DevOps и облако',
  presetAll: 'Все каналы',
  presetAllDesc: 'Все новостные каналы и хронологии вместе',
  presetEngOps: 'Инженерный стек',
  presetEngOpsDesc: 'Архитектура систем + DevOps инфраструктура',
  presetProdDesign: 'Продукт и дизайн',
  presetProdDesignDesc: 'Вехи продукта + Компоненты дизайн-системы',
  presetMediaCinema: 'Кино и релизы',
  presetMediaCinemaDesc: 'Хронология фильмов киновселенной Marvel',
  totalNotesCount: 'Всего заметок',
  latestUpdate: 'Последнее обновление',
  openInTimeline: 'Открыть в ленте',
  openInCalendar: 'Открыть в календаре',
  inCalendar: 'В календаре',
  hidden: 'Скрыто',
  subscribe: 'Включить',
  unsubscribe: 'Отключить',

  // Filter Sidebar
  filtersAndChannels: 'Фильтры и каналы',
  taxonomyHierarchy: 'Иерархия таксономии',
  newsFeeds: 'Новостные ленты',
  entryTypes: 'Типы записей',
  hashtags: 'Хэштеги',
  searchTags: 'Поиск тегов...',
  searchFeedsFilter: 'Поиск лент...',
  searchHashtags: 'Поиск хэштегов...',
  noHashtags: 'Хэштеги не найдены',

  // Day Sidebar
  dayOverview: 'Обзор дня',
  totalEntries: 'Всего записей',
  filterByType: 'Фильтр по типу',
  allTypes: 'Все типы',
  noNotesForDay: 'На этот день нет записей',
  addEntry: 'Добавить запись',
  inDays: (count: number) => `Через ${pluralizeRu(count, 'день', 'дня', 'дней')}`,
  daysAgo: (count: number) => `${pluralizeRu(count, 'день', 'дня', 'дней')} назад`,

  // Note Detail Modal
  noteDetails: 'Детали записи',
  created: 'Создано',
  updated: 'Обновлено',
  timePeriod: 'Период времени',
  date: 'Дата',
  taxonomyPath: 'Таксономия',
  obsidianFolder: 'Папка Obsidian',
  links: 'Ссылки и источники',
  attachments: 'Вложения',
  editNote: 'Редактировать запись',
  pressEsc: 'Нажмите Esc для закрытия',

  // Selectors
  selectFeed: 'Выберите ленту',
  allFeedsLabel: 'Все ленты',
  filterByFeed: 'Фильтр по ленте',
  filterByTypeTitle: 'Фильтр по типу',
  filterByTaxonomy: 'Фильтр по таксономии',
  searchTaxonomy: 'Поиск по таксономии...',
  quickFilters: 'Быстрые фильтры',
  allChannels: 'Все каналы',
  allFolders: 'Все папки (показать всё)',
};

export const enTranslations: Translations = {
  // Brand & Common
  brand: 'Lemon Seasons',
  brandTagline: 'Instrumental Luxury',
  brandSubtitle: 'Chronological Hub',
  newEntry: 'New Entry',
  today: 'Today',
  tomorrow: 'Tomorrow',
  yesterday: 'Yesterday',
  searchPlaceholder: 'Search notes, tags, feeds...',
  filters: 'Filters',
  reset: 'Reset',
  selectAll: 'Select All',
  clear: 'Clear',
  onlyThis: 'Only this',
  close: 'Close',
  save: 'Save',
  cancel: 'Cancel',
  loading: 'Loading...',
  version: 'Version',
  engine: 'Engine',
  adminCms: 'Admin CMS',
  previousMonth: 'Previous Month',
  nextMonth: 'Next Month',

  // Views
  timeline: 'Timeline',
  calendar: 'Calendar',
  gantt: 'Gantt',
  feeds: 'Feeds',
  feedsAndTags: 'Feeds & Tags',

  // Stats
  entriesInRange: (count: number) => `${count} ${count === 1 ? 'entry' : 'entries'} in range`,
  activeFeeds: (count: number) => `${count} active ${count === 1 ? 'feed' : 'feeds'}`,

  // Timeline
  emptyTimeline: 'No notes found for this date range',
  emptyTimelineSub: 'Try changing the selected month, resetting filters, or adding a new note.',
  expand: 'Expand',
  collapse: 'Collapse',
  editInAdmin: 'Edit in Admin',
  active: 'Active',
  completed: 'Completed',
  ongoing: 'Ongoing',
  durationDays: (days: number) => pluralizeEn(days, 'day', 'days'),

  // Month Grid
  monthGridSubtitle: 'Month Grid • Click a day to view agenda & navigate timeline',
  eventsCount: (count: number) => `${count} ${count === 1 ? 'event' : 'events'}`,
  moreCount: (count: number) => `+${count} more`,
  weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],

  // Gantt
  swimlaneTitle: 'Channel / Feed',
  computingGantt: 'Computing Gantt swimlanes...',
  emptyGantt: 'No multi-day spans in this range',
  emptyGanttSub: 'Expand the date range or switch to Timeline view.',
  periodsCount: (count: number) => `${count} ${count === 1 ? 'span' : 'spans'}`,

  // Feeds Hub
  hubTitle: 'News Feeds & Editorial Streams',
  hubSubtitle: 'Curated topic feeds, release calendars, and channel subscriptions',
  searchFeeds: 'Search feeds...',
  activeInCalendar: 'Active in Calendar',
  allFeedsCat: 'All Feeds',
  mediaCat: 'Entertainment & Releases',
  engineeringCat: 'Engineering & Tech',
  productCat: 'Product & Roadmap',
  designCat: 'Design & Tokens',
  operationsCat: 'DevOps & Cloud',
  presetAll: 'All Channels',
  presetAllDesc: 'All news desks & streams combined',
  presetEngOps: 'Engineering Stack',
  presetEngOpsDesc: 'Architecture + DevOps infra',
  presetProdDesign: 'Product & Design',
  presetProdDesignDesc: 'Milestones + Design system tokens',
  presetMediaCinema: 'Cinema & Releases',
  presetMediaCinemaDesc: 'Marvel Cinematic Universe timeline',
  totalNotesCount: 'Total Notes',
  latestUpdate: 'Latest Update',
  openInTimeline: 'Launch in Timeline',
  openInCalendar: 'Open in Calendar',
  inCalendar: 'Tuned In',
  hidden: 'Hidden',
  subscribe: 'Include',
  unsubscribe: 'Exclude',

  // Filter Sidebar
  filtersAndChannels: 'Filters & Channels',
  taxonomyHierarchy: 'Taxonomy Hierarchy',
  newsFeeds: 'News Feeds',
  entryTypes: 'Entry Types',
  hashtags: 'Hashtags',
  searchTags: 'Search tags...',
  searchFeedsFilter: 'Search feeds...',
  searchHashtags: 'Search hashtags...',
  noHashtags: 'No hashtags found',

  // Day Sidebar
  dayOverview: 'Day Overview',
  totalEntries: 'Total entries',
  filterByType: 'Filter by type',
  allTypes: 'All Types',
  noNotesForDay: 'No notes recorded for this day',
  addEntry: 'Add Entry',
  inDays: (count: number) => `In ${count} ${count === 1 ? 'day' : 'days'}`,
  daysAgo: (count: number) => `${count} ${count === 1 ? 'day' : 'days'} ago`,

  // Note Detail Modal
  noteDetails: 'Note Details',
  created: 'Created',
  updated: 'Updated',
  timePeriod: 'Time Period',
  date: 'Date',
  taxonomyPath: 'Taxonomy Path',
  obsidianFolder: 'Obsidian Folder',
  links: 'Links & Sources',
  attachments: 'Attachments',
  editNote: 'Edit Note',
  pressEsc: 'Press Esc to close',

  // Selectors
  selectFeed: 'Select Feed',
  allFeedsLabel: 'All Feeds',
  filterByFeed: 'Filter by feed',
  filterByTypeTitle: 'Filter by type',
  filterByTaxonomy: 'Filter by taxonomy',
  searchTaxonomy: 'Search taxonomy...',
  quickFilters: 'Quick filters',
  allChannels: 'All Channels',
  allFolders: 'All Folders (Show Everything)',
};

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: Translations;
  getTypeLabel: (type: NoteType) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('lenta_calendar_lang');
    return saved === 'en' ? 'en' : 'ru'; // Default to Russian
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('lenta_calendar_lang', newLang);
    dayjs.locale(newLang);
  };

  useEffect(() => {
    dayjs.locale(lang);
  }, [lang]);

  const t = lang === 'ru' ? ruTranslations : enTranslations;

  const getTypeLabel = (type: NoteType): string => {
    return getNoteTypeLabel(type, lang);
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t, getTypeLabel }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
