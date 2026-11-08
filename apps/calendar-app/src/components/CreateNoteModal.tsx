import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppMode } from '../context/AppModeContext';
import { NoteType, NotePrivacy, NoteTemplateDefinition } from '@lenta/shared';
import { useI18n } from '../i18n';
import { useFeeds, queryKeys } from '../api/queries';
import { calendarApi } from '../api/client';
import { useFoldersContext } from '../context/FoldersContext';
import { Folder as FolderType } from '@lenta/shared';
import { NotePrivacySelector } from './notes/NotePrivacySelector';
import { NotePosterPicker } from './notes/NotePosterPicker';
import { PendingPosterItem } from '@lenta/shared';
import { NoteTemplateSelector } from './notes/NoteTemplateSelector';
import { AiDescriptionAssistant } from './notes/AiDescriptionAssistant';
import {
  X,
  Calendar,
  Tag,
  Plus,
  Check,
  FileText,
  Folder,
  AlertCircle,
  Pin,
  CalendarRange,
  CheckCircle2,
  AtSign,
  Film,
  Radio,
  Loader2,
} from 'lucide-react';
import dayjs from 'dayjs';
import { Modal } from './Modal';
import { AppSelect } from './common/AppSelect';

interface CreateNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialFolderPath?: string;
}

const EMPTY_FEEDS: any[] = [];

