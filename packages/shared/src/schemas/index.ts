import { z } from 'zod';
import { NOTE_TYPES } from '../constants';

export const noteTypeSchema = z.enum([
  'SINGLE',
  'PERIOD',
  'EVENT',
  'FILM_RELEASE',
  'MENTION',
  'DONE',
]);

export const createNoteLinkSchema = z.object({
  url: z.string().url(),
  title: z.string().optional(),
  isSource: z.boolean().optional(),
  order: z.number().int().optional(),
});

export const createNoteSchema = z.object({
  feedId: z.string().uuid().or(z.string().min(1)),
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().optional().nullable(),
  type: noteTypeSchema.default('EVENT'),
  startDate: z.string().datetime().or(z.string().min(1)),
  endDate: z.string().datetime().or(z.string().min(1)).optional().nullable(),
  sourceLink: z.string().url().optional().nullable(),
  icon: z.string().optional().nullable(),
  tagIds: z.array(z.string()).optional(),
  hashtags: z.array(z.string()).optional(),
  folders: z.array(z.union([z.string(), z.object({ path: z.string(), isPrimary: z.boolean().optional(), order: z.number().optional() })])).optional(),
  folder: z.string().optional(),
  links: z.array(createNoteLinkSchema).optional(),
  suggestFolder: z.boolean().optional(),
});

export const updateNoteSchema = createNoteSchema.partial().extend({
  feedId: z.string().optional(),
  title: z.string().min(1).optional(),
});

export const queryNotesSchema = z.object({
  feedId: z.string().optional(),
  feedSlug: z.string().optional(),
  type: noteTypeSchema.optional(),
  startDateFrom: z.string().optional(),
  startDateTo: z.string().optional(),
  endDateFrom: z.string().optional(),
  endDateTo: z.string().optional(),
  queryStart: z.string().optional(),
  queryEnd: z.string().optional(),
  overlapStart: z.string().optional(),
  overlapEnd: z.string().optional(),
  tagId: z.string().optional(),
  tagPath: z.string().optional(),
  hashtag: z.string().optional(),
  hashtagId: z.string().optional(),
  folder: z.string().optional(),
  folderId: z.string().optional(),
  folderPrefix: z.string().optional(),
  unfiled: z.boolean().optional(),
  search: z.string().optional(),
  includeDeleted: z.boolean().optional(),
  limit: z.number().int().positive().optional().default(50),
  offset: z.number().int().nonnegative().optional().default(0),
});

export const createFeedSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  slug: z.string().optional().nullable(),
});

export const createFolderSchema = z.object({
  name: z.string().optional(),
  path: z.string().min(1),
  icon: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
});

export const createTaxonomySchema = z.object({
  name: z.string().min(1),
  path: z.string().min(1),
  icon: z.string().optional().nullable(),
});

export const frontmatterSchema = z.object({
  lenta_id: z.string().optional(),
  id: z.string().optional(),
  title: z.string().optional(),
  feed: z.string().optional(),
  type: noteTypeSchema.optional(),
  start_date: z.string().optional(),
  startDate: z.string().optional(),
  end_date: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  primary_folder: z.string().optional(),
  folders: z.array(z.string()).optional(),
  taxonomy: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  updated_at: z.string().optional(),
  updatedAt: z.string().optional(),
  deleted: z.boolean().optional(),
});
