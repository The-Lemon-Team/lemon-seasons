import React, { useState, useRef, useEffect } from 'react';
import { useFolders } from '../api/queries';
import { FolderInputItem, NoteFolder } from '../types';

interface FolderSelectProps {
  // Value can be array of FolderInputItem or NoteFolder
  value: (FolderInputItem | NoteFolder)[];
  onChange: (items: FolderInputItem[]) => void;
  placeholder?: string;
  className?: string;
}

export const FolderSelect: React.FC<FolderSelectProps> = ({
  value,
  onChange,
  placeholder = 'Add or type folder path (e.g. News/Tech)...',
  className = '',
}) => {
  const { data: existingFolders = [] } = useFolders();

  const [inputVal, setInputVal] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize input values to FolderInputItem
  const activeItems: FolderInputItem[] = value
    .map((item, idx) => {
      const path = 'path' in item ? item.path : item.folder?.path || '';
      return {
        path,
        isPrimary: item.isPrimary ?? idx === 0,
        order: item.order ?? idx,
      };
    })
    .filter((item) => Boolean(item.path));

  // Ensure at least one item is primary if activeItems is not empty
  useEffect(() => {
    if (activeItems.length > 0 && !activeItems.some((i) => i.isPrimary)) {
      const updated = activeItems.map((item, idx) => ({
        ...item,
        isPrimary: idx === 0,
      }));
      onChange(updated);
    }
  }, [activeItems.length]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddPath = (rawPath: string) => {
    const clean = rawPath
      .trim()
      .replace(/\\/g, '/')
      .replace(/\/+/g, '/')
      .replace(/^\/|\/$/g, '');

    if (!clean) return;

    if (activeItems.some((i) => i.path.toLowerCase() === clean.toLowerCase())) {
      setInputVal('');
      setIsOpen(false);
      return;
    }

    const isFirst = activeItems.length === 0;
    const next: FolderInputItem[] = [
      ...activeItems,
      {
        path: clean,
        isPrimary: isFirst,
        order: activeItems.length,
      },
    ];
    onChange(next);
    setInputVal('');
    setIsOpen(false);
  };

  const handleRemove = (pathToRemove: string) => {
    const remaining = activeItems.filter((i) => i.path !== pathToRemove);
    if (remaining.length > 0 && !remaining.some((i) => i.isPrimary)) {
      remaining[0].isPrimary = true;
    }
    onChange(remaining);
  };

  const handleSetPrimary = (pathToPrimary: string) => {
    const updated = activeItems.map((item) => ({
      ...item,
      isPrimary: item.path === pathToPrimary,
    }));
    onChange(updated);
  };

  const filteredSuggestions = existingFolders.filter((f) => {
    const matchesQuery = inputVal
      ? f.path.toLowerCase().includes(inputVal.toLowerCase()) ||
        f.name.toLowerCase().includes(inputVal.toLowerCase())
      : true;
    const notAlreadySelected = !activeItems.some(
      (item) => item.path.toLowerCase() === f.path.toLowerCase(),
    );
    return matchesQuery && notAlreadySelected;
  });

  const exactMatchExists = existingFolders.some(
    (f) => f.path.toLowerCase() === inputVal.trim().toLowerCase(),
  );

  return (
    <div ref={containerRef} className={`space-y-2.5 ${className}`}>
      {/* Active Folder Badges Tray */}
      {activeItems.length > 0 && (
        <div className="space-y-1.5 p-2.5 bg-surface-container-lowest/80 border border-white/10 rounded-lg">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase text-on-surface-variant tracking-wider">
            <span>Assigned Folders ({activeItems.length})</span>
            <span className="text-[9px] text-primary/80 lowercase">
              ★ star marks primary physical location
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {activeItems.map((item) => (
              <div
                key={item.path}
                className={`inline-flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-full text-xs font-mono border transition-all ${
                  item.isPrimary
                    ? 'bg-primary/20 text-primary border-primary/50 shadow-sm font-semibold'
                    : 'bg-surface-container-high text-on-surface border-white/10'
                }`}
              >
                {/* Primary toggle button */}
                <button
                  type="button"
                  onClick={() => handleSetPrimary(item.path)}
                  className={`p-0.5 rounded-full hover:scale-110 transition-transform cursor-pointer ${
                    item.isPrimary
                      ? 'text-primary font-bold'
                      : 'text-on-surface-variant/40 hover:text-primary'
                  }`}
                  title={
                    item.isPrimary
                      ? 'Primary Physical Location in Obsidian'
                      : 'Click to make Primary Location'
                  }
                >
                  <span className="material-symbols-outlined text-[15px] leading-none">
                    {item.isPrimary ? 'star' : 'star_border'}
                  </span>
                </button>

                <span className="truncate max-w-[200px]" title={item.path}>
                  {item.path}
                </span>

                {item.isPrimary && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-primary text-on-primary font-sans uppercase font-bold tracking-tight">
                    Primary
                  </span>
                )}

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => handleRemove(item.path)}
                  className="p-0.5 hover:bg-white/10 rounded-full text-on-surface-variant hover:text-error transition-colors flex items-center justify-center cursor-pointer ml-0.5"
                  title="Remove from folder"
                >
                  <span className="material-symbols-outlined text-[13px] leading-none">
                    close
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input / Combobox */}
      <div className="relative">
        <div className="flex items-center relative">
          <span className="material-symbols-outlined absolute left-2.5 text-on-surface-variant/60 text-[16px] pointer-events-none select-none">
            folder
          </span>
          <input
            type="text"
            value={inputVal}
            onChange={(e) => {
              setInputVal(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (inputVal.trim()) {
                  handleAddPath(inputVal.trim());
                }
              }
            }}
            placeholder={placeholder}
            className="w-full bg-surface-container-lowest border border-white/10 rounded pl-8 pr-8 py-1.5 text-on-surface font-mono text-xs placeholder:text-on-surface-variant/40 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
          />
          {inputVal && (
            <button
              type="button"
              onClick={() => handleAddPath(inputVal)}
              className="absolute right-2 text-primary hover:text-primary-fixed-dim font-mono text-xs px-1.5 py-0.5 rounded hover:bg-primary/10 transition-colors cursor-pointer"
              title="Add folder"
            >
              Add
            </button>
          )}
        </div>

        {/* Autocomplete Dropdown */}
        {isOpen && (
          <div className="absolute z-50 left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-surface-container-high border border-white/10 rounded-lg shadow-xl divide-y divide-white/5 py-1">
            {inputVal.trim() && !exactMatchExists && (
              <button
                type="button"
                onClick={() => handleAddPath(inputVal)}
                className="w-full px-3 py-2 text-left hover:bg-primary/20 text-xs font-mono text-primary flex items-center gap-2 cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">create_new_folder</span>
                <span>
                  Create new folder path: <strong>&ldquo;{inputVal.trim()}&rdquo;</strong>
                </span>
              </button>
            )}

            {filteredSuggestions.length > 0 ? (
              filteredSuggestions.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handleAddPath(f.path)}
                  className="w-full px-3 py-1.5 text-left hover:bg-white/5 text-xs font-mono text-on-surface flex items-center justify-between group cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="material-symbols-outlined text-[15px] text-primary/70 group-hover:text-primary">
                      {f.icon || 'folder'}
                    </span>
                    <span className="truncate">{f.path}</span>
                    {f.name && f.name.toLowerCase() !== f.path.toLowerCase() && (
                      <span className="text-[10px] text-on-surface-variant/60 font-sans">
                        ({f.name})
                      </span>
                    )}
                  </div>
                  {f._count?.noteFolders !== undefined && (
                    <span className="text-[10px] text-on-surface-variant/60 font-mono">
                      {f._count.noteFolders} notes
                    </span>
                  )}
                </button>
              ))
            ) : !inputVal.trim() ? (
              <div className="px-3 py-2 text-xs font-mono text-on-surface-variant/50 text-center">
                Type to add a new folder or select from above
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};
