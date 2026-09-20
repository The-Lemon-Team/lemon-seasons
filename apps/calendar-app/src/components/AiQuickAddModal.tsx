import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  X,
  Check,
  Calendar,
  Folder,
  Tag,
  Trash2,
  Plus,
  Loader2,
  TrendingUp,
  Clock,
  CheckCircle,
  FileText,
  Film,
} from 'lucide-react';
import { ParsedNoteCard, NoteType, CreateNoteInput } from '@lenta/shared';
import { calendarApi } from '../api/client';

interface AiQuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
  defaultFolder?: string;
}

export const AiQuickAddModal: React.FC<AiQuickAddModalProps> = ({
  isOpen,
  onClose,
  defaultDate,
  defaultFolder,
}) => {
  const queryClient = useQueryClient();

  const today = new Date();
  const todayFormatted = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getFullYear()).slice(-2)}`;

  const promptChips = [
    {
      label: '📈 Тренды на сегодня',
      template: `Тренды ${todayFormatted}:\n- Уборка дома\n- Ремонтные работы\n- Warcraft\n- Overwatch`,
    },
    {
      label: '⏳ Тренд-период',
      template: `Тренд: Марафон Гарри Поттера 25.09.26 - 28.09.26 #кино #осень\nПапка: Trends/Cinema`,
    },
    {
      label: '📅 Событие с датой',
      template: `23.09.26 в 19:00 Митап по Svelte и TypeScript в Discord https://discord.gg/lemon #dev\nТег: tech.frontend`,
    },
    {
      label: '✅ Сделано',
      template: `Сделано сегодня: Завершил рефакторинг LentaSidebar и подключил стор. Папка: Projects/Lenta`,
    },
  ];

  const [inputText, setInputText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cards, setCards] = useState<ParsedNoteCard[]>([]);

  if (!isOpen) return null;

  const selectedCards = cards.filter((c) => c.selected);
  const selectedCount = selectedCards.length;
  const allSelected = cards.length > 0 && selectedCount === cards.length;

  const handleParse = async () => {
    if (!inputText.trim()) {
      setErrorMessage('Пожалуйста, введите текст для разбора.');
      return;
    }

    setIsParsing(true);
    setErrorMessage(null);

    try {
      const res = await calendarApi.parseAiNotes(inputText.trim(), {
        defaultDate: defaultDate || new Date().toISOString(),
        defaultFolder: defaultFolder || 'Trends',
        defaultFeedId: 'my-notes',
      });

      const parsedCards = res.cards || [];
      if (parsedCards.length === 0) {
        setErrorMessage('Не удалось выделить карточки. Попробуйте другой формат или список.');
      } else {
        setCards(parsedCards.map((c, i) => ({ ...c, selected: true, tempId: c.tempId || `card-${i + 1}` })));
      }
    } catch (err: any) {
      setErrorMessage(`Ошибка распознавания: ${err?.message || err}`);
    } finally {
      setIsParsing(false);
    }
  };

  const toggleCard = (tempId: string) => {
    setCards((prev) =>
      prev.map((c) => (c.tempId === tempId ? { ...c, selected: !c.selected } : c))
    );
  };

  const toggleSelectAll = (select: boolean) => {
    setCards((prev) => prev.map((c) => ({ ...c, selected: select })));
  };

  const updateCard = (tempId: string, patch: Partial<ParsedNoteCard>) => {
    setCards((prev) =>
      prev.map((c) => {
        if (c.tempId !== tempId) return c;
        const updated = { ...c, ...patch };
        if (patch.displayType === 'Trend') {
          updated.type = updated.endDate ? 'PERIOD' : 'SINGLE';
          if (!updated.hashtags) updated.hashtags = [];
          if (!updated.hashtags.includes('тренд')) updated.hashtags.unshift('тренд');
        }
        return updated;
      })
    );
  };

  const removeCard = (tempId: string) => {
    setCards((prev) => prev.filter((c) => c.tempId !== tempId));
  };

  const addEmptyCard = () => {
    const newCard: ParsedNoteCard = {
      tempId: `manual-${Date.now()}`,
      title: 'Новый тренд',
      type: 'SINGLE',
      displayType: 'Trend',
      startDate: defaultDate || new Date().toISOString(),
      endDate: null,
      feedSlug: 'my-notes',
      feedTitle: 'My Notes',
      folder: defaultFolder || 'Trends',
      hashtags: ['тренд'],
      icon: 'trending-up',
      description: '',
      selected: true,
    };
    setCards((prev) => [...prev, newCard]);
  };

  const handleSave = async () => {
    if (selectedCards.length === 0) return;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const payload: CreateNoteInput[] = selectedCards.map((c) => ({
        title: c.title.trim(),
        type: c.type as NoteType,
        startDate: c.startDate.includes('T') ? c.startDate : new Date(`${c.startDate}T12:00:00.000Z`).toISOString(),
        endDate: c.endDate ? (c.endDate.includes('T') ? c.endDate : new Date(`${c.endDate}T23:59:59.000Z`).toISOString()) : undefined,
        folder: c.folder || 'Notes',
        folders: c.folder ? [c.folder] : undefined,
        hashtags: c.hashtags,
        tagIds: c.taxonomyPath ? [c.taxonomyPath] : c.tagIds,
        sourceLink: c.sourceLink,
        icon: c.icon,
        description: c.description,
      }));

      await calendarApi.createNotesBatch(payload);

      // Invalidate queries so timeline, month view, and calendar refresh
      await queryClient.invalidateQueries({ queryKey: ['notes'] });
      await queryClient.invalidateQueries({ queryKey: ['folders'] });
      await queryClient.invalidateQueries({ queryKey: ['hashtags'] });

      onClose();
    } catch (err: any) {
      setErrorMessage(`Ошибка сохранения карточек: ${err?.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-[#161818] border border-[#2b2e2e] rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#242828] bg-gradient-to-r from-purple-950/20 via-pink-950/10 to-transparent">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold font-mono tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              AI ЧАТ
            </span>
            <h2 className="text-base font-semibold text-[#f1f1f1] font-sans">
              Быстрое добавление карточек
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#93927e] hover:text-[#f1f1f1] hover:bg-[#242828] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <p className="text-xs text-[#a0a090] font-sans">
            Введите текст на естественном языке (тренды, события, задачи, периоды). AI автоматически преобразует текст в структурированные карточки.
          </p>

          {/* Prompt Chips */}
          <div className="flex items-center flex-wrap gap-2 pt-1">
            <span className="text-[11px] font-mono text-[#808070] font-semibold">Шаблоны:</span>
            {promptChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setInputText(chip.template)}
                disabled={isParsing || isSaving}
                className="px-2.5 py-1 rounded-full text-xs font-mono bg-[#1e2020] border border-[#2e3232] text-[#c9c7b2] hover:border-purple-500 hover:text-purple-300 hover:bg-purple-950/20 transition-all cursor-pointer"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Text Area */}
          <div className="space-y-2">
            <textarea
              rows={5}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isParsing || isSaving}
              placeholder={`Пример:\nТренды ${todayFormatted}:\n- Уборка дома\n- Ремонтные работы\n- Warcraft #игры`}
              className="w-full bg-[#101212] border border-[#2b2e2e] focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-lg p-3 text-xs font-mono text-[#e2e2e2] placeholder-[#606050] outline-none transition-all resize-y"
            />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleParse}
                disabled={isParsing || isSaving || !inputText.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-sans font-semibold text-xs text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all cursor-pointer"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Распознавание...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Распознать карточки</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-red-950/30 border border-red-800/40 rounded-lg text-xs text-red-300">
              ⚠️ {errorMessage}
            </div>
          )}

          {/* Cards Section */}
          {cards.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs text-[#a0a090] border-b border-[#242828] pb-2">
                <label className="flex items-center gap-2 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    className="rounded border-[#3a3e3e] bg-[#121414] text-purple-600 focus:ring-purple-500"
                  />
                  <span>Выбрать все ({selectedCount} из {cards.length})</span>
                </label>

                <button
                  type="button"
                  onClick={addEmptyCard}
                  className="flex items-center gap-1 text-[11px] font-mono text-[#8b5cf6] hover:text-purple-300 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Добавить карточку</span>
                </button>
              </div>

              {/* Cards List */}
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {cards.map((card) => {
                  const isTrend = card.displayType === 'Trend';
                  return (
                    <div
                      key={card.tempId}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                        card.selected
                          ? 'bg-[#1b1d1d] border-purple-900/40'
                          : 'bg-[#141515] border-[#242828] opacity-60'
                      } ${isTrend ? 'border-l-4 border-l-purple-500' : ''}`}
                    >
                      {/* Checkbox */}
                      <div className="pt-1">
                        <input
                          type="checkbox"
                          checked={card.selected}
                          onChange={() => toggleCard(card.tempId)}
                          className="rounded border-[#3a3e3e] bg-[#121414] text-purple-600 focus:ring-purple-500"
                        />
                      </div>

                      {/* Content */}
                      <div className="flex-1 space-y-2">
                        {/* Title & Type */}
                        <div className="flex items-center gap-2">
                          <select
                            value={card.displayType === 'Trend' ? 'Trend' : card.type}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'Trend') {
                                updateCard(card.tempId, { displayType: 'Trend' });
                              } else {
                                updateCard(card.tempId, { type: val as any, displayType: val });
                              }
                            }}
                            className={`text-[11px] font-mono font-semibold py-1 px-2 rounded border bg-[#121414] ${
                              isTrend
                                ? 'border-purple-600/50 text-purple-300'
                                : 'border-[#3a3e3e] text-[#c9c7b2]'
                            }`}
                          >
                            <option value="Trend">📈 Trend</option>
                            <option value="SINGLE">📝 Point Note</option>
                            <option value="PERIOD">⏳ Period</option>
                            <option value="EVENT">📅 Event</option>
                            <option value="DONE">✅ Done</option>
                            <option value="FILM_RELEASE">🎬 Release</option>
                          </select>

                          <input
                            type="text"
                            value={card.title}
                            placeholder="Название карточки"
                            onChange={(e) => updateCard(card.tempId, { title: e.target.value })}
                            className="flex-1 bg-[#121414] border border-[#2b2e2e] focus:border-purple-500 rounded py-1 px-2.5 text-xs text-[#f1f1f1] font-sans font-medium outline-none"
                          />

                          <button
                            type="button"
                            onClick={() => removeCard(card.tempId)}
                            className="p-1 rounded text-[#707060] hover:text-red-400 hover:bg-red-950/20 transition-colors"
                            title="Удалить"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Dates & Folder & Tags */}
                        <div className="flex items-center flex-wrap gap-2 text-[11px] font-mono text-[#a0a090]">
                          <div className="flex items-center gap-1 bg-[#121414] border border-[#2b2e2e] rounded px-2 py-0.5">
                            <Calendar className="w-3 h-3 text-[#808070]" />
                            <input
                              type="date"
                              value={card.startDate ? card.startDate.split('T')[0] : ''}
                              onChange={(e) => updateCard(card.tempId, { startDate: e.target.value })}
                              className="bg-transparent border-none text-[#c9c7b2] outline-none text-[11px]"
                            />
                          </div>

                          {(card.type === 'PERIOD' || card.endDate) && (
                            <div className="flex items-center gap-1 bg-[#121414] border border-[#2b2e2e] rounded px-2 py-0.5">
                              <span className="text-[#808070]">—</span>
                              <input
                                type="date"
                                value={card.endDate ? card.endDate.split('T')[0] : ''}
                                onChange={(e) => updateCard(card.tempId, { endDate: e.target.value })}
                                className="bg-transparent border-none text-[#c9c7b2] outline-none text-[11px]"
                              />
                            </div>
                          )}

                          <div className="flex items-center gap-1 bg-[#121414] border border-[#2b2e2e] rounded px-2 py-0.5">
                            <Folder className="w-3 h-3 text-[#808070]" />
                            <input
                              type="text"
                              value={card.folder || ''}
                              placeholder="Папка"
                              onChange={(e) => updateCard(card.tempId, { folder: e.target.value })}
                              className="bg-transparent border-none text-[#c9c7b2] outline-none text-[11px] w-24"
                            />
                          </div>

                          <div className="flex items-center gap-1 bg-[#121414] border border-[#2b2e2e] rounded px-2 py-0.5 flex-1 min-w-[120px]">
                            <Tag className="w-3 h-3 text-[#808070]" />
                            <input
                              type="text"
                              value={(card.hashtags || []).map((h) => `#${h}`).join(' ')}
                              placeholder="#хэштеги"
                              onChange={(e) => {
                                const tags = (e.target.value.match(/#([\wа-яА-ЯёЁ_-]+)/g) || []).map((h) => h.replace(/^#/, ''));
                                updateCard(card.tempId, { hashtags: tags });
                              }}
                              className="bg-transparent border-none text-[#c9c7b2] outline-none text-[11px] w-full"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#242828] bg-[#121414]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg font-sans text-xs text-[#a0a090] hover:text-[#f1f1f1] hover:bg-[#1e2020] transition-colors"
          >
            Отмена
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || selectedCount === 0}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg font-sans font-semibold text-xs text-[#121414] bg-[#c9cd58] hover:bg-[#dce06b] disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Сохранение...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Добавить выбранные ({selectedCount})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
