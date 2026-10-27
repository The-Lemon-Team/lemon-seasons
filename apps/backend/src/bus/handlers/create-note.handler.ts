import { Injectable, Logger } from '@nestjs/common';
import { ICommandHandler } from '../command-bus.interface';
import { BusCommand, CreateNotePayload } from '@lenta/shared';
import { NotesService } from '../../notes/notes.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NoteType } from '../../notes/dto/create-note.dto';

@Injectable()
export class CreateNoteHandler implements ICommandHandler<CreateNotePayload> {
  readonly commandType = 'CREATE_NOTE' as const;
  private readonly logger = new Logger(CreateNoteHandler.name);

  constructor(
    private readonly notesService: NotesService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(payload: CreateNotePayload, command: BusCommand): Promise<any> {
    this.logger.log(`Executing CREATE_NOTE: "${payload.title}" (command: ${command.id})`);

    let targetFeedId: string | undefined = undefined;
    if (payload.feedSlug) {
      const feed = await this.prisma.feed.findUnique({
        where: { slug: payload.feedSlug },
      });
      if (feed) {
        targetFeedId = feed.id;
      }
    }

    const note = await this.notesService.create({
      title: payload.title,
      description: payload.description,
      type: payload.type ? (payload.type as NoteType) : NoteType.EVENT,
      startDate: payload.startDate || command.targetDate || new Date().toISOString(),
      endDate: payload.endDate || undefined,
      feedId: targetFeedId,
      containerId: payload.containerId || undefined,
      sourceLink: payload.sourceLink,
      icon: payload.icon,
      author: payload.author || payload.curator || 'bus',
      folders: payload.folders || [],
      hashtags: payload.hashtags || [],
      tagIds: [],
    });

    return {
      noteId: note.id,
      title: note.title,
      startDate: note.startDate,
      feedId: note.feedId,
      containerId: note.containerId,
    };
  }
}
