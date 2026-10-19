import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useDropdownPlacement } from '../../hooks/useDropdownPlacement';

export interface AppSelectOption<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  description?: string;
  disabled?: boolean;
}

export interface AppSelectProps<T extends string = string> {
  value?: T;
  onChange: (value: T) => void;
  options: AppSelectOption<T>[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  variant?: 'default' | 'emerald' | 'amber' | 'muted';
  triggerClassName?: string;
  menuClassName?: string;
  'aria-label'?: string;
}

export function AppSelect<T extends string = string>({
  value,
  onChange,
  options,
  placeholder = '—',
  className = '',
  disabled = false,
  size = 'md',
  variant = 'default',
  triggerClassName = '',
  menuClassName = '',
  'aria-label': ariaLabel,
}: AppSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { openUpward, maxHeight, updatePosition } = useDropdownPlacement(
    containerRef,
    isOpen,
    { dependencies: [options.length], maxHeight: 240 },
  );

  const toggleOpen = () => {
    updatePosition();
    setIsOpen((prev) => !prev);
  };

  const selectedOption = options.find((opt) => opt.value === value);

  // Close dropdown on outside click
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

  // Keyboard navigation
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
      const enabledOptions = options.filter((o) => !o.disabled);
      const currentIndex = enabledOptions.findIndex((o) => o.value === value);
      const nextIndex =
        currentIndex === -1 || currentIndex === enabledOptions.length - 1
          ? 0
          : currentIndex + 1;
      onChange(enabledOptions[nextIndex].value);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        toggleOpen();
        return;
      }
      const enabledOptions = options.filter((o) => !o.disabled);
      const currentIndex = enabledOptions.findIndex((o) => o.value === value);
      const prevIndex =
        currentIndex <= 0
          ? enabledOptions.length - 1
          : currentIndex - 1;
      onChange(enabledOptions[prevIndex].value);
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'emerald':
        return isOpen
          ? 'border-emerald-400 ring-1 ring-emerald-400/40 bg-emerald-950/30 text-emerald-300'
          : 'border-emerald-500/40 hover:border-emerald-500/70 bg-emerald-950/20 text-emerald-400 font-semibold';
      case 'amber':
        return isOpen
          ? 'border-amber-400 ring-1 ring-amber-400/40 bg-amber-950/30 text-amber-300'
          : 'border-amber-500/40 hover:border-amber-500/70 bg-amber-950/20 text-amber-400 font-semibold';
      case 'muted':
        return isOpen
          ? 'border-white/30 ring-1 ring-white/20 bg-white/10 text-neutral-300'
          : 'border-white/10 hover:border-white/20 bg-white/5 text-neutral-400';
      case 'default':
      default:
        return isOpen
          ? 'border-primary ring-1 ring-primary/40 bg-surface-container-lowest text-on-surface'
          : 'border-white/10 hover:border-white/20 bg-surface-container-lowest text-on-surface';
    }
  };

  const getChevronColor = () => {
    if (variant === 'emerald') return 'text-emerald-400';
    if (variant === 'amber') return 'text-amber-400';
    if (variant === 'muted') return 'text-neutral-400';
    return isOpen ? 'text-primary' : 'text-on-surface-variant';
  };

  const isSmall = size === 'sm';

  return (
    <div
      ref={containerRef}
      className={`relative inline-block w-full select-none ${className}`}
    >
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        onClick={toggleOpen}
        onKeyDown={handleKeyDown}
        className={`w-full flex items-center justify-between gap-1.5 border font-mono text-left cursor-pointer outline-none transition-colors ${
          isSmall ? 'h-7 px-2 text-[11px] rounded' : 'h-9 px-2.5 text-xs rounded-md'
        } ${getVariantStyles()} ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${triggerClassName}`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {selectedOption?.icon && (
            <span className="shrink-0 flex items-center justify-center">
              {selectedOption.icon}
            </span>
          )}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span className="shrink-0 ml-auto mr-1">
              {selectedOption.badge}
            </span>
          )}
        </div>

        <ChevronDown
          className={`shrink-0 transition-transform duration-200 ${
            isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'
          } ${getChevronColor()} ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          style={{ maxHeight: `${maxHeight}px` }}
          className={`absolute z-50 left-0 bg-[#1a1b1b] border border-white/15 shadow-2xl overflow-hidden overflow-y-auto animate-in fade-in zoom-in-95 duration-100 ${
            isSmall
              ? 'min-w-[190px] p-0.5 rounded-md text-[11px]'
              : 'min-w-[200px] p-1 rounded-lg text-xs'
          } ${
            openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
          } ${menuClassName}`}
        >
          <div className="space-y-0.5">
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <div
                  key={opt.value}
                  onClick={() => {
                    if (opt.disabled) return;
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between transition-colors ${
                    isSmall
                      ? 'gap-1.5 px-2 py-1 rounded text-[11px]'
                      : 'gap-2 px-2.5 py-1.5 rounded-md text-xs'
                  } font-mono ${
                    opt.disabled
                      ? 'opacity-40 cursor-not-allowed text-on-surface-variant'
                      : isSelected
                      ? 'bg-primary/15 text-primary font-semibold cursor-pointer'
                      : 'text-on-surface hover:bg-white/5 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {opt.icon && (
                      <span className="shrink-0 flex items-center justify-center">
                        {opt.icon}
                      </span>
                    )}
                    <span className="truncate">{opt.label}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {opt.badge && <span>{opt.badge}</span>}
                    {isSelected && (
                      <Check
                        className={`text-primary shrink-0 ${
                          isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'
                        }`}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
