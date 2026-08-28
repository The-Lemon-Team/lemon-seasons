import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ObsidianContainer, BoundFolder, ContainerPrivacy, FolderPrivacy } from '@lenta/shared';
import { containersApi, ContainerSummaryDto } from '../api/containersApi';

export interface ContainerPrivacyImpact {
  containerId: string;
  containerName: string;
  currentPrivacy: ContainerPrivacy;
  targetPrivacy: ContainerPrivacy;
  hasConflict: boolean;
  conflictingFolders: BoundFolder[];
}

interface ObsidianContainersContextType {
  containers: ObsidianContainer[];
  activeContainer: ObsidianContainer | null;
  setActiveContainerId: (id: string | null) => void;
  selectedContainerIds: string[];
  selectedContainers: ObsidianContainer[];
  toggleSelectContainer: (id: string) => void;
  selectAllContainers: () => void;
  deselectAllContainers: () => void;
  selectedContainersCount: number;
  selectedContainersTotalNotes: number;
  isServerConnected: boolean;
  isServerLoading: boolean;
  refetchContainers: () => Promise<void>;
  addContainer: (input: {
    name: string;
    description?: string;
    vaultPath: string;
    privacy: ContainerPrivacy;
    boundFolders?: Array<{
      path: string;
      name?: string;
      isPrimary?: boolean;
      observeMode?: 'all' | 'filtered' | 'recursive';
      filterTag?: string;
      privacy?: FolderPrivacy;
    }>;
  }) => Promise<ObsidianContainer> | ObsidianContainer;
  updateContainer: (id: string, updates: Partial<ObsidianContainer>) => void;
  deleteContainer: (id: string) => Promise<void> | void;
  togglePrivacy: (id: string, force?: boolean) => { success: boolean; impact?: ContainerPrivacyImpact };
  checkContainerPrivacyChangeImpact: (containerId: string) => ContainerPrivacyImpact;
  addBoundFolder: (
    containerId: string,
    folder: {
      path: string;
      name?: string;
      isPrimary?: boolean;
      observeMode?: 'all' | 'filtered' | 'recursive';
      filterTag?: string;
      privacy?: FolderPrivacy;
      notesCount?: number;
    }
  ) => { success: boolean; error?: string };
  removeBoundFolder: (containerId: string, folderId: string) => void;
  updateBoundFolder: (containerId: string, folderId: string, updates: Partial<BoundFolder>) => void;
  regenerateToken: (containerId: string) => string;
  triggerSync: (containerId: string) => Promise<void>;
  pushContainer: (containerId: string) => Promise<void>;
  pullContainer: (containerId: string) => Promise<void>;
  isSyncingId: string | null;
  syncDirection: 'push' | 'pull' | null;
  pendingChanges: Record<string, number>;
}

const STORAGE_KEY = 'lemon_lenta_obsidian_containers_v1';
const SELECTED_KEY = 'lemon_lenta_selected_container_ids_v1';

