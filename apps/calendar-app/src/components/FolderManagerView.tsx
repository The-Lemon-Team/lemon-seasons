import React, { useState, useMemo } from 'react';
import { useFoldersContext, PrivacyImpact } from '../context/FoldersContext';
import { useObsidianContainers } from '../context/ObsidianContainersContext';
import { useI18n } from '../i18n';
import { FolderTreeNode, Folder, Note, NoteType, FolderPrivacy } from '@lenta/shared';
import { CreateFolderModal } from './CreateFolderModal';
import { PrivacyChangeWarningModal } from './PrivacyChangeWarningModal';
import { NoteDetailModal } from './NoteDetailModal';
import {
  Folder as FolderIcon,
  FolderPlus,
  FolderTree,
  Lock,
  Globe,
  Search,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Layers,
  FileText,
  Calendar,
  Sparkles,
  Tag,
  Hash,
  ExternalLink,
  Shield,
  ShieldAlert,
  Info,
  Clock,
  CheckCircle2,
  SlidersHorizontal,
  ArrowRight,
  BookOpen,
  Film,
  Bot,
  Archive,
  Star,
  CircleDollarSign,
} from 'lucide-react';
import dayjs from 'dayjs';

interface FolderTreeNodeItemProps {
  node: FolderTreeNode;
  depth?: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddSubfolder: (path: string, privacy: FolderPrivacy) => void;
  onTogglePrivacyRequest: (folderId: string, targetPrivacy: FolderPrivacy) => void;
  onDeleteRequest: (folderId: string) => void;
  expandedMap: Record<string, boolean>;
  onToggleExpand: (path: string) => void;
  searchFilter: string;
  privacyFilter: 'all' | 'public' | 'private';
}

const renderIconComponent = (iconName: string | null, className = 'w-4 h-4') => {
  switch (iconName) {
    case 'lock':
      return <Lock className={className} />;
    case 'book-open':
      return <BookOpen className={className} />;
    case 'sparkles':
      return <Sparkles className={className} />;
    case 'film':
      return <Film className={className} />;
    case 'bot':
      return <Bot className={className} />;
    case 'archive':
      return <Archive className={className} />;
    case 'star':
      return <Star className={className} />;
    case 'circle-dollar-sign':
      return <CircleDollarSign className={className} />;
    default:
      return <FolderIcon className={className} />;
  }
};

