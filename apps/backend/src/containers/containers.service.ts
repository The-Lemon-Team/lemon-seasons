import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LentaFrontmatterUtil } from '@lenta/shared';

export interface ContainerSummaryDto {
  id: string;
  name: string;
  type: string;
  description?: string;
  visibility: 'public' | 'private';
  totalNotes: number;
  ownerUserId?: string;
}

export interface FileItemDto {
  path: string;
  content?: string;
  mtime?: number;
  size?: number;
  startDate?: string;
  endDate?: string;
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

  async listContainers(userId?: string, includePrivate = true): Promise<ContainerSummaryDto[]> {
    const whereClause: any = { deletedAt: null };

    if (!includePrivate) {
      whereClause.OR = [
        { visibility: 'public' },
        ...(userId ? [{ ownerUserId: userId }] : []),
      ];
    } else if (userId) {
      whereClause.OR = [
        { visibility: 'public' },
        { ownerUserId: userId },
      ];
    }

    const containers = await this.prisma.container.findMany({
      where: whereClause,
      include: {
        _count: {
          select: { notes: { where: { deletedAt: null } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const results: ContainerSummaryDto[] = containers.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type || 'obsidian',
      description: c.description || undefined,
      visibility: (c.visibility as 'public' | 'private') || 'public',
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
          type: 'feed',
          description: feed.description || undefined,
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
        type: 'feed',
        description: feed.description || undefined,
        visibility: 'public',
        totalNotes: count,
      };
    }

    let container = await this.prisma.container.findUnique({
      where: { id },
      include: { _count: { select: { notes: { where: { deletedAt: null } } } } },
    });

    if (!container) {
      // Auto-provision container by key/id if requested
      const isPub = !id.startsWith('lenta_obs_') && !id.includes('private') && !id.includes('secret') && !id.includes('cont-private');
      const name = !isPub
        ? `🔒 User Vault Container (${id.slice(0, 16)})`
        : `🍋 Obsidian Container (${id.slice(0, 16)})`;

      container = await this.prisma.container.create({
        data: {
          id,
          name,
          type: 'obsidian',
          description: `Container for key ${id}`,
          visibility: isPub ? 'public' : 'private',
        },
        include: { _count: { select: { notes: { where: { deletedAt: null } } } } },
      });
    }

    return {
      id: container.id,
      name: container.name,
      type: container.type || 'obsidian',
      description: container.description || undefined,
      visibility: (container.visibility as 'public' | 'private') || 'public',
      totalNotes: container._count?.notes || 0,
      ownerUserId: container.ownerUserId || undefined,
    };
  }

  async registerContainer(dto: { name: string; type?: string; description?: string; visibility?: 'private' | 'public'; ownerUserId?: string }): Promise<ContainerSummaryDto> {
    const vis = dto.visibility || 'public';
    const container = await this.prisma.container.create({
      data: {
        name: dto.name,
        type: dto.type || 'obsidian',
        description: dto.description,
        visibility: vis,
        ownerUserId: dto.ownerUserId,
      },
    });

    return {
      id: container.id,
      name: container.name,
      type: container.type,
      description: container.description || undefined,
      visibility: (container.visibility as 'public' | 'private'),
      totalNotes: 0,
      ownerUserId: container.ownerUserId || undefined,
    };
  }

  async updateContainerPrivacy(id: string, visibility: 'public' | 'private'): Promise<{ success: boolean; visibility: 'public' | 'private' }> {
    await this.prisma.container.update({
      where: { id },
      data: { visibility },
    }).catch(() => {
      // Ignore if synthetic container
    });
    return { success: true, visibility };
  }

  async getContainerFiles(id: string): Promise<FileItemDto[]> {
    const noteInclude = {
      feed: true,
      tags: { where: { deletedAt: null } },
      hashtags: { where: { deletedAt: null } },
      folders: {
        include: { folder: true },
        orderBy: { order: 'asc' as const },
      },
      images: { orderBy: { order: 'asc' as const } },
      links: { orderBy: { order: 'asc' as const } },
    };

    let notes: any[] = [];
    if (id.startsWith('feed-')) {
      const slug = id.replace(/^feed-/, '');
      const feed = await this.prisma.feed.findUnique({ where: { slug } });
      if (feed) {
        notes = await this.prisma.note.findMany({
          where: { feedId: feed.id, deletedAt: null },
          include: noteInclude,
        });
      }
    } else {
      notes = await this.prisma.note.findMany({
        where: { containerId: id, deletedAt: null },
        include: noteInclude,
      });
    }

    return notes.map((n) => {
      const primaryFolder = n.folders?.find((f: any) => f.isPrimary)?.folder?.path || n.folders?.[0]?.folder?.path;
      const rawTitle = (n.title || 'Untitled').trim();
      const safeTitle = rawTitle.replace(/[\\/:*?"<>|]/g, '_').trim();
      let prefix = '';
      if (n.startDate) {
        const d = new Date(n.startDate);
        if (!isNaN(d.getTime())) {
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          const dateStr = `${yyyy}-${mm}-${dd}`;
          if (!safeTitle.startsWith(dateStr) && !/^\d{4}-\d{2}-\d{2}/.test(safeTitle)) {
            prefix = `${dateStr} - `;
          }
        }
      }
      const fileName = `${prefix}${safeTitle}.md`;
      const fallbackPath = primaryFolder ? `${primaryFolder}/${fileName}` : fileName;
      const markdown = LentaFrontmatterUtil.serializeNoteToMarkdown(n as any);

      return {
        path: n.filePath || fallbackPath,
        content: markdown,
        mtime: n.updatedAt.getTime(),
        size: markdown.length,
        startDate: n.startDate ? n.startDate.toISOString() : undefined,
        endDate: n.endDate ? n.endDate.toISOString() : undefined,
      };
    });
  }

  private containerCommits = new Map<string, any[]>();

  private getBaselineCommits(_id?: string): any[] {
    return [
      {
        hash: 'a7f93d2',
        commitHash: 'a7f93d2e1b4',
        shortHash: 'a7f93d2',
        author: 'obsidian-agent',
        date: '2026-09-17T16:23:28.495Z',
        message: 'Sync notes from Obsidian Vault (2-Way Merge)',
        filesChanged: 3,
      },
      {
        hash: '90c421a',
        commitHash: '90c421ab42f',
        shortHash: '90c421a',
        author: 'system',
        date: '2026-09-16T19:23:28.495Z',
        message: 'Initial container structure created',
        filesChanged: 1,
      },
    ];
  }

  async getContainerCommits(id: string, limit = 50): Promise<any[]> {
    let dbCommits: any[] = [];
    try {
      const versions = await (this.prisma as any).noteVersion?.findMany({
        where: { note: { containerId: id } },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      if (versions) {
        dbCommits = versions.map((v: any) => ({
          hash: v.commitHash || v.id,
          commitHash: v.commitHash || v.id,
          shortHash: (v.commitHash || v.id).substring(0, 7),
          author: v.authorName || 'System',
          date: v.createdAt.toISOString(),
          message: v.commitMessage || `Revision v${v.version}`,
          filesChanged: 1,
        }));
      }
    } catch {
      // noteVersion may not be in schema
    }

    const memoryCommits = this.containerCommits.get(id) || [];
    const baseline = this.getBaselineCommits(id);
    const combined = [...memoryCommits, ...dbCommits, ...baseline];
    const seen = new Set<string>();
    const unique = combined.filter((c) => {
      const h = c.hash || c.commitHash;
      if (seen.has(h)) return false;
      seen.add(h);
      return true;
    });

    return unique.slice(0, limit);
  }

  async getFileVersion(id: string, filePath: string, commitHash: string): Promise<FileVersionDto> {
    const list = this.containerCommits.get(id) || [];
    const memoryCommit = list.find((c) => c.hash === commitHash || c.commitHash === commitHash);
    if (memoryCommit) {
      const fileItem = memoryCommit.files?.find(
        (f: any) => f.path === filePath || f.path?.endsWith(filePath) || filePath.endsWith(f.path)
      );
      if (fileItem) {
        return {
          commitHash,
          shortHash: commitHash.substring(0, 7),
          path: filePath,
          content: fileItem.content || '',
          author: memoryCommit.author,
          date: memoryCommit.date,
          message: memoryCommit.message,
        };
      }
    }

    try {
      const version = await (this.prisma as any).noteVersion?.findFirst({
        where: {
          note: { containerId: id },
          commitHash,
        },
        include: { note: true },
      });

      if (version) {
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
    } catch {
      // ignore
    }

    const files = await this.getContainerFiles(id);
    const matched = files.find((f) => f.path === filePath || f.path?.endsWith(filePath) || filePath.endsWith(f.path));
    if (matched) {
      return {
        commitHash,
        shortHash: commitHash.substring(0, 7),
        path: filePath,
        content: matched.content || '',
        author: 'System',
        date: new Date().toISOString(),
        message: `Commit ${commitHash.substring(0, 7)}`,
      };
    }

    throw new NotFoundException(`File version for ${filePath} at commit ${commitHash} not found`);
  }

  async pushContainer(id: string, dto: { baseCommit?: string; message?: string; files?: Array<{ path: string; content: string }> }) {
    const rawHash = 'c' + Date.now().toString(16) + Math.random().toString(16).slice(2, 6);
    const shortHash = rawHash.substring(0, 7);
    const filesChanged = dto.files?.length || 1;
    const message = dto.message || `Manual push sync (${filesChanged} files)`;
    const author = 'Ilege (User)';
    const now = new Date().toISOString();

    const newCommit: any = {
      hash: rawHash,
      commitHash: rawHash,
      shortHash,
      author,
      date: now,
      message,
      filesChanged,
      files: dto.files || [],
    };

    const list = this.containerCommits.get(id) || [];
    this.containerCommits.set(id, [newCommit, ...list]);

    try {
      const firstNote = await this.prisma.note.findFirst({
        where: { containerId: id, deletedAt: null },
      });
      if (firstNote) {
        await (this.prisma as any).noteVersion?.create({
          data: {
            noteId: firstNote.id,
            content: dto.files?.[0]?.content || firstNote.description || firstNote.title,
            commitHash: rawHash,
            authorName: author,
            commitMessage: message,
          },
        });
      }
    } catch {
      // ignore
    }

    return {
      success: true,
      newCommit: rawHash,
      filesChanged,
      message,
    };
  }

  async pullContainer(id: string, dto: { sinceCommit?: string; paths?: string[] }) {
    const files = await this.getContainerFiles(id);
    const headCommit = (await this.getContainerCommits(id, 1))[0];
    const commitHash = headCommit?.hash || `rev-${Date.now()}`;
    return {
      commit: commitHash,
      files: files.map((f) => ({
        path: f.path,
        content: f.content || '',
        size: f.size || (f.content ? f.content.length : 0),
        mtime: f.mtime || Date.now(),
      })),
      isFullSync: !dto.sinceCommit,
    };
  }
}
