import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Pause,
  Play,
  Plus,
  Radio,
  RefreshCw,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  CreateWatcherInput,
  ValidateWatcherFeedResult,
  WatcherFolder,
  WatcherPingRecord,
  WatcherState,
} from '../types';

export interface WatchersManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: WatcherFolder[];
  watchers: WatcherState[];
  initialCategory?: string;
  togglingWatcherIds: Set<string>;
  triggeringWatcherIds: Set<string>;
  isBulkMutating: boolean;
  onToggleWatcher: (idOrSlug: string, enabled: boolean) => Promise<any>;
  onTriggerWatcher: (idOrSlug: string) => Promise<WatcherPingRecord>;
  onResumeAll: () => Promise<any>;
  onPauseAll: () => Promise<any>;
  onValidateFeed: (
    url: string,
    protocol: 'rss' | 'atom' | 'json'
  ) => Promise<ValidateWatcherFeedResult>;
  onCreateWatcher: (input: CreateWatcherInput) => Promise<any>;
}

export const WatchersManagerModal: React.FC<WatchersManagerModalProps> = ({
  isOpen,
  onClose,
  folders,
  watchers,
  initialCategory = '',
  togglingWatcherIds,
  triggeringWatcherIds,
  isBulkMutating,
  onToggleWatcher,
  onTriggerWatcher,
  onResumeAll,
  onPauseAll,
  onValidateFeed,
  onCreateWatcher,
}) => {
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newCategory, setNewCategory] = useState('ai');
  const [newProtocol, setNewProtocol] = useState<'rss' | 'atom' | 'json'>('rss');
  const [isAdding, setIsAdding] = useState(false);
  const [validationState, setValidationState] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCategoryFilter(initialCategory);
      setNewCategory(initialCategory || folders[0]?.slug || 'ai');
      setActionNotice(null);
      setValidationState(null);
    }
  }, [isOpen, initialCategory, folders]);

  // AGENTS.md §7: Escape key listener with reliable cleanup
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const folderMap = useMemo(() => {
    const map = new Map<string, WatcherFolder>();
    for (const f of folders) map.set(f.slug, f);
    return map;
  }, [folders]);

  const visibleWatchers = useMemo(() => {
    if (!categoryFilter) return watchers;
    return watchers.filter((w) => w.category === categoryFilter);
  }, [watchers, categoryFilter]);

  const activeCount = useMemo(
    () => watchers.filter((w) => w.enabled).length,
    [watchers]
  );

  if (!isOpen) return null;

  const handleTrigger = async (w: WatcherState) => {
    setActionNotice(null);
    try {
      const ping = await onTriggerWatcher(w.id);
      setActionNotice(
        ping.error
          ? `${w.title}: ошибка (${ping.error})`
          : `${w.title}: найдено ${ping.itemsFound}, новых +${ping.newItemsCount}`
      );
    } catch (err: any) {
      setActionNotice(`${w.title}: ${err?.message || 'ошибка опроса'}`);
    }
  };

  const handleValidate = async () => {
    if (!newUrl.trim()) return;
    setValidationState('Проверка ленты...');
    try {
      const res = await onValidateFeed(newUrl.trim(), newProtocol);
      setValidationState(
        res.valid
          ? `OK (HTTP ${res.statusCode ?? 200}, записей: ${res.itemsCount ?? 0})`
          : `Ошибка: ${res.error || 'недоступна'}`
      );
    } catch (err: any) {
      setValidationState(`Ошибка: ${err?.message || 'не удалось проверить'}`);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim() || isAdding) return;
    setIsAdding(true);
    try {
      await onCreateWatcher({
        title: newTitle.trim(),
        url: newUrl.trim(),
        category: newCategory,
        feedSlug: `spark-${newCategory}`,
        protocol: newProtocol,
        enabled: true,
      });
      setNewTitle('');
      setNewUrl('');
      setShowAddForm(false);
      setValidationState(null);
      setActionNotice('Источник добавлен и включён.');
    } catch (err: any) {
      setValidationState(`Ошибка создания: ${err?.message || 'неизвестная ошибка'}`);
    } finally {
      setIsAdding(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Управление вотчерами"
    >
      <div
        className="w-full max-w-3xl max-h-[88vh] rounded-2xl bg-white dark:bg-[#17212b] border border-slate-200 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#2481cc]/15 text-[#2481cc] flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-none">
                Источники Lemon Watchers
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Активно {activeCount} из {watchers.length} · включение, пауза и ручной опрос
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
            aria-label="Закрыть управление вотчерами"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-slate-200/80 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setCategoryFilter('')}
              className={`px-2.5 py-1 rounded-full font-medium cursor-pointer border ${
                categoryFilter === ''
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-white/10'
              }`}
            >
              Все ({watchers.length})
            </button>
            {folders.map((folder) => {
              const count = watchers.filter((w) => w.category === folder.slug).length;
              const active = categoryFilter === folder.slug;
              return (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => {
                    setCategoryFilter(folder.slug);
                    setNewCategory(folder.slug);
                  }}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-medium cursor-pointer border ${
                    active
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent'
                      : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-white/10'
                  }`}
                >
                  <span>{folder.icon}</span>
                  <span>{folder.title}</span>
                  <span className="opacity-70 font-mono text-[10px]">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={isBulkMutating}
              onClick={onResumeAll}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Включить все</span>
            </button>
            <button
              type="button"
              disabled={isBulkMutating}
              onClick={onPauseAll}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/15 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 font-medium cursor-pointer disabled:opacity-50"
            >
              <Pause className="w-3 h-3" />
              <span>Пауза все</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm((prev) => !prev)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#2481cc]/10 hover:bg-[#2481cc]/20 text-[#2481cc] dark:text-[#64b5f6] font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Добавить RSS</span>
            </button>
          </div>
        </div>

        {actionNotice && (
          <div className="mx-5 mt-3 px-3 py-2 rounded-xl bg-[#2481cc]/10 border border-[#2481cc]/25 text-xs text-[#1e6cb0] dark:text-[#64b5f6] flex items-center justify-between gap-2">
            <span>{actionNotice}</span>
            <button type="button" onClick={() => setActionNotice(null)} className="cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {showAddForm && (
          <form
            onSubmit={handleCreate}
            className="mx-5 mt-3 p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121922] space-y-2.5 text-xs"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Название источника"
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#17212b] border border-slate-200 dark:border-white/10"
              />
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#17212b] border border-slate-200 dark:border-white/10"
              >
                {folders.map((f) => (
                  <option key={f.id} value={f.slug}>
                    {f.icon} {f.title}
                  </option>
                ))}
              </select>
              <select
                value={newProtocol}
                onChange={(e) => setNewProtocol(e.target.value as 'rss' | 'atom' | 'json')}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#17212b] border border-slate-200 dark:border-white/10"
              >
                <option value="rss">RSS</option>
                <option value="atom">Atom</option>
                <option value="json">JSON Feed</option>
              </select>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                required
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://example.com/rss.xml"
                className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-[#17212b] border border-slate-200 dark:border-white/10"
              />
              <button
                type="button"
                onClick={handleValidate}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/10 font-medium cursor-pointer"
              >
                Проверить
              </button>
              <button
                type="submit"
                disabled={isAdding}
                className="px-3 py-1.5 rounded-lg bg-[#2481cc] hover:bg-[#1e6cb0] text-white font-semibold cursor-pointer disabled:opacity-50"
              >
                {isAdding ? 'Добавление...' : 'Создать'}
              </button>
            </div>
            {validationState && (
              <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300">
                {validationState}
              </div>
            )}
          </form>
        )}

        <div className="flex-1 overflow-y-auto p-5 space-y-2.5 touch-scroll">
          {visibleWatchers.map((w) => {
            const isToggling = togglingWatcherIds.has(w.id) || togglingWatcherIds.has(w.slug);
            const isTriggering =
              triggeringWatcherIds.has(w.id) || triggeringWatcherIds.has(w.slug);
            const folder = folderMap.get(w.category);

            return (
              <div
                key={w.id}
                className="p-3 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {w.title}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-slate-200/70 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                      {folder ? `${folder.icon} ${folder.title}` : w.category}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                        w.enabled
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-slate-500/15 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {w.enabled ? (
                        <CheckCircle2 className="w-2.5 h-2.5" />
                      ) : (
                        <Pause className="w-2.5 h-2.5" />
                      )}
                      <span>{w.enabled ? w.status : 'PAUSED'}</span>
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-3 flex-wrap font-mono">
                    <span>Собрано: {w.totalItemsIngested}</span>
                    <span>
                      Пинг:{' '}
                      {w.lastPingAt
                        ? new Date(w.lastPingAt).toLocaleString('ru-RU')
                        : 'ещё не было'}
                    </span>
                  </div>

                  {w.lastError && (
                    <div className="inline-flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span className="truncate max-w-md">{w.lastError}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={isTriggering}
                    onClick={() => handleTrigger(w)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/10 font-medium cursor-pointer disabled:opacity-50"
                    title="Принудительно опросить этот источник"
                  >
                    <RefreshCw className={`w-3 h-3 ${isTriggering ? 'animate-spin' : ''}`} />
                    <span>Опросить</span>
                  </button>

                  <button
                    type="button"
                    disabled={isToggling}
                    onClick={() => onToggleWatcher(w.id, !w.enabled)}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold cursor-pointer disabled:opacity-50 transition-colors ${
                      w.enabled
                        ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    {isToggling ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : w.enabled ? (
                      <Pause className="w-3 h-3" />
                    ) : (
                      <Radio className="w-3 h-3" />
                    )}
                    <span>{w.enabled ? 'Пауза' : 'Включить'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
};
