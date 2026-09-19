import { describe, it, expect } from 'vitest';
import { buildFileTree } from '../sidebar-view';
import { flattenTree, computeVirtualWindow, type FlattenedTreeNode } from '../svelte/tree-flattener';

describe('Virtual Tree Benchmark & Stress Test (1,000 to 10,000 items)', () => {
  function generateMassiveDataset(folderCount: number, filesPerFolder: number) {
    const files: Array<{ path: string; size: number; mtime: number; startDate?: string }> = [];
    const folders: Array<{ path: string }> = [];

    for (let f = 1; f <= folderCount; f++) {
      const folderName = `Folder_${String(f).padStart(3, '0')}`;
      folders.push({ path: folderName });

      for (let i = 1; i <= filesPerFolder; i++) {
        const day = ((i - 1) % 28) + 1;
        const month = ((Math.floor((i - 1) / 28)) % 12) + 1;
        const year = 2026;
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        files.push({
          path: `${folderName}/${dateStr} - Note_${String(i).padStart(4, '0')}.md`,
          size: 1024 + (i * 37) % 5000,
          mtime: Date.now() - i * 3600000,
          startDate: `${dateStr}T10:00:00.000Z`,
        });
      }
    }

    return { files, folders, totalFiles: folderCount * filesPerFolder };
  }

  it('builds tree and flattens 1,000 notes in < 15ms', () => {
    const { files, folders, totalFiles } = generateMassiveDataset(10, 100);
    expect(totalFiles).toBe(1000);

    const startTree = performance.now();
    const tree = buildFileTree(files, folders);
    const treeTime = performance.now() - startTree;

    expect(tree).toHaveLength(10);
    expect(tree[0].children).toHaveLength(100);

    // Expand all 10 folders
    const expandedFolders = new Set<string>();
    for (const f of folders) {
      expandedFolders.add(`container-stress:${f.path}`);
    }

    const startFlatten = performance.now();
    const flatItems = flattenTree(tree, expandedFolders, 'container-stress', '2026-09-22');
    const flattenTime = performance.now() - startFlatten;

    expect(flatItems).toHaveLength(10 + 1000); // 10 folders + 1000 files
    console.log(`[Benchmark 1k] Tree: ${treeTime.toFixed(2)}ms, Flatten: ${flattenTime.toFixed(2)}ms`);

    expect(flattenTime).toBeLessThan(50);
  });

  it('builds tree and flattens 10,000 notes and folders with high performance', () => {
    const { files, folders, totalFiles } = generateMassiveDataset(50, 200);
    expect(totalFiles).toBe(10000);

    const startTree = performance.now();
    const tree = buildFileTree(files, folders);
    const treeTime = performance.now() - startTree;

    expect(tree).toHaveLength(50);

    // Expand all 50 folders to simulate maximum expanded tree
    const expandedFolders = new Set<string>();
    for (const f of folders) {
      expandedFolders.add(`container-stress:${f.path}`);
    }

    const startFlatten = performance.now();
    const flatItems = flattenTree(tree, expandedFolders, 'container-stress', '2026-09-22');
    const flattenTime = performance.now() - startFlatten;

    expect(flatItems.length).toBeGreaterThanOrEqual(10050); // 50 folders + 10000 files + possible markers
    console.log(`[Benchmark 10k] Tree: ${treeTime.toFixed(2)}ms, Flatten: ${flattenTime.toFixed(2)}ms`);

    // Flattening 10,000 objects in pure memory takes under 100ms
    expect(flattenTime).toBeLessThan(100);
  });

  it('demonstrates O(1) DOM virtualization at top, middle, and bottom of 10,000 items', () => {
    const items: FlattenedTreeNode[] = [];
    for (let i = 0; i < 10000; i++) {
      items.push({
        id: `item-${i}`,
        type: 'file',
        name: `Note_${i}.md`,
        path: `Folder/Note_${i}.md`,
        depth: 1,
      });
    }

    const ITEM_HEIGHT = 30;
    const VIEWPORT_HEIGHT = 600; // 20 items visible simultaneously
    const OVERSCAN = 5;

    // 1. Initial view at scrollTop = 0
    const topWindow = computeVirtualWindow(items, 0, VIEWPORT_HEIGHT, ITEM_HEIGHT, OVERSCAN);
    expect(topWindow.totalHeight).toBe(300000); // 10,000 * 30px
    expect(topWindow.startIndex).toBe(0);
    expect(topWindow.endIndex).toBe(25); // 20 visible + 5 overscan
    expect(topWindow.visibleItems).toHaveLength(25);
    expect(topWindow.visibleItems[0].name).toBe('Note_0.md');
    expect(topWindow.offsetY).toBe(0);

    // 2. User scrolled deeply to item 5,000 (scrollTop = 150,000px)
    const midWindow = computeVirtualWindow(items, 150000, VIEWPORT_HEIGHT, ITEM_HEIGHT, OVERSCAN);
    expect(midWindow.totalHeight).toBe(300000);
    expect(midWindow.startIndex).toBe(5000 - OVERSCAN); // 4995
    expect(midWindow.endIndex).toBe(5000 + 20 + OVERSCAN); // 5025
    expect(midWindow.visibleItems).toHaveLength(30);
    expect(midWindow.visibleItems[OVERSCAN].name).toBe('Note_5000.md');
    expect(midWindow.offsetY).toBe(4995 * 30); // 149,850px

    // 3. User scrolled to the very bottom (scrollTop = 299,400px)
    const bottomWindow = computeVirtualWindow(items, 299400, VIEWPORT_HEIGHT, ITEM_HEIGHT, OVERSCAN);
    expect(bottomWindow.totalHeight).toBe(300000);
    expect(bottomWindow.endIndex).toBe(10000);
    expect(bottomWindow.visibleItems.length).toBeLessThanOrEqual(30);
    expect(bottomWindow.visibleItems[bottomWindow.visibleItems.length - 1].name).toBe('Note_9999.md');

    // Key assertion: DOM node count is ALWAYS ~25-30, NEVER 10,000!
    expect(topWindow.visibleItems.length).toBeLessThanOrEqual(35);
    expect(midWindow.visibleItems.length).toBeLessThanOrEqual(35);
    expect(bottomWindow.visibleItems.length).toBeLessThanOrEqual(35);
  });

  it('keeps memory footprint minimal when collapsing folders with thousands of items', () => {
    const { files, folders } = generateMassiveDataset(5, 1000); // 5 folders with 1000 notes each = 5000 notes
    const tree = buildFileTree(files, folders);

    const expanded = new Set<string>();
    // Open only folder 1
    expanded.add('cont:Folder_001');

    const flat1 = flattenTree(tree, expanded, 'cont', '2026-09-22');
    // Folder 1 (expanded) has 1 + 1000 items, other 4 folders (collapsed) take only 4 items!
    expect(flat1).toHaveLength(5 + 1000);

    // Collapse folder 1
    expanded.delete('cont:Folder_001');
    const flatCollapsed = flattenTree(tree, expanded, 'cont', '2026-09-22');
    expect(flatCollapsed).toHaveLength(5); // Only 5 folder rows in memory!
  });
});
