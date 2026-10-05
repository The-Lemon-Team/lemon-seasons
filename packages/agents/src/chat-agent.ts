import {
  NoteType,
  resolveItSectorFromText,
  SurveyTimeframe,
  TelegramNewsPreview,
  getCuratorPersona,
  CuratorId,
} from '@lenta/shared';
import {
  AgentId,
  ChatMessage,
  DailyNewsCard,
  DEFAULT_CHAT_SNIPPETS,
  CuratorSummarySection,
  GroupSummaryPayload,
} from './types';
import { CuratorSurveyAgent } from './curator-survey-agent';
import { SideWorkAgent } from './side-work-agent';
import { NewsHarvesterAgent } from './harvester-agent';

export interface ProcessChatOptions {
  message: string;
  targetAgent?: AgentId | 'all';
  date: string;
  contextCards: DailyNewsCard[];
  politicalEvents: any[];
  history?: ChatMessage[];
  geminiApiKey?: string;
}

export function isTelegramPostRequested(prompt: string): boolean {
  const lower = (prompt || '').toLowerCase();
  return (
    lower.startsWith('/post') ||
    lower.startsWith('/tg') ||
    lower.startsWith('/telegram') ||
    lower.includes('telegram post') ||
    lower.includes('тг пост') ||
    lower.includes('telegram-пост') ||
    lower.includes('формате telegram') ||
    lower.includes('виде telegram') ||
    lower.includes('режиме telegram') ||
    lower.includes('формат telegram') ||
    lower.includes('в телеграм') ||
    lower.includes('для телеграм')
  );
}

export function formatTelegramPostContent(opts: {
  contourTitle: string;
  curatorEmoji: string;
  curatorName: string;
  date: string;
  period: 'today' | 'week' | 'month';
  bullets: string[];
  takeaway: string;
  hashtags: string[];
}): string {
  const periodLabel =
    opts.period === 'week'
      ? 'НЕДЕЛЬНЫЙ ДАЙДЖЕСТ'
      : opts.period === 'month'
      ? 'МЕСЯЧНАЯ ПАНОРАМА'
      : 'СВОДКА ДНЯ';
  const cleanBullets = opts.bullets.map((b) =>
    b.replace(/\*\*/g, '').replace(/\[⚡[^\]]+\]/g, '').trim(),
  );
  return `⚡ **${periodLabel}: ${opts.contourTitle} (${opts.date})**
*Куратор: ${opts.curatorEmoji} ${opts.curatorName}*

📌 **Главные сигналы и события:**
${cleanBullets.map((b) => `• ${b}`).join('\n')}

💡 *Резюме обозревателя:* ${opts.takeaway}

${opts.hashtags.map((h) => `#${h.replace(/^#/, '')}`).join(' ')}`;
}

