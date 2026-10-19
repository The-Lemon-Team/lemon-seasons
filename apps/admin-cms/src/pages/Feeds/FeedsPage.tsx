import React, { useState, useMemo } from 'react';
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
import { buildFeedGroups, FeedGroup } from './feeds.utils';
import { FeedTreeView } from './components/FeedTreeView';
import { FeedCardItem } from './components/FeedCardItem';
import { FeedModal } from './components/FeedModal';

export const FeedsPage: React.FC = () => {
  const { t } = useAdminI18n();
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'tree' | 'cards'>('tree');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFeed, setEditingFeed] = useState<Feed | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<FeedGroup | null>(null);

  const navigate = useNavigate();

  const { data: feeds = [], isLoading } = useFeeds(includeDeleted);
  const createFeedMutation = useCreateFeed();
  const updateFeedMutation = useUpdateFeed();
  const deleteFeedMutation = useDeleteFeed();
  const restoreFeedMutation = useRestoreFeed();

  // Group feeds for Tree View and filter for Cards View
  const feedGroups = useMemo(() => {
    return buildFeedGroups(feeds, searchQuery);
  }, [feeds, searchQuery]);

  const flatFilteredFeeds = useMemo(() => {
    if (!searchQuery.trim()) return feeds;
    const q = searchQuery.toLowerCase().trim();
    return feeds.filter(
      (f) =>
        f.title.toLowerCase().includes(q) ||
        f.slug.toLowerCase().includes(q) ||
        f.description?.toLowerCase().includes(q) ||
        f.folderPaths?.some((fp) => fp.toLowerCase().includes(q)) ||
        f.hashtags?.some((h) => h.toLowerCase().includes(q))
    );
  }, [feeds, searchQuery]);

  const openCreateModal = (group?: FeedGroup) => {
    setEditingFeed(null);
    setSelectedGroup(group || null);
    setIsModalOpen(true);
  };

  const openEditModal = (feed: Feed) => {
    setEditingFeed(feed);
    setSelectedGroup(null);
    setIsModalOpen(true);
  };

  const handleSaveFeed = async (data: {
    title: string;
    description?: string;
    slug?: string;
    icon?: string;
    color?: string;
    folderPaths: string[];
    hashtags: string[];
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

  const hasNoResults =
    (viewMode === 'tree' && feedGroups.length === 0) ||
    (viewMode === 'cards' && flatFilteredFeeds.length === 0);

  return (
    <div className="flex-1 min-h-0 h-full overflow-y-auto custom-scrollbar pr-1 space-y-3">
      {/* Top Header Section */}
      <div className="flex items-center justify-between gap-3 h-8">
        <div className="flex items-center gap-2.5 min-w-0">
          <h1 className="font-sans font-bold text-base text-on-surface truncate">
            {t.feedsPageTitle}
          </h1>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 hidden sm:inline-block shrink-0">
            {feeds.length} фидов
          </span>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <label className="flex items-center gap-1.5 text-[11px] font-mono text-text-muted hover:text-text-main cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={(e) => setIncludeDeleted(e.target.checked)}
              className="rounded bg-control border-tile-border text-primary focus:ring-0 w-3.5 h-3.5"
            />
            <span>{t.status}: Deleted</span>
          </label>
          <button
            onClick={() => openCreateModal()}
            className="h-6.5 px-2.5 bg-primary text-on-primary hover:bg-primary-fixed-dim rounded text-[11px] font-semibold transition-all flex items-center gap-1 shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px]">add</span>
            <span>{t.createFeedBtn}</span>
          </button>
        </div>
      </div>

      {/* Toolbar: Search & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 platform-tile p-2">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-[16px] pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchFeedsPlaceholder}
            className="w-full bg-control border border-control-border rounded-lg pl-8 pr-7 h-7 text-on-surface text-[11px] font-mono placeholder:text-on-surface-variant/50 outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-on-surface cursor-pointer"
            >
              <span className="material-symbols-outlined text-[13px]">close</span>
            </button>
          )}
        </div>

        {/* View Mode Toggle: Tree vs Cards */}
        <div className="flex items-center gap-1 bg-control p-0.5 rounded-lg border border-control-border self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('tree')}
            className={`flex items-center gap-1.5 px-2.5 h-6 rounded-md text-[11px] font-mono font-medium transition-colors cursor-pointer ${
              viewMode === 'tree'
                ? 'bg-primary text-on-primary font-semibold shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-tile-subtle'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">account_tree</span>
            <span>{t.viewTreeBtn}</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`flex items-center gap-1.5 px-2.5 h-6 rounded-md text-[11px] font-mono font-medium transition-colors cursor-pointer ${
              viewMode === 'cards'
                ? 'bg-primary text-on-primary font-semibold shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-tile-subtle'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">grid_view</span>
            <span>{t.viewCardsBtn}</span>
          </button>
        </div>
      </div>

      {/* Main View Area */}
      {viewMode === 'tree' ? (
        <FeedTreeView
          groups={feedGroups}
          onEdit={openEditModal}
          onDelete={handleDeleteFeed}
          onRestore={handleRestoreFeed}
          onNavigateNotes={(feedId) => navigate(`/notes?feedId=${feedId}`)}
          onAddInGroup={(group) => openCreateModal(group)}
          t={t}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {flatFilteredFeeds.map((feed) => (
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
      )}

      {/* Empty State */}
      {hasNoResults && !isLoading && (
        <div className="platform-tile p-8 text-center">
          <span className="material-symbols-outlined text-3xl text-text-muted/60 mb-2">
            dynamic_feed
          </span>
          <h3 className="font-semibold text-text-main text-sm">{t.noFeedsFound}</h3>
          <p className="text-text-muted text-xs mt-1 mb-3">
            {searchQuery
              ? `По запросу «${searchQuery}» ничего не найдено`
              : t.feedsPageSubtitle}
          </p>
          <button
            onClick={() => openCreateModal()}
            className="h-6.5 px-3 bg-primary text-on-primary rounded font-semibold text-[11px] shadow-xs hover:bg-primary-fixed-dim transition-all cursor-pointer"
          >
            {t.createFeedBtn}
          </button>
        </div>
      )}

      {/* Create / Edit Modal */}
      <FeedModal
        open={isModalOpen}
        editingFeed={editingFeed}
        initialGroup={selectedGroup?.name}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveFeed}
        isSubmitting={createFeedMutation.isPending || updateFeedMutation.isPending}
        t={t}
      />
    </div>
  );
};
