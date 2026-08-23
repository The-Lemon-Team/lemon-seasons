import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Folder, FolderTreeNode, FolderPrivacy, CreateFolderInput, UpdateFolderInput, Note } from '@lenta/shared';
import { useObsidianContainers } from './ObsidianContainersContext';
import { useTimeSliceNotes } from '../api/queries';

export interface PrivacyImpact {
  folderId: string;
  folderName: string;
  folderPath: string;
  currentPrivacy: FolderPrivacy;
  targetPrivacy: FolderPrivacy;
  affectedContainers: Array<{
    id: string;
    name: string;
    privacy: 'private' | 'public';
    isConflict: boolean; // True if public container with target privacy 'private'
  }>;
  hasConflict: boolean;
  notesCount: number;
  subfoldersCount: number;
}

interface FoldersContextType {
  folders: Folder[];
  folderTree: FolderTreeNode[];
  selectedFolderId: string | null;
  selectedFolder: Folder | null;
  setSelectedFolderId: (id: string | null) => void;
  addFolder: (input: CreateFolderInput) => Folder;
  updateFolder: (id: string, updates: Partial<Folder>) => void;
  deleteFolder: (id: string) => void;
  getFolderPrivacyImpact: (folderId: string, targetPrivacy: FolderPrivacy) => PrivacyImpact;
  executePrivacyChange: (folderId: string, targetPrivacy: FolderPrivacy) => void;
  getFolderContainerUsage: (folderPath: string) => Array<{
    containerId: string;
    containerName: string;
    containerPrivacy: 'private' | 'public';
    boundFolderId: string;
  }>;
  getNotesForFolder: (folderPath: string, recursive?: boolean) => Note[];
}

const STORAGE_KEY = 'lemon_lenta_folders_v1';

