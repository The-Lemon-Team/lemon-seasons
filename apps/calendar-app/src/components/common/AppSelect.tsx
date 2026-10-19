import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

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
      setIsOpen((prev) => !prev);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
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
        setIsOpen(true);
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
          : 'border-[#2d3030] hover:border-white/20 bg-white/5 text-neutral-400';
      case 'default':
      default:
        return isOpen
          ? 'border-[#c9cd58] ring-1 ring-[#c9cd58]/40 bg-[#121414] text-[#e2e2e2]'
          : 'border-[#2d3030] hover:border-[#484837] bg-[#121414] text-[#e2e2e2]';
    }
  };

  const getChevronColor = () => {
    if (variant === 'emerald') return 'text-emerald-400';
    if (variant === 'amber') return 'text-amber-400';
    if (variant === 'muted') return 'text-neutral-400';
    return isOpen ? 'text-[#c9cd58]' : 'text-[#93927e]';
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
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={`w-full flex items-center justify-between gap-2 border rounded-lg font-mono text-left cursor-pointer outline-none transition-colors ${
          isSmall ? 'h-8 px-2.5 text-xs' : 'h-10 px-3 text-xs'
        } ${getVariantStyles()} ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${triggerClassName}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
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
          className={`shrink-0 w-4 h-4 transition-transform duration-200 ${getChevronColor()} ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute z-50 left-0 right-0 mt-1.5 bg-[#181a1a] border border-[#323636] rounded-lg shadow-2xl overflow-hidden min-w-[200px] max-h-60 overflow-y-auto p-1 animate-in fade-in zoom-in-95 duration-100 ${menuClassName}`}
        >
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
                className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-md text-xs font-mono transition-colors ${
                  opt.disabled
                    ? 'opacity-40 cursor-not-allowed text-[#93927e]'
                    : isSelected
                    ? 'bg-[#c9cd58]/20 text-[#e5e971] font-semibold cursor-pointer'
                    : 'text-[#e2e2e2] hover:bg-white/5 cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {opt.icon && (
                    <span className="shrink-0 flex items-center justify-center">
                      {opt.icon}
                    </span>
                  )}
                  <span className="truncate">{opt.label}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {opt.badge && <span>{opt.badge}</span>}
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-[#c9cd58] shrink-0" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
