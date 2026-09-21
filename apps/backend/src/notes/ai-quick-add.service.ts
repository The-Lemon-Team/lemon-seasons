import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NoteType,
  resolveTrendNoteType,
  NOTE_TEMPLATE_TRENDS_TODAY,
  NOTE_TEMPLATE_TREND_PERIOD,
  NOTE_TEMPLATE_EVENT,
  NOTE_TEMPLATE_DONE,
  NOTE_TEMPLATE_POINT_NOTE,
} from '@lenta/shared';
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
    this.logger.log('⚡ Note Template & Alias Engine initialized (local deterministic parser).');
    if (this.apiKey) {
      this.logger.log('✨ External Gemini AI available as opt-in fallback.');
    }
  }

  async parseNotes(dto: ParseNotesDto): Promise<{ cards: ParsedCardResult[] }> {
    const text = dto.text?.trim();
    if (!text) {
      return { cards: [] };
    }

    // 1. Primary engine: Deterministic local template & alias parser.
    // Extremely fast (< 1ms), runs entirely on the backend, ensuring zero private user data leaks outside.
    const templateCards = this.parseWithTemplateEngine(dto);
    if (templateCards.length > 0) {
      return { cards: templateCards };
    }

    // 2. Optional external AI fallback: only if caller explicitly opted in and API key is configured.
    if (this.apiKey && dto.context?.useExternalAi) {
      try {
        const geminiResult = await this.callGeminiApi(dto);
        if (geminiResult && geminiResult.length > 0) {
          return { cards: geminiResult };
        }
      } catch (err: any) {
        this.logger.error(`Gemini quick-add parsing failed: ${err.message}.`);
      }
    }

    return { cards: templateCards };
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
   * Deterministic template & alias engine that runs entirely on the backend.
   * Guarantees < 1ms execution, 0 external network requests, and total user data isolation.
   */
  public parseWithTemplateEngine(dto: ParseNotesDto): ParsedCardResult[] {
    const rawText = dto.text?.trim() || '';
    if (!rawText) return [];

    const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];

    let contextDate = this.extractDate(rawText) || dto.context?.defaultDate || new Date().toISOString();
    let defaultFeedSlug = dto.context?.defaultFeedId || 'my-notes';
    let defaultFolder = dto.context?.defaultFolder || 'Notes';

    // Active template or mode detection
    let activeTemplateId: string = dto.context?.templateId || '';
    let isTrendContext = /тренд|trend|\/today|\/trend|\/tr|!тр/iu.test(rawText);
    if (isTrendContext && (!defaultFolder || defaultFolder === 'Notes')) {
      defaultFolder = 'Trends';
    }

    const cards: ParsedCardResult[] = [];
    let counter = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 1. Standalone header detection
      // Examples: "Тренды 21.09.26:", "Тренды на сегодня:", "Тренд-период:", "/today", "/period", "Notes:"
      const isSlashCommand = /^[\/!](?:today|trend|tr|period|trp|event|done|note)\b/iu.test(line);
      const isHeaderLine = isSlashCommand || /^(?:(?:\/|!)(?:today|trend|tr|period|trp|event|done|note)|(?:Тренды\s+на\s+сегодня|Тренды|Тренд-период|Тренд\s+период|Тренд|Период|Марафон|Сезон|События|Событие|Ивент|Митап|Встреча|Сделано|Готово|Done|Планы|Заметки|Notes|Trends))(?:\s+.*)?:?$/iu.test(line);

      // Only treat as header if it ends with colon, starts with command slash/exclamation, or is a section title
      if (isHeaderLine && (line.endsWith(':') || isSlashCommand || /^(?:Тренды|Тренд-период|Тренд\s+период|Заметки|Планы|Notes|Trends)/iu.test(line))) {
        const headerDate = this.extractDate(line);
        if (headerDate) contextDate = headerDate;

        if (/тренд-период|тренд\s+период|марафон|сезон|period|\/period|\/trp|!период/iu.test(line)) {
          activeTemplateId = NOTE_TEMPLATE_TREND_PERIOD;
          isTrendContext = true;
          defaultFolder = 'Trends';
        } else if (/тренд|\/today|\/trend|\/tr|!тр/iu.test(line)) {
          activeTemplateId = NOTE_TEMPLATE_TRENDS_TODAY;
          isTrendContext = true;
          defaultFolder = 'Trends';
        } else if (/событи|ивент|митап|встреч|event|\/event/iu.test(line)) {
          activeTemplateId = NOTE_TEMPLATE_EVENT;
        } else if (/сделано|готов|done|\/done/iu.test(line)) {
          activeTemplateId = NOTE_TEMPLATE_DONE;
        }
        continue;
      }

      // 2. Standalone metadata lines:
      // Feed alias: лента:, feed:, календарь:, л:
      const feedLineMatch = line.match(/^(?:лента|feed|календарь|л):\s*(.*)$/iu);
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

      // Folder alias: папка:, folder:, dir:, п:, ф:
      const folderLineMatch = line.match(/^(?:папка|folder|dir|п|ф):\s*(.*)$/iu);
      if (folderLineMatch) {
        const folderVal = folderLineMatch[1].trim();
        if (cards.length > 0) {
          cards[cards.length - 1].folder = folderVal;
        } else {
          defaultFolder = folderVal;
        }
        continue;
      }

      // Tag alias: тег:, tag:, таксономия:, tax:, т:
      const tagLineMatch = line.match(/^(?:тег|tag|таксономия|tax|т):\s*(.*)$/iu);
      if (tagLineMatch) {
        const tagVal = tagLineMatch[1].trim();
        if (cards.length > 0) {
          cards[cards.length - 1].taxonomyPath = tagVal;
        }
        continue;
      }

      // 3. Item parsing (bullets or standalone line)
      const bulletMatch = line.match(/^[-*•]\s+(.*)$/) || line.match(/^\d+[\.)]\s+(.*)$/);
      const rawContent = bulletMatch ? bulletMatch[1].trim() : line;

      // Extract inline hashtags
      const itemHashtags = (rawContent.match(/#([\wа-яА-ЯёЁ_-]+)/g) || []).map((h) => h.replace(/^#/, ''));
      let cleanContent = rawContent.replace(/#([\wа-яА-ЯёЁ_-]+)/g, '').trim();

      // Extract inline link: url, link, ссылка, or bare http(s)://
      const linkMatch = cleanContent.match(/https?:\/\/[^\s]+/) || cleanContent.match(/(?:ссылка|link|url):\s*([^\s]+)/iu);
      const sourceLink = linkMatch ? (linkMatch[1] || linkMatch[0]) : undefined;
      if (sourceLink) {
        cleanContent = cleanContent.replace(linkMatch![0], '').trim();
      }

      // Extract inline taxonomy: тег:, tag:, таксономия:, tax:, т:
      const tagMatch = cleanContent.match(/(?:тег|tag|таксономия|tax|т):\s*([a-zA-Z0-9._-]+)/iu);
      const taxonomyPath = tagMatch ? tagMatch[1] : undefined;
      if (tagMatch) {
        cleanContent = cleanContent.replace(tagMatch[0], '').trim();
      }

      // Extract inline folder: папка:, folder:, dir:, п:, ф:
      const folderMatch = cleanContent.match(/(?:папка|folder|dir|п|ф):\s*([a-zA-Z0-9/_-]+)/iu);
      const folder = folderMatch ? folderMatch[1] : defaultFolder;
      if (folderMatch) {
        cleanContent = cleanContent.replace(folderMatch[0], '').trim();
      }

      // Extract date overrides or ranges for this specific line
      const dateRange = this.extractDateRange(cleanContent);
      let lineDate = this.extractDate(cleanContent) || contextDate;

      // Extract exact time e.g. "в 19:00", "at 14:30", "@19:00", "время: 19:00"
      const timeMatch = cleanContent.match(/(?:в|at|@|время:\s*|time:\s*)(\d{1,2}):(\d{2})/iu);
      if (timeMatch && lineDate) {
        const hours = parseInt(timeMatch[1], 10);
        const minutes = parseInt(timeMatch[2], 10);
        const d = new Date(lineDate);
        d.setUTCHours(hours, minutes, 0, 0);
        lineDate = d.toISOString();
        cleanContent = cleanContent.replace(timeMatch[0], '').trim();
      }

      // Strip date fragments and prefixes from cleanContent to produce neat title
      cleanContent = cleanContent.replace(/^(?:тренд-период|тренд\s+период|тренд|заметка|событие|ивент|done|сделано|готово|чек):\s*/iu, '');
      cleanContent = cleanContent.replace(/\b\d{1,2}\.\d{1,2}(?:\.\d{2,4})?\s*[-–—]\s*\d{1,2}\.\d{1,2}(?:\.\d{2,4})?\b/g, '');
      cleanContent = cleanContent.replace(/\bс\s+\d{1,2}\s*(?:по|-)\s*\d{1,2}\s+[а-яё]+(?:\s+\d{2,4})?\b/giu, '');
      cleanContent = cleanContent.replace(/\b\d{1,2}\.\d{1,2}\.\d{2,4}\b/g, '');

      // Determine note type and display type
      const isDone = /^(?:сделано|готово|done|выполнено|чек):/iu.test(rawContent) || activeTemplateId === NOTE_TEMPLATE_DONE;
      const isEvent = /(?:\bв\s+\d{1,2}:\d{2}\b|@\d{1,2}:\d{2}|митап|созвон|встреча|вебинар)/iu.test(rawContent) || activeTemplateId === NOTE_TEMPLATE_EVENT;
      const isPeriod = Boolean(dateRange) || activeTemplateId === NOTE_TEMPLATE_TREND_PERIOD;
      const isTrend = isTrendContext || /тренд/iu.test(rawContent) || activeTemplateId === NOTE_TEMPLATE_TRENDS_TODAY || activeTemplateId === NOTE_TEMPLATE_TREND_PERIOD;

      let finalType: NoteType = NoteType.SINGLE;
      let displayType = 'Point Note';
      let icon: string | undefined = undefined;

      if (isTrend) {
        finalType = resolveTrendNoteType(dateRange?.end);
        displayType = 'Trend';
        icon = 'trending-up';
        if (!itemHashtags.includes('тренд')) {
          itemHashtags.unshift('тренд');
        }
      } else if (isDone) {
        finalType = NoteType.DONE;
        displayType = 'Done';
        icon = 'check-circle';
      } else if (isEvent) {
        finalType = NoteType.EVENT;
        displayType = 'Scheduled Event';
        icon = 'calendar';
      } else if (isPeriod) {
        finalType = NoteType.PERIOD;
        displayType = 'Time Period';
        icon = 'clock';
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
        icon,
        description: '',
        selected: true,
      });
    }

    return cards;
  }

  /**
   * Backwards compatible proxy to parseWithTemplateEngine.
   */
  public parseWithRuleEngine(dto: ParseNotesDto): ParsedCardResult[] {
    return this.parseWithTemplateEngine(dto);
  }

  private extractDate(text: string): string | null {
    // 1. Match DD.MM.YY or DD.MM.YYYY
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

    // 2. Relative date macros and aliases
    const lower = text.toLowerCase();
    const today = new Date();

    if (/\b(?:сегодня|today|тд|td)\b/iu.test(lower)) {
      return today.toISOString();
    }
    if (/\b(?:вчера|yesterday|вч)\b/iu.test(lower)) {
      const d = new Date(today);
      d.setDate(d.getDate() - 1);
      return d.toISOString();
    }
    if (/\b(?:завтра|tomorrow|зм|tm)\b/iu.test(lower)) {
      const d = new Date(today);
      d.setDate(d.getDate() + 1);
      return d.toISOString();
    }
    if (/\bпозавчера\b/iu.test(lower)) {
      const d = new Date(today);
      d.setDate(d.getDate() - 2);
      return d.toISOString();
    }
    if (/\bпослезавтра\b/iu.test(lower)) {
      const d = new Date(today);
      d.setDate(d.getDate() + 2);
      return d.toISOString();
    }

    // через N дней
    const inDaysMatch = lower.match(/\bчерез\s+(\d+)\s*(?:дней|дня|день|дн)\b/iu);
    if (inDaysMatch) {
      const days = parseInt(inDaysMatch[1], 10);
      const d = new Date(today);
      d.setDate(d.getDate() + days);
      return d.toISOString();
    }

    return null;
  }

  private extractDateRange(text: string): { start: string; end: string } | null {
    const currentYear = new Date().getFullYear().toString();

    // 1. Match: 24.09.26 - 26.09.26 or 24.09 - 26.09.26 or 24.09 - 26.09
    const rangeMatch = text.match(/(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?\s*[-–—]\s*(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?/);
    if (rangeMatch) {
      const sDay = rangeMatch[1].padStart(2, '0');
      const sMonth = rangeMatch[2].padStart(2, '0');
      let sYear = rangeMatch[3] || rangeMatch[6] || currentYear;
      if (sYear.length === 2) sYear = `20${sYear}`;

      const eDay = rangeMatch[4].padStart(2, '0');
      const eMonth = rangeMatch[5].padStart(2, '0');
      let eYear = rangeMatch[6] || rangeMatch[3] || currentYear;
      if (eYear.length === 2) eYear = `20${eYear}`;

      return {
        start: `${sYear}-${sMonth}-${sDay}T00:00:00.000Z`,
        end: `${eYear}-${eMonth}-${eDay}T23:59:59.000Z`,
      };
    }

    // 2. Match: с 25 по 28 сентября 2026 or с 25 по 28 сентября
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
      let year = ruRangeMatch[4] || currentYear;
      if (year.length === 2) year = `20${year}`;

      return {
        start: `${year}-${month}-${sDay}T00:00:00.000Z`,
        end: `${year}-${month}-${eDay}T23:59:59.000Z`,
      };
    }

    // 3. Match: с 25.09 по 28.09
    const shortRangeMatch = text.match(/с\s+(\d{1,2})\.(\d{1,2})\s*(?:по|-)\s*(\d{1,2})\.(\d{1,2})(?:\s+(\d{2,4}))?/iu);
    if (shortRangeMatch) {
      const sDay = shortRangeMatch[1].padStart(2, '0');
      const sMonth = shortRangeMatch[2].padStart(2, '0');
      const eDay = shortRangeMatch[3].padStart(2, '0');
      const eMonth = shortRangeMatch[4].padStart(2, '0');
      let year = shortRangeMatch[5] || currentYear;
      if (year.length === 2) year = `20${year}`;

      return {
        start: `${year}-${sMonth}-${sDay}T00:00:00.000Z`,
        end: `${year}-${eMonth}-${eDay}T23:59:59.000Z`,
      };
    }

    return null;
  }
}

