import React, { useCallback, useMemo, useState } from 'react';
import { CheckSquare, EyeOff, Loader2, Send } from 'lucide-react';
import {
  CoreFeedDetailModal,
  CoreFeedStream,
  CoreLiveUpdatesBanner,
  FeedCardSlots,
  FeedDetailSlots,
  FeedEntry,
  useCoreFeedSelection,
  WatcherFeedEntryMeta,
  watcherScenarioAdapter,
} from '@feed-core';
import { useWatchersStream } from './hooks/useWatchersStream';
import { WatchersHeader } from './components/WatchersHeader';
import { WatchersStatusBanner } from './components/WatchersStatusBanner';
import { WatchersBatchBar } from './components/WatchersBatchBar';
import { WatchersManagerModal } from './components/WatchersManagerModal';

export interface FeedWatchersViewProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
  notesFeedUrl?: string;
  onSwitchToNotesEnv?: () => void;
  embedded?: boolean;
  selectedCategory?: string;
  onCategoryChange?: (slug?: string) => void;
  chipsEndContent?: React.ReactNode;
}

export const FeedWatchersView: React.FC<FeedWatchersViewProps> = ({
  isDarkMode,
  toggleTheme,
  notesFeedUrl,
  onSwitchToNotesEnv,
  embedded = false,
  selectedCategory: externalCategory,
  onCategoryChange: onExternalCategoryChange,
  chipsEndContent,
}) => {
  const {
    folders,
    watchers,
    activeWatchersCount,
    items,
    counts,
    selectedCategory,
    setSelectedCategory,
    selectedWatcher,
    setSelectedWatcher,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    isManagerOpen,
    setManagerOpen,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    refresh,
    error,
    sseStatus,
    lastHeartbeatAt,
    pendingLiveCount,
    applyPendingLive,
    dismissPendingLive,
    mutatingIds,
    togglingWatcherIds,
    triggeringWatcherIds,
    isBulkWatchersMutating,
    promoteItem,
    batchPromote,
    dismissItem,
    batchDismiss,
    triggerAll,
    isTriggeringAll,
    toggleWatcher,
    triggerWatcher,
    resumeAllWatchers,
    pauseAllWatchers,
    validateFeed,
    createWatcher,
  } = useWatchersStream({
    embedded,
    externalCategory,
    onExternalCategoryChange,
  });

  const {
    selectedIds,
    selectedCount,
    toggleSelect,
    selectAll,
    clearSelection,
    isSelected,
  } = useCoreFeedSelection();

  const [selectedEntry, setSelectedEntry] = useState<FeedEntry<WatcherFeedEntryMeta> | null>(
    null
  );
  const [isBatchMutating, setIsBatchMutating] = useState(false);
  const [managerCategory, setManagerCategory] = useState<string | undefined>(undefined);

  const handleOpenManager = useCallback(
    (categorySlug?: string) => {
      setManagerCategory(categorySlug !== undefined ? categorySlug : selectedCategory);
      setManagerOpen(true);
    },
    [selectedCategory, setManagerOpen]
  );

  const handleOpenDetail = useCallback((entry: FeedEntry<WatcherFeedEntryMeta>) => {
    setSelectedEntry(entry);
  }, []);

  const handleSelectTag = useCallback(
    (tag: string) => {
      setSearchQuery(tag);
    },
    [setSearchQuery]
  );

  const handleBatchDismiss = useCallback(async () => {
    if (isBatchMutating || selectedIds.size === 0) return;
    setIsBatchMutating(true);
    try {
      await batchDismiss(Array.from(selectedIds));
      clearSelection();
    } finally {
      setIsBatchMutating(false);
    }
  }, [isBatchMutating, selectedIds, batchDismiss, clearSelection]);

  const handleBatchPromote = useCallback(async () => {
    if (isBatchMutating || selectedIds.size === 0) return;
    setIsBatchMutating(true);
    try {
      await batchPromote(Array.from(selectedIds));
      clearSelection();
    } finally {
      setIsBatchMutating(false);
    }
  }, [isBatchMutating, selectedIds, batchPromote, clearSelection]);

  const entries = useMemo(() => watcherScenarioAdapter.mapItems(items), [items]);

  const filteredWatchers = useMemo(() => {
    if (!selectedCategory) return watchers;
    return watchers.filter((w) => w.category === selectedCategory);
  }, [watchers, selectedCategory]);

  const activeInScopeCount = useMemo(
    () => filteredWatchers.filter((w) => w.enabled).length,
    [filteredWatchers]
  );

  const selectedCategoryTitle = useMemo(() => {
    if (!selectedCategory) return undefined;
    return folders.find((f) => f.slug === selectedCategory)?.title || selectedCategory;
  }, [folders, selectedCategory]);

  const handleEnableScopeWatchers = useCallback(async () => {
    if (!selectedCategory) {
      await resumeAllWatchers();
      return;
    }
    for (const w of filteredWatchers) {
      if (!w.enabled) {
        await toggleWatcher(w.id, true);
      }
    }
  }, [selectedCategory, filteredWatchers, resumeAllWatchers, toggleWatcher]);

  const cardSlots: FeedCardSlots<FeedEntry<WatcherFeedEntryMeta>> = useMemo(
    () => ({
      renderFooterActions: (entry) => {
        const busy = mutatingIds.has(entry.id);
        const isPromoted = entry.status === 'PROMOTED';
        const isDismissed = entry.status === 'DISMISSED';

        return (
          <>
            {!isDismissed && (
              <button
                type="button"
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation();
                  dismissItem(entry.id);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200/70 dark:border-white/10 transition-colors cursor-pointer disabled:opacity-50"
                title="Скрыть новость из очереди премодерации"
              >
                <EyeOff className="w-3 h-3" />
                <span>Скрыть</span>
              </button>
            )}

            {!isPromoted && (
              <button
                type="button"
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation();
                  promoteItem(entry.id);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#2481cc] hover:bg-[#1e6cb0] text-white transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                title="Отправить новость в основную шину (создать Note)"
              >
                {busy ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Send className="w-3 h-3" />
                )}
                <span>В основную шину</span>
              </button>
            )}
          </>
        );
      },
    }),
    [mutatingIds, dismissItem, promoteItem]
  );

  const detailSlots: FeedDetailSlots<FeedEntry<WatcherFeedEntryMeta>> = useMemo(
    () => ({
      renderFooterLeft: (entry) => {
        const busy = mutatingIds.has(entry.id);
        const isPromoted = entry.status === 'PROMOTED';
        const isDismissed = entry.status === 'DISMISSED';

        return (
          <>
            {!isPromoted && (
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  const res = await promoteItem(entry.id);
                  if (res?.item) {
                    setSelectedEntry(watcherScenarioAdapter.mapItem(res.item));
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>В основную шину (Note)</span>
              </button>
            )}

            {!isDismissed && (
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  await dismissItem(entry.id);
                  setSelectedEntry(null);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Скрыть</span>
              </button>
            )}
          </>
        );
      },
    }),
    [mutatingIds, promoteItem, dismissItem]
  );

  const content = (
    <>
      <WatchersHeader
        embedded={embedded}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
        notesFeedUrl={notesFeedUrl}
        onSwitchToNotesEnv={onSwitchToNotesEnv}
        sseStatus={sseStatus}
        lastHeartbeatAt={lastHeartbeatAt}
        watchersCount={watchers.length}
        activeWatchersCount={activeWatchersCount}
        onOpenWatchersManager={handleOpenManager}
        isTriggeringAll={isTriggeringAll}
        onTriggerAll={triggerAll}
        isLoading={isLoading}
        onRefresh={refresh}
        statusFilter={statusFilter}
        onStatusChange={(st) => {
          clearSelection();
          setStatusFilter(st);
        }}
        counts={counts}
        filteredWatchers={filteredWatchers}
        selectedWatcher={selectedWatcher}
        onWatcherChange={setSelectedWatcher}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        folders={folders}
        selectedCategory={selectedCategory}
        onCategoryChange={(slug) => {
          setSelectedCategory(slug);
          setSelectedWatcher('');
        }}
        chipsEndContent={chipsEndContent}
      />

      <WatchersStatusBanner
        totalWatchers={filteredWatchers.length}
        activeWatchers={activeInScopeCount}
        selectedCategoryTitle={selectedCategoryTitle}
        isBulkMutating={isBulkWatchersMutating || togglingWatcherIds.size > 0}
        onResumeAll={handleEnableScopeWatchers}
        onOpenManager={() => setManagerOpen(true)}
      />

      <CoreLiveUpdatesBanner
        count={pendingLiveCount}
        label={`В потоке появились новые новости: +${pendingLiveCount}`}
        onApply={applyPendingLive}
        onDismiss={dismissPendingLive}
      />

      {entries.length > 0 && (
        <div className="h-[42px] flex items-center justify-between gap-2 px-3 rounded-xl bg-white/80 dark:bg-[#17212b]/80 border border-slate-200/80 dark:border-white/[0.08] text-xs">
          <button
            type="button"
            onClick={() =>
              selectedCount === entries.length
                ? clearSelection()
                : selectAll(entries.map((e) => e.id))
            }
            className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-[#2481cc] font-medium cursor-pointer whitespace-nowrap"
          >
            <CheckSquare className="w-3.5 h-3.5 shrink-0" />
            <span>
              {selectedCount === entries.length
                ? 'Снять выделение'
                : `Выбрать все (${entries.length})`}
            </span>
          </button>

          <span
            className={`font-mono text-[#2481cc] font-semibold tabular-nums whitespace-nowrap transition-opacity duration-150 ${
              selectedCount > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none select-none'
            }`}
            aria-hidden={selectedCount === 0}
          >
            Выбрано: {selectedCount}
          </span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-3">
          <span>{error}</span>
          <button
            type="button"
            onClick={refresh}
            className="px-3 py-1 rounded-lg bg-rose-600 text-white font-semibold cursor-pointer"
          >
            Повторить
          </button>
        </div>
      )}

      <CoreFeedStream
        entries={entries}
        isLoading={isLoading}
        loadingLabel="Подключение к потоку Lemon Watchers..."
        emptyTitle="Очередь премодерации пуста"
        emptyDescription="Новые новости появятся здесь автоматически по SSE, как только вотчеры получат свежие публикации."
        cardSlots={cardSlots}
        onOpenDetail={handleOpenDetail}
        onSelectTag={handleSelectTag}
        selectable
        isSelected={isSelected}
        onToggleSelect={toggleSelect}
        hasNextPage={hasMore}
        isFetchingNextPage={isLoadingMore}
        onLoadMore={loadMore}
      />
    </>
  );

  return (
    <>
      {embedded ? (
        <div className="w-full space-y-4 pb-16">{content}</div>
      ) : (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0e1621] text-slate-800 dark:text-[#e2e2e2] transition-colors">
          <main className="max-w-4xl mx-auto px-3 pt-4 pb-20 sm:px-5 sm:pt-6 space-y-4">
            {content}
          </main>
        </div>
      )}

      <WatchersBatchBar
        selectedCount={selectedCount}
        totalCount={entries.length}
        isBatchMutating={isBatchMutating}
        onClearSelection={clearSelection}
        onBatchDismiss={handleBatchDismiss}
        onBatchPromote={handleBatchPromote}
      />

      <WatchersManagerModal
        isOpen={isManagerOpen}
        onClose={() => {
          setManagerCategory(undefined);
          setManagerOpen(false);
        }}
        folders={folders}
        watchers={watchers}
        initialCategory={managerCategory ?? selectedCategory}
        togglingWatcherIds={togglingWatcherIds}
        triggeringWatcherIds={triggeringWatcherIds}
        isBulkMutating={isBulkWatchersMutating}
        onToggleWatcher={toggleWatcher}
        onTriggerWatcher={triggerWatcher}
        onResumeAll={resumeAllWatchers}
        onPauseAll={pauseAllWatchers}
        onValidateFeed={validateFeed}
        onCreateWatcher={createWatcher}
      />

      <CoreFeedDetailModal
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
        slots={detailSlots}
        onSelectTag={(tag) => setSearchQuery(tag)}
        disableEscClose={isManagerOpen}
      />
    </>
  );
};
