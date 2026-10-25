import React, { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { message } from 'antd';
import {
  useNotes,
  useFeeds,
  useHashtags,
  useFolders,
  useDeleteNote,
  useRestoreNote,
} from '../../api/queries';
import { FolderExplorer } from '../../components/FolderExplorer';
import { NoteDetailModal } from '../../components/NoteDetailModal';
import { EditNoteModal } from '../../components/EditNoteModal';
import { PublishToStagingModal } from '../../components/PublishToStagingModal';
import { CreateNoteModal } from '../../components/CreateNoteModal';
import { NotesTableWithFilters } from './components/NotesTableWithFilters';
import { NoteType } from '../../types';
import { useAdminI18n } from '../../i18n';

export const NotesListPage: React.FC = () => {
  const { t } = useAdminI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Selected note for modal preview
  const [viewingNoteId, setViewingNoteId] = useState<string | null>(null);
  // Selected note for quick modal edit
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [publishingNoteId, setPublishingNoteId] = useState<string | null>(null);
  // Modal for creating a new note
  const [createNoteModalOpen, setCreateNoteModalOpen] = useState(false);
  const [createNoteFolder, setCreateNoteFolder] = useState<string | undefined>(undefined);

  // Query filters from URL params
  const feedId = searchParams.get('feedId') || undefined;
  const typeParam = (searchParams.get('type') as NoteType) || undefined;
  const hashtagParam = searchParams.get('hashtag') || undefined;
  const folderParam = searchParams.get('folder') || undefined;
  const unfiledParam = searchParams.get('unfiled') === 'true';
  const curatorParam = searchParams.get('curator') || undefined;
  const search = searchParams.get('search') || '';
  const includeDeleted = searchParams.get('includeDeleted') === 'true';
  const sortBy = (searchParams.get('sortBy') as 'startDate' | 'type' | 'folder' | 'title') || undefined;
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || undefined;
  const privacyMode = searchParams.get('privacyMode') || undefined;
  const resolvedPrivacy =
    privacyMode === 'private' ? 'private' : privacyMode === 'staging' || privacyMode === 'published' ? 'public' : undefined;
  const resolvedStatus =
    privacyMode === 'staging' ? 'DRAFT' : privacyMode === 'published' ? 'PUBLISHED' : undefined;

  const [limit] = useState(25);
  const [offset, setOffset] = useState(0);
  const [showFolderSidebar, setShowFolderSidebar] = useState(true);

  const { data: feeds = [] } = useFeeds();
  const { data: hashtags = [] } = useHashtags();
  const { data: folders = [] } = useFolders();

  const { data: notesData, isLoading } = useNotes({
    feedId,
    type: typeParam,
    hashtag: hashtagParam,
    folder: folderParam,
    unfiled: unfiledParam || undefined,
    curator: curatorParam,
    search: search || undefined,
    includeDeleted,
    sortBy,
    sortOrder,
    privacy: resolvedPrivacy,
    status: resolvedStatus,
    limit,
    offset,
  });

  const handleSortChange = (
    newSortBy?: 'startDate' | 'type' | 'folder' | 'title',
    newSortOrder?: 'asc' | 'desc'
  ) => {
    const next = new URLSearchParams(searchParams);
    if (newSortBy && newSortOrder) {
      next.set('sortBy', newSortBy);
      next.set('sortOrder', newSortOrder);
    } else {
      next.delete('sortBy');
      next.delete('sortOrder');
    }
    setSearchParams(next);
    setOffset(0);
  };

  // Query total count and unfiled count for explorer
  const { data: allNotesStats } = useNotes({ limit: 1 });
  const { data: unfiledNotesStats } = useNotes({ unfiled: true, limit: 1 });

  const deleteNoteMutation = useDeleteNote();
  const restoreNoteMutation = useRestoreNote();

  const handleFilterChange = (key: string, value?: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
    setOffset(0);
  };

  const handleSelectFolder = (folderPath?: string) => {
    const next = new URLSearchParams(searchParams);
    next.delete('unfiled');
    if (folderPath) {
      next.set('folder', folderPath);
    } else {
      next.delete('folder');
    }
    setSearchParams(next);
    setOffset(0);
  };

  const handleSelectUnfiled = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('folder');
    next.set('unfiled', 'true');
    setSearchParams(next);
    setOffset(0);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNoteMutation.mutateAsync(id);
      message.success(t.noteDeletedSuccess);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restoreNoteMutation.mutateAsync(id);
      message.success(t.noteSavedSuccess);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error');
    }
  };

  const items = notesData?.items || [];
  const total = notesData?.total || 0;

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full space-y-2.5">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between gap-3 h-8">
        <div className="flex items-center gap-2.5 min-w-0">
          <h1 className="font-sans font-bold text-base text-on-surface truncate">
            {t.notesListPageTitle}
          </h1>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 hidden sm:inline-block shrink-0">
            Obsidian Sync
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Toggle Folder Explorer */}
          <button
            onClick={() => setShowFolderSidebar(!showFolderSidebar)}
            className={`h-7 px-2.5 rounded-lg font-mono text-[11px] transition-all flex items-center gap-1.5 border cursor-pointer ${
              showFolderSidebar
                ? 'bg-primary text-on-primary border-primary font-semibold shadow-xs'
                : 'bg-control text-on-surface-variant border-control-border hover:text-on-surface hover:bg-tile-subtle'
            }`}
            title="Toggle Folder Explorer"
          >
            <span className="material-symbols-outlined text-[15px]">
              {showFolderSidebar ? 'folder_open' : 'folder'}
            </span>
            <span>Папки</span>
          </button>

          <button
            onClick={() => {
              setCreateNoteFolder(folderParam || undefined);
              setCreateNoteModalOpen(true);
            }}
            className="h-7 px-3 bg-primary text-on-primary hover:bg-primary-fixed rounded-lg font-semibold text-xs transition-all flex items-center gap-1.5 shadow cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>{t.newNoteBtn}</span>
          </button>
        </div>
      </div>

      {/* Main Layout: Synchronized Dual Scroll Containers */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
        {/* Left: Obsidian Folder Explorer Sidebar (Span 3 if visible) */}
        {showFolderSidebar && (
          <div className="lg:col-span-3 h-[420px] lg:h-full min-h-0">
            <FolderExplorer
              selectedFolder={folderParam}
              isUnfiledSelected={unfiledParam}
              onSelectFolder={handleSelectFolder}
              onSelectUnfiled={handleSelectUnfiled}
              onCreateNote={(folderPath) => {
                setCreateNoteFolder(folderPath);
                setCreateNoteModalOpen(true);
              }}
              totalNotesCount={allNotesStats?.total || 0}
              unfiledNotesCount={unfiledNotesStats?.total || 0}
              className="h-full shadow-sm"
            />
          </div>
        )}

        {/* Right: Unified Notes Table With Filters (Span 9 or 12) */}
        <div className={`${showFolderSidebar ? 'lg:col-span-9' : 'lg:col-span-12'} h-[650px] lg:h-full min-w-0 min-h-0`}>
          <NotesTableWithFilters
            notes={items}
            total={total}
            limit={limit}
            offset={offset}
            isLoading={isLoading}
            search={search}
            feedId={feedId}
            type={typeParam}
            folder={folderParam}
            unfiled={unfiledParam}
            curator={curatorParam}
            hashtag={hashtagParam}
            includeDeleted={includeDeleted}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={handleSortChange}
            feeds={feeds}
            folders={folders}
            hashtags={hashtags}
            onFilterChange={handleFilterChange}
            onSelectFolder={handleSelectFolder}
            onSelectUnfiled={handleSelectUnfiled}
            onResetFilters={() => setSearchParams(new URLSearchParams())}
            onViewNote={setViewingNoteId}
            onEditNote={setEditingNoteId}
            onPublishStaging={setPublishingNoteId}
            privacyFilter={privacyMode}
            onDeleteNote={handleDelete}
            onRestoreNote={handleRestore}
            onPageChange={setOffset}
            className="h-full shadow-sm"
          />
        </div>
      </div>

      {/* Quick View / Detail Modal */}
      <NoteDetailModal
        noteId={viewingNoteId}
        open={Boolean(viewingNoteId)}
        onClose={() => setViewingNoteId(null)}
        onEdit={(id) => navigate(`/notes/${id}`)}
        onSelectFolder={(folderPath) => handleSelectFolder(folderPath)}
        onSelectHashtag={(name) => handleFilterChange('hashtag', name)}
      />

      {/* Quick Edit Modal */}
      <EditNoteModal
        noteId={editingNoteId}
        open={Boolean(editingNoteId)}
        onClose={() => setEditingNoteId(null)}
        onOpenFullPage={(id) => navigate(`/notes/${id}`)}
      />

      {/* Publish to Staging / Public Modal */}
      <PublishToStagingModal
        noteId={publishingNoteId}
        open={Boolean(publishingNoteId)}
        onClose={() => setPublishingNoteId(null)}
      />

      {/* Create Note Modal */}
      <CreateNoteModal
        open={createNoteModalOpen}
        initialFolderPath={createNoteFolder}
        onClose={() => setCreateNoteModalOpen(false)}
        onOpenFullPage={(folder) => {
          setCreateNoteModalOpen(false);
          navigate(
            folder
              ? `/notes/new?folder=${encodeURIComponent(folder)}`
              : '/notes/new',
          );
        }}
      />
    </div>
  );
};
