import { Injectable, Logger } from '@nestjs/common';
import { NoteType } from '@prisma/client';
import { HolidayItem } from './holidays-engine.service';

export interface WikiHistoricalEvent {
  year: number;
  text: string;
  articleTitle?: string;
  articleUrl?: string;
  extract?: string;
  imageUrl?: string;
  imageCaption?: string;
}

@Injectable()
export class WikiEngineService {
  private readonly logger = new Logger(WikiEngineService.name);
  private readonly USER_AGENT = 'LemonCalendarium/1.0 (https://lemon-calendarium.local; dev@lemon.local)';

  /**
   * Fetches historical "On this day" events from the official Wikimedia REST API.
   * Prioritizes Russian Wikipedia with seamless fallback to English Wikipedia or curated data.
   */
  async getEventsForDate(date: Date = new Date()): Promise<HolidayItem[]> {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const targetYear = date.getFullYear();
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const isoDate = `${targetYear}-${mm}-${dd}T00:00:00.000Z`;

    const rawEvents = await this.fetchWikiEvents(month, day);

    // Limit to top 15 most significant curated events to avoid overwhelming the feed
    const selected = rawEvents.slice(0, 15);

    return selected.map((item) => {
      const primaryPage = item.articleTitle || 'Событие';
      const title = `${item.year} г. — ${primaryPage}`;

      const markdownDesc = [
        `### ${item.year} год: ${primaryPage}`,
        '',
        item.text,
        item.extract && item.extract !== item.text ? `\n> ${item.extract}` : '',
        item.articleUrl ? `\n[Читать на Wikipedia](${item.articleUrl})` : '',
      ]
        .filter(Boolean)
        .join('\n');

      return {
        title,
        startDate: isoDate,
        type: NoteType.EVENT,
        description: markdownDesc,
        icon: 'book-open',
        sourceLink: item.articleUrl,
        imageUrl: item.imageUrl,
        imageCaption: item.imageCaption || primaryPage,
        taxonomyPath: 'history.wiki',
        folders: ['Wiki', 'History'],
        hashtags: ['wiki', 'история', 'этотденьвистории'],
      };
    });
  }

  private async fetchWikiEvents(month: number, day: number): Promise<WikiHistoricalEvent[]> {
    const padMonth = String(month).padStart(2, '0');
    const padDay = String(day).padStart(2, '0');

    // 1. Try Russian Wikipedia REST API
    try {
      const ruUrl = `https://ru.wikipedia.org/api/rest_v1/feed/onthisday/events/${padMonth}/${padDay}`;
      const response = await fetch(ruUrl, {
        headers: {
          'User-Agent': this.USER_AGENT,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(6000),
      });

      if (response.ok) {
        const data: any = await response.json();
        if (data && Array.isArray(data.events) && data.events.length > 0) {
          return this.parseApiEvents(data.events);
        }
      }
    } catch (err: any) {
      this.logger.warn(`Failed to fetch from ru.wikipedia: ${err.message}. Trying en.wikipedia fallback.`);
    }

    // 2. Try English Wikipedia REST API fallback
    try {
      const enUrl = `https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/${padMonth}/${padDay}`;
      const response = await fetch(enUrl, {
        headers: {
          'User-Agent': this.USER_AGENT,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(6000),
      });

      if (response.ok) {
        const data: any = await response.json();
        if (data && Array.isArray(data.events) && data.events.length > 0) {
          return this.parseApiEvents(data.events);
        }
      }
    } catch (err: any) {
      this.logger.warn(`Failed to fetch from en.wikipedia: ${err.message}. Using offline fallback.`);
    }

    // 3. Built-in Offline Fallback
    return this.getFallbackEvents(month, day);
  }

  private parseApiEvents(events: any[]): WikiHistoricalEvent[] {
    return events.map((ev) => {
      const page = ev.pages && ev.pages.length > 0 ? ev.pages[0] : undefined;
      const imageUrl = page?.thumbnail?.source || page?.originalimage?.source || undefined;
      const articleUrl = page?.content_urls?.desktop?.page || page?.content_urls?.mobile?.page || undefined;
      const articleTitle = page?.titles?.normalized || page?.title || undefined;
      const extract = page?.extract || undefined;

      return {
        year: ev.year,
        text: ev.text,
        articleTitle,
        articleUrl,
        extract,
        imageUrl,
        imageCaption: page?.description,
      };
    });
  }

  private getFallbackEvents(month: number, day: number): WikiHistoricalEvent[] {
    return [
      {
        year: 1964,
        text: 'Состоялся старт космического корабля «Восход-1» с первым в мире многоместным экипажем на борту.',
        articleTitle: 'Восход-1',
        articleUrl: 'https://ru.wikipedia.org/wiki/%D0%92%D0%BE%D1%81%D1%85%D0%BE%D0%B4-1',
        extract: 'Первый космический полет с экипажем из трёх человек без скафандров.',
      },
      {
        year: 1810,
        text: 'В Мюнхене состоялся первый в истории фестиваль Октоберфест в честь свадьбы кронпринца Людвига.',
        articleTitle: 'Октоберфест',
        articleUrl: 'https://ru.wikipedia.org/wiki/%D0%9E%D0%BA%D1%82%D0%BE%D0%B1%D0%B5%D1%80%D1%84%D0%B5%D1%81%D1%82',
        extract: 'Крупнейший в мире фестиваль народных традиций и культуры Баварии.',
      },
    ];
  }
}
