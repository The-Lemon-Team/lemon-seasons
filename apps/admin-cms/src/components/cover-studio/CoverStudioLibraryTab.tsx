import React, { useState } from 'react';
import { Spin, Tooltip, message } from 'antd';
import { Star, Wand2, Check, Search, Image as ImageIcon, ZoomIn, Copy } from 'lucide-react';
import { AiMediaAsset } from '../../api/client';
import { useAiAssets, useToggleAssetFavorite } from '../../api/queries';
import { STYLE_PRESETS } from './coverStudio.constants';

interface CoverStudioLibraryTabProps {
  onSelectCover: (asset: AiMediaAsset) => void;
  onRemixAsset: (asset: AiMediaAsset) => void;
  onZoomImage: (url: string) => void;
  onInsertMarkdown?: (snippet: string) => void;
}

export const CoverStudioLibraryTab: React.FC<CoverStudioLibraryTabProps> = ({
  onSelectCover,
  onRemixAsset,
  onZoomImage,
  onInsertMarkdown,
}) => {
  const [search, setSearch] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<string>('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  const { data, isLoading } = useAiAssets({
    search: search.trim() || undefined,
    style: selectedStyle || undefined,
    isFavorite: onlyFavorites ? true : undefined,
    limit: 50,
  });

  const toggleFavoriteMutation = useToggleAssetFavorite();

  const handleToggleFavorite = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await toggleFavoriteMutation.mutateAsync(id);
    } catch {
      message.error('Ошибка изменения избранного');
    }
  };

  const handleCopyMarkdown = (asset: AiMediaAsset) => {
    const snippet = `![${asset.userPrompt || asset.prompt || 'IT Cover'}](${asset.url})`;
    if (onInsertMarkdown) {
      onInsertMarkdown(snippet);
      message.success('Изображение вставлено в Markdown заметки');
    } else {
      navigator.clipboard.writeText(snippet);
      message.success('Markdown-тег скопирован в буфер обмена');
    }
  };

  const assets = data?.items || [];

  return (
    <div className="space-y-3.5">
      {/* Search & Filter Bar */}
      <div className="space-y-2.5 bg-surface-container-low p-3 rounded-lg border border-white/5">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по IT-теме, промпту, стилю или тегу (podcast, security, changelog)..."
              className="w-full bg-surface-container-lowest border border-white/10 rounded-md pl-8 pr-3 py-1.5 text-xs text-text-main placeholder-text-muted/60 outline-none focus:border-primary"
            />
          </div>

          <button
            type="button"
            onClick={() => setOnlyFavorites(!onlyFavorites)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
              onlyFavorites
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                : 'border-white/10 text-text-muted hover:text-text-main'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-current' : ''}`} />
            <span>Избранное</span>
          </button>
        </div>

        {/* Style Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedStyle('')}
            className={`px-2 py-0.5 rounded text-[11px] font-mono border shrink-0 transition-colors cursor-pointer ${
              !selectedStyle
                ? 'bg-primary/20 border-primary text-primary font-bold'
                : 'border-white/10 text-text-muted hover:text-text-main'
            }`}
          >
            Все стили
          </button>
          {STYLE_PRESETS.map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setSelectedStyle(selectedStyle === st.id ? '' : st.id)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono border shrink-0 flex items-center gap-1 transition-colors cursor-pointer ${
                selectedStyle === st.id
                  ? 'bg-primary/20 border-primary text-primary font-bold'
                  : 'border-white/10 text-text-muted hover:text-text-main'
              }`}
            >
              <span>{st.icon}</span>
              <span>{st.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid of assets */}
      {isLoading ? (
        <div className="py-16 flex items-center justify-center">
          <Spin size="default" />
        </div>
      ) : assets.length === 0 ? (
        <div className="py-14 border border-dashed border-white/10 rounded-xl bg-surface-container/30 flex flex-col items-center justify-center text-center p-6 space-y-2">
          <ImageIcon className="w-8 h-8 text-text-muted/40" />
          <p className="text-xs text-text-main">Ассеты по выбранному фильтру не найдены</p>
          <p className="text-[11px] text-text-muted">
            Сгенерируйте новые IT-обложки во вкладке «Генератор»
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="group relative rounded-lg overflow-hidden border border-white/10 hover:border-primary/60 bg-surface-container flex flex-col transition-all shadow"
            >
              <div className="relative aspect-video bg-black/50 overflow-hidden">
                <img
                  src={asset.thumbnailUrl || asset.url}
                  alt={asset.prompt}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />

                {/* Favorite badge */}
                <button
                  type="button"
                  onClick={(e) => handleToggleFavorite(e, asset.id)}
                  className="absolute top-1.5 left-1.5 p-1 rounded bg-black/60 backdrop-blur-md text-white/80 hover:text-amber-400 transition-colors cursor-pointer"
                  title="В избранное"
                >
                  <Star className={`w-3.5 h-3.5 ${asset.isFavorite ? 'text-amber-400 fill-current' : ''}`} />
                </button>

                {/* Style tag */}
                {asset.style && (
                  <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-md text-[9px] font-mono text-primary border border-primary/20 uppercase">
                    {asset.style}
                  </span>
                )}

                {/* Zoom button */}
                <button
                  type="button"
                  onClick={() => onZoomImage(asset.url)}
                  className="absolute top-1.5 right-1.5 p-1 rounded bg-black/60 backdrop-blur-md text-white/80 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="Увеличить"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Info & Actions */}
              <div className="p-2.5 bg-surface-container-high flex flex-col gap-2">
                <div className="text-[10px] text-text-muted truncate font-mono" title={asset.userPrompt || asset.prompt}>
                  {asset.userPrompt || asset.prompt}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onSelectCover(asset)}
                    className="flex-1 flex items-center justify-center gap-1 py-1 rounded bg-primary text-on-primary font-bold text-[11px] hover:bg-primary/90 transition-all cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                    <span>Выбрать</span>
                  </button>

                  <Tooltip title="Вставить / скопировать Markdown">
                    <button
                      type="button"
                      onClick={() => handleCopyMarkdown(asset)}
                      className="p-1 rounded bg-white/5 hover:bg-primary/20 text-text-muted hover:text-primary border border-white/10 transition-colors cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </Tooltip>

                  <Tooltip title="Создать ремикс этого изображения">
                    <button
                      type="button"
                      onClick={() => onRemixAsset(asset)}
                      className="p-1 rounded bg-white/5 hover:bg-primary/20 text-text-muted hover:text-primary border border-white/10 transition-colors cursor-pointer"
                    >
                      <Wand2 className="w-3 h-3" />
                    </button>
                  </Tooltip>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
