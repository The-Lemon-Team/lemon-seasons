import React from 'react';
import { Sparkles, Image as ImageIcon } from 'lucide-react';
import { NoteImage } from '../types';

export interface NoteCoverBannerProps {
  mainImage?: NoteImage | null;
  title: string;
  onOpenStudio: () => void;
}

export const NoteCoverBanner: React.FC<NoteCoverBannerProps> = ({
  mainImage,
  title,
  onOpenStudio,
}) => {
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  return (
    <div className="rounded-xl border border-white/10 bg-surface-container overflow-hidden">
      {mainImage ? (
        <div className="relative h-64 sm:h-72 bg-black/60 overflow-hidden group flex items-center justify-center">
          {/* Ambient Blurred Backdrop */}
          <div
            className="absolute inset-0 bg-cover bg-center filter blur-2xl scale-125 opacity-40 pointer-events-none"
            style={{
              backgroundImage: `url("${mainImage.url.startsWith('http') ? mainImage.url : `${apiBase}${mainImage.url}`}")`,
            }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-black/25 pointer-events-none" aria-hidden="true" />

          <img
            src={mainImage.url.startsWith('http') ? mainImage.url : `${apiBase}${mainImage.url}`}
            alt={mainImage.alt || title}
            className="relative z-10 max-h-full max-w-full w-auto h-auto object-contain drop-shadow-xl transition-transform duration-300 group-hover:scale-101"
          />
          <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex items-end justify-between p-3 pointer-events-none">
            <div className="flex items-center gap-2 pointer-events-auto">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-primary text-on-primary uppercase tracking-wider shadow">
                Обложка
              </span>
              {mainImage.width && mainImage.height && (
                <span className="text-[10px] font-mono text-white/80 bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm border border-white/10">
                  {mainImage.width}×{mainImage.height}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onOpenStudio}
              className="px-3 py-1.5 rounded-lg bg-primary/95 hover:bg-primary text-on-primary font-bold text-xs font-mono flex items-center gap-1.5 transition-all shadow-md cursor-pointer pointer-events-auto"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Сменить через AI</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-3.5 flex items-center justify-between gap-4 bg-surface-container/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <ImageIcon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-on-surface">AI-обложка не установлена</h4>
              <p className="text-[11px] text-on-surface-variant font-mono">
                Сгенерируйте варианты в Imagen 3 под тему заметки
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenStudio}
            className="px-3.5 py-1.5 rounded-lg bg-primary text-on-primary hover:bg-primary/90 font-bold text-xs font-mono flex items-center gap-1.5 transition-all shadow cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Сгенерировать AI-обложку</span>
          </button>
        </div>
      )}
    </div>
  );
};
