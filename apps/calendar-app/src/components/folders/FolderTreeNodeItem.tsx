import React from 'react';
import { FolderTreeNode, FolderPrivacy } from '@lenta/shared';
import { ChevronRight, ChevronDown, Lock, Globe } from 'lucide-react';
import { renderFolderIcon } from '../../utils/folders.utils';
import { FolderNodeActionDock } from './FolderNodeActionDock';

export interface FolderTreeNodeItemProps {
  node: FolderTreeNode;
  depth?: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddSubfolder: (path: string, privacy: FolderPrivacy) => void;
  onAddNote?: (folderPath: string, folderId: string) => void;
  onTogglePrivacyRequest: (folderId: string, targetPrivacy: FolderPrivacy) => void;
  onDeleteRequest: (folderId: string) => void;
  expandedMap: Record<string, boolean>;
  onToggleExpand: (path: string) => void;
  searchFilter: string;
  privacyFilter: 'all' | 'public' | 'private';
}

export const FolderTreeNodeItem: React.FC<FolderTreeNodeItemProps> = ({
  node,
  depth = 0,
  selectedId,
  onSelect,
  onAddSubfolder,
  onAddNote,
  onTogglePrivacyRequest,
  onDeleteRequest,
  expandedMap,
  onToggleExpand,
  searchFilter,
  privacyFilter,
}) => {
  const isExpanded = expandedMap[node.path] ?? true;
  const isSelected = selectedId === node.id;
  const hasChildren = node.children && node.children.length > 0;

  // Filter check
  const matchesPrivacy =
    privacyFilter === 'all' ? true : (node.privacy || 'public') === privacyFilter;
  const matchesSearch =
    !searchFilter ||
    node.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    node.path.toLowerCase().includes(searchFilter.toLowerCase());

  const hasMatchingChild = (n: FolderTreeNode): boolean => {
    const childMatchesPrivacy = privacyFilter === 'all' || (n.privacy || 'public') === privacyFilter;
    const childMatchesSearch =
      !searchFilter ||
      n.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      n.path.toLowerCase().includes(searchFilter.toLowerCase());

    if (childMatchesPrivacy && childMatchesSearch) {
      return true;
    }
    return n.children.some(hasMatchingChild);
  };

  const shouldRender = matchesPrivacy && matchesSearch ? true : hasMatchingChild(node);
  if (!shouldRender) return null;

  const isPrivate = node.privacy === 'private';

  return (
    <div className="flex flex-col select-none">
      <div
        onClick={() => onSelect(node.id)}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        className={`group flex items-center justify-between min-h-[32px] py-1 pr-2 rounded cursor-pointer transition-all border-l-2 gap-1.5 ${
          isSelected
            ? 'bg-[#c9cd58]/20 text-[#e5e971] font-semibold border-[#c9cd58]'
            : 'text-[#c9c7b2] hover:bg-[#252828] hover:text-white border-transparent'
        }`}
      >
        {/* Left: Chevron + Folder Icon + Folder Name */}
        <div className="flex items-center gap-1.5 overflow-hidden flex-1 min-w-0 pr-1">
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(node.path);
              }}
              className="p-0.5 rounded hover:bg-[#333535] text-[#93927e] hover:text-white transition-colors shrink-0 cursor-pointer"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          ) : (
            <div className="w-4 shrink-0" />
          )}

          <div
            className="flex items-center justify-center shrink-0"
            style={{ color: node.color || (isPrivate ? '#a855f7' : '#c9cd58') }}
          >
            {renderFolderIcon(node.icon, 'w-3.5 h-3.5')}
          </div>

          <span className="text-xs truncate font-mono" title={node.path}>
            {node.name}
          </span>
        </div>

        {/* Center / Right: Micro-Dock Action Toolbar (Option 1) */}
        <FolderNodeActionDock
          node={node}
          isSelected={isSelected}
          onAddSubfolder={onAddSubfolder}
          onAddNote={onAddNote}
          onTogglePrivacyRequest={onTogglePrivacyRequest}
          onDeleteRequest={onDeleteRequest}
        />

        {/* Far Right: Privacy indicator & Note count badge */}
        <div className="flex items-center gap-1 shrink-0">
          <span
            className={`text-[9px] font-mono px-1 py-0.5 rounded flex items-center gap-0.5 ${
              isPrivate ? 'bg-[#a855f7]/20 text-[#d8b4fe]' : 'bg-[#c9cd58]/15 text-[#e5e971]'
            }`}
            title={isPrivate ? 'Приватная папка' : 'Публичная папка'}
          >
            {isPrivate ? <Lock className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
          </span>

          <span className="text-[10px] font-mono bg-[#141616] text-[#93927e] px-1.5 py-0.5 rounded border border-[#2d3030]">
            {node.notesCount}
          </span>
        </div>
      </div>

      {/* Recursive Children Subfolders */}
      {hasChildren && isExpanded && (
        <div className="flex flex-col">
          {node.children.map((child) => (
            <FolderTreeNodeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onAddSubfolder={onAddSubfolder}
              onAddNote={onAddNote}
              onTogglePrivacyRequest={onTogglePrivacyRequest}
              onDeleteRequest={onDeleteRequest}
              expandedMap={expandedMap}
              onToggleExpand={onToggleExpand}
              searchFilter={searchFilter}
              privacyFilter={privacyFilter}
            />
          ))}
        </div>
      )}
    </div>
  );
};
