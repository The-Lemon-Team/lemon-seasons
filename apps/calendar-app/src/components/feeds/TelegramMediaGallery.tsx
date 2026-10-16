import React, { useState, useEffect, useCallback } from 'react';
import { TelegramMediaItem } from '../../api/telegramReaderApi';
import {
  Image as ImageIcon,
  Film,
  Music,
  FileText,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Download,
  Maximize2,
} from 'lucide-react';

export interface TelegramMediaGalleryProps {
  media: TelegramMediaItem[];
  mediaType?: string;
  postUrl?: string;
}

export const TelegramMediaGallery: React.FC<TelegramMediaGalleryProps> = ({
  media,
  mediaType,
  postUrl,
}) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());

  const handleMediaError = (url: string) => {
    setFailedUrls((prev) => new Set(prev).add(url));
  };

  const photos = media ? media.filter((m) => m.type === 'photo') : [];
  const videos = media ? media.filter((m) => m.type === 'video') : [];
  const audios = media ? media.filter((m) => m.type === 'audio' || m.type === 'voice') : [];
  const documents = media ? media.filter((m) => m.type === 'document') : [];

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const handlePrev = useCallback(() => {
    if (lightboxIndex === null) return;
    setLightboxIndex((prev) => (prev! > 0 ? prev! - 1 : photos.length - 1));
  }, [lightboxIndex, photos.length]);

  const handleNext = useCallback(() => {
    if (lightboxIndex === null) return;
    setLightboxIndex((prev) => (prev! < photos.length - 1 ? prev! + 1 : 0));
  }, [lightboxIndex, photos.length]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === 'ArrowRight') handleNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, handlePrev, handleNext]);

  if (!media || media.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2.5 my-2.5 w-full overflow-hidden">
      {/* 1. Photos & Albums */}
      {photos.length > 0 && (
        <div className="rounded-2xl overflow-hidden bg-slate-100 dark:bg-black/30 border border-slate-200/70 dark:border-white/[0.08] shadow-xs">
          {photos.length === 1 ? (
            /* Single Photo */
            <div
              className="relative group cursor-pointer overflow-hidden max-h-[460px] bg-slate-900/5 dark:bg-black/40 flex items-center justify-center"
              onClick={() => openLightbox(0)}
            >
              {failedUrls.has(photos[0].url) ? (
                <div className="p-8 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <ImageIcon className="w-8 h-8 opacity-40" />
                  <span className="text-xs font-mono">Не удалось загрузить изображение</span>
                </div>
              ) : (
                <>
                  <img
                    src={photos[0].url}
                    alt=""
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    onError={() => handleMediaError(photos[0].url)}
                    className="w-full h-auto max-h-[460px] object-cover sm:object-contain transition-transform duration-300 group-hover:scale-[1.01]"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <span className="p-2 rounded-full bg-black/60 text-white backdrop-blur-xs">
                      <Maximize2 className="w-4 h-4" />
                    </span>
                  </div>
                </>
              )}
            </div>
          ) : photos.length === 2 ? (
            /* 2 Photos: 2 Columns Grid */
            <div className="grid grid-cols-2 gap-1 max-h-[320px] aspect-[16/9]">
              {photos.map((photo, idx) => (
                <div
                  key={photo.url + idx}
                  className="relative group cursor-pointer overflow-hidden h-full bg-slate-900/5 dark:bg-black/40"
                  onClick={() => openLightbox(idx)}
                >
                  <img
                    src={photo.url}
                    alt=""
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    onError={() => handleMediaError(photo.url)}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </div>
              ))}
            </div>
          ) : photos.length === 3 ? (
            /* 3 Photos: 1 Main + 2 Stacked */
            <div className="grid grid-cols-3 gap-1 max-h-[340px] aspect-[16/9]">
              <div
                className="col-span-2 relative group cursor-pointer overflow-hidden h-full bg-slate-900/5 dark:bg-black/40"
                onClick={() => openLightbox(0)}
              >
                <img
                  src={photos[0].url}
                  alt=""
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  onError={() => handleMediaError(photos[0].url)}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              </div>
              <div className="grid grid-rows-2 gap-1 h-full">
                {photos.slice(1, 3).map((photo, idx) => (
                  <div
                    key={photo.url + idx}
                    className="relative group cursor-pointer overflow-hidden h-full bg-slate-900/5 dark:bg-black/40"
                    onClick={() => openLightbox(idx + 1)}
                  >
                    <img
                      src={photo.url}
                      alt=""
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      onError={() => handleMediaError(photo.url)}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* 4+ Photos: 2x2 Grid with Overflow badge */
            <div className="grid grid-cols-2 gap-1 max-h-[340px] aspect-[16/10]">
              {photos.slice(0, 4).map((photo, idx) => {
                const isLastWithMore = idx === 3 && photos.length > 4;
                const remaining = photos.length - 3;
                return (
                  <div
                    key={photo.url + idx}
                    className="relative group cursor-pointer overflow-hidden h-full bg-slate-900/5 dark:bg-black/40"
                    onClick={() => openLightbox(idx)}
                  >
                    <img
                      src={photo.url}
                      alt=""
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      onError={() => handleMediaError(photo.url)}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {isLastWithMore ? (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-white font-bold text-lg font-mono">
                        +{remaining}
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. Videos */}
      {videos.length > 0 && (
        <div className="space-y-2">
          {videos.map((vid, idx) => (
            <div
              key={vid.url + idx}
              className="rounded-2xl overflow-hidden bg-black/90 border border-slate-200/60 dark:border-white/10 shadow-xs relative"
            >
              <video
                src={vid.url}
                poster={vid.thumbnailUrl}
                controls
                playsInline
                preload="metadata"
                className="w-full max-h-[460px] object-contain bg-black"
                onError={() => handleMediaError(vid.url)}
              />
              <div className="absolute top-2.5 left-2.5 pointer-events-none px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs border border-white/10 text-[10px] font-mono text-white flex items-center gap-1 shadow-sm">
                <Film className="w-2.5 h-2.5 text-sky-400" />
                <span>Видео</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Audio / Voice */}
      {audios.length > 0 && (
        <div className="space-y-2">
          {audios.map((aud, idx) => (
            <div
              key={aud.url + idx}
              className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-full bg-[#2481cc]/15 text-[#2481cc] flex items-center justify-center shrink-0">
                <Music className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <audio
                  src={aud.url}
                  controls
                  preload="metadata"
                  className="w-full h-8"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Documents */}
      {documents.length > 0 && (
        <div className="space-y-1.5">
          {documents.map((doc, idx) => (
            <a
              key={doc.url + idx}
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 flex items-center justify-between gap-3 hover:bg-slate-100 dark:hover:bg-white/10 transition group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-5 h-5 text-[#2481cc] shrink-0" />
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                  Документ #{idx + 1}
                </span>
              </div>
              <Download className="w-4 h-4 text-slate-400 group-hover:text-[#2481cc] transition" />
            </a>
          ))}
        </div>
      )}

      {/* 5. Lightbox Modal */}
      {lightboxIndex !== null && photos[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in select-none"
          onClick={closeLightbox}
        >
          {/* Top Control Bar */}
          <div
            className="absolute top-4 left-4 right-4 flex items-center justify-between text-white z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-xs font-mono bg-black/50 px-2.5 py-1 rounded-full border border-white/10">
              {lightboxIndex + 1} / {photos.length}
            </span>

            <div className="flex items-center gap-2">
              <a
                href={photos[lightboxIndex].url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
                title="Открыть в полном размере"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={closeLightbox}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
                title="Закрыть (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation Arrows (if album) */}
          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/10 transition z-10"
                title="Назад (влево)"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/10 transition z-10"
                title="Вперед (вправо)"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Full-size Image */}
          <div
            className="max-w-4xl max-h-[85vh] flex items-center justify-center p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={photos[lightboxIndex].url}
              alt=""
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
