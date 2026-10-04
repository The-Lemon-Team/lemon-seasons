import { DailyNewsCard, PodcastScript, PodcastDialogueTurn } from './types';

export interface GeneratePodcastOptions {
  date: string;
  selectedNews: DailyNewsCard[];
  host1Name?: string;
  host2Name?: string;
  geminiApiKey?: string;
  tone?: 'dynamic' | 'analytical' | 'fast';
}

export class PodcastAgent {
  /**
   * Generates a 2-host NotebookLM style conversational podcast script.
   * If geminiApiKey is provided, uses Gemini models; otherwise uses deterministic local generator.
   */
  static async generate(options: GeneratePodcastOptions): Promise<PodcastScript> {
    const {
      date,
      selectedNews,
      host1Name = 'Алексей',
      host2Name = 'Елена',
      geminiApiKey,
    } = options;

    if (!selectedNews || selectedNews.length === 0) {
      throw new Error('Для генерации подкаста требуется хотя бы одна новость.');
    }

    // Try Gemini if API key is available
    if (geminiApiKey) {
      try {
        const script = await this.generateWithGemini(options);
        if (script && script.turns && script.turns.length > 0) {
          return script;
        }
      } catch (err: any) {
        console.warn('Gemini podcast generation fallback to local engine:', err.message);
      }
    }

    // Local deterministic high-quality conversational engine
    return this.generateDeterministicScript(options);
  }

