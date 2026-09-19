import { ContainerFileTreeNode } from '../sidebar-view';

export interface FlattenedTreeNode {
  id: string;
  type: 'folder' | 'file' | 'today-marker' | 'empty-folder';
  name: string;
  path: string;
  depth: number;
  isFolderExpanded?: boolean;
  childCount?: number;
  size?: number;
  mtime?: number;
  dateStr?: string;
  startDate?: string;
  endDate?: string;
  isToday?: boolean;
  folderPath?: string;
}

export interface VirtualWindow {
  startIndex: number;
  endIndex: number;
  offsetY: number;
  totalHeight: number;
  visibleItems: FlattenedTreeNode[];
}

export function isTodayMatch(node: ContainerFileTreeNode, todayStr: string): boolean {
  if (node.dateStr && node.dateStr === todayStr) return true;
  if (node.startDate && node.startDate.slice(0, 10) === todayStr) return true;
  return false;
}

export function flattenTree(
  nodes: ContainerFileTreeNode[],
  expandedFolders: Set<string>,
  containerId: string,
  todayStr: string,
  depth = 0,
  currentFolderPath = ''
): FlattenedTreeNode[] {
  const result: FlattenedTreeNode[] = [];

  const datedFileNodes = nodes.filter((n) => n.type === 'file' && (n.dateStr || n.startDate));
  const hasAnyTodayFile = datedFileNodes.some((f) => isTodayMatch(f, todayStr));
  let todayMarkerInserted = false;

  for (const node of nodes) {
    if (!hasAnyTodayFile && datedFileNodes.length > 0 && !todayMarkerInserted) {
      if (node.type === 'file' && node.dateStr && node.dateStr > todayStr) {
        result.push({
          id: `${containerId}:${currentFolderPath}:today-marker`,
          type: 'today-marker',
          name: todayStr,
          path: currentFolderPath,
          depth,
          folderPath: currentFolderPath,
        });
        todayMarkerInserted = true;
      }
    }

    if (node.type === 'folder') {
      const folderKey = `${containerId}:${node.path}`;
      const isExpanded = expandedFolders.has(folderKey);
      const childCount = node.children ? node.children.length : 0;

      result.push({
        id: folderKey,
        type: 'folder',
        name: node.name,
        path: node.path,
        depth,
        isFolderExpanded: isExpanded,
        childCount,
        folderPath: node.path,
      });

      if (isExpanded) {
        if (node.children && node.children.length > 0) {
          const childrenFlat = flattenTree(
            node.children,
            expandedFolders,
            containerId,
            todayStr,
            depth + 1,
            node.path
          );
          for (let i = 0; i < childrenFlat.length; i++) {
            result.push(childrenFlat[i]);
          }
        } else {
          result.push({
            id: `${folderKey}:empty`,
            type: 'empty-folder',
            name: '(Пустая папка)',
            path: node.path,
            depth: depth + 1,
            folderPath: node.path,
          });
        }
      }
    } else {
      const isToday = isTodayMatch(node, todayStr);
      result.push({
        id: `${containerId}:${node.path}`,
        type: 'file',
        name: node.name,
        path: node.path,
        depth,
        size: node.size,
        mtime: node.mtime,
        dateStr: node.dateStr,
        startDate: node.startDate,
        endDate: node.endDate,
        isToday,
        folderPath: currentFolderPath,
      });
    }
  }

  if (!hasAnyTodayFile && datedFileNodes.length > 0 && !todayMarkerInserted && depth === 0) {
    result.push({
      id: `${containerId}:${currentFolderPath}:today-marker`,
      type: 'today-marker',
      name: todayStr,
      path: currentFolderPath,
      depth,
      folderPath: currentFolderPath,
    });
  }

  return result;
}

export function computeVirtualWindow(
  items: FlattenedTreeNode[],
  scrollTop: number,
  viewportHeight: number,
  itemHeight = 30,
  overscan = 5
): VirtualWindow {
  const totalHeight = items.length * itemHeight;
  if (items.length === 0 || viewportHeight <= 0) {
    return {
      startIndex: 0,
      endIndex: 0,
      offsetY: 0,
      totalHeight,
      visibleItems: [],
    };
  }

  const rawStart = Math.floor(scrollTop / itemHeight);
  const startIndex = Math.max(0, rawStart - overscan);
  const rawEnd = Math.ceil((scrollTop + viewportHeight) / itemHeight);
  const endIndex = Math.min(items.length, rawEnd + overscan);

  const offsetY = startIndex * itemHeight;
  const visibleItems = items.slice(startIndex, endIndex);

  return {
    startIndex,
    endIndex,
    offsetY,
    totalHeight,
    visibleItems,
  };
}
