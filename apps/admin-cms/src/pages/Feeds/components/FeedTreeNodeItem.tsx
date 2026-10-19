import React from 'react';
import { Popconfirm } from 'antd';
import { Feed } from '../../../types';
import { AdminTranslations } from '../../../i18n';

interface FeedTreeNodeItemProps {
  feed: Feed;
  onEdit: (feed: Feed) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
  onNavigateNotes: (feedId: string) => void;
  t: AdminTranslations;
}

export const FeedTreeNodeItem: React.FC<FeedTreeNodeItemProps> = ({
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
    <div className="pl-7 relative tree-line">
      <div
        className={`group relative flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/5 transition-all duration-200 border border-transparent hover:border-white/5 tree-line-horizontal ${
          isDeleted ? 'opacity-50' : ''
        }`}
      >
        {/* Left side: Icon, Identity, Title, Badges & Chips */}
        <div className="flex items-center gap-3 min-w-0 flex-1 flex-wrap sm:flex-nowrap">
          {/* Feed Icon / Avatar with Accent Color */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-white/10 transition-transform group-hover:scale-105"
            style={{
              backgroundColor: `${accentColor}18`,
              borderColor: `${accentColor}40`,
            }}
          >
            <span
              className="material-symbols-outlined text-[18px]"
              style={{ color: accentColor }}
            >
              {icon}
            </span>
          </div>

          {/* Details & Metadata */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                onClick={() => onNavigateNotes(feed.id)}
                className="font-sans font-semibold text-sm text-on-surface hover:text-primary transition-colors cursor-pointer truncate"
                title={feed.title}
              >
                {feed.title}
              </span>

              {/* Slug Badge */}
              <span className="bg-primary/15 text-primary px-2 py-0.5 rounded font-mono text-[11px] font-semibold border border-primary/20 shrink-0">
                /{feed.slug}
              </span>

              {/* Deleted Badge */}
              {isDeleted && (
                <span className="bg-error/20 text-error px-1.5 py-0.5 rounded font-mono text-[10px] shrink-0">
                  DELETED
                </span>
              )}
            </div>

            {feed.description && (
              <p className="text-on-surface-variant/80 text-xs truncate max-w-xl mt-0.5">
                {feed.description}
              </p>
            )}

            {/* Folder & Hashtag Chips */}
            {(folderPaths.length > 0 || hashtags.length > 0) && (
              <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                {folderPaths.map((fp) => (
                  <span
                    key={fp}
                    className="inline-flex items-center gap-1 bg-surface-container px-2 py-0.5 rounded text-[11px] font-mono text-secondary border border-secondary/20"
                    title={`Obsidian Folder: ${fp}`}
                  >
                    <span className="material-symbols-outlined text-[12px]">folder_open</span>
                    {fp}
                  </span>
                ))}

                {hashtags.map((tag) => {
                  const cleanTag = tag.replace(/^#/, '');
                  return (
                    <span
                      key={cleanTag}
                      className="inline-flex items-center gap-0.5 bg-tertiary/10 text-tertiary px-2 py-0.5 rounded text-[11px] font-mono border border-tertiary/20"
                    >
                      <span>#</span>
                      {cleanTag}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right side: Notes Count Pill & Actions */}
        <div className="flex items-center gap-2 shrink-0 ml-3">
          {/* Notes Count Pill */}
          <button
            onClick={() => onNavigateNotes(feed.id)}
            className="inline-flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-primary px-2.5 py-1 rounded-full text-xs font-mono transition-colors border border-white/5"
            title="View Notes in Feed"
          >
            <span className="material-symbols-outlined text-[13px]">description</span>
            <span>{t.notesCountBadge(noteCount)}</span>
          </button>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {!isDeleted ? (
              <>
                <button
                  onClick={() => onEdit(feed)}
                  className="p-1.5 text-on-surface-variant hover:text-secondary hover:bg-white/10 rounded transition-colors"
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
                    className="p-1.5 text-on-surface-variant hover:text-error hover:bg-white/10 rounded transition-colors"
                    title={t.delete}
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </Popconfirm>
              </>
            ) : (
              <button
                onClick={() => onRestore(feed.id)}
                className="p-1.5 text-tertiary hover:text-primary hover:bg-white/10 rounded transition-colors"
                title="Restore"
              >
                <span className="material-symbols-outlined text-[16px]">restore</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
