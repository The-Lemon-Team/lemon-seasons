import React from 'react';
import { Folder, FolderTreeNode, FolderPrivacy } from '@lenta/shared';
import {
  Folder as FolderIcon,
  Lock,
  Globe,
  BookOpen,
  Film,
  Bot,
  Archive,
  Star,
  CircleDollarSign,
} from 'lucide-react';

export const FOLDERS_STORAGE_KEY = 'lemon_lenta_folders_v1';

export const INITIAL_FOLDERS: Folder[] = [
  {
    id: 'fld-bookmarks',
    name: 'Bookmarks',
    path: 'Bookmarks',
    icon: 'book-open',
    color: '#3b82f6',
    privacy: 'private',
    containerId: null,
    scope: 'internal',
    createdAt: '2026-08-01T09:00:00.000Z',
    updatedAt: '2026-08-20T09:00:00.000Z',
    deletedAt: null,
    _count: { noteFolders: 2 },
  },
  {
    id: 'fld-archive',
    name: '04_Archive',
    path: '04_Archive',
    icon: 'archive',
    color: '#8b5cf6',
    privacy: 'private',
    containerId: null,
    scope: 'internal',
    createdAt: '2026-08-01T11:00:00.000Z',
    updatedAt: '2026-08-15T11:00:00.000Z',
    deletedAt: null,
    _count: { noteFolders: 3 },
  },
  {
    id: 'fld-archive-thoughts',
    name: 'Thoughts',
    path: '04_Archive/Thoughts',
    icon: 'sparkles',
    color: '#a855f7',
    privacy: 'private',
    containerId: null,
    scope: 'internal',
    createdAt: '2026-08-01T11:30:00.000Z',
    updatedAt: '2026-08-18T11:30:00.000Z',
    deletedAt: null,
    _count: { noteFolders: 8 },
  },
  {
    id: 'fld-projects',
    name: '02_Projects',
    path: '02_Projects',
    icon: 'folder-kanban',
    color: '#c9cd58',
    privacy: 'public',
    containerId: null,
    scope: 'external',
    createdAt: '2026-08-05T09:00:00.000Z',
    updatedAt: '2026-08-22T09:00:00.000Z',
    deletedAt: null,
    _count: { noteFolders: 6 },
  },
  {
    id: 'fld-research',
    name: '03_Research',
    path: '03_Research',
    icon: 'flask-conical',
    color: '#3b82f6',
    privacy: 'public',
    containerId: null,
    scope: 'external',
    createdAt: '2026-08-06T14:00:00.000Z',
    updatedAt: '2026-08-20T14:00:00.000Z',
    deletedAt: null,
    _count: { noteFolders: 5 },
  },
  {
    id: 'fld-research-ai',
    name: 'AI',
    path: '03_Research/AI',
    icon: 'bot',
    color: '#3b82f6',
    privacy: 'public',
    containerId: null,
    scope: 'external',
    createdAt: '2026-08-06T14:30:00.000Z',
    updatedAt: '2026-08-22T14:30:00.000Z',
    deletedAt: null,
    _count: { noteFolders: 11 },
  },
  {
    id: 'fld-news',
    name: 'News',
    path: 'News',
    icon: 'newspaper',
    color: '#f59e0b',
    privacy: 'public',
    containerId: null,
    scope: 'external',
    createdAt: '2026-08-02T08:00:00.000Z',
    updatedAt: '2026-08-21T08:00:00.000Z',
    deletedAt: null,
    _count: { noteFolders: 8 },
  },
  {
    id: 'fld-news-cinema',
    name: 'Cinema',
    path: 'News/Cinema',
    icon: 'film',
    color: '#f43f5e',
    privacy: 'public',
    containerId: null,
    scope: 'external',
    createdAt: '2026-08-02T08:30:00.000Z',
    updatedAt: '2026-08-22T16:00:00.000Z',
    deletedAt: null,
    _count: { noteFolders: 15 },
  },
  {
    id: 'fld-news-marvel',
    name: 'Marvel',
    path: 'News/Marvel',
    icon: 'shield',
    color: '#ef4444',
    privacy: 'public',
    containerId: null,
    scope: 'external',
    createdAt: '2026-08-02T09:00:00.000Z',
    updatedAt: '2026-08-23T10:00:00.000Z',
    deletedAt: null,
    _count: { noteFolders: 9 },
  },
  {
    id: 'fld-core-strategy',
    name: 'Core_Strategy',
    path: 'Core_Strategy',
    icon: 'lock',
    color: '#f43f5e',
    privacy: 'private',
    containerId: null,
    scope: 'internal',
    createdAt: '2026-08-10T09:15:00.000Z',
    updatedAt: '2026-08-23T11:00:00.000Z',
    deletedAt: null,
    _count: { noteFolders: 7 },
  },
  {
    id: 'fld-financials',
    name: 'Financials',
    path: 'Financials',
    icon: 'circle-dollar-sign',
    color: '#10b981',
    privacy: 'private',
    containerId: null,
    scope: 'internal',
    createdAt: '2026-08-10T10:00:00.000Z',
    updatedAt: '2026-08-22T10:00:00.000Z',
    deletedAt: null,
    _count: { noteFolders: 4 },
  },
  {
    id: 'fld-financials-q3q4',
    name: 'Q3_Q4',
    path: 'Financials/Q3_Q4',
    icon: 'trending-up',
    color: '#10b981',
    privacy: 'private',
    containerId: null,
    scope: 'internal',
    createdAt: '2026-08-10T10:30:00.000Z',
    updatedAt: '2026-08-22T10:30:00.000Z',
    deletedAt: null,
    _count: { noteFolders: 6 },
  },
];

