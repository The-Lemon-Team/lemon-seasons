import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { join, resolve } from 'path';
import { RequestUser } from '../auth/auth.types';
import {
  canUserReadNoteRecord,
  rewritePrivateNoteImageUrls,
  verifyNoteMediaSignature,
} from './note-media-access.util';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotePublishedEvent } from '../events';
import { PrismaService } from '../prisma/prisma.service';
import { HashtagsService } from '../hashtags/hashtags.service';
import { FoldersService } from '../folders/folders.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { QuickShareNoteDto } from './dto/quick-share-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { QueryNotesDto } from './dto/query-notes.dto';
import {
  UpdateNoteImageDto,
  ImageOrderItemDto,
  ExternalImageItemDto,
  NoteMediaAttachmentDto,
} from './dto/image.dto';
import { CreateNoteLinkDto, UpdateNoteLinkDto, LinkOrderItemDto } from './dto/link.dto';
import { ParseNotesDto, BatchCreateNotesDto } from './dto/parse-notes.dto';
import { AiQuickAddService } from './ai-quick-add.service';
import { Prisma } from '@prisma/client';
import { getCandidateSlugVariants } from '@lenta/shared';
import { NotesLinksService } from './notes-links.service';
import { NotesMediaService } from './notes-media.service';
import { NotesShareService } from './notes-share.service';
import { NotesCacheService } from './notes-cache.service';
import { NotesQueryBuilder } from './notes-query.builder';
import { NOTE_INCLUDE_DEFAULT, NOTE_SELECT_FIELDS } from './notes.constants';

@Injectable()
export class NotesService implements OnModuleInit {
  private readonly logger = new Logger(NotesService.name);

  constructor(
    private prisma: PrismaService,
    private hashtagsService: HashtagsService,
    private foldersService: FoldersService,
    private aiQuickAddService: AiQuickAddService,
    private notesLinksService: NotesLinksService,
    private notesMediaService: NotesMediaService,
    private notesShareService: NotesShareService,
    private notesCacheService: NotesCacheService,
    private notesQueryBuilder: NotesQueryBuilder,
    @Optional() private eventEmitter?: EventEmitter2,
  ) {}

  async onModuleInit() {
    try {
      await this.prisma.$executeRawUnsafe(`
        ALTER TABLE "Note" ADD COLUMN IF NOT EXISTS "privacy" TEXT NOT NULL DEFAULT 'private';
      `);
      await this.prisma.$executeRawUnsafe(`
        ALTER TABLE "Note" ADD COLUMN IF NOT EXISTS "publicFeedId" TEXT;
      `);
      await this.prisma.$executeRawUnsafe(`
        UPDATE "Note" SET "privacy" = 'private' WHERE "privacy" IS NULL OR "privacy" = '';
      `);
      // Ensure classic public calendar feeds default to public contour
      await this.prisma.$executeRawUnsafe(`
        UPDATE "Note"
        SET "privacy" = 'public', "status" = 'PUBLISHED'
        WHERE "feedId" IN (
          SELECT id FROM "Feed" WHERE "privacy" = 'public' AND slug NOT LIKE 'spark-%'
        ) AND "privacy" != 'public';
      `);
    } catch (e: any) {
      this.logger.warn(`Privacy column init skipped: ${e.message}`);
    }
    try {
      await this.prisma.$executeRawUnsafe(`
        ALTER TABLE "Note" ADD COLUMN IF NOT EXISTS "ownerUserId" TEXT;
        ALTER TABLE "Feed" ADD COLUMN IF NOT EXISTS "ownerUserId" TEXT;
        ALTER TABLE "Stream" ADD COLUMN IF NOT EXISTS "ownerUserId" TEXT;
        CREATE TABLE IF NOT EXISTS "NoteShare" (
          "id" TEXT PRIMARY KEY,
          "noteId" TEXT NOT NULL REFERENCES "Note"("id") ON DELETE CASCADE,
          "granteeUserId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
          "grantedByUserId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
          "scopeType" TEXT NOT NULL DEFAULT 'USER',
          "scopeRef" TEXT,
          "canReadMedia" BOOLEAN NOT NULL DEFAULT TRUE,
          "expiresAt" TIMESTAMP,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "NoteShare_unique_grant" ON "NoteShare" ("noteId", "granteeUserId", "scopeType", "scopeRef");
        CREATE TABLE IF NOT EXISTS "FeedShare" (
          "id" TEXT PRIMARY KEY,
          "feedId" TEXT NOT NULL REFERENCES "Feed"("id") ON DELETE CASCADE,
          "granteeUserId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
          "grantedByUserId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
          "permission" TEXT NOT NULL DEFAULT 'READ',
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "FeedShare_unique_grant" ON "FeedShare" ("feedId", "granteeUserId");
      `);
    } catch (e: any) {
      this.logger.warn(`Multi-account share schema init skipped: ${e.message}`);
    }
    try {
      await this.prisma.$executeRawUnsafe(`
        UPDATE "Note" n
        SET "folderPath" = f.path
        FROM "NoteFolder" nf
        JOIN "Folder" f ON nf."folderId" = f.id
        WHERE nf."noteId" = n.id AND nf."isPrimary" = true AND (n."folderPath" IS NULL OR n."folderPath" = '');
      `);
    } catch (e: any) {
      this.logger.warn(`Folder path backfill skipped: ${e.message}`);
    }
  }

