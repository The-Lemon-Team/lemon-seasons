import React, { useEffect } from 'react';
import { CalendarFilterState, NoteType, NOTE_TYPES, NoteTypeColors } from '@lenta/shared';
import { useFeeds, useTaxonomyTree, useHashtags } from '../api/queries';
import { useObsidianContainers } from '../context/ObsidianContainersContext';
import { ObsidianLogo } from './ObsidianLogo';
import {
  X,
  Filter,
  Tag,
  Hash,
  Shapes,
  Check,
  RotateCcw,
  Radio,
  Lock,
  Globe,
  Folder,
} from 'lucide-react';
import { getFeedTheme, FEED_PRESET_OPTIONS } from '../utils/feedThemes';
import { useI18n } from '../i18n';

interface FilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  filterState: CalendarFilterState;
  onSelectFeed?: (feedSlug?: string) => void;
  onToggleFeed?: (feedSlug: string) => void;
  onSelectOnlyFeed?: (feedSlug: string) => void;
  onClearFeed?: () => void;
  onClearFeeds?: () => void;
  onToggleContainer?: (containerId: string) => void;
  onSelectOnlyContainer?: (containerId: string) => void;
  onClearContainers?: () => void;
  onToggleTag: (tagPath: string) => void;
  onToggleHashtag: (hashtag: string) => void;
  onToggleType: (type: NoteType) => void;
  onResetFilters: () => void;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  isOpen,
  onClose,
  filterState,
  onSelectFeed,
  onToggleFeed,
  onSelectOnlyFeed,
  onClearFeed,
  onClearFeeds,
  onToggleContainer,
  onSelectOnlyContainer,
  onClearContainers,
  onToggleTag,
  onToggleHashtag,
  onToggleType,
  onResetFilters,
}) => {
  const { t, lang, getTypeLabel } = useI18n();
  const { data: feeds = [] } = useFeeds();
  const { data: taxonomyNodes = [] } = useTaxonomyTree();
  const { data: hashtags = [] } = useHashtags();
  const { containers: obsidianContainers = [] } = useObsidianContainers();

  const handleSelectFeed = (slug?: string) => {
    if (!slug) {
      if (onClearFeed) onClearFeed();
      else if (onClearFeeds) onClearFeeds();
      else if (onSelectFeed) onSelectFeed(undefined);
    } else {
      if (filterState.feed === slug) {
        if (onClearFeed) onClearFeed();
        else if (onClearFeeds) onClearFeeds();
        else if (onSelectFeed) onSelectFeed(undefined);
      } else {
        if (onSelectFeed) onSelectFeed(slug);
        else if (onSelectOnlyFeed) onSelectOnlyFeed(slug);
        else if (onToggleFeed) onToggleFeed(slug);
      }
    }
  };

  const backdropMouseDownRef = React.useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <>
      {/* Black transparent background substrate (backdrop) */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ease-in-out ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onMouseDown={(e) => {
          backdropMouseDownRef.current = e.target === e.currentTarget;
        }}
        onClick={(e) => {
          if (backdropMouseDownRef.current && e.target === e.currentTarget) {
            onClose();
          }
          backdropMouseDownRef.current = false;
        }}
      />

      <aside
        className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] lg:w-[480px] bg-[#16191b] border-l border-border/80 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Filter className="w-4 h-4 text-[#c9cd58]" />
            <span>{lang === 'ru' ? 'Фильтры календаря' : 'Calendar Filters'}</span>
          </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onResetFilters}
            title={t.reset}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-surface-hover transition-colors text-xs flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{t.reset}</span>
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-surface-hover transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* 1. Taxonomy & Folder Hierarchy */}
        <div>
          <div className="flex items-center justify-between gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#e5e971] mb-3">
            <div className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#c9cd58]" />
              <span>{t.taxonomyHierarchy}</span>
            </div>
            {filterState.tags.length > 0 && (
              <span className="text-[10px] font-mono text-[#c9cd58] bg-[#c9cd58]/15 px-1.5 py-0.5 rounded-full font-bold">
                {filterState.tags.length}
              </span>
            )}
          </div>

          {/* Preset Hierarchy Folders */}
          <div className="space-y-2 mb-3">
            {/* Films Group */}
            <div className="bg-[#121414]/90 border border-[#242828] rounded-xl p-2.5 space-y-1.5">
              <button
                onClick={() => onToggleTag('Films')}
                className={`w-full flex items-center justify-between px-2 py-1 rounded-lg text-xs font-mono transition-all ${
                  filterState.tags.includes('Films')
                    ? 'bg-[#c9cd58]/20 text-[#e5e971] font-bold border border-[#c9cd58]/50'
                    : 'text-neutral-200 hover:bg-[#242828] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-amber-400">🎬</span>
                  <span className="font-semibold">{lang === 'ru' ? 'Фильмы' : 'Films'}</span>
                </div>
                {filterState.tags.includes('Films') && (
                  <Check className="w-3 h-3 text-[#c9cd58]" />
                )}
              </button>

              <div className="pl-5 space-y-1 border-l border-[#242828]/80 ml-2">
                {[
                  { path: 'Films/Marvel', name: lang === 'ru' ? 'Марвел' : 'Marvel', icon: '🦸' },
                  { path: 'Films/Fantastic', name: lang === 'ru' ? 'Фантастика' : 'Fantastic', icon: '🚀' },
                ].map((item) => {
                  const isSelected = filterState.tags.includes(item.path);
                  return (
                    <button
                      key={item.path}
                      onClick={() => onToggleTag(item.path)}
                      className={`w-full flex items-center justify-between px-2 py-1 rounded text-xs font-mono transition-all ${
                        isSelected
                          ? 'bg-[#c9cd58]/20 text-[#e5e971] font-medium border border-[#c9cd58]/40'
                          : 'text-neutral-400 hover:text-white hover:bg-[#242828]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{item.icon}</span>
                        <span>{item.name}</span>
                      </div>
                      {isSelected && <Check className="w-3 h-3 text-[#c9cd58]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Politics Group */}
            <div className="bg-[#121414]/90 border border-[#242828] rounded-xl p-2.5 space-y-1.5">
              <button
                onClick={() => onToggleTag('Politics')}
                className={`w-full flex items-center justify-between px-2 py-1 rounded-lg text-xs font-mono transition-all ${
                  filterState.tags.includes('Politics')
                    ? 'bg-[#c9cd58]/20 text-[#e5e971] font-bold border border-[#c9cd58]/50'
                    : 'text-neutral-200 hover:bg-[#242828] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-blue-400">🏛️</span>
                  <span className="font-semibold">{lang === 'ru' ? 'Политика' : 'Politics'}</span>
                </div>
                {filterState.tags.includes('Politics') && (
                  <Check className="w-3 h-3 text-[#c9cd58]" />
                )}
              </button>

              <div className="pl-5 space-y-1 border-l border-[#242828]/80 ml-2">
                {[
                  { path: 'Politics/USA', name: lang === 'ru' ? 'США' : 'USA', icon: '🇺🇸' },
                  { path: 'Politics/Russia', name: lang === 'ru' ? 'Россия' : 'Russia', icon: '🌐' },
                ].map((item) => {
                  const isSelected = filterState.tags.includes(item.path);
                  return (
                    <button
                      key={item.path}
                      onClick={() => onToggleTag(item.path)}
                      className={`w-full flex items-center justify-between px-2 py-1 rounded text-xs font-mono transition-all ${
                        isSelected
                          ? 'bg-[#c9cd58]/20 text-[#e5e971] font-medium border border-[#c9cd58]/40'
                          : 'text-neutral-400 hover:text-white hover:bg-[#242828]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{item.icon}</span>
                        <span>{item.name}</span>
                      </div>
                      {isSelected && <Check className="w-3 h-3 text-[#c9cd58]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Dynamic Backend Taxonomy Nodes */}
          {taxonomyNodes.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {taxonomyNodes
                .filter(
                  (n) =>
                    !['films', 'films.marvel', 'films.fantastic', 'politics', 'politics.usa', 'politics.russia'].includes(
                      n.path.toLowerCase()
                    )
                )
                .slice(0, 8)
                .map((node) => {
                  const isSelected = filterState.tags.includes(node.path);
                  return (
                    <button
                      key={node.id}
                      onClick={() => onToggleTag(node.path)}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all border ${
                        isSelected
                          ? 'bg-[#c9cd58]/20 border-[#c9cd58]/60 text-[#e5e971] font-medium'
                          : 'bg-surface-elevated/40 border-border/60 text-neutral-400 hover:text-white hover:bg-surface-hover'
                      }`}
                    >
                      <span>{node.path}</span>
                    </button>
                  );
                })}
            </div>
          )}
        </div>

        {/* 2. Note Types */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">
            <Shapes className="w-3.5 h-3.5 text-[#c9cd58]" />
            <span>{t.entryTypes}</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {NOTE_TYPES.map((type) => {
              const isSelected = filterState.types.includes(type);
              const colors = NoteTypeColors[type];
              return (
                <button
                  key={type}
                  onClick={() => onToggleType(type)}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all border ${
                    isSelected
                      ? 'font-medium shadow-sm ring-1 ring-[#c9cd58]/50'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: colors.bg,
                    color: colors.text,
                    borderColor: isSelected ? colors.accent : colors.border,
                  }}
                >
                  <span className="truncate">{getTypeLabel(type)}</span>
                  {isSelected && <Check className="w-3 h-3 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Obsidian Containers */}
        {obsidianContainers.length > 0 && (
          <div>
            <div className="flex items-center justify-between gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#a855f7] mb-3">
              <div className="flex items-center gap-1.5">
                <ObsidianLogo size={14} />
                <span>Obsidian Контейнеры</span>
              </div>
              {(filterState.containers?.length || 0) > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-[#d8b4fe] bg-[#a855f7]/20 px-1.5 py-0.5 rounded-full font-bold">
                    {filterState.containers?.length}
                  </span>
                  {onClearContainers && (
                    <button
                      onClick={onClearContainers}
                      className="text-[10px] font-mono text-neutral-400 hover:text-white"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              {obsidianContainers.map((container) => {
                const isSelected = (filterState.containers || []).includes(container.id);
                const isPrivate = container.privacy === 'private';

                return (
                  <div
                    key={container.id}
                    onClick={() => onToggleContainer && onToggleContainer(container.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#1e1a29] border-[#a855f7] shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                        : 'bg-[#161819] border-[#292c2e] hover:border-[#444]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 ${
                          isSelected
                            ? 'bg-[#a855f7]/20 border-[#a855f7]'
                            : 'bg-[#1f2224] border-[#333]'
                        }`}
                      >
                        <ObsidianLogo size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-semibold truncate ${isSelected ? 'text-[#f3e8ff]' : 'text-neutral-200'}`}>
                            {container.name}
                          </span>
                          {isPrivate ? (
                            <Lock className="w-3 h-3 text-[#a855f7] shrink-0" />
                          ) : (
                            <Globe className="w-3 h-3 text-[#c9cd58] shrink-0" />
                          )}
                        </div>
                        <p className="text-[10px] font-mono text-neutral-400 truncate flex items-center gap-1">
                          <Folder className="w-2.5 h-2.5 text-neutral-500" />
                          <span>{container.vaultPath}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-mono text-[#a855f7] bg-[#a855f7]/10 px-1.5 py-0.5 rounded border border-[#a855f7]/30">
                        {container.notesCount || 0}
                      </span>
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                          isSelected
                            ? 'border-[#a855f7] bg-[#a855f7]'
                            : 'border-[#383a3a] bg-[#1a1c1c]'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Feeds & Channels (Single Stream) */}
        <div>
          <div className="flex items-center justify-between gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">
            <div className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-[#c9cd58]" />
              <span>{t.newsFeeds}</span>
            </div>
            {filterState.feed && (
              <span className="text-[10px] font-mono text-[#c9cd58] bg-[#c9cd58]/15 px-1.5 py-0.5 rounded-full font-bold">
                1 active
              </span>
            )}
          </div>

          {/* Preset Buttons */}
          <div className="grid grid-cols-2 gap-1 mb-2.5">
            {FEED_PRESET_OPTIONS.slice(0, 4).map((preset) => {
              const isActive = preset.slug === filterState.feed || (!preset.slug && !filterState.feed);

              return (
                <button
                  key={preset.id}
                  onClick={() => handleSelectFeed(preset.slug)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono flex items-center justify-between border transition-all ${
                    isActive
                      ? 'bg-[#c9cd58]/20 border-[#c9cd58]/60 text-[#e5e971] font-semibold'
                      : 'bg-[#121414] border-[#242828] text-neutral-400 hover:text-white hover:bg-[#202222]'
                  }`}
                >
                  <span className="truncate">{preset.emoji} {preset.id === 'all' ? t.presetAll : preset.name}</span>
                  {isActive && <Check className="w-2.5 h-2.5 text-[#c9cd58]" />}
                </button>
              );
            })}
          </div>

          {/* Feed Channels List */}
          <div className="space-y-1.5">
            {/* All Channels Option */}
            <div
              onClick={() => handleSelectFeed(undefined)}
              className={`group w-full flex items-center justify-between p-2 rounded-xl text-xs transition-all border cursor-pointer select-none ${
                !filterState.feed
                  ? 'bg-[#191d1e] border-[#c9cd58]/50 shadow-sm'
                  : 'bg-surface-elevated/40 border-border/50 hover:bg-surface-hover hover:border-[#383a3a]'
              }`}
            >
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 border bg-[#c9cd58]/15 border-[#c9cd58]/40">
                  <span>📡</span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`font-semibold truncate text-[11px] block ${!filterState.feed ? 'text-[#e5e971]' : 'text-neutral-200'}`}>
                    {t.allChannels}
                  </span>
                  <span className="text-[10px] font-mono text-neutral-500 truncate block">
                    {t.hubSubtitle}
                  </span>
                </div>
              </div>

              <div className="w-4 h-4 rounded-full flex items-center justify-center border transition-all flex-shrink-0 border-[#383a3a] bg-[#1a1c1c]">
                {!filterState.feed && <div className="w-1.5 h-1.5 rounded-full bg-[#c9cd58]" />}
              </div>
            </div>

            {feeds.map((feed) => {
              const isSelected = filterState.feed === feed.slug;
              const theme = getFeedTheme(feed.slug, feed.title);

              return (
                <div
                  key={feed.id}
                  onClick={() => handleSelectFeed(feed.slug)}
                  className={`group w-full flex items-center justify-between p-2 rounded-xl text-xs transition-all border cursor-pointer select-none ${
                    isSelected
                      ? 'bg-[#191d1e] border-[#c9cd58]/50 shadow-sm'
                      : 'bg-surface-elevated/40 border-border/50 hover:bg-surface-hover hover:border-[#383a3a]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 border"
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

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
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
        </div>

        {/* 4. Hashtags Cloud */}
        {hashtags.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">
              <Hash className="w-3.5 h-3.5 text-[#c9cd58]" />
              <span>{t.hashtags}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {hashtags.slice(0, 25).map((ht) => {
                const isSelected = filterState.hashtags.includes(ht.name.replace(/^#/, ''));
                return (
                  <button
                    key={ht.id}
                    onClick={() => onToggleHashtag(ht.name)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-mono transition-all border ${
                      isSelected
                        ? 'bg-[#d4e157]/20 border-[#d4e157]/60 text-[#d4e157] font-semibold'
                        : 'bg-surface-elevated/30 border-border/40 text-neutral-400 hover:text-neutral-200 hover:bg-surface-hover'
                    }`}
                  >
                    #{ht.name.replace(/^#/, '')}
                    {ht._count?.notes !== undefined && (
                      <span className="ml-1 opacity-60 text-[9px]">{ht._count.notes}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  </>
);
};
