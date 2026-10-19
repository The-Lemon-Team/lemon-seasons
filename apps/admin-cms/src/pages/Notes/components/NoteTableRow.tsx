import React from 'react';
import { Popconfirm } from 'antd';
import { NoteTypeBadge } from '../../../components/NoteTypeBadge';
import { HashtagBadge } from '../../../components/HashtagBadge';
import { Note } from '../../../types';
import { useAdminI18n } from '../../../i18n';

export interface NoteTableRowProps {
  note: Note;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
  onSelectFolder: (folderPath?: string) => void;
  onSelectUnfiled: () => void;
  onSelectHashtag: (name: string) => void;
}

export const NoteTableRow: React.FC<NoteTableRowProps> = ({
  note,
  onView,
  onEdit,
  onDelete,
  onRestore,
  onSelectFolder,
  onSelectUnfiled,
  onSelectHashtag,
}) => {
  const { t } = useAdminI18n();

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

  const hasHashtags = note.hashtags && note.hashtags.length > 0;
  const noteFolders = note.folders || [];
  const primaryFolder = noteFolders.find((nf) => nf.isPrimary) || noteFolders[0];
  const secondaryFolders = noteFolders.filter((nf) => nf !== primaryFolder);

  return (
    <div
      className={`group grid grid-cols-[2.8fr_1.8fr_1.1fr_1.6fr_2fr_70px] gap-3 px-3.5 py-1.5 items-center hover:bg-tile-subtle transition-colors ${
        isDeleted ? 'opacity-50' : ''
      }`}
    >
      {/* Title & Feed */}
      <div className="flex items-center gap-2.5 min-w-0">
        {thumbUrl && (
          <div
            onClick={() => onView(note.id)}
            className="relative w-7 h-7 flex-shrink-0 rounded overflow-hidden bg-tile-subtle border border-tile-border cursor-pointer group-hover:border-primary/50 transition-all shadow-xs"
          >
            <img
              src={thumbUrl}
              alt={mainImage?.alt || note.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {note.images && note.images.length > 1 && (
              <span className="absolute bottom-0 right-0 bg-black/80 text-[8px] font-mono text-white/90 px-0.5 rounded-tl">
                +{note.images.length - 1}
              </span>
            )}
          </div>
        )}
        <div className="min-w-0">
          <div
            onClick={() => onView(note.id)}
            className="font-sans font-semibold text-xs leading-tight text-on-surface hover:text-primary transition-colors cursor-pointer truncate"
          >
            {note.title}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap mt-0.5 leading-none">
            {note.feed && (
              <span className="text-[10px] font-mono text-outline hover:text-on-surface-variant truncate">
                {note.feed.title}
              </span>
            )}
            {note.curator && (
              <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-mono bg-sky-500/10 border border-sky-500/30 text-sky-600 dark:text-sky-400">
                <span>👤</span>
                <span>{note.curator}</span>
              </span>
            )}
            {note.sourceLink && (
              <a
                href={note.sourceLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-0.5 text-[10px] font-mono text-primary/80 hover:text-primary transition-colors"
                title={`Source: ${note.sourceLink}`}
              >
                <span className="material-symbols-outlined text-[11px]">link</span>
                source
                {note.links && note.links.length > 1 && (
                  <span className="text-[9px] text-on-surface-variant font-mono">
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
          <div className="space-y-0.5">
            <button
              type="button"
              onClick={() => onSelectFolder(primaryFolder.folder!.path)}
              className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono bg-primary/15 text-primary border border-primary/30 hover:border-primary hover:bg-primary/25 transition-all text-left max-w-full truncate cursor-pointer"
              title={`Folder: ${primaryFolder.folder.path}`}
            >
              <span className="material-symbols-outlined text-[11px] text-primary">
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
                    onClick={() => onSelectFolder(sf.folder!.path)}
                    className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-mono bg-tile-subtle text-on-surface-variant/80 border border-tile-border hover:border-primary/40 hover:text-on-surface transition-all cursor-pointer"
                    title={`Linked Folder: ${sf.folder?.path}`}
                  >
                    <span className="material-symbols-outlined text-[10px]">
                      link
                    </span>
                    <span className="truncate max-w-[110px]">{sf.folder?.path}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={onSelectUnfiled}
            className="inline-flex items-center gap-1 text-[10px] font-mono text-outline/50 hover:text-secondary transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[12px]">draft</span>
            Unfiled (Root)
          </button>
        )}
      </div>

      {/* Type */}
      <div>
        <NoteTypeBadge type={note.type} size="xs" />
      </div>

      {/* Date */}
      <div className="font-mono text-[11px] text-on-surface-variant flex items-center gap-1">
        <span className="material-symbols-outlined text-[12px]">calendar_today</span>
        <span className="truncate">{dateStr}{endDateStr ? ` - ${endDateStr}` : ''}</span>
      </div>

      {/* Hashtags */}
      <div className="flex flex-wrap gap-1 items-center">
        {hasHashtags ? (
          note.hashtags?.map((h) => (
            <HashtagBadge
              key={h.id}
              name={h.name}
              size="xs"
              onClick={() => onSelectHashtag(h.name)}
            />
          ))
        ) : (
          <span className="font-mono text-[10px] text-outline/40">—</span>
        )}
      </div>

      {/* Hover Actions */}
      <div className="flex justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {!isDeleted ? (
          <>
            <button
              onClick={() => onView(note.id)}
              className="p-0.5 text-on-surface-variant hover:text-primary transition-colors rounded hover:bg-tile-subtle cursor-pointer"
              title={t.quickPreview}
            >
              <span className="material-symbols-outlined text-[16px]">visibility</span>
            </button>
            <button
              onClick={() => onEdit(note.id)}
              className="p-0.5 text-on-surface-variant hover:text-secondary transition-colors rounded hover:bg-tile-subtle cursor-pointer"
              title={t.edit}
            >
              <span className="material-symbols-outlined text-[16px]">edit</span>
            </button>
            <Popconfirm
              title={t.confirmDeleteNote}
              onConfirm={() => onDelete(note.id)}
              okText={t.delete}
              cancelText={t.cancel}
              okButtonProps={{ danger: true }}
            >
              <button
                className="p-0.5 text-on-surface-variant hover:text-error transition-colors rounded hover:bg-tile-subtle cursor-pointer"
                title={t.delete}
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
              </button>
            </Popconfirm>
          </>
        ) : (
          <button
            onClick={() => onRestore(note.id)}
            className="p-0.5 text-tertiary hover:text-primary transition-colors rounded hover:bg-tile-subtle cursor-pointer"
            title="Restore"
          >
            <span className="material-symbols-outlined text-[16px]">restore</span>
          </button>
        )}
      </div>
    </div>
  );
};