const INITIAL_CONTAINERS: ObsidianContainer[] = [
  {
    id: 'cont-personal-vault',
    name: 'Личный Дневник (Personal Vault)',
    description: 'Приватный контейнер для личных заметок, ежедневных записей и закрытых размышлений',
    vaultPath: 'Vault/Personal',
    privacy: 'private',
    token: 'lenta_jwt_sec_personal_vault_token_8892',
    notesCount: 42,
    createdAt: '2026-08-01T10:00:00.000Z',
    lastSyncedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    status: 'connected',
    color: '#a855f7',
    boundFolders: [
      {
        id: 'f-1',
        path: '01_Daily_Logs',
        name: 'Ежедневные логи',
        isPrimary: true,
        observeMode: 'recursive',
        notesCount: 28,
        status: 'active',
        privacy: 'private',
      },
      {
        id: 'f-2',
        path: '04_Archive/Thoughts',
        name: 'Архив мыслей',
        isPrimary: false,
        observeMode: 'all',
        notesCount: 14,
        status: 'active',
        privacy: 'private',
      },
    ],
  },
  {
    id: 'cont-public-hub',
    name: 'Открытый Хаб Знаний (Public Lenta Hub)',
    description: 'Публичный контейнер для совместных проектов, анонсов кино, статей и новостей',
    vaultPath: 'Vault/Public_Lenta',
    privacy: 'public',
    token: 'lenta_jwt_pub_knowledge_hub_4910',
    notesCount: 86,
    createdAt: '2026-08-05T14:30:00.000Z',
    lastSyncedAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    status: 'connected',
    color: '#c9cd58',
    boundFolders: [
      {
        id: 'f-3',
        path: '02_Projects/Lenta',
        name: 'Проекты Lenta',
        isPrimary: true,
        observeMode: 'recursive',
        notesCount: 52,
        status: 'active',
        privacy: 'public',
      },
      {
        id: 'f-4',
        path: '03_Research/AI',
        name: 'Исследования ИИ',
        isPrimary: false,
        observeMode: 'filtered',
        filterTag: 'ai.research',
        notesCount: 21,
        status: 'active',
        privacy: 'public',
      },
      {
        id: 'f-5',
        path: 'News/Cinema',
        name: 'Кино и релизы',
        isPrimary: false,
        observeMode: 'all',
        notesCount: 13,
        status: 'active',
        privacy: 'public',
      },
    ],
  },
  {
    id: 'cont-confidential-roadmap',
    name: 'Секретная Дорожная Карта (Confidential Roadmap)',
    description: 'Шифрованный контейнер планов развития продукта и конфиденциальных финансовых вех',
    vaultPath: 'Vault/Confidential/Roadmap',
    privacy: 'private',
    token: 'lenta_jwt_sec_confidential_rm_3192',
    notesCount: 19,
    createdAt: '2026-08-10T09:15:00.000Z',
    lastSyncedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    status: 'idle',
    color: '#f43f5e',
    boundFolders: [
      {
        id: 'f-6',
        path: 'Core_Strategy',
        name: 'Стратегия ядра',
        isPrimary: true,
        observeMode: 'recursive',
        notesCount: 12,
        status: 'active',
        privacy: 'private',
      },
      {
        id: 'f-7',
        path: 'Financials/Q3_Q4',
        name: 'Финансы Q3-Q4',
        isPrimary: false,
        observeMode: 'all',
        notesCount: 7,
        status: 'active',
        privacy: 'private',
      },
    ],
  },
];

const ObsidianContainersContext = createContext<ObsidianContainersContextType | undefined>(undefined);

