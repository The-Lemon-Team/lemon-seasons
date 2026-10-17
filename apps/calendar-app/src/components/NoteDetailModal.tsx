import React, { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Note,
  NoteTypeColors,
  NoteType,
  RelatedNoteItem,
} from '@lenta/shared';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import dayjs from 'dayjs';
import {
  X,
  Calendar,
  Clock,
  ExternalLink,
  Tag,
  Folder,
  Rss,
  Edit3,
  Check,
  Image as ImageIcon,
  AlertCircle,
  Bot,
  Award,
  ArrowLeft,
} from 'lucide-react';
import { useI18n } from '../i18n';
import { Modal } from './Modal';
import { CuratorBadge } from './common/CuratorBadge';
import { RelatedNotesSection } from './common/RelatedNotesSection';
import { calendarApi } from '../api/client';
import { queryKeys } from '../api/queries';

interface NoteDetailModalProps {
  note: Note | null;
  onClose: () => void;
}

export const NoteDetailModal: React.FC<NoteDetailModalProps> = ({ note, onClose }) => {
  const { t, getTypeLabel } = useI18n();
  const queryClient = useQueryClient();

  const [activeNote, setActiveNote] = useState<Note | null>(note);
  const [history, setHistory] = useState<Note[]>([]);
  const [isLoadingRelated, setIsLoadingRelated] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCurator, setEditCurator] = useState<string | undefined>(undefined);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    setActiveNote(note);
    setHistory([]);
  }, [note]);

  const current = activeNote || note;

  useEffect(() => {
    if (current) {
      setEditTitle(current.title);
      setEditDescription(current.description || '');
      setEditCurator(current.curator || undefined);
      setIsEditing(false);
      setEditError(null);
    }
  }, [current]);

  if (!current) return null;

  const handleNavigateToNote = async (targetNoteId: string) => {
    if (!targetNoteId || isLoadingRelated) return;
    try {
      setIsLoadingRelated(true);
      const target = await calendarApi.getNoteById(targetNoteId);
      if (target) {
        setHistory((prev) => [...prev, current]);
        setActiveNote(target);
      }
    } catch (err) {
      console.warn('Failed to load related note:', err);
    } finally {
      setIsLoadingRelated(false);
    }
  };

  const handleBack = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setActiveNote(prev);
  };

  const cleanDescription = useMemo(() => {
    if (!current.description) return '';
    return current.description
      .replace(/(?:(?:\r?\n|^)---)?\s*(?:\r?\n|^)##\s*🔗?\s*Связанные\s+(?:записи|файлы|заметки)[\s\S]*$/i, '')
      .trim();
  }, [current.description]);

  const relatedNotes: RelatedNoteItem[] = useMemo(() => {
    if (!current) return [];
    const metaRelated = current.metadata?.relatedNotes;
    if (Array.isArray(metaRelated) && metaRelated.length > 0) {
      return metaRelated;
    }
    if (current.description && /##\s*🔗?\s*Связанные/i.test(current.description)) {
      const match = current.description.match(/##\s*🔗?\s*Связанные\s+(?:записи|файлы|заметки)([\s\S]*?)(?:$|\n##)/i);
      if (match) {
        return [...match[1].matchAll(/\[\[(.*?)\]\]/g)]
          .map((m) => m[1].trim())
          .filter((l) => l && !l.toLowerCase().includes('другая заметка'))
          .map((link) => {
            const cleanTitle = link.replace(/^\d{2}\.\d{2}\.\d{2,4}\s*[-_—–]?\s*/, '').trim();
            return {
              raw: link,
              cleanTitle: cleanTitle || link,
              resolved: false,
              isVaultDoc: link.startsWith('00 - '),
            };
          });
      }
    }
    return [];
  }, [current]);

  const handleSaveEdit = async () => {
    if (!editTitle.trim() || isSavingEdit) return;
    setIsSavingEdit(true);
    setEditError(null);

    try {
      const updated = await calendarApi.updateNote(current.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        curator: editCurator || undefined,
      });
      current.title = updated.title;
      current.description = updated.description;
      current.curator = updated.curator;
      setActiveNote({ ...current, ...updated });
      await queryClient.invalidateQueries({ queryKey: queryKeys.allNotes });
      setIsEditing(false);
    } catch (err: any) {
      console.error('Failed to update note:', err);
      setEditError(err?.response?.data?.message || err?.message || 'Ошибка обновления заметки');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const typeColor = NoteTypeColors[current.type] || NoteTypeColors.EVENT;
  const startDay = dayjs(current.startDate);
  const endDay = current.endDate ? dayjs(current.endDate) : null;
  const durationDays = endDay ? Math.max(1, endDay.diff(startDay, 'day') + 1) : 1;

  const primaryFolder =
    current.folders?.find((f) => f.isPrimary)?.folder?.path ||
    current.folders?.[0]?.folder?.path;

  const mainImage = current.images?.find((img) => img.isMain) || current.images?.[0];

  return (
    <Modal
      isOpen={Boolean(current)}
      onClose={onClose}
      showDefaultHeader={false}
      maxWidth="max-w-3xl"
      containerClassName="bg-[#1b1e1e] border-[#323636]"
    >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#242828] bg-[#121414]/60">
          <div className="flex items-center gap-3">
            {history.length > 0 && (
              <button
                type="button"
                onClick={handleBack}
                disabled={isLoadingRelated}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#282a2a] hover:bg-[#343838] text-xs font-mono text-[#c9cd58] transition-colors border border-[#242828]"
                title="Вернуться к предыдущей заметке"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Назад</span>
              </button>
            )}

            <span
              className="px-2.5 py-1 rounded text-xs font-mono font-medium border"
              style={{
                backgroundColor: typeColor.bg,
                color: typeColor.text,
                borderColor: typeColor.border,
              }}
            >
              {getTypeLabel(current.type)}
            </span>

            {current.feed && (
              <span className="text-xs font-mono text-[#c9c7b2] bg-[#282a2a] px-2.5 py-1 rounded border border-[#242828] flex items-center gap-1.5">
                <Rss className="w-3 h-3 text-[#c9cd58]" />
                <span>{current.feed.title}</span>
              </span>
            )}

            {current.curator && (
              <CuratorBadge
                curator={current.curator}
                size="sm"
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={isSavingEdit}
                  className="px-2.5 py-1 rounded bg-[#121414] border border-[#242828] text-xs font-mono text-[#c9c7b2] hover:bg-[#242828] transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  data-testid="save-note-btn"
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit || !editTitle.trim()}
                  className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#c9cd58] text-[#121414] hover:bg-[#dce06b] font-bold text-xs font-sans transition-colors disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSavingEdit ? 'Сохранение...' : t.save}</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  data-testid="edit-note-btn"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#121414] border border-[#484837] hover:border-[#c9cd58] text-xs font-mono text-[#c9c7b2] hover:text-[#e5e971] transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{t.editNote}</span>
                </button>

                {/* Edit in Admin CMS */}
                <a
                  href={`http://localhost:5173/notes/${current.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded bg-[#121414] border border-[#242828] text-xs font-mono text-[#93927e] hover:text-[#c9c7b2] transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>CMS</span>
                </a>
              </>
            )}

            {/* Close Button */}
            <button
              type="button"
              data-testid="close-modal-btn"
              onClick={onClose}
              className="p-1 rounded text-[#c9c7b2] hover:text-white hover:bg-[#333535] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {editError && (
            <div className="flex items-center gap-2 px-3 py-2 rounded bg-red-900/30 border border-red-500/50 text-red-200 text-xs font-mono">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{editError}</span>
            </div>
          )}

          {/* Main Cover Banner if available */}
          {mainImage?.url && (
            <div className="w-full h-56 rounded-md overflow-hidden bg-[#121414] border border-[#242828] relative">
              <img
                src={mainImage.url}
                alt={mainImage.alt || current.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Title & Timing */}
          <div>
            {isEditing ? (
              <div className="space-y-3 mb-3">
                <div>
                  <label className="block text-[11px] font-mono text-[#c9c7b2] mb-1">
                    Заголовок заметки
                  </label>
                  <input
                    type="text"
                    data-testid="edit-note-title-input"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-[#121414] border border-[#242828] focus:border-[#c9cd58] rounded-md text-base font-bold font-sans px-3 py-2 text-white outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono text-[#c9c7b2] mb-1">
                      Куратор / Источник
                    </label>
                    <input
                      type="text"
                      value={editCurator || ''}
                      onChange={(e) => setEditCurator(e.target.value || undefined)}
                      placeholder="Например: Gemini Sparks, RSS Ingestion, Пользователь..."
                      className="w-full bg-[#121414] border border-[#242828] focus:border-[#c9cd58] rounded-md text-xs font-mono px-3 py-2 text-white outline-none"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <h2 className="text-2xl font-bold text-white mb-2 leading-tight">
                {current.title}
              </h2>
            )}

            {/* Date Time Metadata Bar */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[#c9c7b2] bg-[#121414] p-3 rounded border border-[#242828]">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#c9cd58]" />
                <span className="capitalize">{startDay.format('D MMMM YYYY')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#c9cd58]" />
                <span>{startDay.format('HH:mm')}</span>
              </div>
              {endDay && (
                <div className="flex items-center gap-1.5 text-[#93927e]">
                  <span>→</span>
                  <span>
                    {endDay.format('D MMMM YYYY HH:mm')} ({t.durationDays(durationDays)})
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* User Milestone Synthesis Banner */}
          {current.type === NoteType.DONE && (
            <div className="p-4 rounded-xl border text-xs font-mono transition-all bg-gradient-to-r from-emerald-950/40 via-[#181d1c] to-[#121414] border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
              <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold uppercase tracking-wider text-neutral-200">
                    Суверенный Синтез Пользователя (Case Milestone)
                  </span>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-[11px] text-emerald-200/90 leading-relaxed flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Итоговое решение зафиксировано:</strong> данный синтез аккумулирует практический опыт (Case-Based Reasoning) и сохраняет контроль над картиной мира в руках пользователя.
                </span>
              </div>
            </div>
          )}

          {/* Detailed Hierarchy & Taxonomy Inspector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
            {primaryFolder && (
              <div className="bg-[#121414] p-3 rounded border border-[#242828] flex items-center gap-2">
                <Folder className="w-4 h-4 text-[#c9cd58]" />
                <div>
                  <span className="text-[#93927e] block text-[10px] uppercase">{t.obsidianFolder}</span>
                  <span className="text-white">{primaryFolder}</span>
                </div>
              </div>
            )}

            {current.sourceLink && (
              <div className="bg-[#121414] p-3 rounded border border-[#242828] flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-[#c9cd58]" />
                <div className="min-w-0 flex-1">
                  <span className="text-[#93927e] block text-[10px] uppercase">{t.links}</span>
                  <a
                    href={current.sourceLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#e5e971] hover:underline truncate block"
                  >
                    {current.sourceLink}
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Tags & Taxonomy Paths */}
          {((current.tags && current.tags.length > 0) || (current.hashtags && current.hashtags.length > 0)) && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-[#242828]">
              {current.tags?.map((tagItem) => (
                <span
                  key={tagItem.id}
                  className="px-2.5 py-1 rounded bg-[#282a2a] border border-[#242828] text-xs font-mono text-[#c9c7b2] flex items-center gap-1.5"
                >
                  <Tag className="w-3 h-3 text-[#c9cd58]" />
                  <span>{tagItem.path}</span>
                </span>
              ))}
              {current.hashtags?.map((h) => (
                <span
                  key={h.id}
                  className="px-2.5 py-1 rounded bg-[#c9cd58]/10 text-[#e5e971] text-xs font-mono font-medium"
                >
                  #{h.name.replace(/^#/, '')}
                </span>
              ))}
            </div>
          )}

          {/* Markdown Content Body */}
          {isEditing ? (
            <div className="border-t border-[#242828] pt-4">
              <h4 className="text-xs font-mono uppercase tracking-widest text-[#93927e] mb-2">
                Описание (Markdown)
              </h4>
              <textarea
                data-testid="edit-note-description-input"
                rows={6}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Текст заметки в формате Markdown..."
                className="w-full bg-[#121414] border border-[#242828] focus:border-[#c9cd58] rounded-md text-xs font-mono p-3 text-[#e2e2e2] placeholder-[#93927e] outline-none resize-y"
              />
            </div>
          ) : cleanDescription ? (
            <div className="border-t border-[#242828] pt-4">
              <h4 className="text-xs font-mono uppercase tracking-widest text-[#93927e] mb-3">
                {t.noteDetails}
              </h4>
              <div className="prose-dark bg-[#121414] p-4 rounded border border-[#242828] text-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {cleanDescription}
                </ReactMarkdown>
              </div>
            </div>
          ) : null}

          {/* Related Notes Section */}
          <RelatedNotesSection
            relatedNotes={relatedNotes}
            onNavigateToNote={handleNavigateToNote}
            isLoading={isLoadingRelated}
          />

          {/* Secondary Image Gallery */}
          {current.images && current.images.length > 1 && (
            <div className="border-t border-[#242828] pt-4">
              <h4 className="text-xs font-mono uppercase tracking-widest text-[#93927e] mb-3 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" />
                <span>{t.attachments} ({current.images.length})</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {current.images.map((img) => (
                  <a
                    key={img.id}
                    href={img.url}
                    target="_blank"
                    rel="noreferrer"
                    className="h-28 rounded overflow-hidden bg-[#121414] border border-[#242828] group hover:border-[#c9cd58] transition-colors"
                  >
                    <img
                      src={img.thumbnailUrl || img.url}
                      alt={img.alt || current.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[#242828] bg-[#121414]/60 flex items-center justify-between text-xs font-mono text-[#93927e]">
          <span>ID: {current.id}</span>
          <span>{t.updated}: {dayjs(current.updatedAt).format('YYYY-MM-DD HH:mm')}</span>
        </div>
    </Modal>
  );
};

