import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, NoteType, getNoteTypeLabel, pluralizeRu } from '@lenta/shared';
import ruRU from 'antd/locale/ru_RU';
import enUS from 'antd/locale/en_US';
import { Locale } from 'antd/es/locale';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import 'dayjs/locale/en';

export interface AdminTranslations {
  // Navigation & Layout
  dashboard: string;
  feeds: string;
  allNotes: string;
  taxonomy: string;
  syncHub: string;
  generatorLab: string;
  quickAdd: string;

  apiDocs: string;
  searchPlaceholder: string;
  adminTitle: string;
  adminTagline: string;
  syncReady: string;
  notesSynced: (count: number) => string;
  syncStatus: string;

  // Common Actions
  add: string;
  edit: string;
  delete: string;
  save: string;
  cancel: string;
  close: string;
  reset: string;
  filter: string;
  refresh: string;
  viewAll: string;
  confirm: string;
  loading: string;
  actions: string;
  status: string;
  created: string;
  updated: string;
  id: string;

  // Dashboard Page
  dashboardTitle: string;
  dashboardSubtitle: string;
  addNoteBtn: string;
  activeFeedsMetric: string;
  dataStreamsSub: string;
  totalNotesMetric: string;
  singleTruthSub: string;
  vaultFoldersMetric: string;
  obsidianPathsSub: string;
  taxonomyTagsMetric: string;
  ltreeSub: string;
  syncStateMetric: string;
  activeStatus: string;
  recentNotesTitle: string;
  recentNotesSub: string;
  noRecentNotes: string;
  deltaInspectorTitle: string;
  deltaInspectorSub: string;
  fetchDeltaBtn: string;
  sinceTimestampPlaceholder: string;
  notesCreatedLabel: string;
  notesUpdatedLabel: string;
  notesDeletedLabel: string;

  // Feeds Page
  feedsPageTitle: string;
  feedsPageSubtitle: string;
  createFeedBtn: string;
  editFeedTitle: string;
  createFeedTitle: string;
  feedTitleLabel: string;
  feedSlugLabel: string;
  feedDescriptionLabel: string;
  feedPrivacyLabel: string;
  feedPrivacyPublic: string;
  feedPrivacyPrivate: string;
  feedPrivacyPublicDesc: string;
  feedPrivacyPrivateDesc: string;
  feedIconLabel: string;
  feedAccentColorLabel: string;
  feedDefaultFolderLabel: string;
  feedConflictStrategyLabel: string;
  feedOrderLabel: string;
  feedFolderPathsLabel: string;
  feedFolderPathsHelp: string;
  feedFolderAddPlaceholder: string;
  addFolderBtn: string;
  feedHashtagsLabel: string;
  feedHashtagsHelp: string;
  feedHashtagsPlaceholder: string;
  viewTreeBtn: string;
  viewCardsBtn: string;
  expandAll: string;
  collapseAll: string;
  searchFeedsPlaceholder: string;
  feedsTotalCount: (count: number) => string;
  confirmDeleteFeed: string;
  feedDeletedSuccess: string;
  feedSavedSuccess: string;
  noFeedsFound: string;
  notesCountBadge: (count: number) => string;

  // Notes List Page
  notesListPageTitle: string;
  notesListPageSubtitle: string;
  newNoteBtn: string;
  filterFeedPlaceholder: string;
  filterTypePlaceholder: string;
  filterFolderPlaceholder: string;
  unfiledOnly: string;
  searchNotesPlaceholder: string;
  totalNotesCountBadge: (count: number) => string;
  titleCol: string;
  typeCol: string;
  feedCol: string;
  datesCol: string;
  folderCol: string;
  tagsCol: string;
  actionsCol: string;
  urlCol: string;
  linksLabel: string;
  syncChangesTitle: string;
  confirmDeleteNote: string;
  noteDeletedSuccess: string;
  noNotesFound: string;

