import { Feed } from '../../types';

export interface FeedGroup {
  id: string;
  name: string;
  icon: string;
  color: string;
  feeds: Feed[];
  totalNotes: number;
}

export interface GroupRule {
  match: (feed: Feed) => boolean;
  groupId: string;
  groupName: string;
  icon: string;
  color: string;
}

const DECLARATIVE_GROUP_RULES: GroupRule[] = [
  {
    match: (f) =>
      f.slug.startsWith('spark-') ||
      Boolean(f.folderPaths?.some((fp) => fp.toLowerCase().startsWith('spark'))),
    groupId: 'spark',
    groupName: 'Spark Streams',
    icon: 'bolt',
    color: '#cacd58',
  },
  {
    match: (f) =>
      ['russian-holidays', 'christian-holidays', 'wiki', 'orthodox-holidays'].includes(f.slug) ||
      Boolean(f.folderPaths?.some((fp) => fp.toLowerCase().includes('holiday'))),
    groupId: 'calendar-culture',
    groupName: 'Календарь & Культура',
    icon: 'event',
    color: '#a4d0be',
  },
  {
    match: (f) =>
      ['mcu-radar', 'politics-2026'].includes(f.slug) ||
      Boolean(f.folderPaths?.some((fp) => fp.toLowerCase().includes('media') || fp.toLowerCase().includes('news'))),
    groupId: 'media-radar',
    groupName: 'Медиа & Радары',
    icon: 'radar',
    color: '#e6cc80',
  },
  {
    match: (f) =>
      ['tech-strategy', 'product-milestones', 'design-systems', 'devops-infra'].includes(f.slug) ||
      Boolean(f.folderPaths?.some((fp) => fp.toLowerCase().includes('system') || fp.toLowerCase().includes('infra'))),
    groupId: 'engineering-product',
    groupName: 'Инженерия & Продукт',
    icon: 'terminal',
    color: '#c9c8a5',
  },
];

const DEFAULT_GROUP: Omit<FeedGroup, 'feeds' | 'totalNotes'> = {
  id: 'other',
  name: 'Другие потоки',
  icon: 'dynamic_feed',
  color: '#c9cd58',
};

/**
 * Resolves which group a feed belongs to.
 */
export function resolveFeedGroup(feed: Feed): Omit<FeedGroup, 'feeds' | 'totalNotes'> {
  for (const rule of DECLARATIVE_GROUP_RULES) {
    if (rule.match(feed)) {
      return {
        id: rule.groupId,
        name: rule.groupName,
        icon: rule.icon,
        color: rule.color,
      };
    }
  }

  // Fallback: if folder path exists, use first segment
  if (feed.folderPaths && feed.folderPaths.length > 0 && feed.folderPaths[0]) {
    const firstSegment = feed.folderPaths[0].split('/')[0].trim();
    if (firstSegment) {
      return {
        id: `folder-${firstSegment.toLowerCase()}`,
        name: firstSegment,
        icon: 'folder',
        color: '#a4d0be',
      };
    }
  }

  return DEFAULT_GROUP;
}

/**
 * Builds a grouped tree structure from a flat array of feeds.
 */
export function buildFeedGroups(feeds: Feed[], searchQuery = ''): FeedGroup[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredFeeds = feeds.filter((feed) => {
    if (!normalizedQuery) return true;
    const matchTitle = feed.title.toLowerCase().includes(normalizedQuery);
    const matchSlug = feed.slug.toLowerCase().includes(normalizedQuery);
    const matchDesc = feed.description?.toLowerCase().includes(normalizedQuery) ?? false;
    const matchFolders = feed.folderPaths?.some((fp) => fp.toLowerCase().includes(normalizedQuery)) ?? false;
    const matchHashtags = feed.hashtags?.some((h) => h.toLowerCase().includes(normalizedQuery)) ?? false;
    return matchTitle || matchSlug || matchDesc || matchFolders || matchHashtags;
  });

  const groupMap = new Map<string, FeedGroup>();

  for (const feed of filteredFeeds) {
    const groupMeta = resolveFeedGroup(feed);
    let group = groupMap.get(groupMeta.id);
    if (!group) {
      group = {
        ...groupMeta,
        feeds: [],
        totalNotes: 0,
      };
      groupMap.set(groupMeta.id, group);
    }
    group.feeds.push(feed);
    group.totalNotes += feed._count?.notes ?? 0;
  }

  // Order groups according to DECLARATIVE_GROUP_RULES, then dynamic groups, then other
  const sortedGroups: FeedGroup[] = [];
  for (const rule of DECLARATIVE_GROUP_RULES) {
    const found = groupMap.get(rule.groupId);
    if (found) {
      sortedGroups.push(found);
      groupMap.delete(rule.groupId);
    }
  }

  for (const group of groupMap.values()) {
    sortedGroups.push(group);
  }

  return sortedGroups;
}
