import { Injectable, Logger } from '@nestjs/common';
import { ICommandHandler } from '../command-bus.interface';
import { BusCommand, AddNotebookLmPayload } from '@lenta/shared';
import { NotesService } from '../../notes/notes.service';
import { IngestionService } from '../../ingestion/ingestion.service';
import { NoteType } from '../../notes/dto/create-note.dto';

@Injectable()
export class AddNotebookLmHandler implements ICommandHandler<AddNotebookLmPayload> {
  readonly commandType = 'ADD_NOTEBOOKLM' as const;
  private readonly logger = new Logger(AddNotebookLmHandler.name);

  constructor(
    private readonly notesService: NotesService,
    private readonly ingestionService: IngestionService,
  ) {}

  async execute(payload: AddNotebookLmPayload, command: BusCommand): Promise<any> {
    this.logger.log(`Executing ADD_NOTEBOOKLM: "${payload.title}" (command: ${command.id})`);

    const containerId = payload.containerId || 'notebooklm-podcasts';

    // Ensure dedicated NotebookLM container exists
    await this.ingestionService.ensureContainer(
      containerId,
      'NotebookLM Deep Dive Podcasts',
      'Контейнер аудио-подкастов, глубоких аналитических обзоров и конспектов NotebookLM',
    );

    const markdownBody = [
      `### 🎙️ NotebookLM Deep Dive: ${payload.title}`,
      '',
      payload.audioPodcastUrl ? `<audio controls preload="metadata" style="width: 100%; margin: 8px 0;"><source src="${payload.audioPodcastUrl}"></audio>` : '',
      '',
      payload.summary ? `#### 📌 Ключевые тезисы выпуска\n${payload.summary}` : '',
      '',
      payload.sourceDocuments && payload.sourceDocuments.length > 0
        ? `#### 📚 Источники исследования:\n${payload.sourceDocuments.map((doc) => `- ${doc}`).join('\n')}`
        : '',
      '',
      payload.transcriptMarkdown
        ? `#### 📝 Транскрипт диалога\n\n${payload.transcriptMarkdown}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    const note = await this.notesService.create({
      title: payload.title,
      description: markdownBody,
      type: NoteType.PERIOD,
      startDate: payload.targetDate || command.targetDate || new Date().toISOString(),
      sourceLink: payload.audioPodcastUrl,
      icon: 'sparkles',
      author: 'notebooklm',
      containerId,
      folders: ['NotebookLM/Podcasts'],
      hashtags: ['notebooklm', 'podcast', 'deepdive', 'ai'],
      tagIds: [],
    });

    return {
      noteId: note.id,
      containerId,
      title: note.title,
      audioUrl: payload.audioPodcastUrl,
    };
  }
}
