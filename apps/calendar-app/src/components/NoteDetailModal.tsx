import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Note,
  NoteTypeColors,
  NoteType,
  CURATOR_PERSONAS_LIST,
  getCuratorPersona,
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
  Zap,
  Award,
} from 'lucide-react';
import { useI18n } from '../i18n';
import { Modal } from './Modal';
import { CuratorBadge } from './common/CuratorBadge';
import { calendarApi } from '../api/client';
import { queryKeys } from '../api/queries';

interface NoteDetailModalProps {
  note: Note | null;
  onClose: () => void;
}

export const NoteDetailModal: React.FC<NoteDetailModalProps> = ({ note, onClose }) => {
  const { t, getTypeLabel } = useI18n();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCurator, setEditCurator] = useState<string | undefined>(undefined);
  const [editResonanceScore, setEditResonanceScore] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    if (note) {
      setEditTitle(note.title);
      setEditDescription(note.description || '');
      setEditCurator(note.curator || undefined);
      setEditResonanceScore(
        typeof note.resonanceScore === 'number' ? String(note.resonanceScore) : ''
      );
      setIsEditing(false);
      setEditError(null);
    }
  }, [note]);

  if (!note) return null;

  const handleSaveEdit = async () => {
    if (!editTitle.trim() || isSavingEdit) return;
    setIsSavingEdit(true);
    setEditError(null);

    try {
      const resonanceVal = editResonanceScore.trim() ? Number(editResonanceScore) : undefined;
      const updated = await calendarApi.updateNote(note.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        curator: editCurator || undefined,
        resonanceScore: resonanceVal,
      });
      note.title = updated.title;
      note.description = updated.description;
      note.curator = updated.curator;
      note.resonanceScore = updated.resonanceScore;
      await queryClient.invalidateQueries({ queryKey: queryKeys.allNotes });
      setIsEditing(false);
    } catch (err: any) {
      console.error('Failed to update note:', err);
      setEditError(err?.response?.data?.message || err?.message || 'Ошибка обновления заметки');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const typeColor = NoteTypeColors[note.type] || NoteTypeColors.EVENT;
  const startDay = dayjs(note.startDate);
  const endDay = note.endDate ? dayjs(note.endDate) : null;
  const durationDays = endDay ? Math.max(1, endDay.diff(startDay, 'day') + 1) : 1;

  const primaryFolder =
    note.folders?.find((f) => f.isPrimary)?.folder?.path ||
    note.folders?.[0]?.folder?.path;

  const mainImage = note.images?.find((img) => img.isMain) || note.images?.[0];

  return (
    <Modal
      isOpen={Boolean(note)}
      onClose={onClose}
      showDefaultHeader={false}
      maxWidth="max-w-3xl"
      containerClassName="bg-[#1b1e1e] border-[#323636]"
    >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#242828] bg-[#121414]/60">
          <div className="flex items-center gap-3">
            <span
              className="px-2.5 py-1 rounded text-xs font-mono font-medium border"
              style={{
                backgroundColor: typeColor.bg,
                color: typeColor.text,
                borderColor: typeColor.border,
              }}
            >
              {getTypeLabel(note.type)}
            </span>

            {note.feed && (
              <span className="text-xs font-mono text-[#c9c7b2] bg-[#282a2a] px-2.5 py-1 rounded border border-[#242828] flex items-center gap-1.5">
                <Rss className="w-3 h-3 text-[#c9cd58]" />
                <span>{note.feed.title}</span>
              </span>
            )}

            {note.curator && (
              <CuratorBadge
                curator={note.curator}
                resonanceScore={note.resonanceScore}
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
                  href={`http://localhost:5173/notes/${note.id}`}
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
                alt={mainImage.alt || note.title}
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
                      Куратор / Аналитический актор
                    </label>
                    <select
                      value={editCurator || ''}
                      onChange={(e) => setEditCurator(e.target.value || undefined)}
                      className="w-full bg-[#121414] border border-[#242828] focus:border-[#c9cd58] rounded-md text-xs font-mono px-3 py-2 text-white outline-none"
                    >
                      <option value="">Без куратора</option>
                      {CURATOR_PERSONAS_LIST.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.emoji} {p.name} ({p.role})
                        </option>
                      ))}
                      <option value="Пользователь">👤 Пользователь (Синтез)</option>
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
                      placeholder="Например: 86"
                      value={editResonanceScore}
                      onChange={(e) => setEditResonanceScore(e.target.value)}
                      className="w-full bg-[#121414] border border-[#242828] focus:border-[#c9cd58] rounded-md text-xs font-mono px-3 py-2 text-white outline-none"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <h2 className="text-2xl font-bold text-white mb-2 leading-tight">
                {note.title}
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

          {/* Curator Dossier & Resonance Card */}
          {(note.curator || typeof note.resonanceScore === 'number' || note.type === NoteType.DONE) && (() => {
            const persona = note.curator ? getCuratorPersona(note.curator) : null;
            const isHighResonance = typeof note.resonanceScore === 'number' && note.resonanceScore >= 70;
            const isSynthesis = note.type === NoteType.DONE;

            return (
              <div className={`p-4 rounded-xl border text-xs font-mono transition-all ${
                isSynthesis
                  ? 'bg-gradient-to-r from-emerald-950/40 via-[#181d1c] to-[#121414] border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                  : isHighResonance
                  ? 'bg-gradient-to-r from-amber-950/30 via-[#1b1c19] to-[#121414] border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.08)]'
                  : 'bg-[#121414] border-[#242828]'
              }`}>
                {/* Header of Dossier */}
                <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    {isSynthesis ? (
                      <Award className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Bot className="w-4 h-4 text-sky-400" />
                    )}
                    <span className="font-bold uppercase tracking-wider text-neutral-200">
                      {isSynthesis
                        ? 'Суверенный Синтез Пользователя (Case Milestone)'
                        : 'Аналитический Контур Куратора'}
                    </span>
                  </div>

                  {typeof note.resonanceScore === 'number' && (
                    <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${
                      isHighResonance
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-glow-lemon/20'
                        : 'bg-neutral-800 text-neutral-300 border-neutral-700'
                    }`}>
                      <Zap className={`w-3.5 h-3.5 ${isHighResonance ? 'text-amber-400 fill-amber-400' : 'text-neutral-400'}`} />
                      <span>Резонанс: {note.resonanceScore}%</span>
                    </div>
                  )}
                </div>

                {/* Curator Persona Details */}
                {persona ? (
                  <div className="flex items-start gap-3">
                    <span className="text-2xl select-none">{persona.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{persona.name}</span>
                        <span className="text-[11px] text-neutral-400">• {persona.role}</span>
                      </div>
                      <p className="text-[11px] text-neutral-300 mt-1 leading-relaxed">
                        {persona.scope}
                      </p>
                    </div>
                  </div>
                ) : note.curator ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xl">👤</span>
                    <span className="font-bold text-white">{note.curator}</span>
                  </div>
                ) : null}

                {/* High Resonance Alert banner */}
                {isHighResonance && (
                  <div className="mt-3 p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/30 text-[11px] text-amber-200/90 leading-relaxed flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      <strong>Высокая зона пересечения (≥70%):</strong> событие напрямую связывает внутренние реалии и глобальный контекст. Требуется перекрёстный анализ мнений Ивана Белого и Kirk Kitten.
                    </span>
                  </div>
                )}

                {/* Synthesis description */}
                {isSynthesis && (
                  <div className="mt-3 p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-[11px] text-emerald-200/90 leading-relaxed flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      <strong>Итоговое решение зафиксировано:</strong> данный синтез аккумулирует практический опыт (Case-Based Reasoning) и сохраняет контроль над картиной мира в руках пользователя.
                    </span>
                  </div>
                )}
              </div>
            );
          })()}

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

            {note.sourceLink && (
              <div className="bg-[#121414] p-3 rounded border border-[#242828] flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-[#c9cd58]" />
                <div className="min-w-0 flex-1">
                  <span className="text-[#93927e] block text-[10px] uppercase">{t.links}</span>
                  <a
                    href={note.sourceLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#e5e971] hover:underline truncate block"
                  >
                    {note.sourceLink}
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Tags & Taxonomy Paths */}
          {((note.tags && note.tags.length > 0) || (note.hashtags && note.hashtags.length > 0)) && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-[#242828]">
              {note.tags?.map((tagItem) => (
                <span
                  key={tagItem.id}
                  className="px-2.5 py-1 rounded bg-[#282a2a] border border-[#242828] text-xs font-mono text-[#c9c7b2] flex items-center gap-1.5"
                >
                  <Tag className="w-3 h-3 text-[#c9cd58]" />
                  <span>{tagItem.path}</span>
                </span>
              ))}
              {note.hashtags?.map((h) => (
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
          ) : note.description ? (
            <div className="border-t border-[#242828] pt-4">
              <h4 className="text-xs font-mono uppercase tracking-widest text-[#93927e] mb-3">
                {t.noteDetails}
              </h4>
              <div className="prose-dark bg-[#121414] p-4 rounded border border-[#242828] text-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {note.description}
                </ReactMarkdown>
              </div>
            </div>
          ) : null}

          {/* Secondary Image Gallery */}
          {note.images && note.images.length > 1 && (
            <div className="border-t border-[#242828] pt-4">
              <h4 className="text-xs font-mono uppercase tracking-widest text-[#93927e] mb-3 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" />
                <span>{t.attachments} ({note.images.length})</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {note.images.map((img) => (
                  <a
                    key={img.id}
                    href={img.url}
                    target="_blank"
                    rel="noreferrer"
                    className="h-28 rounded overflow-hidden bg-[#121414] border border-[#242828] group hover:border-[#c9cd58] transition-colors"
                  >
                    <img
                      src={img.thumbnailUrl || img.url}
                      alt={img.alt || note.title}
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
          <span>ID: {note.id}</span>
          <span>{t.updated}: {dayjs(note.updatedAt).format('YYYY-MM-DD HH:mm')}</span>
        </div>
    </Modal>
  );
};

