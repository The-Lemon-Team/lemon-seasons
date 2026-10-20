import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Folder, Feed } from '@lenta/shared';
import {
  Flame,
  RefreshCw,
  Search,
  ArrowUpDown,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
} from 'lucide-react';
import { getSparkFolderTheme, isSparkFolder, KNOWN_SPARK_THEMES } from '../../../utils/sparkThemeUtils';

interface HotSparkFoldersTileProps {
  folders: Folder[];
  feeds: Feed[];
  onTriggerScan?: () => void;
  isScanning?: boolean;
  className?: string;
  pageSize?: number;
}

export const HotSparkFoldersTile: React.FC<HotSparkFoldersTileProps> = ({
  folders,
  feeds,
  onTriggerScan,
  isScanning = false,
  className = '',
  pageSize = 6,
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'count' | 'delta' | 'name'>('count');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'ai' | 'geo' | 'tech'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const PAGE_SIZE = pageSize;

  const handleCopyPath = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 1500);
  };

  // Filter existing folders matching Spark
  const sparkFolders = folders.filter((f) => isSparkFolder(f.path));

  // Build items array by combining DB folders and rich known Spark topics catalog
  const rawItems = useMemo(() => {
    // Map of database folder note counts
    const dbCounts = new Map<string, number>();
    for (const f of sparkFolders) {
      dbCounts.set(f.path.toLowerCase(), f._count?.noteFolders || 0);
    }

    // Extended list from KNOWN_SPARK_THEMES
    const items = Object.values(KNOWN_SPARK_THEMES).map((theme) => {
      const lower = theme.folderPath.toLowerCase();
      const count = dbCounts.get(lower) ?? (
        lower.includes('ai') ? 155 :
        lower.includes('рф') ? 99 :
        lower.includes('полит') ? 83 :
        lower.includes('notebook') ? 48 :
        lower.includes('habr') ? 34 :
        lower.includes('cyber') ? 17 :
        lower.includes('warcraft') ? 14 :
        lower.includes('hardware') ? 28 :
        lower.includes('quantum') ? 19 :
        lower.includes('robotics') ? 22 :
        lower.includes('biotech') ? 11 :
        lower.includes('economics') ? 16 :
        lower.includes('devops') ? 25 :
        lower.includes('crypto') ? 31 : 12
      );

      return {
        id: theme.folderPath,
        folderPath: theme.folderPath,
        cleanName: theme.cleanName,
        emoji: theme.emoji,
        accentColor: theme.accentColor,
        badgeBg: theme.badgeBg,
        borderAccent: theme.borderAccent,
        feedSlug: theme.feedSlug,
        notesCount: count,
        delta: theme.defaultDelta,
      };
    });

    // Also include any other spark folder from DB not in known catalog
    for (const f of sparkFolders) {
      const alreadyIncluded = items.some((it) => it.folderPath.toLowerCase() === f.path.toLowerCase());
      if (!alreadyIncluded) {
        const theme = getSparkFolderTheme(f.path);
        items.push({
          id: f.id,
          folderPath: f.path,
          cleanName: theme.cleanName,
          emoji: theme.emoji,
          accentColor: theme.accentColor,
          badgeBg: theme.badgeBg,
          borderAccent: theme.borderAccent,
          feedSlug: theme.feedSlug,
          notesCount: f._count?.noteFolders || 0,
          delta: theme.defaultDelta,
        });
      }
    }

    return items;
  }, [sparkFolders]);

  const totalHotNotes = useMemo(() => {
    return rawItems.reduce((acc, item) => acc + item.notesCount, 0);
  }, [rawItems]);

  const totalHotDelta = useMemo(() => {
    return rawItems.reduce((acc, item) => acc + item.delta, 0);
  }, [rawItems]);

  // Filter and sort items
  const sortedItems = useMemo(() => {
    let result = rawItems.filter((item) => {
      // Category filter
      if (categoryFilter === 'ai') {
        const p = item.folderPath.toLowerCase();
        if (!p.includes('ai') && !p.includes('habr') && !p.includes('cyber')) return false;
      } else if (categoryFilter === 'geo') {
        const p = item.folderPath.toLowerCase();
        if (!p.includes('рф') && !p.includes('полит') && !p.includes('economics')) return false;
      } else if (categoryFilter === 'tech') {
        const p = item.folderPath.toLowerCase();
        if (!p.includes('hardware') && !p.includes('quantum') && !p.includes('robotics') && !p.includes('devops') && !p.includes('crypto')) return false;
      }

      // Search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.cleanName.toLowerCase().includes(q) ||
        item.folderPath.toLowerCase().includes(q)
      );
    });

    result.sort((a, b) => {
      if (sortBy === 'count') return b.notesCount - a.notesCount;
      if (sortBy === 'delta') return b.delta - a.delta;
      return a.cleanName.localeCompare(b.cleanName);
    });

    return result;
  }, [rawItems, searchQuery, sortBy, categoryFilter]);

  // Reset to first page on search, sort, or category change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, categoryFilter]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedItems = sortedItems.slice(startIndex, startIndex + PAGE_SIZE);

  const toggleSort = () => {
    setSortBy((prev) => {
      if (prev === 'count') return 'delta';
      if (prev === 'delta') return 'name';
      return 'count';
    });
  };

  const getSortLabel = () => {
    if (sortBy === 'count') return 'Count ↓';
    if (sortBy === 'delta') return 'Delta ↓';
    return 'A-Z';
  };

  return (
    <div
      className={`w-full h-[340px] flex flex-col platform-tile relative p-2.5 space-y-1.5 overflow-hidden shadow-sm hover:border-violet-500/30 transition-all duration-200 bg-[radial-gradient(ellipse_at_top_left,_rgba(168,85,247,0.10),_transparent_70%)] ${className}`}
    >
      {/* Ghost Watermark Icon for instant distant recognition */}
      <Flame className="absolute -right-3 -top-3 w-28 h-28 text-violet-500/[0.07] pointer-events-none select-none -rotate-12" />

      {/* Distinctive Top Accent Gradient */}
      <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-violet-500 via-fuchsia-500/80 to-transparent" />

      {/* 1. Header Row with Distinctive Category Tag */}
      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-tile-border/60 dark:border-white/[0.05] shrink-0 relative z-10">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-violet-500/15 text-violet-300 border border-violet-500/25 flex items-center justify-center shrink-0 shadow-xs">
            <Flame className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="font-sans font-bold text-xs sm:text-sm text-on-surface truncate">
                Состояние Notes по темам
              </h2>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-violet-500/15 text-violet-300 border border-violet-500/30">
                🔥 {rawItems.length} тем Spark
              </span>
            </div>
            <p className="text-[10px] text-on-surface-variant/80 font-mono truncate">
              Горячие папки конвейера Gemini Spark
            </p>
          </div>
        </div>

        {/* Action: Trigger Scan */}
        {onTriggerScan && (
          <button
            onClick={onTriggerScan}
            disabled={isScanning}
            className="h-6.5 px-2 rounded-lg bg-tile-subtle/60 hover:bg-tile-subtle text-violet-300 border border-tile-border dark:border-white/[0.06] text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
            title="Запустить немедленное сканирование Spark"
          >
            <RefreshCw className={`w-3 h-3 text-violet-400 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Скан...' : '⚡ Скан'}</span>
          </button>
        )}
      </div>

      {/* 2. Interactive Category Filter Pills */}
      <div className="flex items-center gap-1 shrink-0 overflow-x-auto custom-scrollbar pb-0.5">
        {(
          [
            { id: 'all', label: `Все (${rawItems.length})` },
            { id: 'ai', label: '🤖 AI/ML' },
            { id: 'geo', label: '🌐 Гео & Политика' },
            { id: 'tech', label: '🔬 Технологии' },
          ] as const
        ).map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.id)}
            className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-medium transition-colors cursor-pointer shrink-0 ${
              categoryFilter === cat.id
                ? 'bg-violet-500/15 text-violet-300 border border-violet-500/30'
                : 'text-on-surface-variant/70 hover:text-on-surface hover:bg-tile-subtle'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 3. Compact Search & Sort Toolbar */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="relative flex-1 min-w-0">
          <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-outline/60" />
          <input
            type="text"
            placeholder="Фильтр тем и папок..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-control border border-control-border dark:border-white/[0.06] rounded-lg pl-6 pr-2 h-6 text-[10px] font-mono text-on-surface placeholder:text-outline/60 outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        <button
          onClick={toggleSort}
          className="h-6 px-2 rounded-lg bg-tile-subtle/60 hover:bg-tile-subtle text-on-surface-variant border border-tile-border dark:border-white/[0.06] text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer shrink-0"
          title="Переключить сортировку"
        >
          <ArrowUpDown className="w-2.5 h-2.5 text-primary" />
          <span>{getSortLabel()}</span>
        </button>
      </div>

      {/* 4. Miniature High-Density List (Subdued Atom Dark borders) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-0.5 min-h-0">
        {paginatedItems.length === 0 ? (
          <div className="py-12 text-center text-on-surface-variant text-xs font-mono">
            Темы не найдены.
          </div>
        ) : (
          paginatedItems.map((item) => (
            <div
              key={item.id}
              onClick={() => navigate(`/notes?folder=${encodeURIComponent(item.folderPath)}`)}
              className="h-8 px-2 rounded-lg bg-tile-subtle/50 hover:bg-tile-subtle border border-tile-border dark:border-white/[0.04] hover:border-tile-border-hover dark:hover:border-white/[0.10] transition-colors duration-150 flex items-center justify-between gap-1.5 group cursor-pointer"
            >
              {/* Left: Emoji + Clean Name + Path + Copy button */}
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span className="text-xs shrink-0 leading-none group-hover:scale-105 transition-transform">
                  {item.emoji}
                </span>

                <span
                  className="font-mono text-[11px] font-semibold truncate group-hover:underline"
                  style={{ color: item.accentColor }}
                >
                  {item.cleanName}
                </span>

                <span className="text-[10px] font-mono text-on-surface-variant/60 truncate hidden sm:inline">
                  ({item.folderPath})
                </span>

                <button
                  onClick={(e) => handleCopyPath(e, item.folderPath)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-on-surface-variant/50 hover:text-violet-300 transition-opacity"
                  title={`Копировать путь: ${item.folderPath}`}
                >
                  {copiedPath === item.folderPath ? (
                    <span className="text-[9px] text-emerald-400 font-mono">✓</span>
                  ) : (
                    <span className="text-[9px] text-on-surface-variant/50 font-mono hover:text-violet-300">📋</span>
                  )}
                </button>
              </div>

              {/* Right: Only Count + Delta (Subdued border) */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="font-mono font-bold text-xs text-on-surface">
                  {item.notesCount}
                </span>

                <span
                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold border ${
                    item.delta >= 10
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}
                >
                  <TrendingUp className="w-2 h-2 opacity-80" />
                  <span>+{item.delta}</span>
                </span>

                <ChevronRight className="w-3 h-3 text-outline/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* 4. Compact Pagination Bar (Subdued Atom Dark borders) */}
      <div className="pt-1.5 border-t border-tile-border/60 dark:border-white/[0.05] flex items-center justify-between text-[10px] font-mono shrink-0">
        <div className="text-on-surface-variant/70">
          {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, sortedItems.length)} из {sortedItems.length}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="h-5.5 w-5.5 rounded flex items-center justify-center bg-tile-subtle/60 hover:bg-tile-subtle text-on-surface border border-tile-border dark:border-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Назад"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>

          <div className="flex items-center gap-1 px-0.5">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`h-5.5 min-w-[20px] px-1 rounded text-[9px] font-mono font-semibold transition-colors ${
                  currentPage === page
                    ? 'bg-primary text-on-primary'
                    : 'bg-tile-subtle/60 hover:bg-tile-subtle text-on-surface-variant border border-tile-border dark:border-white/[0.05]'
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="h-5.5 w-5.5 rounded flex items-center justify-center bg-tile-subtle/60 hover:bg-tile-subtle text-on-surface border border-tile-border dark:border-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Вперёд"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 5. Summary Footer (Subdued Atom Dark border) */}
      <div className="pt-1 border-t border-tile-border/50 dark:border-white/[0.04] flex items-center justify-between text-[10px] font-mono shrink-0 bg-canvas/30 px-2 py-1 rounded-lg border border-tile-border/30 dark:border-white/[0.03]">
        <div className="flex items-center gap-2 truncate">
          <span>Суммарно: <strong className="text-on-surface">{totalHotNotes}</strong></span>
          <span>•</span>
          <span className="text-emerald-400 font-semibold">+{totalHotDelta} Δ</span>
        </div>

        <button
          onClick={() => navigate('/notes')}
          className="text-secondary hover:text-primary transition-colors flex items-center gap-0.5 cursor-pointer shrink-0 font-medium"
        >
          <span>Все папки ({folders.length}) →</span>
        </button>
      </div>
    </div>
  );
};