  // Note Editor Page
  editorTitleNew: string;
  editorTitleEdit: string;
  editorSubtitle: string;
  titleInputLabel: string;
  titleInputPlaceholder: string;
  typeInputLabel: string;
  feedInputLabel: string;
  selectFeedPlaceholder: string;
  startDateLabel: string;
  endDateLabel: string;
  folderInputLabel: string;
  selectFolderPlaceholder: string;
  folderPrivacy: string;
  folderPrivacyPrivate: string;
  folderPrivacyPublic: string;
  folderPrivacyPrivateDesc: string;
  folderPrivacyPublicDesc: string;
  makeFolderPublic: string;
  makeFolderPrivate: string;
  deleteFolderConfirm: string;
  folderDeletedSuccess: string;
  folderUpdatedSuccess: string;
  filterAllFolders: string;
  filterPublicFolders: string;
  filterPrivateFolders: string;
  folderNameOptional: string;
  folderColorLabel: string;
  folderIconLabel: string;
  searchFoldersPlaceholder: string;
  tagsInputLabel: string;
  selectTagsPlaceholder: string;
  hashtagsInputLabel: string;
  hashtagsPlaceholder: string;
  sourceLinkLabel: string;
  sourceLinkPlaceholder: string;
  contentLabel: string;
  mediaGalleryLabel: string;
  linksManagerLabel: string;
  saveNoteBtn: string;
  deleteNoteBtn: string;
  noteSavedSuccess: string;
  previewTab: string;
  writeTab: string;

  // Quick Add Modal
  quickAddModalTitle: string;
  quickAddModalSub: string;
  quickAddNoteCreated: string;

  // Note Preview Modal
  viewNoteModalTitle: string;
  quickPreview: string;
  editInEditor: string;
  copyNoteLink: string;
  copied: string;
  noteNotFound: string;
  summaryLabel: string;
  linksSection: string;
  gallerySection: string;
  folderSection: string;

  // Taxonomy Page
  taxonomyPageTitle: string;
  taxonomyPageSubtitle: string;
  createTagBtn: string;
  createTagTitle: string;
  editTagTitle: string;
  tagNameLabel: string;
  tagSlugLabel: string;
  tagParentLabel: string;
  tagDescriptionLabel: string;
  confirmDeleteTag: string;
  tagSavedSuccess: string;
  tagDeletedSuccess: string;

  // Image & Link Managers
  uploadImagesBtn: string;
  setMainImageBtn: string;
  mainImageBadge: string;
  deleteImageBtn: string;
  addLinkBtn: string;
  linkUrlLabel: string;
  linkTitleLabel: string;
  linkTypeLabel: string;
  confirmDeleteLink: string;
}

