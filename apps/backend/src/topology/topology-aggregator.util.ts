import {
  SeasonsTopologyPatch,
  SeasonsTopologySnapshot,
  TopologyAuthorFacet,
  TopologyDateBucket,
  TopologyFacetItem,
  TopologyFeedNode,
  TopologyPeriodSummary,
  TopologyStreamNode,
  TopologyTabNode,
} from '@lenta/shared';

export interface RawTopologyNoteRow {
  id: string;
  title: string;
  type: string;
  status: string;
  privacy: string;
  feedId: string | null;
  publicFeedId: string | null;
  folderPath: string | null;
  author: string | null;
  sourceType: string | null;
  startDate: Date;
  endDate: Date | null;
  icon: string | null;
  isPromoted?: boolean;
  metadata: any;
  hashtags: Array<{ name: string }>;
}

/**
 * Pure functional builder for the authoritative SeasonsTopologySnapshot ("Каркас").
 * Separates counter aggregation from NestJS I/O in compliance with AGENTS.md rule 4.
 */
export function buildTopologySnapshot(params: {
  revision: number;
  contour: 'public' | 'admin';
  lastEventId: string | null;
  streams: any[];
  feeds: any[];
  notes: RawTopologyNoteRow[];
  daysWindow?: number;
}): SeasonsTopologySnapshot {
  const { revision, contour, lastEventId, streams, feeds, notes } = params;
  const now = new Date();
  const nowMs = now.getTime();
  const daysWindow = Math.max(7, Math.min(365, params.daysWindow || 90));
  const cutoffMs = nowMs - daysWindow * 24 * 60 * 60 * 1000;

  let publicNotes = 0;
  let privateNotes = 0;
  let upcomingNotes = 0;

  const byTypeGlobal: Record<string, number> = {};
  const byOriginGlobal: Record<string, number> = {};
  const dateCounts = new Map<string, number>();
  const authorCounts = new Map<string, number>();
  const hashtagCounts = new Map<string, number>();
  const activePeriods: TopologyPeriodSummary[] = [];

  // Feed-level accumulators keyed by feedId
  const feedStatsById = new Map<
    string,
    {
      totalNotes: number;
      publishedNotes: number;
      stagingNotes: number;
      upcomingCount: number;
      byType: Record<string, number>;
      lastNoteMs: number;
    }
  >();

  const feedSlugById = new Map<string, string>();
  for (const f of feeds) {
    feedSlugById.set(f.id, f.slug);
    feedStatsById.set(f.id, {
      totalNotes: 0,
      publishedNotes: 0,
      stagingNotes: 0,
      upcomingCount: 0,
      byType: {},
      lastNoteMs: 0,
    });
  }

  for (const n of notes) {
    const isPub = n.privacy === 'public';
    if (isPub) publicNotes++;
    else privateNotes++;

    const startMs = n.startDate ? new Date(n.startDate).getTime() : 0;
    const endMs = n.endDate ? new Date(n.endDate).getTime() : null;
    const isUpcoming = startMs > nowMs;
    if (isUpcoming) upcomingNotes++;

    const nType = n.type || 'SINGLE';
    byTypeGlobal[nType] = (byTypeGlobal[nType] || 0) + 1;

    const origin =
      (n.metadata && typeof n.metadata === 'object' && n.metadata.origin) ||
      (n.sourceType === 'GOOGLE_DRIVE' ? 'GDRIVE_SPARK' : n.sourceType || 'DIRECT_API');
    byOriginGlobal[String(origin)] = (byOriginGlobal[String(origin)] || 0) + 1;

    if (startMs >= cutoffMs) {
      const dateKey = new Date(startMs).toISOString().slice(0, 10);
      dateCounts.set(dateKey, (dateCounts.get(dateKey) || 0) + 1);
    }

    if (n.author && n.author.trim()) {
      const cleanAuthor = n.author.trim();
      authorCounts.set(cleanAuthor, (authorCounts.get(cleanAuthor) || 0) + 1);
    }

    for (const h of n.hashtags || []) {
      if (h?.name) {
        const cleanTag = h.name.toLowerCase();
        hashtagCounts.set(cleanTag, (hashtagCounts.get(cleanTag) || 0) + 1);
      }
    }

    if (nType === 'PERIOD' && startMs <= nowMs && (endMs === null || endMs >= nowMs)) {
      activePeriods.push({
        id: n.id,
        title: n.title,
        feedSlug: (n.feedId && feedSlugById.get(n.feedId)) || null,
        startDate: new Date(startMs).toISOString(),
        endDate: endMs ? new Date(endMs).toISOString() : null,
        icon: n.icon,
        isPromoted: Boolean(n.isPromoted || n.metadata?.isPromoted || n.metadata?.promoted),
      });
    }

    // Attribute note to primary feedId and/or publicFeedId
    const targetFeedIds = new Set<string>();
    if (n.feedId && feedStatsById.has(n.feedId)) targetFeedIds.add(n.feedId);
    if (n.publicFeedId && feedStatsById.has(n.publicFeedId)) targetFeedIds.add(n.publicFeedId);

    for (const fid of targetFeedIds) {
      const acc = feedStatsById.get(fid)!;
      acc.totalNotes++;
      if (n.status === 'PUBLISHED') acc.publishedNotes++;
      else acc.stagingNotes++;
      if (isUpcoming) acc.upcomingCount++;
      acc.byType[nType] = (acc.byType[nType] || 0) + 1;
      if (startMs > acc.lastNoteMs) acc.lastNoteMs = startMs;
    }
  }

  const topologyFeeds: TopologyFeedNode[] = feeds.map((f) => {
    const acc = feedStatsById.get(f.id);
    return {
      id: f.id,
      slug: f.slug,
      title: f.title,
      description: f.description || null,
      privacy: f.privacy === 'private' ? 'private' : 'public',
      icon: f.icon || null,
      color: f.color || null,
      totalNotes: acc?.totalNotes ?? 0,
      publishedNotes: acc?.publishedNotes ?? 0,
      stagingNotes: acc?.stagingNotes ?? 0,
      byType: acc?.byType || {},
      lastNoteAt: acc && acc.lastNoteMs > 0 ? new Date(acc.lastNoteMs).toISOString() : null,
    };
  });

  const feedNodeById = new Map<string, TopologyFeedNode>();
  const feedNodeBySlug = new Map<string, TopologyFeedNode>();
  for (const tf of topologyFeeds) {
    feedNodeById.set(tf.id, tf);
    feedNodeBySlug.set(tf.slug, tf);
  }

  const topologyStreams: TopologyStreamNode[] = streams.map((s) => {
    const rawTabs = Array.isArray(s.tabs) ? s.tabs.filter((t: any) => !t.isHidden) : [];
    const tabs: TopologyTabNode[] = [];
    const countedFeedIds = new Set<string>();
    let streamUpcoming = 0;

    if (rawTabs.length > 0) {
      for (const t of rawTabs) {
        const fNode =
          (t.feedId && feedNodeById.get(t.feedId)) ||
          (t.targetSlug && feedNodeBySlug.get(t.targetSlug));
        const isFeedTab = !t.type || t.type === 'feed' || Boolean(t.feedId);
        if (contour === 'public' && ((isFeedTab && !fNode) || (fNode && fNode.privacy !== 'public'))) {
          continue;
        }
        const count = fNode ? fNode.totalNotes : 0;
        if (fNode) {
          countedFeedIds.add(fNode.id);
          streamUpcoming += feedStatsById.get(fNode.id)?.upcomingCount || 0;
        }
        tabs.push({
          id: t.id,
          slug: fNode?.slug || t.targetSlug || t.id,
          label: t.customTitle || fNode?.title || t.targetSlug || 'Tab',
          type: (t.type as any) || 'feed',
          privacy: fNode?.privacy || (s.privacy === 'private' ? 'private' : 'public'),
          icon: t.customIcon || fNode?.icon || null,
          color: fNode?.color || null,
          count,
        });
      }
    } else if (Array.isArray(s.feedIds)) {
      for (const fid of s.feedIds) {
        const fNode = feedNodeById.get(fid);
        if (!fNode) continue;
        if (contour === 'public' && fNode.privacy !== 'public') continue;
        countedFeedIds.add(fNode.id);
        streamUpcoming += feedStatsById.get(fNode.id)?.upcomingCount || 0;
        tabs.push({
          id: fNode.id,
          slug: fNode.slug,
          label: fNode.title,
          type: 'feed',
          privacy: fNode.privacy,
          icon: fNode.icon,
          color: fNode.color,
          count: fNode.totalNotes,
        });
      }
    }

    const totalNotes = Array.from(countedFeedIds).reduce(
      (sum, fid) => sum + (feedNodeById.get(fid)?.totalNotes || 0),
      0,
    );

    return {
      id: s.id,
      slug: s.slug,
      title: s.title,
      description: s.description || null,
      icon: s.icon || null,
      color: s.color || null,
      privacy: s.privacy === 'private' ? 'private' : 'public',
      order: s.order ?? 0,
      isBuiltin: Boolean(s.isBuiltin),
      totalNotes,
      upcomingCount: streamUpcoming,
      tabs,
    };
  });

  const dateBuckets: TopologyDateBucket[] = Array.from(dateCounts.entries())
    .map(([dateKey, count]) => ({ dateKey, count }))
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));

  const authors: TopologyAuthorFacet[] = Array.from(authorCounts.entries())
    .map(([author, count]) => ({ author, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 100);

  const hashtags: TopologyFacetItem[] = Array.from(hashtagCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 150);

  return {
    revision,
    contour,
    syncCursor: {
      lastEventId,
      revision,
      serverTime: now.toISOString(),
    },
    totals: {
      notes: notes.length,
      publicNotes,
      privateNotes,
      upcomingNotes,
      activePeriods: activePeriods.length,
    },
    streams: topologyStreams,
    feeds: topologyFeeds,
    facets: {
      hashtags,
      dateBuckets,
      authors,
      byType: byTypeGlobal,
      byOrigin: byOriginGlobal,
    },
    activePeriods: activePeriods.slice(0, 50),
  };
}

/**
 * Computes a minimal delta patch between two authoritative snapshots.
 * Includes explicit 0 counts when a dateBucket, author, or hashtag drops to zero.
 */
export function diffTopologySnapshots(
  prev: SeasonsTopologySnapshot | null,
  next: SeasonsTopologySnapshot,
): SeasonsTopologyPatch {
  const streamsPatch: SeasonsTopologyPatch['streams'] = {};
  const prevStreamMap = new Map((prev?.streams || []).map((s) => [s.slug, s]));
  for (const s of next.streams) {
    const p = prevStreamMap.get(s.slug);
    if (
      !p ||
      p.totalNotes !== s.totalNotes ||
      p.upcomingCount !== s.upcomingCount ||
      p.tabs.length !== s.tabs.length ||
      s.tabs.some((t, i) => p.tabs[i]?.count !== t.count)
    ) {
      streamsPatch[s.slug] = {
        totalNotes: s.totalNotes,
        upcomingCount: s.upcomingCount,
        tabs: s.tabs.map((t) => ({ slug: t.slug, count: t.count })),
      };
    }
  }

  const feedsPatch: SeasonsTopologyPatch['feeds'] = {};
  const prevFeedMap = new Map((prev?.feeds || []).map((f) => [f.slug, f]));
  for (const f of next.feeds) {
    const p = prevFeedMap.get(f.slug);
    if (
      !p ||
      p.totalNotes !== f.totalNotes ||
      p.publishedNotes !== f.publishedNotes ||
      p.stagingNotes !== f.stagingNotes ||
      p.lastNoteAt !== f.lastNoteAt
    ) {
      feedsPatch[f.slug] = {
        totalNotes: f.totalNotes,
        publishedNotes: f.publishedNotes,
        stagingNotes: f.stagingNotes,
        byType: f.byType,
        lastNoteAt: f.lastNoteAt,
      };
    }
  }

  const dateBucketsPatch: Record<string, number> = {};
  const prevDates = new Map((prev?.facets.dateBuckets || []).map((d) => [d.dateKey, d.count]));
  const nextDates = new Map(next.facets.dateBuckets.map((d) => [d.dateKey, d.count]));
  for (const [k, v] of nextDates) {
    if (prevDates.get(k) !== v) dateBucketsPatch[k] = v;
  }
  for (const [k] of prevDates) {
    if (!nextDates.has(k)) dateBucketsPatch[k] = 0;
  }

  const authorsPatch: Record<string, number> = {};
  const prevAuthors = new Map((prev?.facets.authors || []).map((a) => [a.author, a.count]));
  const nextAuthors = new Map(next.facets.authors.map((a) => [a.author, a.count]));
  for (const [k, v] of nextAuthors) {
    if (prevAuthors.get(k) !== v) authorsPatch[k] = v;
  }
  for (const [k] of prevAuthors) {
    if (!nextAuthors.has(k)) authorsPatch[k] = 0;
  }

  const hashtagsPatch: Record<string, number> = {};
  const prevTags = new Map((prev?.facets.hashtags || []).map((h) => [h.name, h.count]));
  const nextTags = new Map(next.facets.hashtags.map((h) => [h.name, h.count]));
  for (const [k, v] of nextTags) {
    if (prevTags.get(k) !== v) hashtagsPatch[k] = v;
  }
  for (const [k] of prevTags) {
    if (!nextTags.has(k)) hashtagsPatch[k] = 0;
  }

  return {
    type: 'TOPOLOGY_PATCH',
    revision: next.revision,
    previousRevision: prev ? prev.revision : next.revision - 1,
    contour: next.contour,
    timestamp: Date.now(),
    totals: next.totals,
    streams: streamsPatch,
    feeds: feedsPatch,
    dateBuckets: dateBucketsPatch,
    authors: authorsPatch,
    hashtags: hashtagsPatch,
  };
}
