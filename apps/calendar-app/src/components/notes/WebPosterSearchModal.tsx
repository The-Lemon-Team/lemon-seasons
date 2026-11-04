import React, { useState, useEffect, useRef } from 'react';
import { Search, Image as ImageIcon, Check, X, Loader2, ZoomIn } from 'lucide-react';
import { WebImageResult } from '@lenta/shared';
import { calendarApi } from '../../api/client';

export interface WebPosterSearchModalProps {
  isOpen: boolean;
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
  isOpen,
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

  // Keyboard Escape handler
  useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen, zoomedUrl, onClose]);

  // Reset or run initial search
  useEffect(() => {
    if (isOpen) {
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
  }, [isOpen, initialQuery]);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await calendarApi.searchWebImages(searchQuery.trim(), { num: 24 });
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

  if (!isOpen) return null;

  const selectedCount = selectedMap.size;
  const selectedArray = Array.from(selectedMap.keys());

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
      style={{ zIndex }}
      onClick={onClose}
    >
      <div
        className="bg-[#181a1a] border border-[#323636] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-mono text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#242828] bg-[#121414]/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#c9cd58]/15 border border-[#c9cd58]/30 flex items-center justify-center text-[#c9cd58]">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-sm text-[#f5f2e9] flex items-center gap-2">
                <span>Поиск постеров (Google)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#c9cd58]/10 text-[#c9cd58] border border-[#c9cd58]/20">
                  Serper • Google Images
                </span>
              </h3>
              <p className="text-[11px] text-[#93927e]">
                Выберите один или несколько постеров к фильму или событию
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#93927e] hover:text-[#f5f2e9] hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar & Quick Chips */}
        <div className="p-4 border-b border-[#242828] bg-[#141616] space-y-2.5">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Введите название фильма, игры или события..."
                className="w-full bg-[#1b1e1e] border border-[#323636] focus:border-[#c9cd58] rounded-xl pl-9 pr-8 py-2 text-xs text-[#f5f2e9] placeholder-[#93927e]/60 outline-none transition-colors"
              />
              <Search className="w-4 h-4 text-[#93927e] absolute left-3 top-1/2 -translate-y-1/2" />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#93927e] hover:text-[#f5f2e9] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="px-4 py-2 bg-[#c9cd58] text-[#121414] rounded-xl text-xs font-bold hover:bg-[#d8dc66] transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              <span>Найти</span>
            </button>
          </form>

          {/* Quick chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-[#93927e] mr-1">Быстрые фильтры:</span>
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => handleChipClick(chip.querySuffix)}
                className="px-2 py-0.5 rounded-md bg-[#1b1e1e] hover:bg-[#c9cd58]/15 border border-[#323636] hover:border-[#c9cd58]/40 text-[#93927e] hover:text-[#c9cd58] text-[11px] transition-all cursor-pointer"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results Grid */}
        <div className="p-4 overflow-y-auto flex-1 min-h-[300px] max-h-[55vh]">
          {error && (
            <div className="p-3 mb-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => performSearch(query)}
                className="underline hover:text-red-200 ml-3 cursor-pointer"
              >
                Повторить
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2 text-[#93927e]">
              <Loader2 className="w-8 h-8 animate-spin text-[#c9cd58]" />
              <span className="text-xs">Ищем постеры в Google Images...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2 text-[#93927e] text-center p-6 border border-dashed border-[#323636] rounded-xl">
              <ImageIcon className="w-10 h-10 text-[#93927e]/40" />
              <p className="text-xs font-medium text-[#f5f2e9]">Постеры не найдены</p>
              <p className="text-[11px] text-[#93927e] max-w-sm">
                Попробуйте изменить запрос или уточнить название на английском/русском
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
                    className={`group relative rounded-xl overflow-hidden border transition-all cursor-pointer bg-[#141616] flex flex-col ${
                      isSelected
                        ? 'border-[#c9cd58] ring-2 ring-[#c9cd58]/40 shadow-md scale-[1.01]'
                        : 'border-[#242828] hover:border-[#c9cd58]/50 hover:shadow-sm'
                    }`}
                  >
                    {/* Thumbnail Image */}
                    <div className="relative aspect-[3/4] bg-black/50 overflow-hidden">
                      <img
                        src={item.thumbnailUrl || item.imageUrl}
                        alt={item.title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />

                      {/* Selection checkbox */}
                      <div className="absolute top-2 left-2 z-10">
                        <div
                          className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-[#c9cd58] text-[#121414] font-bold shadow-md'
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
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded shadow ${
                              isMainBadge
                                ? 'bg-amber-400 text-black'
                                : 'bg-[#c9cd58]/90 text-[#121414]'
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
                        <div className="absolute bottom-2 left-2 text-[9px] text-white/90 bg-black/60 backdrop-blur-xs px-1.5 py-0.5 rounded border border-white/10">
                          {item.width}×{item.height}
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="p-2 border-t border-[#242828] bg-[#161818] flex flex-col justify-between flex-1">
                      <p className="text-[11px] text-[#f5f2e9] line-clamp-2 leading-tight" title={item.title}>
                        {item.title}
                      </p>
                      <p className="text-[10px] text-[#93927e] truncate mt-1">
                        {item.source || item.domain}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#242828] bg-[#121414]/70 flex items-center justify-between gap-3">
          <div className="text-xs text-[#93927e]">
            {selectedCount > 0 ? (
              <span className="text-[#c9cd58] font-bold">
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
              className="px-3 py-1.5 rounded-xl border border-[#323636] hover:bg-white/5 text-[#f5f2e9] text-xs transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selectedCount === 0 || isSubmitting}
              className="px-4 py-1.5 rounded-xl bg-[#c9cd58] text-[#121414] text-xs font-bold hover:bg-[#d8dc66] transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Добавить {selectedCount > 0 ? `(${selectedCount})` : ''}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox Zoom */}
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
