import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { HashtagsService } from '../hashtags/hashtags.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { QueryNotesDto } from './dto/query-notes.dto';
import { UpdateNoteImageDto, ImageOrderItemDto } from './dto/image.dto';
import { CreateNoteLinkDto, UpdateNoteLinkDto, LinkOrderItemDto } from './dto/link.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class NotesService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private hashtagsService: HashtagsService,
  ) {}

  private async resolveTagIds(tagIdentifiers?: string[]): Promise<string[]> {
    if (!tagIdentifiers || tagIdentifiers.length === 0) {
      return [];
    }

    const resolvedIds: string[] = [];

    for (const item of tagIdentifiers) {
      if (!item) continue;
      // If it looks like a uuid (has hyphens and standard uuid length), try finding by ID
      const node = await this.prisma.taxonomyNode.findFirst({
        where: {
          OR: [
            { id: item },
            { path: item.toLowerCase().trim() },
          ],
          deletedAt: null,
        },
      });
      if (node) {
        resolvedIds.push(node.id);
      } else {
        // If it's a path that doesn't exist yet, auto-create it
        const path = item.toLowerCase().trim();
        const parts = path.split('.');
        const name = parts[parts.length - 1];
        const newNode = await this.prisma.taxonomyNode.create({
          data: {
            name: name.charAt(0).toUpperCase() + name.slice(1),
            path,
          },
        });
        resolvedIds.push(newNode.id);
      }
    }

    return Array.from(new Set(resolvedIds));
  }

  async create(createNoteDto: CreateNoteDto) {
    // Verify feed exists
    const feed = await this.prisma.feed.findUnique({
      where: { id: createNoteDto.feedId },
    });
    if (!feed || feed.deletedAt) {
      throw new NotFoundException(`Feed with ID '${createNoteDto.feedId}' not found`);
    }

    const tagIds = await this.resolveTagIds(createNoteDto.tagIds);
    const hashtagIds = await this.hashtagsService.resolveHashtags(
      createNoteDto.hashtags,
      createNoteDto.description,
      createNoteDto.title,
    );

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

    return this.prisma.note.create({
      data: {
        title: createNoteDto.title,
        description: createNoteDto.description,
        type: createNoteDto.type as any,
        startDate: new Date(createNoteDto.startDate),
        endDate: createNoteDto.endDate ? new Date(createNoteDto.endDate) : null,
        sourceLink: initialSourceLink,
        icon: createNoteDto.icon,
        feed: { connect: { id: createNoteDto.feedId } },
        tags: tagIds.length > 0 ? { connect: tagIds.map((id) => ({ id })) } : undefined,
        hashtags: hashtagIds.length > 0 ? { connect: hashtagIds.map((id) => ({ id })) } : undefined,
        links: linksData ? { create: linksData } : undefined,
      },
      include: {
        feed: true,
        tags: { where: { deletedAt: null } },
        hashtags: { where: { deletedAt: null } },
        images: { orderBy: { order: 'asc' } },
        links: { orderBy: { order: 'asc' } },
      },
    });
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
      tagId,
      tagPath,
      hashtag,
      hashtagId,
      search,
      includeDeleted = false,
      limit = 50,
      offset = 0,
    } = query;

    const where: Prisma.NoteWhereInput = {
      ...(includeDeleted ? {} : { deletedAt: null }),
      ...(feedId ? { feedId } : {}),
      ...(feedSlug ? { feed: { slug: feedSlug, deletedAt: null } } : {}),
      ...(type ? { type: type as any } : {}),
      ...(startDateFrom || startDateTo
        ? {
            startDate: {
              ...(startDateFrom ? { gte: new Date(startDateFrom) } : {}),
              ...(startDateTo ? { lte: new Date(startDateTo) } : {}),
            },
          }
        : {}),
      ...(endDateFrom || endDateTo
        ? {
            endDate: {
              ...(endDateFrom ? { gte: new Date(endDateFrom) } : {}),
              ...(endDateTo ? { lte: new Date(endDateTo) } : {}),
            },
          }
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
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { feed: { title: { contains: search, mode: 'insensitive' } } },
              { hashtags: { some: { name: { contains: HashtagsService.normalizeName(search), mode: 'insensitive' }, deletedAt: null } } },
            ],
          }
        : {}),
    };

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
          images: { orderBy: { order: 'asc' } },
          links: { orderBy: { order: 'asc' } },
        },
      }),
    ]);

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

    return this.prisma.note.update({
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
        ...(updateNoteDto.feedId ? { feed: { connect: { id: updateNoteDto.feedId } } } : {}),
        tags: tagUpdates,
        hashtags: hashtagUpdates,
      },
      include: {
        feed: true,
        tags: { where: { deletedAt: null } },
        hashtags: { where: { deletedAt: null } },
        images: { orderBy: { order: 'asc' } },
        links: { orderBy: { order: 'asc' } },
      },
    });
  }

  async softDelete(id: string) {
    await this.findOne(id);
    return this.prisma.note.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: string) {
    const note = await this.prisma.note.findUnique({ where: { id } });
    if (!note) {
      throw new NotFoundException(`Note with ID '${id}' not found`);
    }
    return this.prisma.note.update({
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
}
