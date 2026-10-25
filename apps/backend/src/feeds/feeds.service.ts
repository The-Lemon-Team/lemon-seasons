import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
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

  /**
   * Enforces privacy rule:
   * Private and public folders may be used in private feeds.
   * Private folders CANNOT be used in public feeds.
   */
  private async validatePublicFeedFolderPaths(folderPaths: string[]) {
    if (!folderPaths || folderPaths.length === 0) return;
    const normalized = folderPaths.map((p) => p.trim()).filter(Boolean);
    const privateFolders = await this.prisma.folder.findMany({
      where: {
        path: { in: normalized },
        privacy: { not: 'public' },
        deletedAt: null,
      },
      select: { path: true, privacy: true },
    });
    if (privateFolders.length > 0) {
      const details = privateFolders.map((f) => `${f.path} (${f.privacy})`).join(', ');
      throw new BadRequestException(
        `Публичный feed не может содержать приватные папки: ${details}. В публичных лентах разрешены только публичные папки.`
      );
    }
  }

  async create(createFeedDto: CreateFeedDto) {
    const slug = createFeedDto.slug?.trim() ? slugify(createFeedDto.slug) : slugify(createFeedDto.title);
    
    // Check if active slug exists
    const existing = await this.prisma.feed.findFirst({
      where: { slug, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException(`Feed with slug '${slug}' already exists`);
    }

    const privacy = createFeedDto.privacy || 'public';
    if (privacy === 'public' && createFeedDto.folderPaths && createFeedDto.folderPaths.length > 0) {
      await this.validatePublicFeedFolderPaths(createFeedDto.folderPaths);
    }

    return this.prisma.feed.create({
      data: {
        title: createFeedDto.title,
        description: createFeedDto.description,
        slug,
        icon: createFeedDto.icon,
        color: createFeedDto.color,
        privacy,
        folderPaths: createFeedDto.folderPaths || [],
        hashtags: createFeedDto.hashtags || [],
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

  async findAll(includeDeleted = false, search?: string, isAdmin = false) {
    const privacyFilter = isAdmin ? {} : { privacy: 'public' };

    return this.prisma.feed.findMany({
      where: {
        ...(includeDeleted ? {} : { deletedAt: null }),
        ...privacyFilter,
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

  async findOne(id: string, isAdmin = false) {
    const feed = await this.prisma.feed.findUnique({
      where: { id },
      include: {
        notes: {
          where: { deletedAt: null },
          orderBy: { startDate: 'desc' },
          take: 100,
          include: {
            hashtags: true,
            folders: {
              include: { folder: true },
              orderBy: { order: 'asc' },
            },
            images: { orderBy: { order: 'asc' } },
            links: { orderBy: { order: 'asc' } },
          },
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

    if (!feed) {
      throw new NotFoundException(`Feed with ID '${id}' not found`);
    }

    if (!isAdmin && feed.privacy !== 'public') {
      throw new ForbiddenException('Доступ к приватной ленте запрещен. Требуются права администратора.');
    }

    return feed;
  }

  async update(id: string, updateFeedDto: UpdateFeedDto) {
    const existing = await this.prisma.feed.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Feed with ID '${id}' not found`);
    }

    let slug = updateFeedDto.slug;
    if (slug) {
      slug = slugify(slug);
      const conflict = await this.prisma.feed.findFirst({
        where: { slug, id: { not: id }, deletedAt: null },
      });
      if (conflict) {
        throw new ConflictException(`Feed with slug '${slug}' already exists`);
      }
    }

    const targetPrivacy = updateFeedDto.privacy !== undefined ? updateFeedDto.privacy : existing.privacy;
    const targetFolders = updateFeedDto.folderPaths !== undefined ? updateFeedDto.folderPaths : existing.folderPaths;

    if (targetPrivacy === 'public' && targetFolders.length > 0) {
      await this.validatePublicFeedFolderPaths(targetFolders);
    }

    return this.prisma.feed.update({
      where: { id },
      data: {
        ...(updateFeedDto.title ? { title: updateFeedDto.title } : {}),
        ...(updateFeedDto.description !== undefined ? { description: updateFeedDto.description } : {}),
        ...(slug ? { slug } : {}),
        ...(updateFeedDto.icon !== undefined ? { icon: updateFeedDto.icon } : {}),
        ...(updateFeedDto.color !== undefined ? { color: updateFeedDto.color } : {}),
        ...(updateFeedDto.privacy !== undefined ? { privacy: updateFeedDto.privacy } : {}),
        ...(updateFeedDto.folderPaths !== undefined ? { folderPaths: updateFeedDto.folderPaths } : {}),
        ...(updateFeedDto.hashtags !== undefined ? { hashtags: updateFeedDto.hashtags } : {}),
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
    await this.findOne(id, true);
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
