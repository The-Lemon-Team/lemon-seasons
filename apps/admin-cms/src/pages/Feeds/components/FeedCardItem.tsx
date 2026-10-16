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

  return (
    <article
      className={`bg-surface-container-highest rounded-lg border border-white/5 p-5 flex flex-col justify-between hover:bg-white/5 transition-all duration-200 relative hover-actions-group group ${
        isDeleted ? 'opacity-50 border-error/30' : ''
      }`}
    >
      <div>
        {/* Top Row: Slug badge & Hover Actions */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-primary/15 text-primary px-2 py-0.5 rounded-sm font-mono text-[11px] font-semibold border border-primary/20">
              /{feed.slug}
            </span>
            {isDeleted && (
              <span className="bg-error/20 text-error px-1.5 py-0.5 rounded-sm font-mono text-[10px]">
                DELETED
              </span>
            )}
          </div>

          {/* Hover Actions Bar */}
          <div className="actions-container flex gap-1 bg-surface-container-high rounded border border-white/10 p-1 shadow-lg">
            {!isDeleted ? (
              <>
                <button
                  onClick={() => onEdit(feed)}
                  className="p-1 text-on-surface-variant hover:text-secondary transition-colors rounded hover:bg-white/5"
                  title={t.edit}
                >
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                </button>
                <Popconfirm
                  title={t.confirmDeleteFeed}
                  onConfirm={() => onDelete(feed.id)}
                  okText={t.delete}
                  cancelText={t.cancel}
                  okButtonProps={{ danger: true }}
                >
                  <button
                    className="p-1 text-on-surface-variant hover:text-error transition-colors rounded hover:bg-white/5"
                    title={t.delete}
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </Popconfirm>
              </>
            ) : (
              <button
                onClick={() => onRestore(feed.id)}
                className="p-1 text-tertiary hover:text-primary transition-colors rounded hover:bg-white/5"
                title="Restore"
              >
                <span className="material-symbols-outlined text-[16px]">restore</span>
              </button>
            )}
          </div>
        </div>

        {/* Feed Title & Description */}
        <div className="mb-3">
          <h3
            onClick={() => onNavigateNotes(feed.id)}
            className="font-sans font-bold text-lg text-on-surface hover:text-primary transition-colors cursor-pointer mb-1.5"
          >
            {feed.title}
          </h3>
          <p className="text-on-surface-variant text-xs line-clamp-2 leading-relaxed">
            {feed.description || '—'}
          </p>
        </div>

        {/* Linked Folders (Folder Projections) */}
        {folderPaths.length > 0 && (
          <div className="mb-4">
            <span className="text-[10px] uppercase font-mono text-on-surface-variant block mb-1.5 tracking-wider">
              {t.feedFolderPathsLabel}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {folderPaths.map((fp) => (
                <span
                  key={fp}
                  className="inline-flex items-center gap-1 bg-surface-container px-2 py-0.5 rounded text-[11px] font-mono text-secondary border border-secondary/20"
                >
                  <span className="material-symbols-outlined text-[13px]">folder_open</span>
                  {fp}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Metadata & Notes Link */}
      <div className="pt-3 border-t border-white/5 flex items-center justify-between font-mono text-xs text-on-surface-variant mt-2">
        <button
          onClick={() => onNavigateNotes(feed.id)}
          className="inline-flex items-center gap-1.5 text-secondary hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-[14px]">description</span>
          {noteCount} {t.notesCountBadge(noteCount)}
        </button>

        <span className="text-[11px] text-outline">
          {new Date(feed.createdAt).toLocaleDateString()}
        </span>
      </div>
    </article>
  );
};