const INITIAL_FOLDERS: Folder[] = [
  {
    id: 'fld-daily-logs',
    name: '01_Daily_Logs',
    path: '01_Daily_Logs',
    icon: 'book-open',
    color: '#a855f7',
    privacy: 'private',
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-20T10:00:00.000Z',
    deletedAt: null,
    _count: { noteFolders: 14 },
  },
  {
    id: 'fld-archive',
    name: '04_Archive',
    path: '04_Archive',
    icon: 'archive',
    color: '#8b5cf6',
    privacy: 'private',
    createdAt: '2026-08-01T11:00:00.000Z',
    updatedAt: '2026-08-15T11:00:00.000Z',
    deletedAt: null,
    _count: { noteFolders: 3 },
  },
  {
    id: 'fld-archive-thoughts',
    name: 'Thoughts',
    path: '04_Archive/Thoughts',
    icon: 'sparkles',
    color: '#a855f7',
    privacy: 'private',
    createdAt: '2026-08-01T11:30:00.000Z',
    updatedAt: '2026-08-18T11:30:00.000Z',
    deletedAt: null,
    _count: { noteFolders: 8 },
  },
  {
    id: 'fld-projects',
    name: '02_Projects',
    path: '02_Projects',
    icon: 'folder-kanban',
    color: '#c9cd58',
    privacy: 'public',
    createdAt: '2026-08-05T09:00:00.000Z',
    updatedAt: '2026-08-22T09:00:00.000Z',
    deletedAt: null,
    _count: { noteFolders: 6 },
  },
  {
    id: 'fld-projects-lenta',
    name: 'Lenta',
    path: '02_Projects/Lenta',
    icon: 'lemon',
    color: '#c9cd58',
    privacy: 'public',
    createdAt: '2026-08-05T09:30:00.000Z',
    updatedAt: '2026-08-23T12:00:00.000Z',
    deletedAt: null,
    _count: { noteFolders: 24 },
  },
  {
    id: 'fld-research',
    name: '03_Research',
    path: '03_Research',
    icon: 'flask-conical',
    color: '#3b82f6',
    privacy: 'public',
    createdAt: '2026-08-06T14:00:00.000Z',
    updatedAt: '2026-08-20T14:00:00.000Z',
    deletedAt: null,
    _count: { noteFolders: 5 },
  },
  {
    id: 'fld-research-ai',
    name: 'AI',
    path: '03_Research/AI',
    icon: 'bot',
    color: '#3b82f6',
    privacy: 'public',
    createdAt: '2026-08-06T14:30:00.000Z',
    updatedAt: '2026-08-22T14:30:00.000Z',
    deletedAt: null,
    _count: { noteFolders: 11 },
  },
  {
    id: 'fld-news',
    name: 'News',
    path: 'News',
    icon: 'newspaper',
    color: '#f59e0b',
    privacy: 'public',
    createdAt: '2026-08-02T08:00:00.000Z',
    updatedAt: '2026-08-21T08:00:00.000Z',
    deletedAt: null,
    _count: { noteFolders: 8 },
  },
  {
    id: 'fld-news-cinema',
    name: 'Cinema',
    path: 'News/Cinema',
    icon: 'film',
    color: '#f43f5e',
    privacy: 'public',
    createdAt: '2026-08-02T08:30:00.000Z',
    updatedAt: '2026-08-22T16:00:00.000Z',
    deletedAt: null,
    _count: { noteFolders: 15 },
  },
  {
    id: 'fld-news-marvel',
    name: 'Marvel',
    path: 'News/Marvel',
    icon: 'shield',
    color: '#ef4444',
    privacy: 'public',
    createdAt: '2026-08-02T09:00:00.000Z',
    updatedAt: '2026-08-23T10:00:00.000Z',
    deletedAt: null,
    _count: { noteFolders: 9 },
  },
  {
    id: 'fld-core-strategy',
    name: 'Core_Strategy',
    path: 'Core_Strategy',
    icon: 'lock',
    color: '#f43f5e',
    privacy: 'private',
    createdAt: '2026-08-10T09:15:00.000Z',
    updatedAt: '2026-08-23T11:00:00.000Z',
    deletedAt: null,
    _count: { noteFolders: 7 },
  },
  {
    id: 'fld-financials',
    name: 'Financials',
    path: 'Financials',
    icon: 'circle-dollar-sign',
    color: '#10b981',
    privacy: 'private',
    createdAt: '2026-08-10T10:00:00.000Z',
    updatedAt: '2026-08-22T10:00:00.000Z',
    deletedAt: null,
    _count: { noteFolders: 4 },
  },
  {
    id: 'fld-financials-q3q4',
    name: 'Q3_Q4',
    path: 'Financials/Q3_Q4',
    icon: 'trending-up',
    color: '#10b981',
    privacy: 'private',
    createdAt: '2026-08-10T10:30:00.000Z',
    updatedAt: '2026-08-22T10:30:00.000Z',
    deletedAt: null,
    _count: { noteFolders: 6 },
  },
];

const FoldersContext = createContext<FoldersContextType | undefined>(undefined);

