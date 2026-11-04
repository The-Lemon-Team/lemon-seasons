import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';

export interface GeneratedNoteEnrichment {
  description: string;
  hashtags: string[];
  suggestedTags?: string[];
  keyQuote?: string;
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly apiKey?: string;
  private readonly modelName: string = 'gemini-3.5-flash-lite';
  private readonly proxyAgent?: any;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY')?.replace(/^["']|["']$/g, '');
    const rawProxy =
      process.env.HTTPS_PROXY ||
      process.env.HTTP_PROXY ||
      this.configService.get<string>('HTTPS_PROXY') ||
      this.configService.get<string>('HTTP_PROXY') ||
      'http://127.0.0.1:20808';

    const proxyUrl = rawProxy?.replace(/^["']|["']$/g, '');

    if (proxyUrl) {
      try {
        const { HttpsProxyAgent } = require('https-proxy-agent');
        this.proxyAgent = new HttpsProxyAgent(proxyUrl);
        this.logger.log(`🌐 Proxy agent enabled for Gemini API (${proxyUrl})`);
      } catch (err: any) {
        this.logger.warn(`Could not initialize proxy agent: ${err.message}`);
      }
    }

    if (this.apiKey) {
      this.logger.log('✨ Gemini API key detected. AI enrichment service initialized.');
    } else {
      this.logger.warn('⚠️ GEMINI_API_KEY not provided. Fallback canonical generation engine will be active.');
    }
  }

  /**
   * Generates or enriches rich Markdown content for a calendar note.
   */
  async generateNoteContent(
    title: string,
    category?: string,
    dateStr?: string,
    context?: string,
    noteType?: string,
  ): Promise<GeneratedNoteEnrichment> {
    const finalCategory = category?.trim() || (noteType === 'FILM_RELEASE' ? 'Кино / Релиз' : 'Общее');
    const finalDateStr = dateStr?.trim() || '2026';

    if (this.apiKey) {
      try {
        const result = await this.callGeminiApi(title, finalCategory, finalDateStr, context, noteType);
        if (result) {
          return result;
        }
      } catch (error: any) {
        this.logger.error(`Gemini API call failed for "${title}": ${error?.message}. Using canonical fallback.`);
      }
    }

    return this.generateFallbackContent(title, finalCategory, finalDateStr, context, noteType);
  }

  private async callGeminiApi(
    title: string,
    category: string,
    dateStr: string,
    context?: string,
    noteType?: string,
  ): Promise<GeneratedNoteEnrichment | null> {
    const isCinema = noteType === 'FILM_RELEASE' || /кино|фильм|cinema|movie|film|премьер/i.test(category);
    const domainSpecificInstructions = isCinema
      ? `Поскольку это заметка о кино / фильме / релизе:
- Сформируй структурированное описание: краткий синопсис / завязка сюжета, ключевые персоналии (режиссер, актерский состав), жанр, статус ожидания или значение для франшизы.
- В hashtags обязательно включи релевантные теги (например, "кино", "фильмы", название франшизы или жанр).
- В keyQuote укажи официальный слоган, цитату или ключевой факт фильма.`
      : `Сформируй структурированное описание события с подзаголовками ###, списками, цитатами > и ключевыми фактами.`;

    const prompt = `Ты — экспертный редактор хронологического календаря Project Lenta.
Создай богатое, структурированное описание для календарной заметки на русском языке.

Информация о заметке:
- Название: "${title}"
- Категория/Тема: "${category}"
- Тип записи: "${noteType || 'Заметка'}"
- Дата: "${dateStr}"
${context ? `- Указания и пожелания от пользователя (парой строк): "${context}"` : ''}

${domainSpecificInstructions}

Требования к ответу:
Верни строго валидный JSON (без блоков \`\`\`json) следующей структуры:
{
  "description": "Богатый текст в формате Markdown с подзаголовками ###, списками, цитатами > и ключевыми фактами",
  "hashtags": ["тег1", "тег2", "тег3"],
  "suggestedTags": ["path.subpath"],
  "keyQuote": "Короткая главная цитата или слоган события"
}`;

    const modelsToTry = [
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash',
      'gemini-3.8-flash',
      'gemini-flash-latest',
    ];

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
        const payload = {
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.7,
          },
        };

        const res = await this.postJson(url, payload);

        if (res.ok) {
          const data = JSON.parse(res.text);
          const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidateText) {
            try {
              const parsed = JSON.parse(candidateText);
              return {
                description: parsed.description || '',
                hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
                suggestedTags: Array.isArray(parsed.suggestedTags) ? parsed.suggestedTags : [],
                keyQuote: parsed.keyQuote,
              };
            } catch {
              return {
                description: candidateText,
                hashtags: [],
              };
            }
          }
        } else {
          this.logger.debug(`Model ${model} returned HTTP ${res.status}: ${res.text.slice(0, 150)}`);
        }
      } catch (err: any) {
        this.logger.debug(`Model ${model} attempt failed: ${err.message}`);
      }
    }

    return null;
  }

  private async postJson(urlStr: string, bodyObj: any): Promise<{ ok: boolean; status: number; text: string }> {
    return new Promise((resolve, reject) => {
      const url = new URL(urlStr);
      const postData = JSON.stringify(bodyObj);

      const options: https.RequestOptions = {
        method: 'POST',
        agent: this.proxyAgent,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const req = https.request(url, options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          resolve({
            ok: (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300,
            status: res.statusCode || 0,
            text: data,
          });
        });
      });

      req.on('error', (err) => reject(err));
      req.setTimeout(25000, () => {
        req.destroy(new Error('Request to Gemini API timed out (25s)'));
      });

      req.write(postData);
      req.end();
    });
  }

  private generateFallbackContent(
    title: string,
    category: string,
    dateStr: string,
    context?: string,
    noteType?: string,
  ): GeneratedNoteEnrichment {
    const isCinema = noteType === 'FILM_RELEASE' || /кино|фильм|cinema|movie|film|премьер/i.test(category);
    const contextQuote = context?.trim() ? `> 💡 **Пожелания к заметке:** ${context.trim()}\n\n` : '';

    const description = isCinema
      ? `### ${title}\n\n🎬 **Релиз фильма / Премьера** (${dateStr})\n\n${contextQuote}#### Ключевая информация\n- **Категория:** ${category}\n- **Дата выхода:** ${dateStr}\n- **Статус:** Внесено в хронологический календарь релизов Project Lenta.`
      : `### ${title}\n\nСобытие в категории **${category}** (${dateStr}).\n\n${contextQuote}#### Основные тезисы\n- Важная хронологическая дата в календаре событий 2026 года.\n- Сохранено в базе знаний Project Lenta.`;

    const tagBase = [
      category.toLowerCase().replace(/[^a-zа-я0-9]/gi, ''),
      isCinema ? 'кино' : '',
    ].filter(Boolean);

    return {
      description,
      hashtags: Array.from(new Set(tagBase)),
    };
  }
}