  async create(createNoteDto: CreateNoteDto, viewer?: RequestUser) {
    this.notesCacheService.invalidateAll();

    // Resolve folders input
    let rawFolders: (string | any)[] = createNoteDto.folders
      ? [...createNoteDto.folders]
      : (createNoteDto.folder ? [createNoteDto.folder] : []);
    if (createNoteDto.folderIds && createNoteDto.folderIds.length > 0) {
      rawFolders = [...rawFolders, ...createNoteDto.folderIds];
    }

    let targetContainerId = (createNoteDto as any).containerId || undefined;
    let resolvedFeedId = createNoteDto.feedId || undefined;

    // Parallelize feed validation, hashtag resolution, and folder assignment resolution
    const [, hashtagIds, folderAssignments] = await Promise.all([
      (async () => {
        if (resolvedFeedId) {
          const feed = await this.prisma.feed.findUnique({
            where: { id: resolvedFeedId },
          });
          if (!feed || feed.deletedAt) {
            throw new NotFoundException(`Feed with ID '${resolvedFeedId}' not found`);
          }
        } else if (createNoteDto.feedSlug && this.prisma.feed?.findFirst) {
          const candidateSlugs = getCandidateSlugVariants(createNoteDto.feedSlug);
          const bySlug = await this.prisma.feed.findFirst({
            where: { slug: { in: candidateSlugs }, deletedAt: null },
          });
          if (bySlug) {
            resolvedFeedId = bySlug.id;
          }
        }
      })(),
      this.hashtagsService.resolveHashtags(
        createNoteDto.hashtags,
        createNoteDto.description,
        createNoteDto.title,
      ),
      this.foldersService.resolveFolderAssignments(rawFolders, targetContainerId),
    ]);

    let initialFolderPath =
      createNoteDto.folderPath ||
      (createNoteDto.folder as string) ||
      (Array.isArray(createNoteDto.folders) && typeof createNoteDto.folders[0] === 'string'
        ? (createNoteDto.folders[0] as string)
        : undefined);

    // Single lookup for primary folder containerId & path if needed
    if ((!targetContainerId || !initialFolderPath) && folderAssignments.length > 0) {
      const primaryFolder = await this.prisma.folder.findUnique({
        where: { id: folderAssignments[0].folderId },
        select: { containerId: true, path: true },
      });
      if (!targetContainerId && primaryFolder?.containerId) {
        targetContainerId = primaryFolder.containerId;
      }
      if (!initialFolderPath && primaryFolder?.path) {
        initialFolderPath = primaryFolder.path;
      }
    }

    // Ensure container exists before attempting Prisma relation connection
    if (targetContainerId) {
      const containerExists = await this.prisma.container.findUnique({
        where: { id: targetContainerId },
        select: { id: true },
      });
      if (!containerExists) {
        targetContainerId = undefined;
      }
    }

    // Prepare initial links if provided
    let linksCreateInput: Prisma.NoteLinkCreateManyNoteInputEnvelope | undefined = undefined;
    if (createNoteDto.links && createNoteDto.links.length > 0) {
      linksCreateInput = {
        data: createNoteDto.links.map((linkDto, index) => {
          const isSource = linkDto.isSource ?? (index === 0);
          return {
            url: linkDto.url,
            title: linkDto.title,
            isSource,
            order: linkDto.order ?? index,
          };
        }),
      };
    }

    const initialSourceLink =
      createNoteDto.sourceLink ||
      createNoteDto.links?.find((l) => l.isSource)?.url ||
      createNoteDto.links?.[0]?.url;

    const resolvedOwnerUserId =
      createNoteDto.ownerUserId ||
      (viewer?.id && viewer.role !== 'guest' && !viewer.isAdmin ? viewer.id : undefined);

    const note = await this.prisma.note.create({
      data: {
        title: createNoteDto.title,
        description: createNoteDto.description,
        type: (createNoteDto.type as any) || 'SINGLE',
        status: (createNoteDto.status as any) || 'PUBLISHED',
        privacy: createNoteDto.privacy || 'private',
        ...(resolvedOwnerUserId ? { ownerUser: { connect: { id: resolvedOwnerUserId } } } : {}),
        publishAt: createNoteDto.publishAt ? new Date(createNoteDto.publishAt) : null,
        folderPath: initialFolderPath,
        startDate: createNoteDto.startDate ? new Date(createNoteDto.startDate) : new Date(),
        endDate: createNoteDto.endDate ? new Date(createNoteDto.endDate) : null,
        sourceLink: initialSourceLink,
        sourceType: createNoteDto.sourceType || 'MANUAL',
        externalId: createNoteDto.externalId,
        rawContent: createNoteDto.rawContent,
        summary: createNoteDto.summary,
        metadata: createNoteDto.origin
          ? { ...(createNoteDto.metadata || {}), origin: createNoteDto.origin }
          : createNoteDto.metadata || undefined,
        processingStatus: createNoteDto.processingStatus || 'COMPLETED',
        icon: createNoteDto.icon,
        author: createNoteDto.author || createNoteDto.curator,
        resonanceScore: createNoteDto.resonanceScore,
        ...(createNoteDto.parentNoteId
          ? { parentNote: { connect: { id: createNoteDto.parentNoteId } } }
          : {}),
        ...(resolvedFeedId ? { feed: { connect: { id: resolvedFeedId } } } : {}),
        ...(createNoteDto.publicFeedId ? { publicFeed: { connect: { id: createNoteDto.publicFeedId } } } : {}),
        ...(targetContainerId ? { container: { connect: { id: targetContainerId } } } : {}),
        hashtags: hashtagIds.length > 0 ? { connect: hashtagIds.map((id) => ({ id })) } : undefined,
        folders:
          folderAssignments.length > 0
            ? {
                create: folderAssignments.map((fa) => ({
                  folderId: fa.folderId,
                  isPrimary: fa.isPrimary,
                  order: fa.order,
                })),
              }
            : undefined,
        links: linksCreateInput ? { create: linksCreateInput.data } : undefined,
      },
      include: NOTE_INCLUDE_DEFAULT,
    });

    this.notesCacheService.invalidateAll();
    this.logger.log(`Created note "${note.title}" [id: ${note.id}]`);
    if (this.eventEmitter) {
      this.eventEmitter.emit(
        'note.published',
        new NotePublishedEvent(
          note.id,
          note.title,
          note.folderPath,
          note.status,
          note.publishAt,
          note.feedId,
          true,
          note,
        ),
      );
    }
    return note;
  }

