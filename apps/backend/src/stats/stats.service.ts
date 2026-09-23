import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SystemStats } from '@lenta/shared';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSystemStats(): Promise<SystemStats> {
    const [
      notesTotal,
      notesGroupedByType,
      feedsCount,
      containersTotal,
      containersPublic,
      containersPrivate,
      foldersCount,
      taxonomyCount,
      hashtagsCount,
      activeKeysCount,
      usersCount,
      storageAggregate,
      latestNote,
    ] = await Promise.all([
      this.prisma.note.count({ where: { deletedAt: null } }),
      this.prisma.note.groupBy({
        by: ['type'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.feed.count({ where: { deletedAt: null } }),
      this.prisma.container.count({ where: { deletedAt: null } }),
      this.prisma.container.count({ where: { deletedAt: null, visibility: 'public' } }),
      this.prisma.container.count({ where: { deletedAt: null, visibility: 'private' } }),
      this.prisma.folder.count({ where: { deletedAt: null } }),
      this.prisma.taxonomyNode.count({ where: { deletedAt: null } }),
      this.prisma.hashtag.count({ where: { deletedAt: null } }),
      this.prisma.userKey.count({ where: { isRevoked: false } }),
      this.prisma.user.count(),
      this.prisma.noteImage.aggregate({
        _count: { _all: true },
        _sum: { sizeBytes: true },
      }),
      this.prisma.note.findFirst({
        where: { deletedAt: null },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      }),
    ]);

    const notesByType: Record<string, number> = {};
    for (const group of notesGroupedByType) {
      notesByType[group.type] = group._count._all;
    }

    return {
      notesTotal,
      notesByType,
      feedsCount,
      containersCount: {
        total: containersTotal,
        public: containersPublic,
        private: containersPrivate,
      },
      foldersCount,
      taxonomyCount,
      hashtagsCount,
      activeKeysCount,
      usersCount,
      storage: {
        imagesCount: storageAggregate._count._all || 0,
        totalBytes: storageAggregate._sum.sizeBytes || 0,
      },
      system: {
        status: 'healthy',
        uptime: Math.round(process.uptime()),
        lastActivityAt: latestNote?.updatedAt ? latestNote.updatedAt.toISOString() : undefined,
        database: 'connected',
      },
    };
  }
}
