import React from 'react';
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
  const { data: note, isLoading } = useNote(noteId || '');
  const deleteNoteMutation = useDeleteNote();

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
      footer={null}
      width={780}
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
      {isLoading ? (
        <div className="relative py-24 flex flex-col items-center justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
            title={t.close}
            aria-label={t.close}
          >
            <X className="w-4 h-4" />
          </button>
          <Spin size="large" />
          <span className="font-mono text-xs text-on-surface-variant">
            {t.loading}...
          </span>
        </div>
      ) : !note ? (
        <div className="relative p-8 text-center space-y-3">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
            title={t.close}
            aria-label={t.close}
          >
            <X className="w-4 h-4" />
          </button>
          <p className="text-on-surface-variant font-mono text-sm">{t.noteNotFound}</p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-surface-container-high text-on-surface text-xs font-mono border border-white/10 hover:border-white/20"
          >
            {t.close}
          </button>
        </div>
      ) : (
        <div className="flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/5 bg-surface-container-highest/60 flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <NoteTypeBadge type={note.type} size="sm" />
                {note.status && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-white/5 border border-white/10 text-on-surface-variant font-medium">
                    {note.status}
                  </span>
                )}
                {note.feed && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-primary/10 border border-primary/20 text-primary">
                    <Layers className="w-3 h-3" />
                    {note.feed.title}
                  </span>
                )}
                {note.curator && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-sky-950/60 border border-sky-500/40 text-sky-300">
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

              {onEdit && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(note.id);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition-all text-xs font-mono font-medium flex items-center gap-1.5"
                  title={t.editInEditor}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t.edit}</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
                title={t.close}
                aria-label={t.close}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Metadata Sub-Bar */}
          <div className="px-6 py-2.5 border-b border-white/5 bg-surface-container-high/40 flex items-center gap-4 text-xs font-mono text-on-surface-variant flex-wrap">
            {/* Dates */}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>{formattedStartDate}</span>
              {formattedEndDate && (
                <>
                  <span className="text-white/30">→</span>
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
                className="inline-flex items-center gap-1 text-primary hover:underline"
                title={primaryFolder.folder.path}
              >
                <FolderIcon className="w-3.5 h-3.5" />
                <span className="truncate max-w-[200px]">{primaryFolder.folder.path}</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-outline/60">
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
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
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
              <div className="p-2.5 rounded bg-surface-container-lowest border border-white/5 text-[11px] font-mono text-on-surface-variant flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 truncate">
                  <FileCode className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="truncate">{note.filePath}</span>
                </span>
                <span className="text-[10px] text-outline shrink-0">Obsidian Vault</span>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-3 border-t border-white/5 bg-surface-container-highest/50 flex items-center justify-between gap-3">
            <Popconfirm
              title={t.confirmDeleteNote}
              onConfirm={handleDelete}
              okText={t.delete}
              cancelText={t.cancel}
              okButtonProps={{ danger: true }}
            >
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-transparent hover:border-rose-800/40 font-mono text-xs flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t.delete}</span>
              </button>
            </Popconfirm>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface text-xs font-mono border border-white/10 transition-colors"
              >
                {t.close}
              </button>

              {onEdit && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(note.id);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-primary text-on-primary hover:brightness-110 text-xs font-mono font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{t.editInEditor}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
