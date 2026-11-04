import React, { useState, useEffect, useRef } from 'react';
import { Search, Image as ImageIcon, Check, X, Loader2, Film, Newspaper, Monitor, ZoomIn } from 'lucide-react';
import { WebImageResult } from '@lenta/shared';
import { notesApi } from '../../api/client';

export interface WebPosterSearchModalProps {
  open: boolean;
  onClose: () => void;
  initialQuery?: string;
  onSelectImages: (images: WebImageResult[]) => Promise<void> | void;
  zIndex?: number;
}

const QUICK_CHIPS = [
  { label: '🎬 Постер', querySuffix: 'постер' },
  { label: '📰 Новость', querySuffix: 'новость' },
  { label: '⚡ Презентация', querySuffix: 'презентация' },
  { label: '🎮 Игра', querySuffix: 'game poster' },
  { label: '📐 16:9', querySuffix: 'wallpaper 16:9' },
];

export const WebPosterSearchModal: React.FC<WebPosterSearchModalProps> = ({
  open,
  onClose,
  initialQuery = '',
  onSelectImages,
  zIndex = 1200,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<WebImageResult[]>([]);
  const [selectedMap, setSelectedMap] = useState<Map<string, WebImageResult>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoomedUrl, setZoomedUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Escape key handler
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (zoomedUrl) {
          setZoomedUrl(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, zoomedUrl, onClose]);

  // Reset or run initial search on open
  useEffect(() => {
    if (open) {
      setSelectedMap(new Map());
      setError(null);
      const cleanInitial = initialQuery.trim();
      setQuery(cleanInitial);
      if (cleanInitial) {
        performSearch(cleanInitial);
      } else {
        setResults([]);
      }
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, initialQuery]);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await notesApi.searchWebImages(searchQuery.trim(), { num: 24 });
      setResults(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Ошибка поиска в Google');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  const handleChipClick = (suffix: string) => {
    const base = initialQuery.trim() || query.trim();
    const newQuery = base ? `${base} ${suffix}` : suffix;
    setQuery(newQuery);
    performSearch(newQuery);
  };

  const toggleSelect = (item: WebImageResult) => {
    setSelectedMap((prev) => {
      const next = new Map(prev);
      if (next.has(item.imageUrl)) {
        next.delete(item.imageUrl);
      } else {
        next.set(item.imageUrl, item);
      }
      return next;
    });
  };

  const handleConfirm = async () => {
    const selectedList = Array.from(selectedMap.values());
    if (selectedList.length === 0) return;
    setIsSubmitting(true);
    try {
      await onSelectImages(selectedList);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Не удалось прикрепить изображения');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  const selectedCount = selectedMap.size;
  const selectedArray = Array.from(selectedMap.keys());

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
      style={{ zIndex }}
      onClick={onClose}
    >
      <div
        className="bg-surface-container border border-tile-border rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-tile-border bg-tile-subtle flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center text-primary">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-sm text-on-surface flex items-center gap-2">
                <span>Поиск постеров в Google</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
                  Serper • Google Images
                </span>
              </h3>
              <p className="text-[11px] font-mono text-on-surface-variant">
                Выберите один или несколько постеров. Они будут оптимизированы и сохранены локально.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar & Chips */}
        <div className="p-4 border-b border-tile-border/60 bg-surface-container-low/50 space-y-2.5">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Введите название фильма, игры или события..."
                className="w-full bg-surface-container-lowest border border-white/10 focus:border-primary rounded-xl pl-9 pr-8 py-2 text-xs font-sans text-on-surface placeholder-on-surface-variant/50 outline-none transition-colors"
              />
              <Search className="w-4 h-4 text-on-surface-variant/60 absolute left-3 top-1/2 -translate-y-1/2" />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-on-surface cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="px-4 py-2 bg-primary text-on-primary rounded-xl text-xs font-bold font-mono hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              <span>Найти</span>
            </button>
          </form>

          {/* Quick query refinement chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono text-on-surface-variant mr-1">Быстрые фильтры:</span>
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => handleChipClick(chip.querySuffix)}
                className="px-2 py-0.5 rounded-md bg-surface-container hover:bg-primary/15 border border-white/5 hover:border-primary/30 text-on-surface-variant hover:text-primary text-[11px] font-mono transition-all cursor-pointer"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Body: Grid of Results */}
        <div className="p-4 overflow-y-auto flex-1 custom-scrollbar min-h-[300px] max-h-[55vh]">
          {error && (
            <div className="p-3 mb-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-mono flex items-center justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => performSearch(query)}
                className="underline hover:text-red-300 ml-3 cursor-pointer"
              >
                Повторить
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2 text-on-surface-variant">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-xs font-mono">Ищем постеры в Google Images...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2 text-on-surface-variant text-center p-6 border border-dashed border-white/10 rounded-xl">
              <ImageIcon className="w-10 h-10 text-on-surface-variant/40" />
              <p className="text-xs font-medium text-on-surface">Постеры не найдены</p>
              <p className="text-[11px] font-mono text-on-surface-variant max-w-sm">
                Попробуйте изменить запрос или уточнить название фильма, года или бренда
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {results.map((item) => {
                const isSelected = selectedMap.has(item.imageUrl);
                const selectionIndex = selectedArray.indexOf(item.imageUrl);
                const isMainBadge = selectionIndex === 0;

                return (
                  <div
                    key={item.imageUrl}
                    onClick={() => toggleSelect(item)}
                    className={`group relative rounded-xl overflow-hidden border transition-all cursor-pointer bg-surface-container-low flex flex-col ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary/40 shadow-md scale-[1.01]'
                        : 'border-white/10 hover:border-primary/50 hover:shadow-sm'
                    }`}
                  >
                    {/* Thumbnail Image */}
                    <div className="relative aspect-[3/4] bg-black/40 overflow-hidden">
                      <img
                        src={item.thumbnailUrl || item.imageUrl}
                        alt={item.title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />

                      {/* Selection checkbox overlay */}
                      <div className="absolute top-2 left-2 z-10">
                        <div
                          className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-primary text-on-primary font-bold shadow-md'
                              : 'bg-black/60 border border-white/40 text-transparent hover:border-white'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      </div>

                      {/* Main cover indicator badge */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 z-10">
                          <span
                            className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shadow ${
                              isMainBadge
                                ? 'bg-amber-400 text-black'
                                : 'bg-primary/90 text-on-primary'
                            }`}
                          >
                            {isMainBadge ? '★ Обложка' : `#${selectionIndex + 1}`}
                          </span>
                        </div>
                      )}

                      {/* Zoom button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setZoomedUrl(item.imageUrl);
                        }}
                        className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white/80 hover:text-white backdrop-blur-xs transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                        title="Увеличить"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>

                      {/* Dimensions chip */}
                      {item.width && item.height && (
                        <div className="absolute bottom-2 left-2 text-[9px] font-mono text-white/90 bg-black/60 backdrop-blur-xs px-1.5 py-0.5 rounded border border-white/10">
                          {item.width}×{item.height}
                        </div>
                      )}
                    </div>

                    {/* Meta info footer */}
                    <div className="p-2 border-t border-white/5 bg-surface-container flex flex-col justify-between flex-1">
                      <p className="text-[11px] font-medium text-on-surface line-clamp-2 leading-tight" title={item.title}>
                        {item.title}
                      </p>
                      <p className="text-[10px] font-mono text-on-surface-variant truncate mt-1">
                        {item.source || item.domain}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with Actions */}
        <div className="px-5 py-3 border-t border-tile-border bg-tile-subtle flex items-center justify-between gap-3">
          <div className="text-xs font-mono text-on-surface-variant">
            {selectedCount > 0 ? (
              <span className="text-primary font-bold">
                Выбрано: {selectedCount} {selectedCount === 1 ? 'постер' : 'постера'} (первый станет обложкой)
              </span>
            ) : (
              <span>Кликните по постерам для выбора (поддерживается мультиселект)</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/5 text-on-surface text-xs font-mono transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selectedCount === 0 || isSubmitting}
              className="px-4 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-mono font-bold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Добавить {selectedCount > 0 ? `(${selectedCount})` : ''}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Fullscreen Zoom Lightbox */}
      {zoomedUrl && (
        <div
          className="fixed inset-0 bg-black/90 z-[1300] flex items-center justify-center p-4"
          onClick={() => setZoomedUrl(null)}
        >
          <button
            type="button"
            onClick={() => setZoomedUrl(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={zoomedUrl}
            alt="Zoomed Poster"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
