import React from 'react';
import { EyeOff, Loader2, Send } from 'lucide-react';

export interface WatchersBatchBarProps {
  selectedCount: number;
  totalCount: number;
  isBatchMutating: boolean;
  onClearSelection: () => void;
  onBatchDismiss: () => void;
  onBatchPromote: () => void;
}

export const WatchersBatchBar: React.FC<WatchersBatchBarProps> = ({
  selectedCount,
  totalCount,
  isBatchMutating,
  onClearSelection,
  onBatchDismiss,
  onBatchPromote,
}) => {
  if (selectedCount <= 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] max-w-xl">
      <div className="rounded-2xl bg-white/95 dark:bg-[#18222d]/95 backdrop-blur-md border border-[#2481cc]/35 shadow-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono font-bold text-[#2481cc] tabular-nums whitespace-nowrap">
            Выбрано: {selectedCount}
          </span>
          <span className="text-slate-400 dark:text-slate-500 font-mono tabular-nums hidden sm:inline">
            / {totalCount}
          </span>
          <button
            type="button"
            onClick={onClearSelection}
            className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline cursor-pointer whitespace-nowrap ml-1"
          >
            Снять
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={isBatchMutating}
            onClick={onBatchDismiss}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/10 font-medium cursor-pointer whitespace-nowrap transition-colors disabled:opacity-50"
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span>Скрыть ({selectedCount})</span>
          </button>
          <button
            type="button"
            disabled={isBatchMutating}
            onClick={onBatchPromote}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#2481cc] hover:bg-[#1e6cb0] text-white font-semibold cursor-pointer whitespace-nowrap transition-colors shadow-xs disabled:opacity-50"
          >
            {isBatchMutating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>В шину ({selectedCount})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
