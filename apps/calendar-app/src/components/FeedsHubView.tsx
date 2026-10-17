import React, { useState, useMemo } from 'react';
import { Note } from '@lenta/shared';
import { useFeeds } from '../api/queries';
import { FeedsSoftPanel } from './feeds/FeedsSoftPanel';
import { FeedPostCard } from './feeds/FeedPostCard';
import { FeedsSidebarRail } from './feeds/FeedsSidebarRail';
import { TelegramFeedsStream } from './feeds/TelegramFeedsStream';
import { FeedAppMicrofrontend } from './feeds/FeedAppMicrofrontend';
import { Radio, Inbox, ExternalLink, Sparkles, Monitor } from 'lucide-react';
import {
  FEED_ADAPTERS,
  FeedSourceMode,
  UnifiedFeedItem,
  UnifiedFeedTab,
} from '../adapters/feeds';

export interface FeedsHubViewProps {
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
  const [viewMode, setViewMode] = useState<'native' | 'microfrontend'>('native');
  const [streamSource, setStreamSource] = useState<FeedSourceMode>('spark');
  const [localSelectedFeed, setLocalSelectedFeed] = useState<string | undefined>(
    propSelectedFeed ?? (selectedFeeds && selectedFeeds.length > 0 ? selectedFeeds[0] : undefined)
  );
  const [searchQuery, setSearchQuery] = useState('');

  // Primary dark theme
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Fetch registered backend feeds
  const { data: allFeeds = [] } = useFeeds();

  // Active adapter according to current stream source
  const activeAdapter = useMemo(() => {
    return FEED_ADAPTERS[streamSource] || FEED_ADAPTERS.spark;
  }, [streamSource]);

  // Handle switching source mode (Spark vs Seasons vs Classic vs Telegram)
  const handleSetStreamSource = (source: FeedSourceMode) => {
    setStreamSource(source);
    setLocalSelectedFeed(undefined);
    if (onClearFeed) onClearFeed();
    else if (onClearFeeds) onClearFeeds();
    else if (onSelectFeed) onSelectFeed(undefined);
  };

  // Thematic tabs resolved via active adapter
  const activeTabs: UnifiedFeedTab[] = useMemo(() => {
    return activeAdapter.getTabs({ allFeeds, notes });
  }, [activeAdapter, allFeeds, notes]);

  // Active tab object for sidebar detail preview
  const activeTabObj: UnifiedFeedTab | null = useMemo(() => {
    if (!localSelectedFeed) return null;
    return activeTabs.find((t) => t.slug === localSelectedFeed) || null;
  }, [activeTabs, localSelectedFeed]);

  // Total count for current source mode (unfiltered by feed)
  const totalNotesForMode = useMemo(() => {
    return activeAdapter.adaptNotes(notes, undefined, '').length;
  }, [activeAdapter, notes]);

  // Adapted and filtered feed items for the stream
  const feedItems: UnifiedFeedItem[] = useMemo(() => {
    return activeAdapter.adaptNotes(notes, localSelectedFeed, searchQuery);
  }, [activeAdapter, notes, localSelectedFeed, searchQuery]);

  // Available hashtags extracted from active items
  const availableTags = useMemo(() => {
    const tagsSet = new Set<string>();
    for (const item of feedItems) {
      if (item.hashtags) {
        for (const h of item.hashtags) {
          if (h) tagsSet.add(h);
        }
      }
    }
    return Array.from(tagsSet);
  }, [feedItems]);

  const handleSelectFeed = (slug?: string) => {
    if (!slug || slug === localSelectedFeed) {
      setLocalSelectedFeed(undefined);
      if (onClearFeed) onClearFeed();
      else if (onClearFeeds) onClearFeeds();
      else if (onSelectFeed) onSelectFeed(undefined);
    } else {
      setLocalSelectedFeed(slug);
      if (onSelectFeed) onSelectFeed(slug);
      else if (onSelectOnlyFeed) onSelectOnlyFeed(slug);
      else if (onToggleFeed) onToggleFeed(slug);
    }
  };

  const feedAppBase = import.meta.env.VITE_FEED_APP_URL || 'http://localhost:5175';

