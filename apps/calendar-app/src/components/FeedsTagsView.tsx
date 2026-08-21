import React, { useState, useMemo } from 'react';
import {
  Note,
  CalendarFilterState,
  CalendarViewMode,
  NoteType,
  NOTE_TYPES,
  NoteTypeLabels,
  NoteTypeColors,
} from '@lenta/shared';
import {
  useFeeds,
  useTaxonomyNodes,
  useTaxonomyTree,
  useHashtags,
} from '../api/queries';
import {
  Layers,
  Tag,
  Hash,
  Shapes,
  SlidersHorizontal,
  Check,
  RotateCcw,
  Search,
  ArrowUpRight,
  ListFilter,
  Calendar as CalendarIcon,
  GanttChartSquare,
  Sparkles,
  BarChart3,
  CheckSquare,
  Square,
  Info,
  ChevronRight,
  FolderTree,
} from 'lucide-react';

interface FeedsTagsViewProps {
  notes: Note[];
  isLoading: boolean;
  filterState: CalendarFilterState;
  onSetView: (view: CalendarViewMode) => void;
  onToggleFeed: (feedSlug: string) => void;
  onSelectOnlyFeed: (feedSlug: string) => void;
  onSetAllFeeds: (feedSlugs: string[]) => void;
  onClearFeeds: () => void;
  onToggleTag: (tagPath: string) => void;
  onSelectOnlyTag: (tagPath: string) => void;
  onSetAllTags: (tagPaths: string[]) => void;
  onClearTags: () => void;
  onToggleHashtag: (hashtag: string) => void;
  onSelectOnlyHashtag: (hashtag: string) => void;
  onSetAllHashtags: (hashtags: string[]) => void;
  onClearHashtags: () => void;
  onToggleType: (type: NoteType) => void;
  onSelectOnlyType: (type: NoteType) => void;
  onSetAllTypes: (types: NoteType[]) => void;
  onClearTypes: () => void;
  onResetFilters: () => void;
  onSelectNote?: (note: Note) => void;
}

