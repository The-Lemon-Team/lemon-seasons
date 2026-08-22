import React, { useState, useRef, useEffect } from 'react';
import {
  NoteType,
  NOTE_TYPES,
  NoteTypeColors,
} from '@lenta/shared';
import { Shapes, ChevronDown, Check, X, Sparkles } from 'lucide-react';
import { useI18n } from '../i18n';

interface NoteTypeSelectorProps {
  selectedTypes: NoteType[];
  onToggleType: (type: NoteType) => void;
  onSelectOnlyType?: (type: NoteType) => void;
  onClearTypes?: () => void;
  onSetAllTypes?: (types: NoteType[]) => void;
  typeCounts?: Record<NoteType, number>;
}

export const NoteTypeSelector: React.FC<NoteTypeSelectorProps> = ({
  selectedTypes,
  onToggleType,
  onClearTypes,
  typeCounts = {
    SINGLE: 0,
    PERIOD: 0,
    EVENT: 0,
    FILM_RELEASE: 0,
    MENTION: 0,
    DONE: 0,
  },
}) => {
  const { t, getTypeLabel } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside or escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const activeCount = selectedTypes.length;

  // Trigger button label summary
  const getTriggerLabel = () => {
    if (activeCount === 0) {
      return t.allTypes;
    }
    if (activeCount === 1) {
      const type = selectedTypes[0];
      return getTypeLabel(type);
    }
    return `${t.entryTypes} (${activeCount})`;
  };

  return (
    <div className="relative inline-flex items-center" ref={dropdownRef}>
      {/* Note Types Dropdown Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        type="button"
        className={`flex items-center gap-1.5 px-2.5 h-7 rounded-lg text-xs font-mono transition-all duration-150 border relative select-none shrink-0 ${
          activeCount > 0
            ? 'bg-[#1e2020] border-[#c9cd58]/70 text-[#e5e971] shadow-sm font-medium'
            : 'bg-[#121414] border-[#242828] text-neutral-300 hover:text-white hover:bg-[#1a1c1c] hover:border-[#333535]'
        }`}
        title={t.entryTypes}
      >
        <Shapes className="w-3.5 h-3.5 text-[#c9cd58]" />

        {/* Color preview dots if filtered */}
        {activeCount > 0 ? (
          <div className="flex items-center gap-1">
            <div className="flex -space-x-1 items-center">
              {selectedTypes.slice(0, 3).map((type) => (
                <span
                  key={type}
                  className="w-2 h-2 rounded-full ring-1 ring-[#121414]"
                  style={{ backgroundColor: NoteTypeColors[type]?.accent || '#c9cd58' }}
                />
              ))}
            </div>
            <span>{getTriggerLabel()}</span>
          </div>
        ) : (
          <span>{t.allTypes}</span>
        )}

        {/* Active badge / Clear icon */}
        {activeCount > 0 ? (
          <div className="flex items-center gap-1 ml-0.5">
            {onClearTypes && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onClearTypes();
                }}
                className="hover:text-white p-0.5 rounded-full hover:bg-black/30 transition-colors"
                title={t.reset}
              >
                <X className="w-3 h-3" />
              </span>
            )}
          </div>
        ) : (
          <ChevronDown
            className={`w-3 h-3 opacity-60 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[#e5e971]' : ''
            }`}
          />
        )}
      </button>

      {/* Note Types Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-64 bg-[#16191b]/98 backdrop-blur-xl border border-[#242828] rounded-xl shadow-2xl z-50 p-3 space-y-2 animate-fade-in text-xs font-mono">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-[#242828]">
            <div className="flex items-center gap-1.5 text-white font-semibold uppercase tracking-wider text-[11px]">
              <Shapes className="w-3.5 h-3.5 text-[#c9cd58]" />
              <span>{t.entryTypes}</span>
            </div>

            <div className="flex items-center gap-2 text-[10px]">
              {activeCount > 0 && onClearTypes && (
                <button
                  onClick={() => {
                    onClearTypes();
                  }}
                  className="text-neutral-400 hover:text-[#e5e971] transition-colors"
                >
                  {t.reset}
                </button>
              )}
            </div>
          </div>

          {/* Type Options List */}
          <div className="space-y-1 max-h-64 overflow-y-auto pr-0.5">
            {/* Show All shortcut */}
            <button
              onClick={() => {
                if (onClearTypes) onClearTypes();
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all border ${
                activeCount === 0
                  ? 'bg-[#c9cd58]/20 border-[#c9cd58]/60 text-[#e5e971] font-semibold'
                  : 'bg-[#181a1a] border-[#242828] text-neutral-300 hover:bg-[#242828] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#c9cd58]" />
                <span>{t.allTypes}</span>
              </div>
              {activeCount === 0 && <Check className="w-3.5 h-3.5 text-[#c9cd58]" />}
            </button>

            {NOTE_TYPES.map((type) => {
              const isSelected = selectedTypes.includes(type);
              const count = typeCounts[type] || 0;
              const colors = NoteTypeColors[type];

              return (
                <div
                  key={type}
                  onClick={() => onToggleType(type)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-all border ${
                    isSelected
                      ? 'font-medium shadow-sm ring-1 ring-[#c9cd58]/50'
                      : 'opacity-75 hover:opacity-100 hover:bg-[#1f2121]'
                  }`}
                  style={{
                    backgroundColor: colors.bg,
                    color: colors.text,
                    borderColor: isSelected ? colors.accent : colors.border,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: colors.accent }}
                    />
                    <span>{getTypeLabel(type)}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {count > 0 && (
                      <span className="text-[10px] opacity-75 font-mono px-1 rounded bg-black/30">
                        {count}
                      </span>
                    )}
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Info */}
          <div className="pt-2 border-t border-[#242828] flex items-center justify-between text-[10px] text-neutral-500">
            <span>{t.pressEsc}</span>
          </div>
        </div>
      )}
    </div>
  );
};

