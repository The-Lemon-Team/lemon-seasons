import React from 'react';
import { Tooltip } from 'antd';
import { Check, Copy, Image as ImageIcon, Layers, Wand2, ZoomIn } from 'lucide-react';
import { AiMediaAsset } from '../../api/client';

interface CoverStudioCandidatesGridProps {
  candidates: AiMediaAsset[];
  count: 2 | 4;
  isAttaching: boolean;
  getFullUrl: (url: string) => string;
  onSelectCover: (asset: AiMediaAsset) => void;
  onRemixAsset: (asset: AiMediaAsset) => void;
  onZoomImage: (fullUrl: string) => void;
  onCopyMarkdown?: (asset: AiMediaAsset) => void;
}

export const CoverStudioCandidatesGrid: React.FC<CoverStudioCandidatesGridProps> = ({
  candidates,
  count,
  isAttaching,
  getFullUrl,
  onSelectCover,
  onRemixAsset,
  onZoomImage,
  onCopyMarkdown,
}) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-mono font-bold text-on-surface uppercase flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-primary" />
          <span>Сгенерированные кандидаты ({candidates.length})</span>
        </h3>
        {candidates.length > 0 && (
          <span className="text-[11px] font-mono text-on-surface-variant">
            Нажмите «Выбрать», «В Markdown» или «Ремикс»
          </span>
        )}
      </div>

      {candidates.length === 0 ? (
        <div className="py-12 border border-dashed border-white/10 rounded-xl bg-surface-container/30 flex flex-col items-center justify-center text-center p-6 space-y-2">
          <div className="w-11 h-11 rounded-full bg-white/5 flex items-center justify-center text-on-surface-variant mb-1">
            <ImageIcon className="w-5 h-5 text-on-surface-variant/60" />
          </div>
          <p className="text-xs font-medium text-on-surface">
            Варианты пока не сгенерированы
          </p>
          <p className="text-[11px] text-on-surface-variant max-w-md">
            Выберите IT-сценарий (Подкаст, Changelog, Security, AI) или визуальный стиль и нажмите «Сгенерировать {count} варианта»
          </p>
        </div>
      ) : (
        <div
          className={`grid gap-4 ${
            candidates.length === 4 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'
          }`}
        >
          {candidates.map((asset, idx) => {
            const fullUrl = getFullUrl(asset.url);

            return (
              <div
                key={asset.id}
                className="group relative rounded-xl overflow-hidden border border-white/10 hover:border-primary/60 bg-surface-container flex flex-col transition-all shadow-lg hover:shadow-primary/5"
              >
                {/* Image Preview with Hover Overlay */}
                <div className="relative aspect-video bg-black/60 overflow-hidden">
                  <img
                    src={fullUrl}
                    alt={asset.prompt}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />

                  {/* Top Badges */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    <span className="bg-black/70 backdrop-blur-md text-[10px] font-mono px-2 py-0.5 rounded text-white/90 border border-white/10">
                      #{idx + 1}
                    </span>
                    <span className="bg-black/70 backdrop-blur-md text-[10px] font-mono px-2 py-0.5 rounded text-primary border border-primary/20 uppercase">
                      {asset.model}
                    </span>
                    {asset.style && (
                      <span className="bg-black/70 backdrop-blur-md text-[10px] font-mono px-2 py-0.5 rounded text-white/80 border border-white/10">
                        {asset.style}
                      </span>
                    )}
                  </div>

                  {/* Zoom button */}
                  <button
                    type="button"
                    onClick={() => onZoomImage(fullUrl)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 backdrop-blur-md text-white/80 hover:text-white border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="Увеличить"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Footer Actions */}
                <div className="p-3 bg-surface-container-high flex items-center justify-between gap-2 border-t border-white/5">
                  <div
                    className="text-[10px] font-mono text-on-surface-variant truncate max-w-[140px]"
                    title={asset.prompt}
                  >
                    {asset.width && asset.height
                      ? `${asset.width}×${asset.height} WebP`
                      : 'WebP'}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {onCopyMarkdown && (
                      <Tooltip title="Вставить / скопировать Markdown">
                        <button
                          type="button"
                          onClick={() => onCopyMarkdown(asset)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-primary/20 text-text-muted hover:text-primary border border-white/10 transition-colors cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                    )}

                    <button
                      type="button"
                      onClick={() => onRemixAsset(asset)}
                      className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-primary/20 text-text-muted hover:text-primary text-xs font-medium border border-white/10 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Ремикс изображения"
                    >
                      <Wand2 className="w-3 h-3" />
                      <span>Ремикс</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectCover(asset)}
                      disabled={isAttaching}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-on-primary font-bold text-xs hover:bg-primary/90 transition-all cursor-pointer shadow disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Выбрать</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
