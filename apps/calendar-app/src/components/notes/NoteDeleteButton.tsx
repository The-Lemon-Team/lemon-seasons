import React, { useState, useRef, useEffect } from 'react';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { calendarApi } from '../../api/client';
import { queryKeys } from '../../api/queries';
import { useI18n } from '../../i18n';

export interface NoteDeleteButtonProps {
  noteId: string;
  noteTitle?: string;
  onDeleted?: () => void;
  variant?: 'icon' | 'button' | 'ghost';
  size?: 'sm' | 'md';
  className?: string;
  title?: string;
  showLabel?: boolean;
  confirmPlacement?: 'top' | 'bottom' | 'left' | 'right';
}

export const NoteDeleteButton: React.FC<NoteDeleteButtonProps> = ({
  noteId,
  noteTitle,
  onDeleted,
  variant = 'button',
  size = 'sm',
  className = '',
  title,
  showLabel = true,
  confirmPlacement = 'top',
}) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape (captured before parent modals)
  useEffect(() => {
    if (!isConfirmOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsConfirmOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setIsConfirmOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isConfirmOpen]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await calendarApi.deleteNote(noteId);
      await queryClient.invalidateQueries({ queryKey: queryKeys.allNotes });
      setIsConfirmOpen(false);
      onDeleted?.();
    } catch (err: any) {
      console.error('Failed to delete note:', err);
      setDeleteError(err.response?.data?.message || 'Ошибка удаления');
    } finally {
      setIsDeleting(false);
    }
  };

  const placementClasses = {
    top: 'bottom-full mb-1.5 right-0',
    bottom: 'top-full mt-1.5 right-0',
    left: 'right-full mr-1.5 top-0',
    right: 'left-full ml-1.5 top-0',
  }[confirmPlacement];

  return (
    <div className="relative inline-flex items-center shrink-0" ref={popoverRef}>
      {variant === 'icon' ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsConfirmOpen((prev) => !prev);
          }}
          className={`p-1 rounded text-neutral-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer ${className}`}
          title={title || t.deleteNote}
          aria-label={t.deleteNote}
        >
          <Trash2 className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        </button>
      ) : variant === 'ghost' ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsConfirmOpen((prev) => !prev);
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono text-neutral-400 hover:text-rose-300 hover:bg-rose-950/30 transition-colors cursor-pointer ${className}`}
          title={title || t.deleteNote}
        >
          <Trash2 className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
          {showLabel && <span>{t.deleteNote}</span>}
        </button>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsConfirmOpen((prev) => !prev);
          }}
          className={`flex items-center gap-1.5 px-3 py-1 rounded bg-rose-950/20 border border-rose-500/30 hover:border-rose-500/60 hover:bg-rose-950/40 text-xs font-mono text-rose-300 hover:text-rose-200 transition-colors cursor-pointer ${className}`}
          title={title || t.deleteNote}
        >
          <Trash2 className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
          {showLabel && <span>{t.deleteNote}</span>}
        </button>
      )}

      {/* Confirmation Floating Popover */}
      {isConfirmOpen && (
        <div
          className={`absolute z-[1200] p-3 rounded-xl bg-[#181a1a] border border-rose-500/40 shadow-2xl flex flex-col gap-2.5 min-w-[220px] max-w-[280px] text-left select-none animate-in fade-in zoom-in-95 duration-100 ${placementClasses}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-snug">
              <div className="text-xs font-sans font-semibold text-rose-200">
                {t.deleteNoteConfirm}
              </div>
              {noteTitle && (
                <div className="text-[11px] font-mono text-neutral-400 truncate max-w-[190px] mt-0.5">
                  «{noteTitle}»
                </div>
              )}
            </div>
          </div>

          {deleteError && (
            <div className="text-[11px] font-mono text-rose-400 bg-rose-950/40 p-1.5 rounded border border-rose-800/40">
              {deleteError}
            </div>
          )}

          <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-[#2a2d2d]">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsConfirmOpen(false);
              }}
              disabled={isDeleting}
              className="px-2.5 py-1 rounded bg-[#121414] border border-[#323636] hover:bg-[#282a2a] text-xs font-mono text-[#c9c7b2] transition-colors cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-medium transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Удаление...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t.deleteNote}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