export function normalizeFolderPath(rawPath: string): string {
  return rawPath
    .trim()
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\/|\/$/g, '');
}

export function getFolderNameFromPath(normalizedPath: string): string {
  const parts = normalizedPath.split('/');
  return parts[parts.length - 1] || 'Folder';
}

export function renderFolderIcon(iconName: string | null, className = 'w-4 h-4'): React.ReactNode {
  switch (iconName) {
    case 'lock':
      return <Lock className={className} />;
    case 'book-open':
      return <BookOpen className={className} />;
    case 'archive':
      return <Archive className={className} />;
    case 'sparkles':
    case 'star':
      return <Star className={className} />;
    case 'bot':
      return <Bot className={className} />;
    case 'film':
      return <Film className={className} />;
    case 'circle-dollar-sign':
      return <CircleDollarSign className={className} />;
    default:
      return <FolderIcon className={className} />;
  }
}

export function buildFolderTreeFromList(foldersList: Folder[]): FolderTreeNode[] {
  const folderMap = new Map<string, FolderTreeNode>();
  const roots: FolderTreeNode[] = [];

  for (const f of foldersList) {
    const directCount = f._count?.noteFolders || 0;
    const folderScope: 'external' | 'internal' = f.scope || (f.containerId ? 'internal' : 'external');
    folderMap.set(f.path, {
      id: f.id,
      name: f.name,
      path: f.path,
      icon: f.icon,
      color: f.color,
      privacy: f.privacy || 'public',
      containerId: f.containerId,
      scope: folderScope,
      directNotesCount: directCount,
      notesCount: directCount,
      updatedAt: f.updatedAt,
      deletedAt: f.deletedAt,
      children: [],
    });
  }

  for (const f of foldersList) {
    const node = folderMap.get(f.path)!;
    const lastSlash = f.path.lastIndexOf('/');
    if (lastSlash === -1) {
      roots.push(node);
    } else {
      const parentPath = f.path.substring(0, lastSlash);
      const parentNode = folderMap.get(parentPath);
      if (parentNode) {
        parentNode.children.push(node);
      } else {
        roots.push(node);
      }
    }
  }

  const computeCounts = (n: FolderTreeNode): number => {
    let total = n.directNotesCount;
    for (const child of n.children) {
      total += computeCounts(child);
    }
    n.notesCount = total;
    return total;
  };

  roots.forEach(computeCounts);
  return roots;
}