  async parseAiNotes(dto: ParseNotesDto) {
    return this.aiQuickAddService.parseNotes(dto);
  }

  async createBatch(dto: BatchCreateNotesDto) {
    if (!dto.notes || !Array.isArray(dto.notes) || dto.notes.length === 0) {
      return { success: true, count: 0, items: [] };
    }

    this.notesCacheService.invalidateAll();
    const created: any[] = [];
    for (const noteDto of dto.notes) {
      const res = await this.create(noteDto);
      created.push(res);
    }

    return {
      success: true,
      count: created.length,
      items: created,
    };
  }

  async findAll(query: QueryNotesDto, isAdmin = false, viewer?: RequestUser) {
    const cacheKey = this.notesCacheService.generateKey('findAll', {
      ...query,
      isAdmin,
      ...(viewer?.id ? { viewerId: viewer.id } : {}),
    } as any);
    const cached = this.notesCacheService.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const numLimit = Number(query.limit);
    const safeLimit = Number.isFinite(numLimit) ? Math.max(1, Math.min(numLimit, 500)) : 50;
    const numOffset = Number(query.offset);
    const safeOffset = Number.isFinite(numOffset) ? Math.max(0, numOffset) : 0;
    const where = await this.notesQueryBuilder.buildWhereClause(query, isAdmin, viewer);
    const orderBy = this.notesQueryBuilder.buildOrderBy(query);

    const queryStartTime = Date.now();
    const [total, items] = await Promise.all([
      this.prisma.note.count({ where }),
      this.prisma.note.findMany({
        where,
        take: safeLimit,
        skip: safeOffset,
        orderBy,
        select: NOTE_SELECT_FIELDS,
      }),
    ]);

    const queryDuration = Date.now() - queryStartTime;
    if (queryDuration > 200) {
      this.logger.warn(`Slow notes query (${queryDuration}ms) for feedSlug=${query.feedSlug || 'all'}, limit=${safeLimit}, total=${total}`);
    }

    const cleanedItems = items.map((item) => {
      let nextItem = item;
      if (item.metadata && (item.metadata as any).rawRelatedSection) {
        const { rawRelatedSection, ...restMeta } = item.metadata as any;
        nextItem = { ...item, metadata: restMeta };
      }
      return rewritePrivateNoteImageUrls(nextItem as any, viewer);
    });

    const result = {
      total,
      limit: safeLimit,
      offset: safeOffset,
      items: cleanedItems,
    };

    this.notesCacheService.set(cacheKey, result, 60_000);
    return result;
  }