export const ruAdminTranslations: AdminTranslations = {
  // Navigation & Layout
  dashboard: 'Дашборд',
  feeds: 'Ленты',
  allNotes: 'Все заметки',
  taxonomy: 'Таксономия',
  syncHub: 'Центр синхронизации',
  generatorLab: 'Генератор & AI Лаборатория',
  quickAdd: 'Быстрое добавление',

  apiDocs: 'Документация API',
  searchPlaceholder: 'Поиск заметок, лент...',
  adminTitle: 'Lemon Seasons',
  adminTagline: 'Панель управления',
  syncReady: 'Синхронизация готова',
  notesSynced: (count: number) => `${pluralizeRu(count, 'запись синхронизирована', 'записи синхронизировано', 'записей синхронизировано')}`,
  syncStatus: 'Статус синхронизации',

  // Common Actions
  add: 'Добавить',
  edit: 'Редактировать',
  delete: 'Удалить',
  save: 'Сохранить',
  cancel: 'Отмена',
  close: 'Закрыть',
  reset: 'Сбросить',
  filter: 'Фильтр',
  refresh: 'Обновить',
  viewAll: 'Смотреть все',
  confirm: 'Подтвердить',
  loading: 'Загрузка...',
  actions: 'Действия',
  status: 'Статус',
  created: 'Создано',
  updated: 'Обновлено',
  id: 'ID',

  // Dashboard Page
  dashboardTitle: 'Панель управления Lenta',
  dashboardSubtitle: 'Headless CMS и хронологический хаб данных для админки, календаря и синхронизации с Obsidian.',
  addNoteBtn: 'Новая заметка',
  activeFeedsMetric: 'Активные ленты',
  dataStreamsSub: 'Потоки данных',
  totalNotesMetric: 'Всего заметок',
  singleTruthSub: 'Единый источник правды',
  vaultFoldersMetric: 'Папки хранилища',
  obsidianPathsSub: 'Физические пути Obsidian',
  taxonomyTagsMetric: 'Хэштеги',
  ltreeSub: 'Метки заметок',
  syncStateMetric: 'Состояние синхронизации',
  activeStatus: 'Активно',
  recentNotesTitle: 'Последние заметки',
  recentNotesSub: 'Свежие записи, добавленные в базу данных',
  noRecentNotes: 'Заметок пока нет. Создайте первую!',
  deltaInspectorTitle: 'Инспектор синхронизации',
  deltaInspectorSub: 'Проверка изменений, подготовленных для Obsidian Vault',
  fetchDeltaBtn: 'Получить дельту',
  sinceTimestampPlaceholder: 'Метка времени (ISO / unix)...',
  notesCreatedLabel: 'Создано заметок',
  notesUpdatedLabel: 'Обновлено заметок',
  notesDeletedLabel: 'Удалено заметок',

  // Feeds Page
  feedsPageTitle: 'Новостные ленты и каналы',
  feedsPageSubtitle: 'Управление тематическими лентами, приоритетами, стратегиями конфликтов и папками хранилища.',
  createFeedBtn: 'Создать ленту',
  editFeedTitle: 'Редактировать ленту',
  createFeedTitle: 'Новая лента',
  feedTitleLabel: 'Название ленты',
  feedSlugLabel: 'Слаг (идентификатор)',
  feedDescriptionLabel: 'Описание',
  feedPrivacyLabel: 'Приватность ленты',
  feedPrivacyPublic: 'Публичная лента',
  feedPrivacyPrivate: 'Приватная лента',
  feedPrivacyPublicDesc: 'Доступна всем посетителям календаря и публичного фида',
  feedPrivacyPrivateDesc: 'Закрытая лента, доступна только для внутренних записей',
  feedIconLabel: 'Иконка',
  feedAccentColorLabel: 'Цвет акцента',
  feedDefaultFolderLabel: 'Папка по умолчанию в Obsidian',
  feedConflictStrategyLabel: 'Стратегия конфликтов',
  feedOrderLabel: 'Порядок отображения',
  feedFolderPathsLabel: 'Привязанные папки (Folder Projections)',
  feedFolderPathsHelp: 'Заметки из выбранных папок автоматически проецируются в эту ленту.',
  feedFolderAddPlaceholder: 'Путь к папке (например, Spark/AI)...',
  addFolderBtn: 'Добавить папку',
  feedHashtagsLabel: 'Фильтр по тегам (Hashtags)',
  feedHashtagsHelp: 'Заметки с указанными хэштегами автоматически проецируются в эту ленту.',
  feedHashtagsPlaceholder: 'Введите тег (например, #ai, wow) и нажмите Enter...',
  viewTreeBtn: 'Дерево',
  viewCardsBtn: 'Карточки',
  expandAll: 'Развернуть всё',
  collapseAll: 'Свернуть всё',
  searchFeedsPlaceholder: 'Поиск по лентам, слагам, папкам и тегам...',
  feedsTotalCount: (count: number) => pluralizeRu(count, 'лента', 'ленты', 'лент'),
  confirmDeleteFeed: 'Вы уверены, что хотите удалить эту ленту?',
  feedDeletedSuccess: 'Лента успешно удалена',
  feedSavedSuccess: 'Лента успешно сохранена',
  noFeedsFound: 'Ленты не найдены',
  notesCountBadge: (count: number) => pluralizeRu(count, 'заметка', 'заметки', 'заметок'),

  // Notes List Page
  notesListPageTitle: 'Все заметки',
  notesListPageSubtitle: 'Просмотр, фильтрация, поиск и управление хронологическими записями.',
  newNoteBtn: 'Создать запись',
  filterFeedPlaceholder: 'Все ленты',
  filterTypePlaceholder: 'Все типы',
  filterFolderPlaceholder: 'Все папки',
  unfiledOnly: 'Без папки (Корень)',
  searchNotesPlaceholder: 'Поиск по заголовку, содержанию, тегам...',
  totalNotesCountBadge: (count: number) => pluralizeRu(count, 'запись', 'записи', 'записей'),
  titleCol: 'Заголовок',
  typeCol: 'Тип',
  feedCol: 'Лента',
  datesCol: 'Даты',
  folderCol: 'Папка',
  tagsCol: 'Теги и хэштеги',
  actionsCol: 'Действия',
  urlCol: 'URL адрес',
  linksLabel: 'Ссылки и источники',
  syncChangesTitle: 'Синхронизация изменений',
  confirmDeleteNote: 'Вы уверены, что хотите удалить эту запись?',
  noteDeletedSuccess: 'Запись успешно удалена',
  noNotesFound: 'Записи по вашему запросу не найдены',

  // Note Editor Page
  editorTitleNew: 'Создание новой записи',
  editorTitleEdit: 'Редактирование записи',
  editorSubtitle: 'Заполните метаданные, даты, таксономию и содержимое заметки в формате Markdown.',
  titleInputLabel: 'Заголовок записи',
  titleInputPlaceholder: 'Введите заголовок заметки...',
  typeInputLabel: 'Тип записи',
  feedInputLabel: 'Новостная лента / Канал',
  selectFeedPlaceholder: 'Выберите ленту (необязательно)',
  startDateLabel: 'Дата начала',
  endDateLabel: 'Дата окончания (для периодов)',
  folderInputLabel: 'Папка Obsidian',
  selectFolderPlaceholder: 'Выберите папку хранилища',
  folderPrivacy: 'Приватность папки',
  folderPrivacyPrivate: 'Приватная папка',
  folderPrivacyPublic: 'Публичная папка',
  folderPrivacyPrivateDesc: 'Доступна только в приватных контейнерах Obsidian и закрытых рабочих пространствах',
  folderPrivacyPublicDesc: 'Может проецироваться и в публичные, и в приватные контейнеры Obsidian',
  makeFolderPublic: 'Сделать публичной',
  makeFolderPrivate: 'Сделать приватной',
  deleteFolderConfirm: 'Удалить папку и все её подпапки?',
  folderDeletedSuccess: 'Папка успешно удалена',
  folderUpdatedSuccess: 'Папка успешно обновлена',
  filterAllFolders: 'Все',
  filterPublicFolders: 'Публ',
  filterPrivateFolders: 'Прив',
  folderNameOptional: 'Отображаемое имя (необязательно)',
  folderColorLabel: 'Цветовой маркер',
  folderIconLabel: 'Иконка',
  searchFoldersPlaceholder: 'Поиск папок...',
  tagsInputLabel: 'Теги таксономии (Дерево)',
  selectTagsPlaceholder: 'Выберите категории...',
  hashtagsInputLabel: 'Хэштеги',
  hashtagsPlaceholder: 'Добавьте хэштеги (Enter для подтверждения)...',
  sourceLinkLabel: 'Внешняя ссылка / Источник',
  sourceLinkPlaceholder: 'https://example.com/source',
  contentLabel: 'Содержимое (Markdown)',
  mediaGalleryLabel: 'Медиафайлы и изображения',
  linksManagerLabel: 'Связи и ссылки',
  saveNoteBtn: 'Сохранить запись',
  deleteNoteBtn: 'Удалить запись',
  noteSavedSuccess: 'Запись успешно сохранена',
  previewTab: 'Предпросмотр',
  writeTab: 'Редактор',

  // Quick Add Modal
  quickAddModalTitle: 'Быстрое создание записи',
  quickAddModalSub: 'Быстро зафиксируйте мысль, событие или релиз с минимальным набором полей.',
  quickAddNoteCreated: 'Запись успешно создана!',

  // Note Preview Modal
  viewNoteModalTitle: 'Просмотр записи',
  quickPreview: 'Быстрый просмотр',
  editInEditor: 'Редактировать в редакторе',
  copyNoteLink: 'Скопировать ссылку',
  copied: 'Скопировано в буфер обмена!',
  noteNotFound: 'Заметка не найдена или была удалена',
  summaryLabel: 'Краткое содержание (AI Резюме)',
  linksSection: 'Связанные ссылки',
  gallerySection: 'Прикреплённые изображения',
  folderSection: 'Расположение в Vault',

  // Taxonomy Page
  taxonomyPageTitle: 'Дерево таксономии',
  taxonomyPageSubtitle: 'Иерархическая структура категорий на базе PostgreSQL Ltree для удобной навигации.',
  createTagBtn: 'Добавить категорию',
  createTagTitle: 'Новая категория',
  editTagTitle: 'Редактировать категорию',
  tagNameLabel: 'Название категории',
  tagSlugLabel: 'Слаг пути',
  tagParentLabel: 'Родительская категория',
  tagDescriptionLabel: 'Описание',
  confirmDeleteTag: 'Вы уверены, что хотите удалить эту категорию?',
  tagSavedSuccess: 'Категория сохранена',
  tagDeletedSuccess: 'Категория удалена',

  // Image & Link Managers
  uploadImagesBtn: 'Загрузить изображения',
  setMainImageBtn: 'Сделать обложкой',
  mainImageBadge: 'Обложка',
  deleteImageBtn: 'Удалить изображение',
  addLinkBtn: 'Добавить ссылку',
  linkUrlLabel: 'URL адрес',
  linkTitleLabel: 'Текст ссылки',
  linkTypeLabel: 'Тип связи',
  confirmDeleteLink: 'Удалить эту ссылку?',
};

