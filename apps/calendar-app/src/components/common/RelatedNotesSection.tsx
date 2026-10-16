import React from 'react';
import { RelatedNoteItem, NoteTypeColors, NoteType } from '@lenta/shared';
import dayjs from 'dayjs';
import { Link2, FileText, ArrowRight, CornerDownRight, ExternalLink } from 'lucide-react';

interface RelatedNotesSectionProps {
  relatedNotes: RelatedNoteItem[];
  onNavigateToNote?: (targetNoteId: string) => void;
  isLoading?: boolean;
}

export const RelatedNotesSection: React.FC<RelatedNotesSectionProps> = ({
  relatedNotes,
  onNavigateToNote,
  isLoading,
}) => {
  if (!relatedNotes || relatedNotes.length === 0) {
    return null;
  }

  const resolvedCount = relatedNotes.filter((n) => n.resolved).length;

  return (
    <div className="border-t border-[#242828] pt-4 mt-2">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-mono uppercase tracking-widest text-[#93927e] flex items-center gap-1.5">
          <Link2 className="w-3.5 h-3.5 text-[#c9cd58]" />
          <span>Связанные записи ({relatedNotes.length})</span>
        </h4>
        <span className="text-[10px] font-mono text-[#93927e] bg-[#121414] px-2 py-0.5 rounded border border-[#242828]">
          {resolvedCount} из {relatedNotes.length} в базе
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {relatedNotes.map((item, idx) => {
          const typeKey = (item.targetType as NoteType) || NoteType.EVENT;
          const typeColor = NoteTypeColors[typeKey] || NoteTypeColors.EVENT;

          if (item.resolved && item.targetNoteId) {
            return (
              <button
                key={`${item.targetNoteId}-${idx}`}
                type="button"
                onClick={() => onNavigateToNote?.(item.targetNoteId!)}
                disabled={isLoading}
                className="text-left group bg-[#121414] hover:bg-[#181c1c] border border-[#242828] hover:border-[#c9cd58]/60 p-3 rounded-lg transition-all flex flex-col justify-between gap-2 shadow-sm hover:shadow-[0_2px_12px_rgba(201,205,88,0.06)]"
              >
                {/* Card Header */}
                <div className="flex items-center justify-between gap-2 w-full">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm shrink-0">{item.targetIcon || '📄'}</span>
                    {item.isParent ? (
                      <span className="text-[10px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1 shrink-0">
                        <CornerDownRight className="w-2.5 h-2.5" />
                        Сводный дайджест
                      </span>
                    ) : (
                      <span
                        className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border shrink-0"
                        style={{
                          backgroundColor: typeColor.bg,
                          color: typeColor.text,
                          borderColor: typeColor.border,
                        }}
                      >
                        {item.targetType || 'EVENT'}
                      </span>
                    )}
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#93927e] group-hover:text-[#c9cd58] group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>

                {/* Card Title */}
                <div className="text-xs font-mono font-medium text-[#e2e2e2] group-hover:text-[#f2f587] line-clamp-2 leading-snug">
                  {item.targetTitle || item.cleanTitle}
                </div>

                {/* Card Footer */}
                <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-[#93927e] pt-1 border-t border-white/5 w-full">
                  <span>
                    {item.targetDate ? dayjs(item.targetDate).format('D MMM YYYY') : item.cleanTitle}
                  </span>
                  {item.targetCurator && item.targetCurator !== 'auto' && (
                    <span className="text-[#c9c7b2] truncate max-w-[120px]">
                      @{item.targetCurator}
                    </span>
                  )}
                </div>
              </button>
            );
          }

          // Unresolved / Vault reference card
          return (
            <div
              key={`unresolved-${idx}`}
              className="bg-[#121414]/60 border border-[#242828] p-3 rounded-lg flex flex-col justify-between gap-2 opacity-80"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs text-[#93927e]">
                  <FileText className="w-3.5 h-3.5 text-[#93927e]" />
                  <span className="text-[10px] font-mono text-[#93927e] uppercase">
                    {item.isVaultDoc ? 'Obsidian Vault Doc' : 'Внешняя ссылка'}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#737575] bg-[#1a1c1c] px-1.5 py-0.5 rounded">
                  [[wikilink]]
                </span>
              </div>
              <div className="text-xs font-mono text-[#c9c7b2] line-clamp-2 leading-snug">
                {item.raw}
              </div>
              <div className="text-[10px] font-mono text-[#737575] pt-1 border-t border-white/5">
                Заметка в локальном хранилище Obsidian
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
