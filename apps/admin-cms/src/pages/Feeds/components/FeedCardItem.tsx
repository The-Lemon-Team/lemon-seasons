import React from 'react';
import { Popconfirm } from 'antd';
import { Feed } from '../../../types';
import { AdminTranslations } from '../../../i18n';

interface FeedCardItemProps {
  feed: Feed;
  onEdit: (feed: Feed) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
  onNavigateNotes: (feedId: string) => void;
  t: AdminTranslations;
}

export const FeedCardItem: React.FC<FeedCardItemProps> = ({
  feed,
  onEdit,
  onDelete,
  onRestore,
  onNavigateNotes,
  t,
}) => {
  const isDeleted = Boolean(feed.deletedAt);
  const noteCount = feed._count?.notes ?? 0;
  const folderPaths = feed.folderPaths || [];
  const hashtags = feed.hashtags || [];
  const icon = feed.icon || 'dynamic_feed';
  const accentColor = feed.color || '#cacd58';

  return (
    <article
      className={`platform-tile platform-tile-hover p-3 flex flex-col justify-between relative hover-actions-group group ${
        isDeleted ? 'opacity-50 border-error/30' : ''
      }`}
      style={{
        borderLeftColor: accentColor,
        borderLeftWidth: '3px',
      }}
    >
      <div>
        {/* Top Row: Icon + Slug badge & Hover Actions */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <div
              className="w-6 h-6 rounded flex items-center justify-center shrink-0 border border-tile-border"
              style={{
                backgroundColor: `${accentColor}18`,
                color: accentColor,
              }}
            >
              <span className="material-symbols-outlined text-[15px]">{icon}</span>
            </div>

            <span className="bg-primary/15 text-primary px-2 py-0.5 rounded font-mono text-[10px] font-semibold border border-primary/20">
              /{feed.slug}
            </span>

            {isDeleted && (
              <span className="bg-error/20 text-error px-1.5 py-0.5 rounded font-mono text-[9px]">
                DELETED
              </span>
            )}
          </div>

          {/* Hover Actions Bar */}
          <div className="actions-container flex gap-1 bg-panel rounded-lg border border-tile-border p-0.5 shadow-md">
            {!isDeleted ? (
              <>
                <button
                  onClick={() => onEdit(feed)}
                  className="p-1 text-on-surface-variant hover:text-secondary transition-colors rounded hover:bg-tile-subtle cursor-pointer"
                  title={t.edit}
                >
                  <span className="material-symbols-outlined text-[15px]">edit</span>
                </button>
                <Popconfirm
                  title={t.confirmDeleteFeed}
                  onConfirm={() => onDelete(feed.id)}
                  okText={t.delete}
                  cancelText={t.cancel}
                  okButtonProps={{ danger: true }}
                >
                  <button
                    className="p-1 text-on-surface-variant hover:text-error transition-colors rounded hover:bg-tile-subtle cursor-pointer"
                    title={t.delete}
                  >
                    <span className="material-symbols-outlined text-[15px]">delete</span>
                  </button>
                </Popconfirm>
              </>
            ) : (
              <button
                onClick={() => onRestore(feed.id)}
                className="p-1 text-tertiary hover:text-primary transition-colors rounded hover:bg-tile-subtle cursor-pointer"
                title="Restore"
              >
                <span className="material-symbols-outlined text-[15px]">restore</span>
              </button>
            )}
          </div>
        </div>

        {/* Feed Title & Description */}
        <div className="mb-2">
          <h3
            onClick={() => onNavigateNotes(feed.id)}
            className="font-sans font-bold text-xs text-on-surface hover:text-primary transition-colors cursor-pointer mb-1 leading-snug"
          >
            {feed.title}
          </h3>
          <p className="text-on-surface-variant text-[11px] line-clamp-2 leading-relaxed font-mono">
            {feed.description || '—'}
          </p>
        </div>

        {/* Linked Folders (Folder Projections) */}
        {folderPaths.length > 0 && (
          <div className="mb-2">
            <span className="text-[9px] uppercase font-mono text-on-surface-variant/70 block mb-0.5 tracking-wider">
              {t.feedFolderPathsLabel}
            </span>
            <div className="flex flex-wrap gap-1">
              {folderPaths.map((fp) => (
                <span
                  key={fp}
                  className="inline-flex items-center gap-1 bg-tile-subtle px-1.5 py-0.5 rounded text-[10px] font-mono text-secondary border border-secondary/20"
                >
                  <span className="material-symbols-outlined text-[12px]">folder_open</span>
                  {fp}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Saved Tag Filters (Hashtags) */}
        {hashtags.length > 0 && (
          <div className="mb-2">
            <span className="text-[9px] uppercase font-mono text-on-surface-variant/70 block mb-0.5 tracking-wider">
              {t.feedHashtagsLabel}
            </span>
            <div className="flex flex-wrap gap-1">
              {hashtags.map((h) => {
                const cleanTag = h.replace(/^#/, '');
                return (
                  <span
                    key={cleanTag}
                    className="inline-flex items-center gap-0.5 bg-tertiary/10 text-tertiary px-1.5 py-0.5 rounded text-[10px] font-mono border border-tertiary/20"
                  >
                    <span>#</span>
                    {cleanTag}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Metadata & Notes Link */}
      <div className="pt-2 border-t border-tile-border flex items-center justify-between font-mono text-[10px] text-on-surface-variant mt-1.5">
        <button
          onClick={() => onNavigateNotes(feed.id)}
          className="inline-flex items-center gap-1.5 text-secondary hover:text-primary transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[14px]">description</span>
          {t.notesCountBadge(noteCount)}
        </button>

        <span className="text-[10px] text-outline">
          {new Date(feed.createdAt).toLocaleDateString()}
        </span>
      </div>
    </article>
  );
};
