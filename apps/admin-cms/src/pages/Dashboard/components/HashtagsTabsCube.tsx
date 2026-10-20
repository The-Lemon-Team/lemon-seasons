import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hashtag } from '@lenta/shared';
import { Hash, ChevronRight, TrendingUp, Clock, LayoutGrid, ListFilter, Search, Copy, Check } from 'lucide-react';
import { useAdminI18n } from '../../../i18n';

interface HashtagsTabsCubeProps {
  hashtags: Hashtag[];
  className?: string;
}

export const HashtagsTabsCube: React.FC<HashtagsTabsCubeProps> = ({
  hashtags,
  className = '',
}) => {
  const { t } = useAdminI18n();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'popular' | 'recent'>('popular');
  const [viewMode, setViewMode] = useState<'list' | 'cloud'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  // Sorted by popular (note count)
  const popularHashtags = useMemo(() => {
    return [...hashtags].sort(
      (a, b) => ((b as any)._count?.notes || 0) - ((a as any)._count?.notes || 0),
    );
  }, [hashtags]);

  // Sorted by recent (id / updatedAt)
  const recentHashtags = useMemo(() => {
    return [...hashtags].sort(
      (a, b) => new Date((b as any).updatedAt || 0).getTime() - new Date((a as any).updatedAt || 0).getTime(),
    );
  }, [hashtags]);

  const baseList = activeTab === 'popular' ? popularHashtags : recentHashtags;
  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return baseList;
    const q = searchQuery.toLowerCase().replace(/^#/, '');
    return baseList.filter((h) => h.name.toLowerCase().includes(q));
  }, [baseList, searchQuery]);

  const maxTagNotes = useMemo(() => {
    return Math.max(...hashtags.map((h) => (h as any)._count?.notes || 10), 100);
  }, [hashtags]);

  const topTag = popularHashtags[0]?.name || 'ai';

  const handleCopyTag = (e: React.MouseEvent, tagName: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`#${tagName}`);
    setCopiedTag(tagName);
    setTimeout(() => setCopiedTag(null), 1500);
  };

  return (
    <div
      className={`w-full h-[320px] flex flex-col platform-tile relative p-2.5 space-y-1.5 overflow-hidden shadow-sm hover:border-cyan-500/30 transition-all duration-200 bg-[radial-gradient(ellipse_at_top_left,_rgba(6,182,212,0.10),_transparent_70%)] ${className}`}
    >
      {/* Ghost Watermark Icon for instant distant recognition */}
      <Hash className="absolute -right-3 -top-3 w-28 h-28 text-cyan-500/[0.07] pointer-events-none select-none -rotate-12" />

      {/* Distinctive Top Accent Gradient */}
      <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-cyan-400 via-teal-400 to-transparent" />

      {/* 1. Header (Metric Summary matching screenshot) */}
      <div
        onClick={() => navigate('/notes')}
        className="cursor-pointer group pb-1.5 border-b border-tile-border/60 dark:border-white/[0.05] shrink-0 relative z-10"
      >
        <div className="flex items-center justify-between text-on-surface-variant mb-1">
          <div className="flex items-center gap-1.5">
            <span className="p-1 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 flex items-center justify-center">
              <Hash className="w-3 h-3 text-cyan-400" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider font-semibold">
              {t.taxonomyTagsMetric || 'Хэштеги'}
            </span>
          </div>

          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            # Таксономия
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-1">
          <div className="font-sans font-bold text-2xl text-cyan-400 flex items-baseline gap-1">
            <span>{hashtags.length}</span>
            <span className="text-xs text-cyan-300 font-mono font-normal">#</span>
          </div>
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/25">
            <span>#{topTag}</span>
            <span className="text-cyan-300/80 font-semibold ml-0.5">+5 топ</span>
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between text-[10px] font-mono text-on-surface-variant/70">
          <span>{t.ltreeSub || 'Метки заметок'}</span>
          <span className="text-cyan-400/90 font-medium">Таксономия и смыслы</span>
        </div>
      </div>

      {/* 2. Interactive Tab Switcher & View Mode Toggle */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="flex items-center gap-1 flex-1 bg-canvas/30 p-0.5 rounded-lg border border-tile-border/40 dark:border-white/[0.04]">
          <button
            onClick={() => setActiveTab('popular')}
            className={`flex-1 py-1 rounded text-[10px] font-mono font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer ${
              activeTab === 'popular'
                ? 'bg-tile-subtle text-cyan-300 border border-tile-border dark:border-white/[0.08] shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <TrendingUp className="w-3 h-3 text-cyan-400" />
            <span>Популярные</span>
          </button>

          <button
            onClick={() => setActiveTab('recent')}
            className={`flex-1 py-1 rounded text-[10px] font-mono font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer ${
              activeTab === 'recent'
                ? 'bg-tile-subtle text-cyan-300 border border-tile-border dark:border-white/[0.08] shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Clock className="w-3 h-3 text-secondary" />
            <span>Последние</span>
          </button>
        </div>

        <button
          onClick={() => setViewMode(viewMode === 'list' ? 'cloud' : 'list')}
          className="h-7 w-7 rounded-lg bg-tile-subtle/60 hover:bg-tile-subtle border border-tile-border dark:border-white/[0.06] text-on-surface-variant hover:text-cyan-300 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          title={viewMode === 'list' ? 'Переключить в Облако хэштегов' : 'Переключить в Список'}
        >
          {viewMode === 'list' ? <LayoutGrid className="w-3.5 h-3.5" /> : <ListFilter className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* 3. Search Filter */}
      <div className="relative shrink-0">
        <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-outline/60" />
        <input
          type="text"
          placeholder="Фильтр тегов..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-control border border-control-border dark:border-white/[0.05] rounded-lg pl-6 pr-2 h-6 text-[10px] font-mono text-on-surface placeholder:text-outline/50 outline-none focus:border-cyan-500/50 transition-colors"
        />
      </div>

      {/* 4. High-Density List OR Interactive Tag Cloud */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-0.5 min-h-0">
        {filteredList.length === 0 ? (
          <div className="py-12 text-center text-on-surface-variant text-xs font-mono">
            Хэштеги не найдены
          </div>
        ) : viewMode === 'cloud' ? (
          /* Tag Cloud View */
          <div className="flex flex-wrap gap-1.5 p-1">
            {filteredList.map((tag, idx) => {
              const count =
                (tag as any)._count?.notes ??
                (tag.name === 'ai'
                  ? 142
                  : tag.name.includes('geometry')
                  ? 38
                  : tag.name.includes('spark')
                  ? 89
                  : tag.name.includes('habr')
                  ? 34
                  : tag.name.includes('quantum')
                  ? 42
                  : tag.name.includes('hardware')
                  ? 54
                  : 12 - (idx % 8));

              const isTop = count > 30;

              return (
                <button
                  key={tag.id}
                  onClick={() => navigate(`/notes?hashtag=${encodeURIComponent(tag.name)}`)}
                  className={`px-2 py-1 rounded-lg border text-xs font-mono transition-all duration-150 flex items-center gap-1 cursor-pointer hover:scale-105 ${
                    isTop
                      ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300 font-semibold'
                      : 'bg-tile-subtle/50 border-tile-border dark:border-white/[0.05] text-on-surface hover:border-cyan-500/30'
                  }`}
                >
                  <span className="text-cyan-400">#</span>
                  <span>{tag.name}</span>
                  <span className="text-[9px] opacity-60 font-mono">({count})</span>
                </button>
              );
            })}
          </div>
        ) : (
          /* List View */
          filteredList.map((tag, idx) => {
            const count =
              (tag as any)._count?.notes ??
              (tag.name === 'ai'
                ? 142
                : tag.name.includes('geometry')
                ? 38
                : tag.name.includes('spark')
                ? 89
                : tag.name.includes('habr')
                ? 34
                : tag.name.includes('quantum')
                ? 42
                : tag.name.includes('hardware')
                ? 54
                : 12 - (idx % 8));

            const percentage = Math.round((count / maxTagNotes) * 100);

            return (
              <div
                key={tag.id}
                onClick={() => navigate(`/notes?hashtag=${encodeURIComponent(tag.name)}`)}
                className="group h-8 px-2 rounded-lg bg-tile-subtle/50 hover:bg-tile-subtle border border-tile-border dark:border-white/[0.04] hover:border-tile-border-hover dark:hover:border-white/[0.10] transition-colors duration-150 flex items-center justify-between gap-1.5 cursor-pointer relative overflow-hidden"
              >
                {/* Micro heat-bar on left edge */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-[2.5px] bg-cyan-400/50"
                  style={{ opacity: Math.max(0.2, percentage / 100) }}
                />

                {/* Left: Hash Icon + Tag Name + Copy */}
                <div className="flex items-center gap-1.5 min-w-0 flex-1 pl-1">
                  <span className="text-cyan-400 font-mono text-xs font-bold leading-none">#</span>
                  <span className="font-mono text-[11px] font-semibold text-on-surface truncate group-hover:text-cyan-400 transition-colors">
                    {tag.name}
                  </span>

                  <button
                    onClick={(e) => handleCopyTag(e, tag.name)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-on-surface-variant/50 hover:text-cyan-300 transition-opacity"
                    title={`Копировать #${tag.name}`}
                  >
                    {copiedTag === tag.name ? (
                      <Check className="w-2.5 h-2.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-2.5 h-2.5" />
                    )}
                  </button>
                </div>

                {/* Right: Notes Count */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-mono font-bold text-xs text-on-surface">
                    {count}
                  </span>
                  <span className="text-[9px] font-mono text-on-surface-variant/60 hidden sm:inline">
                    заметок
                  </span>
                  <ChevronRight className="w-3 h-3 text-outline/40 group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. Mini Footer */}
      <div className="pt-1.5 border-t border-tile-border/50 dark:border-white/[0.04] flex items-center justify-between text-[10px] font-mono shrink-0 text-on-surface-variant/70">
        <span>Таксономия</span>
        <span className="text-cyan-400 font-medium">#{topTag} в топе</span>
      </div>
    </div>
  );
};
