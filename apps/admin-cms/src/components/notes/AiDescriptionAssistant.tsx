import React, { useState } from 'react';
import { Sparkles, Loader2, Wand2, ChevronDown, ChevronUp } from 'lucide-react';
import { message } from 'antd';
import { ingestionApi } from '../../api/client';

export interface AiDescriptionAssistantProps {
  title: string;
  startDate: string;
  noteType?: string;
  category?: string;
  currentDescription: string;
  onDescriptionGenerated: (newDescription: string) => void;
  onHashtagsSuggested?: (hashtags: string[]) => void;
}

export const AiDescriptionAssistant: React.FC<AiDescriptionAssistantProps> = ({
  title,
  startDate,
  noteType,
  category,
  currentDescription,
  onDescriptionGenerated,
  onHashtagsSuggested,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [promptContext, setPromptContext] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const isCinema = noteType === 'FILM_RELEASE' || /кино|фильм|cinema|movie|film/i.test(category || '');

  const placeholderText = isCinema
    ? 'Пара строк для ИИ (например: режиссер Дени Вильнёв, финал саги на Арракисе, каст, ожидания релиза)...'
    : 'Пара строк для ИИ (например: ключевые участники, тезисы, цели события или детали встречи)...';

  const handleGenerate = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      message.warning('Сначала укажите название заметки в поле выше');
      return;
    }

    setIsGenerating(true);

    try {
      const enrichment = await ingestionApi.generateAiContent({
        title: cleanTitle,
        category: category || (isCinema ? 'Кино / Релиз' : 'Заметка Lenta'),
        dateStr: startDate || '2026',
        context: promptContext.trim() || undefined,
        noteType,
      });

      if (enrichment.description) {
        onDescriptionGenerated(enrichment.description);
      }

      if (enrichment.hashtags && enrichment.hashtags.length > 0 && onHashtagsSuggested) {
        onHashtagsSuggested(enrichment.hashtags);
      }

      message.success('✨ Описание успешно сгенерировано Gemini AI!');
      setIsOpen(false);
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Ошибка генерации';
      message.error(`Не удалось сгенерировать описание: ${errMsg}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full mb-2">
      <div className="flex items-center justify-between mb-1">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-all bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 hover:border-primary/50 cursor-pointer shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>{isOpen ? 'Скрыть ИИ-помощник' : '✨ Сгенерировать описание (AI)'}</span>
          {isOpen ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
        </button>
      </div>

      {isOpen && (
        <div className="bg-surface-container border border-outline-variant rounded-xl p-3 space-y-2.5 shadow-sm transition-all">
          <div className="flex items-center justify-between text-xs font-mono text-on-surface">
            <span className="flex items-center gap-1.5 text-primary font-semibold">
              <Wand2 className="w-3.5 h-3.5" />
              Генерация Markdown-описания
            </span>
            <span className="text-[10px] text-on-surface-variant font-mono">Gemini 2.5 Flash</span>
          </div>

          <textarea
            rows={2}
            value={promptContext}
            onChange={(e) => setPromptContext(e.target.value)}
            placeholder={placeholderText}
            className="w-full bg-surface-container-high border border-outline-variant focus:border-primary rounded-lg text-xs font-mono p-2.5 text-on-surface placeholder-outline outline-none resize-none"
          />

          <div className="flex items-center justify-between pt-0.5">
            <span className="text-[10px] font-mono text-on-surface-variant">
              Укажите 1-2 строки указаний или оставьте пустым для генерации по названию и дате
            </span>

            <button
              type="button"
              disabled={isGenerating}
              onClick={handleGenerate}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                isGenerating
                  ? 'bg-surface-container-highest text-on-surface-variant cursor-not-allowed'
                  : 'bg-primary text-on-primary hover:opacity-95 active:scale-[0.98]'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Генерация...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{currentDescription.trim() ? 'Перегенерировать' : 'Сгенерировать'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
