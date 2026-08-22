import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  FolderTree,
  Folder,
  ChevronRight,
  ChevronDown,
  Check,
  X,
  Sparkles,
  Film,
  Landmark,
  Shield,
  Rocket,
  Flag,
  Globe,
} from 'lucide-react';
import { Note } from '@lenta/shared';
import { useI18n } from '../i18n';

export interface PresetHierarchyNode {
  id: string;
  name: string;
  nameRu: string;
  path: string;
  icon?: React.ReactNode;
  children?: PresetHierarchyNode[];
}

export const PRESET_TAXONOMY_HIERARCHY: PresetHierarchyNode[] = [
  {
    id: 'films',
    name: 'Films',
    nameRu: 'Фильмы',
    path: 'Films',
    icon: <Film className="w-3.5 h-3.5 text-amber-400" />,
    children: [
      {
        id: 'films-marvel',
        name: 'Marvel',
        nameRu: 'Марвел',
        path: 'Films/Marvel',
        icon: <Shield className="w-3.5 h-3.5 text-red-400" />,
      },
      {
        id: 'films-fantastic',
        name: 'Fantastic',
        nameRu: 'Фантастика',
        path: 'Films/Fantastic',
        icon: <Rocket className="w-3.5 h-3.5 text-purple-400" />,
      },
    ],
  },
  {
    id: 'politics',
    name: 'Politics',
    nameRu: 'Политика',
    path: 'Politics',
    icon: <Landmark className="w-3.5 h-3.5 text-blue-400" />,
    children: [
      {
        id: 'politics-usa',
        name: 'USA',
        nameRu: 'США',
        path: 'Politics/USA',
        icon: <Flag className="w-3.5 h-3.5 text-sky-400" />,
      },
      {
        id: 'politics-russia',
        name: 'Russia',
        nameRu: 'Россия',
        path: 'Politics/Russia',
        icon: <Globe className="w-3.5 h-3.5 text-emerald-400" />,
      },
    ],
  },
];

interface HierarchySelectorProps {
  selectedTags: string[];
  onToggleTag: (tagPath: string) => void;
  onSelectOnlyTag?: (tagPath: string) => void;
  onClearTags?: () => void;
  notes?: Note[];
}