const FolderTreeNodeItem: React.FC<FolderTreeNodeItemProps> = ({
  node,
  depth = 0,
  selectedId,
  onSelect,
  onAddSubfolder,
  onTogglePrivacyRequest,
  onDeleteRequest,
  expandedMap,
  onToggleExpand,
  searchFilter,
  privacyFilter,
}) => {
  const { t } = useI18n();
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
    if (
      (!searchFilter || n.name.toLowerCase().includes(searchFilter.toLowerCase()) || n.path.toLowerCase().includes(searchFilter.toLowerCase())) &&
      (privacyFilter === 'all' || (n.privacy || 'public') === privacyFilter)
    ) {
      return true;
    }
    return n.children.some(hasMatchingChild);
  };

  const shouldRender = matchesPrivacy && matchesSearch ? true : hasMatchingChild(node);
  if (!shouldRender) return null;

  const isPrivate = node.privacy === 'private';
  const targetPrivacy: FolderPrivacy = isPrivate ? 'public' : 'private';

  return (
    <div className="flex flex-col select-none">
      <div
        onClick={() => onSelect(node.id)}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        className={`group flex items-center justify-between h-8 pr-2 rounded cursor-pointer transition-all border-l-2 ${
          isSelected
            ? 'bg-[#c9cd58]/20 text-[#e5e971] font-semibold border-[#c9cd58]'
            : 'text-[#c9c7b2] hover:bg-[#252828] hover:text-white border-transparent'
        }`}
      >
        <div className="flex items-center gap-1.5 overflow-hidden flex-1 min-w-0 pr-1">
          {/* Expand/Collapse Toggle */}
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(node.path);
              }}
              className="p-0.5 rounded hover:bg-[#333535] text-[#93927e] hover:text-white transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          ) : (
            <div className="w-4" />
          )}

          {/* Icon with Color Dot */}
          <div
            className="flex items-center justify-center shrink-0"
            style={{ color: node.color || (isPrivate ? '#a855f7' : '#c9cd58') }}
          >
            {renderIconComponent(node.icon, 'w-3.5 h-3.5')}
          </div>

          {/* Folder Name */}
          <span className="text-xs truncate font-mono">{node.name}</span>
        </div>

        {/* Badges & Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Privacy Badge */}
          <span
            title={isPrivate ? t.folderPrivacyPrivate : t.folderPrivacyPublic}
            className={`text-[9px] font-mono px-1 py-0.5 rounded flex items-center gap-0.5 ${
              isPrivate ? 'bg-[#a855f7]/20 text-[#d8b4fe]' : 'bg-[#c9cd58]/15 text-[#e5e971]'
            }`}
          >
            {isPrivate ? <Lock className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
          </span>

          {/* Note Count Badge */}
          <span className="text-[10px] font-mono bg-[#141616] text-[#93927e] px-1.5 py-0.5 rounded border border-[#2d3030]">
            {node.notesCount}
          </span>

          {/* Hover Actions Menu */}
          <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-150">
            {/* Add Subfolder */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddSubfolder(node.path, node.privacy || 'public');
              }}
              title="Добавить подпапку"
              className="p-1 rounded bg-[#141616] hover:bg-[#282a2a] text-[#93927e] hover:text-[#c9cd58] transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>

            {/* Quick Toggle Privacy */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePrivacyRequest(node.id, targetPrivacy);
              }}
              title={`Сменить на ${targetPrivacy === 'private' ? 'Приватную' : 'Публичную'}`}
              className="p-1 rounded bg-[#141616] hover:bg-[#282a2a] text-[#93927e] hover:text-[#e5e971] transition-colors"
            >
              {isPrivate ? <Globe className="w-3 h-3 text-[#c9cd58]" /> : <Lock className="w-3 h-3 text-[#a855f7]" />}
            </button>
          </div>
        </div>
      </div>

      {/* Render Subfolder Children */}
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

