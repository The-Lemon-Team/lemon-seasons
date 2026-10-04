import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { NotesService } from '../notes/notes.service';
import { PoliticalEngineService } from '../ingestion/services/political-engine.service';
import { NoteType } from '@lenta/shared';
import {
  DailyNewsCard,
  PodcastScript,
  DailySummaryData,
  NewsTriageAgent,
  PodcastAgent,
  AgentChatEngine,
} from '@lemon/agents';
import { TransformNewsDto, GeneratePodcastDto, PublishPodcastDto, AgentChatDto } from './dto/curation.dto';

@Injectable()
export class CurationService {
  private readonly logger = new Logger(CurationService.name);
  private readonly geminiApiKey?: string;

  // In-memory registry of candidate daily news (seeded per date upon query)
  private dailyNewsStore = new Map<string, DailyNewsCard[]>();
  // Cached generated podcasts
  private podcastStore = new Map<string, PodcastScript>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly notesService: NotesService,
    private readonly configService: ConfigService,
    private readonly politicalEngineService: PoliticalEngineService,
  ) {
    this.geminiApiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (this.geminiApiKey) {
      this.logger.log('🎙️ Gemini AI Key detected for NotebookLM-style Podcast Studio.');
    }
  }


  /**
   * Retrieves candidate daily news cards for a date. Seeds default rich stories if none exist.
   */
  async getDailyNews(date: string): Promise<DailyNewsCard[]> {
    const targetDate = date || new Date().toISOString().split('T')[0];

    if (!this.dailyNewsStore.has(targetDate)) {
      const generated = this.seedDailyNewsForDate(targetDate);
      this.dailyNewsStore.set(targetDate, generated);
    }

    return this.dailyNewsStore.get(targetDate) || [];
  }

  /**
   * Transforms a selected news card into an official published Note in the database.
   */
  async transformNewsToNote(newsId: string, dto: TransformNewsDto) {
    let targetCard: DailyNewsCard | undefined;
    let targetDateKey: string | undefined;

    for (const [d, cards] of this.dailyNewsStore.entries()) {
      const found = cards.find((c) => c.id === newsId);
      if (found) {
        targetCard = found;
        targetDateKey = d;
        break;
      }
    }

    if (!targetCard) {
      throw new NotFoundException(`Новость с ID ${newsId} не найдена.`);
    }

    // Resolve feed: use provided feedId, or default to first active feed (e.g. news/my-notes)
    let feedId = dto.feedId;
    if (!feedId) {
      const defaultFeed = await this.prisma.feed.findFirst({
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
      });
      feedId = defaultFeed?.id;
    }

    const noteTitle = dto.title?.trim() || targetCard.title;
    const noteType = dto.type || targetCard.suggestedType || NoteType.SINGLE;
    const curator = dto.curator || targetCard.suggestedCurator;

    const markdownBody = dto.description?.trim() || `## ${targetCard.title}

> **Источник:** [${targetCard.source}](${targetCard.url || '#'})  
> **Оценка контура:** ${
  curator === 'political-group' || curator === 'Политическая коллегия'
    ? '🏛️ Политическая коллегия (Сводное резюме контуров)'
    : curator === 'ivan-bely' || curator === 'Иван Белый'
    ? '🇷🇺 Внутренний контур (Иван Белый)'
    : curator === 'kirk-kitten' || curator === 'Kirk Kitten'
    ? '🌐 Международный контур (Kirk Kitten)'
    : curator === 'chen-wei' || curator === 'Чэнь Вэй'
    ? '🇨🇳 Восточный контур: АТР & БРИКС (Чэнь Вэй)'
    : curator === 'okatsiya' || curator === 'Окация'
    ? '⚡ Контур IT & AI (Окация)'
    : curator === 'german-kernel' || curator === 'Герман' || curator === 'Герман «Кернел»'
    ? '📟 Контур Habr & IT-статей (Герман «Кернел»)'
    : 'Общий мониторинг'
}  

### Ключевые тезисы:
${targetCard.keyPoints.map((p) => `- ${p}`).join('\n')}

---
*Материал верифицирован и преобразован в карточку хроники через Lemon Admin Curation Studio.*
`;

    const hashtags = Array.from(
      new Set([...(targetCard.suggestedTags || []), ...(dto.hashtags || [])]),
    );

    const createdNote = await this.notesService.create({
      feedId,
      containerId: dto.containerId,
      title: noteTitle,
      description: markdownBody,
      type: noteType,
      startDate: `${targetCard.date}T12:00:00.000Z`,
      endDate: null,
      folder: dto.folder || 'News/Daily',
      sourceLink: targetCard.url,
      hashtags,
      curator,
    } as any);

    // Update status in store
    targetCard.status = 'ACCEPTED';
    targetCard.transformedNoteId = createdNote.id;

    this.logger.log(`✅ News ${targetCard.id} successfully transformed into Note ${createdNote.id}`);
    return {
      success: true,
      card: targetCard,
      note: createdNote,
    };
  }

  /**
   * Marks a candidate news item as dismissed
   */
  async dismissNews(newsId: string) {
    for (const [, cards] of this.dailyNewsStore.entries()) {
      const found = cards.find((c) => c.id === newsId);
      if (found) {
        found.status = 'DISMISSED';
        return { success: true, card: found };
      }
    }
    throw new NotFoundException(`Новость с ID ${newsId} не найдена.`);
  }

  /**
   * Generates a 2-host conversational podcast script (NotebookLM style) using Gemini AI.
   */
  async generatePodcast(dto: GeneratePodcastDto): Promise<PodcastScript> {
    const cards = await this.getDailyNews(dto.date);

    let candidates = cards;
    if (dto.newsIds && dto.newsIds.length > 0) {
      candidates = cards.filter((c) => dto.newsIds!.includes(c.id));
    }
    if (candidates.length === 0) {
      candidates = cards.filter((c) => c.status !== 'DISMISSED');
    }
    if (candidates.length === 0) {
      candidates = cards;
    }

    const script = await PodcastAgent.generate({
      date: dto.date,
      selectedNews: candidates,
      host1Name: dto.host1Name || 'Алексей',
      host2Name: dto.host2Name || 'Елена',
      geminiApiKey: this.geminiApiKey,
      tone: dto.tone || 'dynamic',
    });

    this.podcastStore.set(dto.date, script);
    return script;
  }

  /**
   * Publishes the podcast script as an official Note in the database for that date.
   */
  async publishPodcast(dto: PublishPodcastDto) {
    const { date, podcast, feedId, containerId } = dto;
    if (!podcast || !podcast.turns || podcast.turns.length === 0) {
      throw new BadRequestException('Некорректный объект подкаста для публикации.');
    }

    let resolvedFeedId = feedId;
    if (!resolvedFeedId) {
      const defaultFeed = await this.prisma.feed.findFirst({
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
      });
      resolvedFeedId = defaultFeed?.id;
    }

    const dialogueMarkdown = podcast.turns
      .map(
        (t: any) =>
          `**${t.speaker}**: ${t.text}\n`,
      )
      .join('\n');

    const podcastDescription = `# 🎙️ ${podcast.title}

> *${podcast.tagline}*  
> **Ведущие:** ${podcast.host1Name} & ${podcast.host2Name}  
> **Хронометраж:** ~${Math.ceil((podcast.estimatedDurationSec || 60) / 60)} мин.

---

### Стенограмма выпуска:

${dialogueMarkdown}

---
*Сгенерировано в Lemon Podcast Studio на базе Google Gemini и алгоритмов NotebookLM.*
`;

    const note = await this.notesService.create({
      feedId: resolvedFeedId,
      containerId,
      title: `🎙️ ${podcast.title}`,
      description: podcastDescription,
      type: NoteType.EVENT,
      startDate: `${date}T18:00:00.000Z`,
      endDate: null,
      folder: 'Podcasts',
      hashtags: ['подкаст', 'аудио-дайджест', 'notebooklm', 'новости-дня'],
      curator: 'ivan-bely',
    } as any);

    return {
      success: true,
      podcastId: podcast.id,
      noteId: note.id,
      note,
    };
  }

  /**
   * Processes a message directed to agents, handling snippets and contour queries.
   */
  async processAgentChat(dto: AgentChatDto) {
    const targetDate = dto.date || new Date().toISOString().split('T')[0];
    const candidateCards = await this.getDailyNews(targetDate);
    const politicalEvents = this.politicalEngineService.getPoliticalEvents2026();

    const replies = await AgentChatEngine.process({
      message: dto.message,
      targetAgent: dto.targetAgent,
      date: targetDate,
      contextCards: candidateCards,
      politicalEvents,
      history: dto.history,
      geminiApiKey: this.geminiApiKey,
    });

    return {
      date: targetDate,
      replies,
    };
  }

  /**
   * Retrieves clean summary data for the calendar consumer view
   */

  async getDailySummary(date: string): Promise<DailySummaryData> {
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Find notes for this day in DB
    const startOfDay = new Date(`${targetDate}T00:00:00.000Z`);
    const endOfDay = new Date(`${targetDate}T23:59:59.999Z`);

    const dayNotes = await this.prisma.note.findMany({
      where: {
        startDate: { gte: startOfDay, lte: endOfDay },
        deletedAt: null,
      },
      include: {
        hashtags: true,
      },
    });

    const newsCards = await this.getDailyNews(targetDate);
    const acceptedCount = newsCards.filter((c) => c.status === 'ACCEPTED').length;
    const pendingCount = newsCards.filter((c) => c.status === 'PENDING').length;

    // Collect tags/themes
    const themeSet = new Set<string>();
    dayNotes.forEach((n) => {
      n.hashtags.forEach((h) => themeSet.add(h.name));
    });
    newsCards.forEach((c) => {
      c.suggestedTags.forEach((t) => themeSet.add(t));
    });

    const cachedPodcast = this.podcastStore.get(targetDate) || null;

    return {
      date: targetDate,
      totalNewsCount: newsCards.length,
      acceptedNotesCount: Math.max(acceptedCount, dayNotes.length),
      pendingReviewCount: pendingCount,
      topThemes: Array.from(themeSet).slice(0, 6),
      headlineSynthesis:
        dayNotes.length > 0
          ? `Хроника дня содержит ${dayNotes.length} подтвержденных событий. Основной фокус: ${Array.from(themeSet).slice(0, 3).join(', ') || 'текущие новости'}.`
          : `В обработке находится ${newsCards.length} свежих новостных сюжетов дня.`,
      hasPodcast: Boolean(cachedPodcast),
      podcast: cachedPodcast,
    };
  }

  /**
   * Seeds realistic breaking news for a given date so admins immediately have rich cards to work with.
   */
  private seedDailyNewsForDate(date: string): DailyNewsCard[] {
    const rawItems = [
      {
        title: 'ФАС и Минэнерго РФ утвердили обновленный норматив продаж нефтепродуктов на бирже СПбМТСБ',
        source: 'Коммерсантъ / Энергетика',
        url: 'https://kommersant.ru/doc/energy-fas-spbimex',
        rawText: 'Федеральная антимонопольная служба совместно с Министерством энергетики РФ повысила минимальный объем биржевых продаж бензина и дизеля на 1.5%. Решение направлено на снижение волатильности цен на оптовом рынке РФ и поддержку независимых АЗС.',
      },
      {
        title: 'OFAC опубликовал новый регламент по мониторингу танкерного флота и страхованию морских грузов',
        source: 'Bloomberg / Markets',
        url: 'https://bloomberg.com/news/articles/ofac-tanker-regulations',
        rawText: 'Управление по контролю за иностранными активами США (OFAC) усиливает требования к предоставлению документации о страховых премиях танкеров в Балтийском и Черноморском бассейнах, что может скорректировать логистические расходы.',
      },
      {
        title: 'Банк России сохранил жесткую денежно-кредитную риторику в преддверии публикации резюме обсуждения ставки',
        source: 'Ведомости / Финансы',
        url: 'https://vedomosti.ru/finance/articles/cbr-key-rate-policy',
        rawText: 'Представители ЦБ РФ отметили сохранение повышенного потребительского спроса и подчеркнули готовность удерживать жесткие условия для достижения таргета по инфляции к концу следующего финансового года.',
      },
      {
        title: 'Еврокомиссия представила предварительный проект директивы по цифровым логистическим коридорам',
        source: 'Financial Times',
        url: 'https://ft.com/content/eu-logistics-corridors',
        rawText: 'Европейская комиссия инициировала согласование новых стандартов таможенного и электронного транзита для оптимизации трансграничных поставок оборудования и высокотехнологичных компонентов.',
      },
      {
        title: 'Минцифры РФ расширило реестр отечественного ПО для систем распределенных вычислений и ИИ',
        source: 'Интерфакс / Технологии',
        url: 'https://interfax.ru/digital/ai-registry-expand',
        rawText: 'Экспертный совет при Министерстве цифрового развития одобрил включение более 40 решений в сфере машинного обучения, графовых баз данных и систем хронологического анализа в единый реестр ПО.',
      },
      {
        title: 'Google анонсировала флагман Gemini 4 Argon с окном вывода в 1M токенов, Gemini 3.8 Flash и WeatherNext 3',
        source: 'Google DeepMind / AI Research',
        url: 'https://deepmind.google/news/gemini-4-argon-announcement',
        rawText: 'Google анонсировала флагманскую модель Gemini 4 Argon с беспрецедентным окном вывода в 1 миллион токенов для сложнейшего кодинга и кибербезопасности. Доступ ограничен закрытой исследовательской программой Fairwind для экспертов по защите сетей. Также вышли обновленная Gemini 3.8 Flash и климатическая система WeatherNext 3.',
      },
      {
        title: 'OpenAI представила шестое поколение GPT-6 (Astra, Sol, Luna) и отменила релиз GPT-6.1 Astra',
        source: 'OpenAI Blog / Safety Red Team',
        url: 'https://openai.com/index/gpt-6-generation-announcement',
        rawText: 'OpenAI представила шестое поколение моделей GPT-6 (Astra, Sol и Luna). Версия Sol предлагает возможности флагмана всего за пятую часть стоимости. При этом намеченный на октябрь релиз GPT-6.1 Astra был отменен из-за непрохождения внутренних тестов на безопасность.',
      },
      {
        title: 'Anthropic выпустила линейку Claude 5.5 (Opus 5.5 и Sonnet 5.5) с кибербезопасным роутингом запросов',
        source: 'Anthropic Newsroom',
        url: 'https://anthropic.com/news/claude-5-5-family',
        rawText: 'Anthropic выпустила линейку Claude 5.5 (Opus 5.5 и Sonnet 5.5). Обновленный Sonnet 5.5 получил специализированный алгоритм, который автоматически перенаправляет потенциально опасные запросы на профильную проверку кибербезопасности.',
      },
      {
        title: 'Эра автономных ИИ-агентов: OpenAI запустила Dots, Meta внедрила Muse, а xAI представила Grok 4.7',
        source: 'TechCrunch / Enterprise AI',
        url: 'https://techcrunch.com/2026/10/04/autonomous-ai-agents-era',
        rawText: 'Индустрия переходит от чат-ботов к постоянным агентам, выполняющим многошаговые процессы в фоне. OpenAI запустила постоянных агентов Dots с выделенными ресурсами, Meta внедрила персонального агента Muse на базе Muse Spark 1.3, а xAI Grok 4.7 превратилась в магазин ИИ-сотрудников.',
      },
      {
        title: 'Локальные вычисления: В октябре ожидаются ПК NVIDIA RTX Spark, а Apple готовит Siri AI в iOS 27.2',
        source: 'The Verge / Hardware & Systems',
        url: 'https://theverge.com/2026/10/04/nvidia-rtx-spark-apple-siri-ai-ios-27-2',
        rawText: 'В октябре ожидается массовый выход ПК линейки RTX Spark от NVIDIA, которые переносят тяжелые вычисления ИИ-агентов из облака на локальное «железо» для приватности и скорости. Apple готовит расширение возможностей Siri AI на новые языки в грядущем обновлении iOS 27.2.',
      },
      {
        title: 'Регулирование и скепсис инвесторов: Расследование FTC США, AUTOWARCOM Пентагона и $88 млрд ИИ-долга',
        source: 'Wall Street Journal / Markets & Tech',
        url: 'https://wsj.com/tech/ai/ftc-probe-autowarcom-pentagon-ai-debt',
        rawText: 'FTC открыла расследование в отношении OpenAI и Anthropic из-за опасений по поводу «вышедших из-под контроля» ИИ-агентов. Пентагон учредил AUTOWARCOM для интеграции боевого ИИ, дронов и робототехники. На Уолл-стрит нарастает скепсис: инвесторов тревожит $88 млрд накопленного корпорациями ИИ-долга.',
      },
    ];

    return rawItems.map((item, index) =>
      NewsTriageAgent.triage({
        id: `news-${date}-${index + 1}`,
        date,
        title: item.title,
        source: item.source,
        url: item.url,
        rawText: item.rawText,
      }),
    );
  }
}
