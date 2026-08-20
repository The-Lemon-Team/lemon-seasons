export type NoteType =
  | 'SINGLE'
  | 'PERIOD'
  | 'EVENT'
  | 'FILM_RELEASE'
  | 'MENTION'
  | 'DONE';

export interface Feed {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  _count?: {
    notes: number;
  };
  notes?: Note[];
}

export interface TaxonomyNode {
  id: string;
  name: string;
  path: string;
  updatedAt: string;
  deletedAt: string | null;
  _count?: {
    notes: number;
  };
}

export interface TaxonomyTreeNode {
  id: string;
  name: string;
  path: string;
  notesCount: number;
  updatedAt: string;
  deletedAt: string | null;
  children: TaxonomyTreeNode[];
}

export interface Note {
  id: string;
  feedId: string;
  feed?: Feed;
  title: string;
  description: string | null;
  type: NoteType;
  startDate: string;
  endDate: string | null;
  sourceLink: string | null;
  icon: string | null;
  tags: TaxonomyNode[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface QueryNotesParams {
  feedId?: string;
  feedSlug?: string;
  type?: NoteType;
  startDateFrom?: string;
  startDateTo?: string;
  endDateFrom?: string;
  endDateTo?: string;
  tagId?: string;
  tagPath?: string;
  search?: string;
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
}

export interface NotesResponse {
  total: number;
  limit: number;
  offset: number;
  items: Note[];
}

export interface CreateNoteInput {
  feedId: string;
  title: string;
  description?: string;
  type: NoteType;
  startDate: string;
  endDate?: string;
  sourceLink?: string;
  icon?: string;
  tagIds?: string[];
}

export interface CreateFeedInput {
  title: string;
  description?: string;
  slug?: string;
}

export interface CreateTaxonomyInput {
  name: string;
  path: string;
}

export interface SyncChangesResponse {
  syncedAt: string;
  since: string;
  counts: {
    feeds: number;
    notes: number;
    taxonomy: number;
  };
  feeds: Feed[];
  notes: Note[];
  taxonomy: TaxonomyNode[];
}
