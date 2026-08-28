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
  folders: string;
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
  allObsidianVaults: string;
  obsidianVaults: string;
  selectObsidianContainers: string;
  searchObsidianContainers: string;
  noObsidianContainers: string;
  foldersCount: (selected: number, total: number) => string;
  noBoundFolders: string;
  selectAllFoldersInVault: string;

  // Privacy & Auth
  guestRole: string;
  memberRole: string;
  adminRole: string;
  login: string;
  register: string;
  logout: string;
  signInAction: string;
  createAccountAction: string;
  signInWithDemoRole: string;
  emailLabel: string;
  passwordLabel: string;
  nameLabel: string;
  loginModalTitle: string;
  registerModalTitle: string;
  alreadyHaveAccount: string;
  dontHaveAccount: string;
  demoGuestDesc: string;
  demoMemberDesc: string;
  demoAdminDesc: string;
  switchRoleTooltip: string;

  // Landing Page
  landingHeroTitle: string;
  landingHeroSubtitle: string;
  landingHeroBadge: string;
  landingExploreWidget: string;
  landingPresetsTitle: string;
  landingPresetsSubtitle: string;
  landingPresetChooseOne: string;
  landingFeaturesTitle: string;
  landingFeaturesSubtitle: string;
  landingFeaturePrivacyTitle: string;
  landingFeaturePrivacyDesc: string;
  landingFeatureObsidianTitle: string;
  landingFeatureObsidianDesc: string;
  landingFeatureTimelineTitle: string;
  landingFeatureTimelineDesc: string;
  openApp: string;
  guestNotice: string;
  widgetViewType: string;

  // Member & Private Containers
  privateContainers: string;
  privateContainersSubtitle: string;
  privateVaultNotice: string;

  tokenCopied: string;
  copyToken: string;
  generateNewToken: string;
  connectObsidianDesc: string;
  createNoteTitle: string;
  noteTitlePlaceholder: string;
  noteContentPlaceholder: string;
  noteDate: string;
  noteType: string;
  noteFeed: string;
  noteFolder: string;
  noteFolderPlaceholder: string;
  noteFolderRoot: string;
  noteFolderCustom: string;
  noteFolderBackToList: string;
  createNoteSuccess: string;

  // Key Management & API Tokens
  keyManagementTitle: string;
  keyManagementSubtitle: string;
  keyProvider: string;
  keyNameLabel: string;
  keyNamePlaceholder: string;
  generateKeyBtn: string;
  activeKeysTitle: string;
  noKeysFound: string;
  revokeKeyConfirm: string;
  keyRevokedSuccess: string;
  keyGeneratedNotice: string;
  copiedToClipboard: string;


  // Obsidian Page & Connections
  obsidianHub: string;
  obsidianConnection: string;
  obsidianConnectionSubtitle: string;
  obsidianConnectionBadge: string;
  addContainer: string;
  newContainerTitle: string;
  containerName: string;
  vaultPath: string;
  privacySetting: string;
  privacyPrivate: string;
  privacyPublic: string;
  privacyPrivateDesc: string;
  privacyPublicDesc: string;
  boundFoldersTitle: string;
  boundFoldersDesc: string;
  addFolderBinding: string;
  folderPathPlaceholder: string;
  observeMode: string;
  observeModeRecursive: string;
  observeModeAll: string;
  observeModeFiltered: string;
  syncStatus: string;
  lastSync: string;
  syncedNotesCount: string;
  observedFoldersCount: string;
  syncNow: string;
  syncing: string;
  regenerateTokenConfirm: string;
  deleteContainer: string;
  deleteContainerConfirm: string;
  filterAll: string;
  filterPrivate: string;
  filterPublic: string;
  searchContainers: string;
  noContainersFound: string;
  connectedVaults: string;
  pluginInstructionsTitle: string;
  pluginInstructionsDesc: string;
  obsidianHeroCta: string;
  activeObsidianContainers: (count: number) => string;

  // Folder Manager & Privacy
  folderManager: string;
  folderManagerSubtitle: string;
  createFolder: string;
  newFolder: string;
  folderPath: string;
  folderName: string;
  folderPrivacy: string;
  folderPrivacyPrivate: string;
  folderPrivacyPublic: string;
  folderPrivacyPrivateDesc: string;
  folderPrivacyPublicDesc: string;
  observedInContainers: string;
  noNotesInFolder: string;
  folderNotesCount: (count: number) => string;
  folderTreeTitle: string;
  folderDetailsTitle: string;
  changePrivacy: string;
  privacyChangeWarningTitle: string;
  privacyChangeWarningDesc: string;
  publicContainerConflictWarning: string;
  privateContainerNotice: string;
  affectedContainers: string;
  affectedNotes: string;
  confirmPrivacyChange: string;
  cannotAddPrivateFolderToPublicContainer: string;
  searchFolders: string;
  searchNotesInFolder: string;
  rootFolders: string;
  subfolders: string;
  parentFolder: string;
  deleteFolderTitle: string;
  deleteFolderConfirm: string;
  selectFolder: string;
  activeFoldersCount: (count: number) => string;
  allFolderTypes: string;
  privacyRuleHeading: string;
  containerPrivacyConstraintNote: string;
  openFolderInManager: string;
}



