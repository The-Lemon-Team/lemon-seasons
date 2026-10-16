import React, { useState } from 'react';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  useFeeds,
  useCreateFeed,
  useUpdateFeed,
  useDeleteFeed,
  useRestoreFeed,
} from '../../api/queries';
import { Feed } from '../../types';
import { useAdminI18n } from '../../i18n';
import { FeedCardItem } from './components/FeedCardItem';
import { FeedModal } from './components/FeedModal';

export const FeedsPage: React.FC = () => {
  const { t } = useAdminI18n();
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFeed, setEditingFeed] = useState<Feed | null>(null);

  const navigate = useNavigate();

  const { data: feeds = [], isLoading } = useFeeds(includeDeleted);
  const createFeedMutation = useCreateFeed();
  const updateFeedMutation = useUpdateFeed();
  const deleteFeedMutation = useDeleteFeed();
  const restoreFeedMutation = useRestoreFeed();

  const openCreateModal = () => {
    setEditingFeed(null);
    setIsModalOpen(true);
  };

  const openEditModal = (feed: Feed) => {
    setEditingFeed(feed);
    setIsModalOpen(true);
  };

  const handleSaveFeed = async (data: {
    title: string;
    description?: string;
    slug?: string;
    folderPaths: string[];
  }) => {
    try {
      if (editingFeed) {
        await updateFeedMutation.mutateAsync({
          id: editingFeed.id,
          data,
        });
        message.success(t.feedSavedSuccess);
      } else {
        await createFeedMutation.mutateAsync(data);
        message.success(t.feedSavedSuccess);
      }
      setIsModalOpen(false);
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
        {feeds.map((feed) => (
          <FeedCardItem
            key={feed.id}
            feed={feed}
            onEdit={openEditModal}
            onDelete={handleDeleteFeed}
            onRestore={handleRestoreFeed}
            onNavigateNotes={(feedId) => navigate(`/notes?feedId=${feedId}`)}
            t={t}
          />
        ))}
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
      <FeedModal
        open={isModalOpen}
        editingFeed={editingFeed}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveFeed}
        isSubmitting={createFeedMutation.isPending || updateFeedMutation.isPending}
        t={t}
      />
    </div>
  );
};
