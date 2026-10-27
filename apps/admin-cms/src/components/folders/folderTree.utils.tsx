import React from 'react';
import {
  Folder as FolderIcon,
  FolderOpen,
  Lock,
  Globe,
  BookOpen,
  Archive,
  Star,
  Bot,
  Film,
  Sparkles,
  CircleDollarSign,
} from 'lucide-react';
import { FolderTreeNode, Folder, FolderPrivacy } from '../../types';

export const FOLDER_COLOR_PALETTE = [
  '#c9cd58', // Lemon / Public default
  '#a855f7', // Purple / Private default
  '#3b82f6', // Blue
  '#f59e0b', // Amber
  '#f43f5e', // Rose
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#ec4899', // Pink
];

export const FOLDER_ICONS_LIST = [
  { id: 'folder', label: 'Folder' },
  { id: 'lock', label: 'Lock' },
  { id: 'book-open', label: 'Journal' },
  { id: 'sparkles', label: 'Ideas' },
  { id: 'film', label: 'Media' },
  { id: 'bot', label: 'AI & Tech' },
  { id: 'archive', label: 'Archive' },
  { id: 'star', label: 'Favorite' },
  { id: 'circle-dollar-sign', label: 'Finance' },
];

export function renderFolderIcon(
  iconName: string | null | undefined,
  isExpanded = false,
  className = 'w-4 h-4'
): React.ReactNode {
  switch (iconName) {
    case 'lock':
      return <Lock className={className} />;
    case 'book-open':
      return <BookOpen className={className} />;
    case 'archive':
      return <Archive className={className} />;
    case 'sparkles':
      return <Sparkles className={className} />;
    case 'star':
      return <Star className={className} />;
    case 'bot':
      return <Bot className={className} />;
    case 'film':
      return <Film className={className} />;
    case 'circle-dollar-sign':
      return <CircleDollarSign className={className} />;
    default:
      return isExpanded ? <FolderOpen className={className} /> : <FolderIcon className={className} />;
  }
}

/**
 * Filter tree recursively by search query and privacy filter.
 * Retains intermediate parent nodes if any child matches the filter.
 */
export function filterFolderTree(
  nodes: FolderTreeNode[],
  query: string,
  privacyFilter: 'all' | 'public' | 'private'
): FolderTreeNode[] {
  const lowerQuery = query.trim().toLowerCase();
  const result: FolderTreeNode[] = [];

  for (const node of nodes) {
    const nodePrivacy = (node.privacy as FolderPrivacy) || 'public';
    const matchesPrivacy =
      privacyFilter === 'all' ? true : nodePrivacy === privacyFilter;

    const matchesQuery =
      !lowerQuery ||
      node.name.toLowerCase().includes(lowerQuery) ||
      node.path.toLowerCase().includes(lowerQuery);

    const matchesDirectly = matchesPrivacy && matchesQuery;

    const filteredChildren = filterFolderTree(node.children || [], query, privacyFilter);
    const hasMatchingDescendants = filteredChildren.length > 0;

    if (matchesDirectly || hasMatchingDescendants) {
      result.push({
        ...node,
        children: filteredChildren,
      });
    }
  }

  return result;
}

/**
 * Calculate total, public, and private counts across the tree.
 */
export function calculateFolderCounts(nodes: FolderTreeNode[]): {
  total: number;
  publicCount: number;
  privateCount: number;
} {
  let total = 0;
  let publicCount = 0;
  let privateCount = 0;

  const traverse = (items: FolderTreeNode[]) => {
    for (const item of items) {
      total++;
      if (item.privacy === 'private') {
        privateCount++;
      } else {
        publicCount++;
      }
      if (item.children && item.children.length > 0) {
        traverse(item.children);
      }
    }
  };

  traverse(nodes);
  return { total, publicCount, privateCount };
}
