import { BadRequestException } from '@nestjs/common';

export interface StreamGraphNode {
  id: string;
  slug: string;
  title: string;
  privacy: string;
  feedIds?: string[];
  childStreamIds?: string[];
  tags?: string[];
  folderPaths?: string[];
}

export interface StreamFallbackTarget {
  slug: string;
  title: string;
}

export interface ReachableStreamTree {
  streamIds: string[];
  feedIds: string[];
  tags: string[];
  folderPaths: string[];
  fallbackStreams: StreamFallbackTarget[];
}

/**
 * Resolves raw stream IDs or slugs into canonical deduplicated stream UUIDs.
 */
export function resolveChildStreamRefs(
  refs: string[] | undefined,
  allStreams: StreamGraphNode[],
): string[] {
  if (!refs || refs.length === 0) return [];
  const byId = new Map<string, StreamGraphNode>();
  const bySlug = new Map<string, StreamGraphNode>();
  for (const s of allStreams) {
    byId.set(s.id, s);
    bySlug.set(s.slug.toLowerCase(), s);
  }

  const resolved: string[] = [];
  const seen = new Set<string>();
  for (const raw of refs) {
    const trimmed = raw?.trim();
    if (!trimmed) continue;
    const match = byId.get(trimmed) || bySlug.get(trimmed.toLowerCase());
    if (match && !seen.has(match.id)) {
      seen.add(match.id);
      resolved.push(match.id);
    }
  }
  return resolved;
}

/**
 * Validates that attaching childIds to parentId introduces no self-references,
 * no cycles (at arbitrary nesting depth), and no private-into-public leakage.
 */
export function validateNestedStreamGraph(params: {
  parentId?: string;
  parentPrivacy: string;
  childIds: string[];
  allStreams: StreamGraphNode[];
}): void {
  const { parentId, parentPrivacy, childIds, allStreams } = params;
  if (!childIds || childIds.length === 0) return;

  const streamMap = new Map<string, StreamGraphNode>(allStreams.map((s) => [s.id, s]));

  if (parentId && childIds.includes(parentId)) {
    throw new BadRequestException('Стрим не может ссылаться сам на себя.');
  }

  const queue: Array<{ id: string; path: string[] }> = [];
  const visited = new Set<string>();

  for (const cid of childIds) {
    const child = streamMap.get(cid);
    if (!child) continue;

    if (parentPrivacy === 'public' && child.privacy === 'private') {
      throw new BadRequestException(
        `Публичный стрим не может включать приватный стрим «${child.title}» (${child.slug}).`,
      );
    }

    queue.push({ id: cid, path: [cid] });
  }

  while (queue.length > 0) {
    const { id, path } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);

    const node = streamMap.get(id);
    if (!node) continue;

    if (parentPrivacy === 'public' && node.privacy === 'private') {
      throw new BadRequestException(
        `Публичный стрим не может транзитивно включать приватный стрим «${node.title}» (${node.slug}).`,
      );
    }

    for (const nextId of node.childStreamIds || []) {
      if (parentId && nextId === parentId) {
        const cycleLabels = [...path, parentId]
          .map((sid) => streamMap.get(sid)?.slug || sid)
          .join(' → ');
        throw new BadRequestException(
          `Обнаружена циклическая ссылка между стримами: ${cycleLabels}.`,
        );
      }
      if (!visited.has(nextId)) {
        queue.push({ id: nextId, path: [...path, nextId] });
      }
    }
  }
}

/**
 * Traverses the nested stream DAG starting from rootStream (BFS with cycle guard)
 * and aggregates deduplicated feedIds, tags, folderPaths, and clean fallback stream targets.
 */
export function collectReachableStreamTree(params: {
  rootStream: StreamGraphNode;
  allStreams: StreamGraphNode[];
  includePrivate?: boolean;
}): ReachableStreamTree {
  const { rootStream, allStreams } = params;
  const allowPrivateDescendants =
    params.includePrivate !== undefined
      ? params.includePrivate
      : rootStream.privacy === 'private';

  const streamMap = new Map<string, StreamGraphNode>(allStreams.map((s) => [s.id, s]));
  const visited = new Set<string>();
  const queue: StreamGraphNode[] = [rootStream];

  const streamIds: string[] = [];
  const feedIdsSet = new Set<string>();
  const tagsSet = new Set<string>();
  const folderPathsSet = new Set<string>();
  const fallbackStreams: StreamFallbackTarget[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current.id)) continue;
    if (current.id !== rootStream.id && !allowPrivateDescendants && current.privacy === 'private') {
      continue;
    }

    visited.add(current.id);
    streamIds.push(current.id);

    const ownFeedIds = current.feedIds || [];
    const ownTags = current.tags || [];
    const ownFolders = current.folderPaths || [];
    const ownChildren = current.childStreamIds || [];

    for (const fid of ownFeedIds) {
      if (fid) feedIdsSet.add(fid);
    }
    for (const t of ownTags) {
      if (t) tagsSet.add(t);
    }
    for (const fp of ownFolders) {
      if (fp) folderPathsSet.add(fp);
    }

    // If a child stream has no explicit criteria of its own, preserve its implicit slug/title matching
    if (
      current.id !== rootStream.id &&
      ownFeedIds.length === 0 &&
      ownTags.length === 0 &&
      ownFolders.length === 0 &&
      ownChildren.length === 0
    ) {
      fallbackStreams.push({ slug: current.slug, title: current.title });
    }

    for (const childId of ownChildren) {
      if (!visited.has(childId)) {
        const child = streamMap.get(childId);
        if (child) {
          queue.push(child);
        }
      }
    }
  }

  return {
    streamIds,
    feedIds: Array.from(feedIdsSet),
    tags: Array.from(tagsSet),
    folderPaths: Array.from(folderPathsSet),
    fallbackStreams,
  };
}

/**
 * Given streams that directly include a feed, walks upward through parent streams
 * (cycle-safe) and returns all direct + ancestor stream slugs.
 */
export function collectAncestorStreamSlugs(params: {
  directStreamIds: string[];
  allStreams: StreamGraphNode[];
}): string[] {
  const { directStreamIds, allStreams } = params;
  if (!directStreamIds || directStreamIds.length === 0) return [];

  const streamMap = new Map<string, StreamGraphNode>(allStreams.map((s) => [s.id, s]));
  const parentsByChildId = new Map<string, StreamGraphNode[]>();

  for (const s of allStreams) {
    for (const cid of s.childStreamIds || []) {
      const list = parentsByChildId.get(cid) || [];
      list.push(s);
      parentsByChildId.set(cid, list);
    }
  }

  const visited = new Set<string>();
  const queue = [...directStreamIds];
  const slugs = new Set<string>();

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);

    const node = streamMap.get(id);
    if (!node) continue;
    if (node.slug) slugs.add(node.slug);

    for (const parent of parentsByChildId.get(id) || []) {
      if (!visited.has(parent.id)) {
        queue.push(parent.id);
      }
    }
  }

  return Array.from(slugs);
}
