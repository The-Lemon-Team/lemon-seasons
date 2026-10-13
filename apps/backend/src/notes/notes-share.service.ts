import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FoldersService } from '../folders/folders.service';
import { HashtagsService } from '../hashtags/hashtags.service';
import { QuickShareNoteDto } from './dto/quick-share-note.dto';

@Injectable()
export class NotesShareService {
  constructor(
    private prisma: PrismaService,
    private foldersService: FoldersService,
    private hashtagsService: HashtagsService,
  ) {}

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
