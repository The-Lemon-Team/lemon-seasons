import React from 'react';
import dayjs from 'dayjs';
import { ChevronLeft, ChevronRight, X, Plus, Sparkles, ArrowUpRight } from 'lucide-react';
import { useI18n } from '../../i18n';

interface DaySidebarHeaderProps {
  targetDate: dayjs.Dayjs;
  dateKey: string;
  notesCount: number;
  relativeBadge: { label: string; isCurrent: boolean } | null;
  onPrevDay: () => void;
  onNextDay: () => void;
  onClose: () => void;
  onOpenCreateNote: () => void;
  onNavigateToTimeline?: (dateKey: string) => void;
}

export const DaySidebarHeader: React.FC<DaySidebarHeaderProps> = ({
  targetDate,
  dateKey,
  notesCount,
  relativeBadge,
  onPrevDay,
  onNextDay,
  onClose,
  onOpenCreateNote,
  onNavigateToTimeline,
}) => {
  const { t } = useI18n();

  return (
    <div className="p-4 sm:p-5 border-b border-[#242828] bg-[#1a1d1d]/90 backdrop-blur-md flex flex-col gap-3">
      {/* Top Bar: Stepper & Close */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 bg-[#121414] p-1 rounded-lg border border-[#242828]">
          <button
            type="button"
            onClick={onPrevDay}
            className="p-1 rounded text-[#c9c7b2] hover:text-white hover:bg-[#282a2a] transition-colors"
            title="Предыдущий день"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-[#c9c7b2] px-1 font-semibold capitalize">
            {targetDate.format('ddd')}
          </span>
          <button
            type="button"
            onClick={onNextDay}
            className="p-1 rounded text-[#c9c7b2] hover:text-white hover:bg-[#282a2a] transition-colors"
            title="Следующий день"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {relativeBadge && (
            <span
              className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full font-medium border ${
                relativeBadge.isCurrent
                  ? 'bg-[#c9cd58] text-[#121414] font-bold border-[#c9cd58]'
                  : 'bg-[#242828] text-[#c9c7b2] border-[#333535]'
              }`}
            >
              {relativeBadge.label}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#282a2a] transition-colors"
            title={t.close}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Date Heading & Count */}
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h2 className="text-lg sm:text-xl font-bold font-mono text-white tracking-tight capitalize">
            {targetDate.format('D MMMM YYYY')}
          </h2>
          <p className="text-xs font-mono text-[#93927e] capitalize">
            {targetDate.format('dddd')}
          </p>
        </div>

        <div className="text-right">
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-[#c9cd58]/10 text-[#e5e971] border border-[#c9cd58]/30 font-semibold inline-block">
            {t.eventsCount(notesCount)}
          </span>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex items-center gap-2 pt-1">
        {onNavigateToTimeline && (
          <button
            type="button"
            onClick={() => onNavigateToTimeline(dateKey)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-[#1f2323] hover:bg-[#2a2f2f] text-[#c9c7b2] hover:text-[#e5e971] border border-[#2e3333] hover:border-[#c9cd58]/50 transition-all group"
            title={t.openInTimeline}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#c9cd58] group-hover:scale-110 transition-transform" />
            <span>{t.openInTimeline}</span>
            <ArrowUpRight className="w-3 h-3 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all text-[#c9cd58]" />
          </button>
        )}

        <button
          type="button"
          onClick={onOpenCreateNote}
          className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono bg-[#c9cd58] hover:bg-[#dce06b] text-[#121414] font-bold transition-all shadow-sm"
          title={t.newEntry}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t.addEntry}</span>
        </button>
      </div>
    </div>
  );
};