export const FoldersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { containers } = useObsidianContainers();

  // Load all notes from active timeline range to match with folders
  const { data: notesData } = useTimeSliceNotes({
    start: '2026-01-01T00:00:00.000Z',
    end: '2026-12-31T23:59:59.000Z',
  });
  const allNotes = notesData?.items || [];

  const [folders, setFolders] = useState<Folder[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return INITIAL_FOLDERS;
  });

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(() => {
    return INITIAL_FOLDERS[0]?.id || null;
  });

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
    } catch (e) {
      console.error('Failed to save folders to localStorage', e);
    }
  }, [folders]);

  const selectedFolder = useMemo(() => {
    return folders.find((f) => f.id === selectedFolderId) || null;
  }, [folders, selectedFolderId]);

  // Build tree hierarchy
  const folderTree = useMemo((): FolderTreeNode[] => {
    const folderMap = new Map<string, FolderTreeNode>();
    const roots: FolderTreeNode[] = [];

    // 1. Initialize map
    for (const f of folders) {
      const directCount = f._count?.noteFolders || 0;
      folderMap.set(f.path, {
        id: f.id,
        name: f.name,
        path: f.path,
        icon: f.icon,
        color: f.color,
        privacy: f.privacy || 'public',
        directNotesCount: directCount,
        notesCount: directCount,
        updatedAt: f.updatedAt,
        deletedAt: f.deletedAt,
        children: [],
      });
    }

    // 2. Build tree hierarchy
    for (const f of folders) {
      const node = folderMap.get(f.path)!;
      const lastSlash = f.path.lastIndexOf('/');
      if (lastSlash === -1) {
        roots.push(node);
      } else {
        const parentPath = f.path.substring(0, lastSlash);
        const parentNode = folderMap.get(parentPath);
        if (parentNode) {
          parentNode.children.push(node);
        } else {
          roots.push(node);
        }
      }
    }

    // 3. Compute recursive note counts
    const computeCounts = (n: FolderTreeNode): number => {
      let total = n.directNotesCount;
      for (const child of n.children) {
        total += computeCounts(child);
      }
      n.notesCount = total;
      return total;
    };

    roots.forEach(computeCounts);
    return roots;
  }, [folders]);

  // Normalizer
  const normalizePath = (rawPath: string): string => {
    return rawPath
      .trim()
      .replace(/\\/g, '/')
      .replace(/\/+/g, '/')
      .replace(/^\/|\/$/g, '');
  };

  const getFolderName = (normalizedPath: string): string => {
    const parts = normalizedPath.split('/');
    return parts[parts.length - 1] || 'Folder';
  };

  // Add folder
  const addFolder = useCallback((input: CreateFolderInput): Folder => {
    const cleanPath = normalizePath(input.path);
    const name = input.name?.trim() || getFolderName(cleanPath);
    const privacy: FolderPrivacy = input.privacy || 'public';

    const newFolder: Folder = {
      id: `fld-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name,
      path: cleanPath,
      icon: input.icon || (privacy === 'private' ? 'lock' : 'folder'),
      color: input.color || (privacy === 'private' ? '#a855f7' : '#c9cd58'),
      privacy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      _count: { noteFolders: 0 },
    };

    setFolders((prev) => {
      // If path already exists, update it, otherwise prepend
      const existingIdx = prev.findIndex((f) => f.path.toLowerCase() === cleanPath.toLowerCase());
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = { ...copy[existingIdx], ...newFolder };
        return copy;
      }
      return [newFolder, ...prev];
    });

    setSelectedFolderId(newFolder.id);
    return newFolder;
  }, []);

  // Update folder
  const updateFolder = useCallback((id: string, updates: Partial<Folder>) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const cleanPath = updates.path ? normalizePath(updates.path) : f.path;
        const cleanName = updates.name !== undefined ? updates.name.trim() : f.name;
        return {
          ...f,
          ...updates,
          path: cleanPath,
          name: cleanName || getFolderName(cleanPath),
          updatedAt: new Date().toISOString(),
        };
      })
    );
  }, []);

  // Delete folder
  const deleteFolder = useCallback((id: string) => {
    setFolders((prev) => {
      const target = prev.find((f) => f.id === id);
      if (!target) return prev;
      const prefix = `${target.path}/`;
      return prev.filter((f) => f.id !== id && !f.path.startsWith(prefix));
    });
    setSelectedFolderId((current) => (current === id ? null : current));
  }, []);

  // Find which Obsidian Containers observe this folder (or parent prefix)
  const getFolderContainerUsage = useCallback(
    (folderPath: string) => {
      const normalized = normalizePath(folderPath).toLowerCase();
      const usages: Array<{
        containerId: string;
        containerName: string;
        containerPrivacy: 'private' | 'public';
        boundFolderId: string;
      }> = [];

      for (const c of containers) {
        for (const bf of c.boundFolders) {
          const boundNormalized = normalizePath(bf.path).toLowerCase();
          // Direct match or parent prefix match
          if (
            boundNormalized === normalized ||
            normalized.startsWith(`${boundNormalized}/`) ||
            boundNormalized.startsWith(`${normalized}/`)
          ) {
            usages.push({
              containerId: c.id,
              containerName: c.name,
              containerPrivacy: c.privacy,
              boundFolderId: bf.id,
            });
          }
        }
      }
      return usages;
    },
    [containers]
  );

  // Get notes associated with a folder
  const getNotesForFolder = useCallback(
    (folderPath: string, recursive = true): Note[] => {
      const normalized = normalizePath(folderPath).toLowerCase();
      const lastPart = getFolderName(normalized).toLowerCase();

      return allNotes.filter((n) => {
        // 1. Direct match in note.folders
        const hasDirectFolder = n.folders?.some((f) => {
          const fp = normalizePath(f.folder?.path || '').toLowerCase();
          const fn = (f.folder?.name || '').toLowerCase();
          if (recursive) {
            return fp === normalized || fp.startsWith(`${normalized}/`) || fn === lastPart;
          }
          return fp === normalized;
        });
        if (hasDirectFolder) return true;

        // 2. Semantic matching with sample datasets for rich exploration
        if (normalized.includes('daily_logs') && (n.startDate || n.createdAt)) {
          return n.type === 'SINGLE' || n.type === 'EVENT';
        }
        if (normalized.includes('cinema') || normalized.includes('marvel')) {
          return (
            n.type === 'FILM_RELEASE' ||
            n.title.toLowerCase().includes('marvel') ||
            n.title.toLowerCase().includes('cinema') ||
            n.feed?.slug?.includes('cinema') ||
            n.feed?.slug?.includes('mcu')
          );
        }
        if (normalized.includes('research') || normalized.includes('ai')) {
          return (
            n.tags?.some((t) => t.path.includes('ai') || t.path.includes('research')) ||
            n.title.toLowerCase().includes('ai') ||
            n.title.toLowerCase().includes('модель')
          );
        }
        if (normalized.includes('strategy') || normalized.includes('financials')) {
          return (
            n.tags?.some((t) => t.path.includes('politics') || t.path.includes('biz')) ||
            n.type === 'PERIOD'
          );
        }

        return false;
      });
    },
    [allNotes]
  );

  // Calculate Privacy Change Impact before changing
  const getFolderPrivacyImpact = useCallback(
    (folderId: string, targetPrivacy: FolderPrivacy): PrivacyImpact => {
      const folder = folders.find((f) => f.id === folderId);
      if (!folder) {
        return {
          folderId,
          folderName: '',
          folderPath: '',
          currentPrivacy: 'public',
          targetPrivacy,
          affectedContainers: [],
          hasConflict: false,
          notesCount: 0,
          subfoldersCount: 0,
        };
      }

      const usages = getFolderContainerUsage(folder.path);
      const subfolders = folders.filter(
        (f) => f.id !== folder.id && f.path.startsWith(`${folder.path}/`)
      );

      const notes = getNotesForFolder(folder.path, true);

      const affectedContainers = usages.map((u) => {
        // Conflict occurs if changing to 'private', but container is 'public'
        const isConflict = targetPrivacy === 'private' && u.containerPrivacy === 'public';
        return {
          id: u.containerId,
          name: u.containerName,
          privacy: u.containerPrivacy,
          isConflict,
        };
      });

      const hasConflict = affectedContainers.some((c) => c.isConflict);

      return {
        folderId: folder.id,
        folderName: folder.name,
        folderPath: folder.path,
        currentPrivacy: folder.privacy || 'public',
        targetPrivacy,
        affectedContainers,
        hasConflict,
        notesCount: notes.length || folder._count?.noteFolders || 0,
        subfoldersCount: subfolders.length,
      };
    },
    [folders, getFolderContainerUsage, getNotesForFolder]
  );

  // Execute privacy change
  const executePrivacyChange = useCallback(
    (folderId: string, targetPrivacy: FolderPrivacy) => {
      const folder = folders.find((f) => f.id === folderId);
      if (!folder) return;

      const prefix = `${folder.path}/`;
      setFolders((prev) =>
        prev.map((f) => {
          // Update the folder itself and all its subfolders
          if (f.id === folderId || f.path.startsWith(prefix)) {
            return {
              ...f,
              privacy: targetPrivacy,
              color: targetPrivacy === 'private' ? '#a855f7' : (f.color === '#a855f7' ? '#c9cd58' : f.color),
              updatedAt: new Date().toISOString(),
            };
          }
          return f;
        })
      );
    },
    [folders]
  );

  return (
    <FoldersContext.Provider
      value={{
        folders,
        folderTree,
        selectedFolderId,
        selectedFolder,
        setSelectedFolderId,
        addFolder,
        updateFolder,
        deleteFolder,
        getFolderPrivacyImpact,
        executePrivacyChange,
        getFolderContainerUsage,
        getNotesForFolder,
      }}
    >
      {children}
    </FoldersContext.Provider>
  );
};

export const useFoldersContext = () => {
  const context = useContext(FoldersContext);
  if (!context) {
    throw new Error('useFoldersContext must be used within a FoldersProvider');
  }
  return context;
};
