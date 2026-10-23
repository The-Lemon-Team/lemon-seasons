import React, { useState } from 'react';
import { Modal, message, Spin } from 'antd';
import { Sparkles, Wand2, X } from 'lucide-react';
import { AiMediaAsset } from '../../api/client';
import { useRemixAiImage } from '../../api/queries';
import { CoverAspectRatio, REMIX_PRESETS, STYLE_PRESETS } from './coverStudio.constants';

interface CoverStudioRemixModalProps {
  sourceAsset: AiMediaAsset | null;
  open: boolean;
  onClose: () => void;
  onRemixSuccess: (newCandidates: AiMediaAsset[]) => void;
}

export const CoverStudioRemixModal: React.FC<CoverStudioRemixModalProps> = ({
  sourceAsset,
  open,
  onClose,
  onRemixSuccess,
}) => {
  const [instruction, setInstruction] = useState('');
  const [targetStyle, setTargetStyle] = useState<string>(sourceAsset?.style || 'ai-neural');
  const [aspectRatio, setAspectRatio] = useState<CoverAspectRatio>('16:9');
  const [count] = useState<2 | 4>(2);

  const remixMutation = useRemixAiImage();

  if (!open || !sourceAsset) return null;

  const handleRemix = async () => {
    if (!instruction.trim()) {
      message.warning('Укажите инструкцию для ремикса изображения');
      return;
    }

    try {
      const res = await remixMutation.mutateAsync({
        sourceAssetId: sourceAsset.id,
        instruction: instruction.trim(),
        style: targetStyle,
        aspectRatio,
        count,
      });

      message.success(`Ремикс готов! Сгенерировано: ${res.candidates.length}`);
      onRemixSuccess(res.candidates);
      onClose();
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || 'Ошибка генерации ремикса');
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={680}
      zIndex={1300}
      centered
      destroyOnClose
      styles={{
        content: {
          padding: 0,
          backgroundColor: 'var(--panel-bg)',
          border: '1px solid var(--tile-border)',
          borderRadius: 12,
          overflow: 'hidden',
        },
      }}
    >
      <div className="px-5 py-3 border-b border-tile-border bg-tile-subtle flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-primary/15 text-primary flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-text-main">Ремикс изображения (Vision + Imagen 3 / Flux)</h3>
            <p className="text-[10px] text-text-muted">Сохраняет исходную композицию и трансформирует в IT-стиль</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-text-muted hover:text-text-main cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-4">
        {/* Source image preview */}
        <div className="flex gap-4 items-center bg-surface-container-low p-3 rounded-lg border border-white/5">
          <img
            src={sourceAsset.thumbnailUrl || sourceAsset.url}
            alt={sourceAsset.prompt}
            className="w-20 h-20 object-cover rounded border border-white/10"
          />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-mono text-primary font-bold">Исходный ассет</div>
            <div className="text-xs text-text-main truncate">{sourceAsset.userPrompt || sourceAsset.prompt}</div>
            <div className="text-[10px] text-text-muted mt-1 font-mono">
              Модель: {sourceAsset.model} • Стиль: {sourceAsset.style || 'cinematic'} • {sourceAsset.aspectRatio}
            </div>
          </div>
        </div>

        {/* Target Visual Style */}
        <div>
          <span className="text-[10px] font-mono text-text-muted uppercase block mb-1.5">
            Целевой визуальный стиль ремикса:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {STYLE_PRESETS.slice(0, 10).map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setTargetStyle(st.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 border transition-all cursor-pointer ${
                  targetStyle === st.id
                    ? 'bg-primary/20 border-primary text-primary font-bold'
                    : 'bg-surface-container border-white/5 text-text-muted hover:text-text-main'
                }`}
              >
                <span>{st.icon}</span>
                <span>{st.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Instruction input */}
        <div>
          <label className="block text-xs font-mono text-text-muted mb-1">
            Инструкция для трансформации (что добавить / какой IT-акцент сделать):
          </label>
          <textarea
            rows={2}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="Например: Добавь голографический щит кибербезопасности, матрицу кода и неоновые звуковые волны..."
            className="w-full bg-surface-container-lowest border border-white/10 focus:border-primary rounded-lg p-2.5 text-xs text-on-surface outline-none resize-none font-sans"
          />
        </div>

        {/* Quick presets */}
        <div>
          <span className="text-[10px] font-mono text-text-muted uppercase">Быстрые IT-трансформации:</span>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {REMIX_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setInstruction(preset)}
                className="text-[11px] px-2 py-1 rounded bg-surface-container-high hover:bg-primary/15 hover:text-primary text-text-muted border border-white/5 transition-colors cursor-pointer text-left"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Format and Submit */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-text-muted">Формат:</span>
            {(['16:9', '1:1', '9:16', '4:3', '3:4'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setAspectRatio(r)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono border cursor-pointer ${
                  aspectRatio === r ? 'bg-primary/20 border-primary text-primary font-bold' : 'border-white/10 text-text-muted'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleRemix}
            disabled={remixMutation.isPending || !instruction.trim()}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-on-primary font-bold text-xs hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-50"
          >
            {remixMutation.isPending ? (
              <>
                <Spin size="small" />
                <span>Ремиксим...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-3.5 h-3.5" />
                <span>Создать ремикс</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
