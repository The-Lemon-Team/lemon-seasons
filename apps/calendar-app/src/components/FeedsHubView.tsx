import React, { useState, useMemo } from 'react';
import { Note, NoteTypeColors } from '@lenta/shared';
import {
  Radio,
  Rss,
  Search,
  Check,
  Play,
  ChevronRight,
  Filter,
  RotateCcw,
  X,
} from 'lucide-react';
import dayjs from 'dayjs';
import { useFeeds } from '../api/queries';
import { getFeedTheme, FEED_PRESET_OPTIONS } from '../utils/feedThemes';
import { FeedsHubHeader } from './FeedsHubHeader';
import { useI18n } from '../i18n';

interface FeedsHubViewProps {
  notes: Note[];
  isLoading: boolean;
  selectedFeed?: string;
  selectedFeeds?: string[]; // for backwards compatibility
  onSelectFeed?: (feedSlug?: string) => void;
  onToggleFeed?: (feedSlug: string) => void;
  onSelectOnlyFeed?: (feedSlug: string) => void;
  onSetAllFeeds?: (feeds: string[]) => void;
  onClearFeed?: () => void;
  onClearFeeds?: () => void;
  onSelectNote: (note: Note) => void;
  onNavigateToTimeline: () => void;
  onNavigateToCalendar: () => void;
}

