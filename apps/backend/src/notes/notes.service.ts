import { Injectable, NotFoundException, Logger } from '@nestjs/common';
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
export class NotesService {
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
  ) {}

  /**
   * @deprecated Taxonomy tags are retired in favor of Folders and Hashtags.
   */
  private async resolveTagIds(_tagIdentifiers?: string[]): Promise<string[]> {
    return [];
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

    // If containerId not provided, attempt to inherit from the primary assigned folder
    if (!targetContainerId && folderAssignments.length > 0) {
      const primaryFolder = await this.prisma.folder.findUnique({
        where: { id: folderAssignments[0].folderId },
        select: { containerId: true },
      });
      if (primaryFolder?.containerId) {
        targetContainerId = primaryFolder.containerId;
      }
    }

    // Ensure container exists before attempting Prisma relation connection
    if (targetContainerId) {
      const containerExists = await this.prisma.container.findUnique({
        where: { id: targetContainerId },
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
        publishAt: createNoteDto.publishAt ? new Date(createNoteDto.publishAt) : null,
        folderPath:
          createNoteDto.folderPath ||
          (createNoteDto.folder as string) ||
          (Array.isArray(createNoteDto.folders) && typeof createNoteDto.folders[0] === 'string'
            ? (createNoteDto.folders[0] as string)
            : undefined),
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
        curator: createNoteDto.curator,
        resonanceScore: createNoteDto.resonanceScore,
        ...(createNoteDto.parentNoteId
          ? { parentNote: { connect: { id: createNoteDto.parentNoteId } } }
          : {}),
        ...(createNoteDto.feedId ? { feed: { connect: { id: createNoteDto.feedId } } } : {}),
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

  async findAll(query: QueryNotesDto) {
    const cacheKey = this.notesCacheService.generateKey('findAll', query as any);
    const cached = this.notesCacheService.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const { limit = 50, offset = 0 } = query;
    const where = await this.notesQueryBuilder.buildWhereClause(query);

    const queryStartTime = Date.now();
    const [total, items] = await Promise.all([
      this.prisma.note.count({ where }),
      this.prisma.note.findMany({
        where,
        take: Number(limit),
        skip: Number(offset),
        orderBy: { startDate: 'desc' },
        select: NOTE_SELECT_FIELDS,
      }),
    ]);

    const queryDuration = Date.now() - queryStartTime;
    if (queryDuration > 200) {
      this.logger.warn(`Slow notes query (${queryDuration}ms) for feedSlug=${query.feedSlug || 'all'}, limit=${limit}, total=${total}`);
    }

    const result = {
      total,
      limit: Number(limit),
      offset: Number(offset),
      items,
    };

    this.notesCacheService.set(cacheKey, result);
    return result;
  }

  async findOne(id: string) {
    const note = await this.prisma.note.findUnique({
      where: { id },
      include: NOTE_INCLUDE_DEFAULT,
    });

    if (!note || note.deletedAt) {
      throw new NotFoundException(`Note with ID '${id}' not found`);
    }
    return note;
  }

  async update(id: string, updateNoteDto: UpdateNoteDto) {
    this.notesCacheService.invalidateAll();
    const current = await this.findOne(id);

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
      }
    }

    const updatedNote = await this.prisma.note.update({
      where: { id },
      data: {
        ...(updateNoteDto.title ? { title: updateNoteDto.title } : {}),
        ...(updateNoteDto.description !== undefined ? { description: updateNoteDto.description } : {}),
        ...(updateNoteDto.type ? { type: updateNoteDto.type as any } : {}),
        ...(updateNoteDto.status !== undefined ? { status: updateNoteDto.status as any } : {}),
        ...(updateNoteDto.publishAt !== undefined
          ? { publishAt: updateNoteDto.publishAt ? new Date(updateNoteDto.publishAt) : null }
          : {}),
        ...(updateNoteDto.folderPath !== undefined ? { folderPath: updateNoteDto.folderPath } : {}),
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
        ...(updateNoteDto.curator !== undefined ? { curator: updateNoteDto.curator } : {}),
        ...(updateNoteDto.resonanceScore !== undefined ? { resonanceScore: updateNoteDto.resonanceScore } : {}),
        ...(updateNoteDto.parentNoteId !== undefined
          ? updateNoteDto.parentNoteId
            ? { parentNote: { connect: { id: updateNoteDto.parentNoteId } } }
            : { parentNote: { disconnect: true } }
          : {}),
        ...(updateNoteDto.feedId ? { feed: { connect: { id: updateNoteDto.feedId } } } : {}),
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
    return updatedNote;
  }

  async softDelete(id: string) {
    this.notesCacheService.invalidateAll();
    await this.findOne(id);
    const deleted = await this.prisma.note.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    this.logger.log(`Soft-deleted note [id: ${id}]`);
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
