import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Rss,
  FileText,
  FolderGit2,
  Hash,
  Cloud,
  TrendingUp,
  Flame,
  Sparkles,
} from 'lucide-react';
import { WatcherStatus } from '../../../api/client';
import { useAdminI18n } from '../../../i18n';

interface ExpandedMetricsRowProps {
  feedsCount: number;
  notesTotal: number;
  foldersCount: number;
  sparkFoldersCount: number;
  hashtagsCount: number;
  topHashtagNames?: string[];
  watcherStatus?: WatcherStatus;
  newNotesCount?: number;
  feedsDeltaCount?: number;
}

export const ExpandedMetricsRow: React.FC<ExpandedMetricsRowProps> = ({
  feedsCount,
  notesTotal,
  foldersCount,
  sparkFoldersCount,
  hashtagsCount,
  topHashtagNames = ['ai', 'sparks', 'habr'],
  watcherStatus,
  newNotesCount = 24,
  feedsDeltaCount = 3,
}) => {
  const { t } = useAdminI18n();
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
      {/* 1. Активные ленты */}
      <div
        onClick={() => navigate('/feeds')}
        className="platform-tile platform-tile-hover p-2.5 sm:p-3 cursor-pointer group flex flex-col justify-between transition-colors"
        title="Перейти к управлению лентами"
      >
        <div>
          <div className="flex items-center justify-between text-on-surface-variant mb-1">
            <span className="font-mono text-[10px] uppercase tracking-wider font-semibold">
              {t.activeFeedsMetric || 'Активные ленты'}
            </span>
            <Rss className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline justify-between gap-1">
            <div className="font-sans font-bold text-xl sm:text-2xl text-on-surface">
              {feedsCount}
            </div>
            {/* Расширение: дельта активных лент */}
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
              <TrendingUp className="w-2.5 h-2.5" />
              <span>+{feedsDeltaCount} Δ</span>
            </span>
          </div>
        </div>
        <div className="mt-1.5 pt-1.5 border-t border-tile-border/60 dark:border-white/[0.05] flex items-center justify-between text-[10px] font-mono text-on-surface-variant/70">
          <span>{t.dataStreamsSub || 'Потоки данных'}</span>
          <span className="text-primary/90 font-medium truncate">
            {feedsDeltaCount} обновлены за 24ч
          </span>
        </div>
      </div>

      {/* 2. Всего заметок */}
      <div
        onClick={() => navigate('/notes')}
        className="platform-tile platform-tile-hover p-2.5 sm:p-3 cursor-pointer group flex flex-col justify-between transition-colors"
        title="Перейти к списку заметок"
      >
        <div>
          <div className="flex items-center justify-between text-on-surface-variant mb-1">
            <span className="font-mono text-[10px] uppercase tracking-wider font-semibold">
              {t.totalNotesMetric || 'Всего заметок'}
            </span>
            <FileText className="w-3.5 h-3.5 text-secondary group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline justify-between gap-1">
            <div className="font-sans font-bold text-xl sm:text-2xl text-on-surface">
              {notesTotal}
            </div>
            {/* Расширение: новые заметки */}
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
              <span>+{newNotesCount} новые</span>
            </span>
          </div>
        </div>
        <div className="mt-1.5 pt-1.5 border-t border-tile-border/60 dark:border-white/[0.05] flex items-center justify-between text-[10px] font-mono text-on-surface-variant/70">
          <span>{t.singleTruthSub || 'Единый источник правды'}</span>
          <span className="text-emerald-400/90 font-medium">За последние 24ч</span>
        </div>
      </div>

      {/* 3. Папки хранилища */}
      <div
        onClick={() => navigate('/notes')}
        className="platform-tile platform-tile-hover p-2.5 sm:p-3 cursor-pointer group flex flex-col justify-between transition-colors"
        title="Перейти к Obsidian структуре папок"
      >
        <div>
          <div className="flex items-center justify-between text-on-surface-variant mb-1">
            <span className="font-mono text-[10px] uppercase tracking-wider font-semibold">
              {t.vaultFoldersMetric || 'Папки хранилища'}
            </span>
            <FolderGit2 className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline justify-between gap-1">
            <div className="font-sans font-bold text-xl sm:text-2xl text-primary">
              {foldersCount}
            </div>
            {/* Расширение: горячие папки Spark */}
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20">
              <Flame className="w-2.5 h-2.5 text-purple-400" />
              <span>{sparkFoldersCount} Spark</span>
            </span>
          </div>
        </div>
        <div className="mt-1.5 pt-1.5 border-t border-tile-border/60 dark:border-white/[0.05] flex items-center justify-between text-[10px] font-mono text-on-surface-variant/70">
          <span>{t.obsidianPathsSub || 'Физические пути Obsidian'}</span>
          <span className="text-purple-300/90 font-medium">Горячие директории</span>
        </div>
      </div>

      {/* 4. Хэштеги */}
      <div
        onClick={() => navigate('/notes')}
        className="platform-tile platform-tile-hover p-2.5 sm:p-3 cursor-pointer group flex flex-col justify-between transition-colors"
        title="Перейти к таксономии и хештегам"
      >
        <div>
          <div className="flex items-center justify-between text-on-surface-variant mb-1">
            <span className="font-mono text-[10px] uppercase tracking-wider font-semibold">
              {t.taxonomyTagsMetric || 'Хэштеги'}
            </span>
            <Hash className="w-3.5 h-3.5 text-tertiary group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline justify-between gap-1">
            <div className="font-sans font-bold text-xl sm:text-2xl text-on-surface flex items-baseline gap-1">
              <span>{hashtagsCount}</span>
              <span className="text-xs text-cyan-400 font-mono font-normal">#</span>
            </div>
            {/* Расширение: топ популярные */}
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              <span>#{topHashtagNames[0] || 'ai'}</span>
              <span className="text-cyan-400/70 font-semibold ml-0.5">+5 топ</span>
            </span>
          </div>
        </div>
        <div className="mt-1.5 pt-1.5 border-t border-tile-border/60 dark:border-white/[0.05] flex items-center justify-between text-[10px] font-mono text-on-surface-variant/70">
          <span>{t.ltreeSub || 'Метки заметок'}</span>
          <span className="text-cyan-400/90 font-medium truncate max-w-[110px]">
            {topHashtagNames.slice(0, 2).map((h) => `#${h}`).join(' ')}
          </span>
        </div>
      </div>

      {/* 5. Файловый конвейер */}
      <div
        onClick={() => navigate('/generators?tab=sparks')}
        className="platform-tile platform-tile-hover p-2.5 sm:p-3 cursor-pointer group flex flex-col justify-between transition-colors"
        title="Перейти в лабораторию генераций и конвейера"
      >
        <div>
          <div className="flex items-center justify-between text-on-surface-variant mb-1">
            <span className="font-mono text-[10px] uppercase tracking-wider font-semibold">
              Файловый конвейер
            </span>
            <Cloud className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline justify-between gap-1">
            <div className="font-sans font-bold text-base sm:text-lg text-on-surface flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  watcherStatus?.isWatching ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                }`}
              />
              <span>{watcherStatus?.isWatching ? (t.activeStatus || 'Активно') : 'Остановлен'}</span>
            </div>
            {/* Расширение: дельта спарков */}
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
              <span>Live Sync</span>
            </span>
          </div>
        </div>
        <div className="mt-1.5 pt-1.5 border-t border-tile-border/60 dark:border-white/[0.05] flex items-center justify-between text-[10px] font-mono text-on-surface-variant/70">
          <span className="truncate">
            {watcherStatus
              ? `${watcherStatus.filesProcessed} готово • ${watcherStatus.filesPending} в очереди`
              : '448 готово • 0 в очереди'}
          </span>
          <span className="text-amber-400/90 font-medium">Auto-Ingest</span>
        </div>
      </div>
    </div>
  );
};
