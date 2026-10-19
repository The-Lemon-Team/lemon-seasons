import React, { useState, useEffect } from 'react';
import { Modal, message, Spin, Tooltip } from 'antd';
import {
  Sparkles,
  Check,
  Image as ImageIcon,
  Layers,
  Wand2,
  RefreshCw,
  X,
  ZoomIn,
  Sliders,
} from 'lucide-react';
import { useGenerateAiBatch, useAttachCoverToNote } from '../api/queries';
import { AiMediaAsset } from '../api/client';
import { useAdminI18n } from '../i18n';

export interface AiCoverStudioModalProps {
  open: boolean;
  onClose: () => void;
  noteId?: string;
  initialTitle?: string;
  initialDescription?: string;
  onCoverSelected?: (imageUrl: string) => void;
}

const STYLE_PRESETS = [
  { id: 'cinematic', label: 'Кинематографичный', icon: '🎬' },
  { id: 'photorealistic', label: 'Фотореализм', icon: '📸' },
  { id: 'minimalist', label: 'Минимализм / Вектор', icon: '📐' },
  { id: 'cyberpunk', label: 'Киберпанк', icon: '🌆' },
  { id: 'vintage', label: 'Винтаж / Архив', icon: '🏛️' },
  { id: 'oil-painting', label: 'Живопись', icon: '🎨' },
];

