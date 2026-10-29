import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  ChevronDown,
  FolderGit2,
  ChevronsUpDown,
  ChevronsDownUp,
  Plus,
  Search,
  X,
  Files,
  FileQuestion,
  Lock,
  Globe,
} from 'lucide-react';
import { useFolderTree, useCreateFolder, useUpdateFolder, useDeleteFolder } from '../api/queries';
import { FolderTreeNode, FolderPrivacy, CreateFolderInput } from '../types';
import { message } from 'antd';
import { useAdminI18n } from '../i18n';
import {
  renderFolderIcon,
  filterFolderTree,
  calculateFolderCounts,
} from './folders/folderTree.utils';
import { FolderNodeActionDock } from './folders/FolderNodeActionDock';
import { CreateFolderModal } from './folders/CreateFolderModal';

interface FolderExplorerProps {
  selectedFolder?: string;
  isUnfiledSelected?: boolean;
  onSelectFolder: (folderPath?: string) => void;
  onSelectUnfiled: () => void;
  onCreateNote?: (folderPath: string) => void;
  totalNotesCount?: number;
  unfiledNotesCount?: number;
  className?: string;
}

export const FolderExplorer: React.FC<FolderExplorerProps> = ({
  selectedFolder,
  isUnfiledSelected = false,
  onSelectFolder,
  onSelectUnfiled,
  onCreateNote,
  totalNotesCount = 0,
  unfiledNotesCount = 0,
  className = '',
}) => {
  const { t } = useAdminI18n();
  const navigate = useNavigate();

  const { data: tree = [], isLoading } = useFolderTree();
  const createFolderMutation = useCreateFolder();
  const updateFolderMutation = useUpdateFolder();
  const deleteFolderMutation = useDeleteFolder();

  const [searchQuery, setSearchQuery] = useState('');
  const [privacyFilter, setPrivacyFilter] = useState<'all' | 'public' | 'private'>('all');
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => new Set());

  // Create folder modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [parentForNew, setParentForNew] = useState<string>('');
  const [defaultPrivacyForNew, setDefaultPrivacyForNew] = useState<FolderPrivacy>('public');

  // Expand parent paths when a folder is selected
  useEffect(() => {
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

  const counts = useMemo(() => calculateFolderCounts(tree), [tree]);

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

  const handleOpenCreateModal = (parentPath = '', defaultPrivacy: FolderPrivacy = 'public') => {
    setParentForNew(parentPath);
    setDefaultPrivacyForNew(defaultPrivacy);
    setCreateModalOpen(true);
  };

  const handleCreateFolderSubmit = async (input: CreateFolderInput) => {
    try {
      await createFolderMutation.mutateAsync(input);
      message.success(t.folderUpdatedSuccess);
      onSelectFolder(input.path);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Error creating folder';
      message.error(errMsg);
      throw err;
    }
  };

  const handleTogglePrivacy = async (node: FolderTreeNode) => {
    const targetPrivacy: FolderPrivacy = node.privacy === 'private' ? 'public' : 'private';
    try {
      await updateFolderMutation.mutateAsync({
        id: node.id,
        data: {
          privacy: targetPrivacy,
          color: targetPrivacy === 'private' ? '#a855f7' : '#c9cd58',
        },
      });
      message.success(
        targetPrivacy === 'private'
          ? `Папка "${node.name}" теперь приватная`
          : `Папка "${node.name}" теперь публичная`
      );
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error updating folder privacy');
    }
  };

  const handleDeleteFolder = async (node: FolderTreeNode) => {
    try {
      await deleteFolderMutation.mutateAsync(node.id);
      message.success(t.folderDeletedSuccess);
      if (selectedFolder === node.path || selectedFolder?.startsWith(`${node.path}/`)) {
        onSelectFolder(undefined);
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error deleting folder');
    }
  };

  const displayedTree = useMemo(() => {
    return filterFolderTree(tree, searchQuery, privacyFilter);
  }, [tree, searchQuery, privacyFilter]);

  const renderNode = (node: FolderTreeNode, depth = 0) => {
    const isExpanded = expandedPaths.has(node.path) || Boolean(searchQuery);
    const isSelected = selectedFolder === node.path;
    const hasChildren = node.children.length > 0;
    const isPrivate = node.privacy === 'private';
    const folderColor = node.color || (isPrivate ? '#a855f7' : '#c9cd58');

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
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            ) : (
              <span className="w-4 h-4 flex items-center justify-center text-on-surface-variant/30 text-[10px]">
                •
              </span>
            )}

            {/* Folder Icon (Colorized) */}
            <div
              className="flex items-center justify-center shrink-0"
              style={{ color: folderColor }}
            >
              {renderFolderIcon(node.icon || (isPrivate ? 'lock' : 'folder'), isExpanded, 'w-4 h-4')}
            </div>

            {/* Name */}
            <span className="truncate font-mono text-[12px]" title={node.path}>
              {node.name}
            </span>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Hover Actions Dock */}
            <FolderNodeActionDock
              node={node}
              onAddSubfolder={(path, priv) => handleOpenCreateModal(path, priv)}
              onAddNote={(path) => {
                if (onCreateNote) {
                  onCreateNote(path);
                } else {
                  navigate(`/notes/new?folder=${encodeURIComponent(path)}`);
                }
              }}
              onTogglePrivacy={handleTogglePrivacy}
              onDeleteFolder={handleDeleteFolder}
            />

            {/* Privacy indicator badge */}
            <span
              className={`text-[9px] font-mono px-1 py-0.5 rounded flex items-center gap-0.5 border ${
                isPrivate
                  ? 'bg-purple-500/15 border-purple-500/30 text-purple-600 dark:text-purple-300'
                  : 'bg-primary/15 border-primary/30 text-primary'
              }`}
              title={isPrivate ? t.folderPrivacyPrivate : t.folderPrivacyPublic}
            >
              {isPrivate ? <Lock className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
            </span>

            {/* Notes count badge */}
            <span
              className={`font-mono text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                isSelected
                  ? 'bg-primary/25 text-primary font-bold border-primary/30'
                  : 'bg-tile text-on-surface-variant border-tile-border font-medium'
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
    <div className={`platform-tile flex flex-col h-full overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-2.5 border-b border-tile-border bg-tile space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <FolderGit2 className="w-4 h-4 text-primary shrink-0" />
            <span className="font-mono text-xs font-bold text-on-surface uppercase tracking-wider">
              {t.vaultFoldersMetric}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={expandAll}
              className="p-1 rounded hover:bg-tile-subtle text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              title={t.expandAll}
            >
              <ChevronsUpDown className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="p-1 rounded hover:bg-tile-subtle text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              title={t.collapseAll}
            >
              <ChevronsDownUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleOpenCreateModal()}
              className="p-1 rounded hover:bg-primary/20 text-primary transition-colors cursor-pointer"
              title={t.addFolderBtn}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 w-3.5 h-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchFoldersPlaceholder}
            className="w-full bg-control border border-control-border rounded pl-7 pr-6 py-1 text-[11px] font-mono text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-on-surface p-0.5 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Privacy Filter Tabs matching calendar-app */}
        <div className="flex items-center gap-1 p-0.5 bg-control rounded border border-control-border text-[10px] font-mono">
          <button
            type="button"
            onClick={() => setPrivacyFilter('all')}
            className={`flex-1 py-1 rounded transition-colors text-center cursor-pointer ${
              privacyFilter === 'all'
                ? 'bg-tile text-on-surface font-bold shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {t.filterAllFolders} ({counts.total})
          </button>
          <button
            type="button"
            onClick={() => setPrivacyFilter('public')}
            className={`flex-1 py-1 rounded transition-colors text-center flex items-center justify-center gap-1 cursor-pointer ${
              privacyFilter === 'public'
                ? 'bg-primary/20 text-primary font-bold shadow-xs'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            <Globe className="w-2.5 h-2.5" />
            <span>{t.filterPublicFolders} ({counts.publicCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setPrivacyFilter('private')}
            className={`flex-1 py-1 rounded transition-colors text-center flex items-center justify-center gap-1 cursor-pointer ${
              privacyFilter === 'private'
                ? 'bg-purple-500/20 text-purple-300 font-bold shadow-xs'
                : 'text-on-surface-variant hover:text-purple-300'
            }`}
          >
            <Lock className="w-2.5 h-2.5" />
            <span>{t.filterPrivateFolders} ({counts.privateCount})</span>
          </button>
        </div>
      </div>

      {/* Root Standard Views (All Notes & Unfiled) */}
      <div className="p-2 border-b border-tile-border space-y-0.5 bg-tile-subtle">
        {/* All Notes Entry */}
        <div
          onClick={() => onSelectFolder(undefined)}
          className={`flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-all cursor-pointer ${
            !selectedFolder && !isUnfiledSelected
              ? 'bg-primary text-on-primary font-semibold shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-tile'
          }`}
        >
          <div className="flex items-center gap-2">
            <Files className="w-3.5 h-3.5 shrink-0" />
            <span className="font-sans text-[11px]">{t.allNotes}</span>
          </div>
          <span
            className={`font-mono text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
              !selectedFolder && !isUnfiledSelected
                ? 'bg-tile text-primary font-bold border-primary/30 shadow-xs'
                : 'bg-tile text-on-surface-variant border-tile-border font-medium'
            }`}
          >
            {totalNotesCount}
          </span>
        </div>

        {/* Unfiled / Root Notes Entry */}
        <div
          onClick={onSelectUnfiled}
          className={`flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-all cursor-pointer ${
            isUnfiledSelected
              ? 'bg-primary text-on-primary font-semibold shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-tile'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileQuestion className="w-3.5 h-3.5 text-outline/70 shrink-0" />
            <span className="font-sans text-[11px]">Unfiled (Root)</span>
          </div>
          <span
            className={`font-mono text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
              isUnfiledSelected
                ? 'bg-tile text-primary font-bold border-primary/30 shadow-xs'
                : 'bg-tile text-on-surface-variant border-tile-border font-medium'
            }`}
          >
            {unfiledNotesCount}
          </span>
        </div>
      </div>

      {/* Folders Tree List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
        {isLoading ? (
          <div className="p-4 text-center text-xs font-mono text-on-surface-variant">
            {t.loading}
          </div>
        ) : displayedTree.length > 0 ? (
          displayedTree.map((node) => renderNode(node, 0))
        ) : (
          <div className="p-4 text-center text-xs font-mono text-on-surface-variant">
            {t.noNotesFound}
          </div>
        )}
      </div>

      {/* Obsidian Vault Status in Explorer Footer */}
      <div className="p-2 border-t border-tile-border bg-tile-subtle flex items-center justify-between text-[10px] font-mono text-on-surface-variant">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          Obsidian Vault
        </span>
        <span>{counts.total} папок</span>
      </div>

      {/* Upgraded Create Folder Modal with Privacy selection */}
      <CreateFolderModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        parentPath={parentForNew}
        defaultPrivacy={defaultPrivacyForNew}
        onSubmit={handleCreateFolderSubmit}
        isLoading={createFolderMutation.isPending}
      />
    </div>
  );
};
