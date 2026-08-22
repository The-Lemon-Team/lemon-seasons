import React, { useState, useMemo } from 'react';
import { useFolderTree, useCreateFolder } from '../api/queries';
import { FolderTreeNode } from '../types';
import { message, Modal } from 'antd';
import { useAdminI18n } from '../i18n';

interface FolderExplorerProps {
  selectedFolder?: string;
  isUnfiledSelected?: boolean;
  onSelectFolder: (folderPath?: string) => void;
  onSelectUnfiled: () => void;
  totalNotesCount?: number;
  unfiledNotesCount?: number;
  className?: string;
}

export const FolderExplorer: React.FC<FolderExplorerProps> = ({
  selectedFolder,
  isUnfiledSelected = false,
  onSelectFolder,
  onSelectUnfiled,
  totalNotesCount = 0,
  unfiledNotesCount = 0,
  className = '',
}) => {
  const { t } = useAdminI18n();
  const { data: tree = [], isLoading } = useFolderTree();
  const createFolderMutation = useCreateFolder();

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => new Set());
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newFolderPath, setNewFolderPath] = useState('');
  const [parentForNew, setParentForNew] = useState<string>('');

  // Expand parent paths when a folder is selected
  React.useEffect(() => {
    if (selectedFolder) {
      const parts = selectedFolder.split('/');
      const toExpand = new Set(expandedPaths);
      let cur = '';
      for (let i = 0; i < parts.length; i++) {
        cur = cur ? `${cur}/${parts[i]}` : parts[i];
        toExpand.add(cur);
      }
      setExpandedPaths(toExpand);
    }
  }, [selectedFolder]);

  const toggleExpand = (path: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const expandAll = () => {
    const all = new Set<string>();
    const traverse = (nodes: FolderTreeNode[]) => {
      for (const node of nodes) {
        all.add(node.path);
        if (node.children.length > 0) traverse(node.children);
      }
    };
    traverse(tree);
    setExpandedPaths(all);
  };

  const collapseAll = () => {
    setExpandedPaths(new Set());
  };

  const handleOpenCreateModal = (parentPath = '') => {
    setParentForNew(parentPath);
    setNewFolderPath(parentPath ? `${parentPath}/` : '');
    setCreateModalOpen(true);
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPath = newFolderPath.trim();
    if (!cleanPath) {
      message.error(t.folderInputLabel);
      return;
    }
    try {
      await createFolderMutation.mutateAsync({
        path: cleanPath,
      });
      message.success(`Folder '${cleanPath}' created`);
      setCreateModalOpen(false);
      setNewFolderPath('');
      onSelectFolder(cleanPath);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error');
    }
  };

  // Filter tree recursively if searching
  const filterTree = (nodes: FolderTreeNode[], query: string): FolderTreeNode[] => {
    if (!query) return nodes;
    const lower = query.toLowerCase();
    const result: FolderTreeNode[] = [];

    for (const node of nodes) {
      const matchesSelf =
        node.name.toLowerCase().includes(lower) ||
        node.path.toLowerCase().includes(lower);
      const filteredChildren = filterTree(node.children, query);

      if (matchesSelf || filteredChildren.length > 0) {
        result.push({
          ...node,
          children: filteredChildren,
        });
      }
    }
    return result;
  };

  const displayedTree = useMemo(() => {
    return filterTree(tree, searchQuery);
  }, [tree, searchQuery]);

  const renderNode = (node: FolderTreeNode, depth = 0) => {
    const isExpanded = expandedPaths.has(node.path) || Boolean(searchQuery);
    const isSelected = selectedFolder === node.path;
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.id} className="select-none text-xs">
        <div
          onClick={() => onSelectFolder(node.path)}
          style={{ paddingLeft: `${depth * 14 + 10}px` }}
          className={`group flex items-center justify-between py-1.5 pr-2 rounded transition-all cursor-pointer ${
            isSelected
              ? 'bg-primary/20 text-primary font-semibold border-l-2 border-primary'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {/* Expand / Collapse Icon */}
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => toggleExpand(node.path, e)}
                className="w-4 h-4 flex items-center justify-center rounded hover:bg-white/10 text-on-surface-variant/70 hover:text-on-surface transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">
                  {isExpanded ? 'expand_more' : 'chevron_right'}
                </span>
              </button>
            ) : (
              <span className="w-4 h-4 flex items-center justify-center text-on-surface-variant/30 text-[10px]">
                •
              </span>
            )}

            {/* Folder Icon */}
            <span
              className={`material-symbols-outlined text-[16px] flex-shrink-0 ${
                isSelected ? 'text-primary' : 'text-primary/70 group-hover:text-primary'
              }`}
            >
              {isExpanded ? 'folder_open' : 'folder'}
            </span>

            {/* Name */}
            <span className="truncate font-mono text-[12px]" title={node.path}>
              {node.name}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Quick add subfolder button on hover */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenCreateModal(node.path);
              }}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 text-on-surface-variant hover:text-primary transition-all cursor-pointer"
              title={`Create subfolder inside ${node.path}`}
            >
              <span className="material-symbols-outlined text-[14px]">create_new_folder</span>
            </button>

            {/* Notes count badge */}
            <span
              className={`font-mono text-[10px] px-1.5 py-0.2 rounded ${
                isSelected
                  ? 'bg-primary/30 text-primary font-bold'
                  : 'bg-surface-container-highest text-on-surface-variant/70'
              }`}
            >
              {node.notesCount}
            </span>
          </div>
        </div>

        {/* Children Subfolders */}
        {hasChildren && isExpanded && (
          <div className="space-y-0.5">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`bg-surface-container-low border border-white/5 rounded-lg flex flex-col h-full overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="p-3 border-b border-white/5 bg-surface-container-high/40">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">
              folder_managed
            </span>
            <span className="font-mono text-xs font-bold text-on-surface uppercase tracking-wider">
              {t.vaultFoldersMetric}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={expandAll}
              className="p-1 rounded hover:bg-white/5 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              title="Expand all"
            >
              <span className="material-symbols-outlined text-[15px]">unfold_more</span>
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="p-1 rounded hover:bg-white/5 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              title="Collapse all"
            >
              <span className="material-symbols-outlined text-[15px]">unfold_less</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenCreateModal()}
              className="p-1 rounded hover:bg-primary/20 text-primary transition-colors cursor-pointer"
              title="Add folder"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
            </button>
          </div>
        </div>

        {/* Search inside folder hierarchy */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-[14px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.selectFolderPlaceholder}
            className="w-full bg-surface-container-lowest border border-white/10 rounded pl-7 pr-6 py-1 text-[11px] font-mono text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-on-surface p-0.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[12px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Root Standard Views (All Notes & Unfiled) */}
      <div className="p-2 border-b border-white/5 space-y-0.5 bg-surface-container/30">
        {/* All Notes Entry */}
        <div
          onClick={() => onSelectFolder(undefined)}
          className={`flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-all cursor-pointer ${
            !selectedFolder && !isUnfiledSelected
              ? 'bg-primary/20 text-primary font-semibold border-l-2 border-primary'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">library_books</span>
            <span className="font-sans text-[12px]">{t.allNotes}</span>
          </div>
          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-surface-container-highest text-on-surface-variant/80">
            {totalNotesCount}
          </span>
        </div>

        {/* Unfiled / Root Notes Entry */}
        <div
          onClick={onSelectUnfiled}
          className={`flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-all cursor-pointer ${
            isUnfiledSelected
              ? 'bg-primary/20 text-primary font-semibold border-l-2 border-primary'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-outline/70">
              draft
            </span>
            <span className="font-sans text-[12px]">Unfiled (Root)</span>
          </div>
          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-surface-container-highest text-on-surface-variant/80">
            {unfiledNotesCount}
          </span>
        </div>
      </div>

      {/* Folders Tree List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {isLoading ? (
          <div className="p-4 text-center text-xs font-mono text-on-surface-variant/60">
            {t.loading}
          </div>
        ) : displayedTree.length > 0 ? (
          displayedTree.map((node) => renderNode(node, 0))
        ) : (
          <div className="p-4 text-center text-xs font-mono text-on-surface-variant/60 space-y-2">
            <p>—</p>
          </div>
        )}
      </div>

      {/* Obsidian Vault Status in Explorer Footer */}
      <div className="p-2.5 border-t border-white/5 bg-surface-container-high/30 flex items-center justify-between text-[11px] font-mono text-on-surface-variant/70">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          Obsidian Vault
        </span>
        <span>{tree.length}</span>
      </div>

      {/* Create Folder Modal */}
      <Modal
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        footer={null}
        title={
          <span className="font-sans font-bold text-base text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">
              create_new_folder
            </span>
            {t.folderInputLabel}
          </span>
        }
        width={440}
        styles={{
          content: {
            backgroundColor: '#292a2a',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          },
        }}
      >
        <form onSubmit={handleCreateFolder} className="space-y-4 pt-3">
          <div className="space-y-1.5">
            <label className="block font-mono text-[11px] font-semibold text-on-surface-variant uppercase">
              {t.folderInputLabel}
            </label>
            <input
              type="text"
              value={newFolderPath}
              onChange={(e) => setNewFolderPath(e.target.value)}
              placeholder="e.g. News/Tech or Projects"
              className="w-full bg-surface-container-lowest border border-white/10 rounded px-3 py-2 text-on-surface font-mono text-xs focus:border-primary outline-none"
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-3 py-1.5 text-xs text-on-surface-variant hover:text-on-surface rounded font-medium"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={createFolderMutation.isPending}
              className="px-4 py-1.5 bg-primary text-on-primary hover:bg-primary-fixed-dim rounded font-semibold text-xs transition-all shadow disabled:opacity-50"
            >
              {createFolderMutation.isPending ? t.loading : t.add}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

