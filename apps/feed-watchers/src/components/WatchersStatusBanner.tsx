import React from 'react';
import { Loader2, PauseCircle, Play, SlidersHorizontal } from 'lucide-react';

export interface WatchersStatusBannerProps {
  totalWatchers: number;
  activeWatchers: number;
  selectedCategoryTitle?: string;
  isBulkMutating: boolean;
  onResumeAll: () => void;
  onOpenManager: () => void;
}

/**
 * Displays a concise alert when watchers in the current view are paused,
 * giving curators 1-click access to resume polling or inspect individual sources.
 */
export const WatchersStatusBanner: React.FC<WatchersStatusBannerProps> = ({
  totalWatchers,
  activeWatchers,
  selectedCategoryTitle,
  isBulkMutating,
  onResumeAll,
  onOpenManager,
}) => {
  if (totalWatchers === 0 || activeWatchers > 0) return null;

  return (
    <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
      <div className="flex items-start sm:items-center gap-2.5 min-w-0">
        <PauseCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5 sm:mt-0" />
        <div className="min-w-0">
          <div className="font-semibold text-amber-900 dark:text-amber-200">
            {selectedCategoryTitle
              ? `Все вотчеры темы «${selectedCategoryTitle}» (${totalWatchers}) на паузе`
              : `Все вотчеры (${totalWatchers}) сейчас на паузе`}
          </div>
          <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
            Автосбор и «Опросить все» работают только для включённых источников.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenManager}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-500/35 text-amber-800 dark:text-amber-200 hover:bg-amber-500/15 font-semibold transition-colors cursor-pointer"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Настроить</span>
        </button>
        <button
          type="button"
          disabled={isBulkMutating}
          onClick={onResumeAll}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold transition-colors cursor-pointer disabled:opacity-50"
        >
          {isBulkMutating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current" />
          )}
          <span>Включить все</span>
        </button>
      </div>
    </div>
  );
};