  async findOne(id: string, isAdmin = false, viewer?: RequestUser) {
    const note = await this.prisma.note.findUnique({
      where: { id },
      include: NOTE_INCLUDE_DEFAULT,
    });

    if (!note || note.deletedAt) {
      throw new NotFoundException(`Note with ID '${id}' not found`);
    }

    const effectiveViewer: RequestUser | null = isAdmin
      ? { id: viewer?.id || 'usr-admin-master', role: 'admin', isAdmin: true }
      : viewer || null;

    if (!effectiveViewer?.isAdmin) {
      let isPrivateFolder = false;
      if (note.folderPath) {
        const privateFolders = await this.prisma.folder.findMany({
          where: { privacy: 'private', deletedAt: null },
          select: { path: true },
        });
        isPrivateFolder = privateFolders.some((pf) =>
          note.folderPath!.toLowerCase().startsWith(pf.path.toLowerCase()),
        );
      }

      const allowed = canUserReadNoteRecord(note as any, effectiveViewer, {
        isPrivateFolderPath: isPrivateFolder,
      });
      if (!allowed) {
        throw new ForbiddenException('Заметка приватная или не опубликована. Доступ запрещен.');
      }
    }

    return rewritePrivateNoteImageUrls(note as any, effectiveViewer);
  }

