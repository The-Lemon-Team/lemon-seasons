import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ObsidianContainer } from '@lenta/shared';
import {
  Search,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Lock,
  Globe,
  FolderTree,
  Folder,
  Minus,
} from 'lucide-react';
import { useObsidianContainers } from '../context/ObsidianContainersContext';
import { ObsidianLogo } from './ObsidianLogo';
import { useI18n } from '../i18n';

interface ObsidianSelectorProps {
  selectedContainers?: string[];
  selectedObsidianFolders?: string[];
  onToggleContainer?: (containerId: string) => void;
  onSelectOnlyContainer?: (containerId: string) => void;
  onClearContainers?: () => void;
  onSetAllContainers?: (containers: string[]) => void;
  onToggleObsidianFolder?: (folderKey: string) => void;
  onSelectOnlyObsidianFolder?: (folderKey: string) => void;
  onSetObsidianFolders?: (folders: string[]) => void;
  onClearObsidianFolders?: () => void;
  containers?: ObsidianContainer[];
}

export const ObsidianSelector: React.FC<ObsidianSelectorProps> = ({
  selectedContainers = [],
  selectedObsidianFolders = [],
  onToggleContainer,
  onSelectOnlyContainer,
  onClearContainers,
  onSetAllContainers,
  onToggleObsidianFolder,
  onSelectOnlyObsidianFolder,
  onSetObsidianFolders,
  onClearObsidianFolders,
  containers: propContainers,
}) => {
  const { t } = useI18n();
  const context = useObsidianContainers();
  const allContainers = propContainers || context.containers || [];

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedContainers, setExpandedContainers] = useState<Record<string, boolean>>({});

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const activeCount = selectedContainers.length;

  // Close dropdown on click outside or escape
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

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Filtered containers list
  const filteredContainers = useMemo(() => {
    if (!searchQuery.trim()) return allContainers;
    const q = searchQuery.toLowerCase();
    return allContainers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.vaultPath && c.vaultPath.toLowerCase().includes(q)) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        c.boundFolders.some(
          (f) =>
            f.path.toLowerCase().includes(q) || (f.name && f.name.toLowerCase().includes(q))
        )
    );
  }, [allContainers, searchQuery]);

  // Helper to check folder keys for a container
  const getContainerFolderState = (container: ObsidianContainer) => {
    const isContainerSelected = selectedContainers.includes(container.id);
    const boundFolders = container.boundFolders || [];

    if (!isContainerSelected || boundFolders.length === 0) {
      return { isContainerSelected: false, selectedFolderKeys: [], isAllFolders: false, isPartial: false };
    }

    // Find all folder keys selected for this container
    const explicitKeys = boundFolders
      .map((f) => `${container.id}::${f.path}`)
      .filter((key) => selectedObsidianFolders.includes(key) || selectedObsidianFolders.includes(key.split('::')[1]));

    const hasExplicitKeys = explicitKeys.length > 0;
    const activeKeys = hasExplicitKeys
      ? explicitKeys
      : boundFolders.map((f) => `${container.id}::${f.path}`);

    const isAllFolders = !hasExplicitKeys || activeKeys.length === boundFolders.length;
    const isPartial = hasExplicitKeys && activeKeys.length > 0 && activeKeys.length < boundFolders.length;

    return {
      isContainerSelected: true,
      selectedFolderKeys: activeKeys,
      isAllFolders,
      isPartial,
    };
  };

  // Toggle all folders of a container when container is toggled
  const handleToggleContainerCard = (container: ObsidianContainer) => {
    const isSelected = selectedContainers.includes(container.id);
    const boundFolderKeys = (container.boundFolders || []).map((f) => `${container.id}::${f.path}`);

    if (isSelected) {
      // Unselect container & remove all its folder keys from selectedObsidianFolders
      if (onToggleContainer) onToggleContainer(container.id);
      if (onSetObsidianFolders) {
        const next = selectedObsidianFolders.filter(
          (k) => !boundFolderKeys.includes(k) && !boundFolderKeys.some((bk) => bk.endsWith(`::${k}`))
        );
        onSetObsidianFolders(next);
      }
    } else {
      // Select container & add all its folder keys
      if (onToggleContainer) onToggleContainer(container.id);
      if (onSetObsidianFolders && boundFolderKeys.length > 0) {
        const next = Array.from(new Set([...selectedObsidianFolders, ...boundFolderKeys]));
        onSetObsidianFolders(next);
      }
    }
  };

  // Toggle an individual bound folder inside a container
  const handleToggleFolder = (container: ObsidianContainer, folderPath: string) => {
    const folderKey = `${container.id}::${folderPath}`;
    const isContainerSelected = selectedContainers.includes(container.id);
    const boundFolders = container.boundFolders || [];
    const boundFolderKeys = boundFolders.map((f) => `${container.id}::${f.path}`);

    const { selectedFolderKeys } = getContainerFolderState(container);
    const isFolderActive = selectedFolderKeys.includes(folderKey) || selectedObsidianFolders.includes(folderPath);

    if (!isContainerSelected) {
      // Container not selected yet -> select container & select this folder
      if (onToggleContainer) onToggleContainer(container.id);
      if (onSetObsidianFolders) {
        onSetObsidianFolders([...selectedObsidianFolders, folderKey]);
      }
      return;
    }

    // Container IS selected
    let nextContainerFolderKeys: string[] = [];
    if (isFolderActive) {
      // Remove folder
      nextContainerFolderKeys = selectedFolderKeys.filter(
        (k) => k !== folderKey && k !== folderPath && !k.endsWith(`::${folderPath}`)
      );
    } else {
      // Add folder
      nextContainerFolderKeys = Array.from(new Set([...selectedFolderKeys, folderKey]));
    }

    if (nextContainerFolderKeys.length === 0) {
      // All folders turned off -> deselect container
      if (onToggleContainer) onToggleContainer(container.id);
      if (onSetObsidianFolders) {
        const nextAll = selectedObsidianFolders.filter(
          (k) => !boundFolderKeys.includes(k) && !boundFolderKeys.some((bk) => bk.endsWith(`::${k}`))
        );
        onSetObsidianFolders(nextAll);
      }
    } else {
      // Update selectedObsidianFolders
      if (onSetObsidianFolders) {
        const otherContainersKeys = selectedObsidianFolders.filter(
          (k) => !boundFolderKeys.includes(k) && !boundFolderKeys.some((bk) => bk.endsWith(`::${k}`))
        );
        onSetObsidianFolders([...otherContainersKeys, ...nextContainerFolderKeys]);
      }
    }
  };

  // Toggle container expand state
  const toggleExpand = (containerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedContainers((prev) => ({ ...prev, [containerId]: !prev[containerId] }));
  };

  // Trigger button label summary
  const getTriggerLabel = () => {
    if (activeCount === 0) {
      return t.allObsidianVaults || 'Все Vaults';
    }
    if (activeCount === 1) {
      const match = allContainers.find((c) => c.id === selectedContainers[0]);
      if (match) {
        const { isPartial, selectedFolderKeys } = getContainerFolderState(match);
        if (isPartial) {
          return `${match.name} (${selectedFolderKeys.length}/${match.boundFolders.length})`;
        }
        return match.name;
      }
      return '1 Vault';
    }
    return `Obsidian (${activeCount})`;
  };

  return (
    <div className="relative inline-flex items-center" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        type="button"
        className={`flex items-center gap-1.5 px-2.5 h-7 rounded-lg text-xs font-mono transition-all duration-150 border relative select-none shrink-0 ${
          activeCount > 0
            ? 'bg-[#1f1a2e] border-[#a855f7]/70 text-[#e9d5ff] shadow-[0_0_12px_rgba(168,85,247,0.25)] font-medium'
            : 'bg-[#121414] border-[#242828] text-neutral-300 hover:text-white hover:bg-[#1a1c1c] hover:border-[#333535]'
        }`}
        title={t.obsidianVaults || 'Контейнеры Obsidian'}
      >
        <ObsidianLogo size={14} glow={activeCount > 0} />

        <span className="truncate max-w-[130px] sm:max-w-[160px]">{getTriggerLabel()}</span>

        {activeCount > 0 && (
          <span className="min-w-[16px] h-4 px-1 rounded-full bg-[#a855f7] text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {activeCount}
          </span>
        )}

        <ChevronDown
          className={`w-3.5 h-3.5 ml-0.5 text-neutral-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#a855f7]' : ''
          }`}
        />
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-80 sm:w-96 bg-[#141518]/95 backdrop-blur-md border border-[#2b2d35] rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.6)] p-3 text-xs font-mono overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-[#252830]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#a855f7]/20 border border-[#a855f7]/40 flex items-center justify-center text-[#d8b4fe]">
                <ObsidianLogo size={14} />
              </div>
              <span className="font-bold text-white text-xs tracking-wide">
                {t.obsidianVaults || 'Контейнеры Obsidian'}
              </span>
            </div>

            {activeCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (onClearContainers) onClearContainers();
                  if (onClearObsidianFolders) onClearObsidianFolders();
                }}
                className="flex items-center gap-1 text-[11px] font-mono text-[#d8b4fe] hover:text-white bg-[#a855f7]/20 hover:bg-[#a855f7]/30 px-2 py-0.5 rounded-md transition-colors"
                title="Сбросить выбор контейнеров и папок"
              >
                <X className="w-3 h-3" />
                <span>Clear ({activeCount})</span>
              </button>
            )}
          </div>

          {/* Quick Preset Action: All Vaults */}
          <div className="mb-2">
            <button
              type="button"
              onClick={() => {
                if (onClearContainers) onClearContainers();
                if (onClearObsidianFolders) onClearObsidianFolders();
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-xs transition-all ${
                activeCount === 0
                  ? 'bg-[#1f1a2e] border-[#a855f7]/60 text-[#e9d5ff] font-semibold'
                  : 'bg-[#17191d] border-[#252830] text-neutral-300 hover:text-white hover:bg-[#1e2127]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#a855f7]" />
                <span>{t.allObsidianVaults || 'Все Vaults (Показывать все)'}</span>
              </div>
              {activeCount === 0 && <Check className="w-3.5 h-3.5 text-[#a855f7]" />}
            </button>
          </div>

          {/* Search Box */}
          {allContainers.length > 2 && (
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchObsidianContainers || 'Поиск контейнеров...'}
                className="w-full bg-[#181a1f] border border-[#272a33] rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#a855f7] transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Container & Folders List */}
          <div className="max-h-72 overflow-y-auto space-y-1.5 pr-0.5 custom-scrollbar">
            {filteredContainers.length === 0 ? (
              <div className="p-4 text-center text-neutral-500 italic text-[11px]">
                {allContainers.length === 0
                  ? t.noObsidianContainers || 'Нет подключенных контейнеров Obsidian'
                  : 'Контейнеры не найдены'}
              </div>
            ) : (
              filteredContainers.map((container) => {
                const isSelected = selectedContainers.includes(container.id);
                const isPrivate = container.privacy === 'private';
                const boundFolders = container.boundFolders || [];
                const isExpanded = expandedContainers[container.id] ?? (boundFolders.length > 0 && isSelected);

                const { isPartial, selectedFolderKeys } = getContainerFolderState(container);

                return (
                  <div
                    key={container.id}
                    className={`rounded-xl border transition-all overflow-hidden ${
                      isSelected
                        ? 'bg-[#1b1728] border-[#a855f7]/60 text-[#e9d5ff]'
                        : 'bg-[#17191d] border-[#252830] text-neutral-300 hover:border-[#3b3e49]'
                    }`}
                  >
                    {/* Container Main Card Header */}
                    <div
                      className="flex items-center justify-between p-2 cursor-pointer select-none group"
                      onClick={() => handleToggleContainerCard(container)}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {/* Folder tree expand toggle chevron */}
                        {boundFolders.length > 0 ? (
                          <button
                            type="button"
                            onClick={(e) => toggleExpand(container.id, e)}
                            className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-[#252830] transition-colors shrink-0"
                            title={isExpanded ? 'Свернуть папки' : 'Развернуть папки'}
                          >
                            <ChevronRight
                              className={`w-3.5 h-3.5 transition-transform duration-150 ${
                                isExpanded ? 'rotate-90 text-[#a855f7]' : ''
                              }`}
                            />
                          </button>
                        ) : (
                          <div className="w-5 shrink-0" />
                        )}

                        {/* Checkbox indicator (full vs partial vs none) */}
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                            isSelected
                              ? 'bg-[#a855f7] border-[#a855f7] text-white'
                              : 'border-neutral-600 bg-[#121417] group-hover:border-neutral-400'
                          }`}
                        >
                          {isSelected && !isPartial && <Check className="w-3 h-3 stroke-[3]" />}
                          {isSelected && isPartial && <Minus className="w-3 h-3 stroke-[3]" />}
                        </div>

                        {/* Obsidian Logo Icon */}
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center border shrink-0 ${
                            isSelected
                              ? 'bg-[#a855f7]/25 border-[#a855f7]/50'
                              : 'bg-[#1a1c22] border-[#2d303a]'
                          }`}
                        >
                          <ObsidianLogo size={14} />
                        </div>

                        {/* Title & Vault Path */}
                        <div className="min-w-0 flex-1 leading-tight">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-xs truncate">{container.name}</span>
                            {isPrivate ? (
                              <span
                                className="px-1 py-0.5 rounded bg-[#a855f7]/20 text-[#d8b4fe] text-[9px] flex items-center gap-0.5 shrink-0"
                                title="Private Vault"
                              >
                                <Lock className="w-2.5 h-2.5" />
                                Priv
                              </span>
                            ) : (
                              <span
                                className="px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] flex items-center gap-0.5 shrink-0"
                                title="Public Vault"
                              >
                                <Globe className="w-2.5 h-2.5" />
                                Pub
                              </span>
                            )}
                          </div>
                          {container.vaultPath && (
                            <div className="text-[10px] text-neutral-400 truncate mt-0.5 font-mono">
                              {container.vaultPath}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right side: Folder count & Only button */}
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        {boundFolders.length > 0 && (
                          <span
                            onClick={(e) => toggleExpand(container.id, e)}
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-colors ${
                              isPartial
                                ? 'bg-[#a855f7]/30 text-[#e9d5ff] font-medium border border-[#a855f7]/40'
                                : 'bg-[#252830] text-neutral-300 hover:text-white'
                            }`}
                            title="Нажмите, чтобы развернуть список папок"
                          >
                            <FolderTree className="w-2.5 h-2.5 text-[#a855f7]" />
                            {isPartial
                              ? `${selectedFolderKeys.length}/${boundFolders.length}`
                              : `${boundFolders.length}`}
                          </span>
                        )}

                        {onSelectOnlyContainer && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectOnlyContainer(container.id);
                              if (onClearObsidianFolders) onClearObsidianFolders();
                            }}
                            className="opacity-0 group-hover:opacity-100 text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#a855f7]/20 text-[#d8b4fe] hover:bg-[#a855f7] hover:text-white transition-all ml-1"
                            title="Выбрать только этот контейнер"
                          >
                            Only
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Subfolders Tree List (Expanded State) */}
                    {isExpanded && boundFolders.length > 0 && (
                      <div className="bg-[#121418]/80 border-t border-[#252830] p-1.5 space-y-1">
                        <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider px-2 py-0.5 flex items-center justify-between">
                          <span>Папки Vault:</span>
                          {isPartial && (
                            <button
                              type="button"
                              onClick={() => {
                                const allKeys = boundFolders.map((f) => `${container.id}::${f.path}`);
                                const other = selectedObsidianFolders.filter(
                                  (k) => !allKeys.includes(k) && !allKeys.some((bk) => bk.endsWith(`::${k}`))
                                );
                                if (onSetObsidianFolders) {
                                  onSetObsidianFolders([...other, ...allKeys]);
                                }
                              }}
                              className="text-[9px] text-[#d8b4fe] hover:text-white underline font-normal"
                            >
                              Выбрать все папки
                            </button>
                          )}
                        </div>

                        {boundFolders.map((folder) => {
                          const folderKey = `${container.id}::${folder.path}`;
                          const isFolderActive =
                            isSelected &&
                            (selectedFolderKeys.includes(folderKey) ||
                              selectedFolderKeys.includes(folder.path) ||
                              selectedObsidianFolders.includes(folder.path));

                          return (
                            <div
                              key={folder.id || folder.path}
                              onClick={() => handleToggleFolder(container, folder.path)}
                              className={`group/folder flex items-center justify-between px-2 py-1 rounded-lg border transition-all cursor-pointer select-none text-[11px] ${
                                isFolderActive
                                  ? 'bg-[#221c33] border-[#a855f7]/50 text-[#e9d5ff]'
                                  : 'bg-[#17191e]/60 border-transparent hover:bg-[#1f2229] text-neutral-400 hover:text-neutral-200'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                {/* Folder Checkbox */}
                                <div
                                  className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors shrink-0 ${
                                    isFolderActive
                                      ? 'bg-[#a855f7] border-[#a855f7] text-white'
                                      : 'border-neutral-600 bg-[#121417] group-hover/folder:border-neutral-400'
                                  }`}
                                >
                                  {isFolderActive && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                </div>

                                {/* Folder Icon */}
                                <Folder className="w-3.5 h-3.5 text-[#d8b4fe] shrink-0" />

                                {/* Path */}
                                <span className="font-mono truncate font-medium">
                                  {folder.path}
                                </span>
                              </div>

                              {/* Badges & Only button */}
                              <div className="flex items-center gap-1 shrink-0 ml-2">
                                {folder.observeMode && (
                                  <span className="text-[9px] font-mono text-neutral-500 bg-[#252830] px-1 rounded">
                                    {folder.observeMode}
                                  </span>
                                )}

                                {onSelectOnlyObsidianFolder && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onSelectOnlyContainer) onSelectOnlyContainer(container.id);
                                      if (onSelectOnlyObsidianFolder) onSelectOnlyObsidianFolder(folderKey);
                                    }}
                                    className="opacity-0 group-hover/folder:opacity-100 text-[9px] font-mono px-1 py-0.5 rounded bg-[#a855f7]/20 text-[#d8b4fe] hover:bg-[#a855f7] hover:text-white transition-all"
                                    title="Выбрать только эту папку"
                                  >
                                    Only
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
