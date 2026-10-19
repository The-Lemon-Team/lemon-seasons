import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Layers, Pin, CalendarRange, Calendar, Film, AtSign, CheckCircle2, Tag } from 'lucide-react';
import { NoteType } from '../types';
import { NOTE_TYPE_CONFIGS, NOTE_TYPE_LIST } from '../constants/noteTypes';
import { useAdminI18n } from '../i18n';
import { useDropdownPlacement } from '../hooks/useDropdownPlacement';

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  SINGLE: Pin,
  PERIOD: CalendarRange,
  EVENT: Calendar,
  FILM_RELEASE: Film,
  MENTION: AtSign,
  DONE: CheckCircle2,
};

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
  const isSmall = size === 'sm';

  const { openUpward, maxHeight, updatePosition } = useDropdownPlacement(
    containerRef,
    isOpen,
    { dependencies: [NOTE_TYPE_LIST.length], maxHeight: 260 },
  );

  const toggleOpen = () => {
    if (disabled) return;
    updatePosition();
    setIsOpen((prev) => !prev);
  };

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
      toggleOpen();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        toggleOpen();
        return;
      }
      const currentIndex = NOTE_TYPE_LIST.findIndex((item) => item.value === value);
      const nextIndex =
        currentIndex === -1 || currentIndex === NOTE_TYPE_LIST.length - 1
          ? 0
          : currentIndex + 1;
      onChange(NOTE_TYPE_LIST[nextIndex].value);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        toggleOpen();
        return;
      }
      const currentIndex = NOTE_TYPE_LIST.findIndex((item) => item.value === value);
      const prevIndex =
        currentIndex <= 0
          ? NOTE_TYPE_LIST.length - 1
          : currentIndex - 1;
      onChange(NOTE_TYPE_LIST[prevIndex].value);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-block w-full select-none ${className}`}
    >
      {/* Select Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={toggleOpen}
        onKeyDown={handleKeyDown}
        className={`w-full flex items-center justify-between gap-1.5 border transition-all outline-none font-mono text-left cursor-pointer ${
          isOpen
            ? 'border-primary ring-1 ring-primary/30 bg-control text-on-surface shadow-xs'
            : 'border-control-border hover:border-tile-border bg-control text-on-surface'
        } ${
          isSmall
            ? 'h-6.5 px-2 text-[11px] rounded-lg'
            : 'h-7.5 px-2.5 text-xs rounded-lg'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {selectedConfig ? (
            <>
              {(() => {
                const Icon = TYPE_ICONS[selectedConfig.value] || Tag;
                return (
                  <Icon
                    className={`shrink-0 ${
                      isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'
                    } ${selectedConfig.text}`}
                  />
                );
              })()}
              <span className="font-semibold text-on-surface truncate">
                {getTypeLabel(selectedConfig.value)}
              </span>
            </>
          ) : allowAll ? (
            <>
              <Layers
                className={`shrink-0 ${
                  isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'
                } text-on-surface-variant/70`}
              />
              <span className="text-on-surface truncate">
                {allLabel}
              </span>
            </>
          ) : (
            <span className="text-on-surface-variant/60 font-sans italic truncate">
              —
            </span>
          )}
        </div>

        <ChevronDown
          className={`shrink-0 transition-transform duration-200 ${
            isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'
          } ${
            isOpen ? 'rotate-180 text-primary' : 'text-on-surface-variant/70'
          }`}
        />
      </button>

      {/* Options Dropdown */}
      {isOpen && (
        <div
          style={{ maxHeight: `${maxHeight}px` }}
          className={`absolute z-50 left-0 bg-panel border border-tile-border shadow-tile-hover overflow-hidden animate-in fade-in zoom-in-95 duration-100 ${
            isSmall
              ? 'min-w-[180px] p-1 rounded-lg text-[11px]'
              : 'min-w-[200px] p-1 rounded-lg text-xs'
          } ${openUpward ? 'bottom-full mb-1' : 'top-full mt-1'}`}
        >
          <div className="overflow-y-auto max-h-[inherit] space-y-0.5">
            {allowAll && (
              <div
                onClick={() => {
                  onChange(undefined as any);
                  setIsOpen(false);
                }}
                className={`flex items-center cursor-pointer transition-colors ${
                  isSmall
                    ? 'gap-1.5 px-1.5 py-1 rounded text-[11px]'
                    : 'gap-2 px-2 py-1.5 rounded-md text-xs'
                } font-mono ${
                  !value
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-on-surface hover:bg-tile-subtle'
                }`}
              >
                <Layers
                  className={`shrink-0 ${
                    isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'
                  } ${!value ? 'text-primary' : 'text-on-surface-variant'}`}
                />
                <span className="flex-1 truncate">{allLabel}</span>
                {!value && (
                  <Check
                    className={`shrink-0 text-primary ${
                      isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'
                    }`}
                  />
                )}
              </div>
            )}

            {NOTE_TYPE_LIST.map((item) => {
              const isSelected = value === item.value;
              const Icon = TYPE_ICONS[item.value] || Tag;
              return (
                <div
                  key={item.value}
                  onClick={() => {
                    onChange(item.value);
                    setIsOpen(false);
                  }}
                  className={`flex items-center cursor-pointer transition-colors ${
                    isSmall
                      ? 'gap-1.5 px-1.5 py-1 rounded text-[11px]'
                      : 'gap-2 px-2 py-1.5 rounded-md text-xs'
                  } font-mono ${
                    isSelected
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-on-surface hover:bg-tile-subtle'
                  }`}
                >
                  {/* Icon */}
                  <Icon
                    className={`shrink-0 ${
                      isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'
                    } ${isSelected ? 'text-primary' : item.text}`}
                  />

                  {/* Title */}
                  <div className="flex items-baseline gap-1.5 min-w-0 flex-1">
                    <span
                      className={`font-semibold uppercase tracking-wide truncate ${
                        isSelected ? 'text-on-primary' : 'text-on-surface'
                      }`}
                    >
                      {getTypeLabel(item.value)}
                    </span>
                  </div>

                  {isSelected && (
                    <Check
                      className={`shrink-0 text-on-primary ${
                        isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'
                      }`}
                    />
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


