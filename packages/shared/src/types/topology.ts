export type NoteOrigin =
  | 'DIRECT_API'
  | 'DIRECT_UI'
  | 'NEURON_PARTY'
  | 'CODING_AGENT'
  | 'SUPABASE_SPARK'
  | 'GDRIVE_SPARK'
  | 'OBSIDIAN_CONTAINER';

export type BusDriverKind = 'supabase' | 'gdrive-cloud' | 'gdrive-fs' | 'hybrid' | 'memory' | 'cloud';

export interface NoteProvenance {
  origin: NoteOrigin;
  canonicalPath?: string | null;
  fileHash?: string | null;
  storageProvider?: 'supabase' | 'gdrive' | 'obsidian' | 'local' | null;
  transportVia?: BusDriverKind | null;
  deviceId?: string | null;
  actorId?: string | null;
}

export interface TopologySubtopicNode {
  slug: string;
  label: string;
  count: number;
}

export interface TopologyTabNode {
  id: string;
  slug: string;
  label: string;
  type: 'feed' | 'hashtag' | 'folder' | 'subtopic';
  privacy: 'public' | 'private';
  icon?: string | null;
  color?: string | null;
  count: number;
  subtopics?: TopologySubtopicNode[];
}

export interface TopologyStreamNode {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  privacy: 'public' | 'private';
  order: number;
  isBuiltin?: boolean;
  totalNotes: number;
  upcomingCount: number;
  tabs: TopologyTabNode[];
}

export interface TopologyFeedNode {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  privacy: 'public' | 'private';
  icon?: string | null;
  color?: string | null;
  totalNotes: number;
  publishedNotes: number;
  stagingNotes: number;
  byType: Record<string, number>;
  lastNoteAt: string | null;
}

export interface TopologyDateBucket {
  dateKey: string; // YYYY-MM-DD
  count: number;
}

export interface TopologyFacetItem {
  name: string;
  count: number;
}

export interface TopologyAuthorFacet {
  author: string;
  count: number;
}

export interface TopologyPeriodSummary {
  id: string;
  title: string;
  feedSlug?: string | null;
  startDate: string;
  endDate?: string | null;
  icon?: string | null;
  isPromoted?: boolean;
}

export interface SeasonsTopologySnapshot {
  revision: number;
  contour: 'public' | 'admin';
  syncCursor: {
    lastEventId: string | null;
    revision: number;
    serverTime: string;
  };
  totals: {
    notes: number;
    publicNotes: number;
    privateNotes: number;
    upcomingNotes: number;
    activePeriods: number;
  };
  streams: TopologyStreamNode[];
  feeds: TopologyFeedNode[];
  facets: {
    hashtags: TopologyFacetItem[];
    dateBuckets: TopologyDateBucket[];
    authors: TopologyAuthorFacet[];
    byType: Record<string, number>;
    byOrigin: Record<string, number>;
  };
  activePeriods: TopologyPeriodSummary[];
}

export interface SeasonsTopologyPatch {
  type: 'TOPOLOGY_PATCH';
  revision: number;
  previousRevision: number;
  contour: 'public' | 'admin';
  timestamp: number;
  totals: SeasonsTopologySnapshot['totals'];
  streams: Record<
    string,
    {
      totalNotes: number;
      upcomingCount: number;
      tabs?: Array<{ slug: string; count: number }>;
    }
  >;
  feeds: Record<
    string,
    {
      totalNotes: number;
      publishedNotes: number;
      stagingNotes: number;
      byType: Record<string, number>;
      lastNoteAt: string | null;
    }
  >;
  dateBuckets: Record<string, number>;
  authors: Record<string, number>;
  hashtags: Record<string, number>;
}
