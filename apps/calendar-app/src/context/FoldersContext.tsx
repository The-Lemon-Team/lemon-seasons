import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Folder, FolderTreeNode, FolderPrivacy, CreateFolderInput, Note } from '@lenta/shared';
import { useTimeSliceNotes } from '../api/queries';
import { useAppMode } from './AppModeContext';
import { calendarApi } from '../api/client';
import {
  FOLDERS_STORAGE_KEY,
  INITIAL_FOLDERS,
  normalizeFolderPath,
  getFolderNameFromPath,
  buildFolderTreeFromList,
} from '../utils/folders.utils';

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
    isConflict: boolean;
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
  scopeFilter: 'all' | 'external' | 'internal';
  setScopeFilter: (scope: 'all' | 'external' | 'internal') => void;
  externalFolders: Folder[];
  internalFolders: Folder[];
  getInternalFoldersForContainer: (containerId: string) => Folder[];
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
  refreshFolders: () => Promise<void>;
}

const FoldersContext = createContext<FoldersContextType | undefined>(undefined);

export const FoldersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [needsNotesLoaded, setNeedsNotesLoaded] = useState(false);

  // Lazy-load full-year notes only when folder note counts/lists are actually requested
  const { data: notesData } = useTimeSliceNotes(
    {
      start: '2026-01-01T00:00:00.000Z',
      end: '2026-12-31T23:59:59.000Z',
    },
    { enabled: needsNotesLoaded },
  );
  const allNotes = notesData?.items || [];

  const [folders, setFolders] = useState<Folder[]>(() => {
    try {
      const saved = localStorage.getItem(FOLDERS_STORAGE_KEY);
      if (saved) {
        const parsed: Folder[] = JSON.parse(saved);
        return parsed.map((f) => ({
          ...f,
          scope: f.scope || (f.containerId ? 'internal' : 'external'),
          containerId:
            f.containerId && f.containerId !== 'cont-personal-vault' ? f.containerId : null,
        }));
      }
    } catch {
      // fallback
    }
    return INITIAL_FOLDERS;
  });

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(() => {
    return INITIAL_FOLDERS[0]?.id || null;
  });

  const [scopeFilter, setScopeFilter] = useState<'all' | 'external' | 'internal'>('all');

  const externalFolders = useMemo(() => {
    return folders.filter((f) => f.scope === 'external' || !f.containerId);
  }, [folders]);

  const internalFolders = useMemo(() => {
    return folders.filter((f) => f.scope === 'internal' || Boolean(f.containerId));
  }, [folders]);

  const getInternalFoldersForContainer = useCallback(
    (containerId: string) => folders.filter((f) => f.containerId === containerId),
    [folders]
  );

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
    } catch (e) {
      console.error('Failed to save folders to localStorage', e);
    }
  }, [folders]);

  const selectedFolder = useMemo(() => {
    return folders.find((f) => f.id === selectedFolderId) || null;
  }, [folders, selectedFolderId]);

  // Build tree hierarchy via shared helper
  const folderTree = useMemo(() => buildFolderTreeFromList(folders), [folders]);

  // Refresh folders from backend API
  const refreshFolders = useCallback(async () => {
    try {
      const serverFolders = await calendarApi.getFolders(false, undefined, undefined, 'all');
      if (Array.isArray(serverFolders) && serverFolders.length > 0) {
        setFolders(
          serverFolders.map((sf) => ({
            ...sf,
            scope: sf.scope || (sf.containerId ? 'internal' : 'external'),
          }))
        );
      }
    } catch (e) {
      console.warn('Could not refresh folders from server, using local cache', e);
    }
  }, []);

  useEffect(() => {
    refreshFolders();
  }, [refreshFolders]);

  // Add folder (optimistic update + backend sync)
  const addFolder = useCallback((input: CreateFolderInput): Folder => {
    const cleanPath = normalizeFolderPath(input.path);
    const name = input.name?.trim() || getFolderNameFromPath(cleanPath);
    const privacy: FolderPrivacy = input.privacy || 'public';
    const containerId = input.containerId || null;
    const scope = input.scope || (containerId ? 'internal' : 'external');

    const newFolder: Folder = {
      id: `fld-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name,
      path: cleanPath,
      icon: input.icon || (privacy === 'private' ? 'lock' : 'folder'),
      color: input.color || (privacy === 'private' ? '#a855f7' : '#c9cd58'),
      privacy,
      containerId,
      scope,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      _count: { noteFolders: 0 },
    };

    setFolders((prev) => {
      const existingIdx = prev.findIndex((f) => f.path.toLowerCase() === cleanPath.toLowerCase());
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = { ...copy[existingIdx], ...newFolder };
        return copy;
      }
      return [newFolder, ...prev];
    });

    setSelectedFolderId(newFolder.id);

    // Persist to backend
    calendarApi.createFolder(input).then((saved) => {
      if (saved?.id) {
        setFolders((prev) =>
          prev.map((f) => (f.path.toLowerCase() === cleanPath.toLowerCase() ? { ...f, ...saved } : f))
        );
        setSelectedFolderId(saved.id);
      }
    }).catch((err) => {
      console.warn('Backend createFolder sync notice:', err);
    });

    return newFolder;
  }, []);

  // Update folder (optimistic update + backend sync)
  const updateFolder = useCallback((id: string, updates: Partial<Folder>) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const cleanPath = updates.path ? normalizeFolderPath(updates.path) : f.path;
        const cleanName = updates.name !== undefined ? updates.name.trim() : f.name;
        return {
          ...f,
          ...updates,
          path: cleanPath,
          name: cleanName || getFolderNameFromPath(cleanPath),
          updatedAt: new Date().toISOString(),
        };
      })
    );

    const payload: {
      name?: string;
      path?: string;
      icon?: string;
      color?: string;
      privacy?: FolderPrivacy;
      containerId?: string | null;
    } = {
      name: updates.name,
      path: updates.path,
      icon: updates.icon || undefined,
      color: updates.color || undefined,
      privacy: updates.privacy,
      containerId: updates.containerId,
    };

    calendarApi.updateFolder(id, payload).catch((err) => {
      console.warn('Backend updateFolder sync notice:', err);
    });
  }, []);

  // Delete folder
  const deleteFolder = useCallback(async (id: string) => {
    try {
      await calendarApi.deleteFolder(id);
    } catch (e) {
      console.warn('Failed to delete folder on server', e);
    }
    setFolders((prev) => {
      const target = prev.find((f) => f.id === id);
      if (!target) return prev;
      const prefix = `${target.path}/`;
      return prev.filter((f) => f.id !== id && !f.path.startsWith(prefix));
    });
    setSelectedFolderId((current) => (current === id ? null : current));
  }, []);

  const getFolderContainerUsage = useCallback((_folderPath: string) => [], []);

  // Get notes associated with a folder
  const getNotesForFolder = useCallback(
    (folderPath: string, recursive = true): Note[] => {
      if (!needsNotesLoaded) {
        setNeedsNotesLoaded(true);
      }
      const normalized = normalizeFolderPath(folderPath).toLowerCase();
      const matchedFolder = folders.find((f) => f.path.toLowerCase() === normalized);

      return allNotes.filter((n) => {
        const hasDirectFolder = n.folders?.some((f) => {
          if (matchedFolder && (f.folderId === matchedFolder.id || f.folder?.id === matchedFolder.id)) {
            return true;
          }
          const fp = normalizeFolderPath(f.folder?.path || '').toLowerCase();
          return recursive ? fp === normalized || fp.startsWith(`${normalized}/`) : fp === normalized;
        });
        if (hasDirectFolder) return true;

        if (n.filePath) {
          const nfp = normalizeFolderPath(n.filePath).toLowerCase();
          if (recursive) {
            if (nfp === normalized || nfp.startsWith(`${normalized}/`)) return true;
          } else {
            const dir = nfp.includes('/') ? nfp.substring(0, nfp.lastIndexOf('/')) : '';
            if (dir === normalized) return true;
          }
        }
        return false;
      });
    },
    [allNotes, folders, needsNotesLoaded]
  );

  // Privacy change impact calculation
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

      const subfolders = folders.filter((f) => f.id !== folder.id && f.path.startsWith(`${folder.path}/`));
      const notes = getNotesForFolder(folder.path, true);

      return {
        folderId: folder.id,
        folderName: folder.name,
        folderPath: folder.path,
        currentPrivacy: folder.privacy || 'public',
        targetPrivacy,
        affectedContainers: [],
        hasConflict: false,
        notesCount: notes.length || folder._count?.noteFolders || 0,
        subfoldersCount: subfolders.length,
      };
    },
    [folders, getNotesForFolder]
  );

  // Execute privacy change with backend sync
  const executePrivacyChange = useCallback(
    (folderId: string, targetPrivacy: FolderPrivacy) => {
      const folder = folders.find((f) => f.id === folderId);
      if (!folder) return;

      const prefix = `${folder.path}/`;
      setFolders((prev) =>
        prev.map((f) => {
          if (f.id === folderId || f.path.startsWith(prefix)) {
            return {
              ...f,
              privacy: targetPrivacy,
              color: targetPrivacy === 'private' ? '#a855f7' : f.color === '#a855f7' ? '#c9cd58' : f.color,
              updatedAt: new Date().toISOString(),
            };
          }
          return f;
        })
      );

      calendarApi.updateFolder(folderId, { privacy: targetPrivacy }).catch((err) => {
        console.warn('Backend executePrivacyChange sync notice:', err);
      });
    },
    [folders]
  );

  const contextValue = useMemo(
    () => ({
      folders,
      folderTree,
      selectedFolderId,
      selectedFolder,
      setSelectedFolderId,
      scopeFilter,
      setScopeFilter,
      externalFolders,
      internalFolders,
      getInternalFoldersForContainer,
      addFolder,
      updateFolder,
      deleteFolder,
      getFolderPrivacyImpact,
      executePrivacyChange,
      getFolderContainerUsage,
      getNotesForFolder,
      refreshFolders,
    }),
    [
      folders,
      folderTree,
      selectedFolderId,
      selectedFolder,
      scopeFilter,
      externalFolders,
      internalFolders,
      getInternalFoldersForContainer,
      addFolder,
      updateFolder,
      deleteFolder,
      getFolderPrivacyImpact,
      executePrivacyChange,
      getFolderContainerUsage,
      getNotesForFolder,
      refreshFolders,
    ],
  );

  return (
    <FoldersContext.Provider value={contextValue}>
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