export class AgentChatEngine {
  /**
   * Main entrypoint to process a chat message and generate agent replies
   */
  static async process(options: ProcessChatOptions): Promise<ChatMessage[]> {
    const { message, date, contextCards, politicalEvents, geminiApiKey } = options;
    const rawTrimmed = message.trim();

    // 1. Resolve alias / snippet command
    let resolvedTarget: AgentId | 'all' = options.targetAgent || 'all';
    let cleanPrompt = rawTrimmed;

    if (rawTrimmed.startsWith('/')) {
      const parts = rawTrimmed.split(' ');
      const command = parts[0].toLowerCase();
      const snippet = DEFAULT_CHAT_SNIPPETS.find((s) => s.command === command);
      if (snippet) {
        resolvedTarget = snippet.targetAgent;
        cleanPrompt = parts.slice(1).join(' ').trim() || snippet.prompt;
      } else if (
        command === '/post' ||
        command === '/post-today' ||
        command === '/post-week' ||
        command === '/tg' ||
        command === '/tg-today' ||
        command === '/tg-week' ||
        command === '/telegram'
      ) {
        const subArg = parts.slice(1).join(' ').trim().toLowerCase();
        let tf = 'today';
        if (
          command === '/post-week' ||
          command === '/tg-week' ||
          subArg.startsWith('week') ||
          subArg.includes('недел')
        ) {
          tf = 'week';
        }
        const extraPrompt = parts.slice(1).filter((p) => p.toLowerCase() !== 'today' && p.toLowerCase() !== 'week').join(' ').trim();
        cleanPrompt = `/post ${tf}${extraPrompt ? ' ' + extraPrompt : ''}`;
      } else if (
        command === '/politics' ||
        command === '/politics-today' ||
        command === '/politics-week' ||
        command === '/politics-month' ||
        command === '/group' ||
        command === '/board'
      ) {
        resolvedTarget = 'political-group';
        const subArg = parts.slice(1).join(' ').trim().toLowerCase();
        let tf = '';
        if (command === '/politics-today' || subArg === 'today' || subArg.includes('сегодня') || subArg.includes('день')) {
          tf = 'today';
        } else if (command === '/politics-week' || subArg === 'week' || subArg.includes('недел') || subArg.includes('7 дней')) {
          tf = 'week';
        } else if (command === '/politics-month' || subArg === 'month' || subArg.includes('месяц') || subArg.includes('30 дней')) {
          tf = 'month';
        }
        cleanPrompt = parts.slice(1).join(' ').trim() || (tf ? `/politics ${tf}` : 'today');
      } else if (command === '/chen' || command === '/asia' || command === '/brics') {
        resolvedTarget = 'chen-wei';
        cleanPrompt = parts.slice(1).join(' ').trim() || 'Новости и сигналы по АТР, Китаю и БРИКС на сегодня';
      } else if (
        command === '/alex' ||
        command === '/breaking' ||
        command === '/breaking-news' ||
        command === '/breaking-today' ||
        command === '/breaking-week' ||
        command === '/breaking-month' ||
        command === '/hot' ||
        command === '/pulse'
      ) {
        resolvedTarget = 'alex-vector';
        const subArg = parts.slice(1).join(' ').trim().toLowerCase();
        let tf = '';
        if (command === '/breaking-today' || subArg === 'today' || subArg.includes('сегодня') || subArg.includes('день')) {
          tf = 'today';
        } else if (command === '/breaking-week' || subArg === 'week' || subArg.includes('недел') || subArg.includes('7 дней')) {
          tf = 'week';
        } else if (command === '/breaking-month' || subArg === 'month' || subArg.includes('месяц') || subArg.includes('30 дней')) {
          tf = 'month';
        }
        cleanPrompt =
          parts.slice(1).join(' ').trim() ||
          (tf === 'week'
            ? 'Недельная хроника экстренных мировых новостей и ключевых событий'
            : tf === 'month'
            ? 'Месячная панорама ключевых мировых происшествий и резонансных тем'
            : 'Горячие мировые новости и оперативные молнии на сегодня');
      } else if (
        command === '/tech' ||
        command === '/tech-group' ||
        command === '/it-group' ||
        command === '/it-board'
      ) {
        resolvedTarget = 'tech-group';
        const subArg = parts.slice(1).join(' ').trim().toLowerCase();
        let tf = '';
        if (subArg === 'today' || subArg.includes('сегодня') || subArg.includes('день')) {
          tf = 'today';
        } else if (subArg === 'week' || subArg.includes('недел') || subArg.includes('7 дней')) {
          tf = 'week';
        } else if (subArg === 'month' || subArg.includes('месяц') || subArg.includes('30 дней')) {
          tf = 'month';
        }
        cleanPrompt = parts.slice(1).join(' ').trim() || (tf ? `/tech ${tf}` : 'today');
      } else if (command === '/marcus' || command === '/nexus' || command === '/domino' || command === '/branch') {
        resolvedTarget = 'marcus-vane';
        cleanPrompt = parts.slice(1).join(' ').trim() || 'Анализ эффекта домино, вакуума силы и смежных веток событий';
      } else if (command === '/tariq' || command === '/mena' || command === '/mideast' || command === '/gulf') {
        resolvedTarget = 'tariq-said';
        cleanPrompt = parts.slice(1).join(' ').trim() || 'Сводка по Ближнему Востоку, зоне Залива и безопасности региона';
      } else if (command === '/helena' || command === '/energy' || command === '/choke' || command === '/logistics' || command === '/oil') {
        resolvedTarget = 'helena-brandt';
        cleanPrompt = parts.slice(1).join(' ').trim() || 'Анализ сырьевых рынков, нефти Brent и проходимости морских проливов';
      } else if (
        command === '/okatsiya' ||
        command === '/akatsiya' ||
        command === '/hitech' ||
        command === '/devices' ||
        command === '/it' ||
        command === '/it-today' ||
        command === '/it-week' ||
        command === '/it-month' ||
        command === '/ai' ||
        command === '/models' ||
        command === '/agents' ||
        command === '/devops' ||
        command === '/backend' ||
        command === '/bigtech' ||
        command === '/frontend' ||
        command === '/mobile' ||
        command === '/infosec' ||
        command === '/cloud' ||
        command === '/hardware' ||
        command === '/gamedev' ||
        command === '/qa'
      ) {
        resolvedTarget = 'okatsiya';
        const subSector = command.replace('/', '');
        const subArg = parts.slice(1).join(' ').trim().toLowerCase();
        let tf = '';
        if (command === '/it-today' || subArg === 'today' || subArg.includes('сегодня') || subArg.includes('день')) {
          tf = 'today';
        } else if (command === '/it-week' || subArg === 'week' || subArg.includes('недел') || subArg.includes('7 дней')) {
          tf = 'week';
        } else if (command === '/it-month' || subArg === 'month' || subArg.includes('месяц') || subArg.includes('30 дней')) {
          tf = 'month';
        }
        cleanPrompt =
          parts.slice(1).join(' ').trim() ||
          (tf === 'week'
            ? 'Недельный дайджест Hi-Tech & IT: новые девайсы, анонсы, BigTech'
            : tf === 'month'
            ? 'Месячная панорама Hi-Tech & IT: ключевые релизы, девайсы и BigTech'
            : subSector !== 'it' && subSector !== 'okatsiya' && subSector !== 'akatsiya'
            ? `Новости по направлению ${subSector}`
            : 'Ключевые новости Hi-Tech, IT & AI индустрии, новые девайсы и анонсы на сегодня');
      } else if (
        command === '/simon' ||
        command === '/саймон' ||
        command === '/habr' ||
        command === '/german' ||
        command === '/xakep'
      ) {
        resolvedTarget = 'simon-habr';
        cleanPrompt =
          parts.slice(1).join(' ').trim() ||
          (command === '/xakep'
            ? 'Разбор материалов журнала «Хакер» (xakep.ru) и подготовка тематической Super Note'
            : command === '/habr'
            ? 'Аналитический разбор публикаций с Habr и инженерных статей от Саймона'
            : 'Разбор публикаций с Хабра (Habr) и инженерных статей от Саймона');
      } else if (
        command === '/presijo' ||
        command === '/пресижо' ||
        command === '/tools' ||
        command === '/libs' ||
        command === '/libraries' ||
        command === '/tg-content'
      ) {
        resolvedTarget = 'presijo-ai';
        cleanPrompt = parts.slice(1).join(' ').trim() || 'Обзор свежих AI-инструментов, релизов библиотек и трендов в Telegram-каналах от Presijo';
      } else if (
        command === '/survey' ||
        command === '/survey-today' ||
        command === '/survey-yesterday' ||
        command === '/survey-week' ||
        command === '/survey-breaking' ||
        command === '/survey-nexus' ||
        command === '/survey-mena'
      ) {
        resolvedTarget = 'survey-coordinator';
        cleanPrompt =
          parts.slice(1).join(' ').trim() ||
          (command === '/survey-breaking'
            ? 'Проведи опрос группы быстрого реагирования по экстренной повестке'
            : command === '/survey-nexus'
            ? 'Проведи опрос коллегии каскадных рисков по эффекту домино и точкам ветвления'
            : command === '/survey-mena'
            ? 'Проведи опрос консилиума Ближнего Востока и зоны Залива'
            : 'Проведи опрос кураторов по повестке дня');
      } else if (
        command === '/sidework' ||
        command === '/sidework-post' ||
        command === '/media' ||
        command === '/comment' ||
        command === '/draft'
      ) {
        resolvedTarget = 'sidework-producer';
        cleanPrompt = parts.slice(1).join(' ').trim() || 'Создай публикацию и подготовь медиа-обогащение на основе курированных данных';
      } else if (
        command === '/notebook' ||
        command === '/notebook-create' ||
        command === '/notebook-eta'
      ) {
        resolvedTarget = 'notebook-producer';
        cleanPrompt = parts.slice(1).join(' ').trim() || 'Фоновая генерация дневника и подкаста NotebookLM с расчетом времени готовности';
      } else if (command === '/harvest' || command === '/sources') {
        resolvedTarget = 'harvester-agent';
        cleanPrompt = parts.slice(1).join(' ').trim() || 'Собери свежие данные и проверь входящие источники';
      }
    }

    // Keyword detection if target wasn't explicitly forced
    if (resolvedTarget === 'all' && !rawTrimmed.startsWith('/')) {
      const lower = rawTrimmed.toLowerCase();
      if (
        lower.includes('политическая группа') ||
        lower.includes('политическая коллегия') ||
        lower.includes('коллегия кураторов') ||
        lower.includes('коллеги') ||
        lower.includes('новости на сегодня') ||
        lower.includes('сводка на сегодня') ||
        lower.includes('панорама дня') ||
        lower.includes('сводка дня') ||
        (lower.includes('групп') && (lower.includes('новост') || lower.includes('повестк') || lower.includes('резюме')))
      ) {
        resolvedTarget = 'political-group';
      } else if (
        lower.includes('it группа') ||
        lower.includes('it коллегия') ||
        lower.includes('it совет') ||
        lower.includes('технологическая группа') ||
        lower.includes('технологический совет') ||
        lower.includes('группа it') ||
        lower.includes('совет it')
      ) {
        resolvedTarget = 'tech-group';
      } else if (
        lower.includes('саймон') ||
        lower.includes('simon')
      ) {
        resolvedTarget = 'simon-habr';
      } else if (
        lower.includes('presijo') ||
        lower.includes('пресижо') ||
        lower.includes('ai инструмент') ||
        lower.includes('новые тулз') ||
        lower.includes('релизы библиотек') ||
        lower.includes('библиотеки ai') ||
        lower.includes('контент мейкер') ||
        lower.includes('контент-мейкер')
      ) {
        resolvedTarget = 'presijo-ai';
      } else if (
        lower.includes('окация') ||
        lower.includes('акация') ||
        lower.includes('okatsiya') ||
        lower.includes('девайс') ||
        lower.includes('девайсы') ||
        lower.includes('гаджет') ||
        lower.includes('новые девайсы') ||
        lower.includes('громкие анонсы') ||
        lower.includes('hi-tech') ||
        lower.includes('hitech') ||
        lower.includes('новости it') ||
        lower.includes('новости ai') ||
        lower.includes('новости ит') ||
        lower.includes('devops') ||
        lower.includes('девопс') ||
        lower.includes('бигтех') ||
        lower.includes('bigtech') ||
        lower.includes('бэкенд') ||
        lower.includes('backend') ||
        lower.includes('нейросеть') ||
        lower.includes('нейросети') ||
        lower.includes('llm') ||
        lower.includes('ии ') ||
        lower.includes(' ai ') ||
        lower.includes('инфосек') ||
        lower.includes('кибербезопасн')
      ) {
        resolvedTarget = 'okatsiya';
      } else if (
        lower.includes('герман') ||
        lower.includes('german') ||
        lower.includes('хабр') ||
        lower.includes('habr') ||
        lower.includes('xakep') ||
        lower.includes('хакер')
      ) {
        resolvedTarget = 'simon-habr';
      } else if (
        lower.includes('notebooklm') ||
        lower.includes('создай дневник') ||
        lower.includes('сделай дневник')
      ) {
        resolvedTarget = 'notebook-producer';
      } else if (lower.includes('чэнь') || lower.includes('китай') || lower.includes('атр') || lower.includes('брикс') || lower.includes('юань')) {
        resolvedTarget = 'chen-wei';
      } else if (
        lower.includes('алекс') ||
        lower.includes('alex') ||
        lower.includes('breaking') ||
        lower.includes('горячие новости') ||
        lower.includes('пульс') ||
        lower.includes('молния') ||
        lower.includes('политическая повестка') ||
        lower.includes('свежие новости') ||
        lower.includes('свежие политические новости')
      ) {
        resolvedTarget = 'alex-vector';
      } else if (lower.includes('маркус') || lower.includes('marcus') || lower.includes('домино') || lower.includes('ветвление') || lower.includes('nexus') || lower.includes('каскад')) {
        resolvedTarget = 'marcus-vane';
      } else if (
        lower.includes('тарик') ||
        lower.includes('tariq') ||
        lower.includes('ближний восток') ||
        lower.includes('контур ближнего востока') ||
        lower.includes('контуру ближнему востоку') ||
        lower.includes('mena') ||
        lower.includes('залив') ||
        lower.includes('ирак') ||
        lower.includes('левант')
      ) {
        resolvedTarget = 'tariq-said';
      } else if (lower.includes('хелена') || lower.includes('helena') || lower.includes('нефть') || lower.includes('сырье') || lower.includes('пролив') || lower.includes('ормуз') || lower.includes('суэц') || lower.includes('фрахт')) {
        resolvedTarget = 'helena-brandt';
      } else if (
        lower.includes('иван') ||
        lower.includes('контур рф') ||
        lower.includes('контуру рф') ||
        lower.includes('рф') ||
        lower.includes('госдум') ||
        lower.includes('бюджет')
      ) {
        resolvedTarget = 'ivan-bely';
      } else if (
        lower.includes('kirk') ||
        lower.includes('кирк') ||
        lower.includes('контур сша') ||
        lower.includes('контуру сша') ||
        lower.includes('сша') ||
        lower.includes('оон') ||
        lower.includes('ofac') ||
        lower.includes('санкци')
      ) {
        resolvedTarget = 'kirk-kitten';
      } else if (
        lower.includes('опроси') ||
        lower.includes('опрос кураторов') ||
        lower.includes('опросить группу') ||
        lower.includes('опрос за вчера') ||
        lower.includes('опрос за неделю') ||
        lower.includes('срез за вчера') ||
        lower.includes('срез за неделю')
      ) {
        resolvedTarget = 'survey-coordinator';
      } else if (
        lower.includes('сайд') ||
        lower.includes('сайд-работа') ||
        lower.includes('сайдработа') ||
        lower.includes('создай пост') ||
        lower.includes('подготовь пост') ||
        lower.includes('промпт для картин') ||
        lower.includes('промпты для ai') ||
        lower.includes('добавь медиа')
      ) {
        resolvedTarget = 'sidework-producer';
      } else if (
        lower.includes('харвестер') ||
        lower.includes('сбор данных') ||
        lower.includes('собери новости') ||
        lower.includes('проверь источники')
      ) {
        resolvedTarget = 'harvester-agent';
      }
    }

    const replies: ChatMessage[] = [];
    const timestamp = new Date().toISOString();

    // Filter relevant stories from context for today
    const ivanStories = contextCards.filter(
      (c) => c.suggestedCurator === 'ivan-bely' || c.category.includes('Внутренняя') || c.category.includes('РФ'),
    );
    const kirkStories = contextCards.filter(
      (c) => c.suggestedCurator === 'kirk-kitten' || c.category.includes('Международный') || c.summary.toLowerCase().includes('сша'),
    );
    const tariqStories = contextCards.filter(
      (c) =>
        c.suggestedCurator === 'tariq-said' ||
        c.summary.toLowerCase().includes('ирак') ||
        c.summary.toLowerCase().includes('залив') ||
        c.summary.toLowerCase().includes('иран') ||
        c.summary.toLowerCase().includes('mena') ||
        c.summary.toLowerCase().includes('восток'),
    );
    const alexStories = contextCards.filter(
      (c) =>
        c.suggestedCurator === 'alex-vector' ||
        c.isBreaking ||
        c.category.includes('Breaking') ||
        c.category.includes('Пульс') ||
        c.category.includes('Политика'),
    );
    const chenStories = contextCards.filter(
      (c) => c.suggestedCurator === 'chen-wei' || c.category.includes('Азия') || c.category.includes('Китай') || c.category.includes('БРИКС'),
    );
    const okatsiyaStories = contextCards.filter(
      (c) =>
        c.suggestedCurator === 'okatsiya' ||
        c.category.includes('IT') ||
        c.category.includes('Девайс') ||
        c.summary.toLowerCase().includes('девайс') ||
        c.summary.toLowerCase().includes('анонс'),
    );
    const simonStories = contextCards.filter(
      (c) =>
        c.suggestedCurator === 'simon-habr' ||
        c.suggestedCurator === 'german-kernel' ||
        c.source?.toLowerCase().includes('habr') ||
        c.source?.toLowerCase().includes('хабр') ||
        c.source?.toLowerCase().includes('xakep') ||
        c.category.includes('Инженерия'),
    );
    const presijoStories = contextCards.filter(
      (c) =>
        c.suggestedCurator === 'presijo-ai' ||
        c.summary.toLowerCase().includes('инструмент') ||
        c.summary.toLowerCase().includes('библиотек') ||
        c.summary.toLowerCase().includes('telegram') ||
        c.summary.toLowerCase().includes('фич') ||
        c.category.includes('Инструменты'),
    );

    // Relevant political events
    const todayEvents = politicalEvents.filter((e) => {
      const s = (e.startDate || '').split('T')[0];
      const end = (e.endDate || '').split('T')[0];
      if (s === date) return true;
      if (end && date >= s && date <= end) return true;
      return false;
    });

    if (geminiApiKey) {
      try {
        const geminiReplies = await this.generateViaGemini({
          prompt: cleanPrompt,
          resolvedTarget,
          date,
          contextCards,
          politicalEvents: todayEvents,
          apiKey: geminiApiKey,
        });
        if (geminiReplies && geminiReplies.length > 0) {
          return geminiReplies;
        }
      } catch (err) {
        // Fallback to deterministic engine
      }
    }

    // 2. Deterministic Persona & Worker Agent Responses
    // 0. Worker Agents
    // A. Curator Survey Coordinator: Surveys selected groups/curators for today/yesterday/week
    if (resolvedTarget === 'survey-coordinator') {
      const surveyMessage = await this.handleSurveyCoordinator({
        prompt: cleanPrompt,
        date,
        contextCards,
        politicalEvents: todayEvents,
        geminiApiKey,
        timestamp,
      });
      replies.push(surveyMessage);
      return replies;
    }

    // B. Side-Work & Content Producer: Generates content, media prompts, Mermaid diagrams, commentaries
    if (resolvedTarget === 'sidework-producer') {
      const sideWorkMessage = await this.handleSideWorkProducer({
        prompt: cleanPrompt,
        date,
        contextCards,
        timestamp,
        geminiApiKey,
      });
      replies.push(sideWorkMessage);
      return replies;
    }

    // C. News Harvester: Gathers and normalizes raw stream feeds
    if (resolvedTarget === 'harvester-agent') {
      const harvestMessage = this.handleHarvester({
        prompt: cleanPrompt,
        contextCards,
        timestamp,
      });
      replies.push(harvestMessage);
      return replies;
    }

    // A. Political Group: Consolidated Modular Summary (РФ, США, Ближний Восток, Свежие новости)
    if (resolvedTarget === 'political-group') {
      replies.push(
        this.generatePoliticalGroupSummary({
          prompt: cleanPrompt,
          date,
          ivanStories: ivanStories.length > 0 ? ivanStories : contextCards.slice(0, 2),
          kirkStories: kirkStories.length > 0 ? kirkStories : contextCards.slice(1, 3),
          tariqStories: tariqStories.length > 0 ? tariqStories : contextCards.slice(2, 4),
          alexStories: alexStories.length > 0 ? alexStories : contextCards.slice(0, 2),
          events: todayEvents,
          timestamp,
        }),
      );
      return replies;
    }

    // B. Tech Group: Consolidated Modular Summary (Акация IT, Саймон, Presijo AI & IT)
    if (resolvedTarget === 'tech-group') {
      replies.push(
        this.generateTechGroupSummary({
          prompt: cleanPrompt,
          date,
          okatsiyaStories: okatsiyaStories.length > 0 ? okatsiyaStories : contextCards.slice(0, 2),
          simonStories: simonStories.length > 0 ? simonStories : contextCards.slice(1, 3),
          presijoStories: presijoStories.length > 0 ? presijoStories : contextCards.slice(2, 4),
          events: todayEvents,
          timestamp,
        }),
      );
      return replies;
    }
    if (resolvedTarget === 'okatsiya' || resolvedTarget === 'all') {
      replies.push(
        this.generateOkatsiyaResponse({
          prompt: cleanPrompt,
          date,
          stories: okatsiyaStories.length > 0 ? okatsiyaStories : contextCards.filter((c) => c.category.includes('IT')),
          events: todayEvents,
          timestamp,
        }),
      );
    }

    if (resolvedTarget === 'ivan-bely' || resolvedTarget === 'all') {
      replies.push(
        this.generateIvanResponse({
          prompt: cleanPrompt,
          date,
          stories: ivanStories.length > 0 ? ivanStories : contextCards.slice(0, 2),
          events: todayEvents,
          timestamp,
        }),
      );
    }

    if (resolvedTarget === 'kirk-kitten' || resolvedTarget === 'all') {
      replies.push(
        this.generateKirkResponse({
          prompt: cleanPrompt,
          date,
          stories: kirkStories.length > 0 ? kirkStories : contextCards.slice(1, 3),
          events: todayEvents,
          timestamp,
        }),
      );
    }

    if (resolvedTarget === 'chen-wei' || resolvedTarget === 'all') {
      replies.push(
        this.generateChenResponse({
          prompt: cleanPrompt,
          date,
          stories: chenStories.length > 0 ? chenStories : contextCards.slice(2, 4),
          events: todayEvents,
          timestamp,
        }),
      );
    }

    if (resolvedTarget === 'alex-vector' || resolvedTarget === 'all') {
      const alexStories = contextCards.filter((c) => c.suggestedCurator === 'alex-vector' || c.isBreaking);
      replies.push(
        this.generateGenericCuratorResponse('alex-vector', {
          prompt: cleanPrompt,
          date,
          stories: alexStories.length > 0 ? alexStories : contextCards.slice(0, 2),
          events: todayEvents,
          timestamp,
        }),
      );
    }

    if (resolvedTarget === 'marcus-vane' || resolvedTarget === 'all') {
      const marcusStories = contextCards.filter(
        (c) => c.suggestedCurator === 'marcus-vane' || (c.branchingPotentialScore !== undefined && c.branchingPotentialScore >= 60),
      );
      replies.push(
        this.generateGenericCuratorResponse('marcus-vane', {
          prompt: cleanPrompt,
          date,
          stories: marcusStories.length > 0 ? marcusStories : contextCards.slice(0, 2),
          events: todayEvents,
          timestamp,
        }),
      );
    }

    if (resolvedTarget === 'tariq-said' || resolvedTarget === 'all') {
      const tariqStories = contextCards.filter(
        (c) =>
          c.suggestedCurator === 'tariq-said' ||
          c.summary.toLowerCase().includes('ирак') ||
          c.summary.toLowerCase().includes('залив') ||
          c.summary.toLowerCase().includes('иран'),
      );
      replies.push(
        this.generateGenericCuratorResponse('tariq-said', {
          prompt: cleanPrompt,
          date,
          stories: tariqStories.length > 0 ? tariqStories : contextCards.slice(0, 2),
          events: todayEvents,
          timestamp,
        }),
      );
    }

    if (resolvedTarget === 'helena-brandt' || resolvedTarget === 'all') {
      const helenaStories = contextCards.filter(
        (c) =>
          c.suggestedCurator === 'helena-brandt' ||
          c.summary.toLowerCase().includes('нефть') ||
          c.summary.toLowerCase().includes('сырье') ||
          c.summary.toLowerCase().includes('пролив'),
      );
      replies.push(
        this.generateGenericCuratorResponse('helena-brandt', {
          prompt: cleanPrompt,
          date,
          stories: helenaStories.length > 0 ? helenaStories : contextCards.slice(0, 2),
          events: todayEvents,
          timestamp,
        }),
      );
    }

    if (
      resolvedTarget === 'simon-habr' ||
      resolvedTarget === 'german-kernel' ||
      (resolvedTarget === 'all' && simonStories.length > 0)
    ) {
      replies.push(
        this.generateSimonResponse({
          prompt: cleanPrompt,
          date,
          stories: simonStories.length > 0 ? simonStories : contextCards.slice(0, 3),
          events: todayEvents,
          timestamp,
        }),
      );
    }

    if (resolvedTarget === 'presijo-ai' || (resolvedTarget === 'all' && presijoStories.length > 0)) {
      replies.push(
        this.generatePresijoResponse({
          prompt: cleanPrompt,
          date,
          stories: presijoStories.length > 0 ? presijoStories : contextCards.slice(0, 3),
          events: todayEvents,
          timestamp,
        }),
      );
    }

    if (resolvedTarget === 'notebook-producer') {
      replies.push(
        this.generateNotebookProducerResponse({
          prompt: cleanPrompt,
          date,
          stories: contextCards.slice(0, 3),
          timestamp,
        }),
      );
    }

    return replies;
  }