export const FolderManagerView: React.FC = () => {
  const { t } = useI18n();
  const {
    folders,
    folderTree,
    selectedFolderId,
    selectedFolder,
    setSelectedFolderId,
    deleteFolder,
    getFolderPrivacyImpact,
    executePrivacyChange,
    getFolderContainerUsage,
    getNotesForFolder,
  } = useFoldersContext();

  const { containers } = useObsidianContainers();

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [privacyFilter, setPrivacyFilter] = useState<'all' | 'public' | 'private'>('all');
  const [noteTypeFilter, setNoteTypeFilter] = useState<string>('all');
  const [noteSearch, setNoteSearch] = useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createParentPath, setCreateParentPath] = useState('');
  const [createDefaultPrivacy, setCreateDefaultPrivacy] = useState<FolderPrivacy>('public');

  const [warningImpact, setWarningImpact] = useState<PrivacyImpact | null>(null);
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);

  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  // Tree Expansion state
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});

  const handleToggleExpand = (path: string) => {
    setExpandedMap((prev) => ({
      ...prev,
      [path]: prev[path] === undefined ? false : !prev[path],
    }));
  };

  // Stats calculation
  const totalFoldersCount = folders.length;
  const publicFoldersCount = folders.filter((f) => f.privacy === 'public').length;
  const privateFoldersCount = folders.filter((f) => f.privacy === 'private').length;

  const foldersInContainersCount = useMemo(() => {
    const boundPaths = new Set(
      containers.flatMap((c) => c.boundFolders.map((bf) => bf.path.toLowerCase()))
    );
    return folders.filter((f) => boundPaths.has(f.path.toLowerCase())).length;
  }, [folders, containers]);

  // Notes in selected folder
  const notesInFolder = useMemo(() => {
    if (!selectedFolder) return [];
    const notes = getNotesForFolder(selectedFolder.path, true);
    return notes.filter((n) => {
      const matchesType = noteTypeFilter === 'all' ? true : n.type === noteTypeFilter;
      const matchesText =
        !noteSearch ||
        n.title.toLowerCase().includes(noteSearch.toLowerCase()) ||
        (n.description && n.description.toLowerCase().includes(noteSearch.toLowerCase()));
      return matchesType && matchesText;
    });
  }, [selectedFolder, getNotesForFolder, noteTypeFilter, noteSearch]);

  // Usages in Obsidian Containers
  const containerUsages = useMemo(() => {
    if (!selectedFolder) return [];
    return getFolderContainerUsage(selectedFolder.path);
  }, [selectedFolder, getFolderContainerUsage]);

  // Trigger Privacy Change Request
  const handleTogglePrivacyRequest = (folderId: string, targetPrivacy: FolderPrivacy) => {
    const impact = getFolderPrivacyImpact(folderId, targetPrivacy);
    setWarningImpact(impact);
    setIsWarningModalOpen(true);
  };

  const handleConfirmPrivacyChange = () => {
    if (warningImpact) {
      executePrivacyChange(warningImpact.folderId, warningImpact.targetPrivacy);
      setWarningImpact(null);
    }
  };

  const handleAddSubfolder = (parentPath: string, privacy: FolderPrivacy) => {
    setCreateParentPath(parentPath);
    setCreateDefaultPrivacy(privacy);
    setIsCreateModalOpen(true);
  };

  return (
    <div className="flex flex-col h-full bg-[#121414] overflow-hidden">
      {/* Top Header Banner */}
      <header className="px-6 py-4 border-b border-[#242828] bg-[#181a1a] flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c9cd58]/30 to-[#535600]/20 border border-[#c9cd58]/50 flex items-center justify-center text-xl shadow-glow-lemon">
            📁
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-sans font-bold text-base text-[#e2e2e2] tracking-wide">
                {t.folderManager}
              </h1>
              <span className="text-[10px] font-mono uppercase bg-[#c9cd58]/20 text-[#e5e971] px-2 py-0.5 rounded font-bold border border-[#c9cd58]/30">
                Obsidian Explorer
              </span>
            </div>
            <p className="text-xs font-mono text-[#93927e]">
              {t.folderManagerSubtitle}
            </p>
          </div>
        </div>

        {/* Header Stats Bar */}
        <div className="flex items-center gap-3 overflow-x-auto pb-1 md:pb-0">
          <div className="px-3 py-1.5 rounded-lg bg-[#141616] border border-[#2d3030] flex items-center gap-2">
            <FolderTree className="w-3.5 h-3.5 text-[#c9cd58]" />
            <div className="text-[11px] font-mono">
              <span className="text-[#93927e]">Всего: </span>
              <span className="font-bold text-[#e2e2e2]">{totalFoldersCount}</span>
            </div>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-[#141616] border border-[#2d3030] flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-[#c9cd58]" />
            <div className="text-[11px] font-mono">
              <span className="text-[#93927e]">Публичные: </span>
              <span className="font-bold text-[#e5e971]">{publicFoldersCount}</span>
            </div>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-[#141616] border border-[#2d3030] flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-[#a855f7]" />
            <div className="text-[11px] font-mono">
              <span className="text-[#93927e]">Приватные: </span>
              <span className="font-bold text-[#d8b4fe]">{privateFoldersCount}</span>
            </div>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-[#141616] border border-[#2d3030] flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-[#3b82f6]" />
            <div className="text-[11px] font-mono">
              <span className="text-[#93927e]">В контейнерах: </span>
              <span className="font-bold text-[#93c5fd]">{foldersInContainersCount}</span>
            </div>
          </div>

          {/* New Folder Button */}
          <button
            type="button"
            onClick={() => {
              setCreateParentPath('');
              setCreateDefaultPrivacy('public');
              setIsCreateModalOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-lg bg-[#c9cd58] hover:bg-[#d8db6f] text-[#121414] font-mono font-bold text-xs flex items-center gap-2 transition-all shadow-glow-lemon shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.createFolder}</span>
          </button>
        </div>
      </header>

      {/* Main Split-Pane Explorer Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane: Folder Tree & Filters */}
        <aside className="w-80 border-r border-[#242828] bg-[#161818] flex flex-col shrink-0">
          {/* Filter & Search Bar */}
          <div className="p-3 border-b border-[#242828] space-y-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#93927e]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t.searchFolders}
                className="w-full bg-[#121414] border border-[#2d3030] focus:border-[#c9cd58] rounded pl-8 pr-3 py-1.5 text-xs font-mono text-[#e2e2e2] outline-none transition-colors"
              />
            </div>

            {/* Privacy Filter Tabs */}
            <div className="flex items-center gap-1 p-0.5 bg-[#121414] rounded border border-[#2d3030] text-[10px] font-mono">
              <button
                type="button"
                onClick={() => setPrivacyFilter('all')}
                className={`flex-1 py-1 rounded transition-colors text-center ${
                  privacyFilter === 'all' ? 'bg-[#242828] text-[#e2e2e2] font-bold' : 'text-[#93927e] hover:text-white'
                }`}
              >
                Все ({totalFoldersCount})
              </button>
              <button
                type="button"
                onClick={() => setPrivacyFilter('public')}
                className={`flex-1 py-1 rounded transition-colors text-center flex items-center justify-center gap-1 ${
                  privacyFilter === 'public' ? 'bg-[#c9cd58]/20 text-[#e5e971] font-bold' : 'text-[#93927e] hover:text-[#e5e971]'
                }`}
              >
                <Globe className="w-2.5 h-2.5" />
                <span>Публ ({publicFoldersCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setPrivacyFilter('private')}
                className={`flex-1 py-1 rounded transition-colors text-center flex items-center justify-center gap-1 ${
                  privacyFilter === 'private' ? 'bg-[#a855f7]/20 text-[#d8b4fe] font-bold' : 'text-[#93927e] hover:text-[#d8b4fe]'
                }`}
              >
                <Lock className="w-2.5 h-2.5" />
                <span>Прив ({privateFoldersCount})</span>
              </button>
            </div>
          </div>

          {/* Hierarchical Folder Tree List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#93927e] px-2 py-1 flex items-center justify-between">
              <span>{t.folderTreeTitle}</span>
              <span>{t.activeFoldersCount(folders.length)}</span>
            </div>

            {folderTree.length === 0 ? (
              <div className="p-6 text-center text-xs font-mono text-[#93927e]">
                Папки не найдены
              </div>
            ) : (
              folderTree.map((rootNode) => (
                <FolderTreeNodeItem
                  key={rootNode.id}
                  node={rootNode}
                  selectedId={selectedFolderId}
                  onSelect={setSelectedFolderId}
                  onAddSubfolder={handleAddSubfolder}
                  onTogglePrivacyRequest={handleTogglePrivacyRequest}
                  onDeleteRequest={deleteFolder}
                  expandedMap={expandedMap}
                  onToggleExpand={handleToggleExpand}
                  searchFilter={searchTerm}
                  privacyFilter={privacyFilter}
                />
              ))
            )}
          </div>
        </aside>

        {/* Right Pane: Selected Folder Inspector & Notes View */}
        <main className="flex-1 flex flex-col bg-[#121414] overflow-hidden">
          {selectedFolder ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Folder Details Banner */}
              <div className="p-5 border-b border-[#242828] bg-[#181a1a] space-y-4 shrink-0">
                <div className="flex items-start justify-between gap-4">
                  {/* Folder Icon, Path Breadcrumbs & Name */}
                  <div className="flex items-start gap-3.5">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl border shrink-0"
                      style={{
                        backgroundColor: `${selectedFolder.color || (selectedFolder.privacy === 'private' ? '#a855f7' : '#c9cd58')}20`,
                        borderColor: selectedFolder.color || (selectedFolder.privacy === 'private' ? '#a855f7' : '#c9cd58'),
                        color: selectedFolder.color || (selectedFolder.privacy === 'private' ? '#a855f7' : '#c9cd58'),
                      }}
                    >
                      {renderIconComponent(selectedFolder.icon, 'w-6 h-6')}
                    </div>

                    <div className="space-y-1">
                      {/* Path Breadcrumbs */}
                      <div className="flex items-center gap-1.5 text-xs font-mono text-[#93927e]">
                        <span>Vault</span>
                        <span>/</span>
                        {selectedFolder.path.split('/').map((segment, idx, arr) => (
                          <React.Fragment key={idx}>
                            <span className={idx === arr.length - 1 ? 'text-[#e5e971] font-bold' : ''}>
                              {segment}
                            </span>
                            {idx < arr.length - 1 && <span>/</span>}
                          </React.Fragment>
                        ))}
                      </div>

                      <h2 className="text-lg font-bold text-[#e2e2e2]">
                        {selectedFolder.name}
                      </h2>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2">
                    {/* Add Subfolder Button */}
                    <button
                      type="button"
                      onClick={() => handleAddSubfolder(selectedFolder.path, selectedFolder.privacy || 'public')}
                      className="px-3 py-1.5 rounded bg-[#242828] hover:bg-[#333535] text-[#e2e2e2] font-mono text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <FolderPlus className="w-3.5 h-3.5 text-[#c9cd58]" />
                      <span>{t.subfolders} +</span>
                    </button>

                    {/* Delete Folder Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(t.deleteFolderConfirm)) {
                          deleteFolder(selectedFolder.id);
                        }
                      }}
                      className="p-1.5 rounded bg-[#242828] hover:bg-[#ef4444]/20 text-[#93927e] hover:text-[#fca5a5] transition-colors"
                      title={t.deleteFolderTitle}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Privacy Rule & Obsidian Containment Banner */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {/* Privacy Status & Change CTA Card */}
                  <div className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${
                    selectedFolder.privacy === 'private'
                      ? 'bg-[#a855f7]/10 border-[#a855f7]/40 text-[#d8b4fe]'
                      : 'bg-[#c9cd58]/10 border-[#c9cd58]/40 text-[#e5e971]'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      {selectedFolder.privacy === 'private' ? (
                        <Lock className="w-5 h-5 text-[#a855f7] shrink-0" />
                      ) : (
                        <Globe className="w-5 h-5 text-[#c9cd58] shrink-0" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs uppercase">
                            {selectedFolder.privacy === 'private' ? t.folderPrivacyPrivate : t.folderPrivacyPublic}
                          </span>
                        </div>
                        <p className="text-[10px] opacity-85 leading-tight">
                          {selectedFolder.privacy === 'private' ? t.folderPrivacyPrivateDesc : t.folderPrivacyPublicDesc}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleTogglePrivacyRequest(
                          selectedFolder.id,
                          selectedFolder.privacy === 'private' ? 'public' : 'private'
                        )
                      }
                      className="px-2.5 py-1.5 rounded font-mono text-[11px] font-bold bg-[#141616] hover:bg-[#282a2a] text-[#e2e2e2] border border-[#383a3a] transition-all shrink-0 flex items-center gap-1.5"
                    >
                      <span>{t.changePrivacy}</span>
                    </button>
                  </div>

                  {/* Obsidian Containers Bound Card */}
                  <div className="p-3 rounded-lg bg-[#141616] border border-[#2d3030] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Layers className="w-5 h-5 text-[#3b82f6] shrink-0" />
                      <div>
                        <span className="font-mono text-xs text-[#e2e2e2] font-semibold block">
                          {t.observedInContainers} ({containerUsages.length})
                        </span>
                        <p className="text-[10px] font-mono text-[#93927e]">
                          {containerUsages.length > 0
                            ? containerUsages.map((u) => u.containerName).join(', ')
                            : 'Папка не привязана к контейнерам'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes Explorer Header & Filters */}
              <div className="px-5 py-3 border-b border-[#242828] bg-[#141616] flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#c9cd58]" />
                  <span className="font-mono font-bold text-xs text-[#e2e2e2]">
                    {t.folderNotesCount(notesInFolder.length)}
                  </span>
                </div>

                {/* Filter Controls */}
                <div className="flex items-center gap-2">
                  {/* Search within folder */}
                  <div className="relative">
                    <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-[#93927e]" />
                    <input
                      type="text"
                      value={noteSearch}
                      onChange={(e) => setNoteSearch(e.target.value)}
                      placeholder={t.searchNotesInFolder}
                      className="bg-[#121414] border border-[#2d3030] focus:border-[#c9cd58] rounded pl-7 pr-2 py-1 text-xs font-mono text-[#e2e2e2] outline-none w-48 transition-colors"
                    />
                  </div>

                  {/* Type Filter */}
                  <select
                    value={noteTypeFilter}
                    onChange={(e) => setNoteTypeFilter(e.target.value)}
                    className="bg-[#121414] border border-[#2d3030] text-[#c9c7b2] rounded px-2 py-1 text-xs font-mono outline-none"
                  >
                    <option value="all">Все типы</option>
                    <option value="SINGLE">Одиночные</option>
                    <option value="PERIOD">Периоды</option>
                    <option value="EVENT">События</option>
                    <option value="FILM_RELEASE">Релизы</option>
                  </select>
                </div>
              </div>

              {/* Notes Cards Grid / List */}
              <div className="flex-1 overflow-y-auto p-5">
                {notesInFolder.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-[#2d3030] rounded-xl">
                    <FileText className="w-10 h-10 text-[#444747] mb-2" />
                    <p className="font-mono text-sm text-[#e2e2e2] font-semibold">
                      {t.noNotesInFolder}
                    </p>
                    <p className="text-xs font-mono text-[#93927e] mt-1 max-w-sm">
                      Добавьте новые записи через кнопку "Новая запись" или синхронизируйте Obsidian Vault с этой папкой
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {notesInFolder.map((note) => (
                      <div
                        key={note.id}
                        onClick={() => setSelectedNote(note)}
                        className="p-3.5 rounded-xl bg-[#181a1a] border border-[#282a2a] hover:border-[#c9cd58]/60 cursor-pointer transition-all hover:shadow-lg flex flex-col justify-between gap-3 group"
                      >
                        <div className="space-y-2">
                          {/* Note Type & Feed */}
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="px-2 py-0.5 rounded bg-[#121414] text-[#c9cd58] border border-[#2d3030]">
                              {note.type}
                            </span>
                            {note.feed && (
                              <span className="text-[#93927e] truncate max-w-[120px]">
                                {note.feed.title}
                              </span>
                            )}
                          </div>

                          {/* Title */}
                          <h4 className="font-semibold text-xs text-[#e2e2e2] group-hover:text-[#e5e971] transition-colors line-clamp-2">
                            {note.title}
                          </h4>

                          {/* Description preview */}
                          {note.description && (
                            <p className="text-[11px] text-[#93927e] line-clamp-2 leading-relaxed">
                              {note.description.replace(/#|\*|`|>|\[|\]/g, '')}
                            </p>
                          )}
                        </div>

                        {/* Note Metadata Footer */}
                        <div className="pt-2 border-t border-[#242828] flex items-center justify-between text-[10px] font-mono text-[#93927e]">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-[#c9cd58]" />
                            <span>
                              {dayjs(note.startDate).format('DD MMM YYYY')}
                            </span>
                          </div>

                          {/* Taxonomy Tags or Hashtags */}
                          {note.tags && note.tags.length > 0 && (
                            <div className="flex items-center gap-1 text-[#3b82f6]">
                              <Tag className="w-2.5 h-2.5" />
                              <span className="truncate max-w-[90px]">{note.tags[0].name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <FolderTree className="w-16 h-16 text-[#333535] mb-4" />
              <h3 className="font-mono text-sm text-[#e2e2e2] font-bold">
                {t.selectFolder}
              </h3>
              <p className="text-xs font-mono text-[#93927e] mt-1 max-w-md">
                Используйте дерево слева для просмотра структуры, управления правилами приватности (Public/Private) и анализа заметок
              </p>
            </div>
          )}
        </main>
      </div>

      {/* 1. Create Folder Modal */}
      <CreateFolderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        parentPath={createParentPath}
        defaultPrivacy={createDefaultPrivacy}
      />

      {/* 2. Privacy Change Warning Modal */}
      <PrivacyChangeWarningModal
        isOpen={isWarningModalOpen}
        onClose={() => {
          setIsWarningModalOpen(false);
          setWarningImpact(null);
        }}
        folderImpact={warningImpact}
        onConfirm={handleConfirmPrivacyChange}
      />

      {/* 3. Note Detail Reader Modal */}
      <NoteDetailModal
        note={selectedNote}
        onClose={() => setSelectedNote(null)}
      />
    </div>
  );
};
