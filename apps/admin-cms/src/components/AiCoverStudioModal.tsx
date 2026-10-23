import React, { useState, useEffect, useMemo } from 'react';
import { Modal, message, Spin } from 'antd';
import {
  Sparkles,
  Wand2,
  RefreshCw,
  X,
  FolderOpen,
} from 'lucide-react';
import { useGenerateAiBatch, useAttachCoverToNote } from '../api/queries';
import { AiMediaAsset } from '../api/client';
import { CoverStudioRemixModal } from './cover-studio/CoverStudioRemixModal';
import { CoverStudioLibraryTab } from './cover-studio/CoverStudioLibraryTab';
import { CoverStudioItToolkit } from './cover-studio/CoverStudioItToolkit';
import { CoverStudioCandidatesGrid } from './cover-studio/CoverStudioCandidatesGrid';
import { CoverAspectRatio } from './cover-studio/coverStudio.constants';
import {
  buildTemplatePrompt,
  detectItStyleRecommendation,
} from './cover-studio/coverStudio.utils';

export interface AiCoverStudioModalProps {
  open: boolean;
  onClose: () => void;
  noteId?: string;
  initialTitle?: string;
  initialDescription?: string;
  initialStyle?: string;
  initialTemplateId?: string;
  onCoverSelected?: (imageUrl: string) => void;
  onInsertMarkdown?: (markdownSnippet: string) => void;
}

