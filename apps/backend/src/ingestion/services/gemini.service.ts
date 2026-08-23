import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
  private readonly modelName: string = 'gemini-2.5-flash';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY');
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
    category: string,
    dateStr: string,
    context?: string,
  ): Promise<GeneratedNoteEnrichment> {
    if (this.apiKey) {
      try {
        const result = await this.callGeminiApi(title, category, dateStr, context);
        if (result) {
          return result;
        }
      } catch (error: any) {
        this.logger.error(`Gemini API call failed for "${title}": ${error?.message}. Using canonical fallback.`);
      }
    }

    return this.generateFallbackContent(title, category, dateStr, context);
  }

  private async callGeminiApi(
    title: string,
    category: string,
    dateStr: string,
    context?: string,
  ): Promise<GeneratedNoteEnrichment | null> {
    const prompt = `Ты — экспертный редактор хронологического календаря Project Lenta.
Создай богатое, структурированное описание для календарной заметки на русском языке.

Информация о событии:
- Название: "${title}"
- Категория/Тема: "${category}"
- Дата: "${dateStr}"
${context ? `- Дополнительный контекст: "${context}"` : ''}

Требования к ответу:
Верни строго валидный JSON (без блоков \`\`\`json) следующей структуры:
{
  "description": "Богатый текст в формате Markdown с подзаголовками ###, списками, цитатами > и ключевыми фактами",
  "hashtags": ["тег1", "тег2", "тег3"],
  "suggestedTags": ["path.subpath"],
  "keyQuote": "Короткая главная цитата или слоган события"
}`;

    const modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.0-flash-exp'];

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.7,
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
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
        }
      } catch (err: any) {
        this.logger.debug(`Model ${model} attempt failed: ${err.message}`);
      }
    }

    return null;
  }

  private generateFallbackContent(
    title: string,
    category: string,
    dateStr: string,
    context?: string,
  ): GeneratedNoteEnrichment {
    return {
      description: context || `### ${title}\n\nСобытие в категории **${category}** (${dateStr}).\n\n- Важная хронологическая дата в календаре событий 2026 года.\n- Сохранено в базе знаний Project Lenta.`,
      hashtags: [category.toLowerCase().replace(/[^a-zа-я0-9]/gi, '')],
    };
  }
}