export const ObsidianContainersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [containers, setContainers] = useState<ObsidianContainer[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return INITIAL_CONTAINERS;
  });

  const [activeContainerId, setActiveContainerId] = useState<string | null>(null);
  const [selectedContainerIds, setSelectedContainerIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(SELECTED_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return INITIAL_CONTAINERS.map((c) => c.id);
  });
  const [isSyncingId, setIsSyncingId] = useState<string | null>(null);
  const [syncDirection, setSyncDirection] = useState<'push' | 'pull' | null>(null);

  // pendingChanges: number of local notes modified since last sync per container
  const [pendingChanges, setPendingChanges] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    INITIAL_CONTAINERS.forEach((c) => {
      init[c.id] = Math.floor(Math.random() * 5);
    });
    return init;
  });

  const [isServerConnected, setIsServerConnected] = useState<boolean>(false);
  const [isServerLoading, setIsServerLoading] = useState<boolean>(true);

  const refetchContainers = useCallback(async () => {
    setIsServerLoading(true);
    try {
      const summaries = await containersApi.listContainers();
      setIsServerConnected(true);

      setContainers((prev) => {
        const mapped: ObsidianContainer[] = summaries.map((dto) => {
          const existing = prev.find((c) => c.id === dto.id);
          const resolvedPrivacy: ContainerPrivacy =
            dto.visibility === 'private'
              ? 'private'
              : dto.visibility === 'public'
              ? 'public'
              : existing?.privacy ||
                (dto.id.includes('private') ||
                dto.id.includes('secret') ||
                dto.id.startsWith('lenta_obs_') ||
                dto.name.toLowerCase().includes('private') ||
                dto.name.toLowerCase().includes('user key') ||
                dto.name.toLowerCase().includes('личный')
                  ? 'private'
                  : 'public');

          return {
            id: dto.id,
            name: dto.name,
            description: dto.description || 'Obsidian note container',
            vaultPath: existing?.vaultPath || `vaults/${dto.id}`,
            privacy: resolvedPrivacy,
            token: dto.key || existing?.token || `lenta_jwt_${resolvedPrivacy === 'private' ? 'sec' : 'pub'}_${dto.id}`,
            notesCount: dto.totalFiles || existing?.notesCount || 0,
            createdAt: existing?.createdAt || new Date().toISOString(),
            lastSyncedAt: dto.lastModified || existing?.lastSyncedAt || new Date().toISOString(),
            status: 'connected',
            color: resolvedPrivacy === 'private' ? '#a855f7' : '#c9cd58',
            boundFolders: existing?.boundFolders || [
              {
                id: `f-${dto.id}-main`,
                path: 'Notes',
                name: 'Главная папка',
                isPrimary: true,
                observeMode: 'recursive',
                notesCount: dto.totalFiles || 0,
                status: 'active',
                privacy: resolvedPrivacy === 'private' ? 'private' : 'public',
              },
            ],
            ...(dto as any),
          };
        });

        // Retain any purely local mock containers if server has empty list
        if (mapped.length === 0) return prev;
        return mapped;
      });
    } catch (err) {
      console.warn('Obsidian containers server offline or unreachable (port 3001). Falling back to local storage cache.', err);
      setIsServerConnected(false);
    } finally {
      setIsServerLoading(false);
    }
  }, []);

  useEffect(() => {
    refetchContainers();
  }, [refetchContainers]);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(containers));
    } catch (e) {
      console.error('Failed to save obsidian containers to localStorage', e);
    }
  }, [containers]);

  useEffect(() => {
    try {
      localStorage.setItem(SELECTED_KEY, JSON.stringify(selectedContainerIds));
    } catch (e) {
      console.error('Failed to save selected container IDs to localStorage', e);
    }
  }, [selectedContainerIds]);

  const activeContainer = containers.find((c) => c.id === activeContainerId) || null;
  const selectedContainers = containers.filter((c) => selectedContainerIds.includes(c.id));
  const selectedContainersCount = selectedContainers.length;
  const selectedContainersTotalNotes = selectedContainers.reduce((sum, c) => sum + (c.notesCount || 0), 0);

  const toggleSelectContainer = useCallback((id: string) => {
    setSelectedContainerIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const selectAllContainers = useCallback(() => {
    setSelectedContainerIds(containers.map((c) => c.id));
  }, [containers]);

  const deselectAllContainers = useCallback(() => {
    setSelectedContainerIds([]);
  }, []);

  const addContainer = useCallback(
    async (input: {
      name: string;
      description?: string;
      vaultPath: string;
      privacy: ContainerPrivacy;
      boundFolders?: Array<{
        path: string;
        name?: string;
        isPrimary?: boolean;
        observeMode?: 'all' | 'filtered' | 'recursive';
        filterTag?: string;
        privacy?: FolderPrivacy;
        notesCount?: number;
      }>;
    }): Promise<ObsidianContainer> => {
      let serverSummary: ContainerSummaryDto | null = null;
      if (isServerConnected) {
        try {
          serverSummary = await containersApi.registerContainer({
            name: input.name,
            type: 'obsidian',
            description: input.description,
            rootPath: input.vaultPath,
            visibility: input.privacy === 'private' ? 'private' : 'public',
          });
        } catch (err) {
          console.warn('Failed to register container on backend server, proceeding locally', err);
        }
      }

      const id = serverSummary?.id || `cont-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const token =
        serverSummary?.key ||
        `lenta_jwt_${input.privacy === 'private' ? 'sec' : 'pub'}_${Math.random()
          .toString(36)
          .substring(2, 10)}_${Date.now().toString(36)}`;

      const boundFolders: BoundFolder[] = (input.boundFolders || [
        {
          path: input.vaultPath ? `${input.vaultPath}/Notes` : 'Obsidian_Notes',
          name: 'Главная папка',
          isPrimary: true,
          observeMode: 'recursive',
          privacy: input.privacy === 'private' ? 'private' : 'public',
        },
      ]).map((bf, idx) => ({
        id: `f-${Date.now()}-${idx}`,
        path: bf.path,
        name: bf.name || bf.path.split('/').pop() || bf.path,
        isPrimary: bf.isPrimary ?? idx === 0,
        observeMode: bf.observeMode || 'recursive',
        filterTag: bf.filterTag,
        notesCount: (bf as any).notesCount ?? 0,
        status: 'active',
        privacy: bf.privacy || (input.privacy === 'private' ? 'private' : 'public'),
      }));

      const newContainer: ObsidianContainer = {
        id,
        name: serverSummary?.name || input.name,
        description: serverSummary?.description || input.description,
        vaultPath: input.vaultPath,
        privacy: input.privacy,
        token,
        boundFolders,
        notesCount: serverSummary?.totalFiles || boundFolders.reduce((sum, f) => sum + (f.notesCount || 0), 0),
        createdAt: new Date().toISOString(),
        lastSyncedAt: new Date().toISOString(),
        status: 'connected',
        color: input.privacy === 'private' ? '#a855f7' : '#c9cd58',
        ...(serverSummary ? (serverSummary as any) : {}),
      };

      setContainers((prev) => [newContainer, ...prev]);
      return newContainer;
    },
    [isServerConnected]
  );

  const updateContainer = useCallback((id: string, updates: Partial<ObsidianContainer>) => {
    setContainers((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const updated = { ...c, ...updates };
        if (updates.privacy && !updates.color) {
          updated.color = updates.privacy === 'private' ? '#a855f7' : '#c9cd58';
        }
        return updated;
      })
    );
  }, []);

  const deleteContainer = useCallback(
    async (id: string) => {
      if (isServerConnected) {
        try {
          await containersApi.deleteContainer(id);
        } catch (err) {
          console.warn(`Could not delete container ${id} on backend server`, err);
        }
      }
      setContainers((prev) => prev.filter((c) => c.id !== id));
      setActiveContainerId((prev) => (prev === id ? null : prev));
    },
    [isServerConnected]
  );

  const checkContainerPrivacyChangeImpact = useCallback(
    (containerId: string): ContainerPrivacyImpact => {
      const container = containers.find((c) => c.id === containerId);
      if (!container) {
        return {
          containerId,
          containerName: '',
          currentPrivacy: 'private',
          targetPrivacy: 'public',
          hasConflict: false,
          conflictingFolders: [],
        };
      }

      const targetPrivacy: ContainerPrivacy = container.privacy === 'private' ? 'public' : 'private';
      // If switching from private to public, any private folders are conflicts
      const conflictingFolders =
        targetPrivacy === 'public'
          ? container.boundFolders.filter((f) => f.privacy === 'private')
          : [];

      return {
        containerId: container.id,
        containerName: container.name,
        currentPrivacy: container.privacy,
        targetPrivacy,
        hasConflict: conflictingFolders.length > 0,
        conflictingFolders,
      };
    },
    [containers]
  );

  const togglePrivacy = useCallback(
    (id: string, force = false): { success: boolean; impact?: ContainerPrivacyImpact } => {
      const impact = checkContainerPrivacyChangeImpact(id);
      if (impact.hasConflict && !force) {
        return { success: false, impact };
      }

      setContainers((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c;
          const newPrivacy: ContainerPrivacy = c.privacy === 'private' ? 'public' : 'private';
          return {
            ...c,
            privacy: newPrivacy,
            color: newPrivacy === 'private' ? '#a855f7' : '#c9cd58',
          };
        })
      );
      return { success: true, impact };
    },
    [checkContainerPrivacyChangeImpact]
  );

  const addBoundFolder = useCallback(
    (
      containerId: string,
      folder: {
        path: string;
        name?: string;
        isPrimary?: boolean;
        observeMode?: 'all' | 'filtered' | 'recursive';
        filterTag?: string;
        privacy?: FolderPrivacy;
        notesCount?: number;
      }
    ): { success: boolean; error?: string } => {
      const container = containers.find((c) => c.id === containerId);
      if (!container) {
        return { success: false, error: 'Container not found' };
      }

      // Rule: Public containers can ONLY contain public folders
      if (container.privacy === 'public' && folder.privacy === 'private') {
        return {
          success: false,
          error: 'Cannot add private folder to a public container. Public containers only accept public folders.',
        };
      }

      const cleanPath = folder.path.trim().replace(/^\/+|\/+$/g, '');
      const newFolder: BoundFolder = {
        id: `f-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        path: cleanPath,
        name: folder.name || cleanPath.split('/').pop() || cleanPath,
        isPrimary: folder.isPrimary ?? container.boundFolders.length === 0,
        observeMode: folder.observeMode || 'recursive',
        filterTag: folder.filterTag,
        notesCount: folder.notesCount ?? 0,
        status: 'active',
        privacy: folder.privacy || (container.privacy === 'private' ? 'private' : 'public'),
      };

      setContainers((prev) =>
        prev.map((c) => {
          if (c.id !== containerId) return c;
          const updatedFolders = folder.isPrimary
            ? c.boundFolders.map((f) => ({ ...f, isPrimary: false }))
            : c.boundFolders;

          return {
            ...c,
            boundFolders: [...updatedFolders, newFolder],
            notesCount: c.notesCount + (newFolder.notesCount || 0),
          };
        })
      );

      return { success: true };
    },
    [containers]
  );

  const removeBoundFolder = useCallback((containerId: string, folderId: string) => {
    setContainers((prev) =>
      prev.map((c) => {
        if (c.id !== containerId) return c;
        const folderToRemove = c.boundFolders.find((f) => f.id === folderId);
        const remaining = c.boundFolders.filter((f) => f.id !== folderId);
        if (remaining.length > 0 && !remaining.some((f) => f.isPrimary)) {
          remaining[0].isPrimary = true;
        }
        return {
          ...c,
          boundFolders: remaining,
          notesCount: Math.max(0, c.notesCount - (folderToRemove?.notesCount || 0)),
        };
      })
    );
  }, []);

  const updateBoundFolder = useCallback(
    (containerId: string, folderId: string, updates: Partial<BoundFolder>) => {
      setContainers((prev) =>
        prev.map((c) => {
          if (c.id !== containerId) return c;
          return {
            ...c,
            boundFolders: c.boundFolders.map((f) => {
              if (f.id !== folderId) {
                return updates.isPrimary ? { ...f, isPrimary: false } : f;
              }
              return { ...f, ...updates };
            }),
          };
        })
      );
    },
    []
  );

  const regenerateToken = useCallback((containerId: string): string => {
    const newToken = `lenta_jwt_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;
    setContainers((prev) =>
      prev.map((c) => (c.id === containerId ? { ...c, token: newToken } : c))
    );
    return newToken;
  }, []);

  const triggerSync = useCallback(
    async (containerId: string) => {
      setIsSyncingId(containerId);
      setSyncDirection('push');
      updateContainer(containerId, { status: 'syncing' });

      await new Promise((resolve) => setTimeout(resolve, 1200));

      setContainers((prev) =>
        prev.map((c) => {
          if (c.id !== containerId) return c;
          const added = Math.floor(Math.random() * 3);
          return {
            ...c,
            status: 'connected',
            lastSyncedAt: new Date().toISOString(),
            notesCount: c.notesCount + added,
          };
        })
      );

      setPendingChanges((prev) => ({ ...prev, [containerId]: 0 }));
      setIsSyncingId(null);
      setSyncDirection(null);
    },
    [updateContainer]
  );

  const pushContainer = useCallback(
    async (containerId: string) => {
      setIsSyncingId(containerId);
      setSyncDirection('push');
      updateContainer(containerId, { status: 'syncing' });

      if (isServerConnected) {
        try {
          await containersApi.pushContainer(containerId, { message: 'Web app manual push sync' });
        } catch (err) {
          console.warn(`Server push failed for ${containerId}`, err);
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      setContainers((prev) =>
        prev.map((c) => {
          if (c.id !== containerId) return c;
          return {
            ...c,
            status: 'connected',
            lastSyncedAt: new Date().toISOString(),
          };
        })
      );

      setPendingChanges((prev) => ({ ...prev, [containerId]: 0 }));
      setIsSyncingId(null);
      setSyncDirection(null);
    },
    [isServerConnected, updateContainer]
  );

  const pullContainer = useCallback(
    async (containerId: string) => {
      setIsSyncingId(containerId);
      setSyncDirection('pull');
      updateContainer(containerId, { status: 'syncing' });

      let pulledFilesCount = 0;
      if (isServerConnected) {
        try {
          const res = await containersApi.pullContainer(containerId, {});
          pulledFilesCount = res.files?.length || 0;
        } catch (err) {
          console.warn(`Server pull failed for ${containerId}`, err);
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      setContainers((prev) =>
        prev.map((c) => {
          if (c.id !== containerId) return c;
          const added = pulledFilesCount || Math.floor(Math.random() * 3) + 1;
          return {
            ...c,
            status: 'connected',
            lastSyncedAt: new Date().toISOString(),
            notesCount: c.notesCount + added,
          };
        })
      );

      setIsSyncingId(null);
      setSyncDirection(null);
    },
    [isServerConnected, updateContainer]
  );

  return (
    <ObsidianContainersContext.Provider
      value={{
        containers,
        activeContainer,
        setActiveContainerId,
        selectedContainerIds,
        selectedContainers,
        toggleSelectContainer,
        selectAllContainers,
        deselectAllContainers,
        selectedContainersCount,
        selectedContainersTotalNotes,
        isServerConnected,
        isServerLoading,
        refetchContainers,
        addContainer,
        updateContainer,
        deleteContainer,
        togglePrivacy,
        checkContainerPrivacyChangeImpact,
        addBoundFolder,
        removeBoundFolder,
        updateBoundFolder,
        regenerateToken,
        triggerSync,
        pushContainer,
        pullContainer,
        isSyncingId,
        syncDirection,
        pendingChanges,
      }}
    >
      {children}
    </ObsidianContainersContext.Provider>
  );
};

export const useObsidianContainers = () => {
  const context = useContext(ObsidianContainersContext);
  if (!context) {
    throw new Error('useObsidianContainers must be used within an ObsidianContainersProvider');
  }
  return context;
};

