import React, { useMemo } from 'react';
import {
  Moon,
  Newspaper,
  Radio,
  RefreshCw,
  Search,
  Settings,
  SlidersHorizontal,
  Sun,
  X,
  Zap,
} from 'lucide-react';
import { CoreChipBar, CoreChipItem } from '@feed-core';
import {
  StreamCounts,
  StreamNewsStatus,
  WatcherFolder,
  WatcherState,
} from '../types';

const STATUS_TABS: Array<{ id: StreamNewsStatus | 'ALL'; label: string }> = [
  { id: 'NEW', label: 'Новые' },
  { id: 'PROMOTED', label: 'В шине' },
  { id: 'DISMISSED', label: 'Скрытые' },
  { id: 'ALL', label: 'Все' },
];

export interface WatchersHeaderProps {
  embedded?: boolean;
  isDarkMode: boolean;
  toggleTheme: () => void;
  notesFeedUrl?: string;
  onSwitchToNotesEnv?: () => void;
  sseStatus: string;
  lastHeartbeatAt: string | null;
  watchersCount: number;
  activeWatchersCount: number;
  onOpenWatchersManager: (categorySlug?: string) => void;
  isTriggeringAll: boolean;
  onTriggerAll: () => void;
  isLoading: boolean;
  onRefresh: () => void;
  statusFilter: StreamNewsStatus | 'ALL';
  onStatusChange: (status: StreamNewsStatus | 'ALL') => void;
  counts: StreamCounts;
  filteredWatchers: WatcherState[];
  selectedWatcher: string;
  onWatcherChange: (slug: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  folders: WatcherFolder[];
  selectedCategory: string;
  onCategoryChange: (slug: string) => void;
  chipsEndContent?: React.ReactNode;
}

export const WatchersHeader: React.FC<WatchersHeaderProps> = ({
  embedded = false,
  isDarkMode,
  toggleTheme,
  notesFeedUrl,
  onSwitchToNotesEnv,
  sseStatus,
  lastHeartbeatAt,
  watchersCount,
  activeWatchersCount,
  onOpenWatchersManager,
  isTriggeringAll,
  onTriggerAll,
  isLoading,
  onRefresh,
  statusFilter,
  onStatusChange,
  counts,
  filteredWatchers,
  selectedWatcher,
  onWatcherChange,
  searchQuery,
  onSearchChange,
  folders,
  selectedCategory,
  onCategoryChange,
  chipsEndContent,
}) => {
  const chipItems: CoreChipItem[] = useMemo(
    () =>
      folders.map((folder) => ({
        id: folder.slug,
        label: folder.title,
        icon: <span>{folder.icon}</span>,
        title: folder.description,
      })),
    [folders]
  );

  const activeFolderTitle = useMemo(() => {
    if (!selectedCategory) return null;
    return folders.find((f) => f.slug === selectedCategory)?.title || selectedCategory;
  }, [folders, selectedCategory]);
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

  return (
    <header className="rounded-2xl bg-white/95 dark:bg-[#18222d]/95 backdrop-blur-md border border-slate-200/80 dark:border-white/[0.08] p-4 shadow-xs space-y-3.5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-500">
            <Newspaper className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
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
                    ·{' '}
                    {new Date(lastHeartbeatAt).toLocaleTimeString('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
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
          {!embedded &&
            (onSwitchToNotesEnv ? (
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
            ) : null)}

          <button
            type="button"
            onClick={() => onOpenWatchersManager(selectedCategory)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
              activeWatchersCount > 0
                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/15'
            }`}
            title="Управление источниками (включение, пауза, опрос и добавление вотчеров)"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Источники</span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10">
              {activeWatchersCount}/{watchersCount}
            </span>
          </button>

          <button
            type="button"
            disabled={isTriggeringAll}
            onClick={onTriggerAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            title="Принудительно опросить все активные вотчеры"
          >
            <Zap className={`w-3.5 h-3.5 ${isTriggeringAll ? 'animate-pulse' : ''}`} />
            <span>Опросить все</span>
          </button>

          <button
            type="button"
            onClick={onRefresh}
            className="p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Обновить ленту"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {!embedded && (
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Переключить тему"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}
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
                onClick={() => onStatusChange(tab.id)}
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
              onChange={(e) => onWatcherChange(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl text-xs bg-slate-100 dark:bg-[#0e1621] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 max-w-[190px]"
            >
              <option value="">Все источники</option>
              {filteredWatchers.map((w) => (
                <option key={w.id} value={w.slug}>
                  {w.enabled ? '● ' : '⏸ '}
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
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Поиск по заголовку..."
              className="w-full pl-8 pr-7 py-1.5 rounded-xl text-xs bg-slate-100 dark:bg-[#0e1621] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#2481cc]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {folders.length > 0 && (
        <CoreChipBar
          items={chipItems}
          selectedId={selectedCategory}
          onSelect={onCategoryChange}
          allChip={{ id: '', label: 'Все темы' }}
          endContent={chipsEndContent}
          renderEnd={(activeCat) => (
            <button
              type="button"
              onClick={() => onOpenWatchersManager(activeCat)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium shrink-0 transition-colors cursor-pointer border border-dashed border-slate-300 dark:border-white/20 text-slate-600 dark:text-slate-300 hover:border-[#2481cc] hover:text-[#2481cc] dark:hover:text-[#64b5f6] hover:bg-slate-100 dark:hover:bg-white/10"
              title={
                activeFolderTitle
                  ? `Настроить ресурсы темы «${activeFolderTitle}»`
                  : 'Настроить ресурсы (все темы)'
              }
              aria-label={
                activeFolderTitle
                  ? `Настроить ресурсы темы ${activeFolderTitle}`
                  : 'Настроить ресурсы всех тем'
              }
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}
        />
      )}
    </header>
  );
};
