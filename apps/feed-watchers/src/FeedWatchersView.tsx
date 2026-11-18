import React, { useCallback, useMemo, useState } from 'react';
import {
  CheckSquare,
  EyeOff,
  Loader2,
  Moon,
  Newspaper,
  Radio,
  RefreshCw,
  Search,
  Send,
  Sun,
  X,
  Zap,
} from 'lucide-react';
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
import { StreamNewsStatus } from './types';

export interface FeedWatchersViewProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
  notesFeedUrl?: string;
  onSwitchToNotesEnv?: () => void;
}

const STATUS_TABS: Array<{ id: StreamNewsStatus | 'ALL'; label: string }> = [
  { id: 'NEW', label: 'Новые' },
  { id: 'PROMOTED', label: 'В шине' },
  { id: 'DISMISSED', label: 'Скрытые' },
  { id: 'ALL', label: 'Все' },
];

export const FeedWatchersView: React.FC<FeedWatchersViewProps> = ({
  isDarkMode,
  toggleTheme,
  notesFeedUrl,
  onSwitchToNotesEnv,
}) => {
  const {
    folders,
    watchers,
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
    promoteItem,
    batchPromote,
    dismissItem,
    batchDismiss,
    triggerAll,
    isTriggeringAll,
  } = useWatchersStream();

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

  const getTabCount = (tabId: StreamNewsStatus | 'ALL'): number => {
    switch (tabId) {
      case 'NEW':
        return counts.newCount;
      case 'PROMOTED':
        return counts.promotedCount;
      case 'DISMISSED':
        return counts.dismissedCount;
      case 'ALL':
        return counts.totalCount;
      default:
        return 0;
    }
  };

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

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0e1621] text-slate-800 dark:text-[#e2e2e2] transition-colors">
      <main className="max-w-4xl mx-auto px-3 pt-4 pb-20 sm:px-5 sm:pt-6 space-y-4">
        <header className="rounded-2xl bg-white/95 dark:bg-[#18222d]/95 backdrop-blur-md border border-slate-200/80 dark:border-white/[0.08] p-4 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-500">
                <Newspaper className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Lemon Watchers
                  </h1>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                      sseStatus === 'connected'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    }`}
                    title={
                      lastHeartbeatAt
                        ? `Последний SSE heartbeat: ${new Date(lastHeartbeatAt).toLocaleTimeString('ru-RU')}`
                        : 'Ожидание SSE heartbeat'
                    }
                  >
                    <Radio
                      className={`w-2.5 h-2.5 ${sseStatus === 'connected' ? 'animate-pulse' : ''}`}
                    />
                    <span>{sseStatus === 'connected' ? 'SSE LIVE' : sseStatus.toUpperCase()}</span>
                    {lastHeartbeatAt && (
                      <span className="opacity-75 font-normal">
                        · {new Date(lastHeartbeatAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    )}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Новостной поток премодерации перед попаданием в Notes
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {onSwitchToNotesEnv ? (
                <button
                  type="button"
                  onClick={onSwitchToNotesEnv}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Перейти в Notes
                </button>
              ) : notesFeedUrl ? (
                <a
                  href={notesFeedUrl}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                >
                  Notes Feed
                </a>
              ) : null}

              <button
                type="button"
                disabled={isTriggeringAll}
                onClick={triggerAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                title="Принудительно опросить все активные вотчеры"
              >
                <Zap className={`w-3.5 h-3.5 ${isTriggeringAll ? 'animate-pulse' : ''}`} />
                <span>Опросить все</span>
              </button>

              <button
                type="button"
                onClick={refresh}
                className="p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title="Обновить ленту"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Переключить тему"
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            <div className="flex items-center gap-1.5 flex-wrap">
              {STATUS_TABS.map((tab) => {
                const active = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      clearSelection();
                      setStatusFilter(tab.id);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#2481cc] text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                        active ? 'bg-white/20 text-white' : 'bg-black/5 dark:bg-white/10'
                      }`}
                    >
                      {getTabCount(tab.id)}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              {filteredWatchers.length > 0 && (
                <select
                  value={selectedWatcher}
                  onChange={(e) => setSelectedWatcher(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl text-xs bg-slate-100 dark:bg-[#0e1621] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 max-w-[190px]"
                >
                  <option value="">Все источники</option>
                  {filteredWatchers.map((w) => (
                    <option key={w.id} value={w.slug}>
                      {w.title}
                    </option>
                  ))}
                </select>
              )}

              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по заголовку..."
                  className="w-full pl-8 pr-7 py-1.5 rounded-xl text-xs bg-slate-100 dark:bg-[#0e1621] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#2481cc]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {folders.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 touch-scroll">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('');
                  setSelectedWatcher('');
                }}
                className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 transition-colors cursor-pointer border ${
                  selectedCategory === ''
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                Все темы
              </button>
              {folders.map((folder) => {
                const active = selectedCategory === folder.slug;
                return (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(folder.slug);
                      setSelectedWatcher('');
                    }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium shrink-0 transition-colors cursor-pointer border ${
                      active
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent'
                        : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10'
                    }`}
                  >
                    <span>{folder.icon}</span>
                    <span>{folder.title}</span>
                  </button>
                );
              })}
            </div>
          )}
        </header>

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
      </main>

      {selectedCount > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] max-w-xl">
          <div className="rounded-2xl bg-white/95 dark:bg-[#18222d]/95 backdrop-blur-md border border-[#2481cc]/35 shadow-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono font-bold text-[#2481cc] tabular-nums whitespace-nowrap">
                Выбрано: {selectedCount}
              </span>
              <span className="text-slate-400 dark:text-slate-500 font-mono tabular-nums hidden sm:inline">
                / {entries.length}
              </span>
              <button
                type="button"
                onClick={clearSelection}
                className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline cursor-pointer whitespace-nowrap ml-1"
              >
                Снять
              </button>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={isBatchMutating}
                onClick={handleBatchDismiss}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/10 font-medium cursor-pointer whitespace-nowrap transition-colors disabled:opacity-50"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Скрыть ({selectedCount})</span>
              </button>
              <button
                type="button"
                disabled={isBatchMutating}
                onClick={handleBatchPromote}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#2481cc] hover:bg-[#1e6cb0] text-white font-semibold cursor-pointer whitespace-nowrap transition-colors shadow-xs disabled:opacity-50"
              >
                {isBatchMutating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>В шину ({selectedCount})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <CoreFeedDetailModal
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
        slots={detailSlots}
        onSelectTag={(tag) => setSearchQuery(tag)}
      />
    </div>
  );
};
