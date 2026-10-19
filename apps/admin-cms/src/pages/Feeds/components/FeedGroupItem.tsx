import React from 'react';
import { FeedGroup } from '../feeds.utils';
import { FeedTreeNodeItem } from './FeedTreeNodeItem';
import { Feed } from '../../../types';
import { AdminTranslations } from '../../../i18n';

interface FeedGroupItemProps {
  group: FeedGroup;
  isExpanded: boolean;
  onToggleExpand: (groupId: string) => void;
  onEdit: (feed: Feed) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
  onNavigateNotes: (feedId: string) => void;
  onAddInGroup?: (group: FeedGroup) => void;
  t: AdminTranslations;
}

export const FeedGroupItem: React.FC<FeedGroupItemProps> = ({
  group,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onRestore,
  onNavigateNotes,
  onAddInGroup,
  t,
}) => {
  return (
    <div className="bg-surface-container-high/40 rounded-xl border border-white/5 p-3.5 mb-3 transition-colors hover:border-white/10">
      {/* Group Header Row */}
      <div className="flex items-center justify-between gap-3 select-none">
        <div
          onClick={() => onToggleExpand(group.id)}
          className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0 group"
        >
          {/* Chevron */}
          <button
            type="button"
            className="text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center w-6 h-6 rounded hover:bg-white/5"
          >
            <span className="material-symbols-outlined text-[18px]">
              {isExpanded ? 'expand_more' : 'chevron_right'}
            </span>
          </button>

          {/* Group Icon */}
          <div
            className="w-7 h-7 rounded flex items-center justify-center shrink-0"
            style={{
              backgroundColor: `${group.color}20`,
              color: group.color,
            }}
          >
            <span className="material-symbols-outlined text-[16px]">{group.icon}</span>
          </div>

          {/* Group Title */}
          <span className="font-sans font-bold text-sm text-on-surface group-hover:text-primary transition-colors">
            {group.name}
          </span>

          {/* Group Counts & Badges */}
          <div className="flex items-center gap-2">
            <span className="bg-surface-container px-2 py-0.5 rounded text-[11px] font-mono text-on-surface-variant border border-white/5">
              {t.feedsTotalCount(group.feeds.length)}
            </span>
            <span className="bg-surface-container px-2 py-0.5 rounded text-[11px] font-mono text-secondary border border-secondary/20">
              {t.notesCountBadge(group.totalNotes)}
            </span>
          </div>
        </div>

        {/* Group Actions */}
        {onAddInGroup && (
          <button
            type="button"
            onClick={() => onAddInGroup(group)}
            className="px-2.5 py-1 text-xs font-mono text-on-surface-variant hover:text-primary hover:bg-white/5 rounded border border-white/10 transition-colors flex items-center gap-1"
            title={`Добавить ленту в ${group.name}`}
          >
            <span className="material-symbols-outlined text-[14px]">add</span>
            <span className="hidden sm:inline">{t.addFolderBtn}</span>
          </button>
        )}
      </div>

      {/* Group Children (Feeds) */}
      {isExpanded && (
        <div className="mt-2.5 space-y-1">
          {group.feeds.map((feed) => (
            <FeedTreeNodeItem
              key={feed.id}
              feed={feed}
              onEdit={onEdit}
              onDelete={onDelete}
              onRestore={onRestore}
              onNavigateNotes={onNavigateNotes}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
};
