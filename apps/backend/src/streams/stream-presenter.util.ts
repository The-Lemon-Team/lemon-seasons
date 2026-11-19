import { collectReachableStreamTree, StreamGraphNode } from './stream-graph.util';

export function buildFeedSummaryMap(allFeeds: any[]): Map<string, any> {
  const feedMap = new Map<string, any>();
  for (const f of allFeeds) {
    feedMap.set(f.id, f);
    if (f.slug) feedMap.set(f.slug, f);
  }
  return feedMap;
}

export function formatEnrichedStream(params: {
  stream: any;
  allStreams: StreamGraphNode[];
  streamById: Map<string, any>;
  feedMap: Map<string, any>;
  includePrivate: boolean;
}) {
  const { stream, allStreams, streamById, feedMap, includePrivate } = params;
  const tabs: any[] = Array.isArray(stream.tabs) ? stream.tabs : [];

  const feedTabs = tabs.filter((t) => !t.isHidden && (t.type === 'feed' || (!t.type && t.feedId)) && t.feed);
  let feeds: any[] = [];
  if (feedTabs.length > 0) {
    feeds = feedTabs.map((t) => ({
      ...t.feed,
      customTitle: t.customTitle || undefined,
      customIcon: t.customIcon || undefined,
      badge: t.badge || undefined,
      tabId: t.id,
      tabOrder: t.order,
    }));
  } else {
    feeds = (stream.feedIds || [])
      .map((id: string) => feedMap.get(id))
      .filter(Boolean);
  }

  const streamTabs = tabs.filter(
    (t) => !t.isHidden && t.type === 'stream' && (t.targetStream || t.targetStreamId),
  );
  let childStreams: any[] = [];
  if (streamTabs.length > 0) {
    childStreams = streamTabs
      .map((t) => {
        const target = t.targetStream || streamById.get(t.targetStreamId);
        if (!target || target.deletedAt) return null;
        if (!includePrivate && target.privacy === 'private') return null;
        return {
          id: target.id,
          slug: target.slug,
          title: target.title,
          description: target.description || null,
          icon: target.icon || null,
          color: target.color || null,
          privacy: target.privacy === 'private' ? 'private' : 'public',
          feedIds: target.feedIds || [],
          childStreamIds: target.childStreamIds || [],
          tags: target.tags || [],
          folderPaths: target.folderPaths || [],
          customTitle: t.customTitle || undefined,
          customIcon: t.customIcon || undefined,
          badge: t.badge || undefined,
          tabId: t.id,
          tabOrder: t.order,
        };
      })
      .filter(Boolean);
  } else {
    childStreams = (stream.childStreamIds || [])
      .map((cid: string) => streamById.get(cid))
      .filter((cs: any) => cs && !cs.deletedAt && (includePrivate || cs.privacy !== 'private'))
      .map((cs: any) => ({
        id: cs.id,
        slug: cs.slug,
        title: cs.title,
        description: cs.description || null,
        icon: cs.icon || null,
        color: cs.color || null,
        privacy: cs.privacy === 'private' ? 'private' : 'public',
        feedIds: cs.feedIds || [],
        childStreamIds: cs.childStreamIds || [],
        tags: cs.tags || [],
        folderPaths: cs.folderPaths || [],
      }));
  }

  const tree = collectReachableStreamTree({
    rootStream: stream,
    allStreams,
    includePrivate,
  });

  const uniqueReachableFeeds = new Map<string, any>();
  for (const fid of tree.feedIds) {
    const f = feedMap.get(fid);
    if (f && (includePrivate || f.privacy !== 'private')) {
      uniqueReachableFeeds.set(f.id, f);
    }
  }
  for (const f of feeds) {
    if (f?.id && (includePrivate || f.privacy !== 'private')) {
      uniqueReachableFeeds.set(f.id, f);
    }
  }

  const totalNotes = Array.from(uniqueReachableFeeds.values()).reduce(
    (sum, f) => sum + (f._count?.notes || 0),
    0,
  );

  return {
    ...stream,
    feeds,
    childStreams,
    _count: {
      feeds: feeds.length,
      childStreams: childStreams.length,
      notes: totalNotes,
    },
  };
}
