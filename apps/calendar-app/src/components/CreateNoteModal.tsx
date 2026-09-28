import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { NoteType } from '@lenta/shared';
import { useI18n } from '../i18n';
import { useFeeds, queryKeys } from '../api/queries';
import { calendarApi } from '../api/client';
import { useFoldersContext } from '../context/FoldersContext';
import { useObsidianContainers } from '../context/ObsidianContainersContext';
import { Folder as FolderType } from '@lenta/shared';
import { X, Calendar, Tag, Plus, Check, FileText, Folder, AlertCircle } from 'lucide-react';
import dayjs from 'dayjs';
import { Modal } from './Modal';

interface CreateNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialFolderPath?: string;
}

export const CreateNoteModal: React.FC<CreateNoteModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialFolderPath,
}) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { data: feeds = [] } = useFeeds();

  let externalFolders: FolderType[] = [];
  let internalFolders: FolderType[] = [];
  try {
    const foldersCtx = useFoldersContext();
    externalFolders = foldersCtx.externalFolders || [];
    internalFolders = foldersCtx.internalFolders || [];
  } catch {
    externalFolders = [];
    internalFolders = [];
  }

  let containers: any[] = [];
  try {
    const contCtx = useObsidianContainers();
    containers = contCtx.containers || [];
  } catch {
    containers = [];
  }

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<NoteType>('SINGLE');
  const [startDate, setStartDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState('');
  const [feedId, setFeedId] = useState('');
  const [folderPath, setFolderPath] = useState(initialFolderPath || '');
  const [isCustomFolder, setIsCustomFolder] = useState(false);
  const [hashtagsInput, setHashtagsInput] = useState('');
  const [curator, setCurator] = useState('');
  const [resonanceScore, setResonanceScore] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Set initial folder path when opened or prop changes
  React.useEffect(() => {
    if (isOpen) {
      setFolderPath(initialFolderPath || '');
      setIsCustomFolder(false);
      setErrorMessage(null);
    }
  }, [initialFolderPath, isOpen]);

  // Set default feed when feeds load
  React.useEffect(() => {
    if (feeds.length > 0 && !feedId) {
      setFeedId(feeds[0].id);
    }
  }, [feeds, feedId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const hashtags = hashtagsInput
        .split(/[,\s]+/)
        .map((h) => h.trim().replace(/^#/, ''))
        .filter(Boolean);

      await calendarApi.createNote({
        title: title.trim(),
        description: description.trim(),
        type,
        startDate: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        feedId: feedId || undefined,
        hashtags: hashtags.length > 0 ? hashtags : undefined,
        curator: curator.trim() || undefined,
        resonanceScore: resonanceScore.trim() ? Number(resonanceScore) : undefined,
      });

      // Invalidate queries so that the newly created note is immediately displayed on the calendar
      await queryClient.invalidateQueries({ queryKey: queryKeys.allNotes });

      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        setTitle('');
        setDescription('');
        setHashtagsInput('');
        setFolderPath('');
        setCurator('');
        setResonanceScore('');
        setIsCustomFolder(false);
        onSuccess?.();
        onClose();
      }, 600);
    } catch (err: any) {
      console.error('Failed to create note on backend:', err);
      setErrorMessage(err?.response?.data?.message || err?.message || 'Ошибка создания заметки');
    } finally {
      setIsSubmitting(false);
    }
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
                  data-testid="note-title-input"
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

              {/* Grid 2: Folder & Hashtags */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-mono text-[#c9c7b2] flex items-center gap-1.5">
                      <Folder className="w-3.5 h-3.5 text-[#c9cd58]" />
                      {t.noteFolder}
                    </label>
                    {isCustomFolder && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomFolder(false);
                          setFolderPath('');
                        }}
                        className="text-[10px] font-mono text-[#c9cd58] hover:underline cursor-pointer"
                      >
                        {t.noteFolderBackToList}
                      </button>
                    )}
                  </div>

                  {!isCustomFolder ? (
                    <>
                      <select
                        value={folderPath}
                        onChange={(e) => {
                          if (e.target.value === '__custom__') {
                            setIsCustomFolder(true);
                            setFolderPath('');
                          } else {
                            setFolderPath(e.target.value);
                          }
                        }}
                        className="w-full bg-[#121414] border border-[#242828] focus:border-[#c9cd58] rounded-md text-xs font-mono px-3 py-2 text-[#e2e2e2] outline-none"
                      >
                        <option value="">{t.noteFolderRoot}</option>
                        {externalFolders.length > 0 && (
                          <optgroup label="🌐 Общие проектные папки (External)">
                            {externalFolders.map((f) => (
                              <option key={f.id} value={f.path}>
                                🌐 {f.name} ({f.path})
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {internalFolders.length > 0 && (
                          <optgroup label="📦 Папки контейнеров (Internal)">
                            {internalFolders.map((f) => {
                              const cont = containers.find((c) => c.id === f.containerId);
                              return (
                                <option key={f.id} value={f.path}>
                                  📦 [{cont?.name || 'Vault'}] {f.name} ({f.path})
                                </option>
                              );
                            })}
                          </optgroup>
                        )}
                        {folderPath &&
                          !externalFolders.some((f) => f.path.toLowerCase() === folderPath.toLowerCase()) &&
                          !internalFolders.some((f) => f.path.toLowerCase() === folderPath.toLowerCase()) && (
                            <option value={folderPath}>📁 {folderPath}</option>
                          )}
                        <option value="__custom__">✏️ {t.noteFolderCustom}</option>
                      </select>

                      {/* Scope Information Note */}
                      {(() => {
                        const selectedFolderObj = [...externalFolders, ...internalFolders].find(
                          (f) => f.path.toLowerCase() === folderPath.toLowerCase()
                        );
                        if (!selectedFolderObj) return null;
                        const isExt = selectedFolderObj.scope === 'external' || !selectedFolderObj.containerId;
                        const cont = containers.find((c) => c.id === selectedFolderObj.containerId);
                        return (
                          <p className="mt-1 text-[10px] font-mono leading-tight">
                            {isExt ? (
                              <span className="text-[#e5e971]">
                                🌐 <strong>{t.folderScopeExternal}</strong>: заметка будет транслироваться во все подключённые Obsidian-контейнеры.
                              </span>
                            ) : (
                              <span className="text-[#93c5fd]">
                                📦 <strong>{t.folderScopeInternal}</strong>: сохранится строго внутри «{cont?.name || selectedFolderObj.containerId}».
                              </span>
                            )}
                          </p>
                        );
                      })()}
                    </>
                  ) : (
                    <input
                      type="text"
                      autoFocus
                      value={folderPath}
                      onChange={(e) => setFolderPath(e.target.value)}
                      placeholder={t.noteFolderPlaceholder}
                      className="w-full bg-[#121414] border border-[#242828] focus:border-[#c9cd58] rounded-md text-xs font-mono px-3 py-2 text-[#e2e2e2] placeholder-[#93927e] outline-none"
                    />
                  )}
                </div>

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
              </div>

              {/* Curator & Resonance Score */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-xl bg-[#141717] border border-[#242828]">
                <div>
                  <label className="block text-[11px] font-mono text-[#c9c7b2] mb-1">
                    Куратор / Аналитический актор
                  </label>
                  <select
                    value={curator}
                    onChange={(e) => setCurator(e.target.value)}
                    className="w-full bg-[#121414] border border-[#242828] focus:border-[#c9cd58] rounded-md text-xs font-mono px-3 py-2 text-[#e2e2e2] outline-none"
                  >
                    <option value="">Без куратора</option>
                    <option value="Иван Белый">🇷🇺 Иван Белый (Внутренний контур РФ)</option>
                    <option value="Kirk Kitten">🌐 Kirk Kitten (Международные рынки, OFAC)</option>
                    <option value="Пользователь">👤 Пользователь (Суверенный синтез)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-[#c9c7b2] mb-1">
                    Резонанс пересечения (0 - 100%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="Например: 85"
                    value={resonanceScore}
                    onChange={(e) => setResonanceScore(e.target.value)}
                    className="w-full bg-[#121414] border border-[#242828] focus:border-[#c9cd58] rounded-md text-xs font-mono px-3 py-2 text-[#e2e2e2] placeholder-[#93927e] outline-none"
                  />
                </div>
              </div>

              {/* Grid 3: Start & End Date */}
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

              {/* Markdown Body */}
              <div>
                <label className="block text-[11px] font-mono text-[#c9c7b2] mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#c9cd58]" />
                  Описание в формате Markdown
                </label>
                <textarea
                  rows={5}
                  data-testid="note-desc-input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t.noteContentPlaceholder}
                  className="w-full bg-[#121414] border border-[#242828] focus:border-[#c9cd58] rounded-md text-xs font-mono p-3 text-[#e2e2e2] placeholder-[#93927e] outline-none resize-y"
                />
              </div>

              {errorMessage && (
                <div className="flex items-center gap-2 px-3 py-2 rounded bg-red-900/30 border border-red-500/50 text-red-200 text-xs font-mono">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#242828]">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-md border border-[#242828] text-xs font-mono text-[#c9c7b2] hover:bg-[#242828] hover:text-white transition-colors disabled:opacity-50"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  data-testid="note-submit-btn"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-md bg-[#c9cd58] hover:bg-[#dce06b] text-[#121414] font-sans font-bold text-xs transition-colors flex items-center gap-2 shadow-glow-lemon disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isSubmitting ? 'Сохранение...' : t.save}</span>
                </button>
              </div>
            </>
          )}
        </form>
    </Modal>
  );
};
