import React, { useMemo, useCallback, useRef } from 'react';
import { Note, AppRuntimeMode } from '@lenta/shared';
import { useAppMode } from '../context/AppModeContext';
import { FeedAppMicrofrontend } from './feeds/FeedAppMicrofrontend';

export interface FeedsHubViewProps {
  notes?: Note[];
  isLoading?: boolean;
  selectedFeed?: string;
  selectedFeeds?: string[]; // for backwards compatibility
  startDate?: string;
  endDate?: string;
  appMode?: AppRuntimeMode;
  onAppModeChange?: (mode: AppRuntimeMode) => void;
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
 * Synchronizes 3-level route state and modal overlays with the calendar host URL.
 */
export const FeedsHubView: React.FC<FeedsHubViewProps> = ({
  selectedFeed,
  selectedFeeds,
  startDate,
  endDate,
  onSelectFeed,
  onNavigateToTimeline,
  onNavigateToCalendar,
  appMode: propAppMode,
  onAppModeChange: propOnAppModeChange,
}) => {
  const appModeCtx = useAppMode();
  const appMode = propAppMode || appModeCtx.appMode;
  const onAppModeChange = propOnAppModeChange || appModeCtx.setAppMode;

  const activeFeed = selectedFeed ?? (selectedFeeds && selectedFeeds.length > 0 ? selectedFeeds[0] : undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  const initialRoute = useMemo(() => {
    if (!activeFeed) return 'all';
    const clean = activeFeed.trim().replace(/^\/?feeds\/?/i, '').replace(/^\/+/, '');
    if (clean.includes('/')) return clean;
    if (
      clean === 'dev' ||
      clean === 'devhub' ||
      clean === 'seasons' ||
      clean === 'classic' ||
      clean === 'telegram' ||
      clean === 'tg'
    ) {
      if (clean === 'tg') return 'telegram';
      if (clean === 'devhub') return 'dev';
      return clean;
    }
    return clean;
  }, [activeFeed]);

  const handleMicrofrontendNavigate = useCallback(
    (payload: {
      url?: string;
      pathname?: string;
      streamSource?: string;
      selectedFeedSlug?: string;
      subtopicSlug?: string;
      noteId?: string;
    }) => {
      let route = '';
      if (payload.pathname) {
        route = payload.pathname.replace(/^\/+/, '');
      } else if (payload.streamSource) {
        route = payload.streamSource;
        if (payload.selectedFeedSlug) {
          route += `/${payload.selectedFeedSlug}`;
        }
      }
      if (payload.noteId) {
        route += `${route.includes('?') ? '&' : '?'}note=${encodeURIComponent(payload.noteId)}`;
      }
      if (onSelectFeed) {
        onSelectFeed(route || undefined);
      }
      containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [onSelectFeed]
  );

  const handleHostNavigate = useCallback(
    (view: string) => {
      if (view === 'month' || view === 'calendar') {
        onNavigateToCalendar?.();
      } else if (view === 'timeline') {
        onNavigateToTimeline?.();
      }
    },
    [onNavigateToCalendar, onNavigateToTimeline]
  );

  return (
    <div ref={containerRef} className="flex-1 flex flex-col h-full bg-[#121414] dark:bg-[#0e1621] overflow-y-auto transition-colors">
      <div className="max-w-6xl mx-auto w-full px-3 py-4 sm:px-5 sm:py-5">
        <FeedAppMicrofrontend
          initialRoute={initialRoute}
          startDate={startDate}
          endDate={endDate}
          onNavigate={handleMicrofrontendNavigate}
          appMode={appMode}
          onAppModeChange={onAppModeChange}
          onHostNavigate={handleHostNavigate}
        />
      </div>
    </div>
  );
};