  /**
   * Okatsiya: Tech, AI & Industry sectors focus
   */
  private static generateOkatsiyaResponse(ctx: {
    prompt: string;
    date: string;
    stories: DailyNewsCard[];
    events: any[];
    timestamp: string;
  }): ChatMessage {
    const lower = ctx.prompt.toLowerCase();
    const explicitSector = resolveItSectorFromText(ctx.prompt);
    const isAiOnly =
      (lower.includes('только ai') ||
        lower.includes('только ии') ||
        lower.includes('/ai') ||
        (lower.includes('ai') && !lower.includes('it')) ||
        (lower.includes('нейросет') && !lower.includes('devops') && !lower.includes('backend'))) &&
      !lower.includes('devops') &&
      !lower.includes('backend') &&
      !lower.includes('bigtech');

    const isModelsRequested =
      lower.includes('/models') ||
      lower.includes('моделей нового поколения') ||
      lower.includes('новые модели') ||
      lower.includes('gemini 4') ||
      lower.includes('gpt-6') ||
      lower.includes('claude 5.5');

    const isAgentsRequested =
      lower.includes('/agents') ||
      lower.includes('эра автономных') ||
      lower.includes('автономных ии-агентов') ||
      lower.includes('автономных агентов') ||
      lower.includes('openai dots') ||
      lower.includes('meta muse') ||
      lower.includes('rtx spark') ||
      lower.includes('autowarcom');

    // 0. Next-Gen Models Radar Response
    if (isModelsRequested) {
      const bullets = [
        '**Google Gemini 4 Argon:** флагман с окном вывода в 1M токенов для сложнейшего кодинга и кибербезопасности. Доступ открыт только в рамках закрытой программы Fairwind. Также вышли Gemini 3.8 Flash и WeatherNext 3.',
        '**OpenAI GPT-6 (Astra, Sol, Luna):** шестое поколение моделей. GPT-6 Sol предлагает возможности флагмана всего за 20% цены. При этом релиз GPT-6.1 Astra отменен из-за непрохождения тестов безопасности.',
        '**Anthropic Claude 5.5 (Opus 5.5 и Sonnet 5.5):** обновленный Sonnet 5.5 получил алгоритм автоматического перенаправления рискованных запросов на профильную проверку кибербезопасности.',
      ];

      const text = `### 🧠 Окация: Радар релизов — Выход моделей нового поколения

Сводный мониторинг фронтирных моделей на **${ctx.date}**:

${bullets.map((b) => `- ${b}`).join('\n')}

> **Резюме Окации:** Мы наблюдаем качественный скачок: гонка перешла от чистого наращивания параметров к сверхдлинному окну вывода (1M токенов у Gemini 4 Argon), радикальному удешевлению инференса (GPT-6 Sol за 1/5 цены) и жестким защитным фильтрам (кибер-роутер Claude 5.5 и отмена Astra 6.1). Мы будем непрерывно следить за новыми версиями и пополнять эту ленту.`;

      const suggestedCard = {
        title: `🧠 [Модели нового поколения] Gemini 4 Argon, GPT-6 и Claude 5.5 (${ctx.date})`,
        description: `## 🧠 Модели нового поколения: Сводка релизов ${ctx.date}

> **Куратор:** ⚡ Окация  
> **Контур:** Модели & Архитектуры LLM  
> **Резонанс:** \`96%\`

### Ключевые релизы:
${bullets.map((b) => `- ${b}`).join('\n')}

---
*Сформировано в радарном тренде Project Lenta.*`,
        type: NoteType.EVENT,
        folder: '03_Research/AI',
        taxonomyPath: 'tech.ai.models.nextgen',
        hashtags: ['IT', 'AI', 'LLM', 'Gemini4', 'GPT6', 'Claude55', 'Модели'],
        curator: 'Окация',
      };

      return {
        id: `msg-okatsiya-${Date.now()}`,
        sender: 'okatsiya',
        senderName: 'Окация',
        senderRole: 'Архитектор и куратор контура IT & AI',
        avatar: '⚡',
        text,
        timestamp: ctx.timestamp,
        sources: ['Google DeepMind', 'OpenAI Research', 'Anthropic'],
        suggestedCard,
      };
    }

    // 0.1. Autonomous Agents Era Response
    if (isAgentsRequested) {
      const bullets = [
        '**OpenAI Dots:** постоянные автономные агенты с выделенными облачными ресурсами, продолжающие решать задачи между сессиями диалогов.',
        '**Meta Muse & xAI Grok 4.7:** Meta внедрила Muse на базе Muse Spark 1.3, а xAI запустила маркетплейс виртуальных сотрудников (разработчики, маркетологи, сейлзы).',
        '**Локальные вычисления (ПК NVIDIA RTX Spark & Apple):** в октябре стартуют продажи ПК RTX Spark для переноса тяжелого инференса из облака на локальное «железо»; Apple готовит расширение Siri AI в iOS 27.2.',
        '**Регуляторика и риски (FTC, Пентагон AUTOWARCOM, $88 млрд долга):** FTC открыла расследование против OpenAI и Anthropic; Пентагон создал командование AUTOWARCOM; на Уолл-стрит нарастает скепсис по поводу окупаемости накопленного $88 млрд ИИ-долга.',
      ];

      const text = `### 🤖 Окация: Эра автономных ИИ-агентов и смежные тренды

Комплексный срез агентной парадигмы на **${ctx.date}**:

${bullets.map((b) => `- ${b}`).join('\n')}

> **Резюме Окации:** Индустрия бесповоротно переходит от чат-ботов к постоянным агентам, способным работать в фоне. Это вызвало тектонические волны: развитие локальных ПК RTX Spark ради приватности, военную интеграцию через AUTOWARCOM Пентагона, расследования FTC и растущее давление Уолл-стрит по окупаемости $88 млрд инфраструктурного долга.`;

      const suggestedCard = {
        title: `🤖 [Автономные агенты] Платформы, локальные вычисления и регуляторные риски (${ctx.date})`,
        description: `## 🤖 Эра автономных ИИ-агентов: Панорама ${ctx.date}

> **Куратор:** ⚡ Окация  
> **Контур:** Агенты, Инфраструктура & Рынки  
> **Резонанс:** \`95%\`

### Ключевые тренды:
${bullets.map((b) => `- ${b}`).join('\n')}

---
*Сформировано куратором технологий Окацией в Project Lenta.*`,
        type: NoteType.EVENT,
        folder: '03_Research/AI',
        taxonomyPath: 'tech.ai.agents.landscape',
        hashtags: ['IT', 'AI', 'ИИАгенты', 'Dots', 'NVIDIA', 'AUTOWARCOM', 'Регуляторика'],
        curator: 'Окация',
      };

      return {
        id: `msg-okatsiya-${Date.now()}`,
        sender: 'okatsiya',
        senderName: 'Окация',
        senderRole: 'Архитектор и куратор контура IT & AI',
        avatar: '⚡',
        text,
        timestamp: ctx.timestamp,
        sources: ['OpenAI', 'Meta AI', 'xAI', 'NVIDIA', 'FTC', 'DoD', 'WSJ'],
        suggestedCard,
      };
    }

    // 1. Sector-specific Response (e.g. /devops, /backend, /bigtech, /infosec...)
    if (explicitSector && explicitSector.id !== 'ai') {
      const sector = explicitSector;
      const relevantStory = ctx.stories.find(
        (s) =>
          s.suggestedTags.some((t) => t.toLowerCase() === sector.id) ||
          s.title.toLowerCase().includes(sector.id),
      );

      const bullets = [
        relevantStory
          ? `**${relevantStory.title}** (${relevantStory.source}): ключевой сигнал сектора. ${relevantStory.summary}`
          : `**${sector.name}:** Профильный мониторинг сектора зафиксировал стабилизацию архитектурных стандартов и ускорение адаптации решений.`,
        `**Инженерный фокус:** ${sector.description}`,
        `**Рекомендация архитектора:** Оптимизация накладных расходов, проверка обратной совместимости API и усиление контуров отказоустойчивости.`,
      ];

      const text = `### ⚡ Окация: Профильный срез — ${sector.emoji} ${sector.name}

Анализ сектора на **${ctx.date}**:

${bullets.map((b) => `- ${b}`).join('\n')}

> **Резюме Окации:** Сектор ${sector.shortName} демонстрирует устойчивую динамику. Внедрение изменений рекомендуется проводить через канареечные развертывания с автоматическим откатом при деградации SLI/SLA.`;

      const suggestedCard = {
        title: relevantStory
          ? relevantStory.title
          : `${sector.emoji} [${sector.shortName}] Обзор отрасли и архитектурные решения (${ctx.date})`,
        description: `## ${sector.emoji} ${sector.name}: Технологический дайджест ${ctx.date}

> **Куратор:** ⚡ Окация  
> **Контур:** IT & AI (${sector.name})  
> **Резонанс:** \`86%\`

### Ключевые аспекты:
${bullets.map((b) => `- ${b}`).join('\n')}

---
*Сформировано куратором технологий Окацией в Project Lenta.*`,
        type: NoteType.EVENT,
        folder: sector.folder,
        taxonomyPath: sector.taxonomyPath,
        hashtags: ['IT', ...sector.hashtags.map((h) => h.replace(/^#/, ''))],
        curator: 'Окация',
        sourceLink: relevantStory?.url,
      };

      return {
        id: `msg-okatsiya-${Date.now()}`,
        sender: 'okatsiya',
        senderName: 'Окация',
        senderRole: 'Архитектор и куратор контура IT & AI',
        avatar: '⚡',
        text,
        timestamp: ctx.timestamp,
        sources: ctx.stories.map((s) => s.source).filter(Boolean),
        suggestedCard,
      };
    }

    // 2. AI-only Response
    if (isAiOnly) {
      const aiStory = ctx.stories.find(
        (s) =>
          s.suggestedTags.some((t) => t.toLowerCase() === 'ai' || t.toLowerCase() === 'llm') ||
          s.category.includes('Интеллект'),
      );

      const bullets = [
        aiStory
          ? `**${aiStory.title}** (${aiStory.source}): свежий прорыв в области нейросетей и прикладных моделей.`
          : '**Мультимодальные LLM и локальные веса:** релизы оптимизированных квантованных моделей (4-bit/8-bit AWQ) для локального инференса.',
        '**Агентные пайплайны и RAG:** переход от простых чат-ботов к мультиагентным системам с автономным планированием и верификацией кода.',
        '**Оценка вычислительных затрат:** оптимизация KV-кэша и гибридные Mixture-of-Experts (MoE) снижают стоимость одного токена на 30–45%.',
      ];

      const text = `### 🧠 Окация: Аналитический срез AI & Нейросети

Технологическая повестка в сфере искусственного интеллекта на **${ctx.date}**:

${bullets.map((b) => `- ${b}`).join('\n')}

> **Резюме Окации:** Фокус смещается от гонки чистых параметров к качеству данных для post-training и энергоэффективному локальному инференсу. Модели рассуждения (Reasoning) показывают рекордную автономность в программировании.`;

      const suggestedCard = {
        title: aiStory
          ? aiStory.title
          : `🧠 [AI & LLM] Релизы моделей и архитектурные тренды (${ctx.date})`,
        description: `## 🧠 AI & Нейросети: Технологический дайджест ${ctx.date}

> **Куратор:** ⚡ Окация  
> **Контур:** Искусственный Интеллект & LLM  

### Ключевые аспекты:
${bullets.map((b) => `- ${b}`).join('\n')}

---
*Сформировано куратором технологий Окацией в Project Lenta.*`,
        type: NoteType.EVENT,
        folder: 'Tech/AI',
        taxonomyPath: 'tech.ai.llm',
        hashtags: ['IT', 'AI', 'LLM', 'Нейросети', 'MachineLearning'],
        curator: 'Окация',
        sourceLink: aiStory?.url,
      };

      return {
        id: `msg-okatsiya-${Date.now()}`,
        sender: 'okatsiya',
        senderName: 'Окация',
        senderRole: 'Архитектор и куратор контура IT & AI',
        avatar: '⚡',
        text,
        timestamp: ctx.timestamp,
        sources: ctx.stories.map((s) => s.source).filter(Boolean),
        suggestedCard,
      };
    }

    // 3. Combined IT & AI Comprehensive Digest (или IT & AI отдельно в двух четких блоках)
    const aiStory = ctx.stories.find((s) => s.category.includes('Интеллект') || s.suggestedTags.includes('AI'));
    const techStory = ctx.stories.find((s) => !s.category.includes('Интеллект') && s.suggestedCurator === 'okatsiya');

    const isTg = isTelegramPostRequested(ctx.prompt);
    const isWeek = ctx.prompt.toLowerCase().includes('week') || ctx.prompt.toLowerCase().includes('недел');
    const period = isWeek ? 'week' : 'today';

    const text = isTg
      ? formatTelegramPostContent({
          contourTitle: 'IT, AI & Архитектура',
          curatorEmoji: '⚡',
          curatorName: 'Окация',
          date: ctx.date,
          period,
          bullets: [
            aiStory ? `${aiStory.title} (${aiStory.source}): ${aiStory.summary}` : 'LLM & Агенты: внедрение мультиагентных систем в production-пайплайны.',
            'DevOps & Cloud: масштабирование кластеров Kubernetes и устойчивость CI/CD.',
            'Backend & HighLoad: оптимизация параллелизма в распределенных базах данных и gRPC-микросервисы.',
          ],
          takeaway: 'Главный вектор — интеграция AI-компонентов в инженерную инфраструктуру без потери наблюдаемости и надежности.',
          hashtags: ['IT', 'AI', 'DevOps', 'HighLoad', 'Архитектура'],
        })
      : `### ⚡ Окация: Сводка IT & AI на сегодня (${ctx.date})

Ниже представлен структурированный срез по ключевым направлениям технологий:

---

#### 1. 🧠 Искусственный Интеллект (AI & Machine Learning):
- ${aiStory ? `**${aiStory.title}** (${aiStory.source}): ${aiStory.summary}` : '**LLM & Агентные архитектуры:** внедрение мультиагентных систем в production-пайплайны, развитие Reasoning-моделей и бенчмарков автономного кодинга.'}
- **Локальный инференс:** развитие открытых весов и фреймворков квантования, обеспечивающих высокую скорость на потребительском железе.

#### 2. 💻 Инженерное IT & Отрасли (DevOps, BigTech, Backend, SecOps):
- 🚢 **DevOps & Cloud:** масштабирование кластеров Kubernetes, оптимизация CI/CD пайплайнов и переход к бессерверным edge-вычислениям.
- ⚙️ **Backend & HighLoad:** оптимизация параллелизма в распределенных базах данных, gRPC-микросервисы и производительность runtime на Go и Rust.
- 🏢 **BigTech & Рынок:** стратегические инвестиции технологических гигантов в центры обработки данных и антимонопольный комплаенс.
- 🛡️ **InfoSec:** превентивное сканирование зависимостей и закрытие уязвимостей до попадания в релизные ветки.

---

> **Резюме Окации:** Главный вектор дня — глубокая интеграция AI-компонентов в традиционную инженерную инфраструктуру без потери надежности, наблюдаемости (observability) и безопасности.`;

    const suggestedCard = {
      title: techStory?.title || aiStory?.title || `⚡ [IT & AI] Технологическая повестка дня и архитектурный радар (${ctx.date})`,
      description: `## ⚡ IT & AI Повестка дня: ${ctx.date}

> **Куратор:** ⚡ Окация  
> **Контур:** IT, AI, DevOps, BigTech, Backend  

### Ключевые направления:
- **AI & Нейросети:** Мультимодальные модели, Reasoning-агенты, оптимизация инференса.
- **DevOps & SRE:** Оркестрация контейнеров, Kubernetes, устойчивость инфраструктуры.
- **Backend & BigTech:** Распределенные системы, HighLoad архитектура и макротренды IT-рынка.

---
*Сформировано куратором технологий Окацией в Project Lenta.*`,
      type: NoteType.EVENT,
      folder: 'Tech/Daily',
      taxonomyPath: 'tech.overview',
      hashtags: ['IT', 'AI', 'DevOps', 'Backend', 'BigTech', 'Архитектура'],
      curator: 'Окация',
      sourceLink: techStory?.url || aiStory?.url,
    };

    return {
      id: `msg-okatsiya-${Date.now()}`,
      sender: 'okatsiya',
      senderName: 'Окация',
      senderRole: 'Архитектор и куратор контура IT & AI',
      avatar: '⚡',
      text,
      timestamp: ctx.timestamp,
      messageType: isTg ? 'TELEGRAM_POST' : 'DEFAULT',
      metadata: {
        format: isTg ? 'telegram_post' : 'analysis',
        period,
        curatorId: 'okatsiya',
        dateScope: ctx.date,
      },
      sources: ctx.stories.map((s) => s.source).filter(Boolean),
      suggestedCard,
    };
  }

  /**
   * German «Kernel»: Habr & IT articles overview, oldschool hardware writeups, and Note synthesis
   */
  private static generateGermanResponse(ctx: {
    prompt: string;
    date: string;
    stories: DailyNewsCard[];
    events: any[];
    timestamp: string;
  }): ChatMessage {
    const mainStory = ctx.stories[0];
    const secondaryStory = ctx.stories[1];

    const bullets = [
      mainStory
        ? `**${mainStory.title}** (Источник: ${mainStory.source}): практический разбор статьи с выделением ключевых инженерных тезисов.`
        : 'Свежие публикации на Habr: прикладной опыт разработчиков, разборы архитектур и инженерные находки.',
      secondaryStory
        ? `**${secondaryStory.title}**: интересная смежная тема, отлично дополняющая общую картину.`
        : 'Олдскул и схемотехника: разборы старых плат и анализ ретро-архитектур от инженеров сообщества.',
      'Материалы журнала «Хакер» (xakep.ru): статьи подготовлены для группировки в тематическую Super Note под NotebookLM.',
    ];

    const isTg = isTelegramPostRequested(ctx.prompt);
    const isWeek = ctx.prompt.toLowerCase().includes('week') || ctx.prompt.toLowerCase().includes('недел');
    const period = isWeek ? 'week' : 'today';

    const text = isTg
      ? formatTelegramPostContent({
          contourTitle: 'Habr & IT-сообщество / Хакер',
          curatorEmoji: '📟',
          curatorName: 'Герман «Кернел»',
          date: ctx.date,
          period,
          bullets,
          takeaway: 'Меньше корпоративного пафоса — смотрим на то, что инженеры реально пишут в статьях и собирают руками.',
          hashtags: ['Habr', 'Хакер', 'ITСтатьи', 'СвояКухня', 'NoteСинтез'],
        })
      : `### 📟 Обзор IT-статей и Habr от Германа

Меньше корпоративного пафоса и громких пресс-релизов — смотрим на то, что реально пишет сообщество и практики.

По материалам на **${ctx.date}**:

${bullets.map((b) => `- ${b}`).join('\n')}

> **Ремарка Германа:**  
> «Окация пусть рассказывает про презентации в долине и котировки бигтеха, а на нашей кухне важны живые статьи: что люди собирают руками, как решают проблемы в проде и какие олдскульные подходы неожиданно снова становятся актуальными.  
> Все проверенные материалы разложены по полочкам и упакованы в структурированную Note.»`;

    const suggestedCard = {
      title: mainStory
        ? `[Habr / Хакер] ${mainStory.title}`
        : `[Habr Дайджест] Разбор статей IT-сообщества (${ctx.date})`,
      description: `## 📟 Разбор публикаций Habr и IT-статей: ${ctx.date}

### Ключевые материалы сообщества:
1. ${mainStory ? mainStory.title : 'Инженерный лонгрид на Habr'} — подробный разбор и практические выводы.
2. ${secondaryStory ? secondaryStory.title : 'Ретро-схемотехника и платы'} — нестандартный взгляд из архивов.

### Выводы для базы знаний:
- Статьи проверены и структурированы для включения в тематический кластер.
- Подготовлены ссылки и теги для последующей передачи в NotebookLM.

---
*Сформировано куратором IT-публикаций Германом в Project Lenta.*`,
      type: NoteType.SINGLE,
      folder: 'Tech/Habr',
      taxonomyPath: 'tech.community.habr',
      hashtags: ['Habr', 'ITСтатьи', 'Хакер', 'СвояКухня', 'NoteСинтез'],
      curator: 'Герман «Кернел»',
      sourceLink: mainStory?.url || 'https://habr.com',
    };

    const newsPosts: TelegramNewsPreview[] = ctx.stories.map((s, idx) => ({
      id: `german-post-${idx}-${ctx.date}`,
      title: s.title,
      summary: s.summary,
      rawText: s.summary,
      curatorId: 'german-kernel',
      curatorName: 'Герман «Кернел»',
      curatorEmoji: '📟',
      curatorRole: 'Обозреватель Habr, IT-публикаций и редактор дайджестов',
      sourceName: s.source || 'Habr / Хакер',
      sourceUrl: s.url,
      tags: s.suggestedTags?.length ? s.suggestedTags : ['Habr', 'Хакер', 'Инженерия'],
      keyPoints: s.keyPoints?.length ? s.keyPoints : ['Практический опыт разработчиков.', 'Архитектурные паттерны и олдскул.'],
      contourBadge: '📟 Habr & Хакер / Своя кухня',
      publishedAt: s.publishedAt || '14:20',
    }));

    return {
      id: `msg-german-${Date.now()}`,
      sender: 'german-kernel',
      senderName: 'Герман «Кернел»',
      senderRole: 'Обозреватель Habr, IT-публикаций и редактор дайджестов',
      avatar: '📟',
      text,
      timestamp: ctx.timestamp,
      messageType: isTg ? 'TELEGRAM_POST' : 'DEFAULT',
      metadata: {
        format: isTg ? 'telegram_post' : 'analysis',
        period,
        curatorId: 'german-kernel',
        dateScope: ctx.date,
      },
      sources: ctx.stories.map((s) => s.source).filter(Boolean),
      newsPosts,
      suggestedCard,
    };
  }

  /**
   * NotebookLM Producer: Background Notebook & Audio Overview dispatch
   */
  private static generateNotebookProducerResponse(ctx: {
    prompt: string;
    date: string;
    stories: DailyNewsCard[];
    timestamp: string;
  }): ChatMessage {
    const text = `### 📓 Режиссер NotebookLM: Фоновая генерация дневника

Задача на создание дневника принята в конвейер фоновой обработки!

**Пайплайн создания NotebookLM:**
1. **Сборка источников**: Упаковка выбранных статей и ссылок Super Note в единый Markdown Source Bundle (~15–20 сек).
2. **Индексация в ядре NotebookLM**: Анализ связей и подготовка тезисов (~30 сек).
3. **Генерация 2-Host аудио-диалога**: Deep Dive Audio Overview (~160 сек).
4. **Асинхронный коллбэк**: Автоматическое обновление целевой Note с прикрепленным плеером и стенограммой.

⏱️ **Расчетное время готовности (Smart ETA):** ~**3 мин 30 сек** (210 сек).

> *Вы перенаправлены на созданную целевую Note. Она создается в фоне — вы можете свободно отвлечься, страница обновится автоматически по готовности.*`;

    const suggestedCard = {
      title: `🎙️ NotebookLM Дневник: IT & Своя кухня (${ctx.date})`,
      description: `# 🎙️ NotebookLM Дневник: IT & Своя кухня (${ctx.date})

> ⏳ **Статус:** Генерация дневника в процессе...  
> ⏱️ **Расчетное время (ETA):** ~3 мин 30 сек  
> 🔗 **Родительская задача:** Super Note по материалам Habr & Хакер

---
*Дневник создается в фоне агентом notebook-producer. После завершения сюда будет прикреплен аудиоплеер и стенограмма.*`,
      type: NoteType.DONE,
      folder: 'Podcasts',
      taxonomyPath: 'media.podcast.notebooklm',
      hashtags: ['NotebookLM', 'Дневник', 'АудиоДайджест', 'Habr', 'Хакер'],
      curator: 'Герман «Кернел»',
    };

    return {
      id: `msg-notebook-${Date.now()}`,
      sender: 'notebook-producer',
      senderName: 'Режиссер NotebookLM',
      senderRole: 'Агент создания дневников и подкастов NotebookLM',
      avatar: '📓',
      text,
      timestamp: ctx.timestamp,
      sources: ['NotebookLM Engine', 'Google Gemini'],
      suggestedCard,
    };
  }

  /**
   * Ivan Bely: Russian domestic and regulatory focus
   */
  private static generateIvanResponse(ctx: {
    prompt: string;
    date: string;
    stories: DailyNewsCard[];
    events: any[];
    timestamp: string;
  }): ChatMessage {
    const mainStory = ctx.stories[0];
    const secondaryStory = ctx.stories[1];

    const bullets = [
      mainStory
        ? `**${mainStory.title}** (${mainStory.source}): прямое регуляторное воздействие. ФАС и профильные ведомства контролируют биржевые нормативы.`
        : 'Рассмотрение проекта федерального бюджета на трехлетний период и распределение финансирования нацпроектов.',
      secondaryStory
        ? `**${secondaryStory.title}**: внутренний рынок сохраняет баланс предложения при действующем механизме демпфера.`
        : 'Работа комитетов Государственной Думы IX созыва по формированию налоговых и инвестиционных стимулов.',
      'Оценка внутреннего контура: риски потребительской инфляции купируются мерами ЦБ РФ и контролем торговых наценок.',
    ];

    const isTg = isTelegramPostRequested(ctx.prompt);
    const isWeek = ctx.prompt.toLowerCase().includes('week') || ctx.prompt.toLowerCase().includes('недел');
    const period = isWeek ? 'week' : 'today';

    const text = isTg
      ? formatTelegramPostContent({
          contourTitle: 'Внутренний контур РФ',
          curatorEmoji: '🇷🇺',
          curatorName: 'Иван Белый',
          date: ctx.date,
          period,
          bullets,
          takeaway: 'Регуляторное поле стабильно. Ключевая нагрузка — согласование бюджета и баланс оптового звена энергоносителей.',
          hashtags: ['ПолитикаРФ', 'Госдума', 'ФАС', 'Регуляторика'],
        })
      : `### 🇷🇺 Оценка внутреннего контура РФ

По повестке на **${ctx.date}** в фокусе внимания внутреннего контура:

${bullets.map((b) => `- ${b}`).join('\n')}

> **Резюме обозревателя:** Ситуация в регуляторном поле стабильная. Основная нагрузка сейчас ложится на согласование расходных статей бюджета и мониторинг оптового звена энергоносителей. Для граждан ключевой индикатор — сдерживание цен на АЗС и коммунальных тарифов.`;

    const suggestedCard = {
      title: mainStory
        ? mainStory.title
        : `Регуляторные решения и повестка дня РФ (${ctx.date})`,
      description: `## Регуляторный дайджест РФ: ${ctx.date}

> **Куратор:** 🇷🇺 Иван Белый  
> **Контур:** Внутренняя политика и экономика РФ  

### Ключевые аспекты:
${bullets.map((b) => `- ${b}`).join('\n')}

---
*Сформировано аналитическим деском Project Lenta.*`,
      type: NoteType.EVENT,
      folder: 'Politics/Russia',
      taxonomyPath: 'politics.russia.regulations',
      hashtags: ['ПолитикаРФ', 'Госдума', 'ФАС', 'Бюджет', 'Регуляторика'],
      curator: 'ivan-bely',
      sourceLink: mainStory?.url,
    };

    const newsPosts: TelegramNewsPreview[] = ctx.stories.map((s, idx) => ({
      id: `ivan-post-${idx}-${ctx.date}`,
      title: s.title,
      summary: s.summary,
      rawText: s.summary,
      curatorId: 'ivan-bely',
      curatorName: 'Иван Белый',
      curatorEmoji: '🇷🇺',
      curatorRole: 'Внутренний контур РФ',
      sourceName: s.source || 'СПбМТСБ / ФАС',
      sourceUrl: s.url,
      tags: s.suggestedTags?.length ? s.suggestedTags : ['ПолитикаРФ', 'Регуляторика'],
      keyPoints: s.keyPoints?.length ? s.keyPoints : ['Контроль биржевых нормативов моторного топлива.', 'Сохранение оптового ценового баланса.'],
      contourBadge: '🇷🇺 Внутренний контур РФ',
      publishedAt: s.publishedAt || '11:30',
    }));

    return {
      id: `msg-ivan-${Date.now()}`,
      sender: 'ivan-bely',
      senderName: 'Иван Белый',
      senderRole: 'Обозреватель внутреннего контура РФ',
      avatar: '🇷🇺',
      text,
      timestamp: ctx.timestamp,
      messageType: isTg ? 'TELEGRAM_POST' : 'DEFAULT',
      metadata: {
        format: isTg ? 'telegram_post' : 'analysis',
        period,
        curatorId: 'ivan-bely',
        dateScope: ctx.date,
      },
      sources: ctx.stories.map((s) => s.source).filter(Boolean),
      newsPosts,
      suggestedCard,
    };
  }

  /**
   * Kirk Kitten: International and markets focus
   */
  private static generateKirkResponse(ctx: {
    prompt: string;
    date: string;
    stories: DailyNewsCard[];
    events: any[];
    timestamp: string;
  }): ChatMessage {
    const mainStory = ctx.stories[0];
    const secondaryStory = ctx.stories[1];

    const bullets = [
      mainStory
        ? `**${mainStory.title}** (${mainStory.source}): международные регуляторы усиливают комплаенс-требования к морским фрахтовым контрактам.`
        : 'Завершение недели высокого уровня 81-й сессии Генеральной Ассамблеи ООН (UNGA 81) в Нью-Йорке.',
      secondaryStory
        ? `**${secondaryStory.title}**: ставки морского фрахта и проверка страховых сертификатов P&I клубов.`
        : 'Мониторинг соблюдения ценового потолка и переориентация танкерных потоков на Индию и Китай.',
      'Глобальный контекст: осторожная выжидательная позиция трейдеров перед публикацией новых данных по запасам и инфляции.',
    ];

    const isTg = isTelegramPostRequested(ctx.prompt);
    const isWeek = ctx.prompt.toLowerCase().includes('week') || ctx.prompt.toLowerCase().includes('недел');
    const period = isWeek ? 'week' : 'today';

    const text = isTg
      ? formatTelegramPostContent({
          contourTitle: 'Международные рынки & Санкции',
          curatorEmoji: '🌐',
          curatorName: 'Kirk Kitten',
          date: ctx.date,
          period,
          bullets,
          takeaway: 'Давление регуляторов смещается в плоскость вторичного финансово-логистического комплаенса и страховки.',
          hashtags: ['OFAC', 'Санкции', 'Логистика', 'Танкеры', 'МировыеРынки'],
        })
      : `### 🌐 Оценка международного контура и рынков

Сигналы внешнего контура на **${ctx.date}**:

${bullets.map((b) => `- ${b}`).join('\n')}

> **Резюме международного деска:** Давление смещается из плоскости прямых запретов в плоскость вторичного финансово-логистического комплаенса (страхование судов, каботаж, портовые сборы). Глобальные цепочки пока адаптируются за счет дисконтов и нейтральных юрисдикций.`;

    const suggestedCard = {
      title: mainStory
        ? mainStory.title
        : `Международные санкции и логистика (${ctx.date})`,
      description: `## Международный мониторинг: ${ctx.date}

> **Куратор:** 🌐 Kirk Kitten  
> **Контур:** Международные рынки, OFAC, санкции  

### Ключевые маркеры:
${bullets.map((b) => `- ${b}`).join('\n')}

---
*Сформировано аналитическим деском Project Lenta.*`,
      type: NoteType.EVENT,
      folder: 'Politics/Sanctions',
      taxonomyPath: 'politics.international.sanctions',
      hashtags: ['OFAC', 'Санкции', 'Логистика', 'Танкеры', 'МировыеРынки'],
      curator: 'kirk-kitten',
      sourceLink: mainStory?.url,
    };

    const newsPosts: TelegramNewsPreview[] = ctx.stories.map((s, idx) => ({
      id: `kirk-post-${idx}-${ctx.date}`,
      title: s.title,
      summary: s.summary,
      rawText: s.summary,
      curatorId: 'kirk-kitten',
      curatorName: 'Kirk Kitten',
      curatorEmoji: '🌐',
      curatorRole: 'Специальный международный корреспондент',
      sourceName: s.source || 'Bloomberg / Markets',
      sourceUrl: s.url,
      tags: s.suggestedTags?.length ? s.suggestedTags : ['OFAC', 'Санкции', 'Фрахт'],
      keyPoints: s.keyPoints?.length ? s.keyPoints : ['Комплаенс-требования к морским фрахтовым контрактам.', 'Мониторинг соблюдения ценового потолка.'],
      contourBadge: '🌐 Международный контур / Санкции',
      publishedAt: s.publishedAt || '12:45',
    }));

    return {
      id: `msg-kirk-${Date.now()}`,
      sender: 'kirk-kitten',
      senderName: 'Kirk Kitten',
      senderRole: 'Специальный международный корреспондент',
      avatar: '🌐',
      text,
      timestamp: ctx.timestamp,
      messageType: isTg ? 'TELEGRAM_POST' : 'DEFAULT',
      metadata: {
        format: isTg ? 'telegram_post' : 'analysis',
        period,
        curatorId: 'kirk-kitten',
        dateScope: ctx.date,
      },
      sources: ctx.stories.map((s) => s.source).filter(Boolean),
      newsPosts,
      suggestedCard,
    };
  }

  /**
   * Chen Wei: East Asia, China, BRICS, supply chains and national currency settlements
   */
  private static generateChenResponse(ctx: {
    prompt: string;
    date: string;
    stories: DailyNewsCard[];
    events: any[];
    timestamp: string;
  }): ChatMessage {
    const mainStory = ctx.stories[0];
    const secondaryStory = ctx.stories[1];

    const bullets = [
      mainStory
        ? `**${mainStory.title}** (${mainStory.source}): динамика товарооборота и переориентация логистических маршрутов.`
        : 'Народный Банк Китая и центральные банки стран БРИКС расширяют сеть двусторонних валютных свопов и линий клиринга.',
      secondaryStory
        ? `**${secondaryStory.title}**: пропускная способность дальневосточных погранпереходов и морских портов.`
        : 'Рост объемов контейнерных перевозок по маршрутам Китай — Россия — Европа и МТК "Север-Юг".',
      'Технологический контур: устойчивость поставок промышленной электроники и компонентов в условиях западных экспортных барьеров.',
    ];

    const isTg = isTelegramPostRequested(ctx.prompt);
    const isWeek = ctx.prompt.toLowerCase().includes('week') || ctx.prompt.toLowerCase().includes('недел');
    const period = isWeek ? 'week' : 'today';

    const text = isTg
      ? formatTelegramPostContent({
          contourTitle: 'АТР, Китай & БРИКС',
          curatorEmoji: '🇨🇳',
          curatorName: 'Чэнь Вэй',
          date: ctx.date,
          period,
          bullets,
          takeaway: 'Торгово-логистический разворот на Восток перешел в стадию институционализации: фокус на независимой межбанковской инфраструктуре.',
          hashtags: ['Китай', 'АТР', 'БРИКС', 'Логистика', 'Клиринг'],
        })
      : `### 🇨🇳 Оценка восточного контура: АТР и БРИКС

Повестка Азиатско-Тихоокеанского региона на **${ctx.date}**:

${bullets.map((b) => `- ${b}`).join('\n')}

> **Резюме обозревателя:** Торгово-логистический разворот на Восток перешел в стадию институционализации: ключевое внимание уделяется не поиску разовых поставщиков, а созданию суверенной финансово-транспортной инфраструктуры (двусторонний клиринг, совместные страховые фонды, портовые хабы).`;

    const suggestedCard = {
      title: mainStory
        ? mainStory.title
        : `АТР, Китай и коридоры БРИКС (${ctx.date})`,
      description: `## Восточный контур: ${ctx.date}

> **Куратор:** 🇨🇳 Чэнь Вэй  
> **Контур:** Китай, АТР, БРИКС, логистика  

### Ключевые аспекты:
${bullets.map((b) => `- ${b}`).join('\n')}

---
*Сформировано аналитическим деском Project Lenta.*`,
      type: NoteType.EVENT,
      folder: 'Politics/Asia',
      taxonomyPath: 'politics.international.asia',
      hashtags: ['Китай', 'АТР', 'БРИКС', 'Логистика', 'Клиринг'],
      curator: 'chen-wei',
      sourceLink: mainStory?.url,
    };

    const newsPosts: TelegramNewsPreview[] = ctx.stories.map((s, idx) => ({
      id: `chen-post-${idx}-${ctx.date}`,
      title: s.title,
      summary: s.summary,
      rawText: s.summary,
      curatorId: 'chen-wei',
      curatorName: 'Чэнь Вэй',
      curatorEmoji: '🇨🇳',
      curatorRole: 'Обозреватель АТР, Китая и глобальных цепочек поставок',
      sourceName: s.source || 'Xinhua / PBOC',
      sourceUrl: s.url,
      tags: s.suggestedTags?.length ? s.suggestedTags : ['Китай', 'БРИКС', 'Логистика'],
      keyPoints: s.keyPoints?.length ? s.keyPoints : ['Прямые валютные расчеты в юанях и рублях.', 'Развитие контейнерного транзита через восточные порты.'],
      contourBadge: '🇨🇳 Восточный контур / АТР и БРИКС',
      publishedAt: s.publishedAt || '13:15',
    }));

    return {
      id: `msg-chen-${Date.now()}`,
      sender: 'chen-wei',
      senderName: 'Чэнь Вэй',
      senderRole: 'Обозреватель АТР, Китая и глобальных цепочек поставок',
      avatar: '🇨🇳',
      text,
      timestamp: ctx.timestamp,
      messageType: isTg ? 'TELEGRAM_POST' : 'DEFAULT',
      metadata: {
        format: isTg ? 'telegram_post' : 'analysis',
        period,
        curatorId: 'chen-wei',
        dateScope: ctx.date,
      },
      sources: ctx.stories.map((s) => s.source).filter(Boolean),
      newsPosts,
      suggestedCard,
    };
  }

  /**
   * Generates a consolidated modular executive summary from the political curators group.
   */
  private static generatePoliticalGroupSummary(ctx: {
    prompt: string;
    date: string;
    ivanStories: DailyNewsCard[];
    kirkStories: DailyNewsCard[];
    tariqStories: DailyNewsCard[];
    alexStories: DailyNewsCard[];
    events: any[];
    timestamp: string;
  }): ChatMessage {
    const lower = (ctx.prompt || '').toLowerCase();
    const isWeek = lower.includes('week') || lower.includes('недел') || lower.includes('7 дней');
    const isMonth = lower.includes('month') || lower.includes('месяц') || lower.includes('30 дней');
    const timeframe: 'today' | 'week' | 'month' = isWeek ? 'week' : isMonth ? 'month' : 'today';

    let headerTitle = `### 🏛️ Политическая коллегия: Панорама дня (${ctx.date})`;
    let formatDesc = `Оперативный модульный срез по ключевым контурам`;
    let timeframeLabel = 'сегодня';

    let ivanBullets: string[] = [];
    let kirkBullets: string[] = [];
    let tariqBullets: string[] = [];
    let alexBullets: string[] = [];

    if (timeframe === 'week') {
      headerTitle = `### 📅 Политическая коллегия: Панорама за неделю (${ctx.date})`;
      formatDesc = `Краткое недельное резюме по контурам (без визуального шума)`;
      timeframeLabel = 'неделю';

      ivanBullets = [
        `**Недельный баланс топливного рынка**: Минэнерго и ФАС зафиксировали стабилизацию биржевых цен бензина после корректировки нормативов на СПбМТСБ.`,
        `**Налоговые и регуляторные пакеты**: Госдума завершила слушания поправок в Бюджетный кодекс и пакета инвестиционных преференций.`,
        `**Потребительский сектор**: сдерживание инфляционных ожиданий через жесткую денежно-кредитную политику Банка России.`,
      ];

      kirkBullets = [
        `**Недельная динамика санкций**: смещение фокуса директив OFAC и ЕС с прямых эмбарго на сквозной аудит морского фрахта и страховых полисов P&I клубов.`,
        `**Мировые рынки и логистика**: закрепление независимых танкерных пулов на глобальных маршрутах, ставки фрахта стабилизировались.`,
        `**Вашингтонский контур**: консультации в Конгрессе и Белом доме по экспортному контролю и вторичным мерам.`,
      ];

      tariqBullets = [
        `**Динамика зоны Залива (MENA)**: координация квот добычи в рамках альянса OPEC+ и сохранение баланса спотовых цен.`,
        `**Безопасность региональных артерий**: мониторинг навигации в Ормузском проливе и Красном море при усилении мер эскорта судов.`,
        `**Дипломатические треки**: негласные консультации монархий Залива по трансграничным инвестиционным коридорам.`,
      ];

      alexBullets = [
        `**Мировой пульс и саммиты**: итоги многосторонних консультаций на министерском уровне и серия экстренных коммюнике.`,
        `**Виральные сюжеты недели**: проверка фактов по резонансным инфоповодам глобальных медиа и разделение шума и системных сдвигов.`,
        `**Свежая повестка дня**: ключевые геополитические развилки, определяющие новостной фон ближайших дней.`,
      ];
    } else if (timeframe === 'month') {
      headerTitle = `### 🗓️ Политическая коллегия: Стратегическая панорама за месяц (${ctx.date})`;
      formatDesc = `Стратегический срез за 30 дней по макротрендам и контурам`;
      timeframeLabel = 'месяц';

      ivanBullets = [
        `**Стратегический срез законов и бюджета**: утверждение базовых параметров трехлетнего бюджета, инвестиционных стимулов и сохранение демпферного щита.`,
        `**Антимонопольный контроль**: системный мониторинг оптовых цепочек поставок и сдерживание роста тарифов естественных монополий.`,
        `**Внутренний рынок труда и производство**: адаптация промышленных мощностей и переориентация сырьевых потоков на дружественные рынки.`,
      ];

      kirkBullets = [
        `**Месячный санкционный пакет**: переход регуляторов Запада к постоянному комплаенсу вторичных институтов и танкерного флота.`,
        `**Трансформация торговых путей**: закрепление независимых страховых пулов и рост фрахтовых мощностей нейтральных юрисдикций.`,
        `**Сырьевой баланс**: стабильность экспортных котировок при растущем спросе на альтернативных направлениях.`,
      ];

      tariqBullets = [
        `**Месячный трек Большого Ближнего Востока**: фиксация договоренностей монархий Залива по диверсификации торговых маршрутов в обход зон риска.`,
        `**Инфраструктурный периметр**: устойчивость работы портовых мощностей Персидского залива и сухопутных коридоров Леванта.`,
        `**Энергетический баланс**: консолидированная позиция ключевых экспортеров нефти в преддверии министерских встреч OPEC+.`,
      ];

      alexBullets = [
        `**Месячные сдвиги в глобальной повестке**: тектонические изменения в балансе международных союзов и коалиций.`,
        `**Информационные волны**: ретроспективный разбор ключевых информационных вбросов и подтвердившихся инсайдов за 30 дней.`,
        `**Стратегические тренды**: кристаллизация новой многополярной конфигурации на ключевых международных площадках.`,
      ];
    } else {
      // today
      ivanBullets = [
        ctx.ivanStories[0]
          ? `**${ctx.ivanStories[0].title}**: регуляторный контроль биржевых нормативов моторного топлива на СПбМТСБ и проверка наценок.`
          : 'Завершение нулевых чтений проекта трехлетнего федерального бюджета на 2027–2029 гг.',
        ctx.ivanStories[1]
          ? `**${ctx.ivanStories[1].title}**: действие демпферного механизма и мониторинг оптового звена энергоносителей.`
          : 'ФАС и Минэнерго РФ проводят еженедельный мониторинг баланса поставок моторного топлива в регионы.',
      ];

      kirkBullets = [
        ctx.kirkStories[0]
          ? `**${ctx.kirkStories[0].title}**: Минфин США (OFAC) усилил комплаенс-требования к проверке страховых полисов P&I клубов для танкеров.`
          : 'Публикация нового директивного пакета OFAC по контролю условий страхования морских партий нефти.',
        ctx.kirkStories[1]
          ? `**${ctx.kirkStories[1].title}**: ставки фрахта и комплаенс на глобальных маршрутах.`
          : 'Повышение ставок морского фрахта и страховых премий Lloyd\'s для танкеров под нейтральными флагами.',
      ];

      tariqBullets = [
        ctx.tariqStories[0]
          ? `**${ctx.tariqStories[0].title}**: координация региональной безопасности и мониторинг логистических узлов Залива.`
          : 'Мониторинг позиций стран Персидского залива и консультации по обеспечению безопасности танкерного трафика.',
        ctx.tariqStories[1]
          ? `**${ctx.tariqStories[1].title}**: баланс энергетического сектора и решения в рамках OPEC+.`
          : 'Оценка влияния геополитической напряженности на страховые премии в портах Ближнего Востока.',
      ];

      alexBullets = [
        ctx.alexStories[0]
          ? `**${ctx.alexStories[0].title}**: оперативная мировая молния и ключевой информационный триггер дня.`
          : 'Свежая мировая повестка: согласование итогового коммюнике международных консультаций.',
        ctx.alexStories[1]
          ? `**${ctx.alexStories[1].title}**: развитие сюжета в фокусе внимания международных обозревателей.`
          : 'Мониторинг экстренных сводок мировых информационных агентств и проверка первоисточников.',
      ];
    }

    const markdownText = `${headerTitle}

> **Формат:** ${formatDesc}  
> **Оптики в эфире:** 🇷🇺 Иван Белый • 🌐 Kirk Kitten • 🕌 Тарик Саид • 🔥 Алекс Вектор  

---

#### 🇷🇺 Внутренний контур РФ (Иван Белый)
${ivanBullets.map((b) => `- ${b}`).join('\n')}

👉 [В тред к Ивану Белому (обсудить ${timeframeLabel}) ↗](action:curator:ivan-bely?timeframe=${timeframe})

#### 🌐 Контур США и международные рынки (Kirk Kitten)
${kirkBullets.map((b) => `- ${b}`).join('\n')}

👉 [В тред к Kirk Kitten (обсудить ${timeframeLabel}) ↗](action:curator:kirk-kitten?timeframe=${timeframe})

#### 🕌 Контур Ближнего Востока и зоны Залива (Тарик Саид)
${tariqBullets.map((b) => `- ${b}`).join('\n')}

👉 [В тред к Тарику Саиду (обсудить ${timeframeLabel}) ↗](action:curator:tariq-said?timeframe=${timeframe})

#### 🔥 Свежая мировая повестка и Breaking News (Алекс Вектор)
${alexBullets.map((b) => `- ${b}`).join('\n')}

👉 [В тред к Алексу Вектору (обсудить ${timeframeLabel}) ↗](action:curator:alex-vector?timeframe=${timeframe})

---
💡 *Сводка собрана в компактном формате без фото и медиа-шума. Вы можете обсудить детали за ${timeframeLabel} в личных тредах кураторов.*`;

    const suggestedCard = {
      title: `[Резюме] Политическая панорама (${timeframe === 'week' ? 'неделя' : timeframe === 'month' ? 'месяц' : 'день'}, ${ctx.date})`,
      description: `## Политическая коллегия: Панорама за ${timeframeLabel} (${ctx.date})

> **Куратор:** 🏛️ Политическая коллегия (Иван Белый, Kirk Kitten, Тарик Саид, Алекс Вектор)  
> **Период:** ${timeframe === 'week' ? '7 дней' : timeframe === 'month' ? '30 дней' : 'Сегодня'}  

### Ключевые аспекты:
- **Контур РФ (Иван Белый):** Регуляторика, бюджет и баланс оптовых цен на энергоносители.
- **Контур США (Kirk Kitten):** Санкционные директивы OFAC, страховой комплаенс и глобальные рынки.
- **Ближний Восток (Тарик Саид):** Безопасность зоны Залива, квоты OPEC+ и баланс MENA.
- **Свежая повестка (Алекс Вектор):** Breaking news, экстренные коммюнике и мировой пульс.

---
*Сформировано аналитическим деском Project Lenta.*`,
      type: NoteType.EVENT,
      folder: 'Politics/Daily',
      taxonomyPath: 'politics.daily_summary',
      hashtags: ['Политика', 'Резюме', 'Коллегия', 'Контуры'],
      curator: 'Политическая коллегия',
    };

    const isTg = isTelegramPostRequested(ctx.prompt);
    const postBullets = [
      ...ivanBullets.slice(0, 1),
      ...kirkBullets.slice(0, 1),
      ...tariqBullets.slice(0, 1),
      ...alexBullets.slice(0, 1),
    ];
    const textOutput = isTg
      ? formatTelegramPostContent({
          contourTitle: 'Политическая коллегия',
          curatorEmoji: '🏛️',
          curatorName: 'Сводный аналитический деск',
          date: ctx.date,
          period: timeframe === 'week' ? 'week' : 'today',
          bullets: postBullets,
          takeaway: 'Синхронизация регуляторного поля РФ, санкционного давления, ближневосточного баланса и мировой повестки.',
          hashtags: ['Политика', 'Коллегия', 'СводкаДня', 'Аналитика'],
        })
      : markdownText;

    return {
      id: `msg-group-${Date.now()}`,
      sender: 'political-group',
      senderName: 'Политическая коллегия',
      senderRole:
        timeframe === 'week'
          ? 'Недельный аналитический деск'
          : timeframe === 'month'
          ? 'Месячный стратегический деск'
          : 'Сводный деск политических кураторов',
      avatar: timeframe === 'week' ? '📅' : timeframe === 'month' ? '🗓️' : '🏛️',
      text: textOutput,
      timestamp: ctx.timestamp,
      messageType: isTg ? 'TELEGRAM_POST' : 'DEFAULT',
      metadata: {
        format: isTg ? 'telegram_post' : 'summary',
        period: timeframe,
        curatorId: 'political-group',
        dateScope: ctx.date,
      },
      sources: ['Правительство РФ', 'СПбМТСБ', 'OFAC', 'Lloyd\'s List', 'Al Jazeera', 'Reuters', 'Associated Press'],
      suggestedCard,
    };
  }

  /**
   * Generates a consolidated modular executive summary from the tech curators group.
   */
  private static generateTechGroupSummary(ctx: {
    prompt: string;
    date: string;
    okatsiyaStories: DailyNewsCard[];
    simonStories: DailyNewsCard[];
    presijoStories: DailyNewsCard[];
    events: any[];
    timestamp: string;
  }): ChatMessage {
    const lower = (ctx.prompt || '').toLowerCase();
    const isWeek = lower.includes('week') || lower.includes('недел') || lower.includes('7 дней');
    const isMonth = lower.includes('month') || lower.includes('месяц') || lower.includes('30 дней');
    const timeframe: 'today' | 'week' | 'month' = isWeek ? 'week' : isMonth ? 'month' : 'today';

    let headerTitle = `### ⚡ IT & AI Группа: Технологическая панорама дня (${ctx.date})`;
    let formatDesc = `Оперативный модульный срез по IT, AI, разработке и Habr`;
    let timeframeLabel = 'сегодня';

    let okatsiyaBullets: string[] = [];
    let simonBullets: string[] = [];
    let presijoBullets: string[] = [];

    if (timeframe === 'week') {
      headerTitle = `### 📅 IT & AI Группа: Технологическая панорама за неделю (${ctx.date})`;
      formatDesc = `Краткое недельное резюме по технологиям и сообществу (без шума)`;
      timeframeLabel = 'неделю';

      okatsiyaBullets = [
        `**Громкие анонсы и BigTech**: серия релизов новых флагманских девайсов и архитектурных обновлений ключевых облачных провайдеров.`,
        `**Hi-Tech индустрия и чипы**: новое поколение полупроводниковых ускорителей и масштабирование дата-центров.`,
        `**Потребительские девайсы**: тренд на интеграцию локальных NPU в смартфоны и портативные компьютеры.`,
      ];

      simonBullets = [
        `**Топ статей недели на Habr**: углубленный разбор архитектур высоконагруженных систем и авторские кейсы миграции с легаси.`,
        `**Инженерные практики и сообщество**: обсуждение ретро-схемотехники, микроконтроллеров и нестандартных аппаратных решений.`,
        `**Культура разработки**: реальный опыт решения инцидентов в проде от практикующих инженеров.`,
      ];

      presijoBullets = [
        `**Недельный радар AI-инструментов**: появление автономных агентов для кодинга и новых CLI-утилит для локального инференса.`,
        `**Релизы библиотек**: мажорные обновления в экосистеме Hugging Face, PyTorch и vLLM с приростом пропускной способности.`,
        `**Telegram-каналы и контент**: виральные разборы промпт-инжиниринга и прикладные пайплайны автоматизации контента.`,
      ];
    } else if (timeframe === 'month') {
      headerTitle = `### 🗓️ IT & AI Группа: Стратегическая панорама за месяц (${ctx.date})`;
      formatDesc = `Стратегический срез за 30 дней по трендам IT, AI-инструментам и сообществу`;
      timeframeLabel = 'месяц';

      okatsiyaBullets = [
        `**Месячный ландшафт Hi-Tech**: волна анонсов следующего поколения аппаратных платформ и квантование моделей под мобильные чипы.`,
        `**Архитектурные тренды BigTech**: переход к гетерогенным вычислительным кластерам и оптимизация TCO инфраструктуры.`,
        `**Девайсы и интерфейсы**: закрепление тренда на агентные интерфейсы взаимодействия в потребительских операционных системах.`,
      ];

      simonBullets = [
        `**Месячный дайджест публикаций Habr**: фундаментальные лонгриды по проектированию распределенных баз данных и сетевых протоколов.`,
        `**Олдскул и железо**: возрождение интереса к аппаратной схемотехнике, ПЛИС (FPGA) и микроконтроллерным проектам.`,
        `**Сообщество и карьера**: тренды найма в IT, баланс между remote-командами и инженерной дисциплиной.`,
      ];

      presijoBullets = [
        `**Месячный срез рынка AI-инструментов**: переход от простых оберток к сложным мультимодальным рабочим пространствам.`,
        `**Эволюция open-source библиотек**: стабилизация фреймворков агентной оркестрации и квантования весов.`,
        `**Контент и медиа в Telegram**: масштабирование авторских каналов по AI и формирование устойчивого пула экспертных сообществ.`,
      ];
    } else {
      // today
      okatsiyaBullets = [
        ctx.okatsiyaStories[0]
          ? `**${ctx.okatsiyaStories[0].title}**: ключевой Hi-Tech анонс и влияние на индустрию.`
          : 'Анонсы новых девайсов и архитектурные решения в линейках ведущих производителей потребительской электроники.',
        ctx.okatsiyaStories[1]
          ? `**${ctx.okatsiyaStories[1].title}**: развитие технологий и аппаратных платформ.`
          : 'BigTech: инвестиции в инфраструктуру дата-центров и энергоэффективные серверные чипы.',
      ];

      simonBullets = [
        ctx.simonStories[0]
          ? `**${ctx.simonStories[0].title}**: практический разбор статьи с Habr и инженерные выводы.`
          : 'Свежие публикации на Habr: прикладной опыт разработчиков, разборы архитектур и инженерные находки.',
        ctx.simonStories[1]
          ? `**${ctx.simonStories[1].title}**: авторский кейс сообщества и прикладная схемотехника.`
          : 'Инженерный лонгрид сообщества: разбор архитектурных граблей и решение проблем производительности в проде.',
      ];

      presijoBullets = [
        ctx.presijoStories[0]
          ? `**${ctx.presijoStories[0].title}**: релиз нового AI-инструмента/библиотеки и сценарии внедрения.`
          : 'Радар AI-инструментов: появление новых автономных агентов и локальных CLI-утилит на рынке.',
        ctx.presijoStories[1]
          ? `**${ctx.presijoStories[1].title}**: свежая фича и тренды из профильных Telegram-каналов.`
          : 'Релизы библиотек: обновления в экосистеме Hugging Face, vLLM и LangChain для высоконагруженных пайплайнов.',
      ];
    }

    const markdownText = `${headerTitle}

> **Формат:** ${formatDesc}  
> **Оптики в эфире:** ⚡ Акация IT • 📟 Саймон • 🚀 Presijo AI & IT  

---

#### ⚡ Hi-Tech, Девайсы & Анонсы (Акация IT)
${okatsiyaBullets.map((b) => `- ${b}`).join('\n')}

👉 [В тред к Акации IT (обсудить ${timeframeLabel}) ↗](action:curator:okatsiya?timeframe=${timeframe})

#### 📟 Разбор публикаций и статей Habr (Саймон)
${simonBullets.map((b) => `- ${b}`).join('\n')}

👉 [В тред к Саймону (обсудить ${timeframeLabel}) ↗](action:curator:simon-habr?timeframe=${timeframe})

#### 🚀 AI Инструменты, Библиотеки & Telegram (Presijo AI & IT)
${presijoBullets.map((b) => `- ${b}`).join('\n')}

👉 [В тред к Presijo (обсудить ${timeframeLabel}) ↗](action:curator:presijo-ai?timeframe=${timeframe})

---
💡 *Сводка собрана в компактном формате. Вы можете перейти в личный тред каждого куратора для детального разбора.*`;

    const suggestedCard = {
      title: `[Резюме] IT & AI Панорама (${timeframe === 'week' ? 'неделя' : timeframe === 'month' ? 'месяц' : 'день'}, ${ctx.date})`,
      description: `## IT & AI Группа: Панорама за ${timeframeLabel} (${ctx.date})

> **Кураторы:** ⚡ IT & AI Группа (Акация IT, Саймон, Presijo AI & IT)  
> **Период:** ${timeframe === 'week' ? '7 дней' : timeframe === 'month' ? '30 дней' : 'Сегодня'}  

### Ключевые аспекты:
- **Hi-Tech & Анонсы (Акация IT):** Девайсы, чипы, анонсы BigTech и потребительская электроника.
- **Статьи и Habr (Саймон):** Разборы инженерных публикаций, архитектура и опыт сообщества.
- **AI Инструменты & Тренды (Presijo AI & IT):** Новые тулзы, библиотеки, фичи и Telegram-каналы.

---
*Сформировано технологическим деском Project Lenta.*`,
      type: NoteType.EVENT,
      folder: 'Tech/Daily',
      taxonomyPath: 'tech.daily_summary',
      hashtags: ['IT', 'AI', 'Habr', 'HiTech', 'Инструменты', 'Коллегия'],
      curator: 'IT & AI Группа',
    };

    const isTg = isTelegramPostRequested(ctx.prompt);
    const postBullets = [
      ...okatsiyaBullets.slice(0, 1),
      ...simonBullets.slice(0, 1),
      ...presijoBullets.slice(0, 1),
    ];
    const textOutput = isTg
      ? formatTelegramPostContent({
          contourTitle: 'IT & AI Группа',
          curatorEmoji: '⚡',
          curatorName: 'Технологический сводный деск',
          date: ctx.date,
          period: timeframe === 'week' ? 'week' : 'today',
          bullets: postBullets,
          takeaway: 'Синхронизация аппаратных анонсов, инженерного опыта разработчиков и взрывного роста прикладных AI-инструментов.',
          hashtags: ['IT', 'AI', 'Habr', 'HiTech', 'DevTools', 'Технологии'],
        })
      : markdownText;

    return {
      id: `msg-tech-group-${Date.now()}`,
      sender: 'tech-group',
      senderName: 'IT & AI Группа',
      senderRole:
        timeframe === 'week'
          ? 'Недельный технологический деск'
          : timeframe === 'month'
          ? 'Месячный технологический деск'
          : 'Сводный деск IT & AI кураторов',
      avatar: '⚡',
      text: textOutput,
      timestamp: ctx.timestamp,
      messageType: isTg ? 'TELEGRAM_POST' : 'DEFAULT',
      metadata: {
        format: isTg ? 'telegram_post' : 'summary',
        period: timeframe,
        curatorId: 'tech-group',
        dateScope: ctx.date,
      },
      sources: ['TechCrunch', 'The Verge', 'Habr', 'GitHub Trending', 'Hugging Face', 'Telegram AI Channels'],
      suggestedCard,
    };
  }

  /**
   * Simon: Habr articles analysis, engineering breakdowns, hardware/schematics and community writeups
   */
  private static generateSimonResponse(ctx: {
    prompt: string;
    date: string;
    stories: DailyNewsCard[];
    events: any[];
    timestamp: string;
  }): ChatMessage {
    const mainStory = ctx.stories[0];
    const secondaryStory = ctx.stories[1];

    const bullets = [
      mainStory
        ? `**${mainStory.title}** (Источник: ${mainStory.source}): практический разбор статьи с выделением ключевых инженерных тезисов и выводов.`
        : 'Свежие публикации на Habr: прикладной опыт разработчиков, разборы архитектур и инженерные находки.',
      secondaryStory
        ? `**${secondaryStory.title}**: авторский кейс сообщества, дополняющий общую картину практики.`
        : 'Олдскул и схемотехника: разборы старых плат, микроконтроллеров и анализ ретро-архитектур от инженеров сообщества.',
      'Материалы сообщества проверены и структурированы для включения в базу знаний и тематические Super Notes.',
    ];

    const isTg = isTelegramPostRequested(ctx.prompt);
    const isWeek = ctx.prompt.toLowerCase().includes('week') || ctx.prompt.toLowerCase().includes('недел');
    const period = isWeek ? 'week' : 'today';

    const text = isTg
      ? formatTelegramPostContent({
          contourTitle: 'Habr & Инженерное сообщество',
          curatorEmoji: '📟',
          curatorName: 'Саймон',
          date: ctx.date,
          period,
          bullets,
          takeaway: 'Меньше корпоративного пафоса — смотрим на то, что инженеры реально пишут в статьях и собирают руками.',
          hashtags: ['Habr', 'Хабр', 'ITСтатьи', 'Инженерия', 'РазборСтатей'],
        })
      : `### 📟 Разбор публикаций Habr от Саймона

Меньше корпоративного пафоса и громких пресс-релизов — смотрим на то, что реально пишет сообщество и практики.

По материалам на **${ctx.date}**:

${bullets.map((b) => `- ${b}`).join('\n')}

> **Ремарка Саймона:**  
> «Акация пусть рассказывает про презентации в долине и котировки бигтеха, а на нашей кухне важны живые статьи: что люди собирают руками, как решают проблемы в проде и какие инженерные подходы дают реальный результат.  
> Все проверенные материалы с Хабра разложены по полочкам и готовы для упаковки в базу знаний.»`;

    const suggestedCard = {
      title: mainStory
        ? `[Habr] ${mainStory.title}`
        : `[Habr Дайджест] Разбор статей IT-сообщества (${ctx.date})`,
      description: `## 📟 Разбор публикаций Habr и IT-статей: ${ctx.date}

### Ключевые материалы сообщества:
1. ${mainStory ? mainStory.title : 'Инженерный лонгрид на Habr'} — подробный разбор и практические выводы.
2. ${secondaryStory ? secondaryStory.title : 'Ретро-схемотехника и платы'} — нестандартный взгляд из архивов.

### Выводы для базы знаний:
- Статьи проверены и структурированы для включения в тематический кластер.
- Подготовлены ссылки и теги для последующей передачи в NotebookLM.

---
*Сформировано куратором публикаций Habr Саймоном в Project Lenta.*`,
      type: NoteType.SINGLE,
      folder: 'Tech/Habr',
      taxonomyPath: 'tech.community.habr',
      hashtags: ['Habr', 'ITСтатьи', 'Хабр', 'Инженерия', 'Сообщество'],
      curator: 'Саймон',
      sourceLink: mainStory?.url || 'https://habr.com',
    };

    const newsPosts: TelegramNewsPreview[] = ctx.stories.map((s, idx) => ({
      id: `simon-post-${idx}-${ctx.date}`,
      title: s.title,
      summary: s.summary,
      rawText: s.summary,
      curatorId: 'simon-habr',
      curatorName: 'Саймон',
      curatorEmoji: '📟',
      curatorRole: 'Специалист по разбору новостей с Habr',
      sourceName: s.source || 'Habr',
      sourceUrl: s.url,
      tags: s.suggestedTags?.length ? s.suggestedTags : ['Habr', 'Инженерия', 'Разбор'],
      keyPoints: s.keyPoints?.length ? s.keyPoints : ['Практический опыт разработчиков.', 'Архитектурные паттерны и олдскул.'],
      contourBadge: '📟 Habr / Инженерный разбор сообщества',
      publishedAt: s.publishedAt || '14:20',
    }));

    return {
      id: `msg-simon-${Date.now()}`,
      sender: 'simon-habr',
      senderName: 'Саймон',
      senderRole: 'Специалист по разбору новостей с Habr',
      avatar: '📟',
      text,
      timestamp: ctx.timestamp,
      messageType: isTg ? 'TELEGRAM_POST' : 'DEFAULT',
      metadata: {
        format: isTg ? 'telegram_post' : 'analysis',
        period,
        curatorId: 'simon-habr',
        dateScope: ctx.date,
      },
      sources: ctx.stories.map((s) => s.source).filter(Boolean),
      newsPosts,
      suggestedCard,
    };
  }

  /**
   * Presijo: AI & IT trends, new tools on the market, features, library releases, Telegram channels, content making
   */
  private static generatePresijoResponse(ctx: {
    prompt: string;
    date: string;
    stories: DailyNewsCard[];
    events: any[];
    timestamp: string;
  }): ChatMessage {
    const mainStory = ctx.stories[0];
    const secondaryStory = ctx.stories[1];

    const bullets = [
      mainStory
        ? `**${mainStory.title}** (${mainStory.source}): новый AI-инструмент / фича. Ключевые возможности, сценарии интеграции и юзкейсы.`
        : 'Свежие релизы AI-инструментов: появление новых автономных агентов, devtools и локальных CLI-утилит на рынке.',
      secondaryStory
        ? `**${secondaryStory.title}**: мажорное обновление библиотек и расширение API.`
        : 'Релизы библиотек: обновления в экосистеме Hugging Face, vLLM, PyTorch и LangChain для высоконагруженных пайплайнов.',
      'Пульс Telegram-каналов и контент-мейкинг: виральные промпты, кейсы генерации контента и свежие бенчмарки моделей от практиков.',
    ];

    const isTg = isTelegramPostRequested(ctx.prompt);
    const isWeek = ctx.prompt.toLowerCase().includes('week') || ctx.prompt.toLowerCase().includes('недел');
    const period = isWeek ? 'week' : 'today';

    const text = isTg
      ? formatTelegramPostContent({
          contourTitle: 'AI Инструменты, Библиотеки & Тренды',
          curatorEmoji: '🚀',
          curatorName: 'Presijo AI & IT',
          date: ctx.date,
          period,
          bullets,
          takeaway: 'Рынок AI-инструментов стремительно коммодитизируется — выигрывают тулзы с мгновенным временем до первого результата и чистым API.',
          hashtags: ['AI', 'Tools', 'Библиотеки', 'Telegram', 'КонтентМейкинг', 'TechTrends'],
        })
      : `### 🚀 Presijo: Радар AI-инструментов, библиотек и трендов (${ctx.date})

Оперативный мониторинг прикладного ландшафта AI, новых тулзов на рынке и пульса профильных Telegram-каналов:

---

#### 🛠️ 1. Новые инструменты & свежие фичи:
- ${mainStory ? `**${mainStory.title}** (${mainStory.source}): ${mainStory.summary}` : '**Автономные агенты и Copilot-утилиты:** появление инструментов с поддержкой MCP-протокола и локального исполнения кода.'}
- **Инструменты генерации контента:** новые мультимодальные генераторы графики, аудио и видео для контент-мейкеров.

#### 📦 2. Релизы библиотек & Open-Source:
- ${secondaryStory ? `**${secondaryStory.title}**: ${secondaryStory.summary}` : '**Экосистема LLM-инференса:** новые релизы библиотек vLLM, Ollama и Hugging Face Transformers с оптимизацией потребления памяти.'}
- **Оркестрация агентов:** обновления фреймворков для управления цепочками рассуждений (reasoning chains) и инструментами.

#### 📱 3. Пульс Telegram-каналов & Контент-мейкинг:
- Анализ трендов из ведущих AI-каналов: кейсы автоматизации рутины, практические связки промптов и упаковка сложных инсайтов в виральные посты.

---

> **Инсайт от Presijo:** Главный тренд — переход от вау-эффекта к практической пользе. Выигрывают инструменты, которые можно за 5 минут встроить в существующий рабочий процесс или Telegram-канал без разворачивания тяжелой инфраструктуры.`;

    const suggestedCard = {
      title: mainStory
        ? `[AI Tools & Libs] ${mainStory.title}`
        : `🚀 [AI Радар] Новые инструменты, библиотеки и тренды (${ctx.date})`,
      description: `## 🚀 Presijo AI & IT: Радар инструментов и трендов (${ctx.date})

> **Куратор:** 🚀 Presijo AI & IT  
> **Фокус:** AI инструменты, фичи, библиотеки, Telegram, контент  

### Ключевые направления:
- **Инструменты на рынке:** Свежие тулзы, генераторы, плагины и расширения.
- **Библиотеки & Dev:** Обновления open-source фреймворков и библиотек.
- **Telegram & Контент:** Тренды каналов, форматы упаковки и виральные кейсы.

---
*Сформировано AI-трендхантером Presijo в Project Lenta.*`,
      type: NoteType.EVENT,
      folder: 'Tech/AI-Tools',
      taxonomyPath: 'tech.ai.tools',
      hashtags: ['AI', 'Tools', 'Библиотеки', 'Telegram', 'КонтентМейкинг', 'Релизы'],
      curator: 'Presijo AI & IT',
      sourceLink: mainStory?.url,
    };

    const newsPosts: TelegramNewsPreview[] = ctx.stories.map((s, idx) => ({
      id: `presijo-post-${idx}-${ctx.date}`,
      title: s.title,
      summary: s.summary,
      rawText: s.summary,
      curatorId: 'presijo-ai',
      curatorName: 'Presijo AI & IT',
      curatorEmoji: '🚀',
      curatorRole: 'AI & IT тренд-хантер, контент-мейкер и обозреватель инструментов',
      sourceName: s.source || 'AI Radar / Telegram',
      sourceUrl: s.url,
      tags: s.suggestedTags?.length ? s.suggestedTags : ['AI', 'Tools', 'Библиотеки', 'Telegram'],
      keyPoints: s.keyPoints?.length ? s.keyPoints : ['Новые AI инструменты и фичи.', 'Релизы библиотек и Telegram-тренды.'],
      contourBadge: '🚀 Presijo / AI Инструменты, Библиотеки & Telegram',
      publishedAt: s.publishedAt || '15:45',
    }));

    return {
      id: `msg-presijo-${Date.now()}`,
      sender: 'presijo-ai',
      senderName: 'Presijo AI & IT',
      senderRole: 'AI & IT тренд-хантер, контент-мейкер и обозреватель инструментов',
      avatar: '🚀',
      text,
      timestamp: ctx.timestamp,
      messageType: isTg ? 'TELEGRAM_POST' : 'DEFAULT',
      metadata: {
        format: isTg ? 'telegram_post' : 'analysis',
        period,
        curatorId: 'presijo-ai',
        dateScope: ctx.date,
      },
      sources: ctx.stories.map((s) => s.source).filter(Boolean),
      newsPosts,
      suggestedCard,
    };
  }

  /**
   * Optional Gemini LLM generation if API key is provided
   */
  private static async generateViaGemini(ctx: {
    prompt: string;
    resolvedTarget: AgentId | 'all';
    date: string;
    contextCards: DailyNewsCard[];
    politicalEvents: any[];
    apiKey: string;
  }): Promise<ChatMessage[] | null> {
    const systemPrompt = `Ты — координирующий аналитический движок мультиагентной системы Project Lenta.
Текущая дата: ${ctx.date}.
В системе работают ключевые кураторы и группы:
1. 🏛️ Политическая коллегия (political-group): Единая группа кураторов (РФ, США, Ближний Восток, Свежие новости). Если запрос направлен к ней, сформируй МОДУЛЬНОЕ РЕЗЮМЕ по контурам (Иван Белый, Kirk Kitten, Тарик Саид, Алекс Вектор).
2. ⚡ IT & AI Группа (tech-group): Единая технологическая группа. Модульное резюме по специализациям: Акация IT (Hi-Tech, девайсы, анонсы), Саймон (разбор статей с Habr), Presijo AI & IT (AI инструменты, библиотеки, Telegram).
3. 🇷🇺 Иван Белый (ivan-bely): Внутренний контур РФ (законы, Госдума, бюджет, ФАС, ЦБ РФ, топливный демпфер, внутренние цены).
4. 🌐 Kirk Kitten (kirk-kitten): Международный контур и США (OFAC, санкции, Конгресс, фрахт, глобальные рынки).
5. 🕌 Тарик Саид (tariq-said): Ближний Восток (MENA, страны Залива, OPEC+, региональная безопасность).
6. 🔥 Алекс Вектор (alex-vector): Свежие политические новости, общая мировая повестка, breaking news, саммиты.
7. ⚡ Акация IT (okatsiya): Hi-Tech, IT & AI индустрия, новые девайсы, громкие анонсы BigTech.
8. 📟 Саймон (simon-habr): Разбор публикаций и инженерных статей с Habr, опыт сообщества, схемотехника.
9. 🚀 Presijo AI & IT (presijo-ai): AI инструменты, библиотеки, фичи, мониторинг Telegram-каналов, контент.
10. 🇨🇳 Чэнь Вэй (chen-wei): Восточный контур (Китай, АТР, БРИКС, нацвалюты, торговые коридоры).
11. ⚓ Хелена Брандт (helena-brandt): Критические артерии, нефть, сырье, морские проливы.

Контекст новостей на дату:
${JSON.stringify(ctx.contextCards.map((c) => ({ title: c.title, source: c.source, summary: c.summary, curator: c.suggestedCurator })))}

События календаря:
${JSON.stringify(ctx.politicalEvents.map((e) => ({ title: e.title, description: e.description })))}

Запрос пользователя: "${ctx.prompt}"
Целевой агент: "${ctx.resolvedTarget}"

Верни строго JSON массив ответов (без markdown блоков \`\`\`json):
[
  {
    "sender": "political-group" | "tech-group" | "ivan-bely" | "kirk-kitten" | "tariq-said" | "alex-vector" | "okatsiya" | "simon-habr" | "presijo-ai",
    "senderName": "Имя агента или группы",
    "senderRole": "Роль",
    "avatar": "эмодзи",
    "text": "Ответ в Markdown",
    "suggestedCard": {
      "title": "Заголовок для календаря",
      "description": "Markdown текст карточки",
      "type": "SINGLE" | "EVENT" | "PERIOD" | "DONE",
      "folder": "Politics/Daily" | "Politics/Russia",
      "taxonomyPath": "politics.daily_summary" | "politics.russia",
      "hashtags": ["тег1", "тег2"],
      "curator": "Политическая коллегия" | "ivan-bely" | "kirk-kitten"
    }
  }
]`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${ctx.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.6,
        },
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) return null;

    const parsed = JSON.parse(candidateText);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;

    return parsed.map((item: any, index: number) => ({
      id: `gemini-reply-${Date.now()}-${index}`,
      sender: item.sender || 'political-group',
      senderName: item.senderName || 'Политическая коллегия',
      senderRole: item.senderRole || 'Аналитический деск',
      avatar: item.avatar || '🏛️',
      text: item.text || '',
      timestamp: new Date().toISOString(),
      suggestedCard: item.suggestedCard,
    }));
  }

  // ---------------------------------------------------------------------------
  // Worker Agents Dispatcher Handlers
  // ---------------------------------------------------------------------------

  private static async handleSurveyCoordinator(ctx: {
    prompt: string;
    date: string;
    contextCards: DailyNewsCard[];
    politicalEvents: any[];
    geminiApiKey?: string;
    timestamp: string;
  }): Promise<ChatMessage> {
    const lower = ctx.prompt.toLowerCase();

    // Determine timeframe
    let timeframe: SurveyTimeframe = 'today';
    if (lower.includes('вчера') || lower.includes('yesterday')) {
      timeframe = 'yesterday';
    } else if (lower.includes('недел') || lower.includes('week') || lower.includes('7 дн')) {
      timeframe = 'week';
    } else if (lower.includes('3 дн') || lower.includes('три дня')) {
      timeframe = 'three_days';
    }

    // Determine target curators/group
    let targetCurators: string[] | 'all' = 'all';
    let groupId: string | undefined;

    if (lower.includes('политик') || lower.includes('politics')) {
      groupId = 'political-group';
    } else if (lower.includes('it') || lower.includes('ai') || lower.includes('технолог') || lower.includes('окаци')) {
      groupId = 'tech-group';
    } else if (lower.includes('макро') || lower.includes('рынк')) {
      groupId = 'macro-group';
    } else if (lower.includes('пульс') || lower.includes('breaking') || lower.includes('hot') || lower.includes('быстрого реагирования')) {
      groupId = 'hot-pulse-group';
    } else if (lower.includes('домино') || lower.includes('nexus') || lower.includes('ветвлен') || lower.includes('каскад') || lower.includes('эффект домино')) {
      groupId = 'domino-nexus-group';
    } else if (lower.includes('восток') || lower.includes('mena') || lower.includes('залив') || lower.includes('ирак') || lower.includes('левант')) {
      groupId = 'mena-security-group';
    }

    const surveyResult = await CuratorSurveyAgent.survey({
      request: {
        timeframe,
        groupId,
        targetCurators: groupId ? undefined : targetCurators,
      },
      referenceDate: ctx.date,
      contextCards: ctx.contextCards,
      politicalEvents: ctx.politicalEvents,
      geminiApiKey: ctx.geminiApiKey,
    });

    const markdown = CuratorSurveyAgent.formatToMarkdown(surveyResult);

    return {
      id: `msg-survey-${Date.now()}`,
      sender: 'survey-coordinator',
      senderName: 'Координатор Опросов',
      senderRole: 'Агент-опросчик и диспетчер групп кураторов',
      avatar: '🧭',
      text: markdown,
      timestamp: ctx.timestamp,
      curatorSurvey: surveyResult,
    };
  }

  private static async handleSideWorkProducer(ctx: {
    prompt: string;
    date: string;
    contextCards: DailyNewsCard[];
    timestamp: string;
    geminiApiKey?: string;
  }): Promise<ChatMessage> {
    const lower = ctx.prompt.toLowerCase();

    let taskType: 'content_draft' | 'media_enrichment' | 'expert_commentary' = 'content_draft';
    if (
      lower.includes('медиа') ||
      lower.includes('промпт') ||
      lower.includes('схем') ||
      lower.includes('диаграмм') ||
      lower.includes('картинк')
    ) {
      taskType = 'media_enrichment';
    } else if (lower.includes('коммент')) {
      taskType = 'expert_commentary';
    }

    let targetFormat: 'telegram_post' | 'obsidian_note' | 'longread' = 'telegram_post';
    if (lower.includes('obsidian') || lower.includes('note') || lower.includes('заметк') || lower.includes('done')) {
      targetFormat = 'obsidian_note';
    } else if (lower.includes('лонгрид') || lower.includes('стать')) {
      targetFormat = 'longread';
    }

    const sourceContext =
      ctx.contextCards.slice(0, 5).map((c) => `[${c.suggestedCurator}] ${c.title}`).join('\n') || ctx.prompt;

    const sideWorkResult = await SideWorkAgent.execute({
      request: {
        taskType,
        targetFormat,
        sourceContext,
        mediaPreferences: {
          includeImagePrompts: true,
          includeMermaidDiagrams: true,
        },
      },
      date: ctx.date,
      geminiApiKey: ctx.geminiApiKey,
    });

    const markdown = SideWorkAgent.formatToMarkdown(sideWorkResult);

    return {
      id: `msg-sidework-${Date.now()}`,
      sender: 'sidework-producer',
      senderName: 'Продюсер Сайд-Работы',
      senderRole: 'Агент контент-продакшна и медиа-обогащения',
      avatar: '🎨',
      text: markdown,
      timestamp: ctx.timestamp,
      sideWorkResult,
    };
  }

  private static handleHarvester(ctx: {
    prompt: string;
    contextCards: DailyNewsCard[];
    timestamp: string;
  }): ChatMessage {
    const rawItems = ctx.contextCards.map((c) => ({
      id: c.id,
      date: c.date,
      title: c.title,
      source: c.source,
      url: c.url,
      rawText: c.summary,
    }));

    const harvestResult = NewsHarvesterAgent.harvest(rawItems);
    const markdown = NewsHarvesterAgent.formatToMarkdown(harvestResult);

    return {
      id: `msg-harvest-${Date.now()}`,
      sender: 'harvester-agent',
      senderName: 'Информационный Харвестер',
      senderRole: 'Агент сбора данных и мониторинга первоисточников',
      avatar: '📡',
      text: markdown,
      timestamp: ctx.timestamp,
    };
  }

  private static generateGenericCuratorResponse(
    curatorId: CuratorId,
    ctx: {
      prompt: string;
      date: string;
      stories: DailyNewsCard[];
      events: any[];
      timestamp: string;
    },
  ): ChatMessage {
    const persona = getCuratorPersona(curatorId);
    const name = persona?.name || curatorId;
    const role = persona?.role || 'Предметный куратор';
    const emoji = persona?.emoji || '👤';
    const mainStory = ctx.stories[0];
    const isTg = isTelegramPostRequested(ctx.prompt);
    const isWeek = ctx.prompt.toLowerCase().includes('week') || ctx.prompt.toLowerCase().includes('недел');
    const period = isWeek ? 'week' : 'today';

    const bullets = ctx.stories.length > 0
      ? ctx.stories.map((s) => `**${s.title}**: ${s.summary.substring(0, 140)}...`)
      : ['Мониторинг первичных источников по предметному домену. Оценка сигналов в норме.'];

    const text = isTg
      ? formatTelegramPostContent({
          contourTitle: persona?.scope?.split(',')[0] || name,
          curatorEmoji: emoji,
          curatorName: name,
          date: ctx.date,
          period,
          bullets,
          takeaway: `Зафиксирован аналитический приоритет по направлению ${name}. Сюжеты классифицированы и готовы к включению в базу знаний.`,
          hashtags: [name.replace(/\s+/g, ''), 'Аналитика', 'Мониторинг'],
        })
      : `### ${emoji} ${name}: Аналитический срез (${ctx.date})\n\n` +
        `**Оптика:** ${persona?.description || persona?.scope}\n\n` +
        (mainStory
          ? `**Ключевой сюжет:** «${mainStory.title}»\n` +
            `> ${mainStory.summary}\n\n` +
            `**Оценка контура:** Зафиксирован высокий аналитический приоритет. Потенциал ветвления сюжета в смежные сферы: \`${mainStory.branchingPotentialScore || 85}%\`.\n`
          : `*Прямых триггеров в оперативной ленте за текущие сутки не зафиксировано. Продолжается непрерывный мониторинг входящих сигналов по домену.*`);

    const newsPosts: TelegramNewsPreview[] = ctx.stories.map((s, idx) => ({
      id: `${curatorId}-post-${idx}-${ctx.date}`,
      title: s.title,
      summary: s.summary,
      rawText: s.summary,
      curatorId,
      curatorName: name,
      curatorEmoji: emoji,
      curatorRole: role,
      sourceName: s.source || 'Primary Wire',
      sourceUrl: s.url,
      tags: s.suggestedTags?.length ? s.suggestedTags : [name, 'Аналитика'],
      keyPoints: s.keyPoints?.length ? s.keyPoints : [s.summary.substring(0, 100)],
      contourBadge: `${emoji} ${name} / ${persona?.scope?.split(',')[0]}`,
      publishedAt: s.publishedAt || '12:00',
    }));

    return {
      id: `msg-${curatorId}-${Date.now()}`,
      sender: curatorId,
      senderName: name,
      senderRole: role,
      avatar: emoji,
      text,
      timestamp: ctx.timestamp,
      messageType: isTg ? 'TELEGRAM_POST' : 'DEFAULT',
      metadata: {
        format: isTg ? 'telegram_post' : 'analysis',
        period,
        curatorId,
        dateScope: ctx.date,
      },
      sources: ctx.stories.map((s) => s.source).filter(Boolean),
      newsPosts,
    };
  }
}
