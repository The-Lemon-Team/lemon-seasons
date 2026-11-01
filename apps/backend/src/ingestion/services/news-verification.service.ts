import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ExtractedDateInfo,
  VerificationConfidence,
  extractDateFromFilename,
  extractDateFromUrl,
  fetchUrlMetadataDate,
} from './date-extraction.util';

export interface NoteVerificationInput {
  id?: string;
  title: string;
  description?: string;
  sourceLink?: string | null;
  fileName?: string | null;
  frontmatterDate?: string | Date | null;
  fallbackDate?: Date;
}

export interface VerifiedDateResult {
  id?: string;
  title: string;
  eventDate: Date;
  digestDate?: Date;
  sourcePublishedAt?: Date;
  confidence: VerificationConfidence;
  authenticityScore: number;
  reason: string;
}

@Injectable()
export class NewsVerificationService {
  private readonly logger = new Logger(NewsVerificationService.name);
  private readonly apiKey?: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService
      .get<string>('GEMINI_API_KEY')
      ?.replace(/^["']|["']$/g, '');
  }

  /**
   * Deterministically verifies a single note's event date using local metadata,
   * frontmatter differences, URL patterns, and optional web metadata scraping.
   */
  async verifyNote(
    item: NoteVerificationInput,
    options: { fetchWeb?: boolean } = { fetchWeb: true }
  ): Promise<VerifiedDateResult> {
    const filenameDate = item.fileName ? extractDateFromFilename(item.fileName) : null;
    const digestDate = filenameDate || item.fallbackDate || new Date();

    // 1. Check if frontmatter date explicitly specified a different event date
    if (item.frontmatterDate) {
      const parsedFm = new Date(item.frontmatterDate);
      if (!isNaN(parsedFm.getTime())) {
        if (filenameDate) {
          const fmDay = parsedFm.toISOString().slice(0, 10);
          const fileDay = filenameDate.toISOString().slice(0, 10);
          if (fmDay !== fileDay) {
            return {
              id: item.id,
              title: item.title,
              eventDate: parsedFm,
              digestDate,
              confidence: 'EXACT_FRONTMATTER',
              authenticityScore: 95,
              reason: `Frontmatter date (${fmDay}) was preserved from source, distinct from digest date (${fileDay})`,
            };
          }
        }
      }
    }

    // 2. Extract date embedded in source URL
    if (item.sourceLink) {
      const urlDate = extractDateFromUrl(item.sourceLink);
      if (urlDate) {
        return {
          id: item.id,
          title: item.title,
          eventDate: urlDate,
          digestDate,
          sourcePublishedAt: urlDate,
          confidence: 'URL_REGEX',
          authenticityScore: 90,
          reason: `Extracted date from source URL path: ${item.sourceLink}`,
        };
      }
    }

    // 3. Fast web metadata scraping (if enabled and sourceLink is present)
    if (options.fetchWeb && item.sourceLink && item.sourceLink.startsWith('http')) {
      try {
        const scraped = await fetchUrlMetadataDate(item.sourceLink, 3500);
        if (scraped) {
          return {
            id: item.id,
            title: item.title,
            eventDate: scraped,
            digestDate,
            sourcePublishedAt: scraped,
            confidence: 'SCRAPED_METADATA',
            authenticityScore: 95,
            reason: `Scraped publication date from HTML meta tags at ${item.sourceLink}`,
          };
        }
      } catch (err: any) {
        this.logger.debug(`Web scraping failed for ${item.sourceLink}: ${err.message}`);
      }
    }

    // 4. Default fallback to digest date
    return {
      id: item.id,
      title: item.title,
      eventDate: digestDate,
      digestDate,
      confidence: 'DIGEST_FALLBACK',
      authenticityScore: 70,
      reason: 'No explicit publication date detected; defaulted to digest issue date',
    };
  }

  /**
   * Batch verification using Gemini API (Flash model) for complex notes
   * where deterministic layers did not produce a certain date.
   */
  async verifyBatchWithGemini(
    items: NoteVerificationInput[]
  ): Promise<Map<string, VerifiedDateResult>> {
    const results = new Map<string, VerifiedDateResult>();
    if (!items || items.length === 0) return results;

    if (!this.apiKey) {
      this.logger.warn('⚠️ GEMINI_API_KEY not configured. Skipping AI date resolution.');
      for (const item of items) {
        const key = item.id || item.title;
        results.set(key, await this.verifyNote(item, { fetchWeb: false }));
      }
      return results;
    }

    const payload = items.map((it, idx) => ({
      index: idx,
      id: it.id || `idx-${idx}`,
      title: it.title,
      sourceUrl: it.sourceLink || null,
      digestDate: it.fileName
        ? extractDateFromFilename(it.fileName)?.toISOString().slice(0, 10)
        : null,
      contextSnippet: (it.description || '').slice(0, 300),
    }));

    const prompt = `Ты — экспертный хронолог и верификатор новостей Project Lenta.
Твоя задача: для каждого новостного события определить честную дату публикации / свершения (event_date) в формате ISO 8601 (ГГГГ-ММ-ДД или ГГГГ-ММ-ДДTHH:mm:ssZ).

Часто новость попадает в дайджест на следующий день или через несколько дней. Если новость произошла накануне digestDate (вчера, 2 дня назад) или дата указана в контексте/ссылке, верни именно реальную дату события.
Если дата точна, confidence = 90-100. Если приблизительна (тот же месяц или день дайджеста), confidence = 60-80.

Верни строго JSON массив объектов:
[
  {
    "id": "...",
    "eventDate": "2026-10-24T00:00:00.000Z",
    "confidence": 95,
    "reason": "Краткое обоснование (например: анонс состоялся вечером 24 октября)"
  }
]

Список новостей для анализа:
${JSON.stringify(payload, null, 2)}`;

    const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'];

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
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
            const parsedArray = JSON.parse(candidateText);
            if (Array.isArray(parsedArray)) {
              for (const entry of parsedArray) {
                const matchedItem = items.find((it, i) => it.id === entry.id || `idx-${i}` === entry.id);
                if (matchedItem && entry.eventDate) {
                  const evDate = new Date(entry.eventDate);
                  if (!isNaN(evDate.getTime())) {
                    const key = matchedItem.id || matchedItem.title;
                    results.set(key, {
                      id: matchedItem.id,
                      title: matchedItem.title,
                      eventDate: evDate,
                      digestDate: matchedItem.fileName
                        ? extractDateFromFilename(matchedItem.fileName) || undefined
                        : undefined,
                      confidence: 'AI_VERIFIED',
                      authenticityScore: entry.confidence || 85,
                      reason: entry.reason || 'Verified via Gemini Chrono Agent',
                    });
                  }
                }
              }
              return results;
            }
          }
        }
      } catch (err: any) {
        this.logger.debug(`Gemini batch attempt with ${model} failed: ${err.message}`);
      }
    }

    // Fallback if all Gemini models failed
    for (const item of items) {
      const key = item.id || item.title;
      if (!results.has(key)) {
        results.set(key, await this.verifyNote(item, { fetchWeb: false }));
      }
    }

    return results;
  }
}