export const ruTranslations: Translations = {
  // Brand & Common
  brand: 'Lemon Seasons',
  brandTagline: '',
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
  timeline: 'Главная',
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
  allObsidianVaults: 'Все Vaults',
  obsidianVaults: 'Контейнеры Obsidian',
  selectObsidianContainers: 'Выберите контейнеры Obsidian',
  searchObsidianContainers: 'Поиск контейнеров...',
  noObsidianContainers: 'Нет подключенных контейнеров Obsidian',
  foldersCount: (selected: number, total: number) => `${selected}/${total} папок`,
  noBoundFolders: 'Нет привязанных папок',
  selectAllFoldersInVault: 'Выбрать все папки',

  // Privacy & Auth
  guestRole: 'Гость',
  memberRole: 'Участник',
  adminRole: 'Администратор',
  login: 'Войти',
  register: 'Регистрация',
  logout: 'Выйти',
  signInAction: 'Войти в аккаунт',
  createAccountAction: 'Зарегистрироваться',
  signInWithDemoRole: 'Быстрый вход для тестирования',
  emailLabel: 'Электронная почта',
  passwordLabel: 'Пароль',
  nameLabel: 'Ваше имя',
  loginModalTitle: 'Вход в Lemon Calendarium',
  registerModalTitle: 'Создание аккаунта',
  alreadyHaveAccount: 'Уже есть аккаунт? Войти',
  dontHaveAccount: 'Нет аккаунта? Зарегистрироваться',
  demoGuestDesc: 'Публичный просмотр витрины, виджет и предустановленные фильтры',
  demoMemberDesc: 'Доступ к внутренней рабочей ленте, создание заметок и приватных контейнеров',
  demoAdminDesc: 'Полный доступ + переход в панель управления Admin CMS',
  switchRoleTooltip: 'Сменить тестовую роль пользователя',

  // Landing Page
  landingHeroTitle: 'Хронологический хаб и живой календарь',
  landingHeroSubtitle: 'Единый центр временных данных, заметок и событий с бесшовной синхронизацией в Obsidian и гибким разделением прав.',
  landingHeroBadge: 'Публичная витрина • Выберите пресет ленты',
  landingExploreWidget: 'Интерактивный виджет календаря',
  landingPresetsTitle: 'Готовые тематические ленты',
  landingPresetsSubtitle: 'Выберите одну ленту для мгновенного отображения событий в виджете',
  landingPresetChooseOne: 'Выберите пресет для просмотра',
  landingFeaturesTitle: 'Возможности платформы Lemon Calendarium',
  landingFeaturesSubtitle: 'Современный инструмент для ведения хронологий, личных заметок и командных проектов',
  landingFeaturePrivacyTitle: '3 уровня приватности и доступа',
  landingFeaturePrivacyDesc: 'Публичная витрина с виджетом для гостей, рабочее пространство для участников и CMS-панель для администраторов.',
  landingFeatureObsidianTitle: 'Двусторонняя синхронизация с Obsidian',
  landingFeatureObsidianDesc: 'Приватные контейнеры и хранилища Markdown с сохранением структуры папок, тегов и связей.',
  landingFeatureTimelineTitle: 'Гибкие хронологические проекции',
  landingFeatureTimelineDesc: 'Переключайтесь между интерактивной Лентой, календарной сеткой Месяца и диаграммой Ганта в один клик.',
  openApp: 'Открыть рабочее пространство',
  guestNotice: 'Вы находитесь в гостевом режиме. Войдите, чтобы создавать свои заметки и подключать приватные контейнеры Obsidian.',
  widgetViewType: 'Тип календаря',

  // Member & Private Containers
  privateContainers: 'Приватные контейнеры Obsidian',
  privateContainersSubtitle: 'Управление защищенными хранилищами заметок и API-токенами синхронизации',
  privateVaultNotice: 'Приватный режим активен. Ваши заметки в этих контейнерах изолированы и доступны только вам.',

  tokenCopied: 'Токен скопирован в буфер обмена!',
  copyToken: 'Скопировать токен',
  generateNewToken: 'Сгенерировать новый ключ',
  connectObsidianDesc: 'Вставьте этот токен в настройки плагина Obsidian Lemon Lenta для подключения приватного контейнера.',
  createNoteTitle: 'Создание новой записи',
  noteTitlePlaceholder: 'Название заметки или события...',
  noteContentPlaceholder: 'Текст заметки в формате Markdown (#хэштеги поддерживаются)...',
  noteDate: 'Дата начала',
  noteType: 'Тип записи',
  noteFeed: 'Канал / Лента',
  noteFolder: 'Папка (опционально)',
  noteFolderPlaceholder: 'Укажите путь (например: 01_Daily_Logs или Work/Projects)...',
  noteFolderRoot: 'Без папки / Корень хранилища',
  noteFolderCustom: '+ Указать свой путь...',
  noteFolderBackToList: '← Список папок',
  createNoteSuccess: 'Заметка успешно сохранена!',

  // Key Management & API Tokens
  keyManagementTitle: 'Ключи доступа и интеграции',
  keyManagementSubtitle: 'Генерация и управление персональными ключами для работы с приложением и сторонними сервисами',
  keyProvider: 'Провайдер ключа',
  keyNameLabel: 'Название / Назначение ключа',
  keyNamePlaceholder: 'Например: Мой Obsidian Vault на ноутбуке',
  generateKeyBtn: 'Сгенерировать новый ключ',
  activeKeysTitle: 'Активные ключи доступа',
  noKeysFound: 'У вас пока нет сгенерированных ключей доступа',
  revokeKeyConfirm: 'Вы уверены, что хотите отозвать этот ключ? Все привязанные сервисы потеряют доступ.',
  keyRevokedSuccess: 'Ключ успешно отозван',
  keyGeneratedNotice: 'Скопируйте этот ключ прямо сейчас. В целях безопасности он больше не будет показан полностью.',
  copiedToClipboard: 'Скопировано в буфер обмена!',


  // Obsidian Page & Connections
  obsidianHub: 'Контейнеры Obsidian',
  obsidianConnection: 'Obsidian Connection!',
  obsidianConnectionSubtitle: 'Подключение локальных хранилищ Markdown с приватными контейнерами и гибким отслеживанием папок',
  obsidianConnectionBadge: 'Синхронизация хранилищ и папок',
  addContainer: 'Добавить контейнер',
  newContainerTitle: 'Новый контейнер Obsidian',
  containerName: 'Имя контейнера',
  vaultPath: 'Путь к хранилищу (Vault Path)',
  privacySetting: 'Приватность контейнера',
  privacyPrivate: 'Приватный (Private)',
  privacyPublic: 'Публичный (Public)',
  privacyPrivateDesc: 'Только вы имеете доступ через защищенный персональный API-токен',
  privacyPublicDesc: 'Заметки открыты в общих лентах и отображаются в календаре',
  boundFoldersTitle: 'Отслеживаемые папки хранилища',
  boundFoldersDesc: 'Укажите папки Obsidian, изменения в которых будут синхронизироваться с календарем',
  addFolderBinding: 'Привязать папку',
  folderPathPlaceholder: 'например: 01_Daily_Logs или Work/Projects',
  observeMode: 'Режим наблюдения',
  observeModeRecursive: 'Рекурсивно (все подпапки)',
  observeModeAll: 'Только прямые файлы',
  observeModeFiltered: 'С фильтрацией по тегу',
  syncStatus: 'Статус синхронизации',
  lastSync: 'Последняя синхронизация',
  syncedNotesCount: 'Синхронизировано заметок',
  observedFoldersCount: 'Отслеживаемых папок',
  syncNow: 'Синхронизировать',
  syncing: 'Синхронизация...',
  regenerateTokenConfirm: 'Сгенерировать новый ключ? Старый ключ перестанет работать.',
  deleteContainer: 'Удалить контейнер',
  deleteContainerConfirm: 'Вы уверены, что хотите удалить этот контейнер Obsidian?',
  filterAll: 'Все',
  filterPrivate: 'Приватные',
  filterPublic: 'Публичные',
  searchContainers: 'Поиск контейнеров или папок...',
  noContainersFound: 'Контейнеры не найдены',
  connectedVaults: 'Подключенные хранилища',
  pluginInstructionsTitle: 'Подключение плагина Lemon Lenta',
  pluginInstructionsDesc: 'Пошаговая инструкция по подключению хранилища Obsidian',
  obsidianHeroCta: 'Подключить хранилище',
  activeObsidianContainers: (count: number) => `${pluralizeRu(count, 'контейнер Obsidian', 'контейнера Obsidian', 'контейнеров Obsidian')}`,

  // Folder Manager & Privacy
  folders: 'Папки',
  folderManager: 'Менеджер папок',
  folderManagerSubtitle: 'Обозреватель структуры папок, правил приватности и заметок',
  createFolder: 'Создать папку',
  newFolder: 'Новая папка',
  folderPath: 'Путь к папке',
  folderName: 'Имя папки',
  folderPrivacy: 'Приватность папки',
  folderPrivacyPrivate: 'Приватная папка',
  folderPrivacyPublic: 'Публичная папка',
  folderPrivacyPrivateDesc: 'Может использоваться только в приватных контейнерах Obsidian и закрытых рабочих пространствах',
  folderPrivacyPublicDesc: 'Может использоваться как в публичных, так и в приватных контейнерах Obsidian',
  observedInContainers: 'В контейнерах Obsidian',
  noNotesInFolder: 'В этой папке пока нет заметок',
  folderNotesCount: (count: number) => `${count} ${pluralizeRu(count, 'заметка', 'заметки', 'заметок')}`,
  folderTreeTitle: 'Дерево папок',
  folderDetailsTitle: 'Свойства и заметки папки',
  changePrivacy: 'Сменить приватность',
  privacyChangeWarningTitle: 'Предупреждение об изменении приватности',
  privacyChangeWarningDesc: 'Изменение уровня приватности повлияет на привязанные контейнеры Obsidian и видимость записей',
  publicContainerConflictWarning: 'Внимание: Данная папка привязана к публичным контейнерам Obsidian. Публичные контейнеры могут содержать ТОЛЬКО публичные папки. Перевод в приватный статус приведет к конфликту с публичными контейнерами.',
  privateContainerNotice: 'Приватные контейнеры Obsidian поддерживают как приватные, так и публичные папки.',
  affectedContainers: 'Затронутые контейнеры Obsidian',
  affectedNotes: 'Затронутых заметок',
  confirmPrivacyChange: 'Подтвердить изменение приватности',
  cannotAddPrivateFolderToPublicContainer: 'Нельзя привязать приватную папку к публичному контейнеру. Публичные контейнеры принимают только публичные папки.',
  searchFolders: 'Поиск папок...',
  searchNotesInFolder: 'Поиск заметок в выбранной папке...',
  rootFolders: 'Корневые папки',
  subfolders: 'Подпапки',
  parentFolder: 'Родительская папка',
  deleteFolderTitle: 'Удалить папку',
  deleteFolderConfirm: 'Вы уверены, что хотите удалить эту папку и все её подпапки?',
  selectFolder: 'Выберите папку слева для просмотра содержимого',
  activeFoldersCount: (count: number) => `${count} ${pluralizeRu(count, 'папка', 'папки', 'папок')}`,
  allFolderTypes: 'Все типы папок',
  privacyRuleHeading: 'Правило приватности контейнеров',
  containerPrivacyConstraintNote: 'Публичные контейнеры могут содержать только публичные папки. Приватные контейнеры могут содержать любые папки (приватные и публичные).',
  openFolderInManager: 'Открыть в Менеджере папок',
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
  timeline: 'Home',
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
  allObsidianVaults: 'All Vaults',
  obsidianVaults: 'Obsidian Vaults',
  selectObsidianContainers: 'Select Obsidian Containers',
  searchObsidianContainers: 'Search containers...',
  noObsidianContainers: 'No connected Obsidian containers',
  foldersCount: (selected: number, total: number) => `${selected}/${total} folders`,
  noBoundFolders: 'No bound folders',
  selectAllFoldersInVault: 'Select all folders',

  // Privacy & Auth
  guestRole: 'Guest',
  memberRole: 'Member',
  adminRole: 'Administrator',
  login: 'Sign In',
  register: 'Register',
  logout: 'Sign Out',
  signInAction: 'Sign In to Account',
  createAccountAction: 'Create Account',
  signInWithDemoRole: 'Quick Demo Sign In',
  emailLabel: 'Email Address',
  passwordLabel: 'Password',
  nameLabel: 'Your Full Name',
  loginModalTitle: 'Sign In to Lemon Calendarium',
  registerModalTitle: 'Create New Account',
  alreadyHaveAccount: 'Already have an account? Sign In',
  dontHaveAccount: "Don't have an account? Register",
  demoGuestDesc: 'Public showcase, live widget, and curated single-choice preset feeds',
  demoMemberDesc: 'Access to internal workspace, create notes & private Obsidian containers',
  demoAdminDesc: 'Full access + direct launcher to Admin CMS dashboard',
  switchRoleTooltip: 'Switch test user role',

  // Landing Page
  landingHeroTitle: 'Chronological Data Hub & Living Calendar',
  landingHeroSubtitle: 'A unified single source of truth for time-anchored events, milestones, and personal notes with seamless Obsidian sync and privacy tiers.',
  landingHeroBadge: 'Public Showcase • Select a Curated Feed',
  landingExploreWidget: 'Interactive Calendar & Timeline Widget',
  landingPresetsTitle: 'Curated Public Feed Presets',
  landingPresetsSubtitle: 'Select one feed preset at a time to immediately preview its live event stream in the widget',
  landingPresetChooseOne: 'Choose a preset to preview',
  landingFeaturesTitle: 'Lemon Calendarium Platform Capabilities',
  landingFeaturesSubtitle: 'High-performance chronological engine for personal life logging, media releases, and enterprise roadmaps',
  landingFeaturePrivacyTitle: '3 Privacy & Access Tiers',
  landingFeaturePrivacyDesc: 'Public showcase with widget for guests, internal workspace for members, and CMS for administrators.',
  landingFeatureObsidianTitle: '2-Way Obsidian Synchronization',
  landingFeatureObsidianDesc: 'Private Markdown containers with frontmatter schema, folder tree mirroring, and conflict handling.',
  landingFeatureTimelineTitle: 'Multiple Chronological Projections',
  landingFeatureTimelineDesc: 'Switch seamlessly between high-density Timeline, Month grid, and Gantt swimlanes.',
  openApp: 'Open Workspace',
  guestNotice: 'You are browsing in guest mode. Sign in to write personal notes and link private Obsidian vaults.',
  widgetViewType: 'Calendar View Type',

  // Member & Private Containers
  privateContainers: 'Private Obsidian Containers',
  privateContainersSubtitle: 'Manage secure Markdown vaults and personal API synchronization tokens',
  privateVaultNotice: 'Private container mode active. Notes in this vault are strictly isolated to your authenticated account.',

  tokenCopied: 'API Token copied to clipboard!',
  copyToken: 'Copy API Token',
  generateNewToken: 'Generate New Key',
  connectObsidianDesc: 'Paste this token into the Obsidian Lemon Lenta plugin settings to connect your private container.',
  createNoteTitle: 'Create New Chronological Entry',
  noteTitlePlaceholder: 'Note title or event name...',
  noteContentPlaceholder: 'Markdown description (#hashtags are auto-extracted)...',
  noteDate: 'Start Date',
  noteType: 'Entry Type',
  noteFeed: 'Channel / Feed',
  noteFolder: 'Target Folder (optional)',
  noteFolderPlaceholder: 'Type path (e.g. 01_Daily_Logs or Work/Projects)...',
  noteFolderRoot: 'No folder / Vault Root',
  noteFolderCustom: '+ Enter custom path...',
  noteFolderBackToList: '← Folder list',
  createNoteSuccess: 'Note created successfully!',

  // Key Management & API Tokens
  keyManagementTitle: 'API & Integration Keys',
  keyManagementSubtitle: 'Generate and manage personal keys to connect with Lemon Calendarium apps and integrations',
  keyProvider: 'Key Provider',
  keyNameLabel: 'Key Name / Description',
  keyNamePlaceholder: 'e.g. My Obsidian Vault Laptop',
  generateKeyBtn: 'Generate New Key',
  activeKeysTitle: 'Active Access Keys',
  noKeysFound: 'No active access keys generated yet',
  revokeKeyConfirm: 'Are you sure you want to revoke this key? Linked integrations will immediately lose access.',
  keyRevokedSuccess: 'Key revoked successfully',
  keyGeneratedNotice: 'Copy this key now. For security reasons, it will not be displayed in full again.',
  copiedToClipboard: 'Copied to clipboard!',


  // Obsidian Page & Connections
  obsidianHub: 'Obsidian Containers',
  obsidianConnection: 'Obsidian Connection!',
  obsidianConnectionSubtitle: 'Connect local Markdown vaults with private containers and custom folder observation bindings',
  obsidianConnectionBadge: 'Vault & Folder Observation Sync',
  addContainer: 'Add Container',
  newContainerTitle: 'New Obsidian Container',
  containerName: 'Container Name',
  vaultPath: 'Vault Root Path',
  privacySetting: 'Container Privacy',
  privacyPrivate: 'Private',
  privacyPublic: 'Public',
  privacyPrivateDesc: 'Strictly isolated to your personal authenticated token',
  privacyPublicDesc: 'Publicly indexed across calendar feeds and shared streams',
  boundFoldersTitle: 'Observed Vault Folders',
  boundFoldersDesc: 'Specify local Obsidian folders to mirror bi-directionally with Lenta',
  addFolderBinding: 'Bind Folder',
  folderPathPlaceholder: 'e.g. 01_Daily_Logs or Work/Projects',
  observeMode: 'Observation Mode',
  observeModeRecursive: 'Recursive (all subfolders)',
  observeModeAll: 'Direct files only',
  observeModeFiltered: 'Filtered by Tag',
  syncStatus: 'Sync Status',
  lastSync: 'Last Sync',
  syncedNotesCount: 'Synced Notes',
  observedFoldersCount: 'Observed Folders',
  syncNow: 'Sync Now',
  syncing: 'Syncing...',
  regenerateTokenConfirm: 'Regenerate API token? Old token will be invalidated.',
  deleteContainer: 'Delete Container',
  deleteContainerConfirm: 'Are you sure you want to delete this Obsidian container?',
  filterAll: 'All',
  filterPrivate: 'Private',
  filterPublic: 'Public',
  searchContainers: 'Search containers or folders...',
  noContainersFound: 'No containers found',
  connectedVaults: 'Connected Vaults',
  pluginInstructionsTitle: 'Connect Lemon Lenta Plugin',
  pluginInstructionsDesc: 'Step-by-step instructions to link your Obsidian vault',
  obsidianHeroCta: 'Connect Vault',
  activeObsidianContainers: (count: number) => `${count} Obsidian ${count === 1 ? 'Container' : 'Containers'}`,

  // Folder Manager & Privacy
  folders: 'Folders',
  folderManager: 'Folder Manager',
  folderManagerSubtitle: 'Explorer of folder hierarchy, privacy rules and notes',
  createFolder: 'Create Folder',
  newFolder: 'New Folder',
  folderPath: 'Folder Path',
  folderName: 'Folder Name',
  folderPrivacy: 'Folder Privacy',
  folderPrivacyPrivate: 'Private Folder',
  folderPrivacyPublic: 'Public Folder',
  folderPrivacyPrivateDesc: 'Accessible only within private Obsidian containers and confidential workspaces',
  folderPrivacyPublicDesc: 'Can be used across both public and private Obsidian containers',
  observedInContainers: 'In Obsidian Containers',
  noNotesInFolder: 'No notes in this folder yet',
  folderNotesCount: (count: number) => `${count} ${count === 1 ? 'note' : 'notes'}`,
  folderTreeTitle: 'Folder Structure',
  folderDetailsTitle: 'Folder Properties & Notes',
  changePrivacy: 'Change Privacy',
  privacyChangeWarningTitle: 'Privacy Change Warning',
  privacyChangeWarningDesc: 'Changing privacy level impacts bound Obsidian containers and note visibility',
  publicContainerConflictWarning: 'Warning: This folder is bound to public Obsidian container(s). Public containers can ONLY contain public folders. Switching to private causes a container containment conflict.',
  privateContainerNotice: 'Private Obsidian containers can contain both private and public folders.',
  affectedContainers: 'Affected Obsidian Containers',
  affectedNotes: 'Affected Notes',
  confirmPrivacyChange: 'Confirm Privacy Change',
  cannotAddPrivateFolderToPublicContainer: 'Cannot add private folder to a public container. Public containers only accept public folders.',
  searchFolders: 'Search folders...',
  searchNotesInFolder: 'Search notes in selected folder...',
  rootFolders: 'Root Folders',
  subfolders: 'Subfolders',
  parentFolder: 'Parent Folder',
  deleteFolderTitle: 'Delete Folder',
  deleteFolderConfirm: 'Are you sure you want to delete this folder and all its subfolders?',
  selectFolder: 'Select a folder on the left to view contents',
  activeFoldersCount: (count: number) => `${count} ${count === 1 ? 'folder' : 'folders'}`,
  allFolderTypes: 'All Folder Types',
  privacyRuleHeading: 'Container Privacy Rule',
  containerPrivacyConstraintNote: 'Public containers can only hold public folders. Private containers can hold any folder (private and public).',
  openFolderInManager: 'Open in Folder Manager',
};



interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: Translations;
  getTypeLabel: (type: NoteType) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>('ru');

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
