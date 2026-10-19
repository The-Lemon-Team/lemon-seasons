import React, { useState, useMemo } from 'react';
import { Note, NoteType, NoteTypeColors, NOTE_TYPES } from '@lenta/shared';
import dayjs from 'dayjs';
import {
  Clock,
  CheckCircle2,
  Circle,
  Folder,
  Rss,
  Edit3,
  Search,
  X,
  Plus,
  Calendar as CalendarIcon,
  ChevronRight,
  Headphones,
} from 'lucide-react';
import { useI18n } from '../../i18n';
import { calendarApi } from '../../api/client';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../api/queries';

interface DayFeedStreamProps {
  notes: Note[];
  targetDate: dayjs.Dayjs;
  dateKey: string;
  onSelectNote: (note: Note) => void;
  onEditNote: (note: Note) => void;
  onOpenCreateNote: () => void;
}

export const DayFeedStream: React.FC<DayFeedStreamProps> = ({
  notes,
  targetDate,
  dateKey,
  onSelectNote,
  onEditNote,
  onOpenCreateNote,
}) => {
  const { t, getTypeLabel } = useI18n();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<NoteType | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DONE'>('ALL');

  // Filter notes
  const filteredNotes = useMemo(() => {
    let list = [...notes];

    if (selectedTypeFilter !== 'ALL') {
      list = list.filter((n) => n.type === selectedTypeFilter);
    }

    if (statusFilter === 'DONE') {
      list = list.filter((n) => n.type === 'DONE');
    } else if (statusFilter === 'ACTIVE') {
      list = list.filter((n) => n.type !== 'DONE');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.description?.toLowerCase().includes(q) ||
          n.feed?.title.toLowerCase().includes(q) ||
          n.folders?.some((f) => f.folder?.path.toLowerCase().includes(q)) ||
          n.hashtags?.some((h) => h.name.toLowerCase().includes(q))
      );
    }

    return list.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [notes, selectedTypeFilter, statusFilter, searchQuery]);

  // Toggle DONE status
  const handleToggleDone = async (e: React.MouseEvent, note: Note) => {
    e.stopPropagation();
    const nextType: NoteType = note.type === 'DONE' ? 'SINGLE' : 'DONE';
    try {
      await calendarApi.updateNote(note.id, { type: nextType });
      await queryClient.invalidateQueries({ queryKey: queryKeys.allNotes });
    } catch (err) {
      console.error('Failed to toggle note status:', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#141617]">
      {/* Search & Quick Filters Bar */}
      {notes.length > 0 && (
        <div className="p-3 border-b border-[#242828] bg-[#161819] flex flex-col gap-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Поиск по событиям дня..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121414] border border-[#242828] focus:border-[#c9cd58] rounded text-xs font-mono pl-8 pr-7 py-1 text-white placeholder-neutral-500 outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Status Segmented Controls */}
          <div className="flex items-center gap-1 text-[10px] font-mono">
            {(['ALL', 'ACTIVE', 'DONE'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setStatusFilter(mode)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  statusFilter === mode
                    ? 'bg-[#c9cd58]/20 text-[#e5e971] border border-[#c9cd58]/40 font-bold'
                    : 'bg-[#121414] text-neutral-400 hover:text-white border border-[#242828]'
                }`}
              >
                {mode === 'ALL' ? 'Все' : mode === 'ACTIVE' ? 'Предстоящие' : 'Выполненные'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chronological Feed Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
        {filteredNotes.length === 0 ? (
          <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-6 bg-[#181a1a]/40 rounded-2xl border border-dashed border-[#282a2a] my-auto">
            <div className="w-12 h-12 rounded-2xl bg-[#242828]/60 border border-[#333535] flex items-center justify-center text-neutral-400 mb-3 shadow-inner">
              <CalendarIcon className="w-6 h-6 text-[#c9cd58]/70" />
            </div>
            <h3 className="text-sm font-bold font-mono text-neutral-200 mb-1">
              {searchQuery || statusFilter !== 'ALL' || selectedTypeFilter !== 'ALL'
                ? t.emptyTimeline
                : 'Нет записей на этот день'}
            </h3>
            <p className="text-xs font-mono text-neutral-400 max-w-xs mb-4">
              {targetDate.format('D MMMM YYYY')}
            </p>

            <button
              type="button"
              onClick={onOpenCreateNote}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#c9cd58] text-[#121414] hover:bg-[#dce06b] font-bold text-xs font-mono transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Создать запись</span>
            </button>
          </div>
        ) : (
          filteredNotes.map((note) => {
            const isDone = note.type === 'DONE';
            const typeColor = NoteTypeColors[note.type] || NoteTypeColors.EVENT;
            const startDay = dayjs(note.startDate);
            const startHour = startDay.format('HH:mm');
            const timeDisplay = startHour !== '00:00' ? startHour : 'Весь день';
            const primaryFolder =
              note.folders?.find((f) => f.isPrimary)?.folder?.path || note.folderPath;
            const meta = (note.metadata as any) || {};
            const hasAudio = Boolean(meta.audioUrl || meta.podcast?.audioUrl);

            return (
              <article
                key={note.id}
                onClick={() => onSelectNote(note)}
                className={`group p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-2.5 relative select-none ${
                  isDone
                    ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/60 opacity-90'
                    : 'bg-[#181a1a] border-[#242828] hover:border-[#c9cd58]/60 hover:bg-[#1e2121]'
                }`}
              >
                {/* Header row: Status toggle, Time badge, Type pill, Feed */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleToggleDone(e, note)}
                      className={`transition-colors shrink-0 ${
                        isDone ? 'text-emerald-400' : 'text-neutral-500 hover:text-neutral-300'
                      }`}
                      title={isDone ? 'Отметить как невыполненное' : 'Отметить как выполненное'}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 fill-emerald-500/20" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </button>

                    <div className="flex items-center gap-1 text-[11px] font-mono text-neutral-300 bg-[#121414] px-2 py-0.5 rounded border border-[#242828]">
                      <Clock className="w-3 h-3 text-[#c9cd58]" />
                      <span>{timeDisplay}</span>
                    </div>

                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-mono font-medium border"
                      style={{
                        backgroundColor: typeColor.bg,
                        color: typeColor.text,
                        borderColor: typeColor.border,
                      }}
                    >
                      {getTypeLabel(note.type)}
                    </span>
                  </div>

                  {/* Actions: Edit icon, detail arrow */}
                  <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                    {hasAudio && (
                      <span className="p-1 rounded text-purple-400" title="Содержит аудиоподкаст">
                        <Headphones className="w-3.5 h-3.5" />
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditNote(note);
                      }}
                      className="p-1 rounded text-neutral-400 hover:text-[#e5e971] hover:bg-[#282a2a] transition-colors"
                      title={t.editNote}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-[#c9cd58] transition-colors" />
                  </div>
                </div>

                {/* Title */}
                <h3
                  className={`text-sm font-semibold font-mono text-white leading-snug transition-colors ${
                    isDone ? 'line-through text-neutral-400' : 'group-hover:text-[#e5e971]'
                  }`}
                >
                  {note.title}
                </h3>

                {/* Description excerpt */}
                {note.description && (
                  <p className="text-xs text-[#c9c7b2] line-clamp-2 leading-relaxed font-sans">
                    {note.description}
                  </p>
                )}

                {/* Footer metadata: Folder, Feed, Hashtags */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#242828]/60 text-[10px] font-mono">
                  <div className="flex items-center gap-2 flex-wrap">
                    {primaryFolder && (
                      <span className="inline-flex items-center gap-1 text-[#93927e] bg-[#121414] px-1.5 py-0.5 rounded">
                        <Folder className="w-2.5 h-2.5" />
                        <span className="truncate max-w-[140px]">{primaryFolder}</span>
                      </span>
                    )}

                    {note.feed && (
                      <span className="inline-flex items-center gap-1 text-[#c9c7b2] bg-[#121414] px-1.5 py-0.5 rounded border border-[#242828]">
                        <Rss className="w-2.5 h-2.5 text-[#c9cd58]" />
                        <span className="truncate max-w-[120px]">{note.feed.title}</span>
                      </span>
                    )}
                  </div>

                  {note.hashtags && note.hashtags.length > 0 && (
                    <div className="flex items-center gap-1 text-[#e5e971]">
                      #{note.hashtags[0].name.replace(/^#/, '')}
                    </div>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};
