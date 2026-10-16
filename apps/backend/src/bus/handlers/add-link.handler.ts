import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ICommandHandler } from '../command-bus.interface';
import { BusCommand, AddLinkPayload } from '@lenta/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { NotesLinksService } from '../../notes/notes-links.service';

@Injectable()
export class AddLinkHandler implements ICommandHandler<AddLinkPayload> {
  readonly commandType = 'ADD_LINK' as const;
  private readonly logger = new Logger(AddLinkHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notesLinksService: NotesLinksService,
  ) {}

  async execute(payload: AddLinkPayload, command: BusCommand): Promise<any> {
    this.logger.log(`Executing ADD_LINK: "${payload.url}" (command: ${command.id})`);

    let targetNoteId = payload.noteId;

    if (!targetNoteId && payload.noteTitle) {
      const found = await this.prisma.note.findFirst({
        where: {
          title: { contains: payload.noteTitle, mode: 'insensitive' },
          deletedAt: null,
        },
      });
      if (found) {
        targetNoteId = found.id;
      }
    }

    if (!targetNoteId) {
      throw new NotFoundException(`Целевая заметка для ссылки не найдена (noteId: ${payload.noteId}, title: ${payload.noteTitle})`);
    }

    const createdLinks = await this.notesLinksService.addLinks(targetNoteId, [
      {
        url: payload.url,
        title: payload.title || payload.url,
        isSource: payload.isSource ?? true,
        order: payload.order ?? 0,
      },
    ]);

    return {
      noteId: targetNoteId,
      url: payload.url,
      links: createdLinks,
    };
  }
}
