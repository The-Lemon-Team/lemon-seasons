import React, { useState, useRef } from 'react';
import { message, Tooltip } from 'antd';
import { Search, Image as ImageIcon, Upload, Star, X, Plus, Layers, Loader2 } from 'lucide-react';
import { NoteImage, PendingPosterItem, WebImageResult } from '@lenta/shared';
import { notesApi } from '../../api/client';
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

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  // Total count
  const allCount = isExistingNote ? existingImages.length : pendingPosters.length;

  // Handle images returned from Google Serper Web Search
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
        await notesApi.attachImagesFromUrls(noteId, items);
        message.success(`Добавлено постеров: ${webImages.length}`);
        onImagesUpdated?.();
      } catch (err: any) {
        message.error(err?.response?.data?.message || err?.message || 'Ошибка сохранения постеров');
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
      message.success(`Выбрано постеров: ${webImages.length}`);
    }
  };

  // Handle local files upload
  const handleFilesAdded = async (filesList: FileList | File[]) => {
    const validFiles: File[] = [];
    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      if (file.type.startsWith('image/')) {
        validFiles.push(file);
      } else {
        message.warning(`"${file.name}" не является изображением`);
      }
    }
    if (validFiles.length === 0) return;

    if (isExistingNote && noteId) {
      setIsProcessing(true);
      try {
        await notesApi.uploadImages(noteId, validFiles);
        message.success(`Загружено файлов: ${validFiles.length}`);
        onImagesUpdated?.();
      } catch (err: any) {
        message.error(err?.response?.data?.message || err?.message || 'Ошибка загрузки файлов');
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
        await notesApi.setMainImage(noteId, idOrIndex);
        message.success('Главная обложка обновлена');
        onImagesUpdated?.();
      } catch (err: any) {
        message.error(err?.response?.data?.message || 'Ошибка смены обложки');
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

  // Delete Poster
  const handleDelete = async (idOrIndex: string | number) => {
    if (readOnly) return;
    if (isExistingNote && noteId && typeof idOrIndex === 'string') {
      setIsProcessing(true);
      try {
        await notesApi.deleteImage(noteId, idOrIndex);
        message.success('Постер удален');
        onImagesUpdated?.();
      } catch (err: any) {
        message.error(err?.response?.data?.message || 'Ошибка удаления');
      } finally {
        setIsProcessing(false);
      }
    } else if (onPendingPostersChange && typeof idOrIndex === 'number') {
      const updated = pendingPosters.filter((_, idx) => idx !== idOrIndex);
      // Ensure there's a main image if items remain
      if (updated.length > 0 && !updated.some((p) => p.isMain)) {
        updated[0].isMain = true;
      }
      onPendingPostersChange(updated);
    }
  };

  return (
    <div className="space-y-2.5">
      {/* Header Strip with Label & Buttons */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-mono font-semibold text-on-surface">Постеры и изображения</span>
          {allCount > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-surface-container-highest text-primary font-bold">
              {allCount}
            </span>
          )}
        </div>

        {!readOnly && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsSearchModalOpen(true)}
              disabled={isProcessing}
              className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/25 text-primary text-[11px] font-mono font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <Search className="w-3 h-3" />
              <span>Поиск постеров (Google)</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="px-2 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high border border-white/10 text-on-surface-variant hover:text-on-surface text-[11px] font-mono transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title="Загрузить с диска"
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
              ? 'border-white/10 bg-surface-container-low/40'
              : 'border-white/15 hover:border-primary/40 bg-surface-container-low/60 hover:bg-surface-container cursor-pointer'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <ImageIcon className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-xs font-medium text-on-surface">Постеры не добавлены</p>
              <p className="text-[10px] font-mono text-on-surface-variant">
                Нажмите для быстрого поиска официального постера в Google
              </p>
            </div>
          </div>

          {!readOnly && (
            <span className="text-[11px] font-mono text-primary font-bold hover:underline flex items-center gap-1">
              <Search className="w-3 h-3" />
              <span>Найти постер</span>
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 custom-scrollbar">
          {/* Render Existing or Pending Images */}
          {isExistingNote
            ? existingImages.map((img) => {
                const fullUrl = img.thumbnailUrl
                  ? (img.thumbnailUrl.startsWith('http') ? img.thumbnailUrl : `${apiBase}${img.thumbnailUrl}`)
                  : (img.url.startsWith('http') ? img.url : `${apiBase}${img.url}`);

                return (
                  <div
                    key={img.id}
                    className={`relative shrink-0 w-20 sm:w-24 aspect-[3/4] rounded-lg overflow-hidden border bg-black/40 group transition-all ${
                      img.isMain
                        ? 'border-primary ring-2 ring-primary/40'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <img src={fullUrl} alt={img.alt || img.caption || 'Poster'} className="w-full h-full object-cover" />

                    {/* Star / Main Cover Badge */}
                    <div className="absolute top-1 left-1 z-10">
                      <Tooltip title={img.isMain ? 'Главная обложка' : 'Сделать главной обложкой'}>
                        <button
                          type="button"
                          onClick={() => !img.isMain && handleSetMain(img.id)}
                          className={`p-1 rounded-md transition-all cursor-pointer ${
                            img.isMain
                              ? 'bg-amber-400 text-black shadow-xs font-bold'
                              : 'bg-black/60 text-white/70 hover:text-amber-300 hover:bg-black/80'
                          }`}
                        >
                          <Star className="w-3 h-3 fill-current" />
                        </button>
                      </Tooltip>
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
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-1 text-[9px] font-mono text-white/90 truncate">
                      {img.isMain ? '★ Обложка' : (img.width ? `${img.width}×${img.height}` : 'Кадр')}
                    </div>
                  </div>
                );
              })
            : pendingPosters.map((poster, idx) => (
                <div
                  key={poster.id}
                  className={`relative shrink-0 w-20 sm:w-24 aspect-[3/4] rounded-lg overflow-hidden border bg-black/40 group transition-all ${
                    poster.isMain
                      ? 'border-primary ring-2 ring-primary/40'
                      : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <img src={poster.thumbnailUrl || poster.url} alt={poster.title} className="w-full h-full object-cover" />

                  {/* Main / Cover Badge */}
                  <div className="absolute top-1 left-1 z-10">
                    <Tooltip title={poster.isMain ? 'Главная обложка' : 'Сделать главной обложкой'}>
                      <button
                        type="button"
                        onClick={() => !poster.isMain && handleSetMain(idx)}
                        className={`p-1 rounded-md transition-all cursor-pointer ${
                          poster.isMain
                            ? 'bg-amber-400 text-black shadow-xs font-bold'
                            : 'bg-black/60 text-white/70 hover:text-amber-300 hover:bg-black/80'
                        }`}
                      >
                        <Star className="w-3 h-3 fill-current" />
                      </button>
                    </Tooltip>
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

                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-1 text-[9px] font-mono text-white/90 truncate">
                    {poster.isMain ? '★ Обложка' : `#${idx + 1}`}
                  </div>
                </div>
              ))}

          {/* Quick Add More Button Tile */}
          {!readOnly && (
            <button
              type="button"
              onClick={() => setIsSearchModalOpen(true)}
              className="shrink-0 w-16 sm:w-20 aspect-[3/4] rounded-lg border border-dashed border-white/15 hover:border-primary/50 bg-surface-container-low/40 hover:bg-surface-container flex flex-col items-center justify-center gap-1 text-on-surface-variant hover:text-primary transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="text-[10px] font-mono font-medium">Ещё</span>
            </button>
          )}
        </div>
      )}

      {/* Web Poster Search Modal */}
      <WebPosterSearchModal
        open={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        initialQuery={noteTitle}
        onSelectImages={handleSelectWebImages}
      />
    </div>
  );
};
