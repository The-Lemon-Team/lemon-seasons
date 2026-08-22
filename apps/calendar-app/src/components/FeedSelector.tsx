import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Note } from '@lenta/shared';
import {
  Radio,
  Sparkles,
  Search,
  Check,
  X,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';
import { useFeeds } from '../api/queries';
import { getFeedTheme, FEED_PRESET_OPTIONS } from '../utils/feedThemes';
import { useI18n } from '../i18n';

interface FeedSelectorProps {
  selectedFeed?: string;
  selectedFeeds?: string[]; // for backwards compatibility
  onSelectFeed?: (feedSlug?: string) => void;
  onToggleFeed?: (feedSlug: string) => void;
  onSelectOnlyFeed?: (feedSlug: string) => void;
  onSetAllFeeds?: (feeds: string[]) => void;
  onClearFeed?: () => void;
  onClearFeeds?: () => void;
  onOpenFeedsHub?: () => void;
  notes?: Note[];
}

export const FeedSelector: React.FC<FeedSelectorProps> = ({
  selectedFeed: propSelectedFeed,
  selectedFeeds,
  onSelectFeed,
  onToggleFeed,
  onSelectOnlyFeed,
  onClearFeed,
  onClearFeeds,
  onOpenFeedsHub,
  notes = [],
}) => {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: allFeeds = [] } = useFeeds();

  // Support single feed or array fallback
  const activeFeedSlug = propSelectedFeed ?? (selectedFeeds && selectedFeeds.length > 0 ? selectedFeeds[0] : undefined);
  const isAllActive = !activeFeedSlug;

  // Close on escape or outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Compute note counts per feed
  const feedCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const note of notes) {
      if (note.feed?.slug) {
        counts[note.feed.slug] = (counts[note.feed.slug] || 0) + 1;
      }
    }
    return counts;
  }, [notes]);

  // Filtered feeds by search query
  const filteredFeeds = useMemo(() => {
    if (!searchQuery.trim()) return allFeeds;
    const q = searchQuery.toLowerCase().trim();
    return allFeeds.filter(
      (f) =>
        f.title.toLowerCase().includes(q) ||
        f.slug.toLowerCase().includes(q) ||
        (f.description?.toLowerCase().includes(q))
    );
  }, [allFeeds, searchQuery]);

  const activeTheme = useMemo(() => {
    if (!activeFeedSlug) return null;
    const feed = allFeeds.find((f) => f.slug === activeFeedSlug);
    return getFeedTheme(activeFeedSlug, feed?.title);
  }, [activeFeedSlug, allFeeds]);

  // Handler for single feed selection
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
    setIsOpen(false);
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (onClearFeed) onClearFeed();
    else if (onClearFeeds) onClearFeeds();
    else if (onSelectFeed) onSelectFeed(undefined);
  };

  return (
    <div className="relative inline-flex items-center" ref={dropdownRef}>
      {/* Feed Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        type="button"
        className={`flex items-center gap-1.5 px-2.5 h-7 rounded-lg text-xs font-mono transition-all duration-150 border relative select-none shrink-0 ${
          !isAllActive
            ? 'bg-[#1e2020] border-[#c9cd58]/70 text-[#e5e971] shadow-sm font-medium'
            : 'bg-[#121414] border-[#242828] text-neutral-300 hover:text-white hover:bg-[#1a1c1c] hover:border-[#333535]'
        }`}
        title={t.newsFeeds}
      >
        <Radio className="w-3.5 h-3.5 text-[#c9cd58]" />

        {/* Selected Feed Badge or Omni-Stream */}
        {!isAllActive && activeTheme ? (
          <div className="flex items-center gap-1">
            <span
              className="w-2 h-2 rounded-full ring-1 ring-[#121414]"
              style={{ backgroundColor: activeTheme.accentColor }}
            />
            <span className="truncate max-w-[130px] font-semibold text-white">
              {activeTheme.shortTitle}
            </span>
          </div>
        ) : (
          <span>{t.allChannels}</span>
        )}

        {/* Action icons on trigger */}
        {!isAllActive ? (
          <div className="flex items-center gap-1 ml-0.5">
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              className="hover:text-white p-0.5 rounded-full hover:bg-black/30 transition-colors"
              title={t.reset}
            >
              <X className="w-3 h-3" />
            </span>
          </div>
        ) : (
          <ChevronDown
            className={`w-3 h-3 opacity-60 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[#e5e971]' : ''
            }`}
          />
        )}
      </button>

      {/* Feed Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-80 bg-[#16191b]/98 backdrop-blur-xl border border-[#242828] rounded-xl shadow-2xl z-50 p-3 space-y-3 animate-fade-in text-xs font-mono">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-[#242828]">
            <div className="flex items-center gap-1.5 text-white font-semibold uppercase tracking-wider text-[11px]">
              <Radio className="w-3.5 h-3.5 text-[#c9cd58]" />
              <span>{t.newsFeeds}</span>
            </div>

            <div className="flex items-center gap-2 text-[10px]">
              {onOpenFeedsHub && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenFeedsHub();
                  }}
                  className="text-[#c9cd58] hover:underline flex items-center gap-1"
                >
                  <span>{t.newsFeeds}</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Presets */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-mono text-neutral-500 block">
              {t.filtersAndChannels}
            </span>
            <div className="grid grid-cols-2 gap-1">
              {FEED_PRESET_OPTIONS.map((preset) => {
                const isSelected =
                  preset.slug === activeFeedSlug || (!preset.slug && isAllActive);

                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelect(preset.slug)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono flex items-center justify-between border transition-all ${
                      isSelected
                        ? 'bg-[#c9cd58]/20 border-[#c9cd58]/60 text-[#e5e971] font-semibold'
                        : 'bg-[#181a1a] border-[#242828] text-neutral-400 hover:text-white hover:bg-[#202222]'
                    }`}
                  >
                    <span className="truncate">
                      {preset.emoji} {preset.id === 'all' ? t.presetAll : preset.name}
                    </span>
                    {isSelected && <Check className="w-2.5 h-2.5 text-[#c9cd58]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search bar inside popover */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchFeeds}
              className="w-full bg-[#121414] border border-[#242828] rounded-lg pl-8 pr-7 py-1 text-xs text-white placeholder-neutral-500 font-mono focus:outline-none focus:border-[#c9cd58]/60"
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

          {/* Feeds List (Radio / Single Selection) */}
          <div className="space-y-1 max-h-56 overflow-y-auto pr-0.5">
            {/* Omni Broadcast option */}
            <div
              onClick={() => handleSelect(undefined)}
              className={`group w-full flex items-center justify-between p-2 rounded-lg text-xs transition-all border cursor-pointer select-none ${
                isAllActive
                  ? 'bg-[#191d1e] border-[#c9cd58]/50 shadow-sm'
                  : 'bg-[#181a1a]/50 border-transparent hover:bg-[#202222] hover:border-[#2e3232]'
              }`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs flex-shrink-0 border bg-[#c9cd58]/15 border-[#c9cd58]/40">
                  <span>📡</span>
                </div>
                <div className="flex-1 min-w-0">
                  <span
                    className={`font-semibold truncate text-[11px] block ${
                      isAllActive ? 'text-[#e5e971]' : 'text-neutral-200'
                    }`}
                  >
                    {t.allChannels}
                  </span>
                  <span className="text-[10px] font-mono text-neutral-500 truncate block">
                    {t.hubSubtitle}
                  </span>
                </div>
              </div>

              <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center border transition-all flex-shrink-0 border-[#383a3a] bg-[#1a1c1c]">
                {isAllActive && <div className="w-1.5 h-1.5 rounded-full bg-[#c9cd58]" />}
              </div>
            </div>

            {/* Individual Channels */}
            {filteredFeeds.map((feed) => {
              const isSelected = activeFeedSlug === feed.slug;
              const count = feedCounts[feed.slug] || 0;
              const theme = getFeedTheme(feed.slug, feed.title);

              return (
                <div
                  key={feed.id}
                  onClick={() => handleSelect(feed.slug)}
                  className={`group w-full flex items-center justify-between p-2 rounded-lg text-xs transition-all border cursor-pointer select-none ${
                    isSelected
                      ? 'bg-[#191d1e] border-[#c9cd58]/50 shadow-sm'
                      : 'bg-[#181a1a]/50 border-transparent hover:bg-[#202222] hover:border-[#2e3232]'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center text-xs flex-shrink-0 border"
                      style={{
                        backgroundColor: theme.bgLight,
                        borderColor: theme.borderAccent,
                      }}
                    >
                      <span>{theme.emoji}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-semibold truncate text-[11px] ${
                            isSelected ? 'text-[#e5e971]' : 'text-neutral-200'
                          }`}
                        >
                          {feed.title}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-neutral-500 truncate block">
                        {theme.tagline}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {count > 0 && (
                      <span className="text-[10px] text-neutral-500 font-mono">
                        {count}
                      </span>
                    )}
                    <div
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border transition-all ${
                        isSelected
                          ? 'border-[#c9cd58] bg-[#c9cd58]'
                          : 'border-[#383a3a] bg-[#1a1c1c] group-hover:border-neutral-400'
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-[#121414]" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer controls */}
          <div className="pt-2 border-t border-[#242828] flex items-center justify-between text-[10px] text-neutral-500">
            <span>{t.pressEsc}</span>
          </div>
        </div>
      )}
    </div>
  );
};


