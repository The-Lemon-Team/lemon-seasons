import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Note } from '@lenta/shared';
import { FileText, Sparkles, ChevronRight, Plus, Eye, Copy, Check } from 'lucide-react';
import { NoteTypeBadge } from '../../../components/NoteTypeBadge';
import { useAdminI18n } from '../../../i18n';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ru';

dayjs.extend(relativeTime);
dayjs.locale('ru');

interface RecentNotesCubeProps {
  notesTotal: number;
  newNotesCount?: number;
  recentNotes: Note[];
  onSelectNote: (noteId: string) => void;
  className?: string;
}

export const RecentNotesCube: React.FC<RecentNotesCubeProps> = ({
  notesTotal,
  newNotesCount = 24,
  recentNotes,
  onSelectNote,
  className = '',
}) => {
  const { t } = useAdminI18n();
  const navigate = useNavigate();
  const [activeType, setActiveType] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter notes by type
  const filteredNotes = useMemo(() => {
    if (activeType === 'all') return recentNotes;
    return recentNotes.filter((n) => n.type?.toLowerCase() === activeType.toLowerCase());
  }, [recentNotes, activeType]);

  const handleCopyId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div
      className={`w-full h-[340px] min-h-[340px] max-h-[340px] flex flex-col platform-tile relative p-2.5 overflow-hidden shadow-sm hover:border-emerald-500/30 transition-colors duration-150 bg-[radial-gradient(ellipse_at_top_left,_rgba(16,185,129,0.10),_transparent_70%)] ${className}`}
    >
      {/* Ghost Watermark Icon for instant distant recognition */}
      <FileText className="absolute -right-3 -top-3 w-28 h-28 text-emerald-500/[0.07] pointer-events-none select-none -rotate-12" />

      {/* Distinctive Top Accent Gradient */}
      <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-emerald-500 via-teal-400 to-transparent" />

      {/* 1. Header (Metric Summary matching screenshot) - Locked height h-[68px] */}
      <div
        onClick={() => navigate('/notes')}
        className="cursor-pointer group pb-1.5 border-b border-tile-border/60 dark:border-white/[0.05] h-[68px] min-h-[68px] max-h-[68px] shrink-0 flex flex-col justify-between relative z-10 select-none"
      >
        <div className="flex items-center justify-between text-on-surface-variant h-4 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="p-1 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center justify-center shrink-0">
              <FileText className="w-3 h-3 text-emerald-400" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider font-semibold truncate">
              {t.totalNotesMetric || 'Всего заметок'}
            </span>
          </div>

          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0 whitespace-nowrap ml-1.5">
            📝 База знаний
          </span>
        </div>

        <div className="flex items-baseline justify-between gap-1 h-7 shrink-0">
          <div className="font-sans font-bold text-2xl text-emerald-400">
            {notesTotal}
          </div>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 shrink-0 whitespace-nowrap">
            <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
            <span>+{newNotesCount} новые</span>
          </span>
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono text-on-surface-variant/70 h-3.5 shrink-0">
          <span className="truncate">{t.singleTruthSub || 'Единый источник правды'}</span>
          <span className="text-emerald-400/90 font-medium shrink-0 whitespace-nowrap">За последние 24ч</span>
        </div>
      </div>

      {/* 2. Interactive Type Filter Pills - Locked height h-7, no wrap reflow */}
      <div className="h-7 min-h-[28px] max-h-[28px] flex items-center justify-between gap-1 shrink-0 my-1 relative z-10">
        <div className="flex items-center gap-1 shrink-0 overflow-x-auto no-scrollbar">
          {(
            [
              { id: 'all', label: `Все (${recentNotes.length})` },
              { id: 'event', label: '📅 События' },
              { id: 'fact', label: '⚡ Факты' },
              { id: 'period', label: '⏳ Периоды' },
            ] as const
          ).map((type) => (
            <button
              key={type.id}
              onClick={() => setActiveType(type.id)}
              className={`h-6 px-1.5 py-0.5 rounded text-[9px] font-mono font-medium transition-colors cursor-pointer shrink-0 border whitespace-nowrap ${
                activeType === type.id
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'border-transparent text-on-surface-variant/70 hover:text-on-surface hover:bg-tile-subtle'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => navigate('/notes')}
          className="text-secondary hover:text-primary transition-colors flex items-center text-[10px] font-mono shrink-0 p-1"
          title="Открыть всю базу"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 3. High-Density List of Recent Notes - Stable gutter, no reflow */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar [scrollbar-gutter:stable] space-y-1 pr-0.5 relative z-10">
        {filteredNotes.length === 0 ? (
          <div className="h-full min-h-[140px] flex items-center justify-center text-center text-on-surface-variant text-xs font-mono">
            Заметок в этой выборке нет
          </div>
        ) : (
          filteredNotes.map((note) => {
            const dateVal = note.startDate || (note as any).createdAt;
            const formattedDate = dateVal && dayjs(dateVal).isValid()
              ? dayjs(dateVal).format('DD.MM.YYYY')
              : '';
            const contentText = note.description || note.rawContent || note.summary || '';
            const wordCount = contentText ? contentText.trim().split(/\s+/).length : 0;

            return (
              <div
                key={note.id}
                onClick={() => onSelectNote(note.id)}
                className="group h-8 min-h-[32px] max-h-[32px] px-2 rounded-lg bg-tile-subtle/50 hover:bg-tile-subtle border border-tile-border dark:border-white/[0.04] hover:border-tile-border-hover dark:hover:border-white/[0.10] transition-colors duration-150 flex items-center justify-between gap-1.5 cursor-pointer relative shrink-0 overflow-hidden"
              >
                {/* Left: Type Badge + Title */}
                <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
                  <NoteTypeBadge type={note.type} size="sm" />
                  <span className="font-sans font-medium text-[11px] text-on-surface truncate group-hover:text-primary transition-colors">
                    {note.title}
                  </span>
                </div>

                {/* Middle Quick Actions on hover */}
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0 transition-opacity">
                  <button
                    onClick={(e) => handleCopyId(e, note.id)}
                    className="p-1 rounded text-on-surface-variant/60 hover:text-primary hover:bg-tile-muted cursor-pointer"
                    title={`Скопировать ID: ${note.id}`}
                  >
                    {copiedId === note.id ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectNote(note.id);
                    }}
                    className="p-1 rounded text-on-surface-variant/60 hover:text-primary hover:bg-tile-muted cursor-pointer"
                    title="Открыть ридер"
                  >
                    <Eye className="w-3 h-3" />
                  </button>
                </div>

                {/* Right: Word Count Pill + Standard Date */}
                <div className="flex items-center gap-1.5 shrink-0 group-hover:hidden">
                  {wordCount > 0 && (
                    <span className="text-[9px] font-mono text-on-surface-variant/50 hidden sm:inline whitespace-nowrap">
                      {wordCount} сл.
                    </span>
                  )}
                  {formattedDate && (
                    <span className="text-[9px] font-mono text-on-surface-variant/60 whitespace-nowrap">
                      {formattedDate}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. Mini Footer with Quick Action - Locked height h-6 */}
      <div className="h-6 min-h-[24px] max-h-[24px] pt-1 border-t border-tile-border/50 dark:border-white/[0.04] flex items-center justify-between text-[10px] font-mono shrink-0 text-on-surface-variant/70 relative z-10">
        <button
          onClick={() => navigate('/notes/new')}
          className="text-primary hover:underline flex items-center gap-1 font-semibold cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-3 h-3 shrink-0" />
          <span>Создать заметку</span>
        </button>
        <span className="text-on-surface-variant/60 whitespace-nowrap">{notesTotal} записей в базе</span>
      </div>
    </div>
  );
};
