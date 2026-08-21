import React, { useMemo } from 'react';
import { Note, NoteTypeColors, NoteTypeLabels, formatLocalDateKey } from '@lenta/shared';
import dayjs from 'dayjs';
import { Clock, Calendar as CalendarIcon, Tag } from 'lucide-react';

interface MonthGridViewProps {
  notes: Note[];
  startDate: string; // ISO
  onSelectNote: (note: Note) => void;
  onSelectDay?: (dateKey: string) => void;
}

export const MonthGridView: React.FC<MonthGridViewProps> = ({
  notes,
  startDate,
  onSelectNote,
  onSelectDay,
}) => {
  const currentMonth = dayjs(startDate);
  const startOfMonth = currentMonth.startOf('month');
  const endOfMonth = currentMonth.endOf('month');

  // Build calendar matrix (42 cells: 6 weeks x 7 days)
  const calendarCells = useMemo(() => {
    const cells: Array<{
      date: dayjs.Dayjs;
      dateKey: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      notes: Note[];
    }> = [];

    // Week start on Monday (isoWeek) or Sunday
    let cursor = startOfMonth.startOf('week');
    const todayKey = dayjs().format('YYYY-MM-DD');

    // Index notes by dateKey
    const notesByDate: Record<string, Note[]> = {};
    for (const note of notes) {
      const key = formatLocalDateKey(note.startDate);
      if (!notesByDate[key]) notesByDate[key] = [];
      notesByDate[key].push(note);
    }

    for (let i = 0; i < 42; i++) {
      const dateKey = cursor.format('YYYY-MM-DD');
      cells.push({
        date: cursor,
        dateKey,
        isCurrentMonth: cursor.isSame(currentMonth, 'month'),
        isToday: dateKey === todayKey,
        notes: notesByDate[dateKey] || [],
      });
      cursor = cursor.add(1, 'day');
    }

    return cells;
  }, [notes, currentMonth, startOfMonth]);

  const weekDayHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="flex-1 flex flex-col p-4 lg:p-6 overflow-hidden h-[calc(100vh-120px)] max-w-7xl mx-auto w-full">
      {/* Calendar Header Month Title */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-[#c9cd58]" />
          <h2 className="text-lg font-bold text-white font-mono tracking-wide uppercase">
            {currentMonth.format('MMMM YYYY')}
          </h2>
        </div>
        <span className="text-xs font-mono text-[#c9c7b2] bg-[#1e2020] px-2.5 py-1 rounded border border-[#242828]">
          {notes.length} Total Events
        </span>
      </div>

      {/* Weekday Columns Header */}
      <div className="grid grid-cols-7 border-t border-l border-[#242828] bg-[#1a1c1c] text-center font-mono text-xs text-[#c9c7b2] py-2 font-medium">
        {weekDayHeaders.map((day) => (
          <div key={day} className="border-r border-[#242828] uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {/* 6-Week Month Grid Matrix */}
      <div className="grid grid-cols-7 flex-1 border-t border-l border-[#242828] bg-[#121414] overflow-y-auto">
        {calendarCells.map((cell) => {
          return (
            <div
              key={cell.dateKey}
              onClick={() => onSelectDay?.(cell.dateKey)}
              className={`min-h-[110px] border-r border-b border-[#242828] p-2 flex flex-col transition-colors group ${
                cell.isCurrentMonth ? 'bg-[#121414]' : 'bg-[#0d0f0f]/80 opacity-50'
              } ${
                cell.isToday
                  ? 'border-2 border-[#c9cd58] bg-[#c9cd58]/5'
                  : 'hover:bg-[#1a1c1c]'
              }`}
            >
              {/* Day Number Header */}
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`text-xs font-mono font-semibold px-1.5 py-0.5 rounded ${
                    cell.isToday
                      ? 'bg-[#c9cd58] text-[#121414] font-bold shadow-glow-lemon'
                      : cell.isCurrentMonth
                      ? 'text-[#e2e2e2]'
                      : 'text-[#93927e]'
                  }`}
                >
                  {cell.date.format('D')}
                </span>

                {cell.notes.length > 0 && (
                  <span className="text-[10px] font-mono text-[#c9cd58] bg-[#282a2a] px-1 rounded">
                    {cell.notes.length}
                  </span>
                )}
              </div>

              {/* Event Pills List */}
              <div className="flex flex-col gap-1 overflow-y-auto max-h-[85px] no-scrollbar">
                {cell.notes.map((note) => {
                  const typeColor = NoteTypeColors[note.type] || NoteTypeColors.EVENT;
                  const startHour = dayjs(note.startDate).format('HH:mm');

                  return (
                    <button
                      key={note.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectNote(note);
                      }}
                      className="text-left w-full px-1.5 py-0.5 rounded text-[11px] font-mono truncate transition-all duration-150 flex items-center gap-1 hover:brightness-125 border"
                      style={{
                        backgroundColor: typeColor.bg,
                        color: typeColor.text,
                        borderColor: typeColor.border,
                      }}
                      title={`${startHour} - ${note.title}`}
                    >
                      <span className="opacity-80 text-[10px]">{startHour}</span>
                      <span className="truncate">{note.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
