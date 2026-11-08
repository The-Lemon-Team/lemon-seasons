import React, { useState, useEffect } from 'react';
import { Modal, message } from 'antd';
import { useFeeds, useCreateNote } from '../api/queries';
import { notesApi } from '../api/client';
import { NoteType, NoteStatus, FolderInputItem, Note, NotePrivacy, PendingPosterItem } from '../types';
import { NoteTemplateDefinition } from '@lenta/shared';
import { MarkdownEditor } from './MarkdownEditor';
import { NoteTypeSelect } from './NoteTypeSelect';
import { HashtagInput } from './HashtagInput';
import { FolderSelect } from './FolderSelect';
import { AppSelect } from './common/AppSelect';
import { NotePrivacySelector } from './notes/NotePrivacySelector';
import { NoteTemplateSelector } from './notes/NoteTemplateSelector';
import { NotePosterPicker } from './notes/NotePosterPicker';
import { AiDescriptionAssistant } from './notes/AiDescriptionAssistant';
import { useAdminI18n } from '../i18n';
import {
  Calendar,
  ExternalLink,
  X,
  Plus,
  Link2,
  Globe,
  Lock,
  Archive,
  Radio,
  FilePlus,
  User,
  Folder as FolderIcon,
  Loader2,
} from 'lucide-react';

export interface CreateNoteModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (createdNote?: Note) => void;
  initialFolderPath?: string;
  initialFeedId?: string;
  onOpenFullPage?: (folderPath?: string) => void;
}

