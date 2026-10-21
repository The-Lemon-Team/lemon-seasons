import React, { useMemo } from 'react';
import { Note } from '@lenta/shared';
import { FeedAppMicrofrontend } from './feeds/FeedAppMicrofrontend';

export interface FeedsHubViewProps {
  notes?: Note[];
  isLoading?: boolean;
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
  onSelectNote?: (note: Note) => void;
  onNavigateToTimeline?: () => void;
  onNavigateToCalendar?: () => void;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  onSelectMonth?: (year: number, monthIndex: number) => void;
  onSelectDate?: (dateKey: string) => void;
  onToday?: () => void;
}

/**
 * FeedsHubView renders the dedicated microfrontend feed stream (@lenta/feed-app :5175).
 * Native switch mode removed in favor of the optimized, standalone microfrontend experience.
 */
export const FeedsHubView: React.FC<FeedsHubViewProps> = ({
  selectedFeed,
  selectedFeeds,
  startDate,
  endDate,
}) => {
  const activeFeed = selectedFeed ?? (selectedFeeds && selectedFeeds.length > 0 ? selectedFeeds[0] : undefined);

  const initialRoute = useMemo(() => {
    if (!activeFeed) return 'spark';
    if (
      activeFeed === 'dev' ||
      activeFeed === 'devhub' ||
      activeFeed === 'seasons' ||
      activeFeed === 'classic' ||
      activeFeed === 'telegram' ||
      activeFeed === 'tg'
    ) {
      if (activeFeed === 'tg') return 'telegram';
      if (activeFeed === 'devhub') return 'dev';
      return activeFeed;
    }
    return `spark?feed=${encodeURIComponent(activeFeed)}`;
  }, [activeFeed]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#121414] dark:bg-[#0e1621] overflow-y-auto transition-colors">
      {/* Responsive Container with fixed stable width to avoid layout reflows */}
      <div className="max-w-6xl mx-auto w-full px-3 py-4 sm:px-5 sm:py-5">
        <FeedAppMicrofrontend
          initialRoute={initialRoute}
          startDate={startDate}
          endDate={endDate}
        />
      </div>
    </div>
  );
};
