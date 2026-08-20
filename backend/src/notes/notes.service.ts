import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { QueryNotesDto } from './dto/query-notes.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class NotesService {
  constructor(private prisma: PrismaService) {}

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

    return this.prisma.note.create({
      data: {
        title: createNoteDto.title,
        description: createNoteDto.description,
        type: createNoteDto.type as any,
        startDate: new Date(createNoteDto.startDate),
        endDate: createNoteDto.endDate ? new Date(createNoteDto.endDate) : null,
        sourceLink: createNoteDto.sourceLink,
        icon: createNoteDto.icon,
        feed: { connect: { id: createNoteDto.feedId } },
        tags: tagIds.length > 0 ? { connect: tagIds.map((id) => ({ id })) } : undefined,
      },
      include: {
        feed: true,
        tags: { where: { deletedAt: null } },
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
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { feed: { title: { contains: search, mode: 'insensitive' } } },
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
      },
    });

    if (!note || note.deletedAt) {
      throw new NotFoundException(`Note with ID '${id}' not found`);
    }
    return note;
  }

  async update(id: string, updateNoteDto: UpdateNoteDto) {
    await this.findOne(id);

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
      },
      include: {
        feed: true,
        tags: { where: { deletedAt: null } },
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
    });
  }
}