  private static async generateWithGemini(options: GeneratePodcastOptions): Promise<PodcastScript | null> {
    const { date, selectedNews, host1Name = 'Алексей', host2Name = 'Елена', geminiApiKey } = options;

    const newsContext = selectedNews
      .map((n, i) => `${i + 1}. [${n.suggestedCurator === 'ivan-bely' ? 'РФ' : 'Мир'}] ${n.title} (Источник: ${n.source}). Тезисы: ${n.keyPoints.join('; ')}`)
      .join('\n');

    const prompt = `Ты — ведущий режиссер и сценарист в стиле NotebookLM Audio Overview (Google NotebookLM Deep Dive Podcast).
Твоя задача — превратить подборку главных новостей дня (${date}) в живой, увлекательный подкаст двух ведущих:
Ведущий 1: "${host1Name}" (аналитик, глубоко разбирается в законах, макроэкономике и деталях).
Ведущий 2: "${host2Name}" (живой, любознательный собеседник, задает острые вопросы, переводит на понятный язык, ищет практический смысл).

МАТЕРИАЛЫ ДНЯ:
${newsContext}

ПРАВИЛА ПОДКАСТА NOTEBOOKLM:
1. Живой диалог: реплики должны звучать естественно, как разговор двух умных друзей за чашкой кофе.
2. Никаких формальных дикторских клише. Используйте естественные перебивки, уточнения ("Погоди, Алексей...", "Именно!", "А что это значит для нас?").
3. Связывайте новости между собой: если одна новость про санкции, а другая про бензин в РФ — покажите их скрытую связь!
4. Хронометраж: 8-14 реплик (попеременно Ведущий 1 и Ведущий 2).
5. Итог: четкое, оптимистичное резюме дня.

ВЕРНИ СТРОГО JSON ОБЪЕКТ следующего формата:
{
  "title": "Главные сюжеты дня: краткий и броский заголовок подкаста",
  "tagline": "Короткий тизер для карточки подкаста",
  "turns": [
    { "speaker": "${host1Name}", "role": "host1", "text": "Всем привет! Это наш ежедневный обзор за ${date}. Сегодня у нас сразу несколько громких событий..." },
    { "speaker": "${host2Name}", "role": "host2", "text": "Да, привет! И начать определенно стоит с..." }
  ]
}`;

    const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.7,
            },
          }),
        });

        if (!response.ok) continue;

        const data = await response.json();
        const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawContent) continue;

        const parsed = JSON.parse(rawContent);
        if (parsed && Array.isArray(parsed.turns)) {
          const totalWords = parsed.turns.reduce((acc: number, t: any) => acc + (t.text ? t.text.split(/\s+/).length : 0), 0);
          return {
            id: `podcast-${date}-${Date.now()}`,
            date,
            title: parsed.title || `Аудио-дайджест за ${date}`,
            tagline: parsed.tagline || `Двусторонний аналитический разбор новостей дня с ${host1Name} и ${host2Name}`,
            host1Name,
            host2Name,
            turns: parsed.turns.map((t: any) => ({
              speaker: t.speaker || host1Name,
              role: t.role || (t.speaker === host2Name ? 'host2' : 'host1'),
              text: t.text,
            })),
            estimatedDurationSec: Math.max(45, Math.round((totalWords / 130) * 60)),
            sourceNewsIds: selectedNews.map((n) => n.id),
            createdAt: new Date().toISOString(),
          };
        }
      } catch (err) {
        // try next model
      }
    }

    return null;
  }

  private static generateDeterministicScript(options: GeneratePodcastOptions): PodcastScript {
    const { date, selectedNews, host1Name = 'Алексей', host2Name = 'Елена' } = options;

    const firstNews = selectedNews[0];
    const secondNews = selectedNews.length > 1 ? selectedNews[1] : null;
    const thirdNews = selectedNews.length > 2 ? selectedNews[2] : null;

    const turns: PodcastDialogueTurn[] = [];

    // Intro
    turns.push({
      speaker: host1Name,
      role: 'host1',
      text: `Привет всем! В эфире хронологический аудио-дайджест за ${date}. Сегодня мы разбираем главные сюжеты дня, которые попали в наш календарь.`,
    });

    turns.push({
      speaker: host2Name,
      role: 'host2',
      text: `Привет, ${host1Name}! Да, день выдался насыщенным. Давай сразу начнем с главной темы: «${firstNews.title}». Насколько это меняет общую картину?`,
    });

    // Story 1 Breakdown
    turns.push({
      speaker: host1Name,
      role: 'host1',
      text: `Смотри, источник здесь — ${firstNews.source}. Ключевой момент в том, что ${firstNews.keyPoints[1] || firstNews.summary}. Это прямой сигнал для рынка.`,
    });

    turns.push({
      speaker: host2Name,
      role: 'host2',
      text: `То есть внешнее давление и внутренние регуляторные механизмы сейчас работают параллельно. А что происходит со следующим важным узлом?`,
    });

    // Story 2 Breakdown if present
    if (secondNews) {
      turns.push({
        speaker: host1Name,
        role: 'host1',
        text: `А вот здесь самое интересное пересечение. Обрати внимание на «${secondNews.title}». Если сопоставить это с первым событием, становится понятно: логистические и финансовые цепочки адаптируются быстрее, чем ожидалось.`,
      });

      turns.push({
        speaker: host2Name,
        role: 'host2',
        text: `Именно! Мы как раз видим это по кураторской разметке. Факты проверены, и эта заметка уже сохранена в календаре как опорная точка.`,
      });
    }

    // Story 3 or Deep Synthesis
    if (thirdNews) {
      turns.push({
        speaker: host1Name,
        role: 'host1',
        text: `И третий штрих к сегодняшнему дню — «${thirdNews.title}». Источник ${thirdNews.source} подтверждает стабилизацию тренда.`,
      });
    }

    // Outro
    turns.push({
      speaker: host2Name,
      role: 'host2',
      text: `Отличная работа по фиксации фактов. Все эти карточки уже проверены и доступны в нашей хронике календаря!`,
    });

    turns.push({
      speaker: host1Name,
      role: 'host1',
      text: `Спасибо за внимание, берегите свое инфополе и оставайтесь с Lemon Seasons! До встречи в завтрашнем выпуске!`,
    });

    const totalWords = turns.reduce((acc, t) => acc + t.text.split(/\s+/).length, 0);

    return {
      id: `podcast-${date}-${Date.now()}`,
      date,
      title: `Аудио-обзор дня: ${firstNews.title.substring(0, 50)}...`,
      tagline: `Интеллектуальный диалог кураторов ${host1Name} и ${host2Name} по ключевым новостям за ${date}`,
      host1Name,
      host2Name,
      turns,
      estimatedDurationSec: Math.max(45, Math.round((totalWords / 130) * 60)),
      sourceNewsIds: selectedNews.map((n) => n.id),
      createdAt: new Date().toISOString(),
    };
  }
}
