import React, { useState, useEffect } from 'react';
import { Note, NoteType, Feed, Folder } from '../../../types';
import { NoteTypeSelect } from '../../../components/NoteTypeSelect';
import { AppSelect } from '../../../components/common/AppSelect';
import { NoteTableRow } from './NoteTableRow';
import { useAdminI18n } from '../../../i18n';
import { X, ChevronDown, Rss, Folder as FolderIcon, Hash } from 'lucide-react';

export interface NotesTableWithFiltersProps {
  notes: Note[];
  total: number;
  limit: number;
  offset: number;
  isLoading?: boolean;
  search: string;
  feedId?: string;
  type?: NoteType;
  folder?: string;
  unfiled?: boolean;
  curator?: string;
  hashtag?: string;
  includeDeleted?: boolean;
  feeds: Feed[];
  folders: Folder[];
  hashtags: Array<{ id: string; name: string; _count?: { notes?: number } }>;
  availableCurators?: string[];
  sortBy?: 'startDate' | 'type' | 'folder' | 'title';
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (sortBy?: 'startDate' | 'type' | 'folder' | 'title', sortOrder?: 'asc' | 'desc') => void;
  onFilterChange: (key: string, value?: string) => void;
  onSelectFolder: (folderPath?: string) => void;
  onSelectUnfiled: () => void;
  onResetFilters: () => void;
  onViewNote: (id: string) => void;
  onEditNote: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onRestoreNote: (id: string) => void;
  onPageChange: (newOffset: number) => void;
  className?: string;
}

