import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Pause,
  Pencil,
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

export function getChannelBrandDomain(url?: string, title?: string): string {
  const t = (title || '').toLowerCase();
  const u = (url || '').toLowerCase();

  // Known brand mappings for feeds hosted elsewhere (e.g. GitHub RSS, Feedburner, etc.)
  if (t.includes('anthropic') || u.includes('anthropic')) return 'anthropic.com';
  if (t.includes('deepmind') || u.includes('deepmind')) return 'deepmind.google';
  if (t.includes('openai') || u.includes('openai')) return 'openai.com';
  if (t.includes('hugging face') || t.includes('huggingface') || u.includes('huggingface')) return 'huggingface.co';
  if (t.includes('localllama') || u.includes('reddit.com')) return 'reddit.com';
  if (t.includes('krebs') || u.includes('krebsonsecurity')) return 'krebsonsecurity.com';
  if (t.includes('sophos') || u.includes('sophos')) return 'sophos.com';
  if (t.includes('cisa') || u.includes('cisa.gov')) return 'cisa.gov';
  if (t.includes('threatpost') || u.includes('threatpost')) return 'threatpost.com';
  if (t.includes('securitylab') || u.includes('securitylab')) return 'securitylab.ru';
  if (t.includes('хабр') || t.includes('habr') || u.includes('habr.com')) return 'habr.com';
  if (t.includes('tproger') || u.includes('tproger')) return 'tproger.ru';
  if (t.includes('opennet') || u.includes('opennet')) return 'opennet.ru';
  if (t.includes('selectel') || u.includes('selectel')) return 'selectel.ru';
  if (t.includes('proglib') || u.includes('proglib')) return 'proglib.io';
  if (t.includes('servernews') || u.includes('servernews')) return 'servernews.ru';
  if (t.includes('cnews') || u.includes('cnews')) return 'cnews.ru';
  if (t.includes('компьютерра') || t.includes('computerra') || u.includes('computerra')) return 'computerra.ru';
  if (t.includes('тасс') || t.includes('tass') || u.includes('tass.')) return 'tass.ru';
  if (t.includes('риа') || t.includes('ria') || u.includes('ria.ru')) return 'ria.ru';
  if (t.includes('рбк') || t.includes('rbc') || u.includes('rbc.ru')) return 'rbc.ru';
  if (t.includes('3dnews') || u.includes('3dnews')) return '3dnews.ru';
  if (t.includes('verge') || u.includes('theverge')) return 'theverge.com';
  if (t.includes('arstechnica') || u.includes('arstechnica')) return 'arstechnica.com';

  if (!url) return '';
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

export function getFaviconUrl(url?: string, title?: string): string {
  const domain = getChannelBrandDomain(url, title);
  if (!domain) return '';
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

export function isEmojiString(str?: string): boolean {
  if (!str) return false;
  const trimmed = str.trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('data:')
  ) {
    return false;
  }
  return trimmed.length <= 4;
}

export const ChannelIcon: React.FC<{
  icon?: string;
  url?: string;
  title: string;
  folderIcon?: string;
  size?: 'sm' | 'md';
}> = ({ icon, url, title, folderIcon = '📡', size = 'md' }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const sizeClasses = size === 'sm' ? 'w-6 h-6 rounded-lg' : 'w-9 h-9 sm:w-10 sm:h-10 rounded-xl';
  const imgSizeClasses = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5 sm:w-6 sm:h-6';
  const textSize = size === 'sm' ? 'text-xs' : 'text-base sm:text-lg';

  useEffect(() => {
    setImgFailed(false);
  }, [icon, url, title]);

  const hasImageUrl = icon && !isEmojiString(icon);
  const brandFaviconUrl = getFaviconUrl(url, title);
  const imageSrc = !imgFailed ? (hasImageUrl ? icon : brandFaviconUrl) : '';

  if (imageSrc) {
    return (
      <div className={`${sizeClasses} bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex items-center justify-center shrink-0 overflow-hidden shadow-xs`}>
        <img
          src={imageSrc}
          alt={title}
          className={`${imgSizeClasses} object-contain`}
          onError={() => setImgFailed(true)}
          loading="lazy"
        />
      </div>
    );
  }

  if (icon && isEmojiString(icon)) {
    return (
      <div className={`${sizeClasses} bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex items-center justify-center shrink-0 shadow-xs select-none`}>
        <span className={`${textSize} leading-none`}>{icon}</span>
      </div>
    );
  }

  return (
    <div className={`${sizeClasses} bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex items-center justify-center shrink-0 shadow-xs select-none`}>
      <span className={`${textSize} leading-none`}>{folderIcon}</span>
    </div>
  );
};

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
  onUpdateWatcher?: (idOrSlug: string, patch: Partial<WatcherState>) => Promise<any>;
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
  onUpdateWatcher,
}) => {
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newCategory, setNewCategory] = useState('ai');
  const [newProtocol, setNewProtocol] = useState<'rss' | 'atom' | 'json'>('rss');
  const [newIcon, setNewIcon] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [validationState, setValidationState] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Edit channel / record state
  const [editingWatcherId, setEditingWatcherId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editCategory, setEditCategory] = useState('ai');
  const [editProtocol, setEditProtocol] = useState<'rss' | 'atom' | 'json'>('rss');
  const [editIcon, setEditIcon] = useState('');
  const [editPollIntervalMinutes, setEditPollIntervalMinutes] = useState(15);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editValidationState, setEditValidationState] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCategoryFilter(initialCategory);
      setNewCategory(initialCategory || folders[0]?.slug || 'ai');
      setActionNotice(null);
      setValidationState(null);
      setEditingWatcherId(null);
      setEditValidationState(null);
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
        icon: newIcon.trim() || undefined,
        enabled: true,
      });
      setNewTitle('');
      setNewUrl('');
      setNewIcon('');
      setShowAddForm(false);
      setValidationState(null);
      setActionNotice('Источник добавлен и включён.');
    } catch (err: any) {
      setValidationState(`Ошибка создания: ${err?.message || 'неизвестная ошибка'}`);
    } finally {
      setIsAdding(false);
    }
  };

  const handleStartEdit = (w: WatcherState) => {
    setEditingWatcherId(w.id);
    setEditTitle(w.title);
    setEditUrl(w.url || '');
    setEditCategory(w.category);
    setEditProtocol((w.protocol as 'rss' | 'atom' | 'json') || 'rss');
    setEditIcon(w.icon || '');
    setEditPollIntervalMinutes(Math.round((w.pollIntervalSeconds || 900) / 60));
    setEditValidationState(null);
  };

  const handleCancelEdit = () => {
    setEditingWatcherId(null);
    setEditValidationState(null);
  };

  const handleValidateEdit = async () => {
    if (!editUrl.trim()) return;
    setEditValidationState('Проверка ленты...');
    try {
      const res = await onValidateFeed(editUrl.trim(), editProtocol);
      setEditValidationState(
        res.valid
          ? `OK (HTTP ${res.statusCode ?? 200}, записей: ${res.itemsCount ?? 0})`
          : `Ошибка: ${res.error || 'недоступна'}`
      );
    } catch (err: any) {
      setEditValidationState(`Ошибка: ${err?.message || 'не удалось проверить'}`);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWatcherId || !editTitle.trim() || !editUrl.trim() || isSavingEdit) return;
    if (!onUpdateWatcher) {
      setEditValidationState('Обновление не поддерживается');
      return;
    }
    setIsSavingEdit(true);
    try {
      await onUpdateWatcher(editingWatcherId, {
        title: editTitle.trim(),
        url: editUrl.trim(),
        category: editCategory,
        feedSlug: `spark-${editCategory}`,
        protocol: editProtocol,
        pollIntervalSeconds: editPollIntervalMinutes * 60,
        icon: editIcon.trim() || undefined,
      });
      setEditingWatcherId(null);
      setActionNotice(`Запись «${editTitle.trim()}» успешно обновлена.`);
    } catch (err: any) {
      setEditValidationState(`Ошибка сохранения: ${err?.message || 'не удалось сохранить'}`);
    } finally {
      setIsSavingEdit(false);
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
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Название источника"
                className="sm:col-span-2 px-3 py-1.5 rounded-lg bg-white dark:bg-[#17212b] border border-slate-200 dark:border-white/10"
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="url"
                required
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://example.com/rss.xml"
                className="sm:col-span-2 px-3 py-1.5 rounded-lg bg-white dark:bg-[#17212b] border border-slate-200 dark:border-white/10 font-mono text-xs"
              />
              <div className="flex items-center gap-2">
                <ChannelIcon icon={newIcon} url={newUrl} title={newTitle} folderIcon={folderMap.get(newCategory)?.icon} size="sm" />
                <input
                  type="text"
                  value={newIcon}
                  onChange={(e) => setNewIcon(e.target.value)}
                  placeholder="Иконка (URL или эмодзи)"
                  className="flex-1 min-w-0 px-3 py-1.5 rounded-lg bg-white dark:bg-[#17212b] border border-slate-200 dark:border-white/10"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
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

            if (editingWatcherId === w.id) {
              return (
                <form
                  key={w.id}
                  onSubmit={handleSaveEdit}
                  className="p-3.5 rounded-xl border border-[#2481cc]/50 bg-slate-50 dark:bg-[#121922] space-y-3 text-xs shadow-md"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                      <Pencil className="w-3.5 h-3.5 text-[#2481cc]" />
                      <span>Редактирование записи</span>
                    </div>
                    <ChannelIcon icon={editIcon} url={editUrl} title={editTitle} folderIcon={folderMap.get(editCategory)?.icon} size="sm" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-medium">Название источника *</label>
                      <input
                        type="text"
                        required
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Название источника"
                        className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#17212b] border border-slate-200 dark:border-white/10"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-medium">Папка (категория) *</label>
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#17212b] border border-slate-200 dark:border-white/10"
                      >
                        {folders.map((f) => (
                          <option key={f.id} value={f.slug}>
                            {f.icon} {f.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-medium">Протокол</label>
                      <select
                        value={editProtocol}
                        onChange={(e) => setEditProtocol(e.target.value as 'rss' | 'atom' | 'json')}
                        className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#17212b] border border-slate-200 dark:border-white/10"
                      >
                        <option value="rss">RSS</option>
                        <option value="atom">Atom</option>
                        <option value="json">JSON Feed</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-medium">URL ленты *</label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          required
                          value={editUrl}
                          onChange={(e) => setEditUrl(e.target.value)}
                          placeholder="https://example.com/rss.xml"
                          className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-[#17212b] border border-slate-200 dark:border-white/10 font-mono text-xs"
                        />
                        <button
                          type="button"
                          onClick={handleValidateEdit}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/10 font-medium cursor-pointer whitespace-nowrap"
                        >
                          Проверить
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-medium">Иконка (эмодзи или URL)</label>
                      <input
                        type="text"
                        value={editIcon}
                        onChange={(e) => setEditIcon(e.target.value)}
                        placeholder="🧠 или URL"
                        className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#17212b] border border-slate-200 dark:border-white/10"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-medium">Интервал опроса (минуты)</label>
                      <input
                        type="number"
                        min={1}
                        max={1440}
                        value={editPollIntervalMinutes}
                        onChange={(e) => setEditPollIntervalMinutes(Number(e.target.value) || 15)}
                        className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#17212b] border border-slate-200 dark:border-white/10"
                      />
                    </div>
                  </div>

                  {editValidationState && (
                    <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300">
                      {editValidationState}
                    </div>
                  )}

                  <div className="flex justify-end items-center gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/10 font-medium cursor-pointer"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingEdit}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#2481cc] hover:bg-[#1e6cb0] text-white font-semibold cursor-pointer disabled:opacity-50"
                    >
                      {isSavingEdit && <Loader2 className="w-3 h-3 animate-spin" />}
                      <span>Сохранить изменения</span>
                    </button>
                  </div>
                </form>
              );
            }

            return (
              <div
                key={w.id}
                className="p-3 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                  <ChannelIcon
                    icon={w.icon}
                    url={w.url}
                    title={w.title}
                    folderIcon={folder?.icon}
                  />

                  <div className="min-w-0 space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 dark:text-white truncate">
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
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(w)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 font-medium cursor-pointer transition-colors"
                    title="Редактировать параметры источника"
                  >
                    <Pencil className="w-3 h-3 text-[#2481cc]" />
                    <span className="hidden sm:inline">Редактировать</span>
                  </button>

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
