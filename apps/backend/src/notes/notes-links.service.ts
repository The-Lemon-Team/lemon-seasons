import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNoteLinkDto, UpdateNoteLinkDto, LinkOrderItemDto } from './dto/link.dto';

@Injectable()
export class NotesLinksService {
  constructor(private prisma: PrismaService) {}

  /**
   * Add links to an existing note
   */
  async addLinks(noteId: string, dtos: CreateNoteLinkDto[]) {
    const existingLinks = await this.prisma.noteLink.findMany({
      where: { noteId },
      orderBy: { order: 'desc' },
    });

    const hasSource = existingLinks.some((l) => l.isSource);
    let nextOrder = existingLinks.length > 0 ? existingLinks[0].order + 1 : 0;

    for (let i = 0; i < dtos.length; i++) {
      const dto = dtos[i];
      const isSource =
        dto.isSource !== undefined
          ? dto.isSource
          : !hasSource && existingLinks.length === 0 && i === 0;

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
      await tx.noteLink.updateMany({
        where: { noteId },
        data: { isSource: false },
      });

      await tx.noteLink.update({
        where: { id: linkId },
        data: { isSource: true },
      });

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
}
