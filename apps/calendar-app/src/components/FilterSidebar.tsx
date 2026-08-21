import React from 'react';
import { CalendarFilterState, NoteType, NOTE_TYPES, NoteTypeLabels, NoteTypeColors } from '@lenta/shared';
import { useFeeds, useTaxonomyTree, useHashtags } from '../api/queries';
import {
  X,
  Filter,
  Layers,
  Tag,
  Hash,
  Shapes,
  Check,
  RotateCcw,
} from 'lucide-react';

interface FilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  filterState: CalendarFilterState;
  onToggleFeed: (feedSlug: string) => void;
  onToggleTag: (tagPath: string) => void;
  onToggleHashtag: (hashtag: string) => void;
  onToggleType: (type: NoteType) => void;
  onResetFilters: () => void;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  isOpen,
  onClose,
  filterState,
  onToggleFeed,
  onToggleTag,
  onToggleHashtag,
  onToggleType,
  onResetFilters,
}) => {
  const { data: feeds = [] } = useFeeds();
  const { data: taxonomyNodes = [] } = useTaxonomyTree();
  const { data: hashtags = [] } = useHashtags();

  if (!isOpen) return null;

  return (
    <aside className="fixed inset-y-0 right-0 z-50 w-80 bg-[#16191b] border-l border-border/80 shadow-2xl flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2 text-white font-semibold text-sm">
          <Filter className="w-4 h-4 text-[#c9cd58]" />
          <span>Filters & Channels</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onResetFilters}
            title="Reset Filters"
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-surface-hover transition-colors text-xs flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
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
        {/* 1. Feeds */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">
            <Layers className="w-3.5 h-3.5 text-[#c9cd58]" />
            <span>Data Feeds</span>
          </div>
          <div className="space-y-1.5">
            {feeds.map((feed) => {
              const isSelected = filterState.feeds.includes(feed.slug);
              return (
                <button
                  key={feed.id}
                  onClick={() => onToggleFeed(feed.slug)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all border ${
                    isSelected
                      ? 'bg-[#c9cd58]/15 border-[#c9cd58]/40 text-[#d4e157] font-medium'
                      : 'bg-surface-elevated/40 border-border/50 text-neutral-300 hover:bg-surface-hover hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isSelected ? 'bg-[#c9cd58]' : 'bg-neutral-500'
                      }`}
                    />
                    <span>{feed.title}</span>
                  </div>
                  {feed._count?.notes !== undefined && (
                    <span className="text-[10px] font-mono text-neutral-500">
                      {feed._count.notes}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Note Types */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">
            <Shapes className="w-3.5 h-3.5 text-[#c9cd58]" />
            <span>Note Types</span>
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
                  <span>{NoteTypeLabels[type]}</span>
                  {isSelected && <Check className="w-3 h-3" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Taxonomy Tags */}
        {taxonomyNodes.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">
              <Tag className="w-3.5 h-3.5 text-[#c9cd58]" />
              <span>Taxonomy Hierarchy</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {taxonomyNodes.map((node) => {
                const isSelected = filterState.tags.includes(node.path);
                return (
                  <button
                    key={node.id}
                    onClick={() => onToggleTag(node.path)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all border ${
                      isSelected
                        ? 'bg-[#c9cd58]/20 border-[#c9cd58]/60 text-[#e5f05b] font-medium'
                        : 'bg-surface-elevated/40 border-border/60 text-neutral-300 hover:text-white hover:bg-surface-hover'
                    }`}
                  >
                    <span>{node.path}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Hashtags Cloud */}
        {hashtags.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">
              <Hash className="w-3.5 h-3.5 text-[#c9cd58]" />
              <span>Hashtags</span>
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
  );
};