export const CreateNoteModal: React.FC<CreateNoteModalProps> = ({
  open,
  onClose,
  onSuccess,
  initialFolderPath,
  initialFeedId,
  onOpenFullPage,
}) => {
  const { t } = useAdminI18n();
  const { data: feeds = [] } = useFeeds();
  const createNoteMutation = useCreateNote();

  // Form State
  const [title, setTitle] = useState('');
  const [feedId, setFeedId] = useState('');
  const [type, setType] = useState<NoteType>('SINGLE');
  const [status, setStatus] = useState<NoteStatus>('PUBLISHED');
  const [privacy, setPrivacy] = useState<NotePrivacy>('private');
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [assignedFolders, setAssignedFolders] = useState<FolderInputItem[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [sourceLink, setSourceLink] = useState('');
  const [author, setAuthor] = useState('');
  const [pendingPosters, setPendingPosters] = useState<PendingPosterItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Template apply helper
  const handleApplyTemplate = (tpl: NoteTemplateDefinition) => {
    setActiveTemplateId(tpl.id);
    setType(tpl.defaultType as NoteType);
    if (tpl.defaultFolder && assignedFolders.length === 0) {
      setAssignedFolders([{ path: tpl.defaultFolder, isPrimary: true, order: 0 }]);
    }
    if (tpl.defaultHashtags && tpl.defaultHashtags.length > 0) {
      setHashtags((prev) => Array.from(new Set([...prev, ...tpl.defaultHashtags])));
    }
    if (tpl.defaultMarkdown && !description.trim()) {
      setDescription(tpl.defaultMarkdown);
    }
    setPrivacy((tpl.defaultPrivacy as NotePrivacy) || 'private');
  };

  // Initialize or reset form when modal opens or initialFolderPath changes
  useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setType('SINGLE');
      setStatus('PUBLISHED');
      setPrivacy('private');
      setActiveTemplateId(null);
      setEndDate('');
      setSourceLink('');
      setAuthor('');
      setHashtags([]);
      setPendingPosters([]);

      const now = new Date();
      const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setStartDate(localIso);

      if (initialFolderPath) {
        setAssignedFolders([
          {
            path: initialFolderPath,
            isPrimary: true,
            order: 0,
          },
        ]);
      } else {
        setAssignedFolders([]);
      }

      setFeedId(initialFeedId || '');
    }
  }, [open, initialFolderPath, initialFeedId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const primaryFld =
        assignedFolders.find((f) => f.isPrimary)?.path ||
        assignedFolders[0]?.path ||
        initialFolderPath;

      const created = await createNoteMutation.mutateAsync({
        title: title.trim(),
        feedId: feedId ? feedId : undefined,
        type,
        status,
        privacy,
        startDate: new Date(startDate).toISOString(),
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        description: description.trim() || undefined,
        sourceLink: sourceLink.trim() || undefined,
        author: author.trim() || undefined,
        curator: author.trim() || undefined,
        folderPath: primaryFld || undefined,
        folders: assignedFolders.length > 0 ? assignedFolders : undefined,
        hashtags: hashtags.length > 0 ? hashtags : undefined,
      });

      // Attach any selected web posters or local files in parallel
      if (pendingPosters.length > 0) {
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
            ? notesApi.attachImagesFromUrls(created.id, webItems)
            : Promise.resolve(),
          localFiles.length > 0
            ? notesApi.uploadImages(created.id, localFiles)
            : Promise.resolve(),
        ]);
      }

      message.success(t.quickAddNoteCreated);
      onSuccess?.(created);
      onClose();
    } catch (err: any) {
      message.error(
        err?.response?.data?.message || err?.message || 'Ошибка создания записи',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  const handleSafeClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const currentFolder =
    assignedFolders.find((f) => f.isPrimary)?.path ||
    assignedFolders[0]?.path ||
    initialFolderPath;

  return (
    <Modal
      open={open}
      onCancel={handleSafeClose}
      maskClosable={!isSubmitting}
      keyboard={!isSubmitting}
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
      <form onSubmit={handleSubmit} className="relative flex flex-col max-h-[85vh]">
        {isSubmitting && (
          <div className="absolute inset-0 z-30 bg-black/55 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 animate-in fade-in duration-150 select-none">
            <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl bg-surface-container border border-primary/40 shadow-2xl">
              <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
              <div className="flex flex-col">
                <span className="font-sans font-bold text-xs text-on-surface">
                  {pendingPosters.length > 0
                    ? 'Сохранение записи и обложек...'
                    : 'Сохранение записи...'}
                </span>
                <span className="font-mono text-[10px] text-on-surface-variant">
                  Подождите подтверждения от сервера
                </span>
              </div>
            </div>
          </div>
        )}
        <fieldset disabled={isSubmitting} className="contents">
        {/* Header */}
        <div className="px-5 py-3 border-b border-tile-border bg-tile-subtle flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center text-primary text-xs font-bold shrink-0">
              <FilePlus className="w-3.5 h-3.5" />
            </span>
            <div className="min-w-0">
              <h2 className="font-sans font-bold text-sm text-text-main leading-tight truncate">
                {t.editorTitleNew}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                {currentFolder ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 truncate">
                    <FolderIcon className="w-3 h-3 shrink-0" />
                    <span className="truncate">{currentFolder}</span>
                  </span>
                ) : (
                  <p className="text-[11px] font-mono text-on-surface-variant truncate">
                    Создание заметки в CMS &amp; Obsidian Vault
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenFullPage && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFullPage(currentFolder);
                }}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-high border border-white/10 text-xs font-mono text-on-surface hover:text-primary hover:border-primary/40 transition-colors cursor-pointer"
                title="Перейти на отдельную страницу создания"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Полная страница</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-colors border border-transparent hover:border-white/10 cursor-pointer"
              title={t.close}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Form Body (Scrollable) */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Templates Toolbar */}
          <NoteTemplateSelector
            onSelectTemplate={handleApplyTemplate}
            activeTemplateId={activeTemplateId}
          />

          {/* Title */}
          <div>
            <label className="block text-xs font-mono text-on-surface-variant mb-1">
              {t.titleInputLabel} <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.titleInputPlaceholder}
              className="w-full bg-surface-container border border-outline-variant focus:border-primary rounded-lg px-3 py-2 text-sm text-on-surface placeholder-outline outline-none"
            />
          </div>

          {/* Quick Poster & Media Picker */}
          <div className="bg-surface-container/60 border border-white/5 rounded-xl p-3">
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
                {t.feedInputLabel}
              </label>
              <AppSelect
                value={feedId}
                onChange={setFeedId}
                placeholder={t.selectFeedPlaceholder || 'Выберите ленту...'}
                options={[
                  {
                    value: '',
                    label: t.noFeedOption || 'Без ленты (общая база)',
                    icon: <Radio className="w-3.5 h-3.5 text-text-muted/60" />,
                  },
                  ...feeds.map((f) => ({
                    value: f.id,
                    label: f.title,
                    icon: <Radio className="w-3.5 h-3.5 text-primary/80" />,
                  })),
                ]}
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
                className="w-full bg-surface-container border border-outline-variant focus:border-primary rounded-lg px-3 py-2 text-xs font-mono text-on-surface outline-none [color-scheme:dark]"
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
                className="w-full bg-surface-container border border-outline-variant focus:border-primary rounded-lg px-3 py-2 text-xs font-mono text-on-surface outline-none [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Description (Markdown) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-mono text-on-surface-variant">
                {t.contentLabel} (Markdown)
              </label>
            </div>

            <AiDescriptionAssistant
              title={title}
              startDate={startDate}
              noteType={type}
              category={assignedFolders[0]?.path || undefined}
              currentDescription={description}
              onDescriptionGenerated={setDescription}
              onHashtagsSuggested={(newTags) => {
                setHashtags((prev) => Array.from(new Set([...prev, ...newTags])));
              }}
            />

            <MarkdownEditor
              value={description}
              onChange={setDescription}
              placeholder="Введите текст записи или сводки..."
              minHeight={140}
            />
          </div>

          {/* Source Link & Author */}
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
                <User className="w-3.5 h-3.5 text-primary" />
                <span>Автор / Источник (Author)</span>
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. ivan, chen, okatsiya..."
                className="w-full bg-surface-container border border-outline-variant focus:border-primary rounded-lg px-3 py-2 text-xs font-mono text-on-surface outline-none"
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
        <div className="px-5 py-2.5 border-t border-tile-border bg-tile-subtle flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleSafeClose}
            disabled={isSubmitting}
            className="h-7 px-3 rounded bg-tile-subtle border border-tile-border text-text-muted hover:text-text-main hover:bg-tile-muted text-xs font-mono transition-colors cursor-pointer disabled:opacity-50"
          >
            {t.cancel}
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !title.trim() || !feedId}
            className="flex items-center gap-1.5 h-7 px-4 rounded bg-primary text-on-primary font-bold text-xs font-mono hover:bg-primary-fixed-dim transition-colors disabled:opacity-70 cursor-pointer shadow-xs"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span>{isSubmitting ? t.loading : t.save}</span>
          </button>
        </div>
        </fieldset>
      </form>
    </Modal>
  );
};
