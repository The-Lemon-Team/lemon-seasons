import React, { useState, useRef } from 'react';
import { Search, Image as ImageIcon, Upload, Star, X, Plus, Layers } from 'lucide-react';
import { NoteImage, PendingPosterItem, WebImageResult } from '@lenta/shared';
import { calendarApi } from '../../api/client';
import { WebPosterSearchModal } from './WebPosterSearchModal';

export interface NotePosterPickerProps {
  noteId?: string;
  noteTitle?: string;
  existingImages?: NoteImage[];
  pendingPosters?: PendingPosterItem[];
  onPendingPostersChange?: (posters: PendingPosterItem[]) => void;
  onImagesUpdated?: () => void;
  readOnly?: boolean;
}

export const NotePosterPicker: React.FC<NotePosterPickerProps> = ({
  noteId,
  noteTitle = '',
  existingImages = [],
  pendingPosters = [],
  onPendingPostersChange,
  onImagesUpdated,
  readOnly = false,
}) => {
  const isExistingNote = Boolean(noteId && noteId !== 'new');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3002';
  const allCount = isExistingNote ? existingImages.length : pendingPosters.length;

  const showFeedback = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Handle Google Serper Web Images selection
  const handleSelectWebImages = async (webImages: WebImageResult[]) => {
    if (webImages.length === 0) return;

    if (isExistingNote && noteId) {
      setIsProcessing(true);
      try {
        const items = webImages.map((img, idx) => ({
          url: img.imageUrl,
          caption: img.title,
          alt: img.title,
          isMain: existingImages.length === 0 && idx === 0,
        }));
        await calendarApi.attachImagesFromUrls(noteId, items);
        showFeedback(`Добавлено постеров: ${webImages.length}`);
        onImagesUpdated?.();
      } catch (err: any) {
        showFeedback(err?.response?.data?.message || err?.message || 'Ошибка сохранения постеров');
      } finally {
        setIsProcessing(false);
      }
    } else if (onPendingPostersChange) {
      const hasMain = pendingPosters.some((p) => p.isMain);
      const newPending: PendingPosterItem[] = webImages.map((img, idx) => ({
        id: `web-${Date.now()}-${idx}`,
        url: img.imageUrl,
        thumbnailUrl: img.thumbnailUrl || img.imageUrl,
        title: img.title,
        isMain: !hasMain && idx === 0,
        width: img.width,
        height: img.height,
        source: img.source,
      }));
      onPendingPostersChange([...pendingPosters, ...newPending]);
      showFeedback(`Выбрано постеров: ${webImages.length}`);
    }
  };

  // Handle local files
  const handleFilesAdded = async (filesList: FileList | File[]) => {
    const validFiles: File[] = [];
    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      if (file.type.startsWith('image/')) {
        validFiles.push(file);
      }
    }
    if (validFiles.length === 0) return;

    if (isExistingNote && noteId) {
      setIsProcessing(true);
      try {
        await calendarApi.uploadImages(noteId, validFiles);
        showFeedback(`Загружено файлов: ${validFiles.length}`);
        onImagesUpdated?.();
      } catch (err: any) {
        showFeedback(err?.response?.data?.message || err?.message || 'Ошибка загрузки файлов');
      } finally {
        setIsProcessing(false);
      }
    } else if (onPendingPostersChange) {
      const hasMain = pendingPosters.some((p) => p.isMain);
      const newPending: PendingPosterItem[] = validFiles.map((file, idx) => ({
        id: `file-${Date.now()}-${idx}`,
        url: URL.createObjectURL(file),
        thumbnailUrl: URL.createObjectURL(file),
        title: file.name,
        isMain: !hasMain && idx === 0,
        file,
      }));
      onPendingPostersChange([...pendingPosters, ...newPending]);
    }
  };

  // Set Main Cover
  const handleSetMain = async (idOrIndex: string | number) => {
    if (readOnly) return;
    if (isExistingNote && noteId && typeof idOrIndex === 'string') {
      setIsProcessing(true);
      try {
        await calendarApi.setMainImage(noteId, idOrIndex);
        showFeedback('Главная обложка обновлена');
        onImagesUpdated?.();
      } catch (err: any) {
        showFeedback(err?.response?.data?.message || 'Ошибка смены обложки');
      } finally {
        setIsProcessing(false);
      }
    } else if (onPendingPostersChange && typeof idOrIndex === 'number') {
      const updated = pendingPosters.map((p, idx) => ({
        ...p,
        isMain: idx === idOrIndex,
      }));
      onPendingPostersChange(updated);
    }
  };

  // Delete
  const handleDelete = async (idOrIndex: string | number) => {
    if (readOnly) return;
    if (isExistingNote && noteId && typeof idOrIndex === 'string') {
      setIsProcessing(true);
      try {
        await calendarApi.deleteImage(noteId, idOrIndex);
        showFeedback('Постер удален');
        onImagesUpdated?.();
      } catch (err: any) {
        showFeedback(err?.response?.data?.message || 'Ошибка удаления');
      } finally {
        setIsProcessing(false);
      }
    } else if (onPendingPostersChange && typeof idOrIndex === 'number') {
      const updated = pendingPosters.filter((_, idx) => idx !== idOrIndex);
      if (updated.length > 0 && !updated.some((p) => p.isMain)) {
        updated[0].isMain = true;
      }
      onPendingPostersChange(updated);
    }
  };

  return (
    <div className="space-y-2 font-mono text-xs">
      {/* Header Strip with Label & Buttons */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-[#c9cd58]" />
          <span className="text-[11px] uppercase tracking-wider text-[#93927e]">Постеры и изображения</span>
          {allCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#1b1e1e] border border-[#323636] text-[#c9cd58] font-bold">
              {allCount}
            </span>
          )}
          {statusMessage && (
            <span className="text-[10px] text-[#c9cd58] bg-[#c9cd58]/10 px-2 py-0.5 rounded ml-2">
              {statusMessage}
            </span>
          )}
        </div>

        {!readOnly && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsSearchModalOpen(true)}
              disabled={isProcessing}
              className="px-2.5 py-1 rounded-lg bg-[#c9cd58]/10 hover:bg-[#c9cd58]/20 border border-[#c9cd58]/30 text-[#c9cd58] text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <Search className="w-3 h-3" />
              <span>Поиск постеров (Google)</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="px-2 py-1 rounded-lg bg-[#1b1e1e] hover:bg-[#242828] border border-[#323636] text-[#93927e] hover:text-[#f5f2e9] text-[11px] transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title="Загрузить файл"
            >
              <Upload className="w-3 h-3" />
              <span className="hidden sm:inline">Файл</span>
            </button>

            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleFilesAdded(e.target.files);
                e.target.value = '';
              }}
            />
          </div>
        )}
      </div>

      {/* Thumbnails Row or Empty Banner */}
      {allCount === 0 ? (
        <div
          onClick={() => !readOnly && setIsSearchModalOpen(true)}
          className={`p-3 rounded-xl border border-dashed transition-all flex items-center justify-between gap-3 ${
            readOnly
              ? 'border-[#242828] bg-[#141616]'
              : 'border-[#323636] hover:border-[#c9cd58]/50 bg-[#141616] hover:bg-[#181a1a] cursor-pointer'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#c9cd58]/10 border border-[#c9cd58]/20 flex items-center justify-center text-[#c9cd58] shrink-0">
              <ImageIcon className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#f5f2e9]">Постеры не добавлены</p>
              <p className="text-[10px] text-[#93927e]">
                Нажмите для поиска официального постера к фильму или новости в Google
              </p>
            </div>
          </div>

          {!readOnly && (
            <span className="text-[11px] text-[#c9cd58] font-bold hover:underline flex items-center gap-1">
              <Search className="w-3 h-3" />
              <span>Найти постер</span>
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 custom-scrollbar">
          {isExistingNote
            ? existingImages.map((img) => {
                const fullUrl = img.thumbnailUrl
                  ? (img.thumbnailUrl.startsWith('http') ? img.thumbnailUrl : `${apiBase}${img.thumbnailUrl}`)
                  : (img.url.startsWith('http') ? img.url : `${apiBase}${img.url}`);

                return (
                  <div
                    key={img.id}
                    className={`relative shrink-0 w-20 sm:w-24 aspect-[3/4] rounded-lg overflow-hidden border bg-black/50 group transition-all ${
                      img.isMain
                        ? 'border-[#c9cd58] ring-2 ring-[#c9cd58]/40'
                        : 'border-[#242828] hover:border-[#323636]'
                    }`}
                  >
                    <img src={fullUrl} alt={img.alt || img.caption || 'Poster'} className="w-full h-full object-cover" />

                    {/* Star / Main Cover Badge */}
                    <div className="absolute top-1 left-1 z-10">
                      <button
                        type="button"
                        onClick={() => !img.isMain && handleSetMain(img.id)}
                        className={`p-1 rounded-md transition-all cursor-pointer ${
                          img.isMain
                            ? 'bg-amber-400 text-black shadow-xs font-bold'
                            : 'bg-black/60 text-white/70 hover:text-amber-300 hover:bg-black/80'
                        }`}
                        title={img.isMain ? 'Главная обложка' : 'Сделать главной обложкой'}
                      >
                        <Star className="w-3 h-3 fill-current" />
                      </button>
                    </div>

                    {/* Delete button */}
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => handleDelete(img.id)}
                        className="absolute top-1 right-1 p-1 rounded-md bg-black/60 hover:bg-red-500 text-white/70 hover:text-white transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                        title="Удалить"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}

                    {/* Caption / Resolution */}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent p-1 text-[9px] text-white/90 truncate">
                      {img.isMain ? '★ Обложка' : (img.width ? `${img.width}×${img.height}` : 'Кадр')}
                    </div>
                  </div>
                );
              })
            : pendingPosters.map((poster, idx) => (
                <div
                  key={poster.id}
                  className={`relative shrink-0 w-20 sm:w-24 aspect-[3/4] rounded-lg overflow-hidden border bg-black/50 group transition-all ${
                    poster.isMain
                      ? 'border-[#c9cd58] ring-2 ring-[#c9cd58]/40'
                      : 'border-[#242828] hover:border-[#323636]'
                  }`}
                >
                  <img src={poster.thumbnailUrl || poster.url} alt={poster.title} className="w-full h-full object-cover" />

                  {/* Main / Cover Badge */}
                  <div className="absolute top-1 left-1 z-10">
                    <button
                      type="button"
                      onClick={() => !poster.isMain && handleSetMain(idx)}
                      className={`p-1 rounded-md transition-all cursor-pointer ${
                        poster.isMain
                          ? 'bg-amber-400 text-black shadow-xs font-bold'
                          : 'bg-black/60 text-white/70 hover:text-amber-300 hover:bg-black/80'
                      }`}
                      title={poster.isMain ? 'Главная обложка' : 'Сделать главной обложкой'}
                    >
                      <Star className="w-3 h-3 fill-current" />
                    </button>
                  </div>

                  {/* Delete button */}
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleDelete(idx)}
                      className="absolute top-1 right-1 p-1 rounded-md bg-black/60 hover:bg-red-500 text-white/70 hover:text-white transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                      title="Удалить"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}

                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent p-1 text-[9px] text-white/90 truncate">
                    {poster.isMain ? '★ Обложка' : `#${idx + 1}`}
                  </div>
                </div>
              ))}

          {/* Quick Add More Tile */}
          {!readOnly && (
            <button
              type="button"
              onClick={() => setIsSearchModalOpen(true)}
              className="shrink-0 w-16 sm:w-20 aspect-[3/4] rounded-lg border border-dashed border-[#323636] hover:border-[#c9cd58]/50 bg-[#141616] hover:bg-[#181a1a] flex flex-col items-center justify-center gap-1 text-[#93927e] hover:text-[#c9cd58] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="text-[10px] font-medium">Ещё</span>
            </button>
          )}
        </div>
      )}

      {/* Web Poster Search Modal */}
      <WebPosterSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        initialQuery={noteTitle}
        onSelectImages={handleSelectWebImages}
      />
    </div>
  );
};