export const CreateNoteModal: React.FC<CreateNoteModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialFolderPath,
}) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { appMode } = useAppMode();
  const { data: feeds = EMPTY_FEEDS } = useFeeds();

  let folders: FolderType[] = [];
  try {
    const foldersCtx = useFoldersContext();
    folders = foldersCtx.folders || [];
  } catch {
    folders = [];
  }

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<NoteType>('SINGLE');
  const [privacy, setPrivacy] = useState<NotePrivacy>('private');
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState('');
  const [feedId, setFeedId] = useState('');
  const [folderPath, setFolderPath] = useState(initialFolderPath || '');
  const [isCustomFolder, setIsCustomFolder] = useState(false);
  const [hashtagsInput, setHashtagsInput] = useState('');
  const [author, setAuthor] = useState('');
  const [pendingPosters, setPendingPosters] = useState<PendingPosterItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStepText, setSubmitStepText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Apply template helper
  const handleApplyTemplate = (tpl: NoteTemplateDefinition) => {
    setActiveTemplateId(tpl.id);
    setType(tpl.defaultType);
    if (tpl.defaultFolder && (!folderPath || folderPath === 'Notes' || folderPath === 'Trends')) {
      setFolderPath(tpl.defaultFolder);
      setIsCustomFolder(false);
    }
    if (tpl.defaultHashtags && tpl.defaultHashtags.length > 0) {
      setHashtagsInput((prev) => {
        const existing = prev
          .split(/[,\s]+/)
          .map((h) => h.trim().replace(/^#/, ''))
          .filter(Boolean);
        const combined = Array.from(new Set([...existing, ...tpl.defaultHashtags]));
        return combined.map((h) => `#${h}`).join(' ');
      });
    }
    if (tpl.defaultMarkdown && !description.trim()) {
      setDescription(tpl.defaultMarkdown);
    }
    setPrivacy(tpl.defaultPrivacy || 'private');
  };

  // Set initial folder path when opened or prop changes
  React.useEffect(() => {
    if (isOpen) {
      setFolderPath(initialFolderPath || '');
      setIsCustomFolder(false);
      setErrorMessage(null);
      setPrivacy('private');
      setActiveTemplateId(null);
      setPendingPosters([]);
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
    setSubmitStepText('Сохранение записи...');
    setErrorMessage(null);

    try {
      const hashtags = hashtagsInput
        .split(/[,\s]+/)
        .map((h) => h.trim().replace(/^#/, ''))
        .filter(Boolean);

      const cleanFolder = folderPath.trim();
      const created = await calendarApi.createNote({
        title: title.trim(),
        description: description.trim(),
        type,
        startDate: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        feedId: feedId || undefined,
        folderPath: cleanFolder || undefined,
        folders: cleanFolder ? [{ path: cleanFolder, isPrimary: true, order: 0 }] : undefined,
        hashtags: hashtags.length > 0 ? hashtags : undefined,
        author: author.trim() || undefined,
        privacy,
      });

      // Attach any selected web posters or local files in parallel
      if (pendingPosters.length > 0) {
        setSubmitStepText('Прикрепление медиа и обложек...');
        const webItems = pendingPosters
          .filter((p) => !p.file && p.url.startsWith('http'))
          .map((p) => ({
            url: p.url,
            caption: p.title,
            isMain: p.isMain,
          }));

        const localFiles = pendingPosters
          .filter((p) => Boolean(p.file))
          .map((p) => p.file as File);

        await Promise.allSettled([
          webItems.length > 0
            ? calendarApi.attachImagesFromUrls(created.id, webItems)
            : Promise.resolve(),
          localFiles.length > 0
            ? calendarApi.uploadImages(created.id, localFiles)
            : Promise.resolve(),
        ]);
      }

      // Trigger background cache invalidation without blocking modal close
      void queryClient.invalidateQueries({ queryKey: queryKeys.allNotes });
      void queryClient.invalidateQueries({ queryKey: queryKeys.folders });
      void queryClient.invalidateQueries({ queryKey: queryKeys.folderTree });

      setTitle('');
      setDescription('');
      setHashtagsInput('');
      setFolderPath('');
      setAuthor('');
      setPrivacy('private');
      setActiveTemplateId(null);
      setIsCustomFolder(false);
      setPendingPosters([]);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Failed to create note on backend:', err);
      setErrorMessage(err?.response?.data?.message || err?.message || 'Ошибка создания заметки');
    } finally {
      setIsSubmitting(false);
      setSubmitStepText('');
    }
  };

  const handleSafeClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleSafeClose}
      closeOnEsc={!isSubmitting}
      closeOnOverlayClick={!isSubmitting}
      showDefaultHeader={false}
      maxWidth="max-w-2xl"
    >
      <div className="relative flex flex-col overflow-hidden">
        {/* Global Submitting Overlay */}
        {isSubmitting && (
          <div
            data-testid="note-saving-overlay"
            className="absolute inset-0 z-30 bg-[#121414]/65 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 animate-in fade-in duration-150 select-none"
          >
            <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl bg-[#181a1a] border border-[#c9cd58]/40 shadow-2xl">
              <Loader2 className="w-5 h-5 text-[#c9cd58] animate-spin shrink-0" />
              <div className="flex flex-col">
                <span className="font-sans font-bold text-xs text-[#e5e971]">
                  {submitStepText || 'Сохранение записи...'}
                </span>
                <span className="font-mono text-[10px] text-[#93927e]">
                  Подождите подтверждения от сервера
                </span>
              </div>
            </div>
          </div>
        )}

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
            type="button"
            onClick={handleSafeClose}
            disabled={isSubmitting}
            className="p-1 rounded-md text-[#93927e] hover:text-white hover:bg-[#242828] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
          <fieldset disabled={isSubmitting} className="contents">
              {/* Note Templates Toolbar */}
              <NoteTemplateSelector
                onSelectTemplate={handleApplyTemplate}
                activeTemplateId={activeTemplateId}
              />

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

              {/* Note Posters Picker */}
              <div className="bg-[#121414]/60 border border-[#242828] rounded-xl p-3">
                <NotePosterPicker
                  noteTitle={title}
                  pendingPosters={pendingPosters}
                  onPendingPostersChange={setPendingPosters}
                />
              </div>

              {/* Privacy Contour Selector */}
              <NotePrivacySelector
                value={privacy}
                onChange={setPrivacy}
              />

              {/* Grid 1: Type & Feed */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-[#c9c7b2] mb-1">
                    {t.noteType}
                  </label>
                  <AppSelect<NoteType>
                    value={type}
                    onChange={setType}
                    disabled={isSubmitting}
                    options={[
                      { value: 'SINGLE', label: 'Точечная заметка (SINGLE)', icon: <Pin className="w-3.5 h-3.5 text-blue-400" /> },
                      { value: 'EVENT', label: 'Событие календаря (EVENT)', icon: <Calendar className="w-3.5 h-3.5 text-[#c9cd58]" /> },
                      { value: 'PERIOD', label: 'Временной отрезок (PERIOD)', icon: <CalendarRange className="w-3.5 h-3.5 text-amber-400" /> },
                      { value: 'FILM_RELEASE', label: 'Релиз / Премьера (FILM_RELEASE)', icon: <Film className="w-3.5 h-3.5 text-rose-400" /> },
                      { value: 'MENTION', label: 'Упоминание (MENTION)', icon: <AtSign className="w-3.5 h-3.5 text-purple-400" /> },
                      { value: 'DONE', label: 'Выполненная цель (DONE)', icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#c9c7b2] mb-1">
                    {t.noteFeed}
                  </label>
                  <AppSelect
                    value={feedId}
                    onChange={setFeedId}
                    disabled={isSubmitting}
                    placeholder="Выберите ленту..."
                    options={
                      feeds.length > 0
                        ? feeds.map((f) => ({
                            value: f.id,
                            label: f.title,
                            icon: <Radio className="w-3.5 h-3.5 text-[#c9cd58]" />,
                          }))
                        : [
                            { value: 'feed-tech', label: 'Technical Strategy', icon: <Radio className="w-3.5 h-3.5 text-[#c9cd58]" /> },
                            { value: 'feed-mcu', label: 'Marvel Cinematic Universe', icon: <Radio className="w-3.5 h-3.5 text-[#c9cd58]" /> },
                            { value: 'feed-personal', label: 'Личный приватный журнал', icon: <Radio className="w-3.5 h-3.5 text-[#c9cd58]" /> },
                          ]
                    }
                  />
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
                        {folders.map((f) => (
                          <option key={f.id} value={f.path}>
                            📁 {f.name} ({f.path})
                          </option>
                        ))}
                        {folderPath &&
                          !folders.some((f) => f.path.toLowerCase() === folderPath.toLowerCase()) && (
                            <option value={folderPath}>📁 {folderPath}</option>
                          )}
                        <option value="__custom__">✏️ {t.noteFolderCustom}</option>
                      </select>
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-mono text-[#c9c7b2] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#c9cd58]" />
                    Описание в формате Markdown
                  </label>
                </div>

                <AiDescriptionAssistant
                  title={title}
                  startDate={startDate}
                  noteType={type}
                  category={folderPath || undefined}
                  currentDescription={description}
                  onDescriptionGenerated={setDescription}
                  onHashtagsSuggested={(newTags) => {
                    setHashtagsInput((prev) => {
                      const existing = prev
                        .split(/[,\s]+/)
                        .map((h) => h.trim().replace(/^#/, ''))
                        .filter(Boolean);
                      const combined = Array.from(new Set([...existing, ...newTags]));
                      return combined.map((h) => `#${h}`).join(' ');
                    });
                  }}
                />

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
                  onClick={handleSafeClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-md border border-[#242828] text-xs font-mono text-[#c9c7b2] hover:bg-[#242828] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  data-testid="note-submit-btn"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-md bg-[#c9cd58] hover:bg-[#dce06b] text-[#121414] font-sans font-bold text-xs transition-colors flex items-center gap-2 shadow-glow-lemon disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  <span>{isSubmitting ? 'Сохранение...' : t.save}</span>
                </button>
              </div>
          </fieldset>
        </form>
      </div>
    </Modal>
  );
};