  async update(id: string, updateNoteDto: UpdateNoteDto) {
    this.notesCacheService.invalidateAll();
    const current = await this.findOne(id, true);

    let resolvedUpdateFeedId = updateNoteDto.feedId;
    if (resolvedUpdateFeedId) {
      const feed = await this.prisma.feed.findUnique({
        where: { id: resolvedUpdateFeedId },
      });
      if (!feed || feed.deletedAt) {
        throw new NotFoundException(`Feed with ID '${resolvedUpdateFeedId}' not found`);
      }
    } else if (updateNoteDto.feedSlug && this.prisma.feed?.findFirst) {
      const candidateSlugs = getCandidateSlugVariants(updateNoteDto.feedSlug);
      const bySlug = await this.prisma.feed.findFirst({
        where: { slug: { in: candidateSlugs }, deletedAt: null },
      });
      if (bySlug) {
        resolvedUpdateFeedId = bySlug.id;
      }
    }

    let hashtagUpdates: Prisma.NoteUpdateInput['hashtags'] = undefined;
    if (
      updateNoteDto.hashtags !== undefined ||
      updateNoteDto.description !== undefined ||
      updateNoteDto.title !== undefined
    ) {
      const explicitTags =
        updateNoteDto.hashtags !== undefined
          ? updateNoteDto.hashtags
          : current.hashtags?.map((h) => h.name);
      const desc =
        updateNoteDto.description !== undefined
          ? updateNoteDto.description
          : current.description || undefined;
      const tit =
        updateNoteDto.title !== undefined ? updateNoteDto.title : current.title;

      const resolvedHIds = await this.hashtagsService.resolveHashtags(
        explicitTags,
        desc,
        tit,
      );
      hashtagUpdates = {
        set: resolvedHIds.map((hid) => ({ id: hid })),
      };
    }

    let resolvedFolderPath = updateNoteDto.folderPath;
    // Handle folders update if provided
    if (
      updateNoteDto.folders !== undefined ||
      updateNoteDto.folder !== undefined ||
      updateNoteDto.folderIds !== undefined
    ) {
      let rawFolders: (string | any)[] =
        updateNoteDto.folders !== undefined
          ? [...updateNoteDto.folders]
          : updateNoteDto.folder
          ? [updateNoteDto.folder]
          : [];
      if (updateNoteDto.folderIds && updateNoteDto.folderIds.length > 0) {
        rawFolders = [...rawFolders, ...updateNoteDto.folderIds];
      }
      const targetContainerId = (updateNoteDto as any).containerId || current.containerId || undefined;
      const folderAssignments = await this.foldersService.resolveFolderAssignments(rawFolders, targetContainerId);

      // Remove existing note folders and recreate
      await this.prisma.noteFolder.deleteMany({
        where: { noteId: id },
      });

      if (folderAssignments.length > 0) {
        await this.prisma.noteFolder.createMany({
          data: folderAssignments.map((fa) => ({
            noteId: id,
            folderId: fa.folderId,
            isPrimary: fa.isPrimary,
            order: fa.order,
          })),
        });

        if (resolvedFolderPath === undefined) {
          const primaryFa = folderAssignments.find((fa) => fa.isPrimary) || folderAssignments[0];
          const primaryFolder = await this.prisma.folder.findUnique({
            where: { id: primaryFa.folderId },
            select: { path: true },
          });
          if (primaryFolder?.path) {
            resolvedFolderPath = primaryFolder.path;
          }
        }
      } else if (resolvedFolderPath === undefined) {
        resolvedFolderPath = null;
      }
    }

    const updatedNote = await this.prisma.note.update({
      where: { id },
      data: {
        ...(updateNoteDto.title ? { title: updateNoteDto.title } : {}),
        ...(updateNoteDto.description !== undefined ? { description: updateNoteDto.description } : {}),
        ...(updateNoteDto.type ? { type: updateNoteDto.type as any } : {}),
        ...(updateNoteDto.status !== undefined ? { status: updateNoteDto.status as any } : {}),
        ...(updateNoteDto.privacy !== undefined ? { privacy: updateNoteDto.privacy } : {}),
        ...(updateNoteDto.publishAt !== undefined
          ? { publishAt: updateNoteDto.publishAt ? new Date(updateNoteDto.publishAt) : null }
          : {}),
        ...(resolvedFolderPath !== undefined ? { folderPath: resolvedFolderPath } : {}),
        ...(updateNoteDto.startDate ? { startDate: new Date(updateNoteDto.startDate) } : {}),
        ...(updateNoteDto.endDate !== undefined
          ? { endDate: updateNoteDto.endDate ? new Date(updateNoteDto.endDate) : null }
          : {}),
        ...(updateNoteDto.sourceLink !== undefined ? { sourceLink: updateNoteDto.sourceLink } : {}),
        ...(updateNoteDto.sourceType !== undefined ? { sourceType: updateNoteDto.sourceType } : {}),
        ...(updateNoteDto.externalId !== undefined ? { externalId: updateNoteDto.externalId } : {}),
        ...(updateNoteDto.rawContent !== undefined ? { rawContent: updateNoteDto.rawContent } : {}),
        ...(updateNoteDto.summary !== undefined ? { summary: updateNoteDto.summary } : {}),
        ...(updateNoteDto.metadata !== undefined ? { metadata: updateNoteDto.metadata } : {}),
        ...(updateNoteDto.processingStatus !== undefined ? { processingStatus: updateNoteDto.processingStatus } : {}),
        ...(updateNoteDto.icon !== undefined ? { icon: updateNoteDto.icon } : {}),
        ...(updateNoteDto.author !== undefined ? { author: updateNoteDto.author } : (updateNoteDto.curator !== undefined ? { author: updateNoteDto.curator } : {})),
        ...(updateNoteDto.resonanceScore !== undefined ? { resonanceScore: updateNoteDto.resonanceScore } : {}),
        ...(updateNoteDto.parentNoteId !== undefined
          ? updateNoteDto.parentNoteId
            ? { parentNote: { connect: { id: updateNoteDto.parentNoteId } } }
            : { parentNote: { disconnect: true } }
          : {}),
        ...(resolvedUpdateFeedId !== undefined
          ? resolvedUpdateFeedId
            ? { feed: { connect: { id: resolvedUpdateFeedId } } }
            : { feed: { disconnect: true } }
          : {}),
        ...(updateNoteDto.publicFeedId !== undefined
          ? updateNoteDto.publicFeedId
            ? { publicFeed: { connect: { id: updateNoteDto.publicFeedId } } }
            : { publicFeed: { disconnect: true } }
          : {}),
        ...((updateNoteDto as any).containerId !== undefined
          ? (updateNoteDto as any).containerId
            ? { container: { connect: { id: (updateNoteDto as any).containerId } } }
            : { container: { disconnect: true } }
          : {}),
        hashtags: hashtagUpdates,
      },
      include: NOTE_INCLUDE_DEFAULT,
    });

    this.notesCacheService.invalidateAll();
    this.logger.log(`Updated note "${updatedNote.title}" [id: ${updatedNote.id}]`);
    if (this.eventEmitter) {
      this.eventEmitter.emit(
        'note.published',
        new NotePublishedEvent(
          updatedNote.id,
          updatedNote.title,
          updatedNote.folderPath,
          updatedNote.status,
          updatedNote.publishAt,
          updatedNote.feedId,
          false,
          updatedNote,
          current,
        ),
      );
    }
    return updatedNote;
  }

