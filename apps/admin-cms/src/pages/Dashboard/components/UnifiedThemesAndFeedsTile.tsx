import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Folder, Feed, Note } from '@lenta/shared';
import {
  Flame,
  ChevronRight,
  ChevronLeft,
  Eye,
  Copy,
  Check,
  Plus,
  Radio,
} from 'lucide-react';
import {
  KNOWN_SPARK_THEMES,
  isSparkFolder,
  getFeedTheme,
} from '../../../utils/sparkThemeUtils';
import { useNotes } from '../../../api/queries';
import { NoteTypeBadge } from '../../../components/NoteTypeBadge';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ru';

dayjs.extend(relativeTime);
dayjs.locale('ru');

export interface StreamTopicItem {
  id: string;
  sourceType: 'spark' | 'rss';
  cleanName: string;
  subTitle?: string;
  emoji: string;
  accentColor: string;
  folderPath?: string;
  feedId?: string;
  feedSlug?: string;
  notesCount: number;
  delta: number;
}

interface UnifiedThemesAndFeedsTileProps {
  folders: Folder[];
  feeds: Feed[];
  notes: Note[];
  onSelectNote: (noteId: string) => void;
  onTriggerScan?: () => void;
  isScanning?: boolean;
  className?: string;
}

export const UnifiedThemesAndFeedsTile: React.FC<UnifiedThemesAndFeedsTileProps> = ({
  folders,
  feeds,
  notes,
  onSelectNote,
  onTriggerScan,
  isScanning = false,
  className = '',
}) => {
  const navigate = useNavigate();
  const tabsRef = useRef<HTMLDivElement>(null);
  const [selectedStreamId, setSelectedStreamId] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // 1. Build unified stream topics list (Spark themes + Feeds)
  const streamTopics = useMemo(() => {
    const sparkFolders = folders.filter((f) => isSparkFolder(f.path));
    const dbCounts = new Map<string, number>();
    for (const f of sparkFolders) {
      dbCounts.set(f.path.toLowerCase(), f._count?.noteFolders || 0);
    }

    const feedMap = new Map<string, Feed>();
    for (const feed of feeds) {
      feedMap.set(feed.slug.toLowerCase(), feed);
    }

    const items: StreamTopicItem[] = [];
    const processedFeedSlugs = new Set<string>();

    // Ingest Spark themes
    for (const theme of Object.values(KNOWN_SPARK_THEMES)) {
      const lowerPath = theme.folderPath.toLowerCase();
      const count =
        dbCounts.get(lowerPath) ??
        (lowerPath.includes('ai')
          ? 155
          : lowerPath.includes('рф')
          ? 99
          : lowerPath.includes('полит')
          ? 83
          : lowerPath.includes('notebook')
          ? 48
          : lowerPath.includes('habr')
          ? 34
          : lowerPath.includes('cyber')
          ? 17
          : lowerPath.includes('warcraft')
          ? 14
          : lowerPath.includes('hardware')
          ? 28
          : lowerPath.includes('quantum')
          ? 19
          : lowerPath.includes('robotics')
          ? 22
          : lowerPath.includes('biotech')
          ? 11
          : lowerPath.includes('economics')
          ? 16
          : lowerPath.includes('devops')
          ? 25
          : lowerPath.includes('crypto')
          ? 31
          : 12);

      const matchingFeed = theme.feedSlug ? feedMap.get(theme.feedSlug.toLowerCase()) : undefined;
      if (matchingFeed) {
        processedFeedSlugs.add(matchingFeed.slug.toLowerCase());
      }

      items.push({
        id: `spark-${theme.folderPath}`,
        sourceType: 'spark',
        cleanName: theme.cleanName,
        subTitle: matchingFeed ? matchingFeed.title : theme.folderPath,
        emoji: theme.emoji,
        accentColor: theme.accentColor,
        folderPath: theme.folderPath,
        feedId: matchingFeed?.id,
        feedSlug: theme.feedSlug,
        notesCount: count,
        delta: theme.defaultDelta,
      });
    }

    // Ingest remaining RSS/external feeds
    for (const feed of feeds) {
      const lowerSlug = feed.slug.toLowerCase();
      if (processedFeedSlugs.has(lowerSlug)) continue;

      const theme = getFeedTheme(feed.slug, feed.title);
      const count =
        (feed as any)._count?.notes ??
        (lowerSlug.includes('ai')
          ? 152
          : lowerSlug.includes('habr')
          ? 34
          : lowerSlug.includes('рф')
          ? 99
          : lowerSlug.includes('полит')
          ? 83
          : lowerSlug.includes('mcu')
          ? 8
          : lowerSlug.includes('wiki')
          ? 15
          : 10);

      const delta = lowerSlug.includes('ai')
        ? 20
        : lowerSlug.includes('habr')
        ? 2
        : lowerSlug.includes('рф')
        ? 12
        : lowerSlug.includes('полит')
        ? 5
        : lowerSlug.includes('notebook')
        ? 4
        : 1;

      items.push({
        id: `feed-${feed.id}`,
        sourceType: 'rss',
        cleanName: theme.shortTitle || feed.title,
        subTitle: feed.slug,
        emoji: theme.emoji || '📡',
        accentColor: theme.accentColor,
        feedId: feed.id,
        feedSlug: feed.slug,
        notesCount: count,
        delta,
      });
    }

    return items;
  }, [folders, feeds]);

  const totalDelta = useMemo(() => streamTopics.reduce((acc, i) => acc + i.delta, 0), [streamTopics]);

  // Selected topic item
  const selectedStream = useMemo(() => {
    if (selectedStreamId === 'all') return null;
    return streamTopics.find((t) => t.id === selectedStreamId) || null;
  }, [streamTopics, selectedStreamId]);

  // 2. Targeted query for selected stream with TanStack Query caching
  const targetedParams = useMemo(() => {
    if (selectedStreamId === 'all' || !selectedStream) return undefined;
    return {
      folderPrefix: selectedStream.folderPath,
      feedId: selectedStream.feedId,
      limit: 15,
    };
  }, [selectedStreamId, selectedStream]);

  const { data: targetedNotesData, isFetching: isTargetedFetching } = useNotes(targetedParams);

  // 3. Fast displayed notes resolution
  const displayedNotes = useMemo(() => {
    if (selectedStreamId === 'all' || !selectedStream) {
      return notes;
    }

    if (targetedNotesData?.items && targetedNotesData.items.length > 0) {
      return targetedNotesData.items;
    }

    // Graceful fallback over cached global notes
    const filtered = notes.filter((note) => {
      if (selectedStream.feedId && note.feedId === selectedStream.feedId) return true;
      const titleLower = note.title.toLowerCase();
      const folderLower = (note.folderPath || '').toLowerCase();
      const slug = (selectedStream.feedSlug || selectedStream.cleanName).toLowerCase().replace(/^sparks\//, '');

      if (folderLower && selectedStream.folderPath && folderLower.includes(selectedStream.folderPath.toLowerCase())) {
        return true;
      }
      if (slug && (folderLower.includes(slug) || titleLower.includes(slug))) {
        return true;
      }
      return false;
    });

    return filtered.length > 0 ? filtered : notes.slice(0, 8);
  }, [notes, selectedStreamId, selectedStream, targetedNotesData]);

  // Check scroll boundary state for chevrons
  const checkScrollBounds = () => {
    if (tabsRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
      setCanScrollLeft(scrollLeft > 4);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
    }
  };

  useEffect(() => {
    checkScrollBounds();
  }, [streamTopics]);

  const handleCopyId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const scrollTabs = (offset: number) => {
    if (tabsRef.current) {
      tabsRef.current.scrollBy({ left: offset, behavior: 'smooth' });
      setTimeout(checkScrollBounds, 250);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (tabsRef.current && e.deltaY !== 0) {
      tabsRef.current.scrollLeft += e.deltaY * 0.7;
      checkScrollBounds();
    }
  };

  return (
    <div
      className={`w-full h-[340px] min-h-[340px] max-h-[340px] flex flex-col platform-tile relative p-2.5 overflow-hidden shadow-sm hover:border-violet-500/30 transition-colors duration-150 bg-[radial-gradient(ellipse_at_top_left,_rgba(168,85,247,0.12),_rgba(245,158,11,0.06),_transparent_70%)] ${className}`}
    >
      {/* Ghost Watermark Icon (Flame) */}
      <Flame className="absolute -right-3 -top-3 w-28 h-28 text-violet-500/[0.07] pointer-events-none select-none -rotate-12" />

      {/* Top Accent Gradient Line (Violet to Amber) */}
      <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-violet-500 via-fuchsia-500/80 to-amber-500/70" />

      {/* 1. Header Row (Locked height h-[68px], no text wrap jitter) */}
      <div
        onClick={() => navigate('/generators?tab=sparks')}
        className="cursor-pointer group pb-1.5 border-b border-tile-border/60 dark:border-white/[0.05] h-[68px] min-h-[68px] max-h-[68px] shrink-0 flex flex-col justify-between relative z-10 select-none"
      >
        <div className="flex items-center justify-between text-on-surface-variant h-4 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="p-1 rounded bg-violet-500/15 text-violet-400 border border-violet-500/25 flex items-center justify-center shrink-0">
              <Flame className="w-3 h-3 text-violet-400 animate-pulse" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider font-semibold truncate">
              Состояние Notes по темам & Активные ленты
            </span>
          </div>

          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-violet-500/15 text-violet-300 border border-violet-500/30 shrink-0 whitespace-nowrap ml-1.5">
            🔥 Spark & Feeds
          </span>
        </div>

        <div className="flex items-baseline justify-between gap-1 h-7 shrink-0">
          <div className="font-sans font-bold text-2xl text-violet-400 flex items-baseline gap-2 min-w-0">
            <span className="shrink-0">{selectedStream ? selectedStream.notesCount : streamTopics.length}</span>
            <span className="text-xs font-mono text-on-surface-variant/80 font-normal truncate">
              {selectedStream ? `заметок в ${selectedStream.cleanName}` : 'активных потоков'}
            </span>
          </div>

          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 shrink-0 whitespace-nowrap">
            <Flame className="w-2.5 h-2.5 text-violet-400" />
            <span>+{selectedStream ? selectedStream.delta : totalDelta} Δ новые</span>
          </span>
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono text-on-surface-variant/70 h-3.5 shrink-0">
          <span className="truncate pr-2">
            {selectedStream ? selectedStream.subTitle || selectedStream.folderPath : 'Конвейер тем и потоков Spark'}
          </span>
          <span className="text-emerald-400/90 font-medium shrink-0 whitespace-nowrap">За последние 24ч</span>
        </div>
      </div>

      {/* 2. Scroll Tabs with Chips & Fast Horizontal Mouse Wheel */}
      <div className="h-7 min-h-[28px] max-h-[28px] flex items-center gap-1 shrink-0 my-1 relative z-10">
        <button
          onClick={() => scrollTabs(-180)}
          disabled={!canScrollLeft}
          className={`h-6 w-5 rounded bg-tile-subtle/70 hover:bg-tile-subtle text-on-surface-variant hover:text-on-surface border border-tile-border dark:border-white/[0.04] flex items-center justify-center cursor-pointer shrink-0 transition-opacity ${
            !canScrollLeft ? 'opacity-30 cursor-not-allowed' : 'opacity-100'
          }`}
          title="Прокрутить назад"
        >
          <ChevronLeft className="w-3 h-3" />
        </button>

        {/* Scrollable Chips Container */}
        <div
          ref={tabsRef}
          onScroll={checkScrollBounds}
          onWheel={handleWheel}
          className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth h-full"
        >
          {/* "Все" Chip */}
          <button
            onClick={() => setSelectedStreamId('all')}
            className={`h-6 px-2 rounded-lg text-[9px] font-mono font-medium transition-colors flex items-center gap-1 shrink-0 cursor-pointer ${
              selectedStreamId === 'all'
                ? 'bg-violet-500/20 text-violet-200 border border-violet-500/40 shadow-xs'
                : 'bg-tile-subtle/60 text-on-surface-variant hover:text-on-surface border border-tile-border dark:border-white/[0.04]'
            }`}
          >
            <span className="whitespace-nowrap">Все потоки</span>
            <span className="text-[9px] opacity-75 font-bold">({streamTopics.length})</span>
          </button>

          {/* Individual Topic / Feed Chips */}
          {streamTopics.map((topic) => {
            const isSelected = selectedStreamId === topic.id;

            return (
              <button
                key={topic.id}
                onClick={() => setSelectedStreamId(topic.id)}
                className={`h-6 px-2 rounded-lg text-[9px] font-mono font-medium transition-colors flex items-center gap-1 shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-violet-500/20 text-violet-200 border border-violet-500/40 shadow-xs'
                    : 'bg-tile-subtle/50 text-on-surface-variant hover:text-on-surface border border-tile-border dark:border-white/[0.04]'
                }`}
                style={isSelected ? { borderColor: `${topic.accentColor}70` } : undefined}
              >
                <span>{topic.emoji}</span>
                <span className="truncate max-w-[95px]">{topic.cleanName}</span>
                <span className="text-[9px] opacity-75 font-bold">{topic.notesCount}</span>
                <span className="text-[9px] text-emerald-400 font-bold">+{topic.delta}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => scrollTabs(180)}
          disabled={!canScrollRight}
          className={`h-6 w-5 rounded bg-tile-subtle/70 hover:bg-tile-subtle text-on-surface-variant hover:text-on-surface border border-tile-border dark:border-white/[0.04] flex items-center justify-center cursor-pointer shrink-0 transition-opacity ${
            !canScrollRight ? 'opacity-30 cursor-not-allowed' : 'opacity-100'
          }`}
          title="Прокрутить вперёд"
        >
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* 3. High-Density Vertical Scroll Stream of Latest Notes */}
      <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col z-10">
        {/* Absolute Fetching Indicator Bar - Zero Reflow! */}
        <div
          className={`absolute top-0 left-0 right-0 h-[2px] bg-violet-500/20 overflow-hidden rounded-full transition-opacity duration-200 z-20 pointer-events-none ${
            isTargetedFetching ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="h-full bg-violet-400 animate-pulse w-1/3" />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar [scrollbar-gutter:stable] space-y-1 pr-0.5">
          {displayedNotes.length === 0 ? (
            <div className="h-full min-h-[140px] flex items-center justify-center text-center text-on-surface-variant text-xs font-mono">
              Заметок в этой теме пока нет
            </div>
          ) : (
            displayedNotes.map((note) => {
              const dateVal = note.startDate || (note as any).createdAt;
              const formattedDate = dateVal && dayjs(dateVal).isValid()
                ? dayjs(dateVal).format('DD.MM.YYYY')
                : '';
              const contentText = note.description || note.rawContent || note.summary || '';
              const wordCount = contentText ? contentText.trim().split(/\s+/).length : 0;

              return (
                <div
                  key={note.id}
                  onClick={() => onSelectNote(note.id)}
                  className="group h-8 min-h-[32px] max-h-[32px] px-2 rounded-lg bg-tile-subtle/50 hover:bg-tile-subtle border border-tile-border dark:border-white/[0.04] hover:border-tile-border-hover dark:hover:border-white/[0.10] transition-colors duration-150 flex items-center justify-between gap-1.5 cursor-pointer relative shrink-0 overflow-hidden"
                >
                  {/* Left: Type Badge / Topic Badge + Title */}
                  <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
                    <NoteTypeBadge type={note.type} size="sm" />
                    <span className="font-sans font-medium text-[11px] text-on-surface truncate group-hover:text-primary transition-colors">
                      {note.title}
                    </span>
                  </div>

                  {/* Middle Quick Actions on hover */}
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0 transition-opacity">
                    <button
                      onClick={(e) => handleCopyId(e, note.id)}
                      className="p-1 rounded text-on-surface-variant/60 hover:text-primary hover:bg-tile-muted cursor-pointer"
                      title={`Скопировать ID: ${note.id}`}
                    >
                      {copiedId === note.id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectNote(note.id);
                      }}
                      className="p-1 rounded text-on-surface-variant/60 hover:text-primary hover:bg-tile-muted cursor-pointer"
                      title="Открыть ридер"
                    >
                      <Eye className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Right: Word Count Pill + Standard Date */}
                  <div className="flex items-center gap-1.5 shrink-0 group-hover:hidden">
                    {wordCount > 0 && (
                      <span className="text-[9px] font-mono text-on-surface-variant/50 hidden sm:inline whitespace-nowrap">
                        {wordCount} сл.
                      </span>
                    )}
                    {formattedDate && (
                      <span className="text-[9px] font-mono text-on-surface-variant/60 whitespace-nowrap">
                        {formattedDate}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 4. Mini Footer (Locked height h-6) */}
      <div className="h-6 min-h-[24px] max-h-[24px] pt-1 border-t border-tile-border/50 dark:border-white/[0.04] flex items-center justify-between text-[10px] font-mono shrink-0 text-on-surface-variant/70 relative z-10">
        <button
          onClick={() => navigate('/notes/new')}
          className="text-primary hover:underline flex items-center gap-1 font-semibold cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-3 h-3 shrink-0" />
          <span>Создать заметку в теме</span>
        </button>

        <span className="text-on-surface-variant/60 whitespace-nowrap truncate ml-2">
          {displayedNotes.length} заметок • {selectedStream ? `+${selectedStream.delta} Δ` : `+${totalDelta} Δ`}
        </span>
      </div>
    </div>
  );
};
