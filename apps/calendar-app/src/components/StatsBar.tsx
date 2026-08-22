import React from 'react';
import { Note, NoteType, NoteTypeColors } from '@lenta/shared';
import { Sparkles, Layers } from 'lucide-react';
import { useI18n } from '../i18n';

interface StatsBarProps {
  notes: Note[];
  isLoading: boolean;
  total: number;
}

export const StatsBar: React.FC<StatsBarProps> = ({ notes, isLoading, total }) => {
  const { t, getTypeLabel } = useI18n();

  if (isLoading) {
    return (
      <div className="h-11 bg-surface-elevated/40 animate-pulse rounded-xl border border-border/50 mx-4 lg:mx-6 my-3" />
    );
  }

  const countsByType = notes.reduce((acc, n) => {
    acc[n.type] = (acc[n.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const uniqueFeeds = new Set(notes.map((n) => n.feed?.title).filter(Boolean)).size;

  return (
    <div className="mx-4 lg:mx-6 my-3 px-4 py-2 h-11 rounded-xl bg-surface/60 border border-border/70 flex items-center justify-between gap-3 text-xs overflow-hidden box-border">
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-1.5 font-medium text-white">
          <Sparkles className="w-3.5 h-3.5 text-[#c9cd58]" />
          <span>
            {t.entriesInRange(total)}
          </span>
        </div>
        <span className="text-neutral-600">•</span>
        <div className="flex items-center gap-1.5 text-neutral-400">
          <Layers className="w-3.5 h-3.5 text-neutral-400" />
          <span>
            {t.activeFeeds(uniqueFeeds)}
          </span>
        </div>
      </div>

      {/* Note Types pills */}
      <div className="flex items-center gap-2 flex-nowrap overflow-x-auto no-scrollbar min-h-[22px]">
        {Object.entries(countsByType).map(([type, count]) => {
          const tKey = type as NoteType;
          const colors = NoteTypeColors[tKey];
          return (
            <div
              key={type}
              className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono border leading-tight"
              style={{
                backgroundColor: colors?.bg || '#1e2225',
                color: colors?.text || '#e1e4e6',
                borderColor: colors?.border || '#2e4053',
              }}
            >
              <span className="tabular-nums font-bold">{count}</span>
              <span className="opacity-80 font-sans">{getTypeLabel(tKey)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

