import React from 'react';
import { Note, NoteType, NoteTypeLabels, NoteTypeColors } from '@lenta/shared';
import { Sparkles, Layers, Clock } from 'lucide-react';

interface StatsBarProps {
  notes: Note[];
  isLoading: boolean;
  total: number;
}

export const StatsBar: React.FC<StatsBarProps> = ({ notes, isLoading, total }) => {
  if (isLoading) {
    return (
      <div className="h-10 bg-surface-elevated/40 animate-pulse rounded-xl border border-border/50 mx-4 lg:mx-6 my-3" />
    );
  }

  const countsByType = notes.reduce((acc, n) => {
    acc[n.type] = (acc[n.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const uniqueFeeds = new Set(notes.map((n) => n.feed?.title).filter(Boolean)).size;

  return (
    <div className="mx-4 lg:mx-6 my-3 px-4 py-2.5 rounded-xl bg-surface/60 border border-border/70 flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 font-medium text-white">
          <Sparkles className="w-3.5 h-3.5 text-[#c9cd58]" />
          <span>{total} entries in range</span>
        </div>
        <span className="text-neutral-600">•</span>
        <div className="flex items-center gap-1.5 text-neutral-400">
          <Layers className="w-3.5 h-3.5 text-neutral-400" />
          <span>{uniqueFeeds} active feeds</span>
        </div>
      </div>

      {/* Note Types pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {Object.entries(countsByType).map(([type, count]) => {
          const t = type as NoteType;
          const colors = NoteTypeColors[t];
          return (
            <div
              key={type}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono border"
              style={{
                backgroundColor: colors?.bg || '#1e2225',
                color: colors?.text || '#e1e4e6',
                borderColor: colors?.border || '#2e4053',
              }}
            >
              <span>{count}</span>
              <span className="opacity-80 font-sans">{NoteTypeLabels[t] || type}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