export const FeedsHubView: React.FC<FeedsHubViewProps> = ({
  notes,
  isLoading,
  selectedFeed: propSelectedFeed,
  selectedFeeds,
  onSelectFeed,
  onToggleFeed,
  onSelectOnlyFeed,
  onClearFeed,
  onClearFeeds,
  onSelectNote,
  onNavigateToTimeline,
  onNavigateToCalendar,
}) => {
  const { t, lang } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const { data: allFeeds = [] } = useFeeds();

  const activeFeedSlug = propSelectedFeed ?? (selectedFeeds && selectedFeeds.length > 0 ? selectedFeeds[0] : undefined);
  const isAllSelected = !activeFeedSlug;

  // Group notes by feed slug
  const notesByFeed = useMemo(() => {
    const map: Record<string, Note[]> = {};
    for (const note of notes) {
      if (note.feed?.slug) {
        if (!map[note.feed.slug]) map[note.feed.slug] = [];
        map[note.feed.slug].push(note);
      }
    }
    // Sort notes in each feed newest first
    for (const slug in map) {
      map[slug].sort(
        (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      );
    }
    return map;
  }, [notes]);

  // Filtered feeds
  const filteredFeeds = useMemo(() => {
    return allFeeds.filter((feed) => {
      const theme = getFeedTheme(feed.slug, feed.title);
      // Category filter
      if (selectedCategory !== 'all' && theme.category !== selectedCategory) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = feed.title.toLowerCase().includes(q);
        const matchesSlug = feed.slug.toLowerCase().includes(q);
        const matchesDesc = Boolean(feed.description?.toLowerCase().includes(q));
        const matchesTagline = theme.tagline.toLowerCase().includes(q);
        return matchesTitle || matchesSlug || matchesDesc || matchesTagline;
      }
      return true;
    });
  }, [allFeeds, selectedCategory, searchQuery]);

  const activeTheme = useMemo(() => {
    if (!activeFeedSlug) return null;
    const feed = allFeeds.find((f) => f.slug === activeFeedSlug);
    return getFeedTheme(activeFeedSlug, feed?.title);
  }, [activeFeedSlug, allFeeds]);

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
        notesCount={notes.length}
        activeFeedSlug={activeFeedSlug}
        activeTheme={activeTheme}
        isAllSelected={isAllSelected}
        onNavigateToTimeline={onNavigateToTimeline}
        onNavigateToCalendar={onNavigateToCalendar}
      />

      {/* 2. Separated Feeds Filter Container Element (Single Feed Selection) */}
      <div className="bg-[#181a1c] border border-[#2e3234] rounded-2xl p-5 shadow-xl space-y-4 relative overflow-hidden">
        {/* Container Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#292c2e] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#c9cd58]/15 border border-[#c9cd58]/40 flex items-center justify-center text-[#e5e971]">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm text-white tracking-wide">
                  {lang === 'ru' ? 'Контейнер фильтрации лент' : 'Feed Selection Filter Container'}
                </h2>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#c9cd58]/15 text-[#e5e971] border border-[#c9cd58]/30">
                  {lang === 'ru' ? '1 лента в момент' : 'Single feed active'}
                </span>
              </div>
              <p className="text-[11px] font-mono text-neutral-400">
                {isAllSelected
                  ? (lang === 'ru' ? 'Отображение всех каналов (Omni-stream)' : 'Showing all channels (Omni-stream)')
                  : `${lang === 'ru' ? 'Выбрана лента' : 'Selected feed'}: ${activeTheme?.title || activeFeedSlug}`}
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

        {/* Preset Category Chips & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Preset Channel Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {FEED_PRESET_OPTIONS.map((preset) => {
              const isActive = preset.slug === activeFeedSlug || (!preset.slug && !activeFeedSlug);

              return (
                <button
                  key={preset.id}
                  onClick={() => handleSelect(preset.slug)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono whitespace-nowrap transition-all border ${
                    isActive
                      ? 'bg-[#c9cd58]/20 border-[#c9cd58] text-[#e5e971] font-semibold shadow-sm ring-1 ring-[#c9cd58]/40'
                      : 'bg-[#121414] border-[#242828] text-neutral-400 hover:text-white hover:bg-[#202222]'
                  }`}
                >
                  <span>{preset.emoji}</span>
                  <span>{preset.id === 'all' ? t.presetAll : preset.name}</span>
                  {isActive && <Check className="w-3 h-3 text-[#c9cd58]" />}
                </button>
              );
            })}
          </div>

          {/* Search Filter */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchFeeds}
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

        {/* Single Feed Selector (Radio Cards) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 pt-1">
          {/* Omni Stream Option */}
          <button
            onClick={() => handleSelect(undefined)}
            className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-mono transition-all text-left ${
              isAllSelected
                ? 'bg-[#1e2220] border-[#c9cd58] text-[#e5e971] font-semibold shadow-sm ring-1 ring-[#c9cd58]/40'
                : 'bg-[#121414]/70 border-[#242828] text-neutral-400 hover:text-white hover:bg-[#1a1d1e]'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <span className="text-base">📡</span>
              <span className="truncate">{t.allChannels}</span>
            </div>
            <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
              isAllSelected ? 'border-[#c9cd58] bg-[#c9cd58]' : 'border-[#444]'
            }`}>
              {isAllSelected && <div className="w-1.5 h-1.5 rounded-full bg-[#121414]" />}
            </div>
          </button>

          {/* Individual Feeds */}
          {allFeeds.map((feed) => {
            const isSelected = activeFeedSlug === feed.slug;
            const theme = getFeedTheme(feed.slug, feed.title);
            const count = (notesByFeed[feed.slug] || []).length;

            return (
              <button
                key={feed.id}
                onClick={() => handleSelect(feed.slug)}
                className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-mono transition-all text-left ${
                  isSelected
                    ? 'bg-[#1e2220] border-[#c9cd58] text-[#e5e971] font-semibold shadow-sm ring-1 ring-[#c9cd58]/40'
                    : 'bg-[#121414]/70 border-[#242828] text-neutral-300 hover:text-white hover:bg-[#1a1d1e]'
                }`}
              >
                <div className="flex items-center gap-2 truncate min-w-0">
                  <span className="text-base shrink-0">{theme.emoji}</span>
                  <div className="truncate">
                    <span className="truncate block font-medium">{feed.title}</span>
                    <span className="text-[10px] text-neutral-500 font-mono block">
                      {count} {lang === 'ru' ? 'зап.' : 'notes'}
                    </span>
                  </div>
                </div>

                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ml-1 ${
                  isSelected ? 'border-[#c9cd58] bg-[#c9cd58]' : 'border-[#444]'
                }`}>
                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-[#121414]" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Feeds Deck Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredFeeds.map((feed) => {
          const isSelected = activeFeedSlug === feed.slug;
          const theme = getFeedTheme(feed.slug, feed.title);
          const feedNotes = notesByFeed[feed.slug] || [];
          const recentNotes = feedNotes.slice(0, 3);

          return (
            <div
              key={feed.id}
              className={`rounded-2xl bg-[#16191a] border transition-all duration-200 flex flex-col overflow-hidden shadow-lg relative group ${
                isSelected
                  ? 'border-[#c9cd58]/70 ring-1 ring-[#c9cd58]/40 shadow-glow-lemon/10'
                  : 'border-[#242828] hover:border-[#383a3a] hover:bg-[#1a1c1d]'
              }`}
            >
              {/* Card Accent Top Banner */}
              <div
                className="h-2 w-full transition-all"
                style={{ backgroundColor: theme.accentColor }}
              />

              {/* Card Header */}
              <div className="p-5 pb-3 flex-1 flex flex-col space-y-4">
                <div className="flex items-start justify-between gap-3">
                  {/* Channel Icon & Title */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 border shadow-sm"
                      style={{
                        backgroundColor: theme.bgLight,
                        borderColor: theme.borderAccent,
                      }}
                    >
                      <span>{theme.emoji}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-white truncate group-hover:text-[#e5e971] transition-colors">
                          {feed.title}
                        </h3>
                      </div>
                      <p className="text-[11px] font-mono text-[#c9c7b2] opacity-80 line-clamp-1">
                        {theme.tagline}
                      </p>
                      <span className="text-[10px] font-mono text-neutral-500">
                        slug: {feed.slug}
                      </span>
                    </div>
                  </div>

                  {/* Channel Active Status Pill */}
                  <button
                    onClick={() => handleSelect(feed.slug)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono font-semibold flex items-center gap-1 transition-all border ${
                      isSelected
                        ? 'bg-[#c9cd58]/20 border-[#c9cd58] text-[#e5e971]'
                        : 'bg-[#121414] border-[#242828] text-neutral-500 hover:text-neutral-300'
                    }`}
                    title={isSelected ? t.activeInCalendar : t.subscribe}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-[#c9cd58] animate-pulse' : 'bg-neutral-600'
                      }`}
                    />
                    <span>{isSelected ? t.inCalendar : t.subscribe}</span>
                  </button>
                </div>

                {/* Description snippet */}
                {feed.description && (
                  <p className="text-xs text-neutral-300 line-clamp-2 leading-relaxed bg-[#121414]/50 p-2.5 rounded-xl border border-[#242828]/60">
                    {feed.description}
                  </p>
                )}

                {/* Live News Stream Ticker / Recent Notes */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Rss className="w-3 h-3 text-[#c9cd58]" />
                      <span>{t.latestUpdate} ({feedNotes.length})</span>
                    </span>
                    {feedNotes.length > 3 && (
                      <span className="text-neutral-500">+{feedNotes.length - 3}</span>
                    )}
                  </div>

                  {recentNotes.length === 0 ? (
                    <div className="py-3 text-center text-neutral-500 text-xs font-mono bg-[#121414]/30 rounded-lg">
                      {t.emptyTimeline}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {recentNotes.map((note) => {
                        const noteColor = NoteTypeColors[note.type];
                        return (
                          <div
                            key={note.id}
                            onClick={() => onSelectNote(note)}
                            className="group/item flex items-center justify-between gap-2 p-1.5 rounded-lg bg-[#121414]/70 hover:bg-[#202425] border border-[#242828]/50 hover:border-[#383a3a] cursor-pointer transition-all text-xs font-mono"
                          >
                            <div className="flex items-center gap-2 truncate flex-1">
                              <span
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: noteColor.accent }}
                              />
                              <span className="truncate text-neutral-300 group-hover/item:text-white">
                                {note.title}
                              </span>
                            </div>
                            <span className="text-[10px] text-neutral-500 flex-shrink-0">
                              {dayjs(note.startDate).format('D MMM')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Quick Actions */}
              <div className="p-3 bg-[#121414]/80 border-t border-[#242828] flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    handleSelect(feed.slug);
                    onNavigateToTimeline();
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-mono font-semibold bg-[#242828] hover:bg-[#c9cd58] text-neutral-200 hover:text-[#121414] transition-all shadow-sm"
                  title={t.openInTimeline}
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>{t.openInTimeline}</span>
                </button>

                <button
                  onClick={() => handleSelect(feed.slug)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all border ${
                    isSelected
                      ? 'bg-[#c9cd58]/20 border-[#c9cd58]/60 text-[#e5e971]'
                      : 'bg-[#181a1a] border-[#242828] text-neutral-400 hover:text-white'
                  }`}
                >
                  {isSelected ? t.reset : t.subscribe}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Single-Feed Stream Dock / Bottom Bar */}
      <div className="sticky bottom-0 bg-[#16191b]/95 backdrop-blur-xl border border-[#2e3232] rounded-2xl p-4 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#c9cd58]/20 border border-[#c9cd58]/50 flex items-center justify-center text-[#e5e971]">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <div className="text-white font-semibold flex items-center gap-2">
              <span>{t.activeInCalendar}:</span>
              <span className="text-[#e5e971]">
                {isAllSelected
                  ? t.allChannels
                  : activeTheme?.title || activeFeedSlug}
              </span>
            </div>
            <div className="text-[11px] text-neutral-400 flex items-center gap-1.5">
              {isAllSelected ? (
                <span>{t.hubSubtitle}</span>
              ) : (
                <span>
                  {activeTheme?.title || activeFeedSlug}
                </span>
              )}
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


