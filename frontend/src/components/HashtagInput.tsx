import React, { useState, useRef, useEffect } from 'react';
import { useHashtags } from '../api/queries';
import { HashtagBadge } from './HashtagBadge';

interface HashtagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  label?: string;
}

export const HashtagInput: React.FC<HashtagInputProps> = ({
  value = [],
  onChange,
  placeholder = 'Add hashtag... (press Enter)',
  maxTags,
  label = 'Hashtags / Global Mentions',
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: allHashtags = [] } = useHashtags(false);

  const normalizeTag = (tag: string) => {
    return tag
      .trim()
      .replace(/^#+/, '')
      .toLowerCase()
      .replace(/[^a-z0-9_\-]/g, '');
  };

  const cleanInput = normalizeTag(inputValue);

  // Filter available suggestions that aren't already selected
  const suggestions = allHashtags
    .filter((h) => !value.map((v) => normalizeTag(v)).includes(h.name))
    .filter((h) => (!cleanInput ? true : h.name.includes(cleanInput)))
    .slice(0, 8);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addTag = (rawTag: string) => {
    const clean = normalizeTag(rawTag);
    if (!clean) return;
    if (maxTags && value.length >= maxTags) return;

    const normalizedCurrent = value.map((t) => normalizeTag(t));
    if (!normalizedCurrent.includes(clean)) {
      onChange([...value, clean]);
    }
    setInputValue('');
  };

  const removeTag = (tagToRemove: string) => {
    const clean = normalizeTag(tagToRemove);
    onChange(value.filter((t) => normalizeTag(t) !== clean));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
      if (inputValue.trim()) {
        e.preventDefault();
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      // Remove last tag if input is empty
      removeTag(value[value.length - 1]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="space-y-1.5 w-full relative">
      {label && (
        <div className="flex items-center justify-between">
          <label className="block font-mono text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
            {label}
          </label>
          {value.length > 0 && (
            <span className="text-[10px] font-mono text-cyan-400/80">
              {value.length} {value.length === 1 ? 'hashtag' : 'hashtags'}
            </span>
          )}
        </div>
      )}

      {/* Main Tag Input Container */}
      <div
        onClick={() => {
          inputRef.current?.focus();
          setIsOpen(true);
        }}
        className="min-h-[38px] p-1.5 bg-surface-container-lowest border border-white/10 rounded-md focus-within:border-cyan-500/80 focus-within:ring-1 focus-within:ring-cyan-500/40 flex flex-wrap items-center gap-1.5 cursor-text transition-all"
      >
        {/* Render Selected Tag Badges */}
        {value.map((tag) => (
          <HashtagBadge
            key={tag}
            name={tag}
            size="sm"
            onRemove={(t) => removeTag(t)}
          />
        ))}

        {/* Input Field */}
        <div className="flex-1 min-w-[120px] flex items-center gap-1">
          <span className="text-cyan-500/60 font-mono text-xs select-none pl-1">#</span>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={value.length === 0 ? placeholder : 'Add another...'}
            className="w-full bg-transparent border-none text-on-surface font-mono text-xs focus:outline-none focus:ring-0 placeholder:text-on-surface-variant/40 p-0"
          />
        </div>
      </div>

      {/* Autocomplete Suggestions Popover */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-surface-container border border-cyan-800/40 rounded-md shadow-2xl p-2 z-50 max-h-48 overflow-y-auto space-y-1 backdrop-blur-md">
          <div className="text-[10px] font-mono text-cyan-400/70 uppercase tracking-wider px-1 pb-1 border-b border-white/5 flex items-center justify-between">
            <span>Existing Suggestions</span>
            <span className="text-outline text-[9px]">Click or Enter</span>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {suggestions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  addTag(item.name);
                  setIsOpen(false);
                }}
                className="group flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[11px] bg-surface-container-high hover:bg-cyan-950/60 text-on-surface-variant hover:text-cyan-300 border border-white/5 hover:border-cyan-700/50 transition-all cursor-pointer text-left"
              >
                <span className="text-cyan-500/70 group-hover:text-cyan-400 font-semibold">#</span>
                <span>{item.name}</span>
                {item._count?.notes !== undefined && item._count.notes > 0 && (
                  <span className="text-[9px] font-mono text-outline group-hover:text-cyan-400/70">
                    ({item._count.notes})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
