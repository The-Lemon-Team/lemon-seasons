import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Popconfirm, message, Image, Spin } from 'antd';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Calendar,
  ExternalLink,
  Copy,
  Edit3,
  Trash2,
  Folder as FolderIcon,
  Sparkles,
  Link2,
  Clock,
  Layers,
  FileCode,
  Share2,
  X,
} from 'lucide-react';
import { useNote, useDeleteNote } from '../api/queries';
import { NoteTypeBadge } from './NoteTypeBadge';
import { HashtagBadge } from './HashtagBadge';
import { EditNoteModal } from './EditNoteModal';
import { PublishToStagingModal } from './PublishToStagingModal';
import { useAdminI18n } from '../i18n';

export interface NoteDetailModalProps {
  noteId: string | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (id: string) => void;
  onSelectFolder?: (folderPath: string) => void;
  onSelectHashtag?: (hashtag: string) => void;
}

export const NoteDetailModal: React.FC<NoteDetailModalProps> = ({
  noteId,
  open,
  onClose,
  onEdit,
  onSelectFolder,
  onSelectHashtag,
}) => {
  const { t } = useAdminI18n();
  const navigate = useNavigate();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPublishStagingOpen, setIsPublishStagingOpen] = useState(false);
  const { data: note, isLoading } = useNote(noteId || '');
  const deleteNoteMutation = useDeleteNote();

  React.useEffect(() => {
    if (!open || isEditOpen) return;

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
  }, [open, isEditOpen, onClose]);

  if (!open) return null;

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  const getFullUrl = (url?: string | null) => {
    if (!url) return '';
    return url.startsWith('http') ? url : `${apiBase}${url}`;
  };

  const handleCopyLink = () => {
    if (!note) return;
    const url = `${window.location.origin}/notes/${note.id}`;
    navigator.clipboard.writeText(url);
    message.success(t.copied);
  };

  const handleCopyContent = () => {
    if (!note) return;
    const fullText = `# ${note.title}\n\n${note.description || ''}`;
    navigator.clipboard.writeText(fullText);
    message.success(t.copied);
  };

  const handleDelete = async () => {
    if (!note) return;
    try {
      await deleteNoteMutation.mutateAsync(note.id);
      message.success(t.noteDeletedSuccess);
      onClose();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error deleting note');
    }
  };

  const renderWithHashtags = (children: React.ReactNode): React.ReactNode => {
    if (typeof children === 'string') {
      const parts = children.split(/(#[a-zA-Z0-9_\-]+)/g);
      if (parts.length === 1) return children;
      return parts.map((part, i) => {
        if (part.startsWith('#') && part.length > 1) {
          const tagName = part.slice(1);
          return (
            <HashtagBadge
              key={i}
              name={tagName}
              size="xs"
              onClick={
                onSelectHashtag
                  ? (name) => {
                      onClose();
                      onSelectHashtag(name);
                    }
                  : undefined
              }
              clickable={!onSelectHashtag}
              className="mx-0.5 inline-flex align-middle"
            />
          );
        }
        return part;
      });
    }
    if (Array.isArray(children)) {
      return React.Children.map(children, (child) => renderWithHashtags(child));
    }
    return children;
  };

  const markdownComponents = {
    p: ({ children }: any) => <p className="mb-3 leading-relaxed">{renderWithHashtags(children)}</p>,
    li: ({ children }: any) => <li className="my-1">{renderWithHashtags(children)}</li>,
  };

  const noteFolders = note?.folders || [];
  const primaryFolder = noteFolders.find((nf) => nf.isPrimary) || noteFolders[0];
  const secondaryFolders = noteFolders.filter((nf) => nf !== primaryFolder);

  const formattedStartDate = note?.startDate
    ? new Date(note.startDate).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const formattedEndDate = note?.endDate
    ? new Date(note.endDate).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <Modal
      open={open}
      onCancel={onClose}
      keyboard={!isEditOpen}
      footer={null}
      width={720}
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
        <div className="relative py-20 flex flex-col items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-1 rounded text-text-muted hover:text-text-main hover:bg-tile-subtle transition-colors cursor-pointer"
            title={t.close}
            aria-label={t.close}
          >
            <X className="w-4 h-4" />
          </button>
          <Spin size="large" />
          <span className="font-mono text-xs text-text-muted">
            {t.loading}...
          </span>
        </div>
      ) : !note ? (
        <div className="relative p-6 text-center space-y-2.5">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-1 rounded text-text-muted hover:text-text-main hover:bg-tile-subtle transition-colors cursor-pointer"
            title={t.close}
            aria-label={t.close}
          >
            <X className="w-4 h-4" />
          </button>
          <p className="text-text-muted font-mono text-sm">{t.noteNotFound}</p>
          <button
            onClick={onClose}
            className="h-7 px-3 rounded bg-tile-subtle text-text-main text-xs font-mono border border-tile-border hover:bg-tile-muted cursor-pointer"
          >
            {t.close}
          </button>
        </div>
      ) : (
        <div className="flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="px-5 py-3 border-b border-tile-border bg-tile-subtle flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <NoteTypeBadge type={note.type} size="sm" />
                {note.privacy === 'public' && note.status === 'PUBLISHED' ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-semibold">
                    🌐 Public {note.publicFeed ? `• ${note.publicFeed.title}` : ''}
                  </span>
                ) : note.privacy === 'public' ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/15 border border-amber-500/40 text-amber-300 font-semibold">
                    ⏳ В Стейджинге {note.publicFeed ? `• ${note.publicFeed.title}` : ''}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-500/15 border border-slate-500/30 text-slate-300 font-medium">
                    🔒 Private
                  </span>
                )}
                {note.status && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-control border border-tile-border text-text-muted font-medium">
                    {note.status}
                  </span>
                )}
                {note.feed && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-primary/10 border border-primary/20 text-primary">
                    <Layers className="w-3 h-3" />
                    {note.feed.title}
                  </span>
                )}
                {note.curator && note.curator !== 'auto' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-sky-500/10 border border-sky-500/30 text-sky-500 dark:text-sky-300">
                    <span>👤</span>
                    <span>{note.curator}</span>
                  </span>
                )}
                {note.deletedAt && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-red-950/60 border border-red-500/40 text-red-300">
                    Deleted
                  </span>
                )}
              </div>

              <h2 className="font-sans font-bold text-xl sm:text-2xl text-on-surface leading-tight break-words">
                {note.icon && <span className="mr-2 select-none">{note.icon}</span>}
                {note.title}
              </h2>
            </div>

            {/* Quick Header Actions */}
            <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
              <button
                type="button"
                onClick={handleCopyLink}
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
                title={t.copyNoteLink}
                aria-label={t.copyNoteLink}
              >
                <Share2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleCopyContent}
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
                title="Копировать текст записи"
                aria-label="Копировать текст записи"
              >
                <Copy className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsPublishStagingOpen(true)}
                className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/35 hover:bg-amber-500/25 transition-all text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer"
                title="Отправить в Стейджинг-хаб / Опубликовать в паблик"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">В Стейджинг</span>
              </button>

              <button
                type="button"
                onClick={() => setIsEditOpen(true)}
                className="px-2.5 py-1.5 rounded-lg bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition-all text-xs font-mono font-medium flex items-center gap-1.5"
                title={t.edit}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.edit}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded text-text-muted hover:text-text-main hover:bg-tile-subtle transition-colors cursor-pointer"
                title={t.close}
                aria-label={t.close}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Metadata Sub-Bar */}
          <div className="px-5 py-2 border-b border-tile-border bg-control/40 flex items-center gap-3 text-xs font-mono text-text-muted flex-wrap">
            {/* Dates */}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>{formattedStartDate}</span>
              {formattedEndDate && (
                <>
                  <span className="text-text-muted/50">→</span>
                  <span>{formattedEndDate}</span>
                </>
              )}
            </div>

            {/* Folder Location */}
            {primaryFolder?.folder ? (
              <button
                type="button"
                onClick={() => {
                  if (onSelectFolder) {
                    onClose();
                    onSelectFolder(primaryFolder.folder!.path);
                  }
                }}
                className="inline-flex items-center gap-1 text-primary hover:underline cursor-pointer"
                title={primaryFolder.folder.path}
              >
                <FolderIcon className="w-3.5 h-3.5" />
                <span className="truncate max-w-[200px]">{primaryFolder.folder.path}</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-text-muted/60">
                <FolderIcon className="w-3.5 h-3.5" />
                <span>Unfiled (Root)</span>
              </span>
            )}

            {/* Source link */}
            {note.sourceLink && (
              <a
                href={note.sourceLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-secondary hover:underline ml-auto"
                title={note.sourceLink}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="truncate max-w-[200px]">{t.sourceLinkLabel}</span>
              </a>
            )}
          </div>

          {/* Modal Scrollable Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 custom-scrollbar">
            {/* Summary Callout (if available) */}
            {note.summary && (
              <div className="bg-primary/10 border-l-4 border-primary rounded-r-lg p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-primary">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t.summaryLabel}</span>
                </div>
                <p className="text-sm text-on-surface leading-relaxed italic">
                  {note.summary}
                </p>
              </div>
            )}

            {/* Main Markdown Body */}
            <div className="markdown-body text-sm font-sans leading-relaxed text-on-surface">
              {note.description ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {note.description}
                </ReactMarkdown>
              ) : (
                <p className="text-outline/60 italic font-mono text-xs">
                  (Текст записи отсутствует)
                </p>
              )}
            </div>

            {/* Attached Images Gallery */}
            {note.images && note.images.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-white/5">
                <div className="font-mono text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                  {t.gallerySection} ({note.images.length})
                </div>
                <Image.PreviewGroup>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {note.images.map((img) => {
                      const fullUrl = getFullUrl(img.url);
                      const thumb = getFullUrl(img.thumbnailUrl || img.url);

                      return (
                        <div
                          key={img.id}
                          className="relative group rounded-lg overflow-hidden border border-white/10 bg-black/40 aspect-video flex items-center justify-center shadow-sm hover:border-primary/50 transition-colors"
                        >
                          <Image
                            src={thumb}
                            preview={{ src: fullUrl }}
                            alt={img.alt || img.filename}
                            className="w-full h-full object-cover"
                          />
                          {img.isMain && (
                            <span className="absolute top-1.5 left-1.5 bg-primary/90 text-on-primary font-mono text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                              MAIN
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Image.PreviewGroup>
              </div>
            )}

            {/* Attached Links */}
            {note.links && note.links.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-white/5">
                <div className="font-mono text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                  {t.linksSection} ({note.links.length})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {note.links.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-lg border border-white/10 bg-surface-container-high hover:border-secondary/50 hover:bg-surface-container-highest transition-all flex items-center justify-between gap-2 group"
                    >
                      <div className="min-w-0">
                        <div className="font-sans font-medium text-xs text-on-surface group-hover:text-secondary truncate">
                          {link.title || link.url}
                        </div>
                        <div className="font-mono text-[10px] text-on-surface-variant truncate">
                          {link.url}
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-on-surface-variant group-hover:text-secondary shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Secondary Folders & Tags Section */}
            <div className="space-y-3 pt-3 border-t border-white/5">
              {/* Secondary Folders */}
              {secondaryFolders.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[11px] text-on-surface-variant">
                    {t.folderSection}:
                  </span>
                  {secondaryFolders.map((sf) => (
                    <button
                      key={sf.id}
                      type="button"
                      onClick={() => {
                        if (onSelectFolder && sf.folder) {
                          onClose();
                          onSelectFolder(sf.folder.path);
                        }
                      }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-surface-container-highest text-primary border border-primary/20 hover:border-primary transition-all"
                    >
                      <FolderIcon className="w-3 h-3" />
                      <span>{sf.folder?.path}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Hashtags */}
              {note.hashtags && note.hashtags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {note.hashtags.map((h) => (
                    <HashtagBadge
                      key={h.id}
                      name={h.name}
                      size="sm"
                      onClick={
                        onSelectHashtag
                          ? (name) => {
                              onClose();
                              onSelectHashtag(name);
                            }
                          : undefined
                      }
                      clickable={!onSelectHashtag}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Obsidian File Path / Technical Meta */}
            {note.filePath && (
              <div className="p-2 rounded bg-control border border-tile-border text-[11px] font-mono text-text-muted flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 truncate">
                  <FileCode className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="truncate">{note.filePath}</span>
                </span>
                <span className="text-[10px] text-text-muted/60 shrink-0">Obsidian Vault</span>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-5 py-2.5 border-t border-tile-border bg-tile-subtle flex items-center justify-between gap-2.5">
            <Popconfirm
              title={t.confirmDeleteNote}
              onConfirm={handleDelete}
              okText={t.delete}
              cancelText={t.cancel}
              okButtonProps={{ danger: true }}
            >
              <button
                type="button"
                className="h-7 px-2.5 rounded text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t.delete}</span>
              </button>
            </Popconfirm>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-7 px-3 rounded bg-tile-subtle hover:bg-tile-muted text-text-muted hover:text-text-main text-xs font-mono border border-tile-border transition-colors cursor-pointer"
              >
                {t.close}
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onEdit) onEdit(note.id);
                  else navigate(`/notes/${note.id}`);
                }}
                className="h-7 px-2.5 rounded bg-tile-subtle hover:bg-tile-muted text-text-muted hover:text-text-main text-xs font-mono border border-tile-border transition-colors flex items-center gap-1 cursor-pointer"
                title="Перейти на отдельную страницу редактора"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Полная страница</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPublishStagingOpen(true)}
                className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/35 hover:bg-amber-500/25 transition-all text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer"
                title="Отправить в Стейджинг-хаб / Опубликовать в паблик"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">В Стейджинг</span>
              </button>

              <button
                type="button"
                onClick={() => setIsEditOpen(true)}
                className="h-7 px-3 rounded bg-primary text-on-primary hover:bg-primary-fixed-dim text-xs font-mono font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{t.edit}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <PublishToStagingModal
        noteId={note?.id || null}
        open={isPublishStagingOpen}
        onClose={() => setIsPublishStagingOpen(false)}
      />

      <EditNoteModal
        noteId={note?.id || null}
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSuccess={() => {
          setIsEditOpen(false);
        }}
        onOpenFullPage={(id) => {
          setIsEditOpen(false);
          onClose();
          if (onEdit) onEdit(id);
          else navigate(`/notes/${id}`);
        }}
      />
    </Modal>
  );
};
