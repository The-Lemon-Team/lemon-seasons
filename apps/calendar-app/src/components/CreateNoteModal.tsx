import React, { useState } from 'react';
import { NoteType } from '@lenta/shared';
import { useI18n } from '../i18n';
import { useFeeds } from '../api/queries';
import { X, Calendar, Tag, Plus, Check, FileText } from 'lucide-react';
import dayjs from 'dayjs';
import { Modal } from './Modal';

interface CreateNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateNoteModal: React.FC<CreateNoteModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { t, lang } = useI18n();
  const { data: feeds = [] } = useFeeds();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<NoteType>('SINGLE');
  const [startDate, setStartDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState('');
  const [feedId, setFeedId] = useState('');
  const [hashtagsInput, setHashtagsInput] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Set default feed when feeds load
  React.useEffect(() => {
    if (feeds.length > 0 && !feedId) {
      setFeedId(feeds[0].id);
    }
  }, [feeds, feedId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setTitle('');
      setDescription('');
      setHashtagsInput('');
      onSuccess?.();
      onClose();
    }, 1000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      showDefaultHeader={false}
      maxWidth="max-w-2xl"
    >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#242828] bg-[#121414]/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#c9cd58]/20 border border-[#c9cd58]/40 flex items-center justify-center text-sm">
              ✍️
            </div>
            <div>
              <h3 className="font-sans font-bold text-sm text-[#e5e971]">
                {t.createNoteTitle}
              </h3>
              <p className="text-[11px] font-mono text-[#93927e]">
                Member Workspace Tool
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#93927e] hover:text-white hover:bg-[#242828] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
          {savedSuccess ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-[#c9cd58]/20 border border-[#c9cd58] flex items-center justify-center text-[#c9cd58]">
                <Check className="w-6 h-6" />
              </div>
              <p className="font-sans font-bold text-sm text-[#e5e971]">
                {t.createNoteSuccess}
              </p>
            </div>
          ) : (
            <>
              {/* Title */}
              <div>
                <label className="block text-[11px] font-mono text-[#c9c7b2] mb-1">
                  Заголовок записи <span className="text-[#c9cd58]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t.noteTitlePlaceholder}
                  className="w-full bg-[#121414] border border-[#242828] focus:border-[#c9cd58] rounded-md text-xs font-mono px-3 py-2 text-[#e2e2e2] placeholder-[#93927e] outline-none"
                />
              </div>

              {/* Grid 1: Type & Feed */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-[#c9c7b2] mb-1">
                    {t.noteType}
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as NoteType)}
                    className="w-full bg-[#121414] border border-[#242828] focus:border-[#c9cd58] rounded-md text-xs font-mono px-3 py-2 text-[#e2e2e2] outline-none"
                  >
                    <option value="SINGLE">Точечная заметка (SINGLE)</option>
                    <option value="EVENT">Событие календаря (EVENT)</option>
                    <option value="PERIOD">Временной отрезок (PERIOD)</option>
                    <option value="FILM_RELEASE">Релиз / Премьера (FILM_RELEASE)</option>
                    <option value="MENTION">Упоминание (MENTION)</option>
                    <option value="DONE">Выполненная цель (DONE)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#c9c7b2] mb-1">
                    {t.noteFeed}
                  </label>
                  <select
                    value={feedId}
                    onChange={(e) => setFeedId(e.target.value)}
                    className="w-full bg-[#121414] border border-[#242828] focus:border-[#c9cd58] rounded-md text-xs font-mono px-3 py-2 text-[#e2e2e2] outline-none"
                  >
                    {feeds.length > 0 ? (
                      feeds.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.title}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="feed-tech">Technical Strategy</option>
                        <option value="feed-mcu">Marvel Cinematic Universe</option>
                        <option value="feed-personal">Личный приватный журнал</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Grid 2: Start & End Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-[#c9c7b2] mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#c9cd58]" />
                    {t.noteDate} <span className="text-[#c9cd58]">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-[#121414] border border-[#242828] focus:border-[#c9cd58] rounded-md text-xs font-mono px-3 py-2 text-[#e2e2e2] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#c9c7b2] mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#93927e]" />
                    Дата окончания (опционально)
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-[#121414] border border-[#242828] focus:border-[#c9cd58] rounded-md text-xs font-mono px-3 py-2 text-[#e2e2e2] outline-none"
                  />
                </div>
              </div>

              {/* Hashtags input */}
              <div>
                <label className="block text-[11px] font-mono text-[#c9c7b2] mb-1 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#c9cd58]" />
                  Хэштеги (через запятую или пробел)
                </label>
                <input
                  type="text"
                  value={hashtagsInput}
                  onChange={(e) => setHashtagsInput(e.target.value)}
                  placeholder="#стратегия, #релиз2026, #важное"
                  className="w-full bg-[#121414] border border-[#242828] focus:border-[#c9cd58] rounded-md text-xs font-mono px-3 py-2 text-[#e2e2e2] placeholder-[#93927e] outline-none"
                />
              </div>

              {/* Markdown Body */}
              <div>
                <label className="block text-[11px] font-mono text-[#c9c7b2] mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#c9cd58]" />
                  Описание в формате Markdown
                </label>
                <textarea
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t.noteContentPlaceholder}
                  className="w-full bg-[#121414] border border-[#242828] focus:border-[#c9cd58] rounded-md text-xs font-mono p-3 text-[#e2e2e2] placeholder-[#93927e] outline-none resize-y"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#242828]">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-md border border-[#242828] text-xs font-mono text-[#c9c7b2] hover:bg-[#242828] hover:text-white transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-md bg-[#c9cd58] hover:bg-[#dce06b] text-[#121414] font-sans font-bold text-xs transition-colors flex items-center gap-2 shadow-glow-lemon"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t.save}</span>
                </button>
              </div>
            </>
          )}
        </form>
    </Modal>
  );
};
