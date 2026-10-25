import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Note, NoteType, NoteStatus, Folder as FolderType, extractCleanSnippet } from '@lenta/shared';
import { useI18n } from '../i18n';
import { useFeeds, queryKeys } from '../api/queries';
import { calendarApi } from '../api/client';
import { useFoldersContext } from '../context/FoldersContext';
import {
  X,
  Calendar,
  Tag,
  Check,
  Folder,
  AlertCircle,
  Headphones,
  Link2,
  Globe,
  Lock,
  Archive,
  Radio,
  Pin,
  Film,
  CalendarRange,
  AtSign,
  CheckCircle2,
} from 'lucide-react';
import dayjs from 'dayjs';
import { Modal } from './Modal';
import { AppSelect } from './common/AppSelect';

interface EditNoteModalProps {
  note: Note | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (updated: Note) => void;
}

export const EditNoteModal: React.FC<EditNoteModalProps> = ({
  note,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { data: feeds = [] } = useFeeds();

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
  const [status, setStatus] = useState<NoteStatus>('PUBLISHED');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [feedId, setFeedId] = useState('');
  const [folderPath, setFolderPath] = useState('');
  const [hashtagsInput, setHashtagsInput] = useState('');
  const [sourceLink, setSourceLink] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [privacy, setPrivacy] = useState<'private' | 'public'>('private');
  const [publicFeedId, setPublicFeedId] = useState('');
  const [summary, setSummary] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (note && isOpen) {
      setTitle(note.title || '');
      setDescription(note.description || '');
      setType(note.type || 'SINGLE');
      setStatus(note.status || 'PUBLISHED');
      setStartDate(note.startDate ? dayjs(note.startDate).format('YYYY-MM-DD') : '');
      setEndDate(note.endDate ? dayjs(note.endDate).format('YYYY-MM-DD') : '');
      setFeedId(note.feedId || note.feed?.id || '');

      const primaryFld = note.folders?.find((f) => f.isPrimary)?.folder?.path || note.folderPath || '';
      setFolderPath(primaryFld);

      const tags = note.hashtags?.map((h) => h.name.replace(/^#/, '')).join(', ') || '';
      setHashtagsInput(tags);

      setSourceLink(note.sourceLink || '');
      const meta = (note.metadata as any) || {};
      setAudioUrl(meta.audioUrl || meta.podcast?.audioUrl || '');
      setPrivacy(note.privacy === 'public' ? 'public' : 'private');
      setPublicFeedId(note.publicFeedId || '');
      setSummary(note.summary || '');
      setErrorMessage(null);
    }
  }, [note, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note || !title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const hashtags = hashtagsInput
        .split(/[,\s]+/)
        .map((h) => h.trim().replace(/^#/, ''))
        .filter(Boolean);

      const cleanFolder = folderPath.trim();
      const meta = (note.metadata as any) || {};
      const updatedMetadata = audioUrl.trim()
        ? { ...meta, audioUrl: audioUrl.trim() }
        : { ...meta };

      const updated = await calendarApi.updateNote(note.id, {
        title: title.trim(),
        description: description.trim(),
        type,
        status,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : null,
        feedId: feedId || undefined,
        folderPath: cleanFolder || null,
        folders: cleanFolder ? [{ path: cleanFolder, isPrimary: true, order: 0 }] : undefined,
        hashtags,
        sourceLink: sourceLink.trim() || undefined,
        privacy,
        publicFeedId: privacy === 'public' ? (publicFeedId || feedId || null) : null,
        summary: summary.trim() || undefined,
        ...(status === 'PUBLISHED' ? { publishAt: new Date().toISOString() } : {}),
      });

      await queryClient.invalidateQueries({ queryKey: queryKeys.allNotes });
      await queryClient.invalidateQueries({ queryKey: queryKeys.folders });

      onSuccess?.(updated);
      onClose();
    } catch (err: any) {
      console.error('Failed to update note:', err);
      setErrorMessage(err?.response?.data?.message || err?.message || 'Ошибка обновления записи');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!note) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t.editNote}
      maxWidth="max-w-2xl"
      containerClassName="bg-[#181a1a] border-[#323636]"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4 font-mono text-xs">
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-200 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-[11px] text-[#93927e] uppercase tracking-wider block">
            Заголовок записи <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-[#121414] border border-[#2d3030] focus:border-[#c9cd58] rounded px-3 py-2 text-sm text-[#e2e2e2] outline-none"
          />
        </div>

        {/* Type & Status Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[11px] text-[#93927e] uppercase tracking-wider block">
              Тип записи
            </label>
            <AppSelect<NoteType>
              value={type}
              onChange={setType}
              options={[
                { value: 'SINGLE', label: 'Одиночное событие (SINGLE)', icon: <Pin className="w-3.5 h-3.5 text-blue-400" /> },
                { value: 'EVENT', label: 'Знаковая дата (EVENT)', icon: <Calendar className="w-3.5 h-3.5 text-[#c9cd58]" /> },
                { value: 'PERIOD', label: 'Период (PERIOD)', icon: <CalendarRange className="w-3.5 h-3.5 text-amber-400" /> },
                { value: 'DONE', label: 'Выполнено (DONE)', icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> },
                { value: 'MENTION', label: 'Упоминание (MENTION)', icon: <AtSign className="w-3.5 h-3.5 text-purple-400" /> },
                { value: 'FILM_RELEASE', label: 'Премьера / Релиз', icon: <Film className="w-3.5 h-3.5 text-rose-400" /> },
              ]}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] text-[#93927e] uppercase tracking-wider block">
              Статус публикации
            </label>
            <AppSelect<NoteStatus>
              value={status}
              onChange={setStatus}
              variant={
                status === 'PUBLISHED'
                  ? 'emerald'
                  : status === 'DRAFT'
                  ? 'amber'
                  : 'muted'
              }
              options={[
                { value: 'PUBLISHED', label: '🌐 Опубликовано (PUBLISHED)', icon: <Globe className="w-3.5 h-3.5 text-emerald-400" /> },
                { value: 'DRAFT', label: '🔒 Черновик (DRAFT)', icon: <Lock className="w-3.5 h-3.5 text-amber-400" /> },
                { value: 'ARCHIVED', label: '📦 Архив (ARCHIVED)', icon: <Archive className="w-3.5 h-3.5 text-neutral-400" /> },
              ]}
            />
          </div>
        </div>

        {/* Dates Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[11px] text-[#93927e] uppercase tracking-wider block flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#c9cd58]" />
              <span>Дата начала</span>
            </label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-[#121414] border border-[#2d3030] focus:border-[#c9cd58] rounded px-3 py-2 text-[#e2e2e2] outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] text-[#93927e] uppercase tracking-wider block flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#93927e]" />
              <span>Дата окончания (опционально)</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-[#121414] border border-[#2d3030] focus:border-[#c9cd58] rounded px-3 py-2 text-[#e2e2e2] outline-none"
            />
          </div>
        </div>

        {/* Feed & Folder Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[11px] text-[#93927e] uppercase tracking-wider block">
              Лента (Feed)
            </label>
            <AppSelect
              value={feedId}
              onChange={setFeedId}
              placeholder="Без ленты"
              options={[
                { value: '', label: 'Без ленты' },
                ...feeds.map((f) => ({
                  value: f.id,
                  label: f.title,
                  icon: <Radio className="w-3.5 h-3.5 text-[#c9cd58]" />,
                })),
              ]}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] text-[#93927e] uppercase tracking-wider block flex items-center gap-1">
              <Folder className="w-3.5 h-3.5 text-[#c9cd58]" />
              <span>{t.folderPath}</span>
            </label>
            <input
              type="text"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              placeholder="например: Seasons/NotebookLM-AI"
              className="w-full bg-[#121414] border border-[#2d3030] focus:border-[#c9cd58] rounded px-3 py-2 text-[#e2e2e2] outline-none"
            />
          </div>
        </div>

        {/* Description / Content */}
        <div className="space-y-1.5">
          <label className="text-[11px] text-[#93927e] uppercase tracking-wider block">
            Описание (Markdown)
          </label>
          <textarea
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Описание события или краткий список новостей..."
            className="w-full bg-[#121414] border border-[#2d3030] focus:border-[#c9cd58] rounded px-3 py-2 text-xs text-[#e2e2e2] outline-none font-mono"
          />
        </div>

        {/* Audio URL (NotebookLM podcast) & Source link */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[11px] text-[#93927e] uppercase tracking-wider block flex items-center gap-1">
              <Headphones className="w-3.5 h-3.5 text-purple-400" />
              <span>Аудио / Подкаст URL</span>
            </label>
            <input
              type="url"
              value={audioUrl}
              onChange={(e) => setAudioUrl(e.target.value)}
              placeholder="https://.../podcast.mp3"
              className="w-full bg-[#121414] border border-[#2d3030] focus:border-purple-400 rounded px-3 py-2 text-[#e2e2e2] outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] text-[#93927e] uppercase tracking-wider block flex items-center gap-1">
              <Link2 className="w-3.5 h-3.5 text-[#93927e]" />
              <span>Ссылка на источник</span>
            </label>
            <input
              type="url"
              value={sourceLink}
              onChange={(e) => setSourceLink(e.target.value)}
              placeholder="https://..."
              className="w-full bg-[#121414] border border-[#2d3030] focus:border-[#c9cd58] rounded px-3 py-2 text-[#e2e2e2] outline-none"
            />
          </div>
        </div>

        {/* Hashtags */}
        <div className="space-y-1.5">
          <label className="text-[11px] text-[#93927e] uppercase tracking-wider block flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-[#c9cd58]" />
            <span>Хештеги (через запятую)</span>
          </label>
          <input
            type="text"
            value={hashtagsInput}
            onChange={(e) => setHashtagsInput(e.target.value)}
            placeholder="AI, NotebookLM, Briefing"
            className="w-full bg-[#121414] border border-[#2d3030] focus:border-[#c9cd58] rounded px-3 py-2 text-[#e2e2e2] outline-none"
          />
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#242828]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded bg-[#121414] border border-[#2d3030] text-[#c9c7b2] hover:bg-[#242828] transition-colors"
          >
            {t.cancel}
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !title.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded bg-[#c9cd58] text-[#121414] hover:bg-[#dce06b] font-bold transition-colors disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{isSubmitting ? 'Сохранение...' : t.save}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
