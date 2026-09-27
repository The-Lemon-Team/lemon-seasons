import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Popconfirm, message } from 'antd';
import {
  useNotes,
  useFeeds,
  useTaxonomyFlat,
  useHashtags,
  useFolders,
  useDeleteNote,
  useRestoreNote,
} from '../../api/queries';
import { NoteTypeBadge } from '../../components/NoteTypeBadge';
import { NoteTypeSelect } from '../../components/NoteTypeSelect';
import { HashtagBadge } from '../../components/HashtagBadge';
import { FolderExplorer } from '../../components/FolderExplorer';
import { NoteType } from '../../types';
import { useAdminI18n } from '../../i18n';

export const NotesListPage: React.FC = () => {
  const { t } = useAdminI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Query filters from URL params
  const feedId = searchParams.get('feedId') || undefined;
  const typeParam = (searchParams.get('type') as NoteType) || undefined;
  const tagPath = searchParams.get('tagPath') || undefined;
  const hashtagParam = searchParams.get('hashtag') || undefined;
  const folderParam = searchParams.get('folder') || undefined;
  const unfiledParam = searchParams.get('unfiled') === 'true';
  const search = searchParams.get('search') || '';
  const includeDeleted = searchParams.get('includeDeleted') === 'true';

  const [localSearch, setLocalSearch] = useState(search);
  const [limit] = useState(25);
  const [offset, setOffset] = useState(0);
  const [showFolderSidebar, setShowFolderSidebar] = useState(true);

  const { data: feeds = [] } = useFeeds();
  const { data: tags = [] } = useTaxonomyFlat();
  const { data: hashtags = [] } = useHashtags();
  const { data: folders = [] } = useFolders();

  const { data: notesData, isLoading } = useNotes({
    feedId,
    type: typeParam,
    tagPath,
    hashtag: hashtagParam,
    folder: folderParam,
    unfiled: unfiledParam || undefined,
    search: search || undefined,
    includeDeleted,
    limit,
    offset,
  });

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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleFilterChange('search', localSearch.trim() || undefined);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-sans font-bold text-2xl text-on-surface mb-1">
              {t.notesListPageTitle}
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
              Admin & Obsidian Sync
            </span>
          </div>
          <p className="text-on-surface-variant font-sans text-sm">
            {t.notesListPageSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Folder Explorer */}
          <button
            onClick={() => setShowFolderSidebar(!showFolderSidebar)}
            className={`px-3 py-2 rounded font-mono text-xs transition-all flex items-center gap-1.5 border ${
              showFolderSidebar
                ? 'bg-primary/20 text-primary border-primary/40 font-semibold'
                : 'bg-surface-container-high text-on-surface-variant border-white/10 hover:text-on-surface'
            }`}
            title="Toggle Folder Explorer"
          >
            <span className="material-symbols-outlined text-[17px]">
              {showFolderSidebar ? 'folder_open' : 'folder'}
            </span>
            <span>{showFolderSidebar ? 'Папки' : 'Папки'}</span>
          </button>

          <button
            onClick={() => navigate('/notes/new')}
            className="px-4 py-2 bg-primary text-on-primary hover:bg-primary-fixed-dim rounded font-semibold text-sm transition-all flex items-center gap-2 shadow"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            {t.newNoteBtn}
          </button>
        </div>
      </div>

      {/* Main Layout: Folder Explorer Sidebar + Notes Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Obsidian Folder Explorer Sidebar (Span 3 if visible) */}
        {showFolderSidebar && (
          <div className="lg:col-span-3 sticky top-4 h-[calc(100vh-160px)] min-h-[500px]">
            <FolderExplorer
              selectedFolder={folderParam}
              isUnfiledSelected={unfiledParam}
              onSelectFolder={handleSelectFolder}
              onSelectUnfiled={handleSelectUnfiled}
              totalNotesCount={allNotesStats?.total || 0}
              unfiledNotesCount={unfiledNotesStats?.total || 0}
              className="h-full shadow-sm"
            />
          </div>
        )}

        {/* Right: Notes List & Filters (Span 9 or 12) */}
        <div className={`${showFolderSidebar ? 'lg:col-span-9' : 'lg:col-span-12'} space-y-4`}>
          {/* Toolbar & Filters */}
          <div className="bg-surface-container-low p-4 rounded border border-white/5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[240px] max-w-md relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  placeholder={t.searchNotesPlaceholder}
                  className="w-full bg-surface-container border border-outline-variant/40 rounded pl-9 pr-3 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
                />
              </form>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Active Folder Filter Chip */}
                {folderParam && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/20 text-primary border border-primary/40 rounded-full font-mono text-xs shadow-xs">
                    <span className="material-symbols-outlined text-[13px]">folder</span>
                    <span className="font-semibold">{folderParam}</span>
                    <button
                      type="button"
                      onClick={() => handleFilterChange('folder', undefined)}
                      className="p-0.5 hover:bg-primary/30 rounded-full text-primary hover:text-error transition-colors"
                      title={t.reset}
                    >
                      <span className="material-symbols-outlined text-[12px] leading-none">close</span>
                    </button>
                  </div>
                )}

                {/* Active Unfiled Filter Chip */}
                {unfiledParam && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface-container-highest text-secondary border border-white/20 rounded-full font-mono text-xs shadow-xs">
                    <span className="material-symbols-outlined text-[13px]">draft</span>
                    <span>Unfiled (Root)</span>
                    <button
                      type="button"
                      onClick={() => handleFilterChange('unfiled', undefined)}
                      className="p-0.5 hover:bg-white/10 rounded-full text-on-surface-variant hover:text-white transition-colors"
                      title={t.reset}
                    >
                      <span className="material-symbols-outlined text-[12px] leading-none">close</span>
                    </button>
                  </div>
                )}

                {/* Active Hashtag Filter Chip */}
                {hashtagParam && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-cyan-950/60 text-cyan-300 border border-cyan-700/50 rounded-full font-mono text-xs shadow-xs">
                    <span className="text-cyan-500 font-bold">#</span>
                    <span>{hashtagParam}</span>
                    <button
                      type="button"
                      onClick={() => handleFilterChange('hashtag', undefined)}
                      className="p-0.5 hover:bg-cyan-800/60 rounded-full text-cyan-400 hover:text-white transition-colors"
                      title={t.reset}
                    >
                      <span className="material-symbols-outlined text-[12px] leading-none">close</span>
                    </button>
                  </div>
                )}

                <span className="px-2.5 py-1 bg-surface-container-highest rounded font-mono text-xs text-on-surface-variant border border-white/5">
                  {t.totalNotesCountBadge(total)}
                </span>
              </div>
            </div>

            {/* Filter Dropdowns Row */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
              {/* Feed Filter */}
              <select
                value={feedId || ''}
                onChange={(e) => handleFilterChange('feedId', e.target.value || undefined)}
                className="bg-surface-container border border-outline-variant/40 rounded px-2.5 py-1 text-xs text-on-surface font-sans focus:border-primary outline-none"
              >
                <option value="">{t.filterFeedPlaceholder}</option>
                {feeds.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.title}
                  </option>
                ))}
              </select>

              {/* Type Filter */}
              <div className="min-w-[140px]">
                <NoteTypeSelect
                  value={typeParam}
                  onChange={(val) => handleFilterChange('type', val || undefined)}
                  allowAll
                  allLabel={t.filterTypePlaceholder}
                  size="sm"
                />
              </div>

              {/* Folder Filter Dropdown */}
              <select
                value={folderParam || (unfiledParam ? '__unfiled__' : '')}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '__unfiled__') {
                    handleSelectUnfiled();
                  } else {
                    handleSelectFolder(val || undefined);
                  }
                }}
                className="bg-surface-container border border-primary/30 text-primary font-mono rounded px-2.5 py-1 text-xs focus:border-primary outline-none"
              >
                <option value="" className="text-on-surface">{t.filterFolderPlaceholder}</option>
                <option value="__unfiled__" className="text-on-surface">📥 Unfiled (Root)</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.path} className="text-on-surface">
                    📁 {f.path}
                  </option>
                ))}
              </select>

              {/* Taxonomy Filter */}
              <select
                value={tagPath || ''}
                onChange={(e) => handleFilterChange('tagPath', e.target.value || undefined)}
                className="bg-surface-container border border-outline-variant/40 rounded px-2.5 py-1 text-xs text-on-surface font-mono focus:border-primary outline-none"
              >
                <option value="">{t.taxonomy}</option>
                {tags.map((tagItem) => (
                  <option key={tagItem.id} value={tagItem.path}>
                    {tagItem.path}
                  </option>
                ))}
              </select>

              {/* Hashtag Filter */}
              <select
                value={hashtagParam || ''}
                onChange={(e) => handleFilterChange('hashtag', e.target.value || undefined)}
                className="bg-surface-container border border-cyan-800/40 text-cyan-300 rounded px-2.5 py-1 text-xs font-mono focus:border-cyan-400 outline-none"
              >
                <option value="" className="text-on-surface">{t.hashtagsPlaceholder}</option>
                {hashtags.map((h) => (
                  <option key={h.id} value={h.name} className="text-on-surface">
                    #{h.name} {h._count?.notes ? `(${h._count.notes})` : ''}
                  </option>
                ))}
              </select>

              {/* Include Deleted Checkbox */}
              <label className="ml-auto flex items-center gap-1.5 text-xs font-mono text-on-surface-variant cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeDeleted}
                  onChange={(e) => handleFilterChange('includeDeleted', e.target.checked ? 'true' : undefined)}
                  className="rounded bg-surface-container border-white/20 text-primary focus:ring-0"
                />
                {t.status}: Deleted
              </label>
            </div>
          </div>

          {/* Table / List Container */}
          <div className="bg-surface-container rounded border border-white/5 overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-[2.8fr_1.8fr_1.1fr_1.6fr_2fr_70px] gap-4 p-4 border-b border-white/5 bg-surface-container-high font-mono text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold">
              <div>{t.titleCol} & {t.feedCol}</div>
              <div>{t.folderCol}</div>
              <div>{t.typeCol}</div>
              <div>{t.datesCol}</div>
              <div>{t.tagsCol}</div>
              <div className="text-right">{t.actionsCol || t.actions}</div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-white/5">
              {items.map((note) => {
                const isDeleted = Boolean(note.deletedAt);
                const dateStr = new Date(note.startDate).toLocaleDateString();
                const endDateStr = note.endDate ? new Date(note.endDate).toLocaleDateString() : null;

                const hasImages = Boolean(note.images && note.images.length > 0);
                const mainImage = hasImages
                  ? note.images?.find((img) => img.isMain) || note.images?.[0]
                  : null;
                const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
                const thumbUrl = mainImage
                  ? mainImage.thumbnailUrl
                    ? mainImage.thumbnailUrl.startsWith('http')
                      ? mainImage.thumbnailUrl
                      : `${apiBase}${mainImage.thumbnailUrl}`
                    : mainImage.url.startsWith('http')
                    ? mainImage.url
                    : `${apiBase}${mainImage.url}`
                  : null;

                const hasTags = note.tags && note.tags.length > 0;
                const hasHashtags = note.hashtags && note.hashtags.length > 0;
                const noteFolders = note.folders || [];
                const primaryFolder = noteFolders.find((nf) => nf.isPrimary) || noteFolders[0];
                const secondaryFolders = noteFolders.filter((nf) => nf !== primaryFolder);

                return (
                  <div
                    key={note.id}
                    className={`group grid grid-cols-[2.8fr_1.8fr_1.1fr_1.6fr_2fr_70px] gap-4 p-4 items-center hover:bg-white/5 transition-colors ${
                      isDeleted ? 'opacity-50' : ''
                    }`}
                  >
                    {/* Title & Feed */}
                    <div className="flex items-center gap-3 min-w-0">
                      {thumbUrl && (
                        <div
                          onClick={() => navigate(`/notes/${note.id}`)}
                          className="relative w-11 h-11 flex-shrink-0 rounded-md overflow-hidden bg-black/40 border border-white/10 cursor-pointer group-hover:border-primary/50 transition-all shadow-sm"
                        >
                          <img
                            src={thumbUrl}
                            alt={mainImage?.alt || note.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          {note.images && note.images.length > 1 && (
                            <span className="absolute bottom-0 right-0 bg-black/80 text-[9px] font-mono text-white/90 px-1 rounded-tl">
                              +{note.images.length - 1}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div
                          onClick={() => navigate(`/notes/${note.id}`)}
                          className="font-sans font-semibold text-sm text-on-surface hover:text-primary transition-colors cursor-pointer truncate"
                        >
                          {note.title}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {note.feed && (
                            <span className="text-[11px] font-mono text-outline hover:text-on-surface-variant">
                              {note.feed.title}
                            </span>
                          )}
                          {note.sourceLink && (
                            <a
                              href={note.sourceLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-0.5 text-[11px] font-mono text-primary/80 hover:text-primary transition-colors"
                              title={`Source: ${note.sourceLink}`}
                            >
                              <span className="material-symbols-outlined text-[13px]">link</span>
                              source
                              {note.links && note.links.length > 1 && (
                                <span className="text-[10px] text-on-surface-variant font-mono">
                                  (+{note.links.length - 1})
                                </span>
                              )}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Vault Folders Column */}
                    <div className="min-w-0">
                      {primaryFolder?.folder ? (
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => handleSelectFolder(primaryFolder.folder!.path)}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono bg-primary/15 text-primary border border-primary/30 hover:border-primary hover:bg-primary/25 transition-all text-left max-w-full truncate cursor-pointer"
                            title={`Folder: ${primaryFolder.folder.path}`}
                          >
                            <span className="material-symbols-outlined text-[13px] text-primary">
                              folder
                            </span>
                            <span className="truncate font-semibold">{primaryFolder.folder.path}</span>
                          </button>

                          {/* Secondary Folders */}
                          {secondaryFolders.length > 0 && (
                            <div className="flex flex-wrap gap-1 items-center">
                              {secondaryFolders.map((sf) => (
                                <button
                                  key={sf.id}
                                  type="button"
                                  onClick={() => handleSelectFolder(sf.folder!.path)}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono bg-surface-container-highest text-on-surface-variant/80 border border-white/5 hover:border-white/20 hover:text-on-surface transition-all cursor-pointer"
                                  title={`Linked Folder: ${sf.folder?.path}`}
                                >
                                  <span className="material-symbols-outlined text-[11px]">
                                    link
                                  </span>
                                  <span className="truncate max-w-[120px]">{sf.folder?.path}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span
                          onClick={handleSelectUnfiled}
                          className="inline-flex items-center gap-1 text-[11px] font-mono text-outline/50 hover:text-secondary transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[13px]">draft</span>
                          Unfiled (Root)
                        </span>
                      )}
                    </div>

                    {/* Type */}
                    <div>
                      <NoteTypeBadge type={note.type} size="sm" />
                    </div>

                    {/* Date */}
                    <div className="font-mono text-xs text-on-surface-variant flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                      <span>{dateStr}{endDateStr ? ` - ${endDateStr}` : ''}</span>
                    </div>

                    {/* Taxonomy Tags & Hashtags */}
                    <div className="flex flex-wrap gap-1 items-center">
                      {hasTags &&
                        note.tags.map((tag) => (
                          <span
                            key={tag.id}
                            onClick={() => handleFilterChange('tagPath', tag.path)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-container-highest text-secondary rounded-full font-mono text-[11px] border border-white/5 hover:border-secondary/40 transition-colors cursor-pointer"
                            title={`Filter: ${tag.path}`}
                          >
                            <span className="material-symbols-outlined text-[12px] text-primary/80">
                              {tag.icon || 'label'}
                            </span>
                            <span>{tag.path}</span>
                          </span>
                        ))}

                      {hasHashtags &&
                        note.hashtags?.map((h) => (
                          <HashtagBadge
                            key={h.id}
                            name={h.name}
                            size="xs"
                            onClick={() => handleFilterChange('hashtag', h.name)}
                          />
                        ))}

                      {!hasTags && !hasHashtags && (
                        <span className="font-mono text-[11px] text-outline/50">—</span>
                      )}
                    </div>

                    {/* Hover Actions */}
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!isDeleted ? (
                        <>
                          <button
                            onClick={() => navigate(`/notes/${note.id}`)}
                            className="p-1 text-on-surface-variant hover:text-secondary transition-colors rounded hover:bg-white/5"
                            title={t.edit}
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <Popconfirm
                            title={t.confirmDeleteNote}
                            onConfirm={() => handleDelete(note.id)}
                            okText={t.delete}
                            cancelText={t.cancel}
                            okButtonProps={{ danger: true }}
                          >
                            <button
                              className="p-1 text-on-surface-variant hover:text-error transition-colors rounded hover:bg-white/5"
                              title={t.delete}
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </Popconfirm>
                        </>
                      ) : (
                        <button
                          onClick={() => handleRestore(note.id)}
                          className="p-1 text-tertiary hover:text-primary transition-colors rounded hover:bg-white/5"
                          title="Restore"
                        >
                          <span className="material-symbols-outlined text-[18px]">restore</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {items.length === 0 && !isLoading && (
              <div className="p-12 text-center text-on-surface-variant space-y-2">
                <span className="material-symbols-outlined text-4xl text-outline mb-2">description</span>
                <p className="font-sans text-sm">{t.noNotesFound}</p>
                {(folderParam || unfiledParam || hashtagParam || tagPath || feedId || search) && (
                  <button
                    type="button"
                    onClick={() => setSearchParams(new URLSearchParams())}
                    className="text-primary hover:underline text-xs font-mono"
                  >
                    {t.reset}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {total > limit && (
            <div className="flex justify-between items-center text-xs font-mono text-on-surface-variant pt-2">
              <span>
                {offset + 1} - {Math.min(offset + limit, total)} / {total}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  className="px-3 py-1 bg-surface-container border border-outline-variant rounded hover:border-primary disabled:opacity-30 cursor-pointer"
                >
                  ←
                </button>
                <button
                  onClick={() => setOffset(offset + limit)}
                  disabled={offset + limit >= total}
                  className="px-3 py-1 bg-surface-container border border-outline-variant rounded hover:border-primary disabled:opacity-30 cursor-pointer"
                >
                  →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

