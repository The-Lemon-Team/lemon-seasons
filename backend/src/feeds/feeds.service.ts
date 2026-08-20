import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeedDto } from './dto/create-feed.dto';
import { UpdateFeedDto } from './dto/update-feed.dto';

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

@Injectable()
export class FeedsService {
  constructor(private prisma: PrismaService) {}

  async create(createFeedDto: CreateFeedDto) {
    const slug = createFeedDto.slug?.trim() ? slugify(createFeedDto.slug) : slugify(createFeedDto.title);
    
    // Check if active slug exists
    const existing = await this.prisma.feed.findFirst({
      where: { slug, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException(`Feed with slug '${slug}' already exists`);
    }

    return this.prisma.feed.create({
      data: {
        title: createFeedDto.title,
        description: createFeedDto.description,
        slug,
      },
      include: {
        _count: {
          select: {
            notes: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });
  }

  async findAll(includeDeleted = false, search?: string) {
    return this.prisma.feed.findMany({
      where: {
        ...(includeDeleted ? {} : { deletedAt: null }),
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { slug: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        _count: {
          select: {
            notes: {
              where: { deletedAt: null },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const feed = await this.prisma.feed.findUnique({
      where: { id },
      include: {
        notes: {
          where: { deletedAt: null },
          orderBy: { startDate: 'desc' },
          include: { tags: true },
        },
        _count: {
          select: {
            notes: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });

    if (!feed || feed.deletedAt) {
      throw new NotFoundException(`Feed with ID '${id}' not found`);
    }
    return feed;
  }

  async update(id: string, updateFeedDto: UpdateFeedDto) {
    await this.findOne(id);

    let slug = updateFeedDto.slug;
    if (slug) {
      slug = slugify(slug);
      const existing = await this.prisma.feed.findFirst({
        where: { slug, id: { not: id }, deletedAt: null },
      });
      if (existing) {
        throw new ConflictException(`Feed with slug '${slug}' already exists`);
      }
    }

    return this.prisma.feed.update({
      where: { id },
      data: {
        ...(updateFeedDto.title ? { title: updateFeedDto.title } : {}),
        ...(updateFeedDto.description !== undefined ? { description: updateFeedDto.description } : {}),
        ...(slug ? { slug } : {}),
      },
      include: {
        _count: {
          select: {
            notes: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });
  }

  async softDelete(id: string) {
    await this.findOne(id);
    return this.prisma.feed.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: string) {
    const feed = await this.prisma.feed.findUnique({ where: { id } });
    if (!feed) {
      throw new NotFoundException(`Feed with ID '${id}' not found`);
    }
    return this.prisma.feed.update({
      where: { id },
      data: { deletedAt: null },
    });
  }
}