export const HierarchySelector: React.FC<HierarchySelectorProps> = ({
  selectedTags,
  onToggleTag,
  onClearTags,
  notes = [],
}) => {
  const { t, lang } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    Films: true,
    Politics: true,
  });
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click or escape
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

  const toggleExpand = (folderPath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolders((prev) => ({
      ...prev,
      [folderPath]: !prev[folderPath],
    }));
  };

  // Compute notes counts for hierarchy nodes
  const hierarchyCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    const matchesNode = (note: Note, path: string): boolean => {
      const lower = path.toLowerCase();
      const parts = lower.split('/');
      const lastPart = parts[parts.length - 1];

      // Check folders
      const hasFolder = note.folders?.some((f) => {
        const fp = (f.folder?.path || '').toLowerCase();
        const fn = (f.folder?.name || '').toLowerCase();
        return fp === lower || fp.startsWith(lower + '/') || fn === lastPart;
      });
      if (hasFolder) return true;

      // Check tags
      const hasTag = note.tags?.some((tagItem) => {
        const tp = (tagItem.path || '').toLowerCase();
        const tn = (tagItem.name || '').toLowerCase();
        const dotPath = lower.replace(/\//g, '.');
        return tp === dotPath || tp.startsWith(dotPath + '.') || tn === lastPart;
      });
      if (hasTag) return true;

      // Check title / description keywords for realistic preview
      if (lastPart === 'marvel') {
        return Boolean(
          note.title.toLowerCase().includes('marvel') ||
          note.title.toLowerCase().includes('avengers') ||
          note.tags?.some((tagItem) => tagItem.path.includes('marvel')) ||
          note.feed?.slug?.includes('mcu')
        );
      }
      if (lastPart === 'fantastic') {
        return Boolean(
          note.title.toLowerCase().includes('fantastic') ||
          note.title.toLowerCase().includes('sci-fi') ||
          note.title.toLowerCase().includes('universe')
        );
      }
      if (lastPart === 'usa') {
        return Boolean(
          note.title.toLowerCase().includes('usa') ||
          note.title.toLowerCase().includes('america') ||
          note.title.toLowerCase().includes('election')
        );
      }
      if (lastPart === 'russia') {
        return Boolean(
          note.title.toLowerCase().includes('russia') ||
          note.title.toLowerCase().includes('moscow') ||
          note.title.toLowerCase().includes('foreign')
        );
      }
      if (lower === 'films') {
        return Boolean(
          matchesNode(note, 'Films/Marvel') ||
          matchesNode(note, 'Films/Fantastic') ||
          note.type === 'FILM_RELEASE' ||
          note.tags?.some((tagItem) => tagItem.path.startsWith('movies') || tagItem.path.startsWith('films'))
        );
      }
      if (lower === 'politics') {
        return Boolean(matchesNode(note, 'Politics/USA') || matchesNode(note, 'Politics/Russia'));
      }

      return false;
    };

    for (const root of PRESET_TAXONOMY_HIERARCHY) {
      counts[root.path] = notes.filter((n) => matchesNode(n, root.path)).length;
      if (root.children) {
        for (const child of root.children) {
          counts[child.path] = notes.filter((n) => matchesNode(n, child.path)).length;
        }
      }
    }

    return counts;
  }, [notes]);

  const activeCount = selectedTags.length;

  const getNodeName = (node: PresetHierarchyNode) => {
    return lang === 'ru' ? node.nameRu : node.name;
  };

  // Selected label summary for trigger pill
  const activeLabel = useMemo(() => {
    if (activeCount === 0) return null;
    if (activeCount === 1) {
      const selected = selectedTags[0];
      for (const root of PRESET_TAXONOMY_HIERARCHY) {
        if (root.path === selected) return getNodeName(root);
        const child = root.children?.find((c) => c.path === selected);
        if (child) return `${getNodeName(root)} / ${getNodeName(child)}`;
      }
      return selected;
    }
    return `${activeCount}`;
  }, [selectedTags, activeCount, lang]);

  return (
    <div className="relative inline-flex items-center" ref={dropdownRef}>
      {/* Hierarchy Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        type="button"
        className={`flex items-center gap-2 px-3 h-7 rounded-lg text-xs font-mono transition-all duration-200 border relative select-none shrink-0 ${
          activeCount > 0
            ? 'bg-[#c9cd58]/20 border-[#c9cd58] text-[#e5e971] shadow-glow-lemon font-semibold ring-1 ring-[#c9cd58]/60'
            : 'bg-[#c9cd58]/10 border-[#c9cd58]/50 text-[#d4e157] hover:bg-[#c9cd58]/15 hover:border-[#c9cd58] shadow-sm font-medium'
        }`}
        title={t.taxonomyHierarchy}
      >
        <div className="flex items-center gap-1.5">
          <FolderTree className="w-3.5 h-3.5 text-[#c9cd58] animate-pulse" />
          <span className="tracking-wide">
            {activeLabel ? activeLabel : t.taxonomyHierarchy}
          </span>
        </div>

        {activeCount > 0 ? (
          <div className="flex items-center gap-1 ml-0.5">
            <span className="w-4 h-4 rounded-full bg-[#c9cd58] text-[#121414] text-[10px] font-bold flex items-center justify-center">
              {activeCount}
            </span>
            {onClearTags && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onClearTags();
                }}
                className="hover:text-white p-0.5 rounded-full hover:bg-black/30 transition-colors ml-0.5"
                title={t.reset}
              >
                <X className="w-3 h-3" />
              </span>
            )}
          </div>
        ) : (
          <ChevronDown
            className={`w-3 h-3 opacity-70 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[#e5e971]' : ''
            }`}
          />
        )}
      </button>

      {/* Hierarchy Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-72 sm:w-80 bg-[#16191b]/98 backdrop-blur-xl border border-[#c9cd58]/50 rounded-xl shadow-2xl z-50 p-3 space-y-3 animate-fade-in text-xs font-mono">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-[#242828]">
            <div className="flex items-center gap-1.5 text-white font-semibold uppercase tracking-wider text-[11px]">
              <FolderTree className="w-3.5 h-3.5 text-[#c9cd58]" />
              <span>{t.taxonomyHierarchy}</span>
            </div>

            {activeCount > 0 && onClearTags && (
              <button
                onClick={() => {
                  onClearTags();
                  setIsOpen(false);
                }}
                className="text-[10px] text-neutral-400 hover:text-[#e5e971] transition-colors flex items-center gap-0.5"
              >
                <X className="w-3 h-3" />
                <span>{t.reset}</span>
              </button>
            )}
          </div>

          {/* Preset Folder Hierarchy Tree */}
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {/* "All Notes / Unfiltered" Option */}
            <button
              onClick={() => {
                if (onClearTags) onClearTags();
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all border ${
                activeCount === 0
                  ? 'bg-[#c9cd58]/20 border-[#c9cd58]/60 text-[#e5e971] font-semibold'
                  : 'bg-[#181a1a] border-[#242828] text-neutral-300 hover:bg-[#242828] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#c9cd58]" />
                <span>{t.allFolders}</span>
              </div>
              {activeCount === 0 && <Check className="w-3.5 h-3.5 text-[#c9cd58]" />}
            </button>

            {/* Tree Nodes */}
            {PRESET_TAXONOMY_HIERARCHY.map((rootNode) => {
              const isRootSelected = selectedTags.includes(rootNode.path);
              const isExpanded = Boolean(expandedFolders[rootNode.path]);
              const rootCount = hierarchyCounts[rootNode.path] || 0;
              const hasSelectedChild =
                rootNode.children?.some((c) => selectedTags.includes(c.path)) || false;

              return (
                <div
                  key={rootNode.id}
                  className="rounded-lg bg-[#181a1a]/80 border border-[#242828] overflow-hidden"
                >
                  {/* Root Node Item */}
                  <div
                    onClick={() => onToggleTag(rootNode.path)}
                    className={`flex items-center justify-between px-2.5 py-1.5 cursor-pointer transition-all ${
                      isRootSelected
                        ? 'bg-[#c9cd58]/20 text-[#e5e971] font-semibold'
                        : hasSelectedChild
                        ? 'bg-[#c9cd58]/5 text-white'
                        : 'text-neutral-300 hover:bg-[#242828] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {/* Expand Toggle */}
                      {rootNode.children && rootNode.children.length > 0 ? (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => toggleExpand(rootNode.path, e)}
                          className="p-0.5 rounded hover:bg-black/40 text-neutral-400 hover:text-white transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3 h-3 text-[#c9cd58]" />
                          ) : (
                            <ChevronRight className="w-3 h-3" />
                          )}
                        </span>
                      ) : (
                        <div className="w-3" />
                      )}

                      {/* Icon */}
                      {rootNode.icon || (
                        <Folder className="w-3.5 h-3.5 text-neutral-400" />
                      )}

                      <span className="truncate">{getNodeName(rootNode)}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {rootCount > 0 && (
                        <span className="text-[10px] opacity-70 bg-black/40 px-1.5 py-0.2 rounded font-mono">
                          {rootCount}
                        </span>
                      )}
                      {isRootSelected && <Check className="w-3.5 h-3.5 text-[#c9cd58]" />}
                    </div>
                  </div>

                  {/* Subcategories (Level 2) */}
                  {isExpanded && rootNode.children && (
                    <div className="pl-6 pr-2 py-1 space-y-1 bg-[#121414]/70 border-t border-[#242828]/60">
                      {rootNode.children.map((childNode) => {
                        const isChildSelected = selectedTags.includes(childNode.path);
                        const childCount = hierarchyCounts[childNode.path] || 0;

                        return (
                          <div
                            key={childNode.id}
                            onClick={() => onToggleTag(childNode.path)}
                            className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-all text-[11px] ${
                              isChildSelected
                                ? 'bg-[#c9cd58]/20 text-[#e5e971] font-semibold border border-[#c9cd58]/40'
                                : 'text-neutral-400 hover:bg-[#242828] hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              {childNode.icon || (
                                <Folder className="w-3 h-3 text-neutral-500" />
                              )}
                              <span>{getNodeName(childNode)}</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {childCount > 0 && (
                                <span className="text-[9px] opacity-70 bg-black/50 px-1 rounded font-mono">
                                  {childCount}
                                </span>
                              )}
                              {isChildSelected && (
                                <Check className="w-3 h-3 text-[#c9cd58]" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
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

