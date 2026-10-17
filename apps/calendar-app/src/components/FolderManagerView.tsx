import React, { useState, useMemo } from 'react';
import { useFoldersContext } from '../context/FoldersContext';
import { useI18n } from '../i18n';
import { Note, FolderPrivacy } from '@lenta/shared';
import { CreateFolderModal } from './CreateFolderModal';
import { NoteDetailModal } from './NoteDetailModal';
import { CreateNoteModal } from './CreateNoteModal';
import { FolderStatsHeader } from './folders/FolderStatsHeader';
import { FolderTreeNodeItem } from './folders/FolderTreeNodeItem';
import { FolderInspectorHeader } from './folders/FolderInspectorHeader';
import { FolderNotesGrid } from './folders/FolderNotesGrid';
import { Search, Globe, Lock, FolderTree } from 'lucide-react';

export const FolderManagerView: React.FC = () => {
  const { t } = useI18n();
  const {
    folders,
    folderTree,
    selectedFolderId,
    selectedFolder,
    setSelectedFolderId,
    deleteFolder,
    executePrivacyChange,
    getNotesForFolder,
  } = useFoldersContext();

  const [searchTerm, setSearchTerm] = useState('');
  const [privacyFilter, setPrivacyFilter] = useState<'all' | 'public' | 'private'>('all');
  const [noteTypeFilter, setNoteTypeFilter] = useState<string>('all');
  const [noteSearch, setNoteSearch] = useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createParentPath, setCreateParentPath] = useState('');
  const [createDefaultPrivacy, setCreateDefaultPrivacy] = useState<FolderPrivacy>('public');
  const [isCreateNoteModalOpen, setIsCreateNoteModalOpen] = useState(false);
  const [createNoteFolderPath, setCreateNoteFolderPath] = useState('');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  // Tree expansion state
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});

  const handleToggleExpand = (path: string) => {
    setExpandedMap((prev) => ({
      ...prev,
      [path]: prev[path] === undefined ? false : !prev[path],
    }));
  };

  const totalFoldersCount = folders.length;
  const publicFoldersCount = folders.filter((f) => f.privacy === 'public').length;
  const privateFoldersCount = folders.filter((f) => f.privacy === 'private').length;

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

  const handleAddSubfolder = (parentPath: string, privacy: FolderPrivacy) => {
    setCreateParentPath(parentPath);
    setCreateDefaultPrivacy(privacy);
    setIsCreateModalOpen(true);
  };

  const handleOpenCreateNote = (folderPath?: string) => {
    setCreateNoteFolderPath(folderPath || selectedFolder?.path || '');
    setIsCreateNoteModalOpen(true);
  };

  return (
    <div className="flex flex-col h-full bg-[#121414] overflow-hidden">
      {/* 1. Top Header Banner with Stats */}
      <FolderStatsHeader
        totalFoldersCount={totalFoldersCount}
        publicFoldersCount={publicFoldersCount}
        privateFoldersCount={privateFoldersCount}
        onCreateFolder={() => {
          setCreateParentPath('');
          setCreateDefaultPrivacy('public');
          setIsCreateModalOpen(true);
        }}
      />

      {/* 2. Main Two-Column Canvas */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Column: Folders Navigation & Search */}
        <aside className="w-80 border-r border-[#242828] bg-[#161818] flex flex-col shrink-0">
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
                className={`flex-1 py-1 rounded transition-colors text-center cursor-pointer ${
                  privacyFilter === 'all' ? 'bg-[#242828] text-[#e2e2e2] font-bold' : 'text-[#93927e] hover:text-white'
                }`}
              >
                Все
              </button>
              <button
                type="button"
                onClick={() => setPrivacyFilter('public')}
                className={`flex-1 py-1 rounded transition-colors text-center flex items-center justify-center gap-1 cursor-pointer ${
                  privacyFilter === 'public' ? 'bg-[#c9cd58]/20 text-[#e5e971] font-bold' : 'text-[#93927e] hover:text-[#e5e971]'
                }`}
              >
                <Globe className="w-2.5 h-2.5" />
                <span>Публ ({publicFoldersCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setPrivacyFilter('private')}
                className={`flex-1 py-1 rounded transition-colors text-center flex items-center justify-center gap-1 cursor-pointer ${
                  privacyFilter === 'private' ? 'bg-[#a855f7]/20 text-[#d8b4fe] font-bold' : 'text-[#93927e] hover:text-[#d8b4fe]'
                }`}
              >
                <Lock className="w-2.5 h-2.5" />
                <span>Прив ({privateFoldersCount})</span>
              </button>
            </div>
          </div>

          {/* Folder Tree */}
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#93927e] px-2 py-1 flex items-center justify-between">
              <span>{t.folderTreeTitle}</span>
              <span>{folders.length} папок</span>
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
                  onAddNote={handleOpenCreateNote}
                  onTogglePrivacyRequest={executePrivacyChange}
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

        {/* Right Column: Selected Folder Detail & Notes Explorer */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#121414]">
          {selectedFolder ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <FolderInspectorHeader
                folder={selectedFolder}
                onCreateNote={() => handleOpenCreateNote(selectedFolder.path)}
                onAddSubfolder={handleAddSubfolder}
                onTogglePrivacy={executePrivacyChange}
                onDeleteFolder={deleteFolder}
              />
              <FolderNotesGrid
                notes={notesInFolder}
                onSelectNote={setSelectedNote}
                searchTerm={noteSearch}
                onSearchChange={setNoteSearch}
                typeFilter={noteTypeFilter}
                onTypeFilterChange={setNoteTypeFilter}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <FolderTree className="w-16 h-16 text-[#333535] mb-4" />
              <h3 className="font-mono text-sm text-[#e2e2e2] font-bold">
                {t.selectFolder}
              </h3>
              <p className="text-xs font-mono text-[#93927e] mt-1 max-w-md">
                Используйте дерево слева для просмотра структуры папок, управления правилами приватности (Public/Private) и работы с заметками
              </p>
            </div>
          )}
        </main>
      </div>

      {/* 3. Modals */}
      <CreateFolderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        parentPath={createParentPath}
        defaultPrivacy={createDefaultPrivacy}
      />

      <NoteDetailModal
        note={selectedNote}
        onClose={() => setSelectedNote(null)}
      />

      <CreateNoteModal
        isOpen={isCreateNoteModalOpen}
        onClose={() => {
          setIsCreateNoteModalOpen(false);
          setCreateNoteFolderPath('');
        }}
        initialFolderPath={createNoteFolderPath || selectedFolder?.path}
      />
    </div>
  );
};