export const NotesTableWithFilters: React.FC<NotesTableWithFiltersProps> = ({
  notes,
  total,
  limit,
  offset,
  isLoading = false,
  search,
  feedId,
  type,
  folder,
  unfiled,
  curator,
  hashtag,
  includeDeleted,
  sortBy,
  sortOrder,
  onSortChange,
  feeds,
  folders,
  hashtags,
  onFilterChange,
  onSelectFolder,
  onSelectUnfiled,
  onResetFilters,
  onViewNote,
  onEditNote,
  onDeleteNote,
  onRestoreNote,
  onPageChange,
  className = '',
}) => {
  const { t } = useAdminI18n();
  const [localSearch, setLocalSearch] = useState(search);

  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange('search', localSearch.trim() || undefined);
  };

  const handleClearSearch = () => {
    setLocalSearch('');
    onFilterChange('search', undefined);
  };

  const hasAnyFilter = Boolean(
    folder || unfiled || hashtag || feedId || type || curator || search || includeDeleted || sortBy
  );

  const handleSortClick = (field: 'startDate' | 'type' | 'folder' | 'title') => {
    if (!onSortChange) return;

    if (sortBy === field) {
      const firstDir = field === 'startDate' ? 'desc' : 'asc';
      const secondDir = field === 'startDate' ? 'asc' : 'desc';

      if (sortOrder === firstDir) {
        onSortChange(field, secondDir);
      } else {
        onSortChange(undefined, undefined);
      }
    } else {
      const firstDir = field === 'startDate' ? 'desc' : 'asc';
      onSortChange(field, firstDir);
    }
  };

  const renderSortableHeader = (
    field: 'startDate' | 'type' | 'folder' | 'title',
    label: React.ReactNode,
    className = ''
  ) => {
    const isActive = sortBy === field;
    return (
      <div className={`flex items-center min-w-0 ${className}`}>
        <button
          type="button"
          onClick={() => handleSortClick(field)}
          className={`group/col inline-flex items-center gap-1 cursor-pointer transition-colors text-left uppercase tracking-wider font-semibold font-mono text-[10px] select-none hover:text-on-surface ${
            isActive ? 'text-primary font-bold' : 'text-on-surface-variant'
          }`}
          title={
            isActive
              ? `${label}: ${sortOrder === 'asc' ? '↑ (A-Z)' : '↓ (Z-A)'}`
              : `Sort by ${label}`
          }
        >
          <span className="truncate">{label}</span>
          <span
            className={`material-symbols-outlined text-[13px] leading-none transition-all flex-shrink-0 ${
              isActive
                ? 'text-primary opacity-100 scale-100'
                : 'text-outline/40 opacity-0 group-hover/col:opacity-100'
            }`}
          >
            {isActive
              ? sortOrder === 'asc'
                ? 'arrow_upward'
                : 'arrow_downward'
              : 'unfold_more'}
          </span>
        </button>
      </div>
    );
  };

  return (
    <div
      className={`platform-tile flex flex-col h-full overflow-hidden ${className}`}
    >
      {/* Top Header: Toolbar & Filters (Pinned) */}
      <div className="p-2.5 space-y-2 bg-tile border-b border-tile-border flex-shrink-0">
        {/* Row 1: Search Form + Active Filter Chips + Total Count */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[200px] max-w-sm relative">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-[16px] pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder={t.searchNotesPlaceholder}
              className="w-full h-7 bg-control border border-control-border rounded-lg pl-7 pr-7 text-[11px] font-mono text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary/60 outline-none transition-all"
            />
            {localSearch && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-tile-subtle transition-colors cursor-pointer"
                title={t.reset}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </form>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Active Folder Filter Chip */}
            {folder && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/20 text-primary border border-primary/40 rounded-full font-mono text-[11px] shadow-xs">
                <span className="material-symbols-outlined text-[12px] leading-none shrink-0">folder</span>
                <span className="font-semibold leading-none truncate max-w-[200px]" title={folder}>
                  {folder}
                </span>
                <button
                  type="button"
                  onClick={() => onFilterChange('folder', undefined)}
                  className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-primary/80 hover:text-error hover:bg-primary/30 transition-colors cursor-pointer shrink-0 -mr-0.5"
                  title={t.reset}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            )}

            {/* Active Unfiled Filter Chip */}
            {unfiled && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-tile-subtle text-secondary border border-tile-border rounded-full font-mono text-[11px] shadow-xs">
                <span className="material-symbols-outlined text-[12px] leading-none shrink-0">draft</span>
                <span className="leading-none">Unfiled (Root)</span>
                <button
                  type="button"
                  onClick={() => onFilterChange('unfiled', undefined)}
                  className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-tile-muted transition-colors cursor-pointer shrink-0 -mr-0.5"
                  title={t.reset}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            )}

            {/* Active Hashtag Filter Chip */}
            {hashtag && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-950/60 text-cyan-300 border border-cyan-700/50 rounded-full font-mono text-[11px] shadow-xs">
                <span className="text-cyan-500 font-bold leading-none shrink-0">#</span>
                <span className="leading-none truncate max-w-[200px]" title={hashtag}>
                  {hashtag}
                </span>
                <button
                  type="button"
                  onClick={() => onFilterChange('hashtag', undefined)}
                  className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-cyan-400 hover:text-white hover:bg-cyan-800/60 transition-colors cursor-pointer shrink-0 -mr-0.5"
                  title={t.reset}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            )}

            {/* Active Curator Filter Chip */}
            {curator && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-950/60 text-sky-300 border border-sky-600/50 rounded-full font-mono text-[11px] shadow-xs">
                <span className="text-[11px] leading-none shrink-0">👤</span>
                <span className="leading-none truncate max-w-[200px]" title={curator}>
                  {curator}
                </span>
                <button
                  type="button"
                  onClick={() => onFilterChange('curator', undefined)}
                  className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-sky-300 hover:text-white hover:bg-sky-800/60 transition-colors cursor-pointer shrink-0 -mr-0.5"
                  title={t.reset}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            )}

            {/* Active Sort Chip */}
            {sortBy && (
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-primary/20 text-primary border border-primary/40 rounded-full font-mono text-[11px] shadow-xs">
                <span className="material-symbols-outlined text-[13px] leading-none">
                  {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                </span>
                <span className="leading-none">
                  {sortBy === 'startDate'
                    ? t.datesCol
                    : sortBy === 'title'
                    ? t.titleCol
                    : sortBy === 'type'
                    ? t.typeCol
                    : t.folderCol}
                  : {sortOrder === 'asc' ? '↑ (A-Z)' : '↓ (Z-A)'}
                </span>
                <button
                  type="button"
                  onClick={() => onSortChange?.(undefined, undefined)}
                  className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-primary hover:text-white hover:bg-primary/40 transition-colors cursor-pointer shrink-0 -mr-0.5"
                  title={t.reset}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            )}

            {/* Reset All Filters Button */}
            {hasAnyFilter && (
              <button
                type="button"
                onClick={onResetFilters}
                className="px-2 py-1 text-xs font-mono text-outline hover:text-primary transition-colors cursor-pointer"
                title={t.reset}
              >
                {t.reset}
              </button>
            )}

            {/* Total Count Badge */}
            <span className="px-2 py-0.5 bg-tile-subtle rounded font-mono text-[11px] text-on-surface-variant border border-tile-border">
              {t.totalNotesCountBadge(total)}
            </span>
          </div>
        </div>

        {/* Row 2: Unified Filter Dropdowns Row */}
        <div className="flex flex-wrap items-center gap-2 pt-1.5 border-t border-tile-border">
          {/* Feed Filter */}
          <div className="w-36 sm:w-40">
            <AppSelect
              value={feedId || ''}
              onChange={(val) => onFilterChange('feedId', val || undefined)}
              options={[
                { value: '', label: t.filterFeedPlaceholder, icon: <Rss className="w-3.5 h-3.5 text-on-surface-variant/60" /> },
                ...feeds.map((f) => ({
                  value: f.id,
                  label: f.title,
                  icon: <Rss className="w-3.5 h-3.5 text-primary/70" />,
                })),
              ]}
              size="sm"
              placeholder={t.filterFeedPlaceholder}
            />
          </div>

          {/* Type Filter */}
          <div className="w-36 sm:w-40">
            <NoteTypeSelect
              value={type}
              onChange={(val) => onFilterChange('type', val || undefined)}
              allowAll
              allLabel={t.filterTypePlaceholder}
              size="sm"
            />
          </div>

          {/* Folder Filter Dropdown */}
          <div className="w-36 sm:w-44">
            <AppSelect
              value={folder || (unfiled ? '__unfiled__' : '')}
              onChange={(val) => {
                if (val === '__unfiled__') {
                  onSelectUnfiled();
                } else {
                  onSelectFolder(val || undefined);
                }
              }}
              options={[
                { value: '', label: t.filterFolderPlaceholder, icon: <FolderIcon className="w-3.5 h-3.5 text-on-surface-variant/60" /> },
                { value: '__unfiled__', label: '📥 ' + (t.unfiledOnly || 'Unfiled (Root)') },
                ...folders.map((f) => ({
                  value: f.path,
                  label: '📁 ' + f.path,
                })),
              ]}
              size="sm"
              placeholder={t.filterFolderPlaceholder}
            />
          </div>

          {/* Hashtag Filter */}
          <div className="w-36 sm:w-48">
            <AppSelect
              value={hashtag || ''}
              onChange={(val) => onFilterChange('hashtag', val || undefined)}
              options={[
                { value: '', label: t.hashtagsPlaceholder, icon: <Hash className="w-3.5 h-3.5 text-on-surface-variant/60" /> },
                ...hashtags.map((h) => ({
                  value: h.name,
                  label: `#${h.name}`,
                  badge: h._count?.notes ? (
                    <span className="text-[10px] px-1 py-0.2 rounded bg-tile-subtle text-on-surface-variant font-mono">
                      {h._count.notes}
                    </span>
                  ) : undefined,
                })),
              ]}
              size="sm"
              placeholder={t.hashtagsPlaceholder}
            />
          </div>

          {/* Include Deleted Checkbox */}
          <label className="ml-auto flex items-center gap-1.5 text-[11px] font-mono text-on-surface-variant hover:text-on-surface cursor-pointer select-none">
            <input
              type="checkbox"
              checked={Boolean(includeDeleted)}
              onChange={(e) => onFilterChange('includeDeleted', e.target.checked ? 'true' : undefined)}
              className="rounded bg-control border-control-border text-primary focus:ring-0 cursor-pointer w-3.5 h-3.5"
            />
            {t.status}: Deleted
          </label>
        </div>
      </div>

      {/* Scrollable Container for Table Content */}
      <div className="flex-1 overflow-auto min-h-0 relative">
        <div className="min-w-[760px] flex flex-col min-h-full">
          {/* Table Header (Sticky at top of scrollable container) */}
          <div className="sticky top-0 z-10 grid grid-cols-[2.8fr_1.8fr_1.1fr_1.6fr_2fr_70px] gap-3 px-3.5 py-1.5 border-b border-tile-border bg-tile-subtle font-mono text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold select-none shadow-xs">
            {renderSortableHeader('title', `${t.titleCol} & ${t.feedCol}`)}
            {renderSortableHeader('folder', t.folderCol)}
            {renderSortableHeader('type', t.typeCol)}
            {renderSortableHeader('startDate', t.datesCol)}
            <div>{t.tagsCol}</div>
            <div className="text-right">{t.actionsCol || t.actions}</div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-tile-border flex-1">
            {notes.map((note) => (
              <NoteTableRow
                key={note.id}
                note={note}
                onView={onViewNote}
                onEdit={onEditNote}
                onDelete={onDeleteNote}
                onRestore={onRestoreNote}
                onSelectFolder={onSelectFolder}
                onSelectUnfiled={onSelectUnfiled}
                onSelectHashtag={(tag) => onFilterChange('hashtag', tag)}
              />
            ))}
          </div>

          {/* Empty State */}
          {notes.length === 0 && !isLoading && (
            <div className="p-12 text-center text-on-surface-variant space-y-2 my-auto">
              <span className="material-symbols-outlined text-4xl text-outline mb-2">
                description
              </span>
              <p className="font-sans text-sm">{t.noNotesFound}</p>
              {hasAnyFilter && (
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="text-primary hover:underline text-xs font-mono cursor-pointer"
                >
                  {t.reset}
                </button>
              )}
            </div>
          )}

          {/* Loading Indicator Overlay */}
          {isLoading && notes.length === 0 && (
            <div className="p-12 text-center text-on-surface-variant space-y-2 my-auto">
              <span className="material-symbols-outlined text-3xl text-primary animate-spin mb-2">
                progress_activity
              </span>
              <p className="font-sans text-xs text-on-surface-variant">Загрузка записей...</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Status & Pagination Bar (Pinned) */}
      <div className="p-2 px-3.5 border-t border-tile-border bg-tile-subtle flex items-center justify-between text-[11px] font-mono text-on-surface-variant flex-shrink-0">
        <div>
          {total > 0 ? (
            <span>
              {offset + 1} - {Math.min(offset + limit, total)} / {total}
            </span>
          ) : (
            <span>0 записей</span>
          )}
        </div>

        {total > limit && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="px-2 py-0.5 bg-control border border-control-border rounded hover:border-primary hover:text-on-surface disabled:opacity-30 disabled:hover:border-control-border transition-colors cursor-pointer text-xs"
              title="Предыдущая страница"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => onPageChange(offset + limit)}
              disabled={offset + limit >= total}
              className="px-2 py-0.5 bg-control border border-control-border rounded hover:border-primary hover:text-on-surface disabled:opacity-30 disabled:hover:border-control-border transition-colors cursor-pointer text-xs"
              title="Следующая страница"
            >
              →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
