import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useFeeds,
  useNotes,
  useHashtags,
  useFolders,
  useSystemStats,
  useWatcherStatus,
  useIngestedFiles,
  useTriggerWatcherScan,
} from '../../api/queries';
import { NoteDetailModal } from '../../components/NoteDetailModal';
import { UnifiedThemesAndFeedsTile } from './components/UnifiedThemesAndFeedsTile';
import { RecentNotesCube } from './components/RecentNotesCube';
import { VaultFoldersCube } from './components/VaultFoldersCube';
import { HashtagsTabsCube } from './components/HashtagsTabsCube';
import { PipelineWatcherCube } from './components/PipelineWatcherCube';
import { isSparkFolder } from '../../utils/sparkThemeUtils';
import { useAdminI18n } from '../../i18n';
import { Plus, Sparkles, RefreshCw } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { t } = useAdminI18n();
  const navigate = useNavigate();
  const [viewingNoteId, setViewingNoteId] = useState<string | null>(null);

  // Queries
  const { data: feeds = [] } = useFeeds();
  const { data: notesData, isLoading: isNotesLoading, refetch: refetchNotes } = useNotes({ limit: 35 });
  const { data: hashtags = [] } = useHashtags();
  const { data: folders = [] } = useFolders();
  const { data: stats } = useSystemStats();
  const { data: watcherStatus } = useWatcherStatus(4000);
  const { data: ingestedFiles = [] } = useIngestedFiles(undefined, 25);
  const { mutate: triggerScan, isPending: isScanning } = useTriggerWatcherScan();

  const notes = notesData?.items || [];
  const totalNotes = stats?.notesTotal ?? notesData?.total ?? 0;

  // Filter hot spark folders count
  const sparkFoldersCount = useMemo(() => {
    return folders.filter((f) => isSparkFolder(f.path)).length || 7;
  }, [folders]);

  const handleRefresh = () => {
    refetchNotes();
    triggerScan();
  };

  return (
    <div className="flex-1 min-h-0 h-full overflow-y-auto custom-scrollbar pr-1 space-y-3.5">
      {/* 1. Header Toolbar */}
      <div className="flex justify-between items-center h-8">
        <div>
          <h1 className="font-sans font-bold text-base text-on-surface">
            {t.dashboardTitle || 'Панель управления Lenta'}
          </h1>
          <p className="text-on-surface-variant text-[11px] font-mono hidden sm:block">
            {t.dashboardSubtitle || 'Модульная фрагментированная память • Bento-кубики конвейера Spark & Obsidian'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isScanning || isNotesLoading}
            className="h-7.5 px-2.5 bg-tile-subtle hover:bg-tile-muted text-on-surface border border-tile-border rounded-lg font-mono font-medium text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            title="Обновить дашборд и синхронизировать данные"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-primary ${isScanning || isNotesLoading ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Синхронизация</span>
          </button>

          <button
            onClick={() => navigate('/generators?tab=sparks')}
            className="h-7.5 px-3 bg-tile-subtle hover:bg-tile-muted text-on-surface border border-tile-border rounded-lg font-mono font-medium text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Открыть лабораторию Spark конвейера"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Лаборатория Spark</span>
          </button>

          <button
            onClick={() => navigate('/notes/new')}
            className="h-7.5 px-3 bg-primary text-on-primary hover:bg-primary-hover rounded-lg font-semibold text-xs transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t.addNoteBtn || 'Новая заметка'}</span>
          </button>
        </div>
      </div>

      {/* 2. Bento Grid: Сборка в один экран (~670-700px, 5 объединенных модулей) */}
      <div className="space-y-2.5 w-full">
        {/* Ярус 1 (Операционный фокус, h-[340px]): Темы & Ленты (7 col) + Заметки базы (5 col) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 w-full items-start">
          {/* Блок 1: Объединенные Темы Spark & Активные ленты с дельтами (7 col) */}
          <div className="md:col-span-12 lg:col-span-7 h-[340px] flex flex-col">
            <UnifiedThemesAndFeedsTile
              folders={folders}
              feeds={feeds}
              notes={notes}
              onSelectNote={(noteId) => setViewingNoteId(noteId)}
              onTriggerScan={() => triggerScan()}
              isScanning={isScanning}
              className="h-full"
            />
          </div>

          {/* Блок 2: Свежие заметки базы знаний с ридером (5 col) */}
          <div className="md:col-span-12 lg:col-span-5 h-[340px] flex flex-col">
            <RecentNotesCube
              notesTotal={totalNotes}
              newNotesCount={24}
              recentNotes={notes}
              onSelectNote={(noteId) => setViewingNoteId(noteId)}
              className="h-full"
            />
          </div>
        </div>

        {/* Ярус 2 (Телеметрия, таксономия & хранилище, h-[320px]): Конвейер (4 col) + Хэштеги (4 col) + Папки (4 col) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 w-full">
          {/* Блок 3: Файловый конвейер Spark & Watcher Live Sync (4 col) */}
          <div className="md:col-span-12 lg:col-span-4 flex">
            <PipelineWatcherCube
              watcherStatus={watcherStatus}
              ingestedFiles={ingestedFiles}
              onTriggerScan={() => triggerScan()}
              isScanning={isScanning}
            />
          </div>

          {/* Блок 4: Хэштеги & Таксономия (4 col) */}
          <div className="md:col-span-6 lg:col-span-4 flex">
            <HashtagsTabsCube
              hashtags={hashtags}
            />
          </div>

          {/* Блок 5: Папки хранилища Obsidian (4 col) */}
          <div className="md:col-span-6 lg:col-span-4 flex">
            <VaultFoldersCube
              folders={folders}
              sparkFoldersCount={sparkFoldersCount}
            />
          </div>
        </div>
      </div>

      {/* 4. Инспектор / Детальный ридер заметки */}
      <NoteDetailModal
        noteId={viewingNoteId}
        open={Boolean(viewingNoteId)}
        onClose={() => setViewingNoteId(null)}
        onEdit={(id) => navigate(`/notes/${id}`)}
        onSelectFolder={(folderPath) => navigate(`/notes?folder=${encodeURIComponent(folderPath)}`)}
        onSelectHashtag={(name) => navigate(`/notes?hashtag=${encodeURIComponent(name)}`)}
      />
    </div>
  );
};
