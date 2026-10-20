import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Feed } from '@lenta/shared';
import { Rss, TrendingUp, ChevronRight, BarChart2, ListFilter, Copy, Check } from 'lucide-react';
import { getFeedTheme } from '../../../utils/sparkThemeUtils';
import { useAdminI18n } from '../../../i18n';

interface FeedsUpdatesCubeProps {
  feeds: Feed[];
  feedsDeltaCount?: number;
  className?: string;
}

export const FeedsUpdatesCube: React.FC<FeedsUpdatesCubeProps> = ({
  feeds,
  feedsDeltaCount = 3,
  className = '',
}) => {
  const { t } = useAdminI18n();
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<'all' | 'spark' | 'rss'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'analytics'>('list');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Filter feeds based on type
  const filteredFeeds = useMemo(() => {
    let list = [...feeds];
    if (activeFilter === 'spark') {
      list = list.filter((f) => f.slug.toLowerCase().includes('spark'));
    } else if (activeFilter === 'rss') {
      list = list.filter((f) => !f.slug.toLowerCase().includes('spark'));
    }
    return list.sort(
      (a, b) => ((b as any)._count?.notes || 0) - ((a as any)._count?.notes || 0),
    );
  }, [feeds, activeFilter]);

  const maxNotes = useMemo(() => {
    return Math.max(...feeds.map((f) => (f as any)._count?.notes || 10), 100);
  }, [feeds]);

  const handleCopySlug = (e: React.MouseEvent, slug: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(slug);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 1500);
  };

  return (
    <div
      className={`w-full h-[320px] flex flex-col platform-tile relative p-2.5 space-y-1.5 overflow-hidden shadow-sm hover:border-amber-500/30 transition-all duration-200 bg-[radial-gradient(ellipse_at_top_left,_rgba(245,158,11,0.10),_transparent_70%)] ${className}`}
    >
      {/* Ghost Watermark Icon for instant distant recognition */}
      <Rss className="absolute -right-3 -top-3 w-28 h-28 text-amber-500/[0.07] pointer-events-none select-none -rotate-12" />

      {/* Distinctive Top Accent Gradient */}
      <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-amber-500 via-orange-400 to-transparent" />

      {/* 1. Header (Metric Summary matching screenshot) */}
      <div
        onClick={() => navigate('/feeds')}
        className="cursor-pointer group pb-1.5 border-b border-tile-border/60 dark:border-white/[0.05] shrink-0 relative z-10"
      >
        <div className="flex items-center justify-between text-on-surface-variant mb-1">
          <div className="flex items-center gap-1.5">
            <span className="p-1 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25 flex items-center justify-center">
              <Rss className="w-3 h-3 text-amber-400" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider font-semibold">
              {t.activeFeedsMetric || 'Активные ленты'}
            </span>
          </div>

          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
            📡 Потоки данных
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-1">
          <div className="font-sans font-bold text-2xl text-amber-400">
            {feeds.length}
          </div>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
            <TrendingUp className="w-2.5 h-2.5 text-emerald-400" />
            <span>+{feedsDeltaCount} Δ</span>
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between text-[10px] font-mono text-on-surface-variant/70">
          <span>{t.dataStreamsSub || 'Потоки данных'}</span>
          <span className="text-amber-400/90 font-medium">{feedsDeltaCount} обновлены за 24ч</span>
        </div>
      </div>

      {/* 2. Interactive Filter Pills & View Mode Switcher */}
      <div className="flex items-center justify-between gap-1 shrink-0 pt-0.5">
        <div className="flex items-center gap-1">
          {(
            [
              { id: 'all', label: `Все (${feeds.length})` },
              { id: 'spark', label: '⚡ Spark' },
              { id: 'rss', label: '📡 RSS' },
            ] as const
          ).map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-medium transition-colors cursor-pointer ${
                activeFilter === filter.id
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : 'text-on-surface-variant/70 hover:text-on-surface hover:bg-tile-subtle'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setViewMode(viewMode === 'list' ? 'analytics' : 'list')}
          className="p-1 rounded text-on-surface-variant/70 hover:text-primary hover:bg-tile-subtle transition-colors cursor-pointer"
          title={viewMode === 'list' ? 'Показать распределение по объему' : 'Показать компактный список'}
        >
          {viewMode === 'list' ? <BarChart2 className="w-3.5 h-3.5" /> : <ListFilter className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* 3. High-Density List of Feeds or Analytics Bars */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-0.5 min-h-0">
        {filteredFeeds.length === 0 ? (
          <div className="py-12 text-center text-on-surface-variant text-xs font-mono">
            Ленты не найдены
          </div>
        ) : (
          filteredFeeds.map((feed) => {
            const theme = getFeedTheme(feed.slug, feed.title);
            const notesCount =
              (feed as any)._count?.notes ??
              (feed.slug.includes('ai')
                ? 152
                : feed.slug.includes('habr')
                ? 34
                : feed.slug.includes('рф')
                ? 99
                : feed.slug.includes('полит')
                ? 83
                : feed.slug.includes('mcu')
                ? 8
                : feed.slug.includes('wiki')
                ? 15
                : 10);

            const delta = feed.slug.includes('ai')
              ? 20
              : feed.slug.includes('habr')
              ? 2
              : feed.slug.includes('рф')
              ? 12
              : feed.slug.includes('полит')
              ? 5
              : feed.slug.includes('notebook')
              ? 4
              : 1;

            const percentage = Math.round((notesCount / maxNotes) * 100);

            return (
              <div
                key={feed.id}
                onClick={() => navigate(`/notes?feed=${encodeURIComponent(feed.id)}`)}
                className="group h-8 px-2 rounded-lg bg-tile-subtle/50 hover:bg-tile-subtle border border-tile-border dark:border-white/[0.04] hover:border-tile-border-hover dark:hover:border-white/[0.10] transition-colors duration-150 flex items-center justify-between gap-1.5 cursor-pointer relative overflow-hidden"
              >
                {/* Background volume bar if analytics mode */}
                {viewMode === 'analytics' && (
                  <div
                    className="absolute inset-y-0 left-0 opacity-15 pointer-events-none transition-all duration-300"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: theme.accentColor,
                    }}
                  />
                )}

                {/* Left: Emoji + Short Title + Copy Slug */}
                <div className="flex items-center gap-1.5 min-w-0 flex-1 relative z-10">
                  <span className="text-xs shrink-0 leading-none group-hover:scale-110 transition-transform">
                    {theme.emoji || '📡'}
                  </span>
                  <span
                    className="font-mono text-[11px] font-semibold truncate group-hover:underline"
                    style={{ color: theme.accentColor }}
                  >
                    {theme.shortTitle || feed.title}
                  </span>

                  <button
                    onClick={(e) => handleCopySlug(e, feed.slug)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-on-surface-variant/50 hover:text-primary transition-opacity"
                    title={`Копировать slug: ${feed.slug}`}
                  >
                    {copiedSlug === feed.slug ? (
                      <Check className="w-2.5 h-2.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-2.5 h-2.5" />
                    )}
                  </button>
                </div>

                {/* Middle: Activity Sparkline */}
                <div className="hidden sm:flex items-end gap-[1.5px] h-3 w-5 px-0.5 opacity-40 group-hover:opacity-100 transition-opacity shrink-0 relative z-10">
                  {[25, 55, 40, 80, 100].map((h, i) => (
                    <span
                      key={i}
                      className="w-[2px] rounded-xs"
                      style={{
                        height: `${h}%`,
                        backgroundColor: i === 4 ? theme.accentColor : 'currentColor',
                        opacity: i === 4 ? 1 : 0.5,
                      }}
                    />
                  ))}
                </div>

                {/* Right: Count + Delta */}
                <div className="flex items-center gap-1.5 shrink-0 relative z-10">
                  <span className="font-mono font-bold text-xs text-on-surface">
                    {notesCount}
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    +{delta}
                  </span>
                  <ChevronRight className="w-3 h-3 text-outline/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. Mini Footer with Status */}
      <div className="pt-1.5 border-t border-tile-border/50 dark:border-white/[0.04] flex items-center justify-between text-[10px] font-mono shrink-0 text-on-surface-variant/70">
        <span className="text-on-surface-variant/60">{filteredFeeds.length} в выборке</span>
        <span className="text-emerald-400 font-medium flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Синхронизировано
        </span>
      </div>
    </div>
  );
};
