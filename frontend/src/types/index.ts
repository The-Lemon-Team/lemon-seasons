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
  icon: string | null;
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
  icon: string | null;
  notesCount: number;
  updatedAt: string;
  deletedAt: string | null;
  children: TaxonomyTreeNode[];
}

export interface NoteImage {
  id: string;
  noteId: string;
  url: string;
  thumbnailUrl?: string | null;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  caption?: string | null;
  alt?: string | null;
  isMain: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface NoteLink {
  id: string;
  noteId: string;
  url: string;
  title?: string | null;
  isSource: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteLinkInput {
  url: string;
  title?: string;
  isSource?: boolean;
  order?: number;
}

export interface UpdateNoteLinkInput {
  url?: string;
  title?: string;
  isSource?: boolean;
  order?: number;
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
  images?: NoteImage[];
  links?: NoteLink[];
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
  links?: CreateNoteLinkInput[];
}

export interface CreateFeedInput {
  title: string;
  description?: string;
  slug?: string;
}

export interface CreateTaxonomyInput {
  name: string;
  path: string;
  icon?: string;
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
