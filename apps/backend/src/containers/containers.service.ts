import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ContainerSummaryDto {
  id: string;
  name: string;
  type: string;
  description?: string;
  isPublic: boolean;
  visibility: 'public' | 'private';
  totalNotes: number;
  ownerUserId?: string;
}

export interface FileItemDto {
  path: string;
  content?: string;
  mtime?: number;
  size?: number;
}

export interface CommitSummaryDto {
  commitHash: string;
  shortHash: string;
  author: string;
  date: string;
  message: string;
}

export interface FileVersionDto {
  commitHash: string;
  shortHash: string;
  path: string;
  content: string;
  author: string;
  date: string;
  message: string;
}

@Injectable()
export class ContainersService {
  constructor(private readonly prisma: PrismaService) {}

  async listContainers(userId?: string): Promise<ContainerSummaryDto[]> {
    const containers = await this.prisma.container.findMany({
      where: {
        deletedAt: null,
        OR: [
          { isPublic: true },
          { visibility: 'public' },
          ...(userId ? [{ ownerUserId: userId }] : []),
        ],
      },
      include: {
        _count: {
          select: { notes: { where: { deletedAt: null } } },
        },
      },
    });

    const results: ContainerSummaryDto[] = containers.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type || 'git',
      description: c.description || undefined,
      isPublic: c.isPublic,
      visibility: (c.visibility as 'public' | 'private') || (c.isPublic ? 'public' : 'private'),
      totalNotes: c._count.notes,
      ownerUserId: c.ownerUserId || undefined,
    }));

    // Synthesize feeds as containers if not explicitly in database
    const feeds = await this.prisma.feed.findMany({ where: { deletedAt: null } });
    for (const feed of feeds) {
      const feedId = `feed-${feed.slug}`;
      if (!results.some((r) => r.id === feedId)) {
        const count = await this.prisma.note.count({ where: { feedId: feed.id, deletedAt: null } });
        results.push({
          id: feedId,
          name: `📰 Feed: ${feed.title}`,
          type: 'git',
          description: feed.description || undefined,
          isPublic: true,
          visibility: 'public',
          totalNotes: count,
        });
      }
    }

    return results;
  }

  async getContainerSummary(id: string): Promise<ContainerSummaryDto> {
    if (id.startsWith('feed-')) {
      const slug = id.replace(/^feed-/, '');
      const feed = await this.prisma.feed.findUnique({ where: { slug } });
      if (!feed) throw new NotFoundException(`Feed container ${id} not found`);
      const count = await this.prisma.note.count({ where: { feedId: feed.id, deletedAt: null } });
      return {
        id,
        name: `📰 Feed: ${feed.title}`,
        type: 'git',
        description: feed.description || undefined,
        isPublic: true,
        visibility: 'public',
        totalNotes: count,
      };
    }

    const container = await this.prisma.container.findUnique({
      where: { id },
      include: { _count: { select: { notes: { where: { deletedAt: null } } } } },
    });

    if (!container) {
      throw new NotFoundException(`Container ${id} not found`);
    }

    return {
      id: container.id,
      name: container.name,
      type: container.type || 'git',
      description: container.description || undefined,
      isPublic: container.isPublic,
      visibility: (container.visibility as 'public' | 'private') || (container.isPublic ? 'public' : 'private'),
      totalNotes: container._count.notes,
      ownerUserId: container.ownerUserId || undefined,
    };
  }

  async registerContainer(dto: { name: string; type?: string; description?: string; isPublic?: boolean; privacy?: 'private' | 'public'; ownerUserId?: string }): Promise<ContainerSummaryDto> {
    const isPub = dto.privacy ? dto.privacy === 'public' : (dto.isPublic ?? true);
    const container = await this.prisma.container.create({
      data: {
        name: dto.name,
        type: dto.type || 'git',
        description: dto.description,
        isPublic: isPub,
        visibility: isPub ? 'public' : 'private',
        ownerUserId: dto.ownerUserId,
      },
    });

    return {
      id: container.id,
      name: container.name,
      type: container.type,
      description: container.description || undefined,
      isPublic: container.isPublic,
      visibility: (container.visibility as 'public' | 'private'),
      totalNotes: 0,
      ownerUserId: container.ownerUserId || undefined,
    };
  }

  async updateContainerPrivacy(id: string, isPublic: boolean): Promise<{ success: boolean; isPublic: boolean }> {
    const visibility = isPublic ? 'public' : 'private';
    await this.prisma.container.update({
      where: { id },
      data: { isPublic, visibility },
    }).catch(() => {
      // Ignore if synthetic container
    });
    return { success: true, isPublic };
  }

  async getContainerFiles(id: string): Promise<FileItemDto[]> {
    let notes = [];
    if (id.startsWith('feed-')) {
      const slug = id.replace(/^feed-/, '');
      const feed = await this.prisma.feed.findUnique({ where: { slug } });
      if (feed) {
        notes = await this.prisma.note.findMany({ where: { feedId: feed.id, deletedAt: null } });
      }
    } else {
      notes = await this.prisma.note.findMany({ where: { containerId: id, deletedAt: null } });
    }

    return notes.map((n) => ({
      path: n.filePath || `${n.title.replace(/[^a-zA-Z0-9_\-]/g, '_')}.md`,
      content: n.description || '',
      mtime: n.updatedAt.getTime(),
      size: (n.description || '').length,
    }));
  }

  async getContainerCommits(id: string, limit = 50): Promise<CommitSummaryDto[]> {
    const versions = await this.prisma.noteVersion.findMany({
      where: { note: { containerId: id } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return versions.map((v) => ({
      commitHash: v.commitHash || v.id,
      shortHash: (v.commitHash || v.id).substring(0, 7),
      author: v.authorName || 'System',
      date: v.createdAt.toISOString(),
      message: v.commitMessage || `Revision v${v.version}`,
    }));
  }

  async getFileVersion(id: string, filePath: string, commitHash: string): Promise<FileVersionDto> {
    const version = await this.prisma.noteVersion.findFirst({
      where: {
        note: { containerId: id },
        commitHash,
      },
      include: { note: true },
    });

    if (!version) {
      throw new NotFoundException(`File version for ${filePath} at commit ${commitHash} not found`);
    }

    return {
      commitHash: version.commitHash || version.id,
      shortHash: (version.commitHash || version.id).substring(0, 7),
      path: filePath,
      content: version.content,
      author: version.authorName || 'System',
      date: version.createdAt.toISOString(),
      message: version.commitMessage || `Revision v${version.version}`,
    };
  }
}