export const AiCoverStudioModal: React.FC<AiCoverStudioModalProps> = ({
  open,
  onClose,
  noteId,
  initialTitle = '',
  initialDescription = '',
  initialStyle,
  initialTemplateId,
  onCoverSelected,
  onInsertMarkdown,
}) => {
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const [activeTab, setActiveTab] = useState<'generate' | 'library'>('generate');
  const [prompt, setPrompt] = useState(initialTitle);
  const [style, setStyle] = useState(initialStyle || 'ai-neural');
  const [aspectRatio, setAspectRatio] = useState<CoverAspectRatio>('16:9');
  const [count, setCount] = useState<2 | 4>(2);
  const [candidates, setCandidates] = useState<AiMediaAsset[]>([]);
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);
  const [remixSourceAsset, setRemixSourceAsset] = useState<AiMediaAsset | null>(null);

  const generateBatchMutation = useGenerateAiBatch();
  const attachCoverMutation = useAttachCoverToNote();

  const recommendation = useMemo(
    () => detectItStyleRecommendation(initialTitle || prompt, initialDescription),
    [initialTitle, initialDescription, prompt],
  );

  useEffect(() => {
    if (open) {
      const baseText = initialTitle || prompt;
      if (initialTemplateId) {
        const built = buildTemplatePrompt(initialTemplateId, baseText);
        if (built) {
          setPrompt(built.prompt);
          setStyle(built.styleId);
          setAspectRatio(built.aspectRatio);
          return;
        }
      }

      if (initialStyle) {
        setStyle(initialStyle);
      } else if (recommendation) {
        setStyle(recommendation.styleId);
        setAspectRatio(recommendation.aspectRatio);
      }

      if (initialTitle && !prompt) {
        setPrompt(initialTitle);
      }
    }
  }, [open, initialTitle, initialStyle, initialTemplateId]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;

      if (zoomedImageUrl) {
        e.stopPropagation();
        setZoomedImageUrl(null);
      } else if (remixSourceAsset) {
        e.stopPropagation();
        setRemixSourceAsset(null);
      } else {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, zoomedImageUrl, remixSourceAsset, onClose]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      message.warning('Введите IT-тему или название заметки для генерации');
      return;
    }

    try {
      const res = await generateBatchMutation.mutateAsync({
        prompt: prompt.trim(),
        style,
        aspectRatio,
        context: initialDescription ? initialDescription.slice(0, 350) : undefined,
        count,
        noteId: noteId && noteId !== 'new' ? noteId : undefined,
      });

      setCandidates(res.candidates);
      message.success(`Сгенерировано вариантов: ${res.candidates.length}`);
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || 'Ошибка генерации вариантов');
    }
  };

  const getFullUrl = (url: string) => (url.startsWith('http') ? url : `${apiBase}${url}`);

  const handleSelectCover = async (asset: AiMediaAsset) => {
    const fullUrl = getFullUrl(asset.url);

    if (noteId && noteId !== 'new') {
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
    } else if (onInsertMarkdown) {
      onInsertMarkdown(`![${prompt || initialTitle || 'IT Cover'}](${fullUrl})`);
      message.success('Обложка вставлена в Markdown новой заметки!');
    }

    onCoverSelected?.(asset.url);
    onClose();
  };

  const handleCopyMarkdown = (asset: AiMediaAsset) => {
    const fullUrl = getFullUrl(asset.url);
    const snippet = `![${asset.userPrompt || prompt || 'IT Image'}](${fullUrl})`;
    if (onInsertMarkdown) {
      onInsertMarkdown(snippet);
      message.success('Изображение вставлено в редактор Markdown');
    } else {
      navigator.clipboard.writeText(snippet);
      message.success('Markdown-ссылка скопирована');
    }
  };

  if (!open) return null;

  return (
    <>
      <Modal
        open={open}
        onCancel={onClose}
        keyboard={!remixSourceAsset && !zoomedImageUrl}
        footer={null}
        width={980}
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
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center border border-primary/25">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-main flex items-center gap-1.5">
                AI Cover Studio & IT Media Hub
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
                  IT • AI • Podcasts • Security • Changelogs
                </span>
              </h2>
              <p className="text-[11px] font-mono text-text-muted">
                Генерация IT-обложек, шаблоны подкастов и релизов, ремиксы и медиатека
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-surface-container rounded-lg p-0.5 border border-white/5 text-xs font-mono">
              <button
                type="button"
                onClick={() => setActiveTab('generate')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'generate'
                    ? 'bg-primary text-on-primary font-bold'
                    : 'text-text-muted hover:text-text-main'
                }`}
              >
                <Wand2 className="w-3 h-3" />
                <span>IT Генератор</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('library')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'library'
                    ? 'bg-primary text-on-primary font-bold'
                    : 'text-text-muted hover:text-text-main'
                }`}
              >
                <FolderOpen className="w-3 h-3" />
                <span>Медиатека</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-white/5 transition-colors border border-transparent hover:border-white/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[82vh] overflow-y-auto custom-scrollbar">
          {activeTab === 'library' ? (
            <CoverStudioLibraryTab
              onSelectCover={handleSelectCover}
              onRemixAsset={(asset) => setRemixSourceAsset(asset)}
              onZoomImage={(url) => setZoomedImageUrl(getFullUrl(url))}
              onInsertMarkdown={onInsertMarkdown}
            />
          ) : (
            <>
              <div className="bg-surface-container-low p-4 rounded-xl border border-white/5 space-y-4">
                {/* Prompt input */}
                <div>
                  <label className="block text-xs font-mono text-on-surface-variant mb-1 flex items-center justify-between">
                    <span>Тема IT-события, релиза, подкаста или уязвимости</span>
                    {initialTitle && prompt !== initialTitle && (
                      <button
                        type="button"
                        onClick={() => setPrompt(initialTitle)}
                        className="text-[10px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Сбросить к заголовку заметки</span>
                      </button>
                    )}
                  </label>
                  <textarea
                    rows={2}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Например: Выпуск подкаста про агентные LLM, разбор критической CVE-уязвимости в Linux или релиз Kubernetes 1.32..."
                    className="w-full bg-surface-container-lowest border border-white/10 focus:border-primary rounded-lg p-2.5 text-xs text-on-surface placeholder-outline/60 outline-none resize-none font-sans"
                  />
                </div>

                {/* IT Toolkit: Workflow Templates, Visual Styles & Scene Modifiers */}
                <CoverStudioItToolkit
                  prompt={prompt}
                  style={style}
                  aspectRatio={aspectRatio}
                  baseTopic={initialTitle}
                  recommendation={recommendation}
                  onPromptChange={setPrompt}
                  onStyleChange={setStyle}
                  onAspectRatioChange={setAspectRatio}
                />

                {/* Ratio & Sample Count */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-white/5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-mono text-on-surface-variant uppercase mr-1">
                      Формат:
                    </span>
                    {(
                      [
                        { id: '16:9', hint: '16:9 Пост/Фид' },
                        { id: '1:1', hint: '1:1 Подкаст' },
                        { id: '9:16', hint: '9:16 Shorts' },
                        { id: '4:3', hint: '4:3 Статья' },
                        { id: '3:4', hint: '3:4 Карточка' },
                      ] as const
                    ).map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setAspectRatio(r.id)}
                        className={`px-2 py-0.5 rounded text-xs font-mono border transition-all cursor-pointer ${
                          aspectRatio === r.id
                            ? 'bg-white/10 border-primary text-primary font-bold'
                            : 'bg-surface-container border-white/5 text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        {r.hint}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      {([2, 4] as const).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCount(c)}
                          className={`px-2.5 py-1 rounded text-xs font-mono border transition-all cursor-pointer ${
                            count === c
                              ? 'bg-primary/20 text-primary font-bold border-primary'
                              : 'bg-surface-container border-white/5 text-on-surface-variant hover:text-on-surface'
                          }`}
                        >
                          {c} вар.
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
              </div>

              {/* Results Gallery Grid */}
              <CoverStudioCandidatesGrid
                candidates={candidates}
                count={count}
                isAttaching={attachCoverMutation.isPending}
                getFullUrl={getFullUrl}
                onSelectCover={handleSelectCover}
                onRemixAsset={(asset) => setRemixSourceAsset(asset)}
                onZoomImage={(url) => setZoomedImageUrl(url)}
                onCopyMarkdown={handleCopyMarkdown}
              />
            </>
          )}
        </div>
      </Modal>

      <CoverStudioRemixModal
        sourceAsset={remixSourceAsset}
        open={Boolean(remixSourceAsset)}
        onClose={() => setRemixSourceAsset(null)}
        onRemixSuccess={(newCandidates) => {
          setCandidates(newCandidates);
          setActiveTab('generate');
        }}
      />

      {zoomedImageUrl && (
        <Modal
          open={Boolean(zoomedImageUrl)}
          onCancel={() => setZoomedImageUrl(null)}
          footer={null}
          width={1000}
          zIndex={1400}
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
