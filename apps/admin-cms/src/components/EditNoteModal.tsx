import React, { useState, useEffect } from 'react';
import { Modal, message, Spin } from 'antd';
import { useNote, useFeeds, useUpdateNote } from '../api/queries';
import { NoteType, NoteStatus, FolderInputItem } from '../types';
import { MarkdownEditor } from './MarkdownEditor';
import { NoteTypeSelect } from './NoteTypeSelect';
import { HashtagInput } from './HashtagInput';
import { FolderSelect } from './FolderSelect';
import { AppSelect } from './common/AppSelect';
import { NoteCoverBanner } from './NoteCoverBanner';
import { AiCoverStudioModal } from './AiCoverStudioModal';
import { useAdminI18n } from '../i18n';
import {
  Calendar,
  ExternalLink,
  X,
  Check,
  Headphones,
  Link2,
  Sparkles,
  Globe,
  Lock,
  Archive,
  Radio,
} from 'lucide-react';

export interface EditNoteModalProps {
  noteId: string | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onOpenFullPage?: (id: string) => void;
}

export const EditNoteModal: React.FC<EditNoteModalProps> = ({
  noteId,
  open,
  onClose,
  onSuccess,
  onOpenFullPage,
}) => {
  const { t } = useAdminI18n();
  const { data: note, isLoading } = useNote(noteId || '');
  const { data: feeds = [] } = useFeeds();
  const updateNoteMutation = useUpdateNote();

  // Form State
  const [title, setTitle] = useState('');
  const [feedId, setFeedId] = useState('');
  const [type, setType] = useState<NoteType>('SINGLE');
  const [status, setStatus] = useState<NoteStatus>('PUBLISHED');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [assignedFolders, setAssignedFolders] = useState<FolderInputItem[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [sourceLink, setSourceLink] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiStudioOpen, setIsAiStudioOpen] = useState(false);

  const mainImage = note?.images?.find((img) => img.isMain) || note?.images?.[0];

  // Populate data when note loads or modal opens
  useEffect(() => {
    if (note && open) {
      setTitle(note.title || '');
      setFeedId(note.feedId || '');
      setType(note.type || 'SINGLE');
      setStatus(note.status || 'PUBLISHED');
      setStartDate(
        note.startDate ? new Date(note.startDate).toISOString().slice(0, 16) : '',
      );
      setEndDate(
        note.endDate ? new Date(note.endDate).toISOString().slice(0, 16) : '',
      );
      setDescription(note.description || '');
      setSourceLink(note.sourceLink || '');
      setHashtags(note.hashtags?.map((h) => h.name.replace(/^#/, '')) || []);

      const meta = (note.metadata as any) || {};
      setAudioUrl(meta.audioUrl || meta.podcast?.audioUrl || '');

      setAssignedFolders(
        note.folders
          ?.map((nf, idx) => ({
            path: nf.folder?.path || '',
            isPrimary: nf.isPrimary ?? idx === 0,
            order: nf.order ?? idx,
          }))
          .filter((item) => Boolean(item.path)) || [],
      );
    }
  }, [note, open]);

  useEffect(() => {
    if (!open || isAiStudioOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, isAiStudioOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note || !title.trim() || isSubmitting) return;

    if (!feedId) {
      message.error(t.selectFeedPlaceholder);
      return;
    }

    setIsSubmitting(true);
    try {
      const meta = (note.metadata as any) || {};
      const updatedMetadata = audioUrl.trim()
        ? { ...meta, audioUrl: audioUrl.trim() }
        : { ...meta };

      const primaryFld = assignedFolders.find((f) => f.isPrimary)?.path || assignedFolders[0]?.path;

      await updateNoteMutation.mutateAsync({
        id: note.id,
        data: {
          title: title.trim(),
          feedId,
          type,
          status,
          startDate: new Date(startDate).toISOString(),
          endDate: endDate ? new Date(endDate).toISOString() : undefined,
          description: description.trim() || undefined,
          sourceLink: sourceLink.trim() || undefined,
          folderPath: primaryFld || undefined,
          folders: assignedFolders.length > 0 ? assignedFolders : undefined,
          hashtags,
        },
      });

      message.success(t.noteSavedSuccess);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || 'Ошибка обновления записи');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      keyboard={!isAiStudioOpen}
      footer={null}
      width={720}
      zIndex={1100}
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
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-2.5">
          <Spin size="large" />
          <span className="font-mono text-xs text-text-muted">
            {t.loading}...
          </span>
        </div>
      ) : !note ? (
        <div className="p-6 text-center space-y-2.5">
          <p className="text-text-muted font-mono text-sm">{t.noteNotFound}</p>
          <button
            onClick={onClose}
            className="h-7 px-3 rounded bg-tile-subtle text-text-main text-xs font-mono border border-tile-border hover:bg-tile-muted cursor-pointer"
          >
            {t.close}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="px-5 py-3 border-b border-tile-border bg-tile-subtle flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-sm font-bold">
                ✏️
              </span>
              <div>
                <h2 className="font-sans font-bold text-lg text-on-surface leading-tight">
                  {t.edit}: {note.title}
                </h2>
                <p className="text-[11px] font-mono text-on-surface-variant">
                  Быстрое редактирование записи в CMS
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {onOpenFullPage && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenFullPage(note.id);
                  }}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-high border border-white/10 text-xs font-mono text-on-surface hover:text-primary hover:border-primary/40 transition-colors"
                  title="Перейти на отдельную страницу редактирования"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Полная страница</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
                title={t.close}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Form Body (Scrollable) */}
          <div className="p-6 overflow-y-auto space-y-4">
            {/* AI Cover Banner */}
            <NoteCoverBanner
              mainImage={mainImage}
              title={title}
              onOpenStudio={() => setIsAiStudioOpen(true)}
            />

            {/* Title */}
            <div>
              <label className="block text-xs font-mono text-on-surface-variant mb-1">
                {t.titleInputLabel} <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.titleInputPlaceholder}
                className="w-full bg-surface-container border border-outline-variant focus:border-primary rounded-lg px-3 py-2 text-sm text-on-surface placeholder-outline outline-none"
              />
            </div>

            {/* Status, Type & Feed Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-mono text-on-surface-variant mb-1">
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
                    {
                      value: 'PUBLISHED',
                      label: 'PUBLISHED',
                      icon: <Globe className="w-3.5 h-3.5 text-emerald-400" />,
                    },
                    {
                      value: 'DRAFT',
                      label: 'DRAFT',
                      icon: <Lock className="w-3.5 h-3.5 text-amber-400" />,
                    },
                    {
                      value: 'ARCHIVED',
                      label: 'ARCHIVED',
                      icon: <Archive className="w-3.5 h-3.5 text-neutral-400" />,
                    },
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-on-surface-variant mb-1">
                  {t.typeInputLabel}
                </label>
                <NoteTypeSelect value={type} onChange={setType} />
              </div>

              <div>
                <label className="block text-xs font-mono text-on-surface-variant mb-1">
                  {t.feedInputLabel} <span className="text-primary">*</span>
                </label>
                <AppSelect
                  value={feedId}
                  onChange={setFeedId}
                  placeholder={t.selectFeedPlaceholder || 'Выберите ленту...'}
                  options={feeds.map((f) => ({
                    value: f.id,
                    label: f.title,
                    icon: <Radio className="w-3.5 h-3.5 text-primary/80" />,
                  }))}
                />
              </div>
            </div>

            {/* Folders */}
            <div>
              <label className="block text-xs font-mono text-on-surface-variant mb-1">
                Папки хранения (Virtual Folders)
              </label>
              <FolderSelect
                value={assignedFolders}
                onChange={setAssignedFolders}
                placeholder="Выберите или введите путь к папке..."
              />
            </div>

            {/* Dates Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-on-surface-variant mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  <span>{t.startDateLabel}</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant focus:border-primary rounded-lg px-3 py-2 text-xs font-mono text-on-surface outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-on-surface-variant mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-on-surface-variant" />
                  <span>{t.endDateLabel} (опционально)</span>
                </label>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant focus:border-primary rounded-lg px-3 py-2 text-xs font-mono text-on-surface outline-none"
                />
              </div>
            </div>

            {/* Description (Markdown) */}
            <div>
              <label className="block text-xs font-mono text-on-surface-variant mb-1">
                {t.contentLabel} (Markdown)
              </label>
              <MarkdownEditor
                value={description}
                onChange={setDescription}
                placeholder="Введите текст записи или сводки..."
              />
            </div>

            {/* Source Link & Audio URL */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-on-surface-variant mb-1 flex items-center gap-1">
                  <Link2 className="w-3.5 h-3.5 text-primary" />
                  <span>{t.sourceLinkLabel}</span>
                </label>
                <input
                  type="url"
                  value={sourceLink}
                  onChange={(e) => setSourceLink(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-surface-container border border-outline-variant focus:border-primary rounded-lg px-3 py-2 text-xs font-mono text-on-surface outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-on-surface-variant mb-1 flex items-center gap-1">
                  <Headphones className="w-3.5 h-3.5 text-purple-400" />
                  <span>Аудио / Подкаст URL (NotebookLM)</span>
                </label>
                <input
                  type="url"
                  value={audioUrl}
                  onChange={(e) => setAudioUrl(e.target.value)}
                  placeholder="https://.../podcast.mp3"
                  className="w-full bg-surface-container border border-outline-variant focus:border-purple-400 rounded-lg px-3 py-2 text-xs font-mono text-on-surface outline-none"
                />
              </div>
            </div>

            {/* Hashtags */}
            <div>
              <label className="block text-xs font-mono text-on-surface-variant mb-1">
                {t.hashtagsInputLabel}
              </label>
              <HashtagInput value={hashtags} onChange={setHashtags} />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-5 py-2.5 border-t border-tile-border bg-tile-subtle flex items-center justify-between">
            <span className="text-[11px] font-mono text-text-muted">
              ID: {note.id}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-7 px-3 rounded bg-tile-subtle border border-tile-border text-text-muted hover:text-text-main hover:bg-tile-muted text-xs font-mono transition-colors cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="flex items-center gap-1.5 h-7 px-4 rounded bg-primary text-on-primary font-bold text-xs font-mono hover:bg-primary-fixed-dim transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? t.loading : t.save}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      <AiCoverStudioModal
        open={isAiStudioOpen}
        onClose={() => setIsAiStudioOpen(false)}
        noteId={note?.id}
        initialTitle={title}
        initialDescription={description}
      />
    </Modal>
  );
};
