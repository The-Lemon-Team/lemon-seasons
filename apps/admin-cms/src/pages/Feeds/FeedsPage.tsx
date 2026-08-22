import React, { useState } from 'react';
import { message, Modal, Popconfirm } from 'antd';
import {
  useFeeds,
  useCreateFeed,
  useUpdateFeed,
  useDeleteFeed,
  useRestoreFeed,
} from '../../api/queries';
import { Feed } from '../../types';
import { useNavigate } from 'react-router-dom';
import { useAdminI18n } from '../../i18n';

export const FeedsPage: React.FC = () => {
  const { t } = useAdminI18n();
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [searchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingFeed, setEditingFeed] = useState<Feed | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');

  const navigate = useNavigate();

  const { data: feeds = [], isLoading } = useFeeds(includeDeleted, searchTerm);
  const createFeedMutation = useCreateFeed();
  const updateFeedMutation = useUpdateFeed();
  const deleteFeedMutation = useDeleteFeed();
  const restoreFeedMutation = useRestoreFeed();

  const openCreateModal = () => {
    setEditingFeed(null);
    setTitle('');
    setDescription('');
    setSlug('');
    setIsCreateModalOpen(true);
  };

  const openEditModal = (feed: Feed) => {
    setEditingFeed(feed);
    setTitle(feed.title);
    setDescription(feed.description || '');
    setSlug(feed.slug);
    setIsCreateModalOpen(true);
  };

  const handleSaveFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      message.error(t.feedTitleLabel);
      return;
    }

    try {
      if (editingFeed) {
        await updateFeedMutation.mutateAsync({
          id: editingFeed.id,
          data: {
            title: title.trim(),
            description: description.trim() || undefined,
            slug: slug.trim() || undefined,
          },
        });
        message.success(t.feedSavedSuccess);
      } else {
        await createFeedMutation.mutateAsync({
          title: title.trim(),
          description: description.trim() || undefined,
          slug: slug.trim() || undefined,
        });
        message.success(t.feedSavedSuccess);
      }
      setIsCreateModalOpen(false);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error');
    }
  };

  const handleDeleteFeed = async (id: string) => {
    try {
      await deleteFeedMutation.mutateAsync(id);
      message.success(t.feedDeletedSuccess);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error');
    }
  };

  const handleRestoreFeed = async (id: string) => {
    try {
      await restoreFeedMutation.mutateAsync(id);
      message.success(t.feedSavedSuccess);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-sans font-bold text-2xl text-on-surface mb-1">
            {t.feedsPageTitle}
          </h1>
          <p className="text-on-surface-variant font-sans text-sm">
            {t.feedsPageSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-mono text-on-surface-variant cursor-pointer">
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={(e) => setIncludeDeleted(e.target.checked)}
              className="rounded bg-surface-container border-white/20 text-primary focus:ring-0"
            />
            {t.status}: Deleted
          </label>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-primary text-on-primary hover:bg-primary-fixed-dim rounded font-semibold text-sm transition-all flex items-center gap-2 shadow"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            {t.createFeedBtn}
          </button>
        </div>
      </div>

      {/* Feeds Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {feeds.map((feed) => {
          const isDeleted = Boolean(feed.deletedAt);
          const noteCount = feed._count?.notes ?? 0;

          return (
            <article
              key={feed.id}
              className={`bg-surface-container-highest rounded-lg border border-white/5 p-5 flex flex-col justify-between hover:bg-white/5 transition-all duration-200 relative hover-actions-group group ${
                isDeleted ? 'opacity-50 border-error/30' : ''
              }`}
            >
              {/* Top Row: Slug badge & Hover Actions */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
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
                        onClick={() => openEditModal(feed)}
                        className="p-1 text-on-surface-variant hover:text-secondary transition-colors rounded hover:bg-white/5"
                        title={t.edit}
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                      <Popconfirm
                        title={t.confirmDeleteFeed}
                        onConfirm={() => handleDeleteFeed(feed.id)}
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
                      onClick={() => handleRestoreFeed(feed.id)}
                      className="p-1 text-tertiary hover:text-primary transition-colors rounded hover:bg-white/5"
                      title="Restore"
                    >
                      <span className="material-symbols-outlined text-[16px]">restore</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Feed Title & Description */}
              <div className="mb-4">
                <h3
                  onClick={() => navigate(`/notes?feedId=${feed.id}`)}
                  className="font-sans font-bold text-lg text-on-surface hover:text-primary transition-colors cursor-pointer mb-1.5"
                >
                  {feed.title}
                </h3>
                <p className="text-on-surface-variant text-xs line-clamp-2 leading-relaxed">
                  {feed.description || '—'}
                </p>
              </div>

              {/* Bottom Metadata & Notes Link */}
              <div className="pt-3 border-t border-white/5 flex items-center justify-between font-mono text-xs text-on-surface-variant">
                <button
                  onClick={() => navigate(`/notes?feedId=${feed.id}`)}
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
        })}
      </div>

      {feeds.length === 0 && !isLoading && (
        <div className="bg-surface-container rounded-lg border border-white/5 p-12 text-center">
          <span className="material-symbols-outlined text-4xl text-outline mb-2">dynamic_feed</span>
          <h3 className="font-semibold text-on-surface text-base">{t.noFeedsFound}</h3>
          <p className="text-on-surface-variant text-xs mt-1 mb-4">
            {t.feedsPageSubtitle}
          </p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-primary text-on-primary rounded font-semibold text-sm"
          >
            {t.createFeedBtn}
          </button>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        footer={null}
        width={520}
        centered
        destroyOnClose
        styles={{
          content: {
            backgroundColor: '#292a2a',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          },
        }}
      >
        <div className="p-2 space-y-4">
          <h2 className="font-sans font-bold text-lg text-on-surface">
            {editingFeed ? t.editFeedTitle : t.createFeedTitle}
          </h2>

          <form onSubmit={handleSaveFeed} className="space-y-4">
            <div className="space-y-1">
              <label className="block font-mono text-[11px] font-semibold text-on-surface-variant uppercase">
                {t.feedTitleLabel}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Marvel Cinematic Universe"
                className="w-full bg-surface-container-lowest border border-white/10 rounded px-3 py-2 text-on-surface text-sm focus:border-primary outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-mono text-[11px] font-semibold text-on-surface-variant uppercase">
                {t.feedSlugLabel}
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. mcu-radar"
                className="w-full bg-surface-container-lowest border border-white/10 rounded px-3 py-2 text-on-surface font-mono text-xs focus:border-primary outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-mono text-[11px] font-semibold text-on-surface-variant uppercase">
                {t.feedDescriptionLabel}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="—"
                className="w-full bg-surface-container-lowest border border-white/10 rounded px-3 py-2 text-on-surface text-sm focus:border-primary outline-none resize-none"
              />
            </div>

            <div className="pt-3 border-t border-white/5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded text-sm text-on-surface-variant hover:text-on-surface"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                disabled={createFeedMutation.isPending || updateFeedMutation.isPending}
                className="px-5 py-2 bg-primary text-on-primary hover:bg-primary-fixed-dim rounded font-semibold text-sm shadow"
              >
                {editingFeed ? t.save : t.createFeedBtn}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};

