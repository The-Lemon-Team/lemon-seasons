<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import TreeNodeRow from './TreeNodeRow.svelte';
  import { computeVirtualWindow, type FlattenedTreeNode, type VirtualWindow } from './tree-flattener';

  export let items: FlattenedTreeNode[] = [];
  export let itemHeight = 30;
  export let overscan = 5;
  export let todayHumanStr: string;
  export let scrollContainer: HTMLElement | null = null;

  const dispatch = createEventDispatcher<{
    toggleFolder: { item: FlattenedTreeNode };
    openNote: { item: FlattenedTreeNode };
    addInFolder: { item: FlattenedTreeNode; mouseEvent: MouseEvent };
    addTodayNote: { item: FlattenedTreeNode };
    quickAddInEmpty: { item: FlattenedTreeNode };
  }>();

  let rootEl: HTMLElement;
  let scrollTop = 0;
  let viewportHeight = 600;
  let virtualWindow: VirtualWindow = {
    startIndex: 0,
    endIndex: 0,
    offsetY: 0,
    totalHeight: 0,
    visibleItems: [],
  };

  function updateWindow() {
    if (!rootEl) return;

    if (scrollContainer) {
      const containerRect = scrollContainer.getBoundingClientRect();
      const rootRect = rootEl.getBoundingClientRect();

      viewportHeight = containerRect.height || 600;
      // Scroll relative to this tree list inside the scroll container
      const relativeTop = containerRect.top - rootRect.top;
      scrollTop = Math.max(0, relativeTop);
    } else {
      scrollTop = rootEl.scrollTop || 0;
      viewportHeight = rootEl.clientHeight || 600;
    }

    virtualWindow = computeVirtualWindow(items, scrollTop, viewportHeight, itemHeight, overscan);
  }

  $: items, itemHeight, overscan, scrollContainer, updateWindow();

  let rafId: number | null = null;
  function handleScrollThrottled() {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      updateWindow();
    });
  }

  onMount(() => {
    updateWindow();
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScrollThrottled, { passive: true });
    }
    window.addEventListener('resize', handleScrollThrottled, { passive: true });
  });

  onDestroy(() => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }
    if (scrollContainer) {
      scrollContainer.removeEventListener('scroll', handleScrollThrottled);
    }
    window.removeEventListener('resize', handleScrollThrottled);
  });
</script>

<div
  class="lenta-virtual-tree-root"
  bind:this={rootEl}
  style="position: relative; width: 100%; min-height: {virtualWindow.totalHeight}px;"
>
  <div
    class="lenta-virtual-tree-slice"
    style="position: absolute; top: 0; left: 0; right: 0; transform: translateY({virtualWindow.offsetY}px); will-change: transform;"
  >
    {#each virtualWindow.visibleItems as item (item.id)}
      <TreeNodeRow
        {item}
        {todayHumanStr}
        on:toggleFolder
        on:openNote
        on:addInFolder
        on:addTodayNote
        on:quickAddInEmpty
      />
    {/each}
  </div>
</div>

<style>
  .lenta-virtual-tree-root {
    overflow: hidden;
  }
  .lenta-virtual-tree-slice {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
</style>