export const FeedsTagsView: React.FC<FeedsTagsViewProps> = ({
  notes,
  isLoading,
  filterState,
  onSetView,
  onToggleFeed,
  onSelectOnlyFeed,
  onSetAllFeeds,
  onClearFeeds,
  onToggleTag,
  onSelectOnlyTag,
  onSetAllTags,
  onClearTags,
  onToggleHashtag,
  onSelectOnlyHashtag,
  onSetAllHashtags,
  onClearHashtags,
  onToggleType,
  onSelectOnlyType,
  onSetAllTypes,
  onClearTypes,
  onResetFilters,
}) => {
  // Queries
  const { data: feeds = [], isLoading: isFeedsLoading } = useFeeds();
  const { data: taxonomyNodes = [], isLoading: isTaxonomyLoading } = useTaxonomyNodes();
  const { data: taxonomyTree = [] } = useTaxonomyTree();
  const { data: hashtags = [], isLoading: isHashtagsLoading } = useHashtags();

  // Local Search Filters for within this page
  const [feedSearch, setFeedSearch] = useState('');
  const [tagSearch, setTagSearch] = useState('');
  const [hashtagSearch, setHashtagSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'feeds' | 'taxonomy' | 'hashtags' | 'types'>('all');

  // 1. Calculate per-feed counts in active notes list
  const feedRangeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const note of notes) {
      if (note.feed?.slug) {
        counts[note.feed.slug] = (counts[note.feed.slug] || 0) + 1;
      }
    }
    return counts;
  }, [notes]);

  // 2. Calculate per-tag counts in active notes list
  const tagRangeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const note of notes) {
      if (note.tags) {
        for (const t of note.tags) {
          counts[t.path] = (counts[t.path] || 0) + 1;
        }
      }
    }
    return counts;
  }, [notes]);

  // 3. Calculate per-hashtag counts in active notes list
  const hashtagRangeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const note of notes) {
      if (note.hashtags) {
        for (const h of note.hashtags) {
          const clean = h.name.toLowerCase().replace(/^#/, '');
          counts[clean] = (counts[clean] || 0) + 1;
        }
      }
    }
    return counts;
  }, [notes]);

  // 4. Calculate per-type counts in active notes list
  const typeRangeCounts = useMemo(() => {
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

  // Filtered lists for UI rendering
  const filteredFeeds = useMemo(() => {
    if (!feedSearch.trim()) return feeds;
    const q = feedSearch.toLowerCase();
    return feeds.filter(
      (f) => f.title.toLowerCase().includes(q) || f.slug.toLowerCase().includes(q) || (f.description && f.description.toLowerCase().includes(q))
    );
  }, [feeds, feedSearch]);

  const filteredTaxonomy = useMemo(() => {
    if (!tagSearch.trim()) return taxonomyNodes;
    const q = tagSearch.toLowerCase();
    return taxonomyNodes.filter(
      (t) => t.name.toLowerCase().includes(q) || t.path.toLowerCase().includes(q)
    );
  }, [taxonomyNodes, tagSearch]);

  const filteredHashtags = useMemo(() => {
    if (!hashtagSearch.trim()) return hashtags;
    const q = hashtagSearch.toLowerCase().replace(/^#/, '');
    return hashtags.filter((h) => h.name.toLowerCase().includes(q));
  }, [hashtags, hashtagSearch]);

  // Overall metric totals
  const totalDbFeedNotes = useMemo(
    () => feeds.reduce((sum, f) => sum + (f._count?.notes || 0), 0),
    [feeds]
  );
  const totalDbTaxonomyNotes = useMemo(
    () => taxonomyNodes.reduce((sum, t) => sum + (t._count?.notes || 0), 0),
    [taxonomyNodes]
  );
  const totalDbHashtagNotes = useMemo(
    () => hashtags.reduce((sum, h) => sum + (h._count?.notes || 0), 0),
    [hashtags]
  );

  const activeFiltersCount =
    filterState.feeds.length +
    filterState.tags.length +
    filterState.hashtags.length +
    filterState.types.length +
    (filterState.search ? 1 : 0);

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#121414] text-[#e2e2e2] p-4 lg:p-8 space-y-8 pb-32">
      {/* 1. Top Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#242828] pb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-1.5 rounded-lg bg-[#c9cd58]/20 border border-[#c9cd58]/40 text-[#e5e971]">
              <SlidersHorizontal className="w-5 h-5 text-[#c9cd58]" />
            </div>
            <h1 className="font-sans font-bold text-2xl text-[#f5f5f5] tracking-tight">
              Feeds & Taxonomy Matrix
            </h1>
            <span className="bg-[#1e2020] border border-[#333535] text-[#c9cd58] text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full">
              {activeFiltersCount > 0 ? `${activeFiltersCount} Active Filters` : 'All Feeds Active'}
            </span>
          </div>
          <p className="text-xs font-mono text-[#93927e]">
            Comprehensive control center to filter, cross-reference, and inspect notes across chronological feeds, taxonomy tags, hashtags, and note types.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5">
          {activeFiltersCount > 0 && (
            <button
              onClick={onResetFilters}
              className="px-3 py-2 rounded bg-[#1e2020] border border-[#333535] hover:border-[#c9cd58] text-xs font-mono text-[#c9c7b2] hover:text-[#e5e971] transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All Filters</span>
            </button>
          )}

          <button
            onClick={() => onSetView('timeline')}
            className="px-4 py-2 rounded bg-[#c9cd58] text-[#121414] font-mono text-xs font-bold hover:bg-[#d8dc68] transition-all flex items-center gap-2 shadow-glow-lemon"
          >
            <ListFilter className="w-4 h-4" />
            <span>Explore Timeline ({notes.length})</span>
          </button>
        </div>
      </div>

      {/* 2. Top KPI Overview Cards with Full Filter Counts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {/* Card 1: Data Feeds */}
        <div
          onClick={() => setActiveTab(activeTab === 'feeds' ? 'all' : 'feeds')}
          className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
            filterState.feeds.length > 0
              ? 'bg-[#1e2020] border-[#c9cd58]/60 shadow-[0_0_15px_rgba(201,205,88,0.1)]'
              : 'bg-[#181a1b] border-[#242828] hover:border-[#3a3d3d]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-mono text-[#c9c7b2]">
              <Layers className="w-4 h-4 text-[#c9cd58]" />
              <span>Data Feeds</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#121414] border border-[#242828] text-[#93927e]">
              {filterState.feeds.length > 0 ? `${filterState.feeds.length} of ${feeds.length} selected` : 'All Active'}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl lg:text-3xl font-bold text-[#f5f5f5]">
              {feeds.length}
            </span>
            <span className="font-mono text-xs text-[#93927e]">
              streams
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-[#242828] flex items-center justify-between text-[11px] font-mono text-[#93927e]">
            <span>DB Notes: <strong className="text-[#c9cd58]">{totalDbFeedNotes}</strong></span>
            <span>Range: <strong className="text-[#e2e2e2]">{notes.length}</strong></span>
          </div>
        </div>

        {/* Card 2: Taxonomy Tags */}
        <div
          onClick={() => setActiveTab(activeTab === 'taxonomy' ? 'all' : 'taxonomy')}
          className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
            filterState.tags.length > 0
              ? 'bg-[#1e2020] border-[#c9cd58]/60 shadow-[0_0_15px_rgba(201,205,88,0.1)]'
              : 'bg-[#181a1b] border-[#242828] hover:border-[#3a3d3d]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-mono text-[#c9c7b2]">
              <Tag className="w-4 h-4 text-[#c9cd58]" />
              <span>Taxonomy Tags</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#121414] border border-[#242828] text-[#93927e]">
              {filterState.tags.length > 0 ? `${filterState.tags.length} selected` : 'Any Tag'}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl lg:text-3xl font-bold text-[#f5f5f5]">
              {taxonomyNodes.length}
            </span>
            <span className="font-mono text-xs text-[#93927e]">
              paths
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-[#242828] flex items-center justify-between text-[11px] font-mono text-[#93927e]">
            <span>Tagged Notes: <strong className="text-[#c9cd58]">{totalDbTaxonomyNotes}</strong></span>
            <span>Active Tagged: <strong className="text-[#e2e2e2]">{Object.values(tagRangeCounts).reduce((a, b) => a + b, 0)}</strong></span>
          </div>
        </div>

        {/* Card 3: Hashtags */}
        <div
          onClick={() => setActiveTab(activeTab === 'hashtags' ? 'all' : 'hashtags')}
          className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
            filterState.hashtags.length > 0
              ? 'bg-[#1e2020] border-[#c9cd58]/60 shadow-[0_0_15px_rgba(201,205,88,0.1)]'
              : 'bg-[#181a1b] border-[#242828] hover:border-[#3a3d3d]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-mono text-[#c9c7b2]">
              <Hash className="w-4 h-4 text-[#c9cd58]" />
              <span>Hashtags</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#121414] border border-[#242828] text-[#93927e]">
              {filterState.hashtags.length > 0 ? `${filterState.hashtags.length} selected` : 'Any Hash'}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl lg:text-3xl font-bold text-[#f5f5f5]">
              {hashtags.length}
            </span>
            <span className="font-mono text-xs text-[#93927e]">
              tags
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-[#242828] flex items-center justify-between text-[11px] font-mono text-[#93927e]">
            <span>Mentions: <strong className="text-[#c9cd58]">{totalDbHashtagNotes}</strong></span>
            <span>Active: <strong className="text-[#e2e2e2]">{Object.values(hashtagRangeCounts).reduce((a, b) => a + b, 0)}</strong></span>
          </div>
        </div>

        {/* Card 4: Note Types */}
        <div
          onClick={() => setActiveTab(activeTab === 'types' ? 'all' : 'types')}
          className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
            filterState.types.length > 0
              ? 'bg-[#1e2020] border-[#c9cd58]/60 shadow-[0_0_15px_rgba(201,205,88,0.1)]'
              : 'bg-[#181a1b] border-[#242828] hover:border-[#3a3d3d]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-mono text-[#c9c7b2]">
              <Shapes className="w-4 h-4 text-[#c9cd58]" />
              <span>Note Types</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#121414] border border-[#242828] text-[#93927e]">
              {filterState.types.length > 0 ? `${filterState.types.length} of ${NOTE_TYPES.length}` : 'All Types'}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl lg:text-3xl font-bold text-[#f5f5f5]">
              {NOTE_TYPES.length}
            </span>
            <span className="font-mono text-xs text-[#93927e]">
              types
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-[#242828] flex items-center justify-between text-[11px] font-mono text-[#93927e]">
            <span>Active Range: <strong className="text-[#c9cd58]">{notes.length}</strong> notes</span>
            <span className="text-[#e5e971] font-semibold">100% indexed</span>
          </div>
        </div>
      </div>

      {/* 3. Section Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-[#242828] pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-t text-xs font-mono transition-colors flex items-center gap-1.5 border-b-2 -mb-1 ${
            activeTab === 'all'
              ? 'border-[#c9cd58] text-[#e5e971] font-bold bg-[#1e2020]/60'
              : 'border-transparent text-[#93927e] hover:text-[#e2e2e2]'
          }`}
        >
          <span>All Dimensions</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-[#121414] rounded-full border border-[#242828]">
            4
          </span>
        </button>

        <button
          onClick={() => setActiveTab('feeds')}
          className={`px-3 py-1.5 rounded-t text-xs font-mono transition-colors flex items-center gap-1.5 border-b-2 -mb-1 ${
            activeTab === 'feeds'
              ? 'border-[#c9cd58] text-[#e5e971] font-bold bg-[#1e2020]/60'
              : 'border-transparent text-[#93927e] hover:text-[#e2e2e2]'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-[#c9cd58]" />
          <span>Feeds</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-[#121414] rounded-full border border-[#242828]">
            {feeds.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('taxonomy')}
          className={`px-3 py-1.5 rounded-t text-xs font-mono transition-colors flex items-center gap-1.5 border-b-2 -mb-1 ${
            activeTab === 'taxonomy'
              ? 'border-[#c9cd58] text-[#e5e971] font-bold bg-[#1e2020]/60'
              : 'border-transparent text-[#93927e] hover:text-[#e2e2e2]'
          }`}
        >
          <Tag className="w-3.5 h-3.5 text-[#c9cd58]" />
          <span>Taxonomy</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-[#121414] rounded-full border border-[#242828]">
            {taxonomyNodes.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('hashtags')}
          className={`px-3 py-1.5 rounded-t text-xs font-mono transition-colors flex items-center gap-1.5 border-b-2 -mb-1 ${
            activeTab === 'hashtags'
              ? 'border-[#c9cd58] text-[#e5e971] font-bold bg-[#1e2020]/60'
              : 'border-transparent text-[#93927e] hover:text-[#e2e2e2]'
          }`}
        >
          <Hash className="w-3.5 h-3.5 text-[#c9cd58]" />
          <span>Hashtags</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-[#121414] rounded-full border border-[#242828]">
            {hashtags.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('types')}
          className={`px-3 py-1.5 rounded-t text-xs font-mono transition-colors flex items-center gap-1.5 border-b-2 -mb-1 ${
            activeTab === 'types'
              ? 'border-[#c9cd58] text-[#e5e971] font-bold bg-[#1e2020]/60'
              : 'border-transparent text-[#93927e] hover:text-[#e2e2e2]'
          }`}
        >
          <Shapes className="w-3.5 h-3.5 text-[#c9cd58]" />
          <span>Note Types</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-[#121414] rounded-full border border-[#242828]">
            {NOTE_TYPES.length}
          </span>
        </button>
      </div>

      {/* 4. SECTION: DATA FEEDS HUB */}
      {(activeTab === 'all' || activeTab === 'feeds') && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#181a1b] p-4 rounded-xl border border-[#242828]">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-[#c9cd58]/20 text-[#c9cd58]">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-sans font-bold text-base text-[#f5f5f5]">
                  Data Feeds Hub
                </h2>
                <p className="text-xs font-mono text-[#93927e]">
                  Manage streams and filter events by chronological feeds.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Search feed */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#93927e]" />
                <input
                  type="text"
                  placeholder="Filter feeds..."
                  value={feedSearch}
                  onChange={(e) => setFeedSearch(e.target.value)}
                  className="bg-[#121414] border border-[#242828] focus:border-[#c9cd58] rounded text-xs font-mono pl-7 pr-2.5 py-1 text-[#e2e2e2] placeholder-[#93927e] outline-none"
                />
              </div>

              {/* Batch Actions */}
              <button
                onClick={() => onSetAllFeeds(feeds.map((f) => f.slug))}
                className="px-2.5 py-1 rounded bg-[#1e2020] border border-[#242828] hover:border-[#484837] text-[11px] font-mono text-[#c9c7b2] hover:text-white transition-colors flex items-center gap-1"
                title="Select All Feeds"
              >
                <CheckSquare className="w-3 h-3 text-[#c9cd58]" />
                <span>Select All</span>
              </button>

              <button
                onClick={onClearFeeds}
                className="px-2.5 py-1 rounded bg-[#1e2020] border border-[#242828] hover:border-[#484837] text-[11px] font-mono text-[#c9c7b2] hover:text-white transition-colors flex items-center gap-1"
                title="Clear Selected Feeds"
              >
                <Square className="w-3 h-3 text-[#93927e]" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          {/* Feeds Bento Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFeeds.map((feed) => {
              const isSelected = filterState.feeds.includes(feed.slug);
              const dbCount = feed._count?.notes ?? 0;
              const rangeCount = feedRangeCounts[feed.slug] ?? 0;

              return (
                <div
                  key={feed.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between relative group ${
                    isSelected
                      ? 'bg-[#1e2020] border-[#c9cd58] shadow-[0_0_20px_rgba(201,205,88,0.15)] ring-1 ring-[#c9cd58]/40'
                      : 'bg-[#181a1b] border-[#242828] hover:border-[#3a3d3d] hover:bg-[#1a1d1e]'
                  }`}
                >
                  <div>
                    {/* Top Row: Slug & Toggle Checkbox */}
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[#121414] border border-[#333535] text-[#c9cd58]">
                        /{feed.slug}
                      </span>

                      <button
                        onClick={() => onToggleFeed(feed.slug)}
                        className={`w-6 h-6 rounded flex items-center justify-center border transition-colors ${
                          isSelected
                            ? 'bg-[#c9cd58] border-[#c9cd58] text-[#121414]'
                            : 'bg-[#121414] border-[#333535] text-transparent hover:border-[#c9cd58]'
                        }`}
                        title={isSelected ? 'Deselect Feed' : 'Select Feed'}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    </div>

                    {/* Feed Title & Description */}
                    <h3
                      onClick={() => onToggleFeed(feed.slug)}
                      className="font-sans font-bold text-base text-[#f5f5f5] group-hover:text-[#e5e971] transition-colors cursor-pointer mb-1"
                    >
                      {feed.title}
                    </h3>
                    <p className="text-xs text-[#93927e] font-sans line-clamp-2 leading-relaxed mb-4">
                      {feed.description || 'No description provided.'}
                    </p>
                  </div>

                  {/* Counts & Quick Drilldown Bar */}
                  <div className="pt-3 border-t border-[#242828] flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="text-[#93927e]">
                        DB: <strong className="text-[#c9cd58]">{dbCount}</strong>
                      </span>
                      <span className="text-[#93927e]">
                        In Range: <strong className="text-[#e2e2e2]">{rangeCount}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onSelectOnlyFeed(feed.slug)}
                        className="px-2 py-1 rounded bg-[#121414] hover:bg-[#242828] text-[11px] font-mono text-[#c9c7b2] hover:text-[#e5e971] transition-colors border border-[#242828]"
                        title="Filter Only This Feed"
                      >
                        Solo
                      </button>
                      <button
                        onClick={() => {
                          onSelectOnlyFeed(feed.slug);
                          onSetView('timeline');
                        }}
                        className="px-2 py-1 rounded bg-[#c9cd58]/20 hover:bg-[#c9cd58] text-[#e5e971] hover:text-[#121414] text-[11px] font-mono font-semibold transition-colors border border-[#c9cd58]/40 flex items-center gap-0.5"
                        title="Explore Feed in Timeline"
                      >
                        <span>View</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 5. SECTION: TAXONOMY HIERARCHY & TAGS */}
      {(activeTab === 'all' || activeTab === 'taxonomy') && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#181a1b] p-4 rounded-xl border border-[#242828]">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-[#c9cd58]/20 text-[#c9cd58]">
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-sans font-bold text-base text-[#f5f5f5]">
                  Taxonomy Hierarchy & Tags
                </h2>
                <p className="text-xs font-mono text-[#93927e]">
                  PostgreSQL ltree semantic topic paths with note counters.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#93927e]" />
                <input
                  type="text"
                  placeholder="Filter taxonomy..."
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  className="bg-[#121414] border border-[#242828] focus:border-[#c9cd58] rounded text-xs font-mono pl-7 pr-2.5 py-1 text-[#e2e2e2] placeholder-[#93927e] outline-none"
                />
              </div>

              <button
                onClick={() => onSetAllTags(taxonomyNodes.map((t) => t.path))}
                className="px-2.5 py-1 rounded bg-[#1e2020] border border-[#242828] hover:border-[#484837] text-[11px] font-mono text-[#c9c7b2] hover:text-white transition-colors flex items-center gap-1"
                title="Select All Taxonomy Tags"
              >
                <CheckSquare className="w-3 h-3 text-[#c9cd58]" />
                <span>Select All</span>
              </button>

              <button
                onClick={onClearTags}
                className="px-2.5 py-1 rounded bg-[#1e2020] border border-[#242828] hover:border-[#484837] text-[11px] font-mono text-[#c9c7b2] hover:text-white transition-colors flex items-center gap-1"
                title="Clear Taxonomy Filters"
              >
                <Square className="w-3 h-3 text-[#93927e]" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          {/* Taxonomy Chips & Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTaxonomy.map((node) => {
              const isSelected = filterState.tags.includes(node.path);
              const dbCount = (node as any)._count?.notes ?? (node as any).notesCount ?? 0;
              const rangeCount = tagRangeCounts[node.path] ?? 0;
              const depth = node.path.split('.').length;

              return (
                <div
                  key={node.id}
                  className={`p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-[#1e2020] border-[#c9cd58] shadow-sm ring-1 ring-[#c9cd58]/40'
                      : 'bg-[#181a1b] border-[#242828] hover:border-[#3a3d3d]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                    <button
                      onClick={() => onToggleTag(node.path)}
                      className={`w-5 h-5 rounded flex items-center justify-center border shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-[#c9cd58] border-[#c9cd58] text-[#121414]'
                          : 'bg-[#121414] border-[#333535] text-transparent hover:border-[#c9cd58]'
                      }`}
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-[#f5f5f5] truncate">
                          {node.name}
                        </span>
                        {depth > 1 && (
                          <span className="text-[10px] font-mono text-[#93927e] px-1 py-0.2 rounded bg-[#121414] border border-[#242828]">
                            L{depth}
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-[11px] text-[#93927e] truncate">
                        {node.path}
                      </p>
                    </div>
                  </div>

                  {/* Counters & Solo button */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <span className="font-mono text-xs font-bold text-[#c9cd58] block">
                        {dbCount}
                      </span>
                      <span className="font-mono text-[10px] text-[#93927e] block">
                        {rangeCount > 0 ? `${rangeCount} in range` : '0 in range'}
                      </span>
                    </div>

                    <button
                      onClick={() => onSelectOnlyTag(node.path)}
                      className="px-1.5 py-0.5 rounded bg-[#121414] hover:bg-[#242828] text-[10px] font-mono text-[#c9c7b2] hover:text-[#e5e971] border border-[#242828]"
                      title="Filter Only This Tag"
                    >
                      Solo
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 6. SECTION: HASHTAGS DIRECTORY & POPULARITY CLOUD */}
      {(activeTab === 'all' || activeTab === 'hashtags') && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#181a1b] p-4 rounded-xl border border-[#242828]">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-[#c9cd58]/20 text-[#c9cd58]">
                <Hash className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-sans font-bold text-base text-[#f5f5f5]">
                  Hashtags Cloud & Directory
                </h2>
                <p className="text-xs font-mono text-[#93927e]">
                  Auto-extracted inline markdown hashtags ranked by frequency.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#93927e]" />
                <input
                  type="text"
                  placeholder="Filter hashtags..."
                  value={hashtagSearch}
                  onChange={(e) => setHashtagSearch(e.target.value)}
                  className="bg-[#121414] border border-[#242828] focus:border-[#c9cd58] rounded text-xs font-mono pl-7 pr-2.5 py-1 text-[#e2e2e2] placeholder-[#93927e] outline-none"
                />
              </div>

              <button
                onClick={() => onSetAllHashtags(hashtags.map((h) => h.name))}
                className="px-2.5 py-1 rounded bg-[#1e2020] border border-[#242828] hover:border-[#484837] text-[11px] font-mono text-[#c9c7b2] hover:text-white transition-colors flex items-center gap-1"
                title="Select All Hashtags"
              >
                <CheckSquare className="w-3 h-3 text-[#c9cd58]" />
                <span>Select All</span>
              </button>

              <button
                onClick={onClearHashtags}
                className="px-2.5 py-1 rounded bg-[#1e2020] border border-[#242828] hover:border-[#484837] text-[11px] font-mono text-[#c9c7b2] hover:text-white transition-colors flex items-center gap-1"
                title="Clear Hashtag Filters"
              >
                <Square className="w-3 h-3 text-[#93927e]" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          {/* Hashtags Cloud Pills Grid */}
          <div className="p-5 rounded-xl bg-[#181a1b] border border-[#242828] flex flex-wrap gap-2.5">
            {filteredHashtags.map((ht, idx) => {
              const clean = ht.name.toLowerCase().replace(/^#/, '');
              const isSelected = filterState.hashtags.includes(clean);
              const dbCount = ht._count?.notes ?? 0;
              const rangeCount = hashtagRangeCounts[clean] ?? 0;

              return (
                <button
                  key={ht.id}
                  onClick={() => onToggleHashtag(clean)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-2 border ${
                    isSelected
                      ? 'bg-[#c9cd58]/20 border-[#c9cd58] text-[#e5e971] font-bold shadow-[0_0_12px_rgba(201,205,88,0.2)] ring-1 ring-[#c9cd58]/40'
                      : 'bg-[#121414] border-[#242828] text-[#c9c7b2] hover:border-[#484837] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span className="text-[#93927e]">#</span>
                    <span>{clean}</span>
                  </div>

                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                      isSelected
                        ? 'bg-[#c9cd58] text-[#121414]'
                        : 'bg-[#1e2020] text-[#c9cd58] border border-[#242828]'
                    }`}
                  >
                    {dbCount}
                    {rangeCount > 0 && <span className="opacity-80 ml-0.5">({rangeCount})</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 7. SECTION: NOTE TYPES DISTRIBUTION MATRIX */}
      {(activeTab === 'all' || activeTab === 'types') && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#181a1b] p-4 rounded-xl border border-[#242828]">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-[#c9cd58]/20 text-[#c9cd58]">
                <Shapes className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-sans font-bold text-base text-[#f5f5f5]">
                  Note Types Distribution Matrix
                </h2>
                <p className="text-xs font-mono text-[#93927e]">
                  Temporal categorization schema and distribution counts.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onSetAllTypes([...NOTE_TYPES])}
                className="px-2.5 py-1 rounded bg-[#1e2020] border border-[#242828] hover:border-[#484837] text-[11px] font-mono text-[#c9c7b2] hover:text-white transition-colors flex items-center gap-1"
              >
                <CheckSquare className="w-3 h-3 text-[#c9cd58]" />
                <span>Select All Types</span>
              </button>

              <button
                onClick={onClearTypes}
                className="px-2.5 py-1 rounded bg-[#1e2020] border border-[#242828] hover:border-[#484837] text-[11px] font-mono text-[#c9c7b2] hover:text-white transition-colors flex items-center gap-1"
              >
                <Square className="w-3 h-3 text-[#93927e]" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          {/* Types Matrix Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {NOTE_TYPES.map((type) => {
              const isSelected = filterState.types.includes(type);
              const colors = NoteTypeColors[type];
              const count = typeRangeCounts[type] || 0;
              const percentage = notes.length > 0 ? Math.round((count / notes.length) * 100) : 0;

              return (
                <div
                  key={type}
                  onClick={() => onToggleType(type)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'shadow-[0_0_15px_rgba(201,205,88,0.2)] ring-1 ring-[#c9cd58]/50'
                      : 'hover:opacity-100 opacity-80'
                  }`}
                  style={{
                    backgroundColor: colors.bg,
                    borderColor: isSelected ? colors.accent : colors.border,
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="font-mono text-xs font-bold uppercase tracking-wider"
                      style={{ color: colors.text }}
                    >
                      {NoteTypeLabels[type]}
                    </span>
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border ${
                        isSelected ? 'bg-[#c9cd58] border-[#c9cd58] text-[#121414]' : 'border-current opacity-40'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between mt-3 pt-2 border-t border-white/10">
                    <span className="font-mono text-xl font-bold" style={{ color: colors.accent }}>
                      {count}
                    </span>
                    <span className="font-mono text-[11px] opacity-70">
                      {percentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 8. Sticky Floating Action Bar at Bottom */}
      <div className="fixed bottom-4 left-4 right-4 md:left-72 md:right-8 bg-[#1e2020]/95 backdrop-blur-md border border-[#c9cd58]/50 rounded-2xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.8)] z-40 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#c9cd58]/20 border border-[#c9cd58] flex items-center justify-center text-sm shadow-glow-lemon text-[#e5e971]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#f5f5f5]">
                {notes.length} Matching Notes
              </span>
              <span className="text-[11px] font-mono text-[#c9cd58]">
                ({activeFiltersCount} filter{activeFiltersCount === 1 ? '' : 's'} active)
              </span>
            </div>
            <p className="text-[11px] font-mono text-[#93927e]">
              Selected feeds: {filterState.feeds.length || 'All'}, tags: {filterState.tags.length || 'All'}, hashtags: {filterState.hashtags.length || 'All'}, types: {filterState.types.length || 'All'}
            </p>
          </div>
        </div>

        {/* View Jump Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeFiltersCount > 0 && (
            <button
              onClick={onResetFilters}
              className="px-3 py-1.5 rounded-lg bg-[#121414] hover:bg-[#242828] text-xs font-mono text-[#93927e] hover:text-[#e2e2e2] border border-[#242828] transition-colors"
            >
              Reset
            </button>
          )}

          <button
            onClick={() => onSetView('timeline')}
            className="px-3.5 py-1.5 rounded-lg bg-[#121414] hover:bg-[#242828] text-xs font-mono font-semibold text-[#e2e2e2] hover:text-[#e5e971] border border-[#242828] hover:border-[#c9cd58] transition-colors flex items-center gap-1.5 shadow"
          >
            <ListFilter className="w-3.5 h-3.5 text-[#c9cd58]" />
            <span>Timeline</span>
          </button>

          <button
            onClick={() => onSetView('month')}
            className="px-3.5 py-1.5 rounded-lg bg-[#121414] hover:bg-[#242828] text-xs font-mono font-semibold text-[#e2e2e2] hover:text-[#e5e971] border border-[#242828] hover:border-[#c9cd58] transition-colors flex items-center gap-1.5 shadow"
          >
            <CalendarIcon className="w-3.5 h-3.5 text-[#c9cd58]" />
            <span>Calendar</span>
          </button>

          <button
            onClick={() => onSetView('gantt')}
            className="px-3.5 py-1.5 rounded-lg bg-[#c9cd58] hover:bg-[#d8dc68] text-xs font-mono font-bold text-[#121414] transition-all flex items-center gap-1.5 shadow-glow-lemon"
          >
            <GanttChartSquare className="w-3.5 h-3.5" />
            <span>Gantt Swimlane</span>
          </button>
        </div>
      </div>
    </div>
  );
};
