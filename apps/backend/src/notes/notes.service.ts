import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotePublishedEvent } from '../events';
import { PrismaService } from '../prisma/prisma.service';
import { HashtagsService } from '../hashtags/hashtags.service';
import { FoldersService } from '../folders/folders.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { QuickShareNoteDto } from './dto/quick-share-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { QueryNotesDto } from './dto/query-notes.dto';
import { UpdateNoteImageDto, ImageOrderItemDto } from './dto/image.dto';
import { CreateNoteLinkDto, UpdateNoteLinkDto, LinkOrderItemDto } from './dto/link.dto';
import { ParseNotesDto, BatchCreateNotesDto } from './dto/parse-notes.dto';
import { AiQuickAddService } from './ai-quick-add.service';
import { Prisma } from '@prisma/client';
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

  async create(createNoteDto: CreateNoteDto) {
    this.notesCacheService.invalidateAll();

    // Verify feed exists if provided
    if (createNoteDto.feedId) {
      const feed = await this.prisma.feed.findUnique({
        where: { id: createNoteDto.feedId },
      });
      if (!feed || feed.deletedAt) {
        throw new NotFoundException(`Feed with ID '${createNoteDto.feedId}' not found`);
      }
    }

    const hashtagIds = await this.hashtagsService.resolveHashtags(
      createNoteDto.hashtags,
      createNoteDto.description,
      createNoteDto.title,
    );

    // Resolve folders
    let rawFolders: (string | any)[] = createNoteDto.folders
      ? [...createNoteDto.folders]
      : (createNoteDto.folder ? [createNoteDto.folder] : []);
    if (createNoteDto.folderIds && createNoteDto.folderIds.length > 0) {
      rawFolders = [...rawFolders, ...createNoteDto.folderIds];
    }

    let targetContainerId = (createNoteDto as any).containerId || undefined;
    const folderAssignments = await this.foldersService.resolveFolderAssignments(rawFolders, targetContainerId);

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

    const note = await this.prisma.note.create({
      data: {
        title: createNoteDto.title,
        description: createNoteDto.description,
        type: (createNoteDto.type as any) || 'SINGLE',
        status: (createNoteDto.status as any) || 'PUBLISHED',
        privacy: createNoteDto.privacy || 'private',
        publishAt: createNoteDto.publishAt ? new Date(createNoteDto.publishAt) : null,
        folderPath: initialFolderPath,
        startDate: createNoteDto.startDate ? new Date(createNoteDto.startDate) : new Date(),
        endDate: createNoteDto.endDate ? new Date(createNoteDto.endDate) : null,
        sourceLink: initialSourceLink,
        sourceType: createNoteDto.sourceType || 'MANUAL',
        externalId: createNoteDto.externalId,
        rawContent: createNoteDto.rawContent,
        summary: createNoteDto.summary,
        metadata: createNoteDto.metadata || undefined,
        processingStatus: createNoteDto.processingStatus || 'COMPLETED',
        icon: createNoteDto.icon,
        author: createNoteDto.author || createNoteDto.curator,
        resonanceScore: createNoteDto.resonanceScore,
        ...(createNoteDto.parentNoteId
          ? { parentNote: { connect: { id: createNoteDto.parentNoteId } } }
          : {}),
        ...(createNoteDto.feedId ? { feed: { connect: { id: createNoteDto.feedId } } } : {}),
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

  async findAll(query: QueryNotesDto, isAdmin = false) {
    const cacheKey = this.notesCacheService.generateKey('findAll', { ...query, isAdmin } as any);
    const cached = this.notesCacheService.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const numLimit = Number(query.limit);
    const safeLimit = Number.isFinite(numLimit) ? Math.max(1, Math.min(numLimit, 500)) : 50;
    const numOffset = Number(query.offset);
    const safeOffset = Number.isFinite(numOffset) ? Math.max(0, numOffset) : 0;
    const where = await this.notesQueryBuilder.buildWhereClause(query, isAdmin);
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
      if (item.metadata && (item.metadata as any).rawRelatedSection) {
        const { rawRelatedSection, ...restMeta } = item.metadata as any;
        return { ...item, metadata: restMeta };
      }
      return item;
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

  async findOne(id: string, isAdmin = false) {
    const note = await this.prisma.note.findUnique({
      where: { id },
      include: NOTE_INCLUDE_DEFAULT,
    });

    if (!note || note.deletedAt) {
      throw new NotFoundException(`Note with ID '${id}' not found`);
    }

    if (!isAdmin) {
      if ((note as any).privacy !== 'public' || note.status !== 'PUBLISHED') {
        throw new ForbiddenException('Заметка не опубликована в публичной ленте. Доступ запрещен.');
      }
      if (note.feed && (note.feed as any).privacy && (note.feed as any).privacy !== 'public') {
        throw new ForbiddenException('Заметка принадлежит приватной ленте. Доступ запрещен.');
      }
      if (note.folders?.some((f: any) => f.folder?.privacy === 'private')) {
        throw new ForbiddenException('Заметка находится в приватной папке. Доступ запрещен.');
      }
      if (note.folderPath) {
        const privateFolders = await this.prisma.folder.findMany({
          where: { privacy: 'private', deletedAt: null },
          select: { path: true },
        });
        const isPrivateFolder = privateFolders.some((pf) =>
          note.folderPath!.toLowerCase().startsWith(pf.path.toLowerCase()),
        );
        if (isPrivateFolder) {
          throw new ForbiddenException('Заметка находится в приватной папке. Доступ запрещен.');
        }
      }
    }

    return note;
  }

  async update(id: string, updateNoteDto: UpdateNoteDto) {
    this.notesCacheService.invalidateAll();
    const current = await this.findOne(id, true);

    if (updateNoteDto.feedId) {
      const feed = await this.prisma.feed.findUnique({
        where: { id: updateNoteDto.feedId },
      });
      if (!feed || feed.deletedAt) {
        throw new NotFoundException(`Feed with ID '${updateNoteDto.feedId}' not found`);
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
        ...(updateNoteDto.feedId !== undefined
          ? updateNoteDto.feedId
            ? { feed: { connect: { id: updateNoteDto.feedId } } }
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
        ),
      );
    }
    return updatedNote;
  }

  async softDelete(id: string) {
    this.notesCacheService.invalidateAll();
    await this.findOne(id, true);
    const deleted = await this.prisma.note.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    this.logger.log(`Soft-deleted note [id: ${id}]`);
    if (this.eventEmitter) {
      this.eventEmitter.emit('note.deleted', { noteId: id });
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
    this.logger.log(`Restored note [id: ${id}]`);
    return restored;
  }

  // ==========================================
  // Delegated Link Methods (backward compatibility)
  // ==========================================

  addLinks(noteId: string, dtos: CreateNoteLinkDto[]) {
    this.notesCacheService.invalidateAll();
    return this.notesLinksService.addLinks(noteId, dtos);
  }

  setSourceLink(noteId: string, linkId: string) {
    this.notesCacheService.invalidateAll();
    return this.notesLinksService.setSourceLink(noteId, linkId);
  }

  reorderLinks(noteId: string, items: LinkOrderItemDto[]) {
    this.notesCacheService.invalidateAll();
    return this.notesLinksService.reorderLinks(noteId, items);
  }

  updateLink(noteId: string, linkId: string, dto: UpdateNoteLinkDto) {
    this.notesCacheService.invalidateAll();
    return this.notesLinksService.updateLink(noteId, linkId, dto);
  }

  deleteLink(noteId: string, linkId: string) {
    this.notesCacheService.invalidateAll();
    return this.notesLinksService.deleteLink(noteId, linkId);
  }

  // ==========================================
  // Delegated Image & Media Methods (backward compatibility)
  // ==========================================

  uploadImages(noteId: string, files: Express.Multer.File[]) {
    this.notesCacheService.invalidateAll();
    return this.notesMediaService.uploadImages(noteId, files);
  }

  setMainImage(noteId: string, imageId: string) {
    this.notesCacheService.invalidateAll();
    return this.notesMediaService.setMainImage(noteId, imageId);
  }

  reorderImages(noteId: string, items: ImageOrderItemDto[]) {
    this.notesCacheService.invalidateAll();
    return this.notesMediaService.reorderImages(noteId, items);
  }

  updateImage(noteId: string, imageId: string, dto: UpdateNoteImageDto) {
    this.notesCacheService.invalidateAll();
    return this.notesMediaService.updateImage(noteId, imageId, dto);
  }

  deleteImage(noteId: string, imageId: string) {
    this.notesCacheService.invalidateAll();
    return this.notesMediaService.deleteImage(noteId, imageId);
  }

  uploadStandaloneMedia(file: Express.Multer.File) {
    return this.notesMediaService.uploadStandaloneMedia(file);
  }

  // ==========================================
  // Delegated Quick Share Methods (backward compatibility)
  // ==========================================

  quickShare(dto: QuickShareNoteDto) {
    this.notesCacheService.invalidateAll();
    return this.notesShareService.quickShare(dto);
  }
}
