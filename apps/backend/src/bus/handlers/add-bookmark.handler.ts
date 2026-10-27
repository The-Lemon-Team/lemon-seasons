import { Injectable, Logger } from '@nestjs/common';
import { ICommandHandler } from '../command-bus.interface';
import { BusCommand, AddBookmarkPayload } from '@lenta/shared';
import { NotesService } from '../../notes/notes.service';
import { NoteType } from '../../notes/dto/create-note.dto';

@Injectable()
export class AddBookmarkHandler implements ICommandHandler<AddBookmarkPayload> {
  readonly commandType = 'ADD_BOOKMARK' as const;
  private readonly logger = new Logger(AddBookmarkHandler.name);

  constructor(private readonly notesService: NotesService) {}

  async execute(payload: AddBookmarkPayload, command: BusCommand): Promise<any> {
    this.logger.log(`Executing ADD_BOOKMARK: "${payload.url}" (command: ${command.id})`);

    let title = payload.title?.trim();
    let description = payload.description?.trim();
    let ogImage: string | undefined = undefined;

    // Optional lightweight OpenGraph extraction if title is not specified
    if ((!title || payload.autoEnrichOpenGraph) && payload.url) {
      try {
        const ogData = await this.extractOpenGraph(payload.url);
        if (!title && ogData.title) title = ogData.title;
        if (!description && ogData.description) description = ogData.description;
        if (ogData.image) ogImage = ogData.image;
      } catch (err: any) {
        this.logger.debug(`Could not extract OpenGraph for ${payload.url}: ${err.message}`);
      }
    }

    if (!title) {
      title = payload.url.replace(/^https?:\/\//i, '').split('/')[0] || 'Новая закладка';
    }

    const markdownBody = [
      `### 🔖 [${title}](${payload.url})`,
      '',
      description || 'Сохранено через мобильный буфер Lenta Command Bus.',
      ogImage ? `\n![Превью](${ogImage})` : '',
      `\n- **Источник:** ${payload.url}`,
      `- **Добавлено:** ${new Date().toLocaleString('ru-RU')}`,
    ]
      .filter(Boolean)
      .join('\n');

    const note = await this.notesService.create({
      title,
      description: markdownBody,
      type: NoteType.EVENT,
      startDate: payload.targetDate || command.targetDate || new Date().toISOString(),
      sourceLink: payload.url,
      icon: 'bookmark',
      author: 'mobile',
      containerId: payload.containerId || undefined,
      folders: payload.folders || ['Mobile/Bookmarks'],
      hashtags: payload.hashtags || ['bookmark', 'mobile'],
      tagIds: [],
    });

    return {
      noteId: note.id,
      title: note.title,
      url: payload.url,
      containerId: note.containerId,
      folders: payload.folders || ['Mobile/Bookmarks'],
    };
  }

  private async extractOpenGraph(url: string): Promise<{ title?: string; description?: string; image?: string }> {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LemonCalendarium/1.0)' },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return {};
    const html = await res.text();

    const titleMatch = html.match(/<meta property=["']og:title["'] content=["'](.*?)["']/i) || html.match(/<title>(.*?)<\/title>/i);
    const descMatch = html.match(/<meta property=["']og:description["'] content=["'](.*?)["']/i) || html.match(/<meta name=["']description["'] content=["'](.*?)["']/i);
    const imgMatch = html.match(/<meta property=["']og:image["'] content=["'](.*?)["']/i);

    return {
      title: titleMatch ? titleMatch[1].trim() : undefined,
      description: descMatch ? descMatch[1].trim() : undefined,
      image: imgMatch ? imgMatch[1].trim() : undefined,
    };
  }
}