  async softDelete(id: string) {
    this.notesCacheService.invalidateAll();
    const existing = await this.findOne(id, true);
    const deleted = await this.prisma.note.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    this.notesCacheService.invalidateAll();
    this.logger.log(`Soft-deleted note [id: ${id}]`);
    if (this.eventEmitter) {
      this.eventEmitter.emit('note.deleted', { noteId: id, previousState: existing });
    }
    return deleted;
  }

  async restore(id: string) {
    this.notesCacheService.invalidateAll();
    const note = await this.prisma.note.findUnique({ where: { id } });
    if (!note) {
      throw new NotFoundException(`Note with ID '${id}' not found`);
    }
    const restored = await this.prisma.note.update({
      where: { id },
      data: { deletedAt: null },
      include: NOTE_INCLUDE_DEFAULT,
    });
    this.notesCacheService.invalidateAll();
    this.logger.log(`Restored note [id: ${id}]`);
    return restored;
  }

  // ==========================================
  // Delegated Link Methods (backward compatibility)
  // ==========================================

  async addLinks(noteId: string, dtos: CreateNoteLinkDto[]) {
    try {
      return await this.notesLinksService.addLinks(noteId, dtos);
    } finally {
      this.notesCacheService.invalidateAll();
    }
  }

  async setSourceLink(noteId: string, linkId: string) {
    try {
      return await this.notesLinksService.setSourceLink(noteId, linkId);
    } finally {
      this.notesCacheService.invalidateAll();
    }
  }

  async reorderLinks(noteId: string, items: LinkOrderItemDto[]) {
    try {
      return await this.notesLinksService.reorderLinks(noteId, items);
    } finally {
      this.notesCacheService.invalidateAll();
    }
  }

  async updateLink(noteId: string, linkId: string, dto: UpdateNoteLinkDto) {
    try {
      return await this.notesLinksService.updateLink(noteId, linkId, dto);
    } finally {
      this.notesCacheService.invalidateAll();
    }
  }

