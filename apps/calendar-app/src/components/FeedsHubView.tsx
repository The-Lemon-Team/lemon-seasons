import React, { useState, useMemo, useEffect } from 'react';
import { Note } from '@lenta/shared';
import { useFeeds } from '../api/queries';
import { FeedsSoftPanel } from './feeds/FeedsSoftPanel';
import { FeedPostCard } from './feeds/FeedPostCard';
import { FeedsSidebarRail } from './feeds/FeedsSidebarRail';
import { TelegramFeedsStream } from './feeds/TelegramFeedsStream';
import { Radio, Inbox } from 'lucide-react';
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
  const [streamSource, setStreamSource] = useState<FeedSourceMode>('spark');
  const [localSelectedFeed, setLocalSelectedFeed] = useState<string | undefined>(
    propSelectedFeed ?? (selectedFeeds && selectedFeeds.length > 0 ? selectedFeeds[0] : undefined)
  );
  const [searchQuery, setSearchQuery] = useState('');

  // Primary emphasis: Light (white) theme by default, with dark theme support
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return document.documentElement.classList.contains('dark');
  });

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Fetch registered backend feeds
  const { data: allFeeds = [] } = useFeeds();

  // Active adapter according to current stream source
  const activeAdapter = useMemo(() => {
    return FEED_ADAPTERS[streamSource] || FEED_ADAPTERS.spark;
  }, [streamSource]);

  // Handle switching source mode (Spark vs Classic vs Telegram)
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

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f1f5f9] dark:bg-[#0e1621] overflow-y-auto transition-colors">
      {/* Centered, Compact Container for Desktop & Mobile */}
      <div className="max-w-5xl mx-auto w-full px-3 py-4 sm:px-5 sm:py-5 space-y-4">
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
      </div>
    </div>
  );
};

