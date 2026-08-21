import React, { useMemo } from 'react';
import {
  Note,
  NoteTypeColors,
  NoteTypeLabels,
  getDaysDifference,
} from '@lenta/shared';
import dayjs from 'dayjs';
import { GanttChartSquare, Clock, ArrowRight, Layers } from 'lucide-react';

interface GanttViewProps {
  notes: Note[];
  startDate: string;
  endDate: string;
  isLoading: boolean;
  onSelectNote: (note: Note) => void;
}

export const GanttView: React.FC<GanttViewProps> = ({
  notes,
  startDate,
  endDate,
  isLoading,
  onSelectNote,
}) => {
  const windowStart = useMemo(() => dayjs(startDate).startOf('day'), [startDate]);
  const windowEnd = useMemo(() => dayjs(endDate).endOf('day'), [endDate]);
  const totalDays = useMemo(() => Math.max(1, windowEnd.diff(windowStart, 'day') + 1), [windowStart, windowEnd]);

  // Generate day columns header
  const days = useMemo(() => {
    const arr: dayjs.Dayjs[] = [];
    for (let i = 0; i < totalDays; i++) {
      arr.push(windowStart.add(i, 'day'));
    }
    return arr;
  }, [windowStart, totalDays]);

  // Filter notes that have duration or are PERIOD notes, plus group by Feed
  const swimlanes = useMemo(() => {
    // Include PERIOD notes and any note that spans more than 0 days
    const periodNotes = notes.filter((n) => n.type === 'PERIOD' || n.endDate);

    // Group by Feed title
    const groups: Record<string, { feedTitle: string; feedSlug?: string; notes: Note[] }> = {};

    for (const note of periodNotes) {
      const feedKey = note.feed?.title || 'Unassigned Feed';
      if (!groups[feedKey]) {
        groups[feedKey] = {
          feedTitle: feedKey,
          feedSlug: note.feed?.slug,
          notes: [],
        };
      }
      groups[feedKey].notes.push(note);
    }

    return Object.values(groups);
  }, [notes]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-neutral-400">
        <div className="w-10 h-10 border-2 border-[#c9cd58] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Computing Gantt swimlanes...</p>
      </div>
    );
  }

  if (swimlanes.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-neutral-400">
        <div className="w-16 h-16 rounded-2xl bg-surface-elevated/60 border border-border flex items-center justify-center text-3xl mb-4 shadow-sm">
          📊
        </div>
        <h3 className="text-base font-semibold text-white mb-1">No multi-day periods in this range</h3>
        <p className="text-xs text-neutral-500 max-w-sm">
          Select a broader date window or switch to Timeline View to see point events.
        </p>
      </div>
    );
  }

  // Calculate position & width percentage of a note within the time window
  const computeBarPosition = (note: Note) => {
    const noteStart = dayjs(note.startDate);
    const noteEnd = note.endDate ? dayjs(note.endDate) : windowEnd;

    // Clamped start & end
    const clampedStart = noteStart.isBefore(windowStart) ? windowStart : noteStart;
    const clampedEnd = noteEnd.isAfter(windowEnd) ? windowEnd : noteEnd;

    const startOffsetDays = Math.max(0, clampedStart.diff(windowStart, 'day', true));
    const durationDays = Math.max(0.5, clampedEnd.diff(clampedStart, 'day', true) + 1);

    const leftPercent = Math.min(100, Math.max(0, (startOffsetDays / totalDays) * 100));
    const widthPercent = Math.min(100 - leftPercent, Math.max(2, (durationDays / totalDays) * 100));

    const isOngoing = !note.endDate;
    const totalDurationText = note.endDate
      ? `${Math.max(1, noteEnd.diff(noteStart, 'day'))} days`
      : 'Ongoing';

    return {
      left: `${leftPercent}%`,
      width: `${widthPercent}%`,
      isOngoing,
      totalDurationText,
    };
  };

  return (
    <div className="flex-1 overflow-x-auto overflow-y-auto px-4 lg:px-6 py-4 max-w-7xl mx-auto w-full">
      <div className="min-w-[850px] bg-surface/80 border border-border/80 rounded-2xl p-4 shadow-glow-card">
        {/* Top Header: Timeline Grid Days */}
        <div className="flex border-b border-border/80 pb-3 mb-4 sticky top-0 bg-[#16191b] z-20">
          <div className="w-52 flex-shrink-0 text-xs font-bold text-neutral-400 uppercase tracking-wider pl-2 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#c9cd58]" />
            <span>Feed / Channel</span>
          </div>

          <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
            {days.map((d, i) => {
              const isToday = d.isSame(dayjs(), 'day');
              const isWeekend = d.day() === 0 || d.day() === 6;
              return (
                <div
                  key={i}
                  className={`text-center px-1 border-l border-border/30 ${
                    isToday ? 'bg-[#c9cd58]/10 text-[#d4e157] font-bold rounded' : isWeekend ? 'text-neutral-500' : 'text-neutral-400'
                  }`}
                >
                  <div className="text-[10px] font-mono uppercase">{d.format('dd')}</div>
                  <div className="text-xs font-mono">{d.format('D')}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Swimlane Groups */}
        <div className="space-y-6">
          {swimlanes.map((lane) => (
            <div key={lane.feedTitle} className="space-y-2">
              {/* Lane Header */}
              <div className="flex items-center gap-2 pb-1 border-b border-border/40">
                <span className="text-xs font-bold text-white font-mono uppercase tracking-wide">
                  {lane.feedTitle}
                </span>
                <span className="text-[10px] font-mono text-neutral-500 bg-surface-elevated px-1.5 py-0.5 rounded">
                  {lane.notes.length} {lane.notes.length === 1 ? 'period' : 'periods'}
                </span>
              </div>

              {/* Lane Notes Bars */}
              <div className="space-y-2 relative">
                {lane.notes.map((note) => {
                  const bar = computeBarPosition(note);
                  const colors = NoteTypeColors[note.type] || NoteTypeColors.PERIOD;

                  return (
                    <div
                      key={note.id}
                      className="flex items-center h-10 hover:bg-surface-elevated/40 rounded-xl transition-colors relative group"
                    >
                      {/* Left Title Label */}
                      <div
                        className="w-52 flex-shrink-0 pr-3 truncate text-xs font-medium text-neutral-200 group-hover:text-white cursor-pointer"
                        onClick={() => onSelectNote(note)}
                        title={note.title}
                      >
                        {note.title}
                      </div>

                      {/* Timeline Bar Track */}
                      <div className="flex-1 relative h-7 bg-surface-elevated/30 rounded-lg overflow-hidden border border-border/40">
                        <div
                          onClick={() => onSelectNote(note)}
                          className="absolute top-0 bottom-0 rounded-md cursor-pointer transition-all duration-200 flex items-center px-2.5 overflow-hidden shadow-sm hover:ring-2 hover:ring-[#c9cd58]/60"
                          style={{
                            left: bar.left,
                            width: bar.width,
                            backgroundColor: colors.bg,
                            border: `1px solid ${colors.border}`,
                          }}
                        >
                          <span
                            className="text-xs font-semibold truncate select-none font-sans"
                            style={{ color: colors.text }}
                          >
                            {note.title}
                          </span>
                          <span className="ml-auto text-[10px] font-mono opacity-80 pl-2 text-neutral-300 whitespace-nowrap">
                            {bar.totalDurationText}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
