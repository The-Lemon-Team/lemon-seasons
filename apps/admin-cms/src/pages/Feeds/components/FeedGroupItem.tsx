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
    <div className="platform-tile platform-tile-hover p-3 mb-2.5">
      {/* Group Header Row */}
      <div className="flex items-center justify-between gap-3 select-none">
        <div
          onClick={() => onToggleExpand(group.id)}
          className="flex items-center gap-2 cursor-pointer flex-1 min-w-0 group"
        >
          {/* Chevron */}
          <button
            type="button"
            className="text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center w-6 h-6 rounded hover:bg-tile-subtle cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">
              {isExpanded ? 'expand_more' : 'chevron_right'}
            </span>
          </button>

          {/* Group Icon */}
          <div
            className="w-6.5 h-6.5 rounded flex items-center justify-center shrink-0 border border-tile-border"
            style={{
              backgroundColor: `${group.color}20`,
              color: group.color,
            }}
          >
            <span className="material-symbols-outlined text-[15px]">{group.icon}</span>
          </div>

          {/* Group Title */}
          <span className="font-sans font-bold text-xs text-on-surface group-hover:text-primary transition-colors truncate">
            {group.name}
          </span>

          {/* Group Counts & Badges */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="bg-tile-subtle px-1.5 py-0.5 rounded text-[10px] font-mono text-on-surface-variant border border-tile-border">
              {t.feedsTotalCount(group.feeds.length)}
            </span>
            <span className="bg-tile-subtle px-1.5 py-0.5 rounded text-[10px] font-mono text-secondary border border-secondary/20">
              {t.notesCountBadge(group.totalNotes)}
            </span>
          </div>
        </div>

        {/* Group Actions */}
        {onAddInGroup && (
          <button
            type="button"
            onClick={() => onAddInGroup(group)}
            className="px-2 py-0.5 text-[10px] font-mono text-on-surface-variant hover:text-primary hover:bg-tile-subtle rounded border border-tile-border transition-colors flex items-center gap-1 cursor-pointer"
            title={`Добавить ленту в ${group.name}`}
          >
            <span className="material-symbols-outlined text-[13px]">add</span>
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