  return (
    <div className="flex-1 flex flex-col h-full bg-[#121414] dark:bg-[#0e1621] overflow-y-auto transition-colors">
      {/* Responsive Container with fixed stable width to avoid layout reflows and lags when switching modes */}
      <div className="max-w-6xl mx-auto w-full px-3 py-4 sm:px-5 sm:py-5 space-y-4">
        {/* Top Integration Mode Switcher (Native Reusable Components vs Microfrontend Embed) */}
        <div className="flex items-center justify-between gap-3 bg-[#181a1a] p-2 rounded-xl border border-[#242828] text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-[#93927e] hidden sm:inline mr-1">Режим интеграции:</span>
            <button
              onClick={() => setViewMode('native')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'native'
                  ? 'bg-[#c9cd58]/20 border border-[#c9cd58]/40 text-[#e5e971] font-bold shadow-sm'
                  : 'bg-[#121414] text-[#c9c7b2] hover:text-white border border-[#242828]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#c9cd58]" />
              <span>Нативная лента</span>
            </button>

            <button
              onClick={() => setViewMode('microfrontend')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'microfrontend'
                  ? 'bg-[#2481cc]/25 border border-[#2481cc]/50 text-[#64b5f6] font-bold shadow-sm'
                  : 'bg-[#121414] text-[#c9c7b2] hover:text-white border border-[#242828]'
              }`}
            >
              <Monitor className="w-3.5 h-3.5 text-[#2481cc]" />
              <span>Микрофронтенд (Feed App :5175)</span>
            </button>
          </div>

          <a
            href={feedAppBase}
            target="_blank"
            rel="noreferrer"
            className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[#93927e] hover:text-[#e5e971] hover:bg-[#242828] transition-colors"
            title="Открыть Feed App в новой вкладке"
          >
            <span>Feed App</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* View Mode 1: Embedded Standalone Microfrontend */}
        {viewMode === 'microfrontend' ? (
          <FeedAppMicrofrontend initialRoute={streamSource} />
        ) : (
          /* View Mode 2: Native Unified Components */
          <>
            {/* 1. Modern Soft Panel (Tabs, Search, Date Filter, Theme Switcher) */}
            <FeedsSoftPanel
              streamSource={streamSource}
              onSetStreamSource={handleSetStreamSource}
              tabs={activeTabs}
              activeFeedSlug={localSelectedFeed}
              isAllSelected={!localSelectedFeed}
              onSelectFeed={handleSelectFeed}
              totalNotesCount={totalNotesForMode}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              startDate={startDate}
              onPrevMonth={onPrevMonth}
              onNextMonth={onNextMonth}
              onSelectMonth={onSelectMonth}
              onSelectDate={onSelectDate}
              onToday={onToday}
              onNavigateToTimeline={onNavigateToTimeline}
              onNavigateToCalendar={onNavigateToCalendar}
              isDarkMode={isDarkMode}
              onToggleTheme={toggleTheme}
            />

        {/* 2. Main 2-Column Responsive Body */}
        <div className="flex flex-col lg:flex-row gap-5 items-start">
          {/* Left/Center Column: News Stream with optimal reading width */}
          <main className="flex-1 max-w-[700px] w-full min-w-0 space-y-3.5 mx-auto lg:mx-0">
            {streamSource === 'telegram' ? (
              /* Live Telegram folders and news stream from telegram-web-reader */
              <div className="p-4 sm:p-5 rounded-2xl bg-white/95 dark:bg-[#18222d]/95 border border-slate-200/80 dark:border-white/[0.08] shadow-2xs">
                <TelegramFeedsStream />
              </div>
            ) : (
              /* Unified Notes Stream (Spark or Classic) */
              <div>
                {isLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <Radio className="w-5 h-5 animate-pulse text-[#2481cc]" />
                    <span className="text-xs font-mono">Загрузка ленты...</span>
                  </div>
                ) : feedItems.length === 0 ? (
                  <div className="p-10 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 text-center text-slate-400 space-y-2">
                    <Inbox className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Нет публикаций в выбранной ленте
                    </h4>
                    <p className="text-xs max-w-sm mx-auto text-slate-500">
                      {streamSource === 'spark'
                        ? 'Поместите файлы Markdown в соответствующую папку Spark (например, Sparks/AI или Sparks/Habr) для автоматического импорта.'
                        : 'В выбранном временном периоде нет записей для этой категории.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {feedItems.map((item) => (
                      <FeedPostCard
                        key={item.id}
                        item={item}
                        onSelectNote={onSelectNote}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </main>

          {/* Right Rail: Channel Summary & Navigation (Desktop Only) */}
          <FeedsSidebarRail
            sourceType={streamSource}
            activeFeed={activeTabObj}
            tabs={activeTabs}
            selectedFeedSlug={localSelectedFeed}
            onSelectFeed={handleSelectFeed}
            totalNotesCount={totalNotesForMode}
            startDate={startDate}
            onNavigateToCalendar={onNavigateToCalendar}
            onSelectTag={(tag) => setSearchQuery(tag)}
            availableTags={availableTags}
          />
        </div>
        </>
        )}
      </div>
    </div>
  );
};

