import { Injectable, Logger } from '@nestjs/common';
import { ICommandHandler } from '../command-bus.interface';
import { BusCommand, IngestAudioPayload } from '@lenta/shared';
import { NotesService } from '../../notes/notes.service';
import { NoteType } from '../../notes/dto/create-note.dto';

@Injectable()
export class IngestAudioHandler implements ICommandHandler<IngestAudioPayload> {
  readonly commandType = 'INGEST_AUDIO' as const;
  private readonly logger = new Logger(IngestAudioHandler.name);

  constructor(private readonly notesService: NotesService) {}

  async execute(payload: IngestAudioPayload, command: BusCommand): Promise<any> {
    this.logger.log(`Executing INGEST_AUDIO: "${payload.title || payload.fileName || 'Voice memo'}" (command: ${command.id})`);

    const title = payload.title?.trim() || `Голосовая заметка (${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })})`;
    const audioUrl = payload.audioUrl || (payload.fileName ? `/uploads/audio/${payload.fileName}` : undefined);

    const markdownBody = [
      `### 🎙️ ${title}`,
      '',
      audioUrl ? `<audio controls preload="metadata" style="width: 100%; margin: 8px 0;"><source src="${audioUrl}"></audio>` : '> [Аудиофайл прикреплен]',
      '',
      payload.durationSeconds ? `- **Длительность:** ~${Math.round(payload.durationSeconds)} сек.` : '',
      `- **Записано:** ${new Date().toLocaleString('ru-RU')}`,
      '',
      payload.autoTranscribe
        ? '> ⏳ *Транскрипция поставлена в очередь фоновой обработки Whisper/Gemini...*'
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    const note = await this.notesService.create({
      title,
      description: markdownBody,
      type: NoteType.EVENT,
      startDate: payload.targetDate || command.targetDate || new Date().toISOString(),
      sourceLink: audioUrl,
      icon: 'headphones',
      curator: 'voice-recorder',
      containerId: payload.containerId || undefined,
      folders: ['Audio/Recordings'],
      hashtags: ['audio', 'voicememo', ...(payload.tags || [])],
      tagIds: [],
    });

    return {
      noteId: note.id,
      title: note.title,
      audioUrl,
      folders: ['Audio/Recordings'],
    };
  }
}
