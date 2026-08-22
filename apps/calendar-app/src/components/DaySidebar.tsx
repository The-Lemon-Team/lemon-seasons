import React, { useEffect, useMemo, useState } from 'react';
import {
  Note,
  NoteType,
  NOTE_TYPES,
  NoteTypeColors,
} from '@lenta/shared';
import dayjs from 'dayjs';
import {
  X,
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  ArrowUpRight,
  Tag,
  Folder,
  Rss,
  Edit3,
  Search,
  Sparkles,
  ChevronRight as ChevronRightIcon,
} from 'lucide-react';
import { useI18n } from '../i18n';

interface DaySidebarProps {
  isOpen: boolean;
  dateKey: string | null;
  notes: Note[];
  onClose: () => void;
  onSelectNote: (note: Note) => void;
  onNavigateToTimeline?: (dateKey: string) => void;
  onSelectDate?: (dateKey: string) => void;
}

export const DaySidebar: React.FC<DaySidebarProps> = ({
  isOpen,
  dateKey,
  notes,
  onClose,
  onSelectNote,
  onNavigateToTimeline,
  onSelectDate,
}) => {
  const { t, getTypeLabel } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<NoteType | 'ALL'>('ALL');

  // Reset local filters when selected date changes
  useEffect(() => {
    setSearchQuery('');
    setSelectedTypeFilter('ALL');
  }, [dateKey]);

  // Handle ESC key to close sidebar
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const targetDate = useMemo(() => {
    return dateKey ? dayjs(dateKey) : dayjs();
  }, [dateKey]);

  // Relative timing text
  const relativeBadge = useMemo(() => {
    if (!dateKey) return null;
    const today = dayjs().startOf('day');
    const target = targetDate.startOf('day');
    const diffDays = target.diff(today, 'day');

    if (diffDays === 0) return { label: t.today, isCurrent: true };
    if (diffDays === 1) return { label: t.tomorrow, isCurrent: false };
    if (diffDays === -1) return { label: t.yesterday, isCurrent: false };
    if (diffDays > 1) return { label: t.inDays(diffDays), isCurrent: false };
    return { label: t.daysAgo(Math.abs(diffDays)), isCurrent: false };
  }, [dateKey, targetDate, t]);

  // Filtered & sorted notes for this day
  const filteredNotes = useMemo(() => {
    let list = [...notes];

    // Filter by type
    if (selectedTypeFilter !== 'ALL') {
      list = list.filter((n) => n.type === selectedTypeFilter);
    }

    // Filter by local search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.description?.toLowerCase().includes(q) ||
          n.feed?.title.toLowerCase().includes(q) ||
          n.tags?.some((tagItem) => tagItem.path.toLowerCase().includes(q)) ||
          n.hashtags?.some((h) => h.name.toLowerCase().includes(q))
      );
    }

    // Sort chronologically by start date/time
    return list.sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
  }, [notes, selectedTypeFilter, searchQuery]);

  // Distinct types in current day notes for quick chips
  const dayTypes = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const note of notes) {
      if (note.type) {
        counts[note.type] = (counts[note.type] || 0) + 1;
      }
    }
    return counts;
  }, [notes]);

  if (!isOpen || !dateKey) return null;

  const handlePrevDay = () => {
    if (onSelectDate) {
      const prev = targetDate.subtract(1, 'day').format('YYYY-MM-DD');
      onSelectDate(prev);
    }
  };

  const handleNextDay = () => {
    if (onSelectDate) {
      const next = targetDate.add(1, 'day').format('YYYY-MM-DD');
      onSelectDate(next);
    }
  };

  return (
    <>
      {/* Optional subtle backdrop on mobile */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
        onClick={onClose}
      />

      <aside className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] lg:w-[460px] bg-[#161819] border-l border-[#242828] shadow-2xl flex flex-col animate-fade-in text-[#e2e2e2]">
        {/* 1. Header with Day Title & Stepper Controls */}
        <div className="p-4 sm:p-5 border-b border-[#242828] bg-[#1a1d1d]/80 backdrop-blur-md flex flex-col gap-3">
          {/* Top Bar: Date controls & Close */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 bg-[#121414] p-1 rounded-lg border border-[#242828]">
              <button
                onClick={handlePrevDay}
                className="p-1 rounded text-[#c9c7b2] hover:text-white hover:bg-[#282a2a] transition-colors"
                title={t.previousMonth}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono text-[#c9c7b2] px-1 font-semibold capitalize">
                {targetDate.format('ddd')}
              </span>
              <button
                onClick={handleNextDay}
                className="p-1 rounded text-[#c9c7b2] hover:text-white hover:bg-[#282a2a] transition-colors"
                title={t.nextMonth}
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
                {t.eventsCount(notes.length)}
              </span>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex items-center gap-2 pt-1">
            {onNavigateToTimeline && (
              <button
                onClick={() => onNavigateToTimeline(dateKey)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-[#1f2323] hover:bg-[#2a2f2f] text-[#c9c7b2] hover:text-[#e5e971] border border-[#2e3333] hover:border-[#c9cd58]/50 transition-all group"
                title={t.openInTimeline}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#c9cd58] group-hover:scale-110 transition-transform" />
                <span>{t.openInTimeline}</span>
                <ArrowUpRight className="w-3 h-3 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all text-[#c9cd58]" />
              </button>
            )}

            <a
              href={`http://localhost:5173/notes/new?startDate=${dateKey}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-[#c9cd58]/15 hover:bg-[#c9cd58]/25 text-[#e5e971] border border-[#c9cd58]/40 hover:border-[#c9cd58] transition-all"
              title={t.newEntry}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.addEntry}</span>
            </a>
          </div>
        </div>

        {/* 2. In-Day Quick Filter & Search (if notes exist) */}
        {notes.length > 0 && (
          <div className="px-4 sm:px-5 py-2.5 bg-[#121414]/90 border-b border-[#242828] flex flex-col gap-2">
            {/* Search Input */}
            {notes.length > 3 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  placeholder={t.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#181a1a] border border-[#242828] focus:border-[#c9cd58] focus:ring-1 focus:ring-[#c9cd58] rounded-md text-xs font-mono pl-8 pr-7 py-1 text-white placeholder-neutral-500 outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {/* Note Type Filter Chips */}
            {Object.keys(dayTypes).length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                <button
                  onClick={() => setSelectedTypeFilter('ALL')}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all border whitespace-nowrap ${
                    selectedTypeFilter === 'ALL'
                      ? 'bg-[#c9cd58]/20 border-[#c9cd58] text-[#e5e971] font-semibold'
                      : 'bg-[#181a1a] border-[#242828] text-neutral-400 hover:text-white'
                  }`}
                >
                  {t.allTypes} ({notes.length})
                </button>

                {NOTE_TYPES.map((type) => {
                  const count = dayTypes[type];
                  if (!count) return null;
                  const isSelected = selectedTypeFilter === type;
                  const colors = NoteTypeColors[type];

                  return (
                    <button
                      key={type}
                      onClick={() =>
                        setSelectedTypeFilter((prev) => (prev === type ? 'ALL' : type))
                      }
                      className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all border whitespace-nowrap ${
                        isSelected
                          ? 'font-bold ring-1 ring-[#c9cd58]/70'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: colors.bg,
                        color: colors.text,
                        borderColor: isSelected ? colors.accent : colors.border,
                      }}
                    >
                      {getTypeLabel(type)} ({count})
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 3. Chronological Agenda List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {filteredNotes.length === 0 ? (
            /* Empty State */
            <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center p-6 bg-[#181a1a]/40 rounded-2xl border border-dashed border-[#282a2a] my-auto">
              <div className="w-12 h-12 rounded-2xl bg-[#242828]/60 border border-[#333535] flex items-center justify-center text-neutral-400 mb-3 shadow-inner">
                <CalendarIcon className="w-6 h-6 text-[#c9cd58]/70" />
              </div>
              <h3 className="text-sm font-bold font-mono text-neutral-200 mb-1">
                {searchQuery || selectedTypeFilter !== 'ALL'
                  ? t.emptyTimeline
                  : t.noNotesForDay}
              </h3>
              <p className="text-xs font-mono text-neutral-400 max-w-xs mb-4">
                {searchQuery || selectedTypeFilter !== 'ALL'
                  ? t.emptyTimelineSub
                  : `${targetDate.format('D MMMM YYYY')}`}
              </p>

              {searchQuery || selectedTypeFilter !== 'ALL' ? (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedTypeFilter('ALL');
                  }}
                  className="text-xs font-mono text-[#c9cd58] hover:underline"
                >
                  {t.clear}
                </button>
              ) : (
                <a
                  href={`http://localhost:5173/notes/new?startDate=${dateKey}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#c9cd58]/10 hover:bg-[#c9cd58]/20 border border-[#c9cd58]/40 hover:border-[#c9cd58] text-xs font-mono text-[#e5e971] transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t.addEntry}</span>
                </a>
              )}
            </div>
          ) : (
            /* Note Cards */
            filteredNotes.map((note) => {
              const typeColor = NoteTypeColors[note.type] || NoteTypeColors.EVENT;
              const startDay = dayjs(note.startDate);
              const endDay = note.endDate ? dayjs(note.endDate) : null;
              const isPeriod = endDay && !endDay.isSame(startDay, 'day');
              const startHour = startDay.format('HH:mm');
              const timeDisplay = isPeriod
                ? `${startDay.format('D MMM')} - ${endDay.format('D MMM')}`
                : startHour !== '00:00'
                ? startHour
                : t.today;

              const primaryFolder =
                note.folders?.find((f) => f.isPrimary)?.folder?.path ||
                note.folders?.[0]?.folder?.path;

              const mainImage = note.images?.find((img) => img.isMain) || note.images?.[0];

              return (
                <div
                  key={note.id}
                  onClick={() => onSelectNote(note)}
                  className="group p-3.5 rounded-xl bg-[#181a1a] border border-[#242828] hover:border-[#c9cd58]/60 hover:bg-[#1e2121] transition-all cursor-pointer flex flex-col gap-2.5 shadow-sm relative overflow-hidden"
                >
                  {/* Top Metadata Row: Type, Feed, Time */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
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

                      {note.feed && (
                        <span className="text-[10px] font-mono text-[#c9c7b2] bg-[#121414] px-1.5 py-0.5 rounded border border-[#242828] flex items-center gap-1">
                          <Rss className="w-2.5 h-2.5 text-[#c9cd58]" />
                          <span>{note.feed.title}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-mono text-neutral-400 bg-[#121414] px-2 py-0.5 rounded border border-[#242828]">
                      <Clock className="w-3 h-3 text-[#c9cd58]" />
                      <span>{timeDisplay}</span>
                    </div>
                  </div>

                  {/* Title & Preview Image */}
                  <div className="flex items-start gap-3 justify-between">
                    <h3 className="text-sm font-semibold font-mono text-white group-hover:text-[#e5e971] transition-colors leading-snug">
                      {note.title}
                    </h3>
                    {mainImage && (
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-black/40 border border-[#242828]">
                        <img
                          src={mainImage.thumbnailUrl || mainImage.url}
                          alt={mainImage.alt || note.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>

                  {/* Description Excerpt */}
                  {note.description && (
                    <p className="text-xs text-[#c9c7b2] line-clamp-2 leading-relaxed">
                      {note.description}
                    </p>
                  )}

                  {/* Taxonomy Tags, Hashtags, Folder Footer */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#242828]/60 text-[10px] font-mono">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {primaryFolder && (
                        <span className="inline-flex items-center gap-1 text-[#93927e] bg-[#121414] px-1.5 py-0.5 rounded">
                          <Folder className="w-2.5 h-2.5" />
                          <span>{primaryFolder}</span>
                        </span>
                      )}

                      {note.tags?.slice(0, 2).map((tagItem) => (
                        <span
                          key={tagItem.id}
                          className="inline-flex items-center gap-0.5 bg-[#121414] px-1.5 py-0.5 rounded text-[#c9c7b2]"
                        >
                          <Tag className="w-2.5 h-2.5 text-[#c9cd58]" />
                          <span>{tagItem.name}</span>
                        </span>
                      ))}

                      {note.hashtags?.slice(0, 2).map((h) => (
                        <span key={h.id} className="text-[#e5e971]">
                          #{h.name.replace(/^#/, '')}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a
                        href={`http://localhost:5173/notes/${note.id}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 hover:text-[#e5e971] transition-colors"
                        title={t.editInAdmin}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </a>
                      <span className="text-[10px] text-[#c9cd58] flex items-center gap-0.5">
                        <ChevronRightIcon className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 4. Footer Summary info */}
        <div className="p-3 border-t border-[#242828] bg-[#121414] text-[11px] font-mono text-[#93927e] flex items-center justify-between px-5">
          <span>{t.pressEsc}</span>
        </div>
      </aside>
    </>
  );
};

