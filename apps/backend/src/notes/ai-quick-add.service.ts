import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NoteType, resolveTrendNoteType } from '@lenta/shared';
import { ParseNotesDto, ParseNotesContextDto } from './dto/parse-notes.dto';

export interface ParsedCardResult {
  tempId: string;
  title: string;
  type: NoteType;
  displayType: string;
  startDate: string;
  endDate?: string | null;
  feedId?: string;
  feedSlug?: string;
  feedTitle?: string;
  folder?: string;
  taxonomyPath?: string;
  tagIds?: string[];
  hashtags?: string[];
  icon?: string;
  sourceLink?: string;
  description?: string;
  selected?: boolean;
}

@Injectable()
export class AiQuickAddService {
  private readonly logger = new Logger(AiQuickAddService.name);
  private readonly apiKey?: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (this.apiKey) {
      this.logger.log('✨ Gemini AI Quick Add service initialized with API key.');
    } else {
      this.logger.warn('⚠️ GEMINI_API_KEY not found. Rule-based fallback parser active.');
    }
  }

  async parseNotes(dto: ParseNotesDto): Promise<{ cards: ParsedCardResult[] }> {
    const text = dto.text?.trim();
    if (!text) {
      return { cards: [] };
    }

    if (this.apiKey) {
      try {
        const geminiResult = await this.callGeminiApi(dto);
        if (geminiResult && geminiResult.length > 0) {
          return { cards: geminiResult };
        }
      } catch (err: any) {
        this.logger.error(`Gemini quick-add parsing failed: ${err.message}. Falling back to rule engine.`);
      }
    }

    const fallbackCards = this.parseWithRuleEngine(dto);
    return { cards: fallbackCards };
  }

  private async callGeminiApi(dto: ParseNotesDto): Promise<ParsedCardResult[] | null> {
    const referenceDate = dto.context?.defaultDate || new Date().toISOString().split('T')[0];
    const defaultFeed = dto.context?.defaultFeedId || 'my-notes';
    const defaultFolder = dto.context?.defaultFolder || 'Notes';

    const systemPrompt = `Ты — интеллектуальный ассистент приложения хронологического календаря Project Lenta.
Твоя задача: распарсить пользовательский текст на естественном языке и преобразовать его в массив структурированных карточек для календаря в формате строгого JSON.

ПРАВИЛА И СТАНДАРТЫ ТИПИЗАЦИИ:
1. "Trend" (Тренд) — если в тексте упоминается слово "Тренд", "Тренды" или список трендов:
   - displayType: "Trend"
   - type: если дата точечная -> "SINGLE", если указан интервал/диапазон дат -> "PERIOD"
   - В hashtags ОБЯЗАТЕЛЬНО добавь "тренд"
2. "Point Note" (Точечная заметка) — обычная мысль или факт с одной датой -> type: "SINGLE", displayType: "Point Note"
3. "Time Period" (Период времени) — интервал между датами -> type: "PERIOD", displayType: "Time Period"
4. "Scheduled Event" (Событие) — встреча, митап, созвон, точное время -> type: "EVENT", displayType: "Scheduled Event"
5. "Milestone / Done" (Выполнено) — совершенное действие, завершенная веха -> type: "DONE", displayType: "Done"
6. "Media / Release" (Релиз фильма/игры) -> type: "FILM_RELEASE", displayType: "Release"

ПРАВИЛА РАЗБОРА СПИСКОВ:
- Если в тексте заголовок вроде "Тренды 22.09.26:" и список пунктов (- пункт 1, - пункт 2), то КАЖДЫЙ ПУНКТ становится ОТДЕЛЬНОЙ карточкой! Дата и фид наследуются из заголовка/контекста.
- Текущая базовая дата контекста: "${referenceDate}". Год '26' означает 2026. Формат даты DD.MM.YY или DD.MM.YYYY переводи в ISO строку (например, 22.09.26 -> "2026-09-22T12:00:00.000Z").
- Извлекай теги (#хэштег -> hashtags), иерархические таксономии (Тег: tech.frontend -> taxonomyPath), папки (папка: ... -> folder), ссылки (https://... -> sourceLink), иконки (icon).

ПРИМЕР 1 (Вход):
Тренды 22.09.26:
- Уборка дома
- Ремонтные работы
- Warcraft
(Выход):
{
  "cards": [
    {
      "tempId": "temp-1",
      "title": "Уборка дома",
      "type": "SINGLE",
      "displayType": "Trend",
      "startDate": "2026-09-22T12:00:00.000Z",
      "endDate": null,
      "feedSlug": "my-notes",
      "feedTitle": "My Notes",
      "hashtags": ["тренд", "уборка", "быт"],
      "taxonomyPath": "lifestyle.home",
      "folder": "Trends/2026-09",
      "icon": "sparkles",
      "description": "",
      "selected": true
    },
    {
      "tempId": "temp-2",
      "title": "Ремонтные работы",
      "type": "SINGLE",
      "displayType": "Trend",
      "startDate": "2026-09-22T12:00:00.000Z",
      "endDate": null,
      "feedSlug": "my-notes",
      "feedTitle": "My Notes",
      "hashtags": ["тренд", "ремонт"],
      "taxonomyPath": "lifestyle.home",
      "folder": "Trends/2026-09",
      "icon": "hammer",
      "description": "",
      "selected": true
    },
    {
      "tempId": "temp-3",
      "title": "Warcraft",
      "type": "SINGLE",
      "displayType": "Trend",
      "startDate": "2026-09-22T12:00:00.000Z",
      "endDate": null,
      "feedSlug": "my-notes",
      "feedTitle": "My Notes",
      "hashtags": ["тренд", "игры", "warcraft"],
      "taxonomyPath": "gaming.pc",
      "folder": "Trends/2026-09",
      "icon": "gamepad",
      "description": "",
      "selected": true
    }
  ]
}

Верни строго JSON объект формата:
{
  "cards": [ ... ]
}`;

    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  { text: systemPrompt },
                  { text: `Пользовательский текст для разбора:\n${dto.text}` },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidateText) {
            const parsed = JSON.parse(candidateText);
            const rawCards = Array.isArray(parsed) ? parsed : parsed.cards;
            if (Array.isArray(rawCards) && rawCards.length > 0) {
              return rawCards.map((card, idx) => this.normalizeCard(card, idx, dto.context));
            }
          }
        }
      } catch (err: any) {
        this.logger.debug(`Model ${model} quick-add parsing attempt failed: ${err.message}`);
      }
    }

    return null;
  }

  private normalizeCard(card: any, index: number, context?: ParseNotesContextDto): ParsedCardResult {
    const isTrend = card.displayType === 'Trend' || card.type === 'Trend' || (card.hashtags || []).includes('тренд');
    let resolvedType: NoteType = card.type as NoteType;

    if (isTrend || card.type === 'Trend') {
      resolvedType = resolveTrendNoteType(card.endDate);
    } else if (!Object.values(NoteType).includes(resolvedType)) {
      resolvedType = NoteType.SINGLE;
    }

    const hashtags: string[] = Array.isArray(card.hashtags)
      ? Array.from(new Set(card.hashtags.map((h: string) => h.replace(/^#/, '').trim()).filter(Boolean)))
      : [];
    if (isTrend && !hashtags.includes('тренд')) {
      hashtags.unshift('тренд');
    }

    return {
      tempId: card.tempId || `temp-${Date.now()}-${index}`,
      title: String(card.title || 'Новая заметка').trim(),
      type: resolvedType,
      displayType: isTrend ? 'Trend' : (card.displayType || 'Point Note'),
      startDate: card.startDate || context?.defaultDate || new Date().toISOString(),
      endDate: card.endDate || null,
      feedId: card.feedId || context?.defaultFeedId,
      feedSlug: card.feedSlug || 'my-notes',
      feedTitle: card.feedTitle || 'My Notes',
      folder: card.folder || context?.defaultFolder || (isTrend ? 'Trends' : 'Notes'),
      taxonomyPath: card.taxonomyPath || undefined,
      tagIds: Array.isArray(card.tagIds) ? card.tagIds : undefined,
      hashtags,
      icon: card.icon || (isTrend ? 'trending-up' : undefined),
      sourceLink: card.sourceLink || undefined,
      description: card.description || '',
      selected: card.selected !== undefined ? Boolean(card.selected) : true,
    };
  }

  /**
   * Rule-based fallback parser that runs deterministically without external AI APIs.
   */
  public parseWithRuleEngine(dto: ParseNotesDto): ParsedCardResult[] {
    const lines = dto.text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];

    let contextDate = this.extractDate(dto.text) || dto.context?.defaultDate || new Date().toISOString();
    let isTrendContext = /тренд|trend/i.test(dto.text);
    let defaultFeedSlug = dto.context?.defaultFeedId || 'my-notes';
    let defaultFolder = dto.context?.defaultFolder || (isTrendContext ? 'Trends' : 'Notes');

    const cards: ParsedCardResult[] = [];
    let counter = 1;

    for (const line of lines) {
      // Check for standalone header lines e.g. "Тренды 22.09.26:" or "Заметки на 22.09.2026:"
      const isHeaderLine = /^(?:Тренды|Заметки|Планы|Notes|Trends)(?:\s+.*)?:$/iu.test(line);
      if (isHeaderLine) {
        const headerDate = this.extractDate(line);
        if (headerDate) contextDate = headerDate;
        if (/тренд|trend/iu.test(line)) isTrendContext = true;
        continue;
      }

      // Check for standalone metadata lines following a card or setting defaults
      const feedLineMatch = line.match(/^(?:лента|feed):\s*(.*)$/iu);
      if (feedLineMatch) {
        const feedVal = feedLineMatch[1].trim();
        if (cards.length > 0) {
          cards[cards.length - 1].feedTitle = feedVal;
          cards[cards.length - 1].feedSlug = feedVal.toLowerCase().replace(/[^a-zа-я0-9]/gi, '-');
        } else {
          defaultFeedSlug = feedVal.toLowerCase().replace(/[^a-zа-я0-9]/gi, '-');
        }
        continue;
      }

      const folderLineMatch = line.match(/^(?:папка|folder):\s*(.*)$/iu);
      if (folderLineMatch) {
        const folderVal = folderLineMatch[1].trim();
        if (cards.length > 0) {
          cards[cards.length - 1].folder = folderVal;
        } else {
          defaultFolder = folderVal;
        }
        continue;
      }

      const tagLineMatch = line.match(/^(?:тег|tag|таксономия):\s*(.*)$/iu);
      if (tagLineMatch) {
        const tagVal = tagLineMatch[1].trim();
        if (cards.length > 0) {
          cards[cards.length - 1].taxonomyPath = tagVal;
        }
        continue;
      }

      // Check if line is a bullet item (- Item, * Item, 1. Item)
      const bulletMatch = line.match(/^[-*•]\s+(.*)$/) || line.match(/^\d+[\.)]\s+(.*)$/);
      const rawContent = bulletMatch ? bulletMatch[1].trim() : line;

      // Extract metadata from item line
      const itemHashtags = (rawContent.match(/#([\wа-яА-ЯёЁ_-]+)/g) || []).map((h) => h.replace(/^#/, ''));
      let cleanContent = rawContent.replace(/#([\wа-яА-ЯёЁ_-]+)/g, '').trim();

      // Extract inline link
      const linkMatch = cleanContent.match(/https?:\/\/[^\s]+/);
      const sourceLink = linkMatch ? linkMatch[0] : undefined;
      if (sourceLink) {
        cleanContent = cleanContent.replace(sourceLink, '').trim();
      }

      // Extract inline taxonomy (Тег: path or tag: path)
      const tagMatch = cleanContent.match(/(?:тег|tag|таксономия):\s*([a-zA-Z0-9._-]+)/iu);
      const taxonomyPath = tagMatch ? tagMatch[1] : undefined;
      if (tagMatch) {
        cleanContent = cleanContent.replace(tagMatch[0], '').trim();
      }

      // Extract inline folder (Папка: path or folder: path)
      const folderMatch = cleanContent.match(/(?:папка|folder):\s*([a-zA-Z0-9/_-]+)/iu);
      const folder = folderMatch ? folderMatch[1] : defaultFolder;
      if (folderMatch) {
        cleanContent = cleanContent.replace(folderMatch[0], '').trim();
      }

      // Extract date overrides for this specific line if present
      const dateRange = this.extractDateRange(cleanContent);
      let lineDate = this.extractDate(cleanContent) || contextDate;

      // Extract exact time e.g. "в 19:00" or "at 14:30"
      const timeMatch = cleanContent.match(/(?:в|at)\s*(\d{1,2}):(\d{2})/iu);
      if (timeMatch && lineDate) {
        const hours = parseInt(timeMatch[1], 10);
        const minutes = parseInt(timeMatch[2], 10);
        const d = new Date(lineDate);
        d.setUTCHours(hours, minutes, 0, 0);
        lineDate = d.toISOString();
        cleanContent = cleanContent.replace(timeMatch[0], '').trim();
      }

      // Strip date fragments and prefixes from cleanContent to produce neat title
      cleanContent = cleanContent.replace(/^(?:тренд|заметка|событие|done|сделано):\s*/iu, '');
      cleanContent = cleanContent.replace(/\b\d{1,2}\.\d{1,2}\.\d{2,4}\s*[-–—]\s*\d{1,2}\.\d{1,2}\.\d{2,4}\b/g, '');
      cleanContent = cleanContent.replace(/\bс\s+\d{1,2}\s*(?:по|-)\s*\d{1,2}\s+[а-яё]+\s*(\d{2,4})?\b/giu, '');
      cleanContent = cleanContent.replace(/\b\d{1,2}\.\d{1,2}\.\d{2,4}\b/g, '');


      // Determine note type
      const isDone = /^(?:сделано|готово|done):/iu.test(rawContent);
      const isEvent = /(?:\bв\s+\d{1,2}:\d{2}\b|митап|созвон|встреча|вебинар)/iu.test(rawContent);
      const isPeriod = Boolean(dateRange);

      let finalType: NoteType = NoteType.SINGLE;
      let displayType = 'Point Note';

      if (isTrendContext || /тренд/iu.test(rawContent)) {
        finalType = resolveTrendNoteType(dateRange?.end);
        displayType = 'Trend';
        if (!itemHashtags.includes('тренд')) {
          itemHashtags.unshift('тренд');
        }
      } else if (isDone) {
        finalType = NoteType.DONE;
        displayType = 'Done';
      } else if (isEvent) {
        finalType = NoteType.EVENT;
        displayType = 'Scheduled Event';
      } else if (isPeriod) {
        finalType = NoteType.PERIOD;
        displayType = 'Time Period';
      }

      const title = cleanContent.replace(/\s+/g, ' ').trim() || `Заметка ${counter}`;

      cards.push({
        tempId: `temp-${counter++}`,
        title,
        type: finalType,
        displayType,
        startDate: dateRange?.start || lineDate,
        endDate: dateRange?.end || null,
        feedSlug: defaultFeedSlug,
        feedTitle: defaultFeedSlug === 'my-notes' ? 'My Notes' : defaultFeedSlug,
        folder,
        taxonomyPath,
        hashtags: itemHashtags,
        sourceLink,
        icon: isTrendContext || displayType === 'Trend' ? 'trending-up' : (isDone ? 'check-circle' : undefined),
        description: '',
        selected: true,
      });
    }

    return cards;
  }

  private extractDate(text: string): string | null {
    // Match DD.MM.YY or DD.MM.YYYY
    const ddmmyy = text.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{2,4})\b/);
    if (ddmmyy) {
      const day = ddmmyy[1].padStart(2, '0');
      const month = ddmmyy[2].padStart(2, '0');
      let year = ddmmyy[3];
      if (year.length === 2) {
        year = `20${year}`;
      }
      return `${year}-${month}-${day}T12:00:00.000Z`;
    }

    if (/\bсегодня\b/i.test(text)) {
      return new Date().toISOString();
    }
    if (/\bвчера\b/i.test(text)) {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return d.toISOString();
    }
    if (/\bзавтра\b/i.test(text)) {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d.toISOString();
    }

    return null;
  }

  private extractDateRange(text: string): { start: string; end: string } | null {
    // Match: 24.09.26 - 26.09.26
    const rangeMatch = text.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})\s*[-–—]\s*(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
    if (rangeMatch) {
      const sDay = rangeMatch[1].padStart(2, '0');
      const sMonth = rangeMatch[2].padStart(2, '0');
      const sYear = rangeMatch[3].length === 2 ? `20${rangeMatch[3]}` : rangeMatch[3];

      const eDay = rangeMatch[4].padStart(2, '0');
      const eMonth = rangeMatch[5].padStart(2, '0');
      const eYear = rangeMatch[6].length === 2 ? `20${rangeMatch[6]}` : rangeMatch[6];

      return {
        start: `${sYear}-${sMonth}-${sDay}T00:00:00.000Z`,
        end: `${eYear}-${eMonth}-${eDay}T23:59:59.000Z`,
      };
    }

    // Match: с 25 по 28 сентября 2026
    const ruMonths: Record<string, string> = {
      январ: '01', феврал: '02', март: '03', апрел: '04',
      ма: '05', июн: '06', июл: '07', август: '08',
      сентябр: '09', октябр: '10', ноябр: '11', декабр: '12',
    };
    const ruRangeMatch = text.match(/с\s+(\d{1,2})\s*(?:по|-)\s*(\d{1,2})\s+([а-яё]+)(?:\s+(\d{2,4}))?/iu);
    if (ruRangeMatch) {
      const sDay = ruRangeMatch[1].padStart(2, '0');
      const eDay = ruRangeMatch[2].padStart(2, '0');
      const monthPrefix = ruRangeMatch[3].toLowerCase();
      let month = '01';
      for (const [key, val] of Object.entries(ruMonths)) {
        if (monthPrefix.startsWith(key)) {
          month = val;
          break;
        }
      }
      let year = ruRangeMatch[4] || '2026';
      if (year.length === 2) year = `20${year}`;

      return {
        start: `${year}-${month}-${sDay}T00:00:00.000Z`,
        end: `${year}-${month}-${eDay}T23:59:59.000Z`,
      };
    }

    return null;
  }

}
