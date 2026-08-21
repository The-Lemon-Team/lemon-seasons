import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Popconfirm, message } from 'antd';
import {
  useNotes,
  useFeeds,
  useTaxonomyFlat,
  useDeleteNote,
  useRestoreNote,
} from '../../api/queries';
import { NoteTypeBadge } from '../../components/NoteTypeBadge';
import { NoteType } from '../../types';

export const NotesListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Query filters from URL params
  const feedId = searchParams.get('feedId') || undefined;
  const typeParam = (searchParams.get('type') as NoteType) || undefined;
  const tagPath = searchParams.get('tagPath') || undefined;
  const search = searchParams.get('search') || '';
  const includeDeleted = searchParams.get('includeDeleted') === 'true';

  const [localSearch, setLocalSearch] = useState(search);
  const [limit] = useState(25);
  const [offset, setOffset] = useState(0);

  const { data: feeds = [] } = useFeeds();
  const { data: tags = [] } = useTaxonomyFlat();

  const { data: notesData, isLoading } = useNotes({
    feedId,
    type: typeParam,
    tagPath,
    search: search || undefined,
    includeDeleted,
    limit,
    offset,
  });

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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleFilterChange('search', localSearch.trim() || undefined);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNoteMutation.mutateAsync(id);
      message.success('Note soft-deleted successfully');
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to delete note');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restoreNoteMutation.mutateAsync(id);
      message.success('Note restored successfully');
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to restore note');
    }
  };

  const items = notesData?.items || [];
  const total = notesData?.total || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-sans font-bold text-2xl text-on-surface mb-1">
            All Notes
          </h1>
          <p className="text-on-surface-variant font-sans text-sm">
            Manage and filter your entire library of chronological records and markdown content.
          </p>
        </div>

        <button
          onClick={() => navigate('/notes/new')}
          className="px-4 py-2 bg-primary text-on-primary hover:bg-primary-fixed-dim rounded font-semibold text-sm transition-all flex items-center gap-2 shadow"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Note
        </button>
      </div>

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
              placeholder="Filter by title, markdown, feed..."
              className="w-full bg-surface-container border border-outline-variant/40 rounded pl-9 pr-3 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
            />
          </form>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-surface-container-highest rounded font-mono text-xs text-on-surface-variant border border-white/5">
              {total} {total === 1 ? 'total note' : 'total notes'}
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
            <option value="">All Feeds</option>
            {feeds.map((f) => (
              <option key={f.id} value={f.id}>
                Feed: {f.title}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={typeParam || ''}
            onChange={(e) => handleFilterChange('type', e.target.value || undefined)}
            className="bg-surface-container border border-outline-variant/40 rounded px-2.5 py-1 text-xs text-on-surface font-mono focus:border-primary outline-none"
          >
            <option value="">All Types</option>
            <option value="SINGLE">SINGLE</option>
            <option value="PERIOD">PERIOD</option>
            <option value="EVENT">EVENT</option>
            <option value="FILM_RELEASE">FILM RELEASE</option>
            <option value="MENTION">MENTION</option>
            <option value="DONE">DONE</option>
          </select>

          {/* Taxonomy Filter */}
          <select
            value={tagPath || ''}
            onChange={(e) => handleFilterChange('tagPath', e.target.value || undefined)}
            className="bg-surface-container border border-outline-variant/40 rounded px-2.5 py-1 text-xs text-on-surface font-mono focus:border-primary outline-none"
          >
            <option value="">All Taxonomy Tags</option>
            {tags.map((t) => (
              <option key={t.id} value={t.path}>
                Tag: {t.path}
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
            Include Deleted
          </label>
        </div>
      </div>

      {/* Table / List Container */}
      <div className="bg-surface-container rounded border border-white/5 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[3fr_1.2fr_1.8fr_2fr_1fr_80px] gap-4 p-4 border-b border-white/5 bg-surface-container-high font-mono text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold">
          <div>Title & Feed</div>
          <div>Type</div>
          <div>Date Range / Start</div>
          <div>Taxonomy Paths</div>
          <div>Status</div>
          <div className="text-right">Actions</div>
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

            return (
              <div
                key={note.id}
                className={`group grid grid-cols-[3fr_1.2fr_1.8fr_2fr_1fr_80px] gap-4 p-4 items-center hover:bg-white/5 transition-colors ${
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
                    {note.feed && (
                      <span className="text-[11px] font-mono text-outline hover:text-on-surface-variant">
                        feed: {note.feed.title}
                      </span>
                    )}
                  </div>
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

                {/* Taxonomy Tags */}
                <div className="flex flex-wrap gap-1">
                  {note.tags && note.tags.length > 0 ? (
                    note.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="px-2 py-0.5 bg-surface-container-highest text-secondary rounded-full font-mono text-[11px] border border-white/5 hover:border-secondary/40 transition-colors"
                      >
                        {tag.path}
                      </span>
                    ))
                  ) : (
                    <span className="font-mono text-[11px] text-outline/50">no tags</span>
                  )}
                </div>

                {/* Status */}
                <div>
                  {!isDeleted ? (
                    <span className="inline-flex items-center gap-1.5 text-primary font-mono text-xs">
                      <span className="w-2 h-2 rounded-full bg-primary" /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-error font-mono text-xs">
                      <span className="w-2 h-2 rounded-full bg-error" /> Deleted
                    </span>
                  )}
                </div>

                {/* Hover Actions */}
                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!isDeleted ? (
                    <>
                      <button
                        onClick={() => navigate(`/notes/${note.id}`)}
                        className="p-1 text-on-surface-variant hover:text-secondary transition-colors rounded hover:bg-white/5"
                        title="Edit Note"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <Popconfirm
                        title="Soft-delete this note?"
                        description="This note will be marked as deleted."
                        onConfirm={() => handleDelete(note.id)}
                        okText="Delete"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true }}
                      >
                        <button
                          className="p-1 text-on-surface-variant hover:text-error transition-colors rounded hover:bg-white/5"
                          title="Delete Note"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </Popconfirm>
                    </>
                  ) : (
                    <button
                      onClick={() => handleRestore(note.id)}
                      className="p-1 text-tertiary hover:text-primary transition-colors rounded hover:bg-white/5"
                      title="Restore Note"
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
          <div className="p-12 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl text-outline mb-2">description</span>
            <p className="font-sans text-sm">No notes found matching current filters.</p>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {total > limit && (
        <div className="flex justify-between items-center text-xs font-mono text-on-surface-variant">
          <span>
            Showing {offset + 1} to {Math.min(offset + limit, total)} of {total}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="px-3 py-1 bg-surface-container border border-outline-variant rounded hover:border-primary disabled:opacity-30"
            >
              Previous
            </button>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
              className="px-3 py-1 bg-surface-container border border-outline-variant rounded hover:border-primary disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