export const enAdminTranslations: AdminTranslations = {
  // Navigation & Layout
  dashboard: 'Dashboard',
  feeds: 'Feeds',
  allNotes: 'All Notes',
  taxonomy: 'Taxonomy',
  syncHub: 'Sync Hub',
  generatorLab: 'AI & Generation Lab',
  quickAdd: 'Quick Add',

  apiDocs: 'API Docs',
  searchPlaceholder: 'Search notes, feeds...',
  adminTitle: 'Lemon Seasons',
  adminTagline: 'Technical Admin',
  syncReady: 'Sync ready',
  notesSynced: (count: number) => `${count} ${count === 1 ? 'note synced' : 'notes synced'}`,
  syncStatus: 'Sync Status',

  // Common Actions
  add: 'Add',
  edit: 'Edit',
  delete: 'Delete',
  save: 'Save',
  cancel: 'Cancel',
  close: 'Close',
  reset: 'Reset',
  filter: 'Filter',
  refresh: 'Refresh',
  viewAll: 'View All',
  confirm: 'Confirm',
  loading: 'Loading...',
  actions: 'Actions',
  status: 'Status',
  created: 'Created',
  updated: 'Updated',
  id: 'ID',

  // Dashboard Page
  dashboardTitle: 'Project Lenta Dashboard',
  dashboardSubtitle: 'Headless CMS & Chronological Data Hub powering Admin CMS, Calendar App & Obsidian Sync.',
  addNoteBtn: 'Add Note',
  activeFeedsMetric: 'Active Feeds',
  dataStreamsSub: 'Data streams',
  totalNotesMetric: 'Total Notes',
  singleTruthSub: 'Single truth records',
  vaultFoldersMetric: 'Vault Folders',
  obsidianPathsSub: 'Obsidian physical paths',
  taxonomyTagsMetric: 'Hashtags',
  ltreeSub: 'Note hashtags',
  syncStateMetric: 'Sync State',
  activeStatus: 'Active',
  recentNotesTitle: 'Recent Notes',
  recentNotesSub: 'Latest dispatches added to the database',
  noRecentNotes: 'No notes yet. Create the first one!',
  deltaInspectorTitle: 'Obsidian Delta Inspector',
  deltaInspectorSub: 'Inspect changes queued for Obsidian Vault synchronization',
  fetchDeltaBtn: 'Fetch Delta',
  sinceTimestampPlaceholder: 'Since timestamp (ISO / unix)...',
  notesCreatedLabel: 'Notes Created',
  notesUpdatedLabel: 'Notes Updated',
  notesDeletedLabel: 'Notes Deleted',

  // Feeds Page
  feedsPageTitle: 'Feeds & Channels',
  feedsPageSubtitle: 'Manage editorial desk streams, ordering, conflict strategies, and vault folder mappings.',
  createFeedBtn: 'Create Feed',
  editFeedTitle: 'Edit Feed',
  createFeedTitle: 'New Feed',
  feedTitleLabel: 'Feed Title',
  feedSlugLabel: 'Slug (Identifier)',
  feedDescriptionLabel: 'Description',
  feedPrivacyLabel: 'Feed Privacy',
  feedPrivacyPublic: 'Public Feed',
  feedPrivacyPrivate: 'Private Feed',
  feedPrivacyPublicDesc: 'Visible to all visitors in the calendar showcase and streams',
  feedPrivacyPrivateDesc: 'Restricted feed, accessible only for internal workspace notes',
  feedIconLabel: 'Icon',
  feedAccentColorLabel: 'Accent Color',
  feedDefaultFolderLabel: 'Default Obsidian Folder',
  feedConflictStrategyLabel: 'Conflict Strategy',
  feedOrderLabel: 'Display Order',
  feedFolderPathsLabel: 'Linked Folders (Folder Projections)',
  feedFolderPathsHelp: 'Notes from these folders are automatically projected into this feed.',
  feedFolderAddPlaceholder: 'Folder path (e.g. Spark/AI)...',
  addFolderBtn: 'Add Folder',
  feedHashtagsLabel: 'Tag Filter (Hashtags)',
  feedHashtagsHelp: 'Notes with these hashtags are automatically projected into this feed.',
  feedHashtagsPlaceholder: 'Type a tag (e.g. #ai, wow) and press Enter...',
  viewTreeBtn: 'Tree View',
  viewCardsBtn: 'Cards View',
  expandAll: 'Expand All',
  collapseAll: 'Collapse All',
  searchFeedsPlaceholder: 'Search feeds, slugs, folders, hashtags...',
  feedsTotalCount: (count: number) => `${count} ${count === 1 ? 'feed' : 'feeds'}`,
  confirmDeleteFeed: 'Are you sure you want to delete this feed?',
  feedDeletedSuccess: 'Feed deleted successfully',
  feedSavedSuccess: 'Feed saved successfully',
  noFeedsFound: 'No feeds found',
  notesCountBadge: (count: number) => `${count} ${count === 1 ? 'note' : 'notes'}`,

  // Notes List Page
  notesListPageTitle: 'All Notes',
  notesListPageSubtitle: 'Browse, filter, search and manage chronological records.',
  newNoteBtn: 'New Note',
  filterFeedPlaceholder: 'All Feeds',
  filterTypePlaceholder: 'All Types',
  filterFolderPlaceholder: 'All Folders',
  unfiledOnly: 'Unfiled (Root)',
  searchNotesPlaceholder: 'Search by title, content, tags...',
  totalNotesCountBadge: (count: number) => `${count} ${count === 1 ? 'note' : 'notes'}`,
  titleCol: 'Title',
  typeCol: 'Type',
  feedCol: 'Feed',
  datesCol: 'Dates',
  folderCol: 'Folder',
  tagsCol: 'Tags & Hashtags',
  actionsCol: 'Actions',
  urlCol: 'URL',
  linksLabel: 'Links & Sources',
  syncChangesTitle: 'Sync Changes',
  confirmDeleteNote: 'Are you sure you want to delete this note?',
  noteDeletedSuccess: 'Note deleted successfully',
  noNotesFound: 'No notes found matching your criteria',

  // Note Editor Page
  editorTitleNew: 'Create New Note',
  editorTitleEdit: 'Edit Note',
  editorSubtitle: 'Configure note metadata, timing, taxonomy paths and Markdown body.',
  titleInputLabel: 'Note Title',
  titleInputPlaceholder: 'Enter note title...',
  typeInputLabel: 'Note Type',
  feedInputLabel: 'Feed / Channel',
  selectFeedPlaceholder: 'Select feed (optional)',
  startDateLabel: 'Start Date & Time',
  endDateLabel: 'End Date & Time (for periods)',
  folderInputLabel: 'Obsidian Folder',
  selectFolderPlaceholder: 'Select vault folder',
  folderPrivacy: 'Folder Privacy',
  folderPrivacyPrivate: 'Private Folder',
  folderPrivacyPublic: 'Public Folder',
  folderPrivacyPrivateDesc: 'Accessible only within private Obsidian containers and confidential workspaces',
  folderPrivacyPublicDesc: 'Can be projected across both public and private Obsidian containers',
  makeFolderPublic: 'Make Public',
  makeFolderPrivate: 'Make Private',
  deleteFolderConfirm: 'Delete folder and all its subfolders?',
  folderDeletedSuccess: 'Folder deleted successfully',
  folderUpdatedSuccess: 'Folder updated successfully',
  filterAllFolders: 'All',
  filterPublicFolders: 'Public',
  filterPrivateFolders: 'Private',
  folderNameOptional: 'Display Name (optional)',
  folderColorLabel: 'Color Marker',
  folderIconLabel: 'Icon',
  searchFoldersPlaceholder: 'Search folders...',
  tagsInputLabel: 'Taxonomy Tags (Hierarchy)',
  selectTagsPlaceholder: 'Select categories...',
  hashtagsInputLabel: 'Hashtags',
  hashtagsPlaceholder: 'Add hashtags (Press Enter)...',
  sourceLinkLabel: 'Source URL / Reference',
  sourceLinkPlaceholder: 'https://example.com/source',
  contentLabel: 'Content (Markdown)',
  mediaGalleryLabel: 'Media & Image Attachments',
  linksManagerLabel: 'Relationships & Links',
  saveNoteBtn: 'Save Note',
  deleteNoteBtn: 'Delete Note',
  noteSavedSuccess: 'Note saved successfully',
  previewTab: 'Preview',
  writeTab: 'Write',

  // Quick Add Modal
  quickAddModalTitle: 'Quick Add Note',
  quickAddModalSub: 'Rapidly capture a thought, event, or release with essential fields.',
  quickAddNoteCreated: 'Note created successfully!',

  // Note Preview Modal
  viewNoteModalTitle: 'View Note',
  quickPreview: 'Quick Preview',
  editInEditor: 'Edit in Full Editor',
  copyNoteLink: 'Copy Link',
  copied: 'Copied to clipboard!',
  noteNotFound: 'Note not found or has been deleted',
  summaryLabel: 'Summary (AI Synopsis)',
  linksSection: 'Attached Links',
  gallerySection: 'Media Gallery',
  folderSection: 'Vault Location',

  // Taxonomy Page
  taxonomyPageTitle: 'Taxonomy Tree',
  taxonomyPageSubtitle: 'Hierarchical category tree powered by PostgreSQL Ltree for flexible content classification.',
  createTagBtn: 'Add Category',
  createTagTitle: 'New Category',
  editTagTitle: 'Edit Category',
  tagNameLabel: 'Category Name',
  tagSlugLabel: 'Path Slug',
  tagParentLabel: 'Parent Category',
  tagDescriptionLabel: 'Description',
  confirmDeleteTag: 'Are you sure you want to delete this category?',
  tagSavedSuccess: 'Category saved successfully',
  tagDeletedSuccess: 'Category deleted successfully',

  // Image & Link Managers
  uploadImagesBtn: 'Upload Images',
  setMainImageBtn: 'Set as Cover',
  mainImageBadge: 'Cover',
  deleteImageBtn: 'Delete Image',
  addLinkBtn: 'Add Link',
  linkUrlLabel: 'URL',
  linkTitleLabel: 'Link Title',
  linkTypeLabel: 'Relationship Type',
  confirmDeleteLink: 'Delete this link?',
};

interface AdminI18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: AdminTranslations;
  antdLocale: Locale;
  getTypeLabel: (type: NoteType) => string;
}

const AdminI18nContext = createContext<AdminI18nContextType | null>(null);

export const AdminI18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>('ru');

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('lemon_admin_lang', newLang);
    dayjs.locale(newLang);
  };

  useEffect(() => {
    dayjs.locale(lang);
  }, [lang]);

  const t = lang === 'ru' ? ruAdminTranslations : enAdminTranslations;
  const antdLocale = lang === 'ru' ? ruRU : enUS;

  const getTypeLabel = (type: NoteType): string => {
    return getNoteTypeLabel(type, lang);
  };

  return (
    <AdminI18nContext.Provider value={{ lang, setLang, t, antdLocale, getTypeLabel }}>
      {children}
    </AdminI18nContext.Provider>
  );
};

export const useAdminI18n = (): AdminI18nContextType => {
  const context = useContext(AdminI18nContext);
  if (!context) {
    throw new Error('useAdminI18n must be used within an AdminI18nProvider');
  }
  return context;
};
