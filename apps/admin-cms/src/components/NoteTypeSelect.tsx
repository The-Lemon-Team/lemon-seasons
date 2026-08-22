import React, { useState, useRef, useEffect } from 'react';
import { NoteType } from '../types';
import { NOTE_TYPE_CONFIGS, NOTE_TYPE_LIST } from '../constants/noteTypes';
import { useAdminI18n } from '../i18n';

interface NoteTypeSelectProps {
  value?: NoteType;
  onChange: (value: NoteType) => void;
  allowAll?: boolean;
  allLabel?: string;
  className?: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
}

export const NoteTypeSelect: React.FC<NoteTypeSelectProps> = ({
  value,
  onChange,
  allowAll = false,
  allLabel = 'All Types',
  className = '',
  size = 'md',
  disabled = false,
}) => {
  const { getTypeLabel } = useAdminI18n();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedConfig = value ? NOTE_TYPE_CONFIGS[value] : undefined;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown' && !isOpen) {
      e.preventDefault();
      setIsOpen(true);
    } else if (e.key === 'ArrowDown' && isOpen) {
      e.preventDefault();
      const currentIndex = NOTE_TYPE_LIST.findIndex((item) => item.value === value);
      const nextIndex =
        currentIndex === -1 || currentIndex === NOTE_TYPE_LIST.length - 1
          ? 0
          : currentIndex + 1;
      onChange(NOTE_TYPE_LIST[nextIndex].value);
    } else if (e.key === 'ArrowUp' && isOpen) {
      e.preventDefault();
      const currentIndex = NOTE_TYPE_LIST.findIndex((item) => item.value === value);
      const prevIndex =
        currentIndex <= 0
          ? NOTE_TYPE_LIST.length - 1
          : currentIndex - 1;
      onChange(NOTE_TYPE_LIST[prevIndex].value);
    }
  };

  const isSmall = size === 'sm';

  return (
    <div
      ref={containerRef}
      className={`relative inline-block w-full select-none ${className}`}
    >
      {/* Select Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={`w-full flex items-center justify-between gap-2 bg-surface-container-lowest border transition-colors outline-none font-mono text-left cursor-pointer rounded ${
          isOpen
            ? 'border-primary ring-1 ring-primary/40 shadow-sm'
            : 'border-white/10 hover:border-white/20 focus:border-primary focus:ring-1 focus:ring-primary/40'
        } ${
          isSmall
            ? 'px-2.5 py-1 text-xs'
            : 'px-3 py-2 text-xs sm:text-sm'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedConfig ? (
            <>
              <span
                className={`material-symbols-outlined shrink-0 ${
                  isSmall ? 'text-[16px]' : 'text-[18px]'
                } ${selectedConfig.text}`}
              >
                {selectedConfig.icon}
              </span>
              <span className="font-semibold text-on-surface truncate">
                {getTypeLabel(selectedConfig.value)}
              </span>
            </>
          ) : allowAll ? (
            <>
              <span
                className={`material-symbols-outlined shrink-0 ${
                  isSmall ? 'text-[16px]' : 'text-[18px]'
                } text-on-surface-variant`}
              >
                category
              </span>
              <span className="text-on-surface font-semibold truncate">
                {allLabel}
              </span>
            </>
          ) : (
            <span className="text-on-surface-variant/60 font-sans italic truncate">
              —
            </span>
          )}
        </div>

        <span
          className={`material-symbols-outlined shrink-0 text-on-surface-variant transition-transform duration-200 ${
            isSmall ? 'text-[16px]' : 'text-[18px]'
          } ${isOpen ? 'rotate-180 text-primary' : ''}`}
        >
          expand_more
        </span>
      </button>

      {/* Options Dropdown */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-[#1f2020] border border-white/15 rounded-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 min-w-[280px]">
          <div className="max-h-72 overflow-y-auto py-1">
            {allowAll && (
              <div
                onClick={() => {
                  onChange(undefined as any);
                  setIsOpen(false);
                }}
                className={`flex items-center gap-2.5 px-3 py-2 text-xs font-mono cursor-pointer transition-colors ${
                  !value
                    ? 'bg-primary text-on-primary font-semibold'
                    : 'text-on-surface hover:bg-white/5'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[18px] shrink-0 ${
                    !value ? 'text-on-primary' : 'text-on-surface-variant'
                  }`}
                >
                  category
                </span>
                <span className="flex-1 truncate">{allLabel}</span>
              </div>
            )}

            {NOTE_TYPE_LIST.map((item) => {
              const isSelected = value === item.value;
              return (
                <div
                  key={item.value}
                  onClick={() => {
                    onChange(item.value);
                    setIsOpen(false);
                  }}
                  className={`flex items-center gap-2.5 px-3 py-2 text-xs font-mono cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-primary text-on-primary font-semibold'
                      : 'text-on-surface hover:bg-white/5'
                  }`}
                >
                  {/* Icon */}
                  <span
                    className={`material-symbols-outlined text-[18px] shrink-0 ${
                      isSelected ? 'text-on-primary' : item.text
                    }`}
                  >
                    {item.icon}
                  </span>

                  {/* Title */}
                  <div className="flex items-baseline gap-1.5 min-w-0 flex-1">
                    <span
                      className={`font-semibold uppercase tracking-wider shrink-0 ${
                        isSelected ? 'text-on-primary' : 'text-on-surface'
                      }`}
                    >
                      {getTypeLabel(item.value)}
                    </span>
                  </div>

                  {isSelected && (
                    <span className="material-symbols-outlined text-[16px] text-on-primary shrink-0">
                      check
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

