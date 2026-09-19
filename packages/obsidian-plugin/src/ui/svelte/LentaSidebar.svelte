<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { slide } from 'svelte/transition';
  import { setIcon, Notice } from 'obsidian';
  import type {
    LentaPluginSettings,
    LentaContainerSummaryDto,
    LentaFolderDto,
    LentaFeedDto,
    LentaNoteDto,
  } from '../../types';
  import ContainerCard from './ContainerCard.svelte';
  import type { FlattenedTreeNode } from './tree-flattener';
  import { isContainerPublic } from '../../utils/container-privacy';
  import { createSetStore, type ObsidianBridge } from './sidebar-store';

  export let settings: LentaPluginSettings;
  export let containers: LentaContainerSummaryDto[] = [];
  export let folders: LentaFolderDto[] = [];
  export let feeds: LentaFeedDto[] = [];
  export let containerFilesList: Map<string, Array<{ path: string; content?: string; mtime?: number; size?: number }>> = new Map();
  export let containerFoldersList: Map<string, LentaFolderDto[]> = new Map();
  export let folderPreviewNotes: Map<string, LentaNoteDto[]> = new Map();
  export let feedNotesList: Map<string, LentaNoteDto[]> = new Map();
  export let isLoading = false;

  // Unified host bridge (preferred)
  export let bridge: ObsidianBridge | undefined = undefined;

  // Backwards-compatible legacy props (used if bridge is not provided)
  export let onOpenQuickAdd: ((folderId?: string, folderPath?: string) => void) | undefined = undefined;
  export let onOpenCreateFolder: ((parentFolderId?: string, parentFolderPath?: string, defaultPrivacy?: any, containerId?: string) => void) | undefined = undefined;
  export let onOpenQuickAddForContainer: ((containerId: string, containerName?: string, folderPath?: string, initialDate?: string) => void) | undefined = undefined;
  export let onOpenCreateFolderForContainer: ((containerId: string, containerName?: string, parentFolderId?: string, parentFolderPath?: string) => void) | undefined = undefined;
  export let onOpenSyncModal: ((mode?: 'push' | 'pull') => void) | undefined = undefined;
  export let onOpenConnectionsModal: (() => void) | undefined = undefined;
  export let onRefreshData: (() => Promise<void>) | undefined = undefined;
  export let onSaveSettings: (() => Promise<void>) | undefined = undefined;
  export let onOpenNoteInVault: ((path: string) => Promise<void>) | undefined = undefined;
  export let onLoadContainerFiles: ((containerId: string) => Promise<void>) | undefined = undefined;
  export let onLoadFolderNotes: ((folderId: string, folderPath: string) => Promise<void>) | undefined = undefined;
  export let onLoadFeedNotes: ((feedId: string, feedSlug: string) => Promise<void>) | undefined = undefined;

  // Bridge dispatch helpers
  const api = {
    quickAdd: (fId?: string, fPath?: string) =>
      bridge?.openQuickAdd ? bridge.openQuickAdd(fId, fPath) : onOpenQuickAdd?.(fId, fPath),
    createFolder: (pFId?: string, pFPath?: string, p?: any, cId?: string) =>
      bridge?.openCreateFolder ? bridge.openCreateFolder(pFId, pFPath, p, cId) : onOpenCreateFolder?.(pFId, pFPath, p, cId),
    quickAddContainer: (cId: string, name?: string, path?: string, d?: string) =>
      bridge?.openQuickAddForContainer ? bridge.openQuickAddForContainer(cId, name, path, d) : onOpenQuickAddForContainer?.(cId, name, path, d),
    createFolderContainer: (cId: string, name?: string, pId?: string, pPath?: string) =>
      bridge?.openCreateFolderForContainer ? bridge.openCreateFolderForContainer(cId, name, pId, pPath) : onOpenCreateFolderForContainer?.(cId, name, pId, pPath),
    syncModal: (mode?: 'push' | 'pull') =>
      bridge?.openSyncModal ? bridge.openSyncModal(mode) : onOpenSyncModal?.(mode),
    connectionsModal: () =>
      bridge?.openConnectionsModal ? bridge.openConnectionsModal() : onOpenConnectionsModal?.(),
    openNote: (path: string) =>
      bridge?.openNoteInVault ? bridge.openNoteInVault(path) : onOpenNoteInVault?.(path),
    refresh: () =>
      bridge?.refreshData ? bridge.refreshData() : onRefreshData?.(),
    loadFiles: (cId: string) =>
      bridge?.loadContainerFiles ? bridge.loadContainerFiles(cId) : onLoadContainerFiles?.(cId),
    loadFolderNotes: (fId: string, path: string) =>
      bridge?.loadFolderNotes ? bridge.loadFolderNotes(fId, path) : onLoadFolderNotes?.(fId, path),
    loadFeedNotes: (fId: string, slug: string) =>
      bridge?.loadFeedNotes ? bridge.loadFeedNotes(fId, slug) : onLoadFeedNotes?.(fId, slug),
    connectKey: async (k: string) => {
      if (bridge?.connectKey) {
        await bridge.connectKey(k);
      } else {
        settings.containerKey = k;
        if (!settings.activeContainerIds) settings.activeContainerIds = [];
        if (!settings.activeContainerIds.includes(k)) settings.activeContainerIds.unshift(k);
        settings.activeContainerId = k;
        if (onSaveSettings) await onSaveSettings();
        if (onRefreshData) await onRefreshData();
      }
    },
    disconnectKey: async () => {
      if (bridge?.disconnectKey) {
        await bridge.disconnectKey();
      } else {
        settings.containerKey = '';
        settings.activeContainerIds = [];
        settings.activeContainerId = '';
        settings.connectedContainerName = '';
        if (onSaveSettings) await onSaveSettings();
        if (onRefreshData) await onRefreshData();
      }
    },
    toggleConnect: async (containerId: string) => {
      if (bridge?.toggleContainerConnect) {
        await bridge.toggleContainerConnect(containerId);
      } else {
        let currentIds = Array.isArray(settings.activeContainerIds) ? [...settings.activeContainerIds] : [];
        if (currentIds.includes(containerId)) {
          currentIds = currentIds.filter((id) => id !== containerId);
          new Notice(`Отключен контейнер: ${containerId}`);
        } else {
          currentIds.push(containerId);
          new Notice(`Подключен контейнер: ${containerId}`);
        }
        settings.activeContainerIds = currentIds;
        settings.activeContainerId = currentIds[0] || '';
        if (onSaveSettings) await onSaveSettings();
      }
    },
  };

  // Modern Reactive Stores for accordion / expanded sets
  const expandedPreviews = createSetStore();
  const expandedContainerFolders = createSetStore();
  const loadingContainerFiles = createSetStore();
  const loadingFolderNotes = createSetStore();
  const loadingPreviewNotes = createSetStore();

  // Local UI State
  let sidebarMode: 'notes' | 'containers' = 'containers';
  let activeTab: 'folders' | 'feeds' = 'folders';
  let scopeFilter: 'my' | 'public' = 'my';
  let searchQuery = '';
  let keyInputText = '';
  let scrollContainerEl: HTMLElement;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const todayHumanStr = today.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

  function obsIcon(node: HTMLElement, iconName: string) {
    if (iconName) setIcon(node, iconName);
    return {
      update(newIconName: string) {
        node.empty();
        if (newIconName) setIcon(node, newIconName);
      },
    };
  }

  function onKeyAction(e: KeyboardEvent, action: () => void) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  }

  // Reactive Derived Values
  $: selectedCount = Array.isArray(settings?.activeContainerIds) && settings.activeContainerIds.length > 0
    ? settings.activeContainerIds.length
    : settings?.activeContainerId ? 1 : 0;

  $: currentKey = settings?.containerKey || (settings?.activeContainerIds && settings.activeContainerIds[0]) || '';

  $: myContainers = containers.filter((c) => !isContainerPublic(c));
  $: publicContainers = containers.filter((c) => isContainerPublic(c));
  $: scopedContainers = scopeFilter === 'my' ? myContainers : publicContainers;

  $: displayedContainers = searchQuery.trim()
    ? scopedContainers.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        c.id.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : scopedContainers;

  $: displayedFolders = searchQuery.trim()
    ? folders.filter((f) =>
        f.path.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        f.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : folders;

  $: displayedFeeds = searchQuery.trim()
    ? feeds.filter((feed) =>
        feed.title.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        feed.slug.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : feeds;

  async function handleToggleContainerExpand(containerId: string) {
    const previewKey = `container-${containerId}`;
    if ($expandedPreviews.has(previewKey)) {
      expandedPreviews.delete(previewKey);
    } else {
      expandedPreviews.add(previewKey);
      if (!containerFilesList.has(containerId) && !$loadingContainerFiles.has(containerId)) {
        loadingContainerFiles.add(containerId);
        try {
          await api.loadFiles(containerId);
        } finally {
          loadingContainerFiles.delete(containerId);
        }
      }
    }
  }

  async function handleToggleFolder(item: FlattenedTreeNode) {
    expandedContainerFolders.toggle(item.id);
  }

  async function handleToggleFolderNotes(folder: LentaFolderDto) {
    const previewKey = `folder-${folder.id}`;
    if ($expandedPreviews.has(previewKey)) {
      expandedPreviews.delete(previewKey);
    } else {
      expandedPreviews.add(previewKey);
      if (!folderPreviewNotes.has(folder.id) && !$loadingFolderNotes.has(folder.id)) {
        loadingFolderNotes.add(folder.id);
        try {
          await api.loadFolderNotes(folder.id, folder.path);
        } finally {
          loadingFolderNotes.delete(folder.id);
        }
      }
    }
  }

  async function handleToggleFeedNotes(feed: LentaFeedDto) {
    const previewKey = `feed-${feed.id}`;
    if ($expandedPreviews.has(previewKey)) {
      expandedPreviews.delete(previewKey);
    } else {
      expandedPreviews.add(previewKey);
      if (!feedNotesList.has(feed.id) && !$loadingPreviewNotes.has(feed.id)) {
        loadingPreviewNotes.add(feed.id);
        try {
          await api.loadFeedNotes(feed.id, feed.slug);
        } finally {
          loadingPreviewNotes.delete(feed.id);
        }
      }
    }
  }

  function handleCollapseAll() {
    expandedPreviews.clear();
    expandedContainerFolders.clear();
    new Notice('🍋 Все папки и контейнеры свернуты');
  }

  async function handleConnectKeySubmit() {
    const key = keyInputText.trim();
    if (!key) {
      new Notice('Please enter a container key');
      return;
    }
    await api.connectKey(key);
    keyInputText = '';
  }

  async function handleDisconnectKey() {
    await api.disconnectKey();
  }
</script>

<div class="lenta-sidebar-container">
  <!-- 1. Toolbar Header -->
  <header class="lenta-sidebar-header">
    <div class="lenta-sidebar-title">
      <h4 class="lenta-title-text">🍋 Project Lenta</h4>
      {#if selectedCount > 0}
        <span class="lenta-badge" title="Connected containers ({selectedCount}): {settings.activeContainerIds?.join(', ')}">
          CONTAINERS: {selectedCount}
        </span>
      {/if}
    </div>

    <nav class="lenta-sidebar-toolbar" aria-label="Lenta actions">
      <button
        type="button"
        class="clickable-icon"
        aria-label="Quick Add Note"
        on:click={() => api.quickAdd()}
        use:obsIcon={'plus'}
      ></button>

      <button
        type="button"
        class="clickable-icon"
        aria-label="New Folder"
        on:click={() => api.createFolder()}
        use:obsIcon={'folder-plus'}
      ></button>

      <button
        type="button"
        class="clickable-icon"
        aria-label="Pull from Lenta Server (⬇)"
        on:click={() => api.syncModal('pull')}
        use:obsIcon={'download'}
      ></button>

      <button
        type="button"
        class="clickable-icon"
        aria-label="Push Changed to Server (⬆)"
        on:click={() => api.syncModal('push')}
        use:obsIcon={'upload'}
      ></button>

      <button
        type="button"
        class="clickable-icon"
        aria-label="Sync Hub"
        on:click={() => api.syncModal('push')}
        use:obsIcon={'zap'}
      ></button>

      {#if bridge?.openConnectionsModal || onOpenConnectionsModal}
        <button
          type="button"
          class="clickable-icon"
          aria-label="Connections & Auth"
          on:click={() => api.connectionsModal()}
          use:obsIcon={'link-2'}
        ></button>
      {/if}

      <button
        type="button"
        class="clickable-icon"
        aria-label="Скрыть все (Collapse all)"
        on:click={handleCollapseAll}
        use:obsIcon={'chevrons-down-up'}
      ></button>

      <button
        type="button"
        class="clickable-icon"
        aria-label="Refresh Data"
        on:click={() => api.refresh()}
        use:obsIcon={'refresh-cw'}
      ></button>
    </nav>
  </header>

  <!-- 2. Search & Filter Bar -->
  <div class="lenta-search-container">
    <div class="lenta-search-input-wrap">
      <span class="lenta-search-icon" use:obsIcon={'search'}></span>
      <input
        type="text"
        class="lenta-search-input"
        placeholder="Search notes, folders, containers..."
        bind:value={searchQuery}
      />
      {#if searchQuery}
        <button
          type="button"
          class="lenta-search-clear clickable-icon"
          aria-label="Clear search"
          on:click={() => (searchQuery = '')}
        >
          ×
        </button>
      {/if}
    </div>
  </div>

  <!-- 3. Mode Switcher (Notes vs Containers) -->
  <div class="lenta-mode-switcher" role="tablist" aria-label="Sidebar view mode">
    <button
      type="button"
      role="tab"
      aria-selected={sidebarMode === 'notes'}
      class="lenta-mode-tab {sidebarMode === 'notes' ? 'is-active' : ''}"
      on:click={() => (sidebarMode = 'notes')}
    >
      📝 Notes
    </button>
    <button
      type="button"
      role="tab"
      aria-selected={sidebarMode === 'containers'}
      class="lenta-mode-tab {sidebarMode === 'containers' ? 'is-active' : ''}"
      on:click={() => (sidebarMode = 'containers')}
    >
      📦 Containers
    </button>
  </div>

  <!-- 4. Scrollable Central Content -->
  {#if sidebarMode === 'containers'}
    <!-- Key Authentication Card -->
    <div class="lenta-inline-key-card">
      {#if currentKey}
        <div class="lenta-key-connected-row">
          <span class="lenta-key-badge" title="Active container key: {currentKey}">
            🔑 Connected: {settings.connectedContainerName || currentKey.slice(0, 18)}
          </span>
          <button type="button" class="lenta-key-action-btn mod-warning" on:click={handleDisconnectKey}>
            Disconnect Key
          </button>
        </div>
      {:else}
        <div class="lenta-key-input-wrap">
          <input
            type="text"
            placeholder="🔑 Enter private container key..."
            bind:value={keyInputText}
            class="lenta-key-input"
            on:keydown={(e) => {
              if (e.key === 'Enter') handleConnectKeySubmit();
            }}
          />
          <button type="button" class="lenta-key-submit-btn" on:click={handleConnectKeySubmit}>
            Connect
          </button>
        </div>
      {/if}
    </div>

    <!-- Scope Filter Bar -->
    <div class="lenta-scope-filter-bar" role="radiogroup" aria-label="Container privacy filter">
      <button
        type="button"
        role="radio"
        aria-checked={scopeFilter === 'my'}
        class="lenta-scope-pill {scopeFilter === 'my' ? 'active' : ''}"
        on:click={() => (scopeFilter = 'my')}
      >
        🔒 My Containers
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={scopeFilter === 'public'}
        class="lenta-scope-pill {scopeFilter === 'public' ? 'active' : ''}"
        on:click={() => (scopeFilter = 'public')}
      >
        🌐 Public Containers
      </button>
    </div>

    <!-- Virtualized/Windowed Containers List -->
    <div
      class="lenta-sidebar-content"
      bind:this={scrollContainerEl}
    >
      {#if isLoading}
        <div class="lenta-loading-text">⏳ Loading containers...</div>
      {:else if displayedContainers.length === 0}
        <div class="lenta-preview-empty">
          {#if searchQuery}
            🔍 No containers match "{searchQuery}"
            <button type="button" class="lenta-empty-action-link" on:click={() => (searchQuery = '')}>
              Clear search
            </button>
          {:else}
            {scopeFilter === 'my' ? '🔒 No personal containers found.' : '🌐 No public containers available.'}
          {/if}
        </div>
      {:else}
        {#each displayedContainers as c (c.id)}
          <ContainerCard
            container={c}
            isExpanded={$expandedPreviews.has(`container-${c.id}`)}
            isActiveContainer={Array.isArray(settings.activeContainerIds) && settings.activeContainerIds.includes(c.id)}
            isLoadingFiles={$loadingContainerFiles.has(c.id)}
            files={containerFilesList.get(c.id)}
            folders={containerFoldersList.get(c.id)}
            expandedFolders={$expandedContainerFolders}
            {todayStr}
            {todayHumanStr}
            scrollContainer={scrollContainerEl}
            on:toggleExpand={() => handleToggleContainerExpand(c.id)}
            on:toggleConnect={() => api.toggleConnect(c.id)}
            on:addNote={(e) => api.quickAddContainer(e.detail.containerId, e.detail.containerName, e.detail.folderPath, e.detail.initialDate)}
            on:addFolder={(e) => api.createFolderContainer(e.detail.containerId, e.detail.containerName, undefined, e.detail.parentFolderPath)}
            on:openNote={(e) => api.openNote(e.detail.item.path)}
            on:toggleFolder={(e) => handleToggleFolder(e.detail.item)}
          />
        {/each}
      {/if}
    </div>

    <!-- Sticky Bottom Footer for Containers -->
    <footer class="lenta-sidebar-footer">
      <button
        type="button"
        class="lenta-footer-action-btn"
        on:click={() => api.syncModal('push')}
      >
        ⚡ Sync
      </button>
      <button
        type="button"
        class="lenta-footer-action-btn"
        on:click={() => api.createFolder(undefined, undefined, 'obsidian', settings.activeContainerId || containers[0]?.id)}
      >
        + Folder 📁
      </button>
      <button
        type="button"
        class="lenta-footer-action-btn"
        on:click={() => {
          const activeContainer = containers.find((c) => c.id === settings.activeContainerId) || containers[0];
          if (activeContainer) {
            api.quickAddContainer(activeContainer.id, activeContainer.name);
          } else {
            api.quickAdd();
          }
        }}
      >
        + Note +
      </button>
    </footer>

  {:else}
    <!-- Notes Mode -->
    <div class="lenta-sidebar-tabs" role="tablist" aria-label="Notes sub-navigation">
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'folders'}
        class="lenta-tab {activeTab === 'folders' ? 'active' : ''}"
        on:click={() => (activeTab = 'folders')}
      >
        Folders
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'feeds'}
        class="lenta-tab {activeTab === 'feeds' ? 'active' : ''}"
        on:click={() => (activeTab = 'feeds')}
      >
        Feeds
      </button>
    </div>

    <!-- Scope Filter Bar -->
    <div class="lenta-scope-filter-bar" role="radiogroup" aria-label="Scope filter">
      <button
        type="button"
        role="radio"
        aria-checked={scopeFilter === 'my'}
        class="lenta-scope-pill {scopeFilter === 'my' ? 'active' : ''}"
        on:click={() => (scopeFilter = 'my')}
      >
        {activeTab === 'folders' ? '🔒 My Folders' : '🔒 My Feeds'}
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={scopeFilter === 'public'}
        class="lenta-scope-pill {scopeFilter === 'public' ? 'active' : ''}"
        on:click={() => (scopeFilter = 'public')}
      >
        {activeTab === 'folders' ? '🌐 Public Folders' : '🌐 Public Feeds'}
      </button>
    </div>

    <!-- Scrollable Notes/Folders Content -->
    <div
      class="lenta-sidebar-content"
      bind:this={scrollContainerEl}
    >
      {#if isLoading}
        <div class="lenta-loading-text">⏳ Loading hierarchy...</div>
      {:else if activeTab === 'folders'}
        <div class="lenta-tree-list">
          {#if displayedFolders.length === 0}
            <div class="lenta-preview-empty">
              {#if searchQuery}
                🔍 No folders match "{searchQuery}"
                <button type="button" class="lenta-empty-action-link" on:click={() => (searchQuery = '')}>
                  Clear search
                </button>
              {:else}
                📁 No folders found.
              {/if}
            </div>
          {:else}
            {#each displayedFolders as folder (folder.id)}
              <div class="lenta-tree-item lenta-tree-item-folder">
                <div
                  class="lenta-folder-header-row"
                  role="button"
                  tabindex="0"
                  on:click={() => handleToggleFolderNotes(folder)}
                  on:keydown={(e) => onKeyAction(e, () => handleToggleFolderNotes(folder))}
                >
                  <span class="lenta-item-icon" use:obsIcon={folder.icon || 'folder'}></span>
                  <span class="lenta-item-name">{folder.path}</span>
                  {#if folder.noteCount !== undefined && folder.noteCount !== null}
                    <span class="lenta-count-pill">{folder.noteCount}</span>
                  {/if}
                  <button
                    type="button"
                    class="lenta-folder-add-note clickable-icon"
                    aria-label="+ Добавить заметку в {folder.path}"
                    on:click|stopPropagation={() => api.quickAdd(folder.id, folder.path)}
                    use:obsIcon={'plus'}
                  ></button>
                  <span
                    class="lenta-preview-toggle clickable-icon"
                    use:obsIcon={$expandedPreviews.has(`folder-${folder.id}`) ? 'chevron-up' : 'chevron-down'}
                  ></span>
                </div>

                {#if $expandedPreviews.has(`folder-${folder.id}`)}
                  <div class="lenta-markdown-preview-pane" transition:slide={{ duration: 150 }}>
                    {#if $loadingFolderNotes.has(folder.id)}
                      <div class="lenta-preview-loading">⏳ Loading notes in "{folder.name}"...</div>
                    {:else if !folderPreviewNotes.get(folder.id) || folderPreviewNotes.get(folder.id)?.length === 0}
                      <div class="lenta-preview-empty">📭 No notes in this folder yet.</div>
                    {:else}
                      <div class="lenta-notes-list">
                        {#each (folderPreviewNotes.get(folder.id) || []).slice(0, 50) as note (note.id)}
                          <div
                            class="lenta-note-row"
                            role="button"
                            tabindex="0"
                            on:click={() => api.openNote(note.filePath || note.title + '.md')}
                            on:keydown={(e) => onKeyAction(e, () => api.openNote(note.filePath || note.title + '.md'))}
                          >
                            <span class="lenta-item-icon lenta-note-icon" use:obsIcon={note.icon || 'file-text'}></span>
                            <span class="lenta-note-title">{note.title}</span>
                            {#if note.startDate}
                              <span class="lenta-note-date">{note.startDate.slice(0, 10)}</span>
                            {/if}
                          </div>
                        {/each}
                      </div>
                    {/if}
                  </div>
                {/if}
              </div>
            {/each}
          {/if}
        </div>
      {:else}
        <!-- Feeds list -->
        <div class="lenta-tree-list">
          {#if displayedFeeds.length === 0}
            <div class="lenta-preview-empty">
              {#if searchQuery}
                🔍 No feeds match "{searchQuery}"
                <button type="button" class="lenta-empty-action-link" on:click={() => (searchQuery = '')}>
                  Clear search
                </button>
              {:else}
                📡 No feeds found.
              {/if}
            </div>
          {:else}
            {#each displayedFeeds as feed (feed.id)}
              <div class="lenta-tree-item lenta-tree-item-feed">
                <div
                  class="lenta-feed-header-row"
                  role="button"
                  tabindex="0"
                  on:click={() => handleToggleFeedNotes(feed)}
                  on:keydown={(e) => onKeyAction(e, () => handleToggleFeedNotes(feed))}
                >
                  <span class="lenta-item-icon" use:obsIcon={'rss'}></span>
                  <span class="lenta-item-name">{feed.title}</span>
                  <span
                    class="lenta-preview-toggle clickable-icon"
                    use:obsIcon={$expandedPreviews.has(`feed-${feed.id}`) ? 'chevron-up' : 'chevron-down'}
                  ></span>
                </div>

                {#if $expandedPreviews.has(`feed-${feed.id}`)}
                  <div class="lenta-markdown-preview-pane" transition:slide={{ duration: 150 }}>
                    {#if $loadingPreviewNotes.has(feed.id)}
                      <div class="lenta-preview-loading">⏳ Loading notes in feed...</div>
                    {:else if !feedNotesList.get(feed.id) || feedNotesList.get(feed.id)?.length === 0}
                      <div class="lenta-preview-empty">📭 No notes in this feed yet.</div>
                    {:else}
                      <div class="lenta-notes-list">
                        {#each (feedNotesList.get(feed.id) || []).slice(0, 50) as note (note.id)}
                          <div
                            class="lenta-note-row"
                            role="button"
                            tabindex="0"
                            on:click={() => api.openNote(note.filePath || note.title + '.md')}
                            on:keydown={(e) => onKeyAction(e, () => api.openNote(note.filePath || note.title + '.md'))}
                          >
                            <span class="lenta-item-icon lenta-note-icon" use:obsIcon={note.icon || 'file-text'}></span>
                            <span class="lenta-note-title">{note.title}</span>
                          </div>
                        {/each}
                      </div>
                    {/if}
                  </div>
                {/if}
              </div>
            {/each}
          {/if}
        </div>
      {/if}
    </div>

    <!-- Sticky Bottom Footer for Notes Mode -->
    <footer class="lenta-sidebar-footer">
      <button
        type="button"
        class="lenta-footer-action-btn"
        on:click={() => api.syncModal('push')}
      >
        ⚡ Sync
      </button>
      <button
        type="button"
        class="lenta-footer-action-btn"
        on:click={() => api.createFolder()}
      >
        + Папка 📁
      </button>
      <button
        type="button"
        class="lenta-footer-action-btn"
        on:click={() => api.quickAdd()}
      >
        + Заметка +
      </button>
    </footer>
  {/if}
</div>

<style>
  .lenta-sidebar-container {
    min-width: 300px;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 10px 12px;
    box-sizing: border-box;
    font-size: var(--font-ui-small);
  }

  .lenta-sidebar-header {
    flex-shrink: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .lenta-sidebar-title {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .lenta-title-text {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    color: var(--lenta-lemon, #f9c74f);
  }

  .lenta-badge {
    font-size: 0.7rem;
    background: var(--interactive-accent);
    color: var(--text-on-accent);
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 600;
    white-space: nowrap;
  }

  .lenta-sidebar-toolbar {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .lenta-search-container {
    flex-shrink: 0;
    margin-bottom: 8px;
  }

  .lenta-search-input-wrap {
    position: relative;
    display: flex;
    align-items: center;
    background: var(--background-modifier-form-field);
    border: 1px solid var(--background-modifier-border);
    border-radius: 6px;
    padding: 0 8px;
  }

  .lenta-search-input-wrap:focus-within {
    border-color: var(--interactive-accent);
  }

  .lenta-search-icon {
    display: flex;
    align-items: center;
    color: var(--text-muted);
    font-size: 0.85rem;
    margin-right: 6px;
  }

  .lenta-search-input {
    flex: 1;
    border: none;
    background: transparent;
    padding: 6px 0;
    font-size: 0.82rem;
    color: var(--text-normal);
    outline: none;
  }

  .lenta-search-clear {
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
    padding: 2px 4px;
    color: var(--text-muted);
  }

  .lenta-search-clear:hover {
    color: var(--text-normal);
  }

  .lenta-mode-switcher {
    flex-shrink: 0;
    display: flex;
    gap: 4px;
    background: var(--background-secondary);
    padding: 3px;
    border-radius: 8px;
    margin-bottom: 8px;
  }

  .lenta-mode-tab {
    flex: 1;
    text-align: center;
    padding: 5px 8px;
    font-size: 0.8rem;
    font-weight: 600;
    border: none;
    background: transparent;
    border-radius: 6px;
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .lenta-mode-tab:hover {
    color: var(--text-normal);
  }

  .lenta-mode-tab.is-active {
    background: var(--interactive-accent);
    color: var(--text-on-accent);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  }

  .lenta-sidebar-tabs {
    flex-shrink: 0;
    display: flex;
    gap: 4px;
    margin-bottom: 6px;
  }

  .lenta-tab {
    flex: 1;
    padding: 4px 8px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 6px;
    background: var(--background-secondary);
    color: var(--text-muted);
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 500;
    transition: all 0.15s ease;
  }

  .lenta-tab.active {
    background: var(--interactive-accent);
    color: var(--text-on-accent);
    border-color: var(--interactive-accent);
  }

  .lenta-scope-filter-bar {
    flex-shrink: 0;
    display: flex;
    gap: 6px;
    margin-bottom: 8px;
  }

  .lenta-scope-pill {
    flex: 1;
    padding: 4px 6px;
    font-size: 0.75rem;
    font-weight: 500;
    border-radius: 5px;
    border: 1px solid var(--background-modifier-border);
    background: var(--background-secondary);
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .lenta-scope-pill.active {
    border-color: var(--interactive-accent);
    color: var(--text-normal);
    background: var(--background-modifier-active-hover);
    font-weight: 600;
  }

  .lenta-inline-key-card {
    flex-shrink: 0;
    margin-bottom: 8px;
  }

  .lenta-key-connected-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    background: var(--background-secondary);
    border-radius: 6px;
    border: 1px solid var(--background-modifier-border);
  }

  .lenta-key-badge {
    font-size: 0.78rem;
    font-weight: 500;
    color: var(--text-normal);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .lenta-key-action-btn {
    padding: 3px 8px;
    font-size: 0.75rem;
    border-radius: 4px;
    border: 1px solid var(--background-modifier-border);
    cursor: pointer;
  }

  .lenta-key-action-btn.mod-warning {
    color: var(--text-error, #f05252);
    background: transparent;
  }

  .lenta-key-action-btn.mod-warning:hover {
    background: var(--background-modifier-error-hover, rgba(240, 82, 82, 0.1));
  }

  .lenta-key-input-wrap {
    display: flex;
    gap: 6px;
  }

  .lenta-key-input {
    flex: 1;
    padding: 5px 8px;
    font-size: 0.8rem;
    border-radius: 6px;
    border: 1px solid var(--background-modifier-border);
    background: var(--background-modifier-form-field);
    color: var(--text-normal);
  }

  .lenta-key-submit-btn {
    padding: 5px 12px;
    font-size: 0.8rem;
    font-weight: 600;
    border-radius: 6px;
    border: none;
    background: var(--interactive-accent);
    color: var(--text-on-accent);
    cursor: pointer;
  }

  .lenta-sidebar-content {
    flex: 1 1 auto;
    overflow-y: auto;
    overflow-x: hidden;
    min-height: 0;
    padding-right: 4px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .lenta-sidebar-footer {
    flex-shrink: 0;
    margin-top: auto;
    padding-top: 8px;
    border-top: 1px solid var(--background-modifier-border);
    display: flex;
    gap: 6px;
  }

  .lenta-footer-action-btn {
    flex: 1;
    padding: 6px 10px;
    font-size: 0.8rem;
    font-weight: 600;
    background: var(--interactive-normal);
    border-radius: 6px;
    border: 1px solid var(--background-modifier-border);
    color: var(--text-normal);
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .lenta-footer-action-btn:hover {
    background: var(--interactive-hover);
  }

  .lenta-tree-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .lenta-tree-item {
    border-radius: 6px;
    border: 1px solid var(--background-modifier-border);
    background: var(--background-secondary);
    overflow: hidden;
  }

  .lenta-folder-header-row,
  .lenta-feed-header-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    cursor: pointer;
    user-select: none;
  }

  .lenta-folder-header-row:hover,
  .lenta-feed-header-row:hover {
    background: var(--background-modifier-hover);
  }

  .lenta-item-name {
    flex: 1;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .lenta-count-pill {
    font-size: 0.72rem;
    background: var(--background-modifier-border);
    color: var(--text-muted);
    padding: 1px 6px;
    border-radius: 10px;
  }

  .lenta-folder-add-note {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 2px;
  }

  .lenta-markdown-preview-pane {
    padding: 6px 10px;
    background: var(--background-primary);
    border-top: 1px solid var(--background-modifier-border);
  }

  .lenta-notes-list {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .lenta-note-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 6px;
    border-radius: 4px;
    cursor: pointer;
  }

  .lenta-note-row:hover {
    background: var(--background-modifier-hover);
  }

  .lenta-note-title {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.82rem;
  }

  .lenta-note-date {
    font-size: 0.72rem;
    color: var(--text-muted);
  }

  .lenta-loading-text,
  .lenta-preview-loading {
    padding: 12px;
    text-align: center;
    color: var(--text-muted);
    font-style: italic;
  }

  .lenta-preview-empty {
    padding: 16px;
    text-align: center;
    color: var(--text-muted);
    font-size: 0.85rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .lenta-empty-action-link {
    background: transparent;
    border: none;
    color: var(--interactive-accent);
    cursor: pointer;
    text-decoration: underline;
    font-size: 0.8rem;
  }
</style>
