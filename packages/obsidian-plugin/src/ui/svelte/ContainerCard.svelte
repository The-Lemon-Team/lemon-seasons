<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { slide } from 'svelte/transition';
  import { setIcon, Menu } from 'obsidian';
  import type { LentaContainerSummaryDto, LentaFolderDto } from '../../types';
  import { getContainerDisplayTitle } from '../../utils/container-title';
  import { isContainerPublic } from '../../utils/container-privacy';
  import { buildFileTree, type ContainerFileTreeNode } from '../sidebar-view';
  import { flattenTree, type FlattenedTreeNode } from './tree-flattener';
  import VirtualTreeList from './VirtualTreeList.svelte';

  export let container: LentaContainerSummaryDto;
  export let isExpanded: boolean;
  export let isActiveContainer: boolean;
  export let isLoadingFiles: boolean;
  export let files: Array<{ path: string; content?: string; mtime?: number; size?: number }> | undefined;
  export let folders: LentaFolderDto[] | undefined;
  export let expandedFolders: Set<string>;
  export let todayStr: string;
  export let todayHumanStr: string;
  export let scrollContainer: HTMLElement | null = null;

  const dispatch = createEventDispatcher<{
    toggleExpand: { containerId: string };
    toggleConnect: { containerId: string };
    addNote: { containerId: string; containerName: string; folderPath?: string; initialDate?: string };
    addFolder: { containerId: string; containerName: string; parentFolderPath?: string };
    openNote: { item: FlattenedTreeNode };
    toggleFolder: { item: FlattenedTreeNode };
  }>();

  function obsIcon(node: HTMLElement, iconName: string) {
    if (iconName) {
      setIcon(node, iconName);
    }
    return {
      update(newIconName: string) {
        node.empty();
        if (newIconName) {
          setIcon(node, newIconName);
        }
      }
    };
  }

  $: displayTitle = getContainerDisplayTitle(container);
  $: isPublic = isContainerPublic(container);
  $: isFeed = container.id.startsWith('feed-');

  let fileTree: ContainerFileTreeNode[] = [];
  let flatItems: FlattenedTreeNode[] = [];

  $: {
    if (files && files.length > 0) {
      fileTree = buildFileTree(files, folders || []);
      flatItems = flattenTree(fileTree, expandedFolders, container.id, todayStr);
    } else {
      fileTree = [];
      flatItems = [];
    }
  }

  function handleHeaderClick() {
    dispatch('toggleExpand', { containerId: container.id });
  }

  function handleConnectClick(e: MouseEvent) {
    e.stopPropagation();
    dispatch('toggleConnect', { containerId: container.id });
  }

  function handleAddNoteClick(e: MouseEvent) {
    e.stopPropagation();
    dispatch('addNote', { containerId: container.id, containerName: displayTitle });
  }

  function handleAddFolderClick(e: MouseEvent) {
    e.stopPropagation();
    dispatch('addFolder', { containerId: container.id, containerName: displayTitle });
  }

  function handlePlusMenuClick(e: MouseEvent | KeyboardEvent) {
    e.stopPropagation();
    const menu = new Menu();
    menu.addItem((item) => {
      item
        .setTitle('📝 New Note in Container')
        .setIcon('file-plus')
        .onClick(() => {
          dispatch('addNote', { containerId: container.id, containerName: displayTitle });
        });
    });
    menu.addItem((item) => {
      item
        .setTitle('📁 New Folder in Container')
        .setIcon('folder-plus')
        .onClick(() => {
          dispatch('addFolder', { containerId: container.id, containerName: displayTitle });
        });
    });
    if ('clientX' in e && (e as MouseEvent).clientX !== undefined) {
      menu.showAtMouseEvent(e as MouseEvent);
    } else {
      menu.showAtPosition({ x: 100, y: 100 });
    }
  }

  function handlePlusMenuKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handlePlusMenuClick(e);
    }
  }

  function handleFolderAddMenu(e: CustomEvent<{ item: FlattenedTreeNode; mouseEvent: MouseEvent }>) {
    const { item, mouseEvent } = e.detail;
    const menu = new Menu();
    menu.addItem((mItem) => {
      mItem
        .setTitle(`📝 New Note in "${item.name}"`)
        .setIcon('file-plus')
        .onClick(() => {
          dispatch('addNote', {
            containerId: container.id,
            containerName: displayTitle,
            folderPath: item.path,
          });
        });
    });
    menu.addItem((mItem) => {
      mItem
        .setTitle(`📁 New Subfolder in "${item.name}"`)
        .setIcon('folder-plus')
        .onClick(() => {
          dispatch('addFolder', {
            containerId: container.id,
            containerName: displayTitle,
            parentFolderPath: item.path,
          });
        });
    });
    menu.showAtMouseEvent(mouseEvent);
  }

  function handleAddTodayNote(e: CustomEvent<{ item: FlattenedTreeNode }>) {
    const { item } = e.detail;
    dispatch('addNote', {
      containerId: container.id,
      containerName: displayTitle,
      folderPath: item.folderPath || undefined,
      initialDate: todayStr,
    });
  }

  function handleQuickAddInEmpty(e: CustomEvent<{ item: FlattenedTreeNode }>) {
    const { item } = e.detail;
    dispatch('addNote', {
      containerId: container.id,
      containerName: displayTitle,
      folderPath: item.folderPath || undefined,
    });
  }
