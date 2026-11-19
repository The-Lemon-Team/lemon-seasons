import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RequestUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { FoldersService } from '../folders/folders.service';
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
export class FeedsService implements OnModuleInit {
  private readonly logger = new Logger(FeedsService.name);

  constructor(
    private prisma: PrismaService,
    private foldersService: FoldersService,
    @Optional() private eventEmitter?: EventEmitter2,
  ) {}

  async onModuleInit() {
    try {
      const feeds = await this.prisma.feed.findMany({
        where: { deletedAt: null },
        select: { slug: true, privacy: true, folderPaths: true },
      });
      for (const feed of feeds) {
        if (feed.folderPaths && feed.folderPaths.length > 0) {
          await this.ensureFoldersExist(feed.folderPaths, feed.privacy);
        }
      }
    } catch (err: any) {
      this.logger.warn(`Failed to auto-provision feed folders on startup: ${err?.message || err}`);
    }
  }

  private async ensureFoldersExist(folderPaths: string[], feedPrivacy: string) {
    if (!folderPaths || folderPaths.length === 0) return;
    for (const rawPath of folderPaths) {
      const path = FoldersService.normalizePath(rawPath);
      if (!path) continue;

      const existing = await this.prisma.folder.findFirst({
        where: {
          path: { equals: path, mode: 'insensitive' },
          containerId: null,
          deletedAt: null,
        },
      });

      if (!existing) {
        const folderPrivacy: 'public' | 'private' = feedPrivacy === 'private' ? 'private' : 'public';
        try {
          await this.foldersService.create({
            path,
            privacy: folderPrivacy,
          });
          this.logger.log(`Auto-created folder '${path}' with privacy '${folderPrivacy}' for feed`);
        } catch (err: any) {
          this.logger.warn(`Failed to auto-create folder '${path}': ${err?.message || err}`);
        }
      }
    }
  }

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
        `Публичный feed не может содержать приватные папки: ${details}. В публичных лентах разрешены только публичные папки.`,
      );
    }
  }

  async create(createFeedDto: CreateFeedDto, viewer?: RequestUser) {
    const slug = createFeedDto.slug?.trim()
      ? slugify(createFeedDto.slug)
      : slugify(createFeedDto.title);

    const existing = await this.prisma.feed.findFirst({
      where: { slug, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException(`Feed with slug '${slug}' already exists`);
    }

    const privacy = createFeedDto.privacy === 'private' ? 'private' : 'public';
    if (privacy === 'public' && createFeedDto.folderPaths && createFeedDto.folderPaths.length > 0) {
      await this.validatePublicFeedFolderPaths(createFeedDto.folderPaths);
    }

    if (createFeedDto.folderPaths && createFeedDto.folderPaths.length > 0) {
      await this.ensureFoldersExist(createFeedDto.folderPaths, privacy);
    }

    const ownerUserId =
      viewer?.id && viewer.role !== 'guest' && !viewer.isAdmin ? viewer.id : undefined;

    const created = await this.prisma.feed.create({
      data: {
        title: createFeedDto.title,
        description: createFeedDto.description,
        slug,
        icon: createFeedDto.icon,
        color: createFeedDto.color,
        privacy,
        ...(ownerUserId ? { ownerUserId } : {}),
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

    this.eventEmitter?.emit('feed.created', created);
    return created;
  }

  async findAll(includeDeleted = false, search?: string, isAdmin = false, viewer?: RequestUser) {
    const viewerId = viewer?.id;
    const isAuthenticatedUser = Boolean(!isAdmin && viewerId && viewer?.role !== 'guest');

    const privacyFilter = isAdmin
      ? {}
      : isAuthenticatedUser && viewerId
        ? {
            OR: [
              { privacy: 'public' },
              { ownerUserId: viewerId },
              { shares: { some: { granteeUserId: viewerId } } },
            ],
          }
        : { privacy: 'public' };

    const noteCountFilter = isAdmin
      ? { deletedAt: null }
      : isAuthenticatedUser && viewerId
        ? {
            deletedAt: null,
            OR: [
              { privacy: 'public', status: 'PUBLISHED' as const },
              { privacy: 'private', ownerUserId: viewerId },
              { shares: { some: { granteeUserId: viewerId } } },
              { feed: { shares: { some: { granteeUserId: viewerId } } } },
            ],
          }
        : { deletedAt: null, privacy: 'public', status: 'PUBLISHED' as const };

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
              where: noteCountFilter,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(idOrSlug: string, isAdmin = false, includeNotes = true, viewer?: RequestUser) {
    const viewerId = viewer?.id;
    const isAuthenticatedUser = Boolean(!isAdmin && viewerId && viewer?.role !== 'guest');

    const notesFilter = isAdmin
      ? { deletedAt: null }
      : isAuthenticatedUser && viewerId
        ? {
            deletedAt: null,
            OR: [
              { privacy: 'public', status: 'PUBLISHED' as const },
              { privacy: 'private', ownerUserId: viewerId },
              { shares: { some: { granteeUserId: viewerId } } },
              { feed: { shares: { some: { granteeUserId: viewerId } } } },
            ],
          }
        : { deletedAt: null, privacy: 'public', status: 'PUBLISHED' as const };

    const feed = await this.prisma.feed.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        shares: true,
        ...(includeNotes
          ? {
              notes: {
                where: notesFilter,
                orderBy: { startDate: 'desc' as const },
                take: 100,
                include: {
                  hashtags: true,
                  folders: {
                    include: { folder: true },
                    orderBy: { order: 'asc' as const },
                  },
                  images: { orderBy: { order: 'asc' as const } },
                  links: { orderBy: { order: 'asc' as const } },
                },
              },
            }
          : {}),
        _count: {
          select: {
            notes: {
              where: notesFilter,
            },
          },
        },
      },
    });

    if (!feed || feed.deletedAt) {
      throw new NotFoundException(`Feed '${idOrSlug}' not found`);
    }

    if (!isAdmin && feed.privacy !== 'public') {
      const hasShare =
        isAuthenticatedUser &&
        viewerId &&
        ((feed as any).ownerUserId === viewerId ||
          ((feed as any).shares || []).some((s: any) => s.granteeUserId === viewerId));
      if (!hasShare) {
        throw new ForbiddenException('Доступ к приватной ленте запрещен. Требуется доступ владельца или FeedShare.');
      }
    }

    return feed;
  }

  async shareFeed(
    idOrSlug: string,
    granteeUserId: string,
    permission: 'READ' | 'WRITE' = 'READ',
    caller?: RequestUser,
  ) {
    if (!caller || caller.role === 'guest') {
      throw new ForbiddenException('Требуется авторизация для управления доступом к ленте.');
    }
    const feed = await this.prisma.feed.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }], deletedAt: null },
    });
    if (!feed) throw new NotFoundException(`Feed '${idOrSlug}' not found`);
    if (!caller.isAdmin && (feed as any).ownerUserId !== caller.id) {
      throw new ForbiddenException('Только владелец ленты может расшарить её другому аккаунту.');
    }
    return (this.prisma as any).feedShare.upsert({
      where: { feedId_granteeUserId: { feedId: feed.id, granteeUserId } },
      update: { permission },
      create: {
        feedId: feed.id,
        granteeUserId,
        grantedByUserId: caller.id,
        permission,
      },
    });
  }

  async revokeFeedShare(idOrSlug: string, granteeUserId: string, caller?: RequestUser) {
    if (!caller || caller.role === 'guest') {
      throw new ForbiddenException('Требуется авторизация.');
    }
    const feed = await this.prisma.feed.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }], deletedAt: null },
    });
    if (!feed) throw new NotFoundException(`Feed '${idOrSlug}' not found`);
    if (!caller.isAdmin && (feed as any).ownerUserId !== caller.id) {
      throw new ForbiddenException('Только владелец ленты может отозвать доступ.');
    }
    const deleted = await (this.prisma as any).feedShare.deleteMany({
      where: { feedId: feed.id, granteeUserId },
    });
    return { revoked: deleted.count };
  }

  async update(id: string, updateFeedDto: UpdateFeedDto) {
    const existing = await this.prisma.feed.findFirst({
      where: { OR: [{ id }, { slug: id }], deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException(`Feed with ID '${id}' not found`);
    }

    let slug = updateFeedDto.slug;
    if (slug) {
      slug = slugify(slug);
      const conflict = await this.prisma.feed.findFirst({
        where: { slug, id: { not: existing.id }, deletedAt: null },
      });
      if (conflict) {
        throw new ConflictException(`Feed with slug '${slug}' already exists`);
      }
    }

    const targetPrivacy =
      updateFeedDto.privacy !== undefined ? updateFeedDto.privacy : existing.privacy;
    const targetFolders =
      updateFeedDto.folderPaths !== undefined ? updateFeedDto.folderPaths : existing.folderPaths;

    if (targetPrivacy === 'public' && targetFolders.length > 0) {
      await this.validatePublicFeedFolderPaths(targetFolders);
    }

    if (targetFolders && targetFolders.length > 0) {
      await this.ensureFoldersExist(targetFolders, targetPrivacy);
    }

    const updated = await this.prisma.feed.update({
      where: { id: existing.id },
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

    this.eventEmitter?.emit('feed.updated', updated);
    return updated;
  }

  async softDelete(id: string) {
    const existing = await this.findOne(id, true, false);
    const deleted = await this.prisma.feed.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });
    this.eventEmitter?.emit('feed.deleted', { feedId: existing.id, slug: existing.slug });
    return deleted;
  }

  async restore(id: string) {
    const feed = await this.prisma.feed.findUnique({ where: { id } });
    if (!feed) {
      throw new NotFoundException(`Feed with ID '${id}' not found`);
    }
    const restored = await this.prisma.feed.update({
      where: { id },
      data: { deletedAt: null },
    });
    this.eventEmitter?.emit('feed.updated', restored);
    return restored;
  }
}
