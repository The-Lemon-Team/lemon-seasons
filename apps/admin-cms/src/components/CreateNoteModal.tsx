import React, { useState, useEffect } from 'react';
import { Modal, message } from 'antd';
import { useFeeds, useCreateNote } from '../api/queries';
import { NoteType, NoteStatus, FolderInputItem, Note } from '../types';
import { MarkdownEditor } from './MarkdownEditor';
import { NoteTypeSelect } from './NoteTypeSelect';
import { HashtagInput } from './HashtagInput';
import { FolderSelect } from './FolderSelect';
import { AppSelect } from './common/AppSelect';
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
} from 'lucide-react';

export interface CreateNoteModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (createdNote?: Note) => void;
  initialFolderPath?: string;
  onOpenFullPage?: (folderPath?: string) => void;
}

export const CreateNoteModal: React.FC<CreateNoteModalProps> = ({
  open,
  onClose,
  onSuccess,
  initialFolderPath,
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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [assignedFolders, setAssignedFolders] = useState<FolderInputItem[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [sourceLink, setSourceLink] = useState('');
  const [curator, setCurator] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize or reset form when modal opens or initialFolderPath changes
  useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setType('SINGLE');
      setStatus('PUBLISHED');
      setEndDate('');
      setSourceLink('');
      setCurator('');
      setHashtags([]);

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

      if (feeds.length > 0) {
        setFeedId((prev) => prev || feeds[0].id);
      }
    }
  }, [open, initialFolderPath, feeds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    if (!feedId) {
      message.error(t.selectFeedPlaceholder);
      return;
    }

    setIsSubmitting(true);
    try {
      const primaryFld =
        assignedFolders.find((f) => f.isPrimary)?.path ||
        assignedFolders[0]?.path ||
        initialFolderPath;

      const created = await createNoteMutation.mutateAsync({
        title: title.trim(),
        feedId,
        type,
        status,
        startDate: new Date(startDate).toISOString(),
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        description: description.trim() || undefined,
        sourceLink: sourceLink.trim() || undefined,
        curator: curator.trim() || undefined,
        folderPath: primaryFld || undefined,
        folders: assignedFolders.length > 0 ? assignedFolders : undefined,
        hashtags: hashtags.length > 0 ? hashtags : undefined,
      });

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

  const currentFolder =
    assignedFolders.find((f) => f.isPrimary)?.path ||
    assignedFolders[0]?.path ||
    initialFolderPath;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={780}
      zIndex={1100}
      centered
      destroyOnClose
      closable={false}
      styles={{
        content: {
          padding: 0,
          backgroundColor: '#292a2a',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0px 10px 40px rgba(0,0,0,0.6)',
          overflow: 'hidden',
          borderRadius: 16,
        },
      }}
    >
      <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 bg-surface-container-highest/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-sm font-bold shrink-0">
              <FilePlus className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h2 className="font-sans font-bold text-lg text-on-surface leading-tight truncate">
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
            <label className="block text-xs font-mono text-on-surface-variant mb-1">
              {t.contentLabel} (Markdown)
            </label>
            <MarkdownEditor
              value={description}
              onChange={setDescription}
              placeholder="Введите текст записи или сводки..."
              minHeight={140}
            />
          </div>

          {/* Source Link & Curator */}
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
                <span>Куратор / Автор (Curator)</span>
              </label>
              <input
                type="text"
                value={curator}
                onChange={(e) => setCurator(e.target.value)}
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
        <div className="px-6 py-4 border-t border-white/5 bg-surface-container-highest/60 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-surface-container-high border border-white/10 text-on-surface text-xs font-mono hover:border-white/20 transition-colors cursor-pointer"
          >
            {t.cancel}
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !title.trim() || !feedId}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-primary text-on-primary font-bold text-xs font-mono hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer shadow"
          >
            <Plus className="w-4 h-4" />
            <span>{isSubmitting ? t.loading : t.save}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