  async deleteLink(noteId: string, linkId: string) {
    try {
      return await this.notesLinksService.deleteLink(noteId, linkId);
    } finally {
      this.notesCacheService.invalidateAll();
    }
  }

  // ==========================================
  // Delegated Image & Media Methods (backward compatibility)
  // ==========================================

  async uploadImages(noteId: string, files: Express.Multer.File[]) {
    try {
      return await this.notesMediaService.uploadImages(noteId, files);
    } finally {
      this.notesCacheService.invalidateAll();
    }
  }

  async setMainImage(noteId: string, imageId: string) {
    try {
      return await this.notesMediaService.setMainImage(noteId, imageId);
    } finally {
      this.notesCacheService.invalidateAll();
    }
  }

  async reorderImages(noteId: string, items: ImageOrderItemDto[]) {
    try {
      return await this.notesMediaService.reorderImages(noteId, items);
    } finally {
      this.notesCacheService.invalidateAll();
    }
  }

  async updateImage(noteId: string, imageId: string, dto: UpdateNoteImageDto) {
    try {
      return await this.notesMediaService.updateImage(noteId, imageId, dto);
    } finally {
      this.notesCacheService.invalidateAll();
    }
  }

  async deleteImage(noteId: string, imageId: string) {
    try {
      return await this.notesMediaService.deleteImage(noteId, imageId);
    } finally {
      this.notesCacheService.invalidateAll();
    }
  }

  uploadStandaloneMedia(file: Express.Multer.File) {
    return this.notesMediaService.uploadStandaloneMedia(file);
  }

  searchWebImages(query: string, options?: { gl?: string; hl?: string; num?: number }) {
    return this.notesMediaService.searchWebImages(query, options);
  }

  async attachImagesFromUrls(noteId: string, items: ExternalImageItemDto[]) {
    try {
      return await this.notesMediaService.attachImagesFromUrls(noteId, items);
    } finally {
      this.notesCacheService.invalidateAll();
    }
  }

  async attachMediaAssets(noteId: string, items: NoteMediaAttachmentDto[]) {
    try {
      return await this.notesMediaService.attachMediaAssets(noteId, items);
    } finally {
      this.notesCacheService.invalidateAll();
    }
  }

  downloadExternalMedia(url: string, title?: string) {
    return this.notesMediaService.downloadExternalMedia(url, title);
  }

  async attachMediaAssets(noteId: string, items: NoteMediaAttachmentDto[]) {
    try {
      return await this.notesMediaService.attachMediaAssets(noteId, items);
    } finally {
      this.notesCacheService.invalidateAll();
    }
  }

  // ==========================================
  // Delegated Quick Share Methods (backward compatibility)
  // ==========================================

  async quickShare(dto: QuickShareNoteDto) {
    try {
      return await this.notesShareService.quickShare(dto);
    } finally {
      this.notesCacheService.invalidateAll();
    }
  }

  // ==========================================
  // Multi-Account & Group Note Sharing + Protected File Delivery
  // ==========================================

  private assertCanManageNoteShares(note: { ownerUserId?: string | null }, caller?: RequestUser) {
    if (!caller || caller.role === 'guest') {
      throw new ForbiddenException('Требуется авторизация для управления доступом к заметке.');
    }
    if (!caller.isAdmin && note.ownerUserId !== caller.id) {
      throw new ForbiddenException('Только владелец заметки может расшаривать её или отзывать доступ.');
    }
  }

