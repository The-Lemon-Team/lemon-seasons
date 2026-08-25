import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Note, NoteTypeColors, truncateMarkdown } from '@lenta/shared';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Radio,
  Rss,
  Search,
  Check,
  Play,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Filter,
  RotateCcw,
  X,
  Calendar as CalendarIcon,
  Clock,
  Tag,
  ArrowUpRight,
  Layers,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import dayjs from 'dayjs';
import { useFeeds } from '../api/queries';
import { getFeedTheme, FEED_PRESET_OPTIONS } from '../utils/feedThemes';
import { FeedsHubHeader } from './FeedsHubHeader';
import { MiniCalendar } from './MiniCalendar';
import { useI18n } from '../i18n';

interface FeedsHubViewProps {
  notes: Note[];
  isLoading: boolean;
  selectedFeed?: string;
  selectedFeeds?: string[]; // for backwards compatibility
  startDate?: string;
  endDate?: string;
  onSelectFeed?: (feedSlug?: string) => void;
  onToggleFeed?: (feedSlug: string) => void;
  onSelectOnlyFeed?: (feedSlug: string) => void;
  onSetAllFeeds?: (feeds: string[]) => void;
  onClearFeed?: () => void;
  onClearFeeds?: () => void;
  onSelectNote: (note: Note) => void;
  onNavigateToTimeline: () => void;
  onNavigateToCalendar: () => void;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  onSelectMonth?: (year: number, monthIndex: number) => void;
  onSelectDate?: (dateKey: string) => void;
  onToday?: () => void;
}