</script>

<div class="lenta-tree-item lenta-tree-item-folder lenta-container-row {isActiveContainer ? 'is-active' : ''}">
  <!-- Header row -->
  <div
    class="lenta-container-header-row {isActiveContainer ? 'is-active' : ''}"
    on:click={handleHeaderClick}
    on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleHeaderClick(); }}
    role="button"
    tabindex="0"
  >
    <span class="lenta-item-icon" use:obsIcon={isFeed ? 'newspaper' : 'box'}></span>
    <span class="lenta-item-name">{displayTitle}</span>

    {#if isFeed}
      <span class="lenta-badge lenta-badge-feed">FEED</span>
    {:else if isPublic}
      <span class="lenta-badge lenta-badge-public">PUBLIC</span>
    {/if}

    {#if container.noteCount !== undefined && container.noteCount !== null}
      <span class="lenta-count-pill">{container.noteCount}</span>
    {/if}

    <!-- Mini Connect Button in Header -->
    <button
      type="button"
      class="lenta-mini-connect-btn {isActiveContainer ? 'is-connected' : ''}"
      title={isActiveContainer ? 'Connected container (click to disconnect)' : 'Connect container'}
      on:click|stopPropagation={handleConnectClick}
    >
      {isActiveContainer ? '✓ Connected' : 'Connect'}
    </button>

    <span
      class="lenta-container-add-btn clickable-icon"
      aria-label="New Note or Folder in Container"
      role="button"
      tabindex="0"
      on:click={handlePlusMenuClick}
      on:keydown={handlePlusMenuKeydown}
      use:obsIcon={'plus'}
    ></span>

    <span
      class="lenta-preview-toggle clickable-icon"
      aria-label={isExpanded ? 'Collapse container' : 'Expand container files'}
      use:obsIcon={isExpanded ? 'chevron-up' : 'chevron-down'}
    ></span>
  </div>

  <!-- Expanded accordion body -->
  {#if isExpanded}
    <div class="lenta-markdown-preview-pane lenta-container-tree-pane" transition:slide={{ duration: 180 }}>
      {#if isLoadingFiles}
        <div class="lenta-preview-loading">⏳ Loading files and folders...</div>
      {:else if !files || files.length === 0}
        <div class="lenta-preview-empty">📭 Empty container. No markdown notes synced yet.</div>
      {:else}
        <VirtualTreeList
          items={flatItems}
          {todayHumanStr}
          {scrollContainer}
          on:toggleFolder={(e) => dispatch('toggleFolder', e.detail)}
          on:openNote={(e) => dispatch('openNote', e.detail)}
          on:addInFolder={handleFolderAddMenu}
          on:addTodayNote={handleAddTodayNote}
          on:quickAddInEmpty={handleQuickAddInEmpty}
        />
      {/if}
    </div>
  {/if}
</div>

<style>
  .lenta-mini-connect-btn {
    font-size: 0.68rem;
    font-weight: 600;
    padding: 2px 7px;
    border-radius: 4px;
    border: 1px solid var(--background-modifier-border);
    background: var(--background-secondary);
    color: var(--text-muted);
    cursor: pointer;
    line-height: 1.2;
    transition: all 0.15s ease;
    white-space: nowrap;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 3px;
    user-select: none;
  }

  .lenta-mini-connect-btn:hover {
    color: var(--text-normal);
    border-color: var(--interactive-accent);
    background: var(--background-modifier-hover);
  }

  .lenta-mini-connect-btn.is-connected {
    background: var(--lenta-lemon-glow, rgba(249, 199, 79, 0.15));
    color: var(--lenta-lemon, #f9c74f);
    border-color: var(--lenta-lemon, #f9c74f);
    font-weight: 700;
  }
</style>
