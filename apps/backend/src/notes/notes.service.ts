import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
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
import { suggestFolderPathFromTaxonomyPath } from '@lenta/shared';

@Injectable()
export class NotesService {
  private readonly logger = new Logger(NotesService.name);

  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private hashtagsService: HashtagsService,
    private foldersService: FoldersService,
    private aiQuickAddService: AiQuickAddService,
  ) {}

  private async resolveTagIds(tagIdentifiers?: string[]): Promise<string[]> {
    if (!tagIdentifiers || tagIdentifiers.length === 0) {
      return [];
    }

    const cleanItems = Array.from(
      new Set(tagIdentifiers.filter((item): item is string => Boolean(item && item.trim()))),
    );
    if (cleanItems.length === 0) return [];

    const formattedPaths = cleanItems.map((i) => i.toLowerCase().trim());

    // Batch query existing taxonomy nodes by ID or path
    const existingNodes = await this.prisma.taxonomyNode.findMany({
      where: {
        OR: [
          { id: { in: cleanItems } },
          { path: { in: formattedPaths } },
        ],
        deletedAt: null,
      },
    });

    const foundMap = new Map<string, string>();
    for (const node of existingNodes) {
      foundMap.set(node.id, node.id);
      foundMap.set(node.path, node.id);
    }

    const resolvedIds: string[] = [];

    for (const item of cleanItems) {
      const lower = item.toLowerCase().trim();
      const existingId = foundMap.get(item) || foundMap.get(lower);
      if (existingId) {
        resolvedIds.push(existingId);
      } else {
        // If it's a path that doesn't exist yet, auto-create it
        const parts = lower.split('.');
        const name = parts[parts.length - 1];
        const newNode = await this.prisma.taxonomyNode.create({
          data: {
            name: name.charAt(0).toUpperCase() + name.slice(1),
            path: lower,
          },
        });
        foundMap.set(newNode.id, newNode.id);
        foundMap.set(newNode.path, newNode.id);
        resolvedIds.push(newNode.id);
      }
    }

    return Array.from(new Set(resolvedIds));
  }

  async create(createNoteDto: CreateNoteDto) {
    // Verify feed exists if provided
    if (createNoteDto.feedId) {
      const feed = await this.prisma.feed.findUnique({
        where: { id: createNoteDto.feedId },
      });
      if (!feed || feed.deletedAt) {
        throw new NotFoundException(`Feed with ID '${createNoteDto.feedId}' not found`);
      }
    }

    const tagIds = await this.resolveTagIds(createNoteDto.tagIds);
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

    // Smart Routing: If no folders provided, optionally suggest/provision folder from primary taxonomy tag
    if (rawFolders.length === 0 && tagIds.length > 0) {
      const primaryTag = await this.prisma.taxonomyNode.findUnique({
        where: { id: tagIds[0] },
      });
      if (primaryTag?.path) {
        const suggestedPath = suggestFolderPathFromTaxonomyPath(primaryTag.path);
        if (suggestedPath) {
          rawFolders = [{ path: suggestedPath, isPrimary: true, order: 0 } as any];
        }
      }
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
    let linksData: Prisma.NoteLinkCreateWithoutNoteInput[] | undefined = undefined;
    let initialSourceLink = createNoteDto.sourceLink;

    if (createNoteDto.links && createNoteDto.links.length > 0) {
      const hasExplicitSource = createNoteDto.links.some((l) => l.isSource);
      linksData = createNoteDto.links.map((link, idx) => {
        const isSource = hasExplicitSource ? Boolean(link.isSource) : idx === 0;
        if (isSource) {
          initialSourceLink = link.url;
        }
        return {
          url: link.url,
          title: link.title,
          isSource,
          order: link.order ?? idx,
        };
      });
    }

    const createdNote = await this.prisma.note.create({
      data: {
        title: createNoteDto.title,
        description: createNoteDto.description,
        type: createNoteDto.type as any,
        startDate: new Date(createNoteDto.startDate),
        endDate: createNoteDto.endDate ? new Date(createNoteDto.endDate) : null,
        sourceLink: initialSourceLink,
        icon: createNoteDto.icon,
        curator: createNoteDto.curator,
        resonanceScore: createNoteDto.resonanceScore,
        parentNote: createNoteDto.parentNoteId ? { connect: { id: createNoteDto.parentNoteId } } : undefined,
        feed: createNoteDto.feedId ? { connect: { id: createNoteDto.feedId } } : undefined,
        container: targetContainerId ? { connect: { id: targetContainerId } } : undefined,
        tags: tagIds.length > 0 ? { connect: tagIds.map((id) => ({ id })) } : undefined,
        hashtags: hashtagIds.length > 0 ? { connect: hashtagIds.map((id) => ({ id })) } : undefined,
        folders: folderAssignments.length > 0
          ? {
              create: folderAssignments.map((fa) => ({
                folderId: fa.folderId,
                isPrimary: fa.isPrimary,
                order: fa.order,
              })),
            }
          : undefined,
        links: linksData ? { create: linksData } : undefined,
      },
      include: {
        feed: true,
        tags: { where: { deletedAt: null } },
        hashtags: { where: { deletedAt: null } },
        folders: {
          include: { folder: true },
          orderBy: { order: 'asc' },
        },
        images: { orderBy: { order: 'asc' } },
        links: { orderBy: { order: 'asc' } },
      },
    });

    this.logger.log(`Created note "${createdNote.title}" [id: ${createdNote.id}, type: ${createdNote.type}, container: ${targetContainerId || 'public'}]`);
    return createdNote;
  }

  async parseAiNotes(dto: ParseNotesDto) {
    return this.aiQuickAddService.parseNotes(dto);
  }

  async createBatch(dto: BatchCreateNotesDto) {
    if (!dto.notes || !Array.isArray(dto.notes) || dto.notes.length === 0) {
      return { createdCount: 0, notes: [] };
    }

    const createdNotes: any[] = [];
    for (const noteDto of dto.notes) {
      try {
        const created = await this.create(noteDto);
        createdNotes.push(created);
      } catch (err: any) {
        // Continue creating others if one fails, but log error
        this.logger.error(`Failed to create batch note "${noteDto.title}": ${err?.message || err}`);
      }
    }

    return {
      createdCount: createdNotes.length,
      notes: createdNotes,
    };
  }

  async findAll(query: QueryNotesDto) {

    const {
      feedId,
      feedSlug,
      type,
      startDateFrom,
      startDateTo,
      endDateFrom,
      endDateTo,
      queryStart,
      queryEnd,
      overlapStart,
      overlapEnd,
      tagId,
      tagPath,
      hashtag,
      hashtagId,
      folder,
      folderId,
      folderPrefix,
      unfiled,
      search,
      includeDeleted = false,
      limit = 50,
      offset = 0,
      containerId,
      containers,
      userId,
    } = query;

    // Time window overlap query handling
    const qStart = queryStart || overlapStart || (startDateFrom && startDateTo ? startDateFrom : undefined);
    const qEnd = queryEnd || overlapEnd || (startDateFrom && startDateTo ? startDateTo : undefined);

    const parsedContainers = containers
      ? containers.split(',').map((c) => c.trim()).filter(Boolean)
      : undefined;

    const where: Prisma.NoteWhereInput = {
      ...(includeDeleted ? {} : { deletedAt: null }),
      ...(feedId ? { feedId } : {}),
      ...(feedSlug
        ? feedSlug === 'russian-holidays'
          ? { feed: { slug: { in: ['russian-holidays', 'russian-official', 'russian-military'] }, deletedAt: null } }
          : feedSlug === 'christian-holidays'
          ? { feed: { slug: { in: ['christian-holidays', 'orthodox-holidays', 'catholic-holidays'] }, deletedAt: null } }
          : feedSlug === 'world-religions'
          ? { feed: { slug: { in: ['world-religions', 'islamic-holidays'] }, deletedAt: null } }
          : { feed: { slug: feedSlug, deletedAt: null } }
        : {}),
      ...(containerId ? { containerId } : {}),
      ...(parsedContainers && parsedContainers.length > 0
        ? { containerId: { in: parsedContainers } }
        : {}),
      ...(type ? { type: type as any } : {}),
      ...(query.curator
        ? {
            OR: [
              { curator: { equals: query.curator, mode: 'insensitive' } },
              { curator: { contains: query.curator, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.minResonance !== undefined && query.minResonance !== null
        ? { resonanceScore: { gte: Number(query.minResonance) } }
        : {}),
      ...(tagId ? { tags: { some: { id: tagId, deletedAt: null } } } : {}),
      ...(tagPath
        ? {
            tags: {
              some: {
                path: { startsWith: tagPath.toLowerCase().trim() },
                deletedAt: null,
              },
            },
          }
        : {}),
      ...(hashtag
        ? {
            hashtags: {
              some: {
                name: HashtagsService.normalizeName(hashtag),
                deletedAt: null,
              },
            },
          }
        : {}),
      ...(hashtagId
        ? {
            hashtags: {
              some: {
                id: hashtagId,
                deletedAt: null,
              },
            },
          }
        : {}),
      ...(unfiled
        ? {
            folders: { none: {} },
          }
        : {}),
      ...(folderId
        ? {
            folders: {
              some: {
                folderId,
                folder: { deletedAt: null },
              },
            },
          }
        : {}),
      ...(folder
        ? {
            folders: {
              some: {
                folder: {
                  path: FoldersService.normalizePath(folder),
                  deletedAt: null,
                },
              },
            },
          }
        : {}),
      ...(folderPrefix
        ? {
            folders: {
              some: {
                folder: {
                  path: {
                    startsWith: FoldersService.normalizePath(folderPrefix),
                  },
                  deletedAt: null,
                },
              },
            },
          }
        : {}),
    };

    const andConditions: Prisma.NoteWhereInput[] = [];

    // Multi-tenancy & Container Privacy Filter
    if (userId !== 'usr-admin-999') {
      andConditions.push({
        OR: [
          { containerId: null },
          { container: { visibility: 'public' } },
          ...(userId ? [{ container: { ownerUserId: userId } }] : []),
        ],
      });
    }

    // Text search filter across title, description, feed title, hashtags, and folder paths
    if (search && search.trim()) {
      const cleanSearch = search.trim();
      const normalizedHashtagSearch = HashtagsService.normalizeName(cleanSearch);

      andConditions.push({
        OR: [
          { title: { contains: cleanSearch, mode: 'insensitive' } },
          { description: { contains: cleanSearch, mode: 'insensitive' } },
          { feed: { title: { contains: cleanSearch, mode: 'insensitive' } } },
          { curator: { contains: cleanSearch, mode: 'insensitive' } },
          ...(normalizedHashtagSearch
            ? [
                {
                  hashtags: {
                    some: {
                      name: {
                        contains: normalizedHashtagSearch,
                        mode: 'insensitive' as const,
                      },
                      deletedAt: null,
                    },
                  },
                },
              ]
            : []),
          {
            folders: {
              some: {
                folder: {
                  path: {
                    contains: cleanSearch,
                    mode: 'insensitive',
                  },
                  deletedAt: null,
                },
              },
            },
          },
        ],
      });
    }

    // Time window overlap query handling
    if (qStart && qEnd) {
      const windowStart = new Date(qStart);
      const windowEnd = new Date(qEnd);

      andConditions.push({
        startDate: { lte: windowEnd },
        OR: [
          { endDate: { gte: windowStart } },
          { endDate: null, startDate: { gte: windowStart } },
          { type: 'PERIOD', endDate: null },
        ],
      });
    } else {
      if (startDateFrom || startDateTo) {
        where.startDate = {
          ...(startDateFrom ? { gte: new Date(startDateFrom) } : {}),
          ...(startDateTo ? { lte: new Date(startDateTo) } : {}),
        };
      }
      if (endDateFrom || endDateTo) {
        where.endDate = {
          ...(endDateFrom ? { gte: new Date(endDateFrom) } : {}),
          ...(endDateTo ? { lte: new Date(endDateTo) } : {}),
        };
      }
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const queryStartTime = Date.now();
    const [total, items] = await Promise.all([
      this.prisma.note.count({ where }),
      this.prisma.note.findMany({
        where,
        take: Number(limit),
        skip: Number(offset),
        orderBy: { startDate: 'desc' },
        include: {
          feed: true,
          tags: { where: { deletedAt: null } },
          hashtags: { where: { deletedAt: null } },
          folders: {
            include: { folder: true },
            orderBy: { order: 'asc' },
          },
          images: { orderBy: { order: 'asc' } },
          links: { orderBy: { order: 'asc' } },
        },
      }),
    ]);

    const queryDuration = Date.now() - queryStartTime;
    if (queryDuration > 200) {
      this.logger.warn(`Slow notes query (${queryDuration}ms) for feedSlug=${feedSlug || 'all'}, limit=${limit}, total=${total}`);
    }

    return {
      total,
      limit: Number(limit),
      offset: Number(offset),
      items,
    };
  }

  async findOne(id: string) {
    const note = await this.prisma.note.findUnique({
      where: { id },
      include: {
        feed: true,
        tags: { where: { deletedAt: null } },
        hashtags: { where: { deletedAt: null } },
        folders: {
          include: { folder: true },
          orderBy: { order: 'asc' },
        },
        images: { orderBy: { order: 'asc' } },
        links: { orderBy: { order: 'asc' } },
      },
    });

    if (!note || note.deletedAt) {
      throw new NotFoundException(`Note with ID '${id}' not found`);
    }
    return note;
  }

  async update(id: string, updateNoteDto: UpdateNoteDto) {
    const current = await this.findOne(id);

    if (updateNoteDto.feedId) {
      const feed = await this.prisma.feed.findUnique({
        where: { id: updateNoteDto.feedId },
      });
      if (!feed || feed.deletedAt) {
        throw new NotFoundException(`Feed with ID '${updateNoteDto.feedId}' not found`);
      }
    }

    let tagUpdates: Prisma.NoteUpdateInput['tags'] = undefined;
    if (updateNoteDto.tagIds !== undefined) {
      const resolvedIds = await this.resolveTagIds(updateNoteDto.tagIds);
      tagUpdates = {
        set: resolvedIds.map((tid) => ({ id: tid })),
      };
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
        ...(updateNoteDto.startDate ? { startDate: new Date(updateNoteDto.startDate) } : {}),
        ...(updateNoteDto.endDate !== undefined
          ? { endDate: updateNoteDto.endDate ? new Date(updateNoteDto.endDate) : null }
          : {}),
        ...(updateNoteDto.sourceLink !== undefined ? { sourceLink: updateNoteDto.sourceLink } : {}),
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
        tags: tagUpdates,
        hashtags: hashtagUpdates,
      },
      include: {
        feed: true,
        tags: { where: { deletedAt: null } },
        hashtags: { where: { deletedAt: null } },
        folders: {
          include: { folder: true },
          orderBy: { order: 'asc' },
        },
        images: { orderBy: { order: 'asc' } },
        links: { orderBy: { order: 'asc' } },
      },
    });

    this.logger.log(`Updated note "${updatedNote.title}" [id: ${updatedNote.id}]`);
    return updatedNote;
  }

  async softDelete(id: string) {
    await this.findOne(id);
    const deleted = await this.prisma.note.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    this.logger.log(`Soft-deleted note [id: ${id}]`);
    return deleted;
  }

  async restore(id: string) {
    const note = await this.prisma.note.findUnique({ where: { id } });
    if (!note) {
      throw new NotFoundException(`Note with ID '${id}' not found`);
    }
    const restored = await this.prisma.note.update({
      where: { id },
      data: { deletedAt: null },
      include: {
        feed: true,
        tags: { where: { deletedAt: null } },
        hashtags: { where: { deletedAt: null } },
        images: { orderBy: { order: 'asc' } },
        links: { orderBy: { order: 'asc' } },
      },
    });
    this.logger.log(`Restored note [id: ${id}]`);
    return restored;
  }

  // ==========================================
  // Link & Source Methods
  // ==========================================

  /**
   * Add links to an existing note
   */
  async addLinks(noteId: string, dtos: CreateNoteLinkDto[]) {
    await this.findOne(noteId);

    const existingLinks = await this.prisma.noteLink.findMany({
      where: { noteId },
      orderBy: { order: 'desc' },
    });

    const hasSource = existingLinks.some((l) => l.isSource);
    let nextOrder = existingLinks.length > 0 ? existingLinks[0].order + 1 : 0;

    for (let i = 0; i < dtos.length; i++) {
      const dto = dtos[i];
      const isSource = dto.isSource !== undefined ? dto.isSource : (!hasSource && existingLinks.length === 0 && i === 0);

      const link = await this.prisma.noteLink.create({
        data: {
          noteId,
          url: dto.url,
          title: dto.title,
          isSource,
          order: dto.order !== undefined ? dto.order : nextOrder++,
        },
      });

      if (isSource) {
        await this.prisma.noteLink.updateMany({
          where: { noteId, id: { not: link.id } },
          data: { isSource: false },
        });
        await this.prisma.note.update({
          where: { id: noteId },
          data: { sourceLink: link.url },
        });
      }
    }

    return this.prisma.noteLink.findMany({
      where: { noteId },
      orderBy: { order: 'asc' },
    });
  }

  /**
   * Set specific link as the source link for the note
   */
  async setSourceLink(noteId: string, linkId: string) {
    const targetLink = await this.prisma.noteLink.findFirst({
      where: { id: linkId, noteId },
    });

    if (!targetLink) {
      throw new NotFoundException(`Link '${linkId}' not found for note '${noteId}'`);
    }

    await this.prisma.$transaction(async (tx) => {
      // Unset all other links for this note
      await tx.noteLink.updateMany({
        where: { noteId },
        data: { isSource: false },
      });

      // Set target link to isSource = true
      await tx.noteLink.update({
        where: { id: linkId },
        data: { isSource: true },
      });

      // Update parent note sourceLink
      await tx.note.update({
        where: { id: noteId },
        data: { sourceLink: targetLink.url },
      });
    });

    return this.prisma.noteLink.findMany({
      where: { noteId },
      orderBy: { order: 'asc' },
    });
  }

  /**
   * Reorder links for a note
   */
  async reorderLinks(noteId: string, items: LinkOrderItemDto[]) {
    await this.findOne(noteId);

    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.noteLink.updateMany({
          where: { id: item.id, noteId },
          data: { order: item.order },
        }),
      ),
    );

    return this.prisma.noteLink.findMany({
      where: { noteId },
      orderBy: { order: 'asc' },
    });
  }

  /**
   * Update link title, url, or isSource
   */
  async updateLink(noteId: string, linkId: string, dto: UpdateNoteLinkDto) {
    const link = await this.prisma.noteLink.findFirst({
      where: { id: linkId, noteId },
    });

    if (!link) {
      throw new NotFoundException(`Link '${linkId}' not found for note '${noteId}'`);
    }

    if (dto.isSource) {
      return this.setSourceLink(noteId, linkId);
    }

    const updated = await this.prisma.noteLink.update({
      where: { id: linkId },
      data: {
        ...(dto.url !== undefined ? { url: dto.url } : {}),
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.order !== undefined ? { order: dto.order } : {}),
      },
    });

    // If url was updated on source link, synchronize note.sourceLink
    if (updated.isSource && dto.url !== undefined) {
      await this.prisma.note.update({
        where: { id: noteId },
        data: { sourceLink: updated.url },
      });
    }

    return updated;
  }

  /**
   * Delete a link from a note. If it was source, promote the next link.
   */
  async deleteLink(noteId: string, linkId: string) {
    const link = await this.prisma.noteLink.findFirst({
      where: { id: linkId, noteId },
    });

    if (!link) {
      throw new NotFoundException(`Link '${linkId}' not found for note '${noteId}'`);
    }

    await this.prisma.noteLink.delete({
      where: { id: linkId },
    });

    // If deleted link was source, promote the first remaining link or clear sourceLink
    if (link.isSource) {
      const remainingLink = await this.prisma.noteLink.findFirst({
        where: { noteId },
        orderBy: { order: 'asc' },
      });

      if (remainingLink) {
        await this.prisma.noteLink.update({
          where: { id: remainingLink.id },
          data: { isSource: true },
        });
        await this.prisma.note.update({
          where: { id: noteId },
          data: { sourceLink: remainingLink.url },
        });
      } else {
        await this.prisma.note.update({
          where: { id: noteId },
          data: { sourceLink: null },
        });
      }
    }

    return {
      success: true,
      message: 'Link deleted successfully',
    };
  }

  // ==========================================
  // Image & Media Methods
  // ==========================================

  /**
   * Upload multiple images for a note
   */
  async uploadImages(noteId: string, files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    const note = await this.findOne(noteId);

    // Get current maximum order and whether any image is currently marked as main
    const existingImages = await this.prisma.noteImage.findMany({
      where: { noteId },
      orderBy: { order: 'desc' },
    });

    const hasMain = existingImages.some((img) => img.isMain);
    let nextOrder = existingImages.length > 0 ? existingImages[0].order + 1 : 0;

    const createdImages = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const processed = await this.storageService.processAndSaveNoteImage(file);
      const isMain = !hasMain && i === 0;

      const noteImage = await this.prisma.noteImage.create({
        data: {
          noteId,
          url: processed.url,
          thumbnailUrl: processed.thumbnailUrl,
          filename: processed.filename,
          mimeType: processed.mimeType,
          sizeBytes: processed.sizeBytes,
          width: processed.width,
          height: processed.height,
          isMain,
          order: nextOrder++,
        },
      });

      createdImages.push(noteImage);
    }

    return this.prisma.noteImage.findMany({
      where: { noteId },
      orderBy: { order: 'asc' },
    });
  }

  /**
   * Set specific image as the main/cover photo for a note
   */
  async setMainImage(noteId: string, imageId: string) {
    const targetImage = await this.prisma.noteImage.findFirst({
      where: { id: imageId, noteId },
    });

    if (!targetImage) {
      throw new NotFoundException(`Image '${imageId}' not found for note '${noteId}'`);
    }

    return this.prisma.$transaction(async (tx) => {
      // Reset all other images for this note
      await tx.noteImage.updateMany({
        where: { noteId },
        data: { isMain: false },
      });

      // Set target image to main
      return tx.noteImage.update({
        where: { id: imageId },
        data: { isMain: true },
      });
    });
  }

  /**
   * Reorder images for a note
   */
  async reorderImages(noteId: string, items: ImageOrderItemDto[]) {
    await this.findOne(noteId);

    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.noteImage.updateMany({
          where: { id: item.id, noteId },
          data: { order: item.order },
        }),
      ),
    );

    return this.prisma.noteImage.findMany({
      where: { noteId },
      orderBy: { order: 'asc' },
    });
  }

  /**
   * Update image caption, alt, or metadata
   */
  async updateImage(noteId: string, imageId: string, dto: UpdateNoteImageDto) {
    const image = await this.prisma.noteImage.findFirst({
      where: { id: imageId, noteId },
    });

    if (!image) {
      throw new NotFoundException(`Image '${imageId}' not found for note '${noteId}'`);
    }

    if (dto.isMain) {
      return this.setMainImage(noteId, imageId);
    }

    return this.prisma.noteImage.update({
      where: { id: imageId },
      data: {
        ...(dto.caption !== undefined ? { caption: dto.caption } : {}),
        ...(dto.alt !== undefined ? { alt: dto.alt } : {}),
        ...(dto.order !== undefined ? { order: dto.order } : {}),
      },
    });
  }

  /**
   * Delete an image from database and disk. If it was main, promote the next image.
   */
  async deleteImage(noteId: string, imageId: string) {
    const image = await this.prisma.noteImage.findFirst({
      where: { id: imageId, noteId },
    });

    if (!image) {
      throw new NotFoundException(`Image '${imageId}' not found for note '${noteId}'`);
    }

    // Delete database record
    await this.prisma.noteImage.delete({
      where: { id: imageId },
    });

    // Delete disk files
    await this.storageService.deleteFile(image.url, image.thumbnailUrl);

    let newMainId: string | undefined = undefined;

    // If deleted image was main, pick the next image and set isMain = true
    if (image.isMain) {
      const remainingImage = await this.prisma.noteImage.findFirst({
        where: { noteId },
        orderBy: { order: 'asc' },
      });

      if (remainingImage) {
        const updated = await this.prisma.noteImage.update({
          where: { id: remainingImage.id },
          data: { isMain: true },
        });
        newMainId = updated.id;
      }
    }

    return {
      success: true,
      newMainId,
    };
  }

  /**
   * Standalone media upload for Markdown inline insertion
   */
  async uploadStandaloneMedia(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return this.storageService.processAndSaveMedia(file);
  }

  /**
   * Quick-share endpoint for lightweight mobile Android app.
   * Directly creates note in designated folder (default: 'Mobile/Shared')
   * inside the target Obsidian container.
   */
  async quickShare(dto: QuickShareNoteDto) {
    if (!dto.url || !dto.title) {
      throw new BadRequestException('URL and title are required for quick share');
    }

    // 1. Optional User Key validation
    let userId: string | undefined;
    if (dto.userKey) {
      const userKeyRecord = await this.prisma.userKey.findUnique({
        where: { key: dto.userKey },
      });
      if (userKeyRecord && !userKeyRecord.isRevoked) {
        userId = userKeyRecord.userId;
        await this.prisma.userKey.update({
          where: { id: userKeyRecord.id },
          data: { lastUsedAt: new Date() },
        });
      }
    }

    // 2. Resolve Target Container
    const targetContainerId = dto.containerId || 'main-vault';
    let container = await this.prisma.container.findUnique({
      where: { id: targetContainerId },
    });
    if (!container) {
      container = await this.prisma.container.create({
        data: {
          id: targetContainerId,
          name: targetContainerId === 'main-vault' ? '🍋 Primary Vault Container' : `Mobile Vault (${targetContainerId})`,
          type: 'obsidian',
          visibility: 'public',
          ownerUserId: userId,
        },
      });
    }

    // 3. Resolve Target Folder (default: 'Mobile/Shared')
    const targetFolderPath = dto.folder?.trim() || 'Mobile/Shared';
    const folderAssignments = await this.foldersService.resolveFolderAssignments(
      [{ path: targetFolderPath, isPrimary: true, order: 0 }],
      targetContainerId,
    );

    // 4. Resolve Feed (fallback to default feed or first feed available)
    let defaultFeed = await this.prisma.feed.findFirst({
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    if (!defaultFeed) {
      defaultFeed = await this.prisma.feed.create({
        data: {
          title: 'Mobile Inbox',
          slug: 'mobile-inbox',
          description: 'Links and captures from mobile',
        },
      });
    }

    // 5. Hashtags
    const tagsToResolve = dto.tags && dto.tags.length > 0 ? dto.tags : ['mobile', 'shared'];
    const hashtagIds = await this.hashtagsService.resolveHashtags(
      tagsToResolve,
      dto.description,
      dto.title,
    );

    // 6. Build Note Description / Body
    let noteDescription = dto.description?.trim() || '';
    if (!noteDescription) {
      noteDescription = `Saved from Android Share to \`${targetFolderPath}\`\n\n- Source: [${dto.url}](${dto.url})`;
    }

    // 7. Create Note
    const createdNote = await this.prisma.note.create({
      data: {
        title: dto.title.trim(),
        description: noteDescription,
        type: 'SINGLE',
        startDate: new Date(),
        sourceLink: dto.url.trim(),
        containerId: targetContainerId,
        feedId: defaultFeed.id,
        links: {
          create: [
            {
              url: dto.url.trim(),
              title: dto.title.trim(),
              isSource: true,
              order: 0,
            },
          ],
        },
        folders: {
          create: folderAssignments.map((fa) => ({
            folderId: fa.folderId,
            isPrimary: fa.isPrimary,
            order: fa.order,
          })),
        },
        hashtags: {
          connect: hashtagIds.map((id) => ({ id })),
        },
      },
      include: {
        folders: { include: { folder: true } },
        links: true,
        hashtags: true,
      },
    });

    return {
      success: true,
      noteId: createdNote.id,
      title: createdNote.title,
      url: dto.url,
      folder: targetFolderPath,
      containerId: targetContainerId,
      createdAt: createdNote.createdAt.toISOString(),
    };
  }
}
