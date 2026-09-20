import { writable, type Writable } from 'svelte/store';

export interface SetStore extends Writable<Set<string>> {
  add(item: string): void;
  delete(item: string): void;
  toggle(item: string): void;
  clear(): void;
  has(item: string): boolean;
}

/**
 * Creates a reactive Set store that automatically triggers updates
 * when items are added, deleted, or toggled, without needing manual `set = new Set(set)`.
 */
export function createSetStore(initialItems: string[] = []): SetStore {
  const store = writable<Set<string>>(new Set(initialItems));

  let currentSet = new Set(initialItems);
  store.subscribe((val) => {
    currentSet = val;
  });

  return {
    subscribe: store.subscribe,
    set: (val: Set<string>) => {
      currentSet = val;
      store.set(val);
    },
    update: store.update,
    add: (item: string) => {
      store.update((s) => {
        s.add(item);
        return new Set(s);
      });
    },
    delete: (item: string) => {
      store.update((s) => {
        s.delete(item);
        return new Set(s);
      });
    },
    toggle: (item: string) => {
      store.update((s) => {
        if (s.has(item)) {
          s.delete(item);
        } else {
          s.add(item);
        }
        return new Set(s);
      });
    },
    clear: () => {
      store.set(new Set());
    },
    has: (item: string) => currentSet.has(item),
  };
}

export interface ObsidianBridge {
  openAiQuickAdd?(folderPath?: string, date?: string): void;
  openQuickAdd(folderId?: string, folderPath?: string): void;
  openCreateFolder(parentFolderId?: string, parentFolderPath?: string, defaultPrivacy?: any, containerId?: string): void;
  openQuickAddForContainer(containerId: string, containerName?: string, folderPath?: string, initialDate?: string): void;
  openCreateFolderForContainer(containerId: string, containerName?: string, parentFolderId?: string, parentFolderPath?: string): void;
  openSyncModal(mode?: 'push' | 'pull'): void;
  openConnectionsModal?(): void;
  openNoteInVault(path: string): Promise<void>;
  refreshData(): Promise<void>;
  saveSettings(): Promise<void>;
  loadContainerFiles(containerId: string): Promise<void>;
  loadFolderNotes(folderId: string, folderPath: string): Promise<void>;
  loadFeedNotes(feedId: string, feedSlug: string): Promise<void>;
  connectKey(key: string): Promise<void>;
  disconnectKey(): Promise<void>;
  toggleContainerConnect?(containerId: string): Promise<void>;
}