  async listNoteShares(noteId: string, caller?: RequestUser) {
    const note = await this.prisma.note.findUnique({ where: { id: noteId } });
    if (!note || note.deletedAt) {
      throw new NotFoundException(`Note '${noteId}' not found`);
    }
    this.assertCanManageNoteShares(note as any, caller);
    return (this.prisma as any).noteShare.findMany({
      where: { noteId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async shareNoteWithGrantees(
    noteId: string,
    dto: {
      granteeUserIds: string[];
      scopeType?: 'USER' | 'TIMELINE_GROUP';
      scopeRef?: string;
      canReadMedia?: boolean;
      expiresAt?: string;
    },
    caller?: RequestUser,
  ) {
    const note = await this.prisma.note.findUnique({ where: { id: noteId } });
    if (!note || note.deletedAt) {
      throw new NotFoundException(`Note '${noteId}' not found`);
    }
    this.assertCanManageNoteShares(note as any, caller);

    const scopeType = dto.scopeType || 'USER';
    const scopeRef = dto.scopeRef || '';
    const grantedByUserId = caller!.id;
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;

    const results: any[] = [];
    for (const granteeUserId of dto.granteeUserIds || []) {
      if (!granteeUserId || granteeUserId === (note as any).ownerUserId) continue;
      const upserted = await (this.prisma as any).noteShare.upsert({
        where: {
          noteId_granteeUserId_scopeType_scopeRef: {
            noteId,
            granteeUserId,
            scopeType,
            scopeRef,
          },
        },
        update: {
          canReadMedia: dto.canReadMedia ?? true,
          expiresAt,
        },
        create: {
          noteId,
          granteeUserId,
          grantedByUserId,
          scopeType,
          scopeRef,
          canReadMedia: dto.canReadMedia ?? true,
          expiresAt,
        },
      });
      results.push(upserted);
    }

    this.notesCacheService.invalidateAll();
    return results;
  }

  async revokeNoteShare(
    noteId: string,
    dto: { granteeUserId?: string; scopeRef?: string },
    caller?: RequestUser,
  ) {
    const note = await this.prisma.note.findUnique({ where: { id: noteId } });
    if (!note || note.deletedAt) {
      throw new NotFoundException(`Note '${noteId}' not found`);
    }
    this.assertCanManageNoteShares(note as any, caller);

    const where: any = { noteId };
    if (dto.granteeUserId) where.granteeUserId = dto.granteeUserId;
    if (dto.scopeRef) where.scopeRef = dto.scopeRef;

    const deleted = await (this.prisma as any).noteShare.deleteMany({ where });
    this.notesCacheService.invalidateAll();
    return { revoked: deleted.count };
  }

  async resolveAuthorizedNoteImageFile(
    noteId: string,
    imageId: string,
    queryAuth: { variant?: string; uid?: string; exp?: string; sig?: string },
    viewer?: RequestUser,
  ): Promise<{ filePath: string; mimeType: string }> {
    const note = await this.prisma.note.findUnique({
      where: { id: noteId },
      include: {
        ...NOTE_INCLUDE_DEFAULT,
        images: true,
      },
    });
    if (!note || note.deletedAt) {
      throw new NotFoundException(`Note '${noteId}' not found`);
    }

    const image = (note.images || []).find((img: any) => img.id === imageId);
    if (!image) {
      throw new NotFoundException(`Image '${imageId}' not found on note '${noteId}'`);
    }

    const variant: 'full' | 'thumb' = queryAuth.variant === 'thumb' ? 'thumb' : 'full';
    const sigValid = verifyNoteMediaSignature({
      noteId,
      imageId,
      viewerUserId: queryAuth.uid,
      exp: queryAuth.exp,
      sig: queryAuth.sig,
      variant,
    });

    if (!sigValid) {
      const allowed = canUserReadNoteRecord(note as any, viewer);
      if (!allowed) {
        throw new ForbiddenException('Нет доступа к приватному медиа-файлу этой заметки.');
      }
      if (viewer?.id && (note as any).ownerUserId !== viewer.id && !viewer.isAdmin) {
        const share = ((note as any).shares || []).find((s: any) => s.granteeUserId === viewer.id);
        if (share && share.canReadMedia === false) {
          throw new ForbiddenException('Доступ к вложениям для этого шаринга отключён.');
        }
      }
    }

    const rawUrl = variant === 'thumb' && image.thumbnailUrl ? image.thumbnailUrl : image.url;
    const cleanRel = String(rawUrl || '').replace(/^\/+/, '');
    const uploadsRoot = resolve(process.cwd(), 'uploads');
    const candidatePath = resolve(process.cwd(), cleanRel);
    if (!candidatePath.startsWith(uploadsRoot)) {
      throw new ForbiddenException('Некорректный путь к файлу вложения.');
    }

    return {
      filePath: candidatePath,
      mimeType: image.mimeType || 'application/octet-stream',
    };
  }
}
