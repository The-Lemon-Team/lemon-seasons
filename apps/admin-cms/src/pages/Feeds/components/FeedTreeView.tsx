import React, { useState, useEffect } from 'react';
import { FeedGroup } from '../feeds.utils';
import { FeedGroupItem } from './FeedGroupItem';
import { Feed } from '../../../types';
import { AdminTranslations } from '../../../i18n';

interface FeedTreeViewProps {
  groups: FeedGroup[];
  onEdit: (feed: Feed) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
  onNavigateNotes: (feedId: string) => void;
  onAddInGroup?: (group: FeedGroup) => void;
  t: AdminTranslations;
}

export const FeedTreeView: React.FC<FeedTreeViewProps> = ({
  groups,
  onEdit,
  onDelete,
  onRestore,
  onNavigateNotes,
  onAddInGroup,
  t,
}) => {
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});

  // Auto-expand all groups on initial load or group changes
  useEffect(() => {
    setExpandedMap((prev) => {
      const next = { ...prev };
      for (const g of groups) {
        if (next[g.id] === undefined) {
          next[g.id] = true;
        }
      }
      return next;
    });
  }, [groups]);

  const handleToggleExpand = (groupId: string) => {
    setExpandedMap((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleExpandAll = () => {
    const next: Record<string, boolean> = {};
    for (const g of groups) {
      next[g.id] = true;
    }
    setExpandedMap(next);
  };

  const handleCollapseAll = () => {
    const next: Record<string, boolean> = {};
    for (const g of groups) {
      next[g.id] = false;
    }
    setExpandedMap(next);
  };

  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Quick Tree Controls Bar */}
      <div className="flex items-center justify-between text-xs font-mono text-on-surface-variant px-1 pb-1">
        <span className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[15px] text-primary">account_tree</span>
          <span>{t.viewTreeBtn}: {groups.length} {groups.length === 1 ? 'группа' : 'групп'}</span>
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExpandAll}
            className="hover:text-primary transition-colors hover:underline"
          >
            {t.expandAll}
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={handleCollapseAll}
            className="hover:text-primary transition-colors hover:underline"
          >
            {t.collapseAll}
          </button>
        </div>
      </div>

      {/* Tree Groups */}
      <div className="space-y-3">
        {groups.map((group) => (
          <FeedGroupItem
            key={group.id}
            group={group}
            isExpanded={expandedMap[group.id] ?? true}
            onToggleExpand={handleToggleExpand}
            onEdit={onEdit}
            onDelete={onDelete}
            onRestore={onRestore}
            onNavigateNotes={onNavigateNotes}
            onAddInGroup={onAddInGroup}
            t={t}
          />
        ))}
      </div>
    </div>
  );
};
