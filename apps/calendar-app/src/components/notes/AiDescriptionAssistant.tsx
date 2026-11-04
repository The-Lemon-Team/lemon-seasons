import React, { useState } from 'react';
import { Sparkles, Loader2, Check, AlertCircle, ChevronDown, ChevronUp, Wand2 } from 'lucide-react';
import { calendarApi } from '../../api/client';

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
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const isCinema = noteType === 'FILM_RELEASE' || /кино|фильм|cinema|movie|film/i.test(category || '');

  const placeholderText = isCinema
    ? 'Пара строк для ИИ (например: режиссер Дени Вильнёв, финал истории на Арракисе, каст, ожидания релиза)...'
    : 'Пара строк для ИИ (например: ключевые участники, цели встречи, важные пункты или детали события)...';

  const handleGenerate = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setStatusMessage({ text: 'Сначала укажите название заметки в поле выше', type: 'error' });
      return;
    }

    setIsGenerating(true);
    setStatusMessage(null);

    try {
      const enrichment = await calendarApi.generateAiContent({
        title: cleanTitle,
        category: category || (isCinema ? 'Кино / Релиз' : 'Календарное событие'),
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

      setStatusMessage({ text: '✨ Описание успешно сгенерировано!', type: 'success' });
      setTimeout(() => {
        setStatusMessage(null);
        setIsOpen(false);
      }, 2500);
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Ошибка генерации описания';
      setStatusMessage({ text: `Не удалось сгенерировать: ${errMsg}`, type: 'error' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full mb-1">
      <div className="flex items-center justify-between mb-1.5">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono transition-all bg-[#c9cd58]/10 hover:bg-[#c9cd58]/20 text-[#e5e971] border border-[#c9cd58]/30 hover:border-[#c9cd58]/60 cursor-pointer shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#c9cd58]" />
          <span>{isOpen ? 'Скрыть ИИ-помощник' : '✨ Сгенерировать описание (AI)'}</span>
          {isOpen ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
        </button>

        {statusMessage && (
          <div
            className={`flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded ${
              statusMessage.type === 'success'
                ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                : 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <Check className="w-3 h-3" />
            ) : (
              <AlertCircle className="w-3 h-3" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}
      </div>

      {isOpen && (
        <div className="bg-[#181c1c] border border-[#2e3434] rounded-lg p-3 space-y-2 mb-2 transition-all">
          <div className="flex items-center justify-between text-[11px] font-mono text-[#c9c7b2]">
            <span className="flex items-center gap-1.5 text-[#e5e971] font-semibold">
              <Wand2 className="w-3.5 h-3.5" />
              Генерация текста для описания
            </span>
            <span className="text-[10px] text-[#93927e]">Gemini AI</span>
          </div>

          <textarea
            rows={2}
            value={promptContext}
            onChange={(e) => setPromptContext(e.target.value)}
            placeholder={placeholderText}
            className="w-full bg-[#121414] border border-[#2a2f2f] focus:border-[#c9cd58] rounded-md text-xs font-mono p-2 text-[#e2e2e2] placeholder-[#737260] outline-none resize-none"
          />

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] font-mono text-[#93927e]">
              Укажите 1-2 строки или оставьте пустым для генерации по названию и дате
            </span>

            <button
              type="button"
              disabled={isGenerating}
              onClick={handleGenerate}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all cursor-pointer ${
                isGenerating
                  ? 'bg-[#242828] text-[#93927e] cursor-not-allowed'
                  : 'bg-[#c9cd58] text-[#121414] hover:bg-[#d8dc66] active:scale-[0.98]'
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