export const FeedsHubView: React.FC<FeedsHubViewProps> = ({
  notes,
  isLoading,
  selectedFeed: propSelectedFeed,
  selectedFeeds,
  startDate,
  endDate,
  onSelectFeed,
  onToggleFeed,
  onSelectOnlyFeed,
  onClearFeed,
  onClearFeeds,
  onSelectNote,
  onNavigateToTimeline,
  onNavigateToCalendar,
  onPrevMonth,
  onNextMonth,
  onSelectMonth,
  onSelectDate,
  onToday,
}) => {
  const { t, lang, getTypeLabel } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isMiniCalendarOpen, setIsMiniCalendarOpen] = useState(false);
  const [expandedNoteIds, setExpandedNoteIds] = useState<Record<string, boolean>>({});

  const monthPopoverRef = useRef<HTMLDivElement>(null);
  const { data: allFeeds = [] } = useFeeds();

  const activeFeedSlug = propSelectedFeed ?? (selectedFeeds && selectedFeeds.length > 0 ? selectedFeeds[0] : undefined);
  const isAllSelected = !activeFeedSlug;
  const currentMonth = useMemo(() => dayjs(startDate || undefined), [startDate]);

  // Handle outside clicks to close MiniCalendar popover
  useEffect(() => {
    if (!isMiniCalendarOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (monthPopoverRef.current && !monthPopoverRef.current.contains(e.target as Node)) {
        setIsMiniCalendarOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMiniCalendarOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMiniCalendarOpen]);

  // Note counts per feed slug (from all fetched notes)
  const notesByFeed = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const note of notes) {
      if (note.feed?.slug) {
        counts[note.feed.slug] = (counts[note.feed.slug] || 0) + 1;
      }
    }
    return counts;
  }, [notes]);

  // Active Feed Details & Theme
  const activeFeedObj = useMemo(() => {
    if (!activeFeedSlug) return null;
    return allFeeds.find((f) => f.slug === activeFeedSlug) || null;
  }, [activeFeedSlug, allFeeds]);

  const activeTheme = useMemo(() => {
    if (!activeFeedSlug) return null;
    return getFeedTheme(activeFeedSlug, activeFeedObj?.title);
  }, [activeFeedSlug, activeFeedObj]);

  // Single Feed Stream Notes Filter
  const streamNotes = useMemo(() => {
    let result = [...notes];

    // Filter by selected channel (feed)
    if (activeFeedSlug) {
      result = result.filter((note) => note.feed?.slug === activeFeedSlug);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((note) => {
        const matchesTitle = note.title.toLowerCase().includes(q);
        const matchesDesc = Boolean(note.description?.toLowerCase().includes(q));
        const matchesFeed = Boolean(note.feed?.title.toLowerCase().includes(q));
        const matchesTags = note.tags?.some((t) => t.name?.toLowerCase().includes(q) || t.path?.toLowerCase().includes(q));
        const matchesHashtags = note.hashtags?.some((h) => h.name?.toLowerCase().includes(q));
        return matchesTitle || matchesDesc || matchesFeed || matchesTags || matchesHashtags;
      });
    }

    // Sort stream notes: newest date first
    result.sort(
      (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );

    return result;
  }, [notes, activeFeedSlug, searchQuery]);

  const toggleNoteExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNoteIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelect = (slug?: string) => {
    if (!slug) {
      if (onClearFeed) onClearFeed();
      else if (onClearFeeds) onClearFeeds();
      else if (onSelectFeed) onSelectFeed(undefined);
    } else {
      if (activeFeedSlug === slug) {
        if (onClearFeed) onClearFeed();
        else if (onClearFeeds) onClearFeeds();
        else if (onSelectFeed) onSelectFeed(undefined);
      } else {
        if (onSelectFeed) onSelectFeed(slug);
        else if (onSelectOnlyFeed) onSelectOnlyFeed(slug);
        else if (onToggleFeed) onToggleFeed(slug);
      }
    }
  };

  const handleClear = () => {
    if (onClearFeed) onClearFeed();
    else if (onClearFeeds) onClearFeeds();
    else if (onSelectFeed) onSelectFeed(undefined);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#121414] overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* 1. Hero Command Center Header */}
      <FeedsHubHeader
        totalChannels={allFeeds.length}
        notesCount={streamNotes.length}
        activeFeedSlug={activeFeedSlug}
        activeTheme={activeTheme}
        isAllSelected={isAllSelected}
        onNavigateToTimeline={onNavigateToTimeline}
        onNavigateToCalendar={onNavigateToCalendar}
      />

      {/* 2. Control Hub: Channel Chooser & Calendar Date Filter Bar */}
      <div className="bg-[#181a1c] border border-[#2e3234] rounded-2xl p-5 shadow-xl space-y-5 relative">
        {/* Header Title & Channel Mode Indicator */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#292c2e] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#c9cd58]/15 border border-[#c9cd58]/40 flex items-center justify-center text-[#e5e971]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm text-white tracking-wide">
                  {lang === 'ru' ? 'Выбор канала и фильтр периода' : 'Channel Selector & Date Filter'}
                </h2>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#c9cd58]/15 text-[#e5e971] border border-[#c9cd58]/30">
                  {isAllSelected
                    ? (lang === 'ru' ? 'Все каналы' : 'All Channels')
                    : (activeTheme?.title || activeFeedSlug)}
                </span>
              </div>
              <p className="text-[11px] font-mono text-neutral-400">
                {lang === 'ru'
                  ? 'Выберите канал для отображения единой ленты записей'
                  : 'Select a channel to update the unified note stream'}
              </p>
            </div>
          </div>

          {!isAllSelected && (
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#222527] hover:bg-[#2e3234] border border-[#383c3e] text-xs font-mono text-neutral-300 hover:text-white transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#c9cd58]" />
              <span>{lang === 'ru' ? 'Показать все каналы' : 'Show All Channels'}</span>
            </button>
          )}
        </div>

        {/* SECTION A: Channel Selector (Choose Feed) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-neutral-400 uppercase tracking-wider">
            <span className="flex items-center gap-1.5 font-semibold text-[#e5e971]">
              <Radio className="w-3.5 h-3.5 text-[#c9cd58]" />
              <span>{lang === 'ru' ? 'Каналы (Feeds)' : 'Channels (Feeds)'}</span>
            </span>
            <span className="text-[10px] text-neutral-500">
              {allFeeds.length} {lang === 'ru' ? 'доступно' : 'available'}
            </span>
          </div>

          {/* Scrollable Horizontal Channel Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 max-w-full no-scrollbar">
            {/* Omni Stream Option ("All Channels") */}
            <button
              onClick={() => handleSelect(undefined)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono whitespace-nowrap transition-all border shrink-0 ${
                isAllSelected
                  ? 'bg-[#c9cd58]/20 border-[#c9cd58] text-[#e5e971] font-semibold shadow-md ring-1 ring-[#c9cd58]/40'
                  : 'bg-[#121414] border-[#242828] text-neutral-400 hover:text-white hover:bg-[#202222]'
              }`}
            >
              <span className="text-base">📡</span>
              <span>{t.allChannels}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#121414] border border-[#2e3234] text-neutral-400 font-mono">
                {notes.length}
              </span>
              {isAllSelected && <Check className="w-3.5 h-3.5 text-[#c9cd58] ml-1" />}
            </button>

            {/* Individual Feed Channels */}
            {allFeeds.map((feed) => {
              const isSelected = activeFeedSlug === feed.slug;
              const theme = getFeedTheme(feed.slug, feed.title);
              const count = notesByFeed[feed.slug] || 0;

              return (
                <button
                  key={feed.id}
                  onClick={() => handleSelect(feed.slug)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono whitespace-nowrap transition-all border shrink-0 ${
                    isSelected
                      ? 'bg-[#1e2220] border-[#c9cd58] text-[#e5e971] font-semibold shadow-md ring-1 ring-[#c9cd58]/40'
                      : 'bg-[#121414] border-[#242828] text-neutral-300 hover:text-white hover:bg-[#1a1d1e]'
                  }`}
                >
                  <span className="text-base">{theme.emoji}</span>
                  <span>{feed.title}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#161819] border border-[#2a2d2f] text-neutral-400 font-mono">
                    {count}
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#c9cd58] ml-1" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION B: Date Filter Controls & Search */}
        <div className="pt-2 border-t border-[#292c2e] flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Calendar Month Navigation & Date Picker */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-neutral-400 font-semibold uppercase tracking-wider flex items-center gap-1 mr-1">
              <CalendarIcon className="w-3.5 h-3.5 text-[#c9cd58]" />
              <span>{lang === 'ru' ? 'Период:' : 'Date:'}</span>
            </span>

            {/* Month Control Navigation Group */}
            <div className="flex items-center gap-1 bg-[#121414] p-1 rounded-xl border border-[#26292b] relative shadow-inner" ref={monthPopoverRef}>
              {onPrevMonth && (
                <button
                  type="button"
                  onClick={onPrevMonth}
                  className="p-1.5 rounded-lg text-[#c9c7b2] hover:text-white hover:bg-[#242828] transition-colors"
                  title={t.previousMonth}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}

              {/* Clickable Month Title with Dropdown Chevron */}
              <button
                type="button"
                onClick={() => setIsMiniCalendarOpen((prev) => !prev)}
                className="flex items-center gap-2 px-2.5 py-1 rounded-lg hover:bg-[#242828] text-white font-mono font-bold text-xs uppercase tracking-wide transition-colors"
                title={lang === 'ru' ? 'Открыть календарь выбора месяца' : 'Open month picker calendar'}
              >
                <div className="w-5 h-5 rounded bg-[#c9cd58]/15 border border-[#c9cd58]/40 flex items-center justify-center text-[#c9cd58]">
                  <CalendarIcon className="w-3 h-3" />
                </div>
                <span>{currentMonth.format('MMMM YYYY')}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-[#c9cd58] transition-transform ${isMiniCalendarOpen ? 'rotate-180' : ''}`} />
              </button>

              {onNextMonth && (
                <button
                  type="button"
                  onClick={onNextMonth}
                  className="p-1.5 rounded-lg text-[#c9c7b2] hover:text-white hover:bg-[#242828] transition-colors"
                  title={t.nextMonth}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {/* Mini Calendar Popover Overlay */}
              {isMiniCalendarOpen && (
                <div className="absolute left-0 top-full mt-2 z-50 w-72 shadow-2xl">
                  <MiniCalendar
                    startDate={startDate || currentMonth.format('YYYY-MM-DD')}
                    onSelectMonth={(year, monthIndex) => {
                      if (onSelectMonth) onSelectMonth(year, monthIndex);
                      setIsMiniCalendarOpen(false);
                    }}
                    onSelectDate={(dateKey) => {
                      if (onSelectDate) onSelectDate(dateKey);
                      setIsMiniCalendarOpen(false);
                    }}
                  />
                </div>
              )}
            </div>

            {/* Quick 'Today' Button */}
            {onToday && (
              <button
                type="button"
                onClick={onToday}
                className="px-2.5 py-1.5 rounded-xl bg-[#121414] hover:bg-[#242828] border border-[#26292b] text-xs font-mono text-neutral-300 hover:text-white transition-colors"
              >
                {t.today}
              </button>
            )}
          </div>

          {/* Search Input Field */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchFeeds || 'Поиск по ленте...'}
              className="w-full bg-[#121414] border border-[#26292b] rounded-xl pl-9 pr-8 py-1.5 text-xs text-white placeholder-neutral-500 font-mono focus:outline-none focus:border-[#c9cd58]/60"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Active Channel Info Banner (When single feed channel is active) */}
      {!isAllSelected && activeTheme && (
        <div
          className="rounded-2xl border p-5 shadow-lg relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
          style={{
            backgroundColor: '#16191a',
            borderColor: `${activeTheme.accentColor}60`,
          }}
        >
          <div
            className="absolute top-0 left-0 bottom-0 w-2"
            style={{ backgroundColor: activeTheme.accentColor }}
          />

          <div className="flex items-start gap-4 flex-1 min-w-0 pl-2">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-3xl flex-shrink-0 border shadow-md"
              style={{
                backgroundColor: activeTheme.bgLight,
                borderColor: activeTheme.borderAccent,
              }}
            >
              <span>{activeTheme.emoji}</span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white truncate">
                  {activeFeedObj?.title || activeTheme.title}
                </h3>
                <span className="text-[10px] font-mono text-[#c9cd58] px-2 py-0.5 bg-[#c9cd58]/10 rounded-md border border-[#c9cd58]/30">
                  slug: {activeFeedSlug}
                </span>
              </div>
              <p className="text-xs font-mono text-[#c9c7b2] mt-0.5">
                {activeTheme.tagline}
              </p>
              {activeFeedObj?.description && (
                <p className="text-xs text-neutral-300 leading-relaxed mt-1">
                  {activeFeedObj.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
            <div className="text-right font-mono text-xs">
              <div className="text-white font-bold">{streamNotes.length} {lang === 'ru' ? 'записей' : 'notes'}</div>
              <div className="text-[10px] text-neutral-400">{currentMonth.format('MMMM YYYY')}</div>
            </div>
            <button
              onClick={handleClear}
              className="px-3 py-1.5 rounded-xl bg-[#242828] hover:bg-[#323636] border border-[#3a3d3f] text-xs font-mono text-neutral-300 hover:text-white transition-colors"
            >
              {lang === 'ru' ? 'Сбросить канал' : 'Reset Channel'}
            </button>
          </div>
        </div>
      )}

      {/* 4. Single Feed Stream (Notes List) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
          <div className="flex items-center gap-2">
            <Rss className="w-4 h-4 text-[#c9cd58]" />
            <span className="font-bold text-white uppercase tracking-wider">
              {isAllSelected
                ? (lang === 'ru' ? 'Единая лента (Все каналы)' : 'Unified Feed Stream (All Channels)')
                : `${lang === 'ru' ? 'Лента канала' : 'Channel Feed Stream'}: ${activeTheme?.title || activeFeedSlug}`}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#1e2020] border border-[#2e3234] text-[10px] text-[#c9cd58]">
              {streamNotes.length} {lang === 'ru' ? 'записей' : 'notes'}
            </span>
          </div>

          <span className="text-[10px] text-neutral-500">
            {lang === 'ru' ? 'Сначала новые' : 'Newest first'}
          </span>
        </div>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center p-12 text-[#c9c7b2]">
            <div className="w-8 h-8 border-2 border-[#c9cd58] border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs font-mono tracking-wider uppercase">{t.loading}</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && streamNotes.length === 0 && (
          <div className="p-8 rounded-2xl bg-[#16191b] border border-[#26292b] text-center space-y-4 max-w-md mx-auto my-6">
            <div className="w-12 h-12 rounded-2xl bg-[#c9cd58]/15 border border-[#c9cd58]/40 flex items-center justify-center mx-auto text-[#c9cd58]">
              <Rss className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {lang === 'ru' ? 'Записи не найдены' : 'No notes found'}
              </h3>
              <p className="text-xs text-neutral-400 font-mono mt-1 leading-relaxed">
                {lang === 'ru'
                  ? 'В выбранном канале или за указанный период (месяц) нет опубликованных записей.'
                  : 'There are no published notes in the selected channel or date period.'}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              {onToday && (
                <button
                  onClick={onToday}
                  className="px-3 py-1.5 rounded-xl bg-[#242828] hover:bg-[#323636] text-xs font-mono text-neutral-200 transition-colors"
                >
                  {t.today}
                </button>
              )}
              {!isAllSelected && (
                <button
                  onClick={handleClear}
                  className="px-3 py-1.5 rounded-xl bg-[#c9cd58] hover:bg-[#d8dc63] text-xs font-mono font-bold text-[#121414] transition-colors"
                >
                  {lang === 'ru' ? 'Показать все каналы' : 'Show All Channels'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Stream Note Items */}
        {!isLoading && streamNotes.map((note) => {
          const noteColor = NoteTypeColors[note.type];
          const feedTheme = getFeedTheme(note.feed?.slug, note.feed?.title);
          const isExpanded = Boolean(expandedNoteIds[note.id]);

          return (
            <article
              key={note.id}
              onClick={() => onSelectNote(note)}
              className="group rounded-2xl bg-[#16191a] border border-[#242828] hover:border-[#3a3e40] transition-all duration-200 overflow-hidden shadow-lg p-5 space-y-3 cursor-pointer hover:bg-[#1a1d1e] relative"
            >
              {/* Top Accent Stripe */}
              <div
                className="absolute top-0 left-0 right-0 h-1 transition-all"
                style={{ backgroundColor: feedTheme.accentColor || noteColor.accent }}
              />

              {/* Note Metadata Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Feed Channel Pill */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (note.feed?.slug) handleSelect(note.feed.slug);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#121414] border border-[#282b2d] hover:border-[#c9cd58] text-[#e5e971] text-[11px] font-semibold transition-colors"
                    title={lang === 'ru' ? 'Фильтровать по этому каналу' : 'Filter by this channel'}
                  >
                    <span>{feedTheme.emoji}</span>
                    <span>{note.feed?.title || 'General'}</span>
                  </button>

                  {/* Note Type Pill */}
                  <span
                    className="px-2 py-0.5 rounded-md text-[10px] font-semibold border"
                    style={{
                      backgroundColor: noteColor.bg,
                      borderColor: noteColor.border,
                      color: noteColor.accent,
                    }}
                  >
                    {getTypeLabel(note.type)}
                  </span>
                </div>

                {/* Date & Time */}
                <div className="flex items-center gap-1.5 text-neutral-400 text-[11px]">
                  <Clock className="w-3.5 h-3.5 text-neutral-500" />
                  <span>{dayjs(note.startDate).format('D MMMM YYYY, HH:mm')}</span>
                </div>
              </div>

              {/* Note Title */}
              <h3 className="font-bold text-base text-white group-hover:text-[#e5e971] transition-colors leading-snug">
                {note.title}
              </h3>

              {/* Note Description / Markdown Preview */}
              {note.description && (
                <div className="text-xs text-neutral-300 leading-relaxed bg-[#121414]/60 p-3.5 rounded-xl border border-[#242828]/80 space-y-2">
                  {isExpanded ? (
                    <div className="prose prose-invert prose-xs max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {note.description}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="line-clamp-3">
                      {truncateMarkdown(note.description, 280)}
                    </p>
                  )}

                  {note.description.length > 200 && (
                    <button
                      onClick={(e) => toggleNoteExpand(note.id, e)}
                      className="flex items-center gap-1 text-[11px] font-mono font-semibold text-[#c9cd58] hover:underline pt-1"
                    >
                      <span>{isExpanded ? (lang === 'ru' ? 'Свернуть' : 'Collapse') : (lang === 'ru' ? 'Читать полностью' : 'Read more')}</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              )}

              {/* Tags & Actions Footer */}
              <div className="flex items-center justify-between gap-3 pt-1 text-xs font-mono border-t border-[#222527]">
                {/* Tags */}
                <div className="flex items-center gap-1.5 overflow-x-auto min-w-0">
                  {note.tags && note.tags.length > 0 ? (
                    note.tags.map((tag) => (
                      <span
                        key={tag.id || tag.path}
                        className="px-2 py-0.5 rounded bg-[#121414] border border-[#26292b] text-[10px] text-neutral-400 flex items-center gap-1 shrink-0"
                      >
                        <Tag className="w-2.5 h-2.5 text-[#c9cd58]" />
                        <span>{tag.name || tag.path}</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-neutral-600 italic">no tags</span>
                  )}
                  {note.hashtags && note.hashtags.map((h) => (
                    <span
                      key={h.id || h.name}
                      className="px-2 py-0.5 rounded bg-[#121414] border border-[#26292b] text-[10px] text-[#e5e971] flex items-center gap-1 shrink-0"
                    >
                      <span>#{h.name}</span>
                    </span>
                  ))}
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectNote(note);
                    }}
                    className="flex items-center gap-1 text-[11px] font-semibold text-neutral-300 hover:text-white px-2.5 py-1 rounded-lg bg-[#202324] hover:bg-[#2a2d2f] border border-[#2d3032] transition-colors"
                  >
                    <span>{lang === 'ru' ? 'Детали' : 'Details'}</span>
                    <ArrowUpRight className="w-3 h-3 text-[#c9cd58]" />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* 5. Single-Feed Bottom Dock Bar */}
      <div className="sticky bottom-0 bg-[#16191b]/95 backdrop-blur-xl border border-[#2e3232] rounded-2xl p-4 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#c9cd58]/20 border border-[#c9cd58]/50 flex items-center justify-center text-[#e5e971]">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <div className="text-white font-semibold flex items-center gap-2">
              <span>{lang === 'ru' ? 'Активный канал:' : 'Active Channel:'}</span>
              <span className="text-[#e5e971]">
                {isAllSelected
                  ? (lang === 'ru' ? 'Все каналы' : 'All Channels')
                  : activeTheme?.title || activeFeedSlug}
              </span>
            </div>
            <div className="text-[11px] text-neutral-400 flex items-center gap-2">
              <span>{currentMonth.format('MMMM YYYY')}</span>
              <span>•</span>
              <span>{streamNotes.length} {lang === 'ru' ? 'записей в ленте' : 'notes in stream'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isAllSelected && (
            <button
              onClick={handleClear}
              className="px-3 py-2 rounded-xl text-neutral-400 hover:text-white bg-[#1a1c1c] border border-[#242828] hover:bg-[#242828] transition-colors"
            >
              {t.allChannels}
            </button>
          )}
          <button
            onClick={onNavigateToTimeline}
            className="flex items-center gap-2 bg-[#c9cd58] hover:bg-[#d4e157] text-[#121414] font-bold px-4 py-2 rounded-xl shadow-glow-lemon transition-all"
          >
            <span>{t.openInTimeline}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