export const AiCoverStudioModal: React.FC<AiCoverStudioModalProps> = ({
  open,
  onClose,
  noteId,
  initialTitle = '',
  initialDescription = '',
  onCoverSelected,
}) => {
  const { t } = useAdminI18n();
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const [prompt, setPrompt] = useState(initialTitle);
  const [style, setStyle] = useState('cinematic');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '1:1' | '9:16'>('16:9');
  const [count, setCount] = useState<2 | 4>(2);
  const [candidates, setCandidates] = useState<AiMediaAsset[]>([]);
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);

  const generateBatchMutation = useGenerateAiBatch();
  const attachCoverMutation = useAttachCoverToNote();

  useEffect(() => {
    if (open) {
      if (initialTitle && !prompt) {
        setPrompt(initialTitle);
      }
    }
  }, [open, initialTitle]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      message.warning('Введите тему или название для генерации');
      return;
    }

    try {
      const res = await generateBatchMutation.mutateAsync({
        prompt: prompt.trim(),
        style,
        aspectRatio,
        context: initialDescription ? initialDescription.slice(0, 300) : undefined,
        count,
        noteId,
      });

      setCandidates(res.candidates);
      message.success(`Сгенерировано вариантов: ${res.candidates.length}`);
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || 'Ошибка генерации вариантов');
    }
  };

  const handleSelectCover = async (asset: AiMediaAsset) => {
    if (noteId) {
      try {
        await attachCoverMutation.mutateAsync({
          noteId,
          assetUrl: asset.url,
          caption: prompt || initialTitle,
          setAsMain: true,
        });
        message.success('Обложка заметки успешно обновлена!');
      } catch (err: any) {
        message.error(err?.response?.data?.message || err?.message || 'Ошибка привязки обложки');
        return;
      }
    }

    onCoverSelected?.(asset.url);
    onClose();
  };

  const getFullUrl = (url: string) => (url.startsWith('http') ? url : `${apiBase}${url}`);

  if (!open) return null;

  return (
    <>
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        width={920}
        zIndex={1200}
        centered
        destroyOnClose
        closable={false}
        styles={{
          content: {
            padding: 0,
            backgroundColor: 'var(--panel-bg)',
            border: '1px solid var(--tile-border)',
            boxShadow: 'var(--tile-shadow)',
            overflow: 'hidden',
            borderRadius: 12,
          },
        }}
      >
        {/* Header */}
        <div className="px-5 py-3 border-b border-tile-border bg-tile-subtle flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center border border-primary/25">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-main flex items-center gap-1.5">
                AI Cover Studio
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
                  Gemini + Imagen 3
                </span>
              </h2>
              <p className="text-[11px] font-mono text-text-muted">
                Генерация нескольких вариантов обложки для выбора лучшего
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Prompt & Controls */}
          <div className="bg-surface-container-low p-4 rounded-xl border border-white/5 space-y-4">
            {/* Prompt input */}
            <div>
              <label className="block text-xs font-mono text-on-surface-variant mb-1 flex items-center justify-between">
                <span>Тема или промпт события</span>
                {initialTitle && prompt !== initialTitle && (
                  <button
                    type="button"
                    onClick={() => setPrompt(initialTitle)}
                    className="text-[10px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Восстановить заголовок
                  </button>
                )}
              </label>
              <textarea
                rows={2}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Например: Запуск космического корабля на закате, футуристический космодром..."
                className="w-full bg-surface-container-lowest border border-white/10 focus:border-primary rounded-lg p-2.5 text-xs text-on-surface placeholder-outline/60 outline-none resize-none font-sans"
              />
            </div>

            {/* Style Chips */}
            <div>
              <label className="block text-[11px] font-mono text-on-surface-variant uppercase mb-1.5 flex items-center gap-1">
                <Sliders className="w-3 h-3 text-primary" />
                Визуальный стиль
              </label>
              <div className="flex flex-wrap gap-2">
                {STYLE_PRESETS.map((p) => {
                  const isActive = style === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setStyle(p.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-primary/20 border-primary text-primary shadow-sm'
                          : 'bg-surface-container-high border-white/5 text-on-surface-variant hover:text-on-surface hover:border-white/20'
                      }`}
                    >
                      <span>{p.icon}</span>
                      <span>{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ratio & Sample Count */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-white/5">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-on-surface-variant uppercase">
                  Формат:
                </span>
                {(['16:9', '1:1', '9:16'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setAspectRatio(r)}
                    className={`px-2.5 py-1 rounded text-xs font-mono border transition-all cursor-pointer ${
                      aspectRatio === r
                        ? 'bg-white/10 border-primary text-primary font-bold'
                        : 'bg-surface-container border-white/5 text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-on-surface-variant uppercase">
                  Вариантов:
                </span>
                {([2, 4] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCount(c)}
                    className={`px-2.5 py-1 rounded text-xs font-mono border transition-all cursor-pointer ${
                      count === c
                        ? 'bg-primary text-on-primary font-bold border-primary'
                        : 'bg-surface-container border-white/5 text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {c} варианта
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={generateBatchMutation.isPending || !prompt.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-on-primary font-bold text-xs hover:bg-primary/90 transition-all shadow-md disabled:opacity-50 cursor-pointer"
              >
                {generateBatchMutation.isPending ? (
                  <>
                    <Spin size="small" />
                    <span>Генерируем {count} варианта...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>Сгенерировать {count} варианта</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Gallery Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-mono font-bold text-on-surface uppercase flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" />
                Сгенерированные кандидаты ({candidates.length})
              </h3>
              {candidates.length > 0 && (
                <span className="text-[11px] font-mono text-on-surface-variant">
                  Нажмите на понравившийся вариант для выбора
                </span>
              )}
            </div>

            {candidates.length === 0 ? (
              <div className="py-14 border border-dashed border-white/10 rounded-xl bg-surface-container/30 flex flex-col items-center justify-center text-center p-6 space-y-2">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-on-surface-variant mb-1">
                  <ImageIcon className="w-6 h-6 text-on-surface-variant/60" />
                </div>
                <p className="text-xs font-medium text-on-surface">
                  Варианты пока не сгенерированы
                </p>
                <p className="text-[11px] text-on-surface-variant max-w-sm">
                  Нажмите «Сгенерировать {count} варианта», чтобы Imagen 3 создал независимые арты для выбора лучшего
                </p>
              </div>
            ) : (
              <div className={`grid gap-4 ${candidates.length === 4 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'}`}>
                {candidates.map((asset, idx) => {
                  const fullUrl = getFullUrl(asset.url);
                  const isAttaching = attachCoverMutation.isPending;

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
                        </div>

                        {/* Zoom button */}
                        <button
                          type="button"
                          onClick={() => setZoomedImageUrl(fullUrl)}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 backdrop-blur-md text-white/80 hover:text-white border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="Увеличить"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Footer Actions */}
                      <div className="p-3 bg-surface-container-high flex items-center justify-between gap-2 border-t border-white/5">
                        <div className="text-[10px] font-mono text-on-surface-variant truncate max-w-[200px]" title={asset.prompt}>
                          {asset.width && asset.height ? `${asset.width}×${asset.height} WebP` : 'WebP Asset'}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelectCover(asset)}
                          disabled={isAttaching}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-on-primary font-bold text-xs hover:bg-primary/90 transition-all cursor-pointer shadow disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Выбрать как обложку</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Full-size zoom modal */}
      {zoomedImageUrl && (
        <Modal
          open={Boolean(zoomedImageUrl)}
          onCancel={() => setZoomedImageUrl(null)}
          footer={null}
          width={1000}
          zIndex={1300}
          centered
          styles={{ content: { padding: 8, backgroundColor: '#000000', borderRadius: 12 } }}
        >
          <img
            src={zoomedImageUrl}
            alt="Full size preview"
            className="w-full h-auto max-h-[85vh] object-contain rounded-lg"
          />
        </Modal>
      )}
    </>
  );
};
