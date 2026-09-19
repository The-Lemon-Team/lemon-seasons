<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { setIcon } from 'obsidian';
  import type { FlattenedTreeNode } from './tree-flattener';

  export let item: FlattenedTreeNode;
  export let todayHumanStr: string;

  const dispatch = createEventDispatcher<{
    toggleFolder: { item: FlattenedTreeNode };
    openNote: { item: FlattenedTreeNode };
    addInFolder: { item: FlattenedTreeNode; mouseEvent: MouseEvent };
    addTodayNote: { item: FlattenedTreeNode };
    quickAddInEmpty: { item: FlattenedTreeNode };
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

  function handleFolderClick(e: MouseEvent) {
    e.stopPropagation();
    dispatch('toggleFolder', { item });
  }

  function handleFolderKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      dispatch('toggleFolder', { item });
    }
  }

  function handleFileClick(e: MouseEvent) {
    e.stopPropagation();
    dispatch('openNote', { item });
  }

  function handleFileKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      dispatch('openNote', { item });
    }
  }

  function handleAddInFolder(e: MouseEvent | KeyboardEvent) {
    e.stopPropagation();
    dispatch('addInFolder', { item, mouseEvent: e as MouseEvent });
  }

  function handleAddInFolderKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleAddInFolder(e);
    }
  }

  function handleAddTodayClick(e: MouseEvent) {
    e.stopPropagation();
    dispatch('addTodayNote', { item });
  }

  function handleQuickAddInEmpty(e: MouseEvent) {
    e.stopPropagation();
    dispatch('quickAddInEmpty', { item });
  }
</script>

{#if item.type === 'folder'}
  <div
    class="lenta-tree-node-folder {item.isFolderExpanded ? 'is-open' : ''}"
    style="padding-left: {item.depth * 14 + 6}px;"
    on:click={handleFolderClick}
    on:keydown={handleFolderKeydown}
    role="treeitem"
    aria-expanded={item.isFolderExpanded}
    aria-selected={false}
    tabindex="0"
  >
    <span class="lenta-item-icon" use:obsIcon={item.isFolderExpanded ? 'folder-open' : 'folder'}></span>
    <span class="lenta-item-name">{item.name}</span>
    {#if item.childCount && item.childCount > 0}
      <span class="lenta-count-pill">{item.childCount}</span>
    {/if}
    <span
      class="lenta-folder-add-note clickable-icon"
      aria-label="Add note or subfolder in {item.name}"
      role="button"
      tabindex="0"
      on:click={handleAddInFolder}
      on:keydown={handleAddInFolderKeydown}
      use:obsIcon={'plus'}
    ></span>
  </div>

{:else if item.type === 'file'}
  <div
    class="lenta-tree-node-file {item.isToday ? 'is-today lenta-tree-node-today' : ''}"
    style="padding-left: {item.depth * 14 + 6}px;"
    on:click={handleFileClick}
    on:keydown={handleFileKeydown}
    role="treeitem"
    aria-selected={!!item.isToday}
    tabindex="0"
    title={item.path}
  >
    <span
      class="lenta-item-icon lenta-note-icon {item.isToday ? 'is-today' : ''}"
      use:obsIcon={item.isToday ? 'calendar-check' : 'file-text'}
    ></span>
    <span class="lenta-note-title {item.isToday ? 'is-today' : ''}">{item.name}</span>
    {#if item.isToday}
      <span class="lenta-today-badge" title="Событие сегодняшнего дня">📍 СЕГОДНЯ</span>
    {/if}
    {#if item.size}
      <span class="lenta-note-date">{Math.round(item.size / 1024) || 1} KB</span>
    {/if}
  </div>

{:else if item.type === 'today-marker'}
  <div
    class="lenta-today-marker-container"
    style="padding-left: {item.depth * 14 + 6}px;"
  >
    <div class="lenta-today-pill">
      <span>Сегодня: {todayHumanStr}</span>
      <span class="lenta-today-pill-status">(событий нет)</span>
      <button
        class="lenta-today-marker-add-btn"
        aria-label="Создать заметку на сегодня в этой папке"
        on:click={handleAddTodayClick}
      >
        <span class="lenta-btn-inline-icon" use:obsIcon={'plus'}></span>
        <span>+ Заметка</span>
      </button>
    </div>
    <span class="lenta-today-marker-line"></span>
  </div>

{:else if item.type === 'empty-folder'}
  <div
    class="lenta-tree-empty-folder"
    style="padding-left: {item.depth * 14 + 10}px; padding-top: 4px; padding-bottom: 4px; font-size: 11px; opacity: 0.7; display: flex; align-items: center; gap: 8px;"
  >
    <span>📁 (Пустая папка)</span>
    <button
      class="lenta-container-action-btn lenta-container-action-btn-add"
      style="padding: 2px 6px; font-size: 10px;"
      on:click={handleQuickAddInEmpty}
    >
      + Заметка
    </button>
  </div>
{/if}
