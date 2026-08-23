import React, { useMemo, useState } from 'react';
import {
  Note,
  CalendarFilterState,
  NoteType,
  NoteTypeColors,
  getNoteTypeLabel,
  formatLocalDateKey,
} from '@lenta/shared';
import { useFeeds } from '../api/queries';
import { getFeedTheme } from '../utils/feedThemes';
import { DaySidebar } from './DaySidebar';
import { HierarchySelector } from './HierarchySelector';
import { NoteTypeSelector } from './NoteTypeSelector';
import { FeedSelector } from './FeedSelector';
import dayjs from 'dayjs';
import {
  Tag,
  Hash,
  Shapes,
  Filter,
  SlidersHorizontal,
  RotateCcw,
  X,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { useI18n } from '../i18n';

interface MonthGridViewProps {
  notes: Note[];
  startDate: string; // ISO
  filterState: CalendarFilterState;
  onSelectNote: (note: Note) => void;
  onSelectDay?: (dateKey: string) => void;
  onToggleFeed: (feedSlug: string) => void;
  onSelectOnlyFeed?: (feedSlug: string) => void;
  onSetAllFeeds?: (feeds: string[]) => void;
  onClearFeeds?: () => void;
  onOpenFeedsHub?: () => void;
  onToggleType: (type: NoteType) => void;
  onSelectOnlyType?: (type: NoteType) => void;
  onClearTypes?: () => void;
  onToggleTag: (tagPath: string) => void;
  onSelectOnlyTag?: (tagPath: string) => void;
  onClearTags?: () => void;
  onToggleHashtag: (hashtag: string) => void;
  onResetFilters: () => void;
  onOpenFilterDrawer: () => void;
}

export const MonthGridView: React.FC<MonthGridViewProps> = ({
  notes,
  startDate,
  filterState,
  onSelectNote,
  onSelectDay,
  onToggleFeed,
  onSelectOnlyFeed,
  onSetAllFeeds,
  onClearFeeds,
  onOpenFeedsHub,
  onToggleType,
  onSelectOnlyType,
  onClearTypes,
  onToggleTag,
  onSelectOnlyTag,
  onClearTags,
  onToggleHashtag,
  onResetFilters,
  onOpenFilterDrawer,
}) => {
  const { t, lang } = useI18n();
  const { data: allFeeds = [] } = useFeeds();
  const [hoveredDayKey, setHoveredDayKey] = useState<string | null>(null);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  const currentMonth = dayjs(startDate);
  const startOfMonth = currentMonth.startOf('month');

  // Count active filters
  const activeFilterCount =
    (filterState.feed ? 1 : 0) +
    filterState.tags.length +
    filterState.hashtags.length +
    filterState.types.length +
    (filterState.search ? 1 : 0);

  // Per-feed counts in current month notes
  const feedCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const note of notes) {
      if (note.feed?.slug) {
        counts[note.feed.slug] = (counts[note.feed.slug] || 0) + 1;
      }
    }
    return counts;
  }, [notes]);

  // Per-type counts in current month notes
  const typeCounts = useMemo(() => {
    const counts: Record<NoteType, number> = {
      SINGLE: 0,
      PERIOD: 0,
      EVENT: 0,
      FILM_RELEASE: 0,
      MENTION: 0,
      DONE: 0,
    };
    for (const note of notes) {
      if (note.type && counts[note.type] !== undefined) {
        counts[note.type]++;
      }
    }
    return counts;
  }, [notes]);


  // Build calendar matrix (42 cells: 6 weeks x 7 days)
  const calendarCells = useMemo(() => {
    const cells: Array<{
      date: dayjs.Dayjs;
      dateKey: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      notes: Note[];
    }> = [];

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

  const weekDayHeaders = t.weekdays;

  const selectedDayNotes = useMemo(() => {
    if (!selectedDayKey) return [];
    const cell = calendarCells.find((c) => c.dateKey === selectedDayKey);
    if (cell) return cell.notes;
    return notes.filter((n) => formatLocalDateKey(n.startDate) === selectedDayKey);
  }, [selectedDayKey, calendarCells, notes]);

  return (
    <div className="flex-1 flex flex-col p-3 lg:p-4 overflow-hidden h-full max-w-[1600px] mx-auto w-full gap-2.5 min-h-0">
      {/* 1. Header Toolbar & Direct Filter Navigation */}
      <div className="bg-[#1a1c1c] border border-[#242828] rounded-xl p-3 flex flex-col gap-2.5 shadow-md flex-shrink-0">
        {/* Top Level: Month Title, Quick Stats & Jump to Filters Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#c9cd58]/10 border border-[#c9cd58]/30 flex items-center justify-center text-[#c9cd58]">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white font-mono tracking-wide uppercase">
                  {currentMonth.format('MMMM YYYY')}
                </h2>
                <span className="text-[11px] font-mono text-[#c9cd58] bg-[#c9cd58]/10 border border-[#c9cd58]/30 px-2 py-0.5 rounded-full font-medium">
                  {t.eventsCount(notes.length)}
                </span>
              </div>
              <p className="text-[11px] font-mono text-neutral-400">
                {t.monthGridSubtitle}
              </p>
            </div>
          </div>

          {/* Quick Filter Navigation Actions */}
          <div className="flex items-center gap-2">
            {/* Open Filter Drawer */}
            <button
              onClick={onOpenFilterDrawer}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${
                activeFilterCount > 0
                  ? 'bg-[#c9cd58]/15 border-[#c9cd58] text-[#e5e971] shadow-glow-lemon/20'
                  : 'bg-[#242828]/60 border-[#333535] text-[#c9c7b2] hover:text-white hover:bg-[#333535]'
              }`}
              title="Open right filter sidebar drawer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#c9cd58]" />
              <span>{t.filters}</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#c9cd58] text-[#121414] text-[10px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Reset Filters Shortcut */}
            {activeFilterCount > 0 && (
              <button
                onClick={onResetFilters}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono bg-red-950/30 border border-red-800/40 text-red-300 hover:bg-red-900/40 transition-colors"
                title="Reset all active filters"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline">{t.reset}</span>
              </button>
            )}
          </div>
        </div>

        {/* Inline Quick Filter Toolbar: Hierarchy (ACCENT FIRST), Note Types (WRAPPED), and Feeds */}
        <div className="pt-2 border-t border-[#242828] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 flex-wrap min-w-0">
            {/* 1. Hierarchy / Taxonomy Selector (FIRST FILTER WITH ACCENT) */}
            <HierarchySelector
              selectedTags={filterState.tags}
              onToggleTag={onToggleTag}
              onSelectOnlyTag={onSelectOnlyTag}
              onClearTags={onClearTags}
              notes={notes}
            />

            <div className="h-4 w-px bg-[#242828] hidden sm:block" />

            {/* 2. Note Types Selector (WRAPPED DROPDOWN) */}
            <NoteTypeSelector
              selectedTypes={filterState.types}
              onToggleType={onToggleType}
              onSelectOnlyType={onSelectOnlyType}
              onClearTypes={onClearTypes}
              typeCounts={typeCounts}
            />

            <div className="h-4 w-px bg-[#242828] hidden sm:block" />

            {/* 3. Feeds & Channels Selector (RICH POPOVER & DECK) */}
            <FeedSelector
              selectedFeed={filterState.feed}
              onToggleFeed={onToggleFeed}
              onSelectOnlyFeed={onSelectOnlyFeed}
              onSetAllFeeds={onSetAllFeeds}
              onClearFeeds={onClearFeeds}
              onOpenFeedsHub={onOpenFeedsHub}
              notes={notes}
            />
          </div>
        </div>

        {/* 4. Active Filters Ledger (Always rendered with fixed stable height to prevent layout shifts/reflows) */}
        <div className="pt-2 border-t border-[#242828]">
          <div className="flex items-center justify-between gap-2 text-xs bg-[#121414]/60 px-2.5 py-1 rounded-lg h-8 border border-[#242828]/50 box-border overflow-hidden">
            <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto no-scrollbar min-w-0 flex-1 h-full">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold mr-1 flex items-center gap-1 shrink-0">
                <Filter className="w-3 h-3 text-[#c9cd58]" />
                Active ({activeFilterCount}):
              </span>

              {activeFilterCount === 0 ? (
                <span className="shrink-0 text-[11px] font-mono text-neutral-500 italic h-6 flex items-center">
                  None (showing all notes)
                </span>
              ) : (
                <>
                  {/* Hierarchy Folder / Tag Filters (ACCENT) */}
                  {filterState.tags.map((tagPath) => (
                    <span
                      key={tagPath}
                      className="shrink-0 inline-flex items-center gap-1 px-2 h-6 rounded bg-[#c9cd58]/15 border border-[#c9cd58]/50 text-[#e5e971] text-[11px] font-mono font-medium shadow-sm leading-none"
                    >
                      <Tag className="w-2.5 h-2.5 text-[#c9cd58] shrink-0" />
                      <span className="truncate max-w-[150px]">Folder: {tagPath}</span>
                      <button
                        onClick={() => onToggleTag(tagPath)}
                        className="hover:text-white p-0.5 transition-colors ml-0.5 shrink-0"
                        title="Remove folder filter"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}

                  {/* Feed Filter (Single Stream) */}
                  {filterState.feed && (() => {
                    const theme = getFeedTheme(filterState.feed);
                    return (
                      <span
                        key={filterState.feed}
                        className="shrink-0 inline-flex items-center gap-1.5 px-2 h-6 rounded text-[11px] font-mono border leading-none"
                        style={{
                          backgroundColor: theme.bgLight,
                          borderColor: theme.borderAccent,
                          color: theme.accentColor,
                        }}
                      >
                        <span>{theme.emoji}</span>
                        <span className="truncate max-w-[160px]">Feed: {theme.shortTitle}</span>
                        <button
                          onClick={() => (onClearFeeds ? onClearFeeds() : onToggleFeed(filterState.feed!))}
                          className="hover:opacity-100 opacity-70 p-0.5 transition-colors ml-0.5 shrink-0"
                          title="Remove feed filter"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    );
                  })()}

                  {/* Type Filters */}
                  {filterState.types.map((type) => (
                    <span
                      key={type}
                      className="shrink-0 inline-flex items-center gap-1 px-2 h-6 rounded bg-[#2a2d2d] border border-[#484837] text-neutral-200 text-[11px] font-mono leading-none"
                    >
                      <Shapes className="w-2.5 h-2.5 text-[#c9cd58] shrink-0" />
                      <span>Type: {getNoteTypeLabel(type, lang)}</span>
                      <button
                        onClick={() => onToggleType(type)}
                        className="hover:text-white p-0.5 transition-colors shrink-0"
                        title="Remove type filter"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}

                  {/* Hashtag Filters */}
                  {filterState.hashtags.map((hashtag) => (
                    <span
                      key={hashtag}
                      className="shrink-0 inline-flex items-center gap-1 px-2 h-6 rounded bg-[#c9cd58]/10 border border-[#c9cd58]/30 text-[#e5e971] text-[11px] font-mono leading-none"
                    >
                      <Hash className="w-2.5 h-2.5 shrink-0" />
                      <span>#{hashtag}</span>
                      <button
                        onClick={() => onToggleHashtag(hashtag)}
                        className="hover:text-white p-0.5 transition-colors shrink-0"
                        title="Remove hashtag filter"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}

                  {/* Search filter indicator */}
                  {filterState.search && (
                    <span className="shrink-0 inline-flex items-center gap-1 px-2 h-6 rounded bg-[#1e2020] border border-[#333535] text-neutral-300 text-[11px] font-mono leading-none">
                      <span className="truncate max-w-[150px]">Search: &quot;{filterState.search}&quot;</span>
                    </span>
                  )}
                </>
              )}
            </div>

            {activeFilterCount > 0 && (
              <button
                onClick={onResetFilters}
                className="shrink-0 text-[11px] font-mono text-[#c9cd58] hover:underline flex items-center gap-1 whitespace-nowrap ml-2"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Weekday Columns Header */}
      <div className="grid grid-cols-7 border-t border-l border-[#242828] bg-[#1a1c1c] text-center font-mono text-xs text-[#c9c7b2] py-2 font-medium flex-shrink-0 rounded-t-lg">
        {weekDayHeaders.map((day) => (
          <div key={day} className="border-r border-[#242828] uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {/* 3. 6-Week Month Grid Matrix */}
      <div className="grid grid-cols-7 grid-rows-6 auto-rows-fr flex-1 border-t border-l border-[#242828] bg-[#121414] overflow-y-auto rounded-b-lg shadow-inner min-h-0">
        {calendarCells.map((cell) => {
          const maxVisible = 2;
          const visibleNotes = cell.notes.slice(0, maxVisible);
          const hiddenCount = cell.notes.length - maxVisible;

          return (
            <div
              key={cell.dateKey}
              onClick={() => setSelectedDayKey(cell.dateKey)}
              onMouseEnter={() => setHoveredDayKey(cell.dateKey)}
              onMouseLeave={() => setHoveredDayKey(null)}
              className={`min-h-[75px] sm:min-h-[85px] lg:min-h-0 border-r border-b border-[#242828] p-1.5 sm:p-2 flex flex-col transition-all group relative cursor-pointer overflow-hidden ${
                cell.isCurrentMonth ? 'bg-[#121414]' : 'bg-[#0d0f0f]/80 opacity-45'
              } ${
                selectedDayKey === cell.dateKey
                  ? 'ring-2 ring-[#c9cd58] bg-[#c9cd58]/15 border-[#c9cd58] shadow-glow-lemon/20 z-10'
                  : cell.isToday
                  ? 'border-2 border-[#c9cd58] bg-[#c9cd58]/5'
                  : 'hover:bg-[#181a1a]'
              }`}
            >
              {/* Day Number Header */}
              <div className="flex items-center justify-between mb-1 pointer-events-none flex-shrink-0">
                <span
                  className={`text-xs font-mono font-semibold px-1.5 py-0.5 rounded transition-colors ${
                    selectedDayKey === cell.dateKey
                      ? 'bg-[#c9cd58] text-[#121414] font-bold shadow-glow-lemon'
                      : cell.isToday
                      ? 'bg-[#c9cd58] text-[#121414] font-bold shadow-glow-lemon'
                      : cell.isCurrentMonth
                      ? 'text-[#e2e2e2] group-hover:text-[#e5e971]'
                      : 'text-[#93927e]'
                  }`}
                >
                  {cell.date.format('D')}
                </span>

                {cell.notes.length > 0 && (
                  <span className="text-[10px] font-mono text-[#c9cd58] bg-[#1e2020] border border-[#242828] px-1.5 py-0.2 rounded">
                    {cell.notes.length}
                  </span>
                )}
              </div>

              {/* Event Pills List */}
              <div className="flex flex-col gap-1 overflow-hidden flex-1 min-h-0">
                {visibleNotes.map((note) => {
                  const typeColor = NoteTypeColors[note.type] || NoteTypeColors.EVENT;
                  const startHour = dayjs(note.startDate).format('HH:mm');

                  return (
                    <button
                      key={note.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectNote(note);
                      }}
                      className="text-left w-full px-1.5 py-0.5 rounded text-[11px] font-mono truncate transition-all duration-150 flex items-center gap-1.5 hover:brightness-125 hover:scale-[1.01] border shadow-xs flex-shrink-0"
                      style={{
                        backgroundColor: typeColor.bg,
                        color: typeColor.text,
                        borderColor: typeColor.border,
                      }}
                      title={`${startHour} • ${note.title} (${note.feed?.title || 'Feed'})`}
                    >
                      <span className="opacity-75 text-[9px] font-mono flex-shrink-0">
                        {startHour}
                      </span>
                      <span className="truncate flex-1">{note.title}</span>
                    </button>
                  );
                })}

                {/* +N More Button */}
                {hiddenCount > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDayKey(cell.dateKey);
                    }}
                    className="w-full py-0.5 text-[10px] font-mono text-center text-[#c9cd58] bg-[#1e2020] hover:bg-[#282a2a] border border-[#242828] hover:border-[#c9cd58]/50 rounded transition-colors flex-shrink-0"
                  >
                    {t.moreCount(hiddenCount)}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Day Detail Sidebar Drawer */}
      <DaySidebar
        isOpen={Boolean(selectedDayKey)}
        dateKey={selectedDayKey}
        notes={selectedDayNotes}
        onClose={() => setSelectedDayKey(null)}
        onSelectNote={onSelectNote}
        onNavigateToTimeline={(dateKey) => {
          onSelectDay?.(dateKey);
        }}
        onSelectDate={(dateKey) => setSelectedDayKey(dateKey)}
      />
    </div>
  );
};
