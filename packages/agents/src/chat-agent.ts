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
  ResonanceNodeCandidate,
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
        command === '/it' ||
        command === '/it-today' ||
        command === '/it-week' ||
        command === '/it-month' ||
        command === '/ai' ||
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
            ? 'Недельный дайджест IT & AI: модели, инфраструктура, BigTech'
            : tf === 'month'
            ? 'Месячная панорама IT & AI: ключевые сдвиги, релизы и регулирование'
            : subSector !== 'it' && subSector !== 'okatsiya'
            ? `Новости по отрасли ${subSector}`
            : 'Ключевые новости IT и AI на сегодня');
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
        command === '/german' ||
        command === '/habr' ||
        command === '/xakep'
      ) {
        resolvedTarget = 'german-kernel';
        cleanPrompt =
          parts.slice(1).join(' ').trim() ||
          (command === '/xakep'
            ? 'Разбор материалов журнала «Хакер» (xakep.ru) и подготовка тематической Super Note'
            : command === '/habr'
            ? 'Аналитический разбор публикаций с Habr и IT-статей с группировкой тем в Note'
            : 'Обзор IT-статей, публикаций на Habr и материалов «Хакера» от Германа');
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
        lower.includes('окация') ||
        lower.includes('акация') ||
        lower.includes('okatsiya') ||
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
        resolvedTarget = 'german-kernel';
      } else if (
        lower.includes('notebooklm') ||
        lower.includes('создай дневник') ||
        lower.includes('сделай дневник')
      ) {
        resolvedTarget = 'notebook-producer';
      } else if (lower.includes('чэнь') || lower.includes('китай') || lower.includes('атр') || lower.includes('брикс') || lower.includes('юань')) {
        resolvedTarget = 'chen-wei';
      } else if (lower.includes('алекс') || lower.includes('alex') || lower.includes('breaking') || lower.includes('горячие новости') || lower.includes('пульс') || lower.includes('молния')) {
        resolvedTarget = 'alex-vector';
      } else if (lower.includes('маркус') || lower.includes('marcus') || lower.includes('домино') || lower.includes('ветвление') || lower.includes('nexus') || lower.includes('каскад')) {
        resolvedTarget = 'marcus-vane';
      } else if (lower.includes('тарик') || lower.includes('tariq') || lower.includes('ближний восток') || lower.includes('mena') || lower.includes('залив') || lower.includes('ирак') || lower.includes('левант')) {
        resolvedTarget = 'tariq-said';
      } else if (lower.includes('хелена') || lower.includes('helena') || lower.includes('нефть') || lower.includes('сырье') || lower.includes('пролив') || lower.includes('ормуз') || lower.includes('суэц') || lower.includes('фрахт')) {
        resolvedTarget = 'helena-brandt';
      } else if (lower.includes('иван') || lower.includes('рф') || lower.includes('госдум') || lower.includes('бюджет')) {
        resolvedTarget = 'ivan-bely';
      } else if (lower.includes('kirk') || lower.includes('кирк') || lower.includes('оон') || lower.includes('ofac') || lower.includes('санкци')) {
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
      } else if (lower.includes('синтез') || lower.includes('независим') || lower.includes('арбитраж') || lower.includes('сопостав')) {
        resolvedTarget = 'independent-analyst';
      }
    }

    const replies: ChatMessage[] = [];
    const timestamp = new Date().toISOString();

    // Filter relevant stories from context for today
    const ivanStories = contextCards.filter(
      (c) => c.suggestedCurator === 'ivan-bely' || c.category.includes('Внутренняя'),
    );
    const kirkStories = contextCards.filter(
      (c) => c.suggestedCurator === 'kirk-kitten' || c.category.includes('Международный'),
    );
    const chenStories = contextCards.filter(
      (c) => c.suggestedCurator === 'chen-wei' || c.category.includes('Азия') || c.category.includes('Китай') || c.category.includes('БРИКС'),
    );
    const okatsiyaStories = contextCards.filter(
      (c) => c.suggestedCurator === 'okatsiya' || c.category.includes('IT') || c.category.includes('Интеллект'),
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

    // A. Political Group: Consolidated Modular Summary + Resonance Node Detection
    if (resolvedTarget === 'political-group') {
      replies.push(
        this.generatePoliticalGroupSummary({
          prompt: cleanPrompt,
          date,
          ivanStories: ivanStories.length > 0 ? ivanStories : contextCards.slice(0, 2),
          kirkStories: kirkStories.length > 0 ? kirkStories : contextCards.slice(1, 3),
          chenStories: chenStories.length > 0 ? chenStories : contextCards.slice(2, 4),
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

    if (resolvedTarget === 'independent-analyst' || resolvedTarget === 'all') {
      replies.push(
        this.generateIndependentAnalysis({
          prompt: cleanPrompt,
          date,
          ivanStories,
          kirkStories,
          chenStories,
          events: todayEvents,
          timestamp,
        }),
      );
    }

    if (resolvedTarget === 'german-kernel' || resolvedTarget === 'all') {
      const germanStories = contextCards.filter(
        (c) =>
          c.suggestedCurator === 'german-kernel' ||
          c.source?.toLowerCase().includes('habr') ||
          c.source?.toLowerCase().includes('хабр') ||
          c.source?.toLowerCase().includes('xakep') ||
          c.source?.toLowerCase().includes('хакер') ||
          c.category.includes('IT') ||
          c.category.includes('Схемотехника') ||
          c.category.includes('Hardware'),
      );
      replies.push(
        this.generateGermanResponse({
          prompt: cleanPrompt,
          date,
          stories: germanStories.length > 0 ? germanStories : contextCards.slice(0, 3),
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
        resonanceScore: 86,
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
        resonanceScore: 86,
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
> **Резонанс:** \`91%\`

### Ключевые аспекты:
${bullets.map((b) => `- ${b}`).join('\n')}

---
*Сформировано куратором технологий Окацией в Project Lenta.*`,
        type: NoteType.EVENT,
        folder: 'Tech/AI',
        taxonomyPath: 'tech.ai.llm',
        hashtags: ['IT', 'AI', 'LLM', 'Нейросети', 'MachineLearning'],
        curator: 'Окация',
        resonanceScore: 91,
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
        resonanceScore: 91,
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
> **Резонанс:** \`88%\`

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
      resonanceScore: 88,
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
      resonanceScore: 88,
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
      resonanceScore: 82,
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
      resonanceScore: s.resonanceScore || 82,
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
      resonanceScore: 82,
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
      resonanceScore: 89,
    };

    return {
      id: `msg-notebook-${Date.now()}`,
      sender: 'notebook-producer',
      senderName: 'Режиссер NotebookLM',
      senderRole: 'Агент создания дневников и подкастов NotebookLM',
      avatar: '📓',
      text,
      timestamp: ctx.timestamp,
      resonanceScore: 89,
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
> **Резонанс:** \`82%\`

### Ключевые аспекты:
${bullets.map((b) => `- ${b}`).join('\n')}

---
*Сформировано аналитическим деском Project Lenta.*`,
      type: NoteType.EVENT,
      folder: 'Politics/Russia',
      taxonomyPath: 'politics.russia.regulations',
      hashtags: ['ПолитикаРФ', 'Госдума', 'ФАС', 'Бюджет', 'Регуляторика'],
      curator: 'ivan-bely',
      resonanceScore: 82,
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
      resonanceScore: s.resonanceScore || 84,
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
      resonanceScore: 82,
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
> **Резонанс:** \`87%\`

### Ключевые маркеры:
${bullets.map((b) => `- ${b}`).join('\n')}

---
*Сформировано аналитическим деском Project Lenta.*`,
      type: NoteType.EVENT,
      folder: 'Politics/Sanctions',
      taxonomyPath: 'politics.international.sanctions',
      hashtags: ['OFAC', 'Санкции', 'Логистика', 'Танкеры', 'МировыеРынки'],
      curator: 'kirk-kitten',
      resonanceScore: 87,
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
      resonanceScore: s.resonanceScore || 88,
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
      resonanceScore: 87,
      sources: ctx.stories.map((s) => s.source).filter(Boolean),
      newsPosts,
      suggestedCard,
    };
  }

  /**
   * Independent Analyst: Neutral cross-boundary synthesis and arbitration
   */
  private static generateIndependentAnalysis(ctx: {
    prompt: string;
    date: string;
    ivanStories: DailyNewsCard[];
    kirkStories: DailyNewsCard[];
    chenStories?: DailyNewsCard[];
    events: any[];
    timestamp: string;
  }): ChatMessage {
    const promptLower = ctx.prompt.toLowerCase();
    const isChenOrAsia =
      promptLower.includes('чэнь') ||
      promptLower.includes('китай') ||
      promptLower.includes('клиринг') ||
      promptLower.includes('брикс') ||
      promptLower.includes('нацвалют');

    if (isChenOrAsia) {
      // Targeted Synthesis: Ivan Bely ⟷ Chen Wei (Cross-border payments & trade logistics)
      const text = `### ⚖️ Точечный кросс-контурный синтез: Платежная инфраструктура и товарооборот БРИКС

**Предмет синтеза:** Взаимное влияние регуляторных решений РФ и расширения валютного клиринга в АТР на **${ctx.date}**.  
**Участники узла:** 🇷🇺 Иван Белый ⟷ 🇨🇳 Чэнь Вэй  
**Индекс резонанса:** \`79%\`

---

#### 1. Фактологическая проверка контуров:
- **Контур РФ (Иван Белый):** Фиксирует необходимость обеспечения предсказуемости валютных поступлений в бюджет 2027–2029 и защиту экспортеров от вторичного комплаенса западных банков.
- **Восточный контур (Чэнь Вэй):** Фиксирует рост межбанковских клиринговых линий Народного Банка Китая и партнеров по БРИКС в национальных валютах без SWIFT на 18%.

#### 2. Объективная причинно-следственная связь:
Переход на прямые расчеты в юанях и рублях и синхронизация логистических каналов Дальнего Востока — это **не просто ситуативная замена валюты, а создание структурной автономии внешней торговли РФ**. Логистические задержки на западном направлении компенсируются ускорением прохождения грузов через восточный полигон.

#### 3. Беспристрастный вердикт:
- **Степень риска:** Низкая (\`30%\`).
- **Прогноз:** Доля расчетов в нацвалютах во взаимной торговле превысит 85% к концу года. Ключевая точка контроля — ликвидность на межбанковском валютном рынке.`;

      const suggestedCard = {
        title: `[Синтез] Кросс-контурный анализ: Независимый клиринг БРИКС и торговый баланс (${ctx.date})`,
        description: `## Аналитический синтез: Внешнеторговый клиринг РФ ↔ АТР / БРИКС

> **Дата:** ${ctx.date}  
> **Арбитр:** ⚖️ Независимый аналитический синтез (Project Lenta)  
> **Участники:** 🇷🇺 Иван Белый & 🇨🇳 Чэнь Вэй  
> **Кросс-резонанс:** \`79%\`  
> **Статус:** Анализ верифицирован, прецедент сохранен.

### 1. Тезис внутреннего контура (Иван Белый):
Защита валютных поступлений бюджета и снижение транзакционных издержек экспортеров.

### 2. Тезис восточного контура (Чэнь Вэй):
Расширение прямых межбанковских клиринговых линий без использования западных финансовых шлюзов.

### 3. Итоговое заключение арбитра:
Торговая переориентация стабильна. Риски вторичных санкций нивелируются альтернативными финансовыми сетями.

---
*Официальный синтетический материал хроники Lemon Calendarium.*`,
        type: NoteType.DONE,
        folder: 'Synthesis/2026',
        taxonomyPath: 'politics.cross_analysis',
        hashtags: ['Синтез', 'Резонанс79', 'БРИКС', 'Клиринг', 'Торговля', 'Арбитраж'],
        curator: 'Независимый аналитик',
        resonanceScore: 79,
      };

      return {
        id: `msg-indep-${Date.now()}`,
        sender: 'independent-analyst',
        senderName: 'Независимый аналитик',
        senderRole: 'Кросс-контурный арбитраж и фактологический синтез',
        avatar: '⚖️',
        text,
        timestamp: ctx.timestamp,
        resonanceScore: 79,
        sources: ['СПбМТСБ', 'Народный Банк Китая', 'Минфин РФ', 'Xinhua'],
        suggestedCard,
      };
    }

    // Default: Targeted Synthesis Ivan Bely ⟷ Kirk Kitten (Oil, freight, OFAC, domestic fuel)
    const text = `### ⚖️ Точечный кросс-контурный синтез: Танкерный фрахт и оптовый рынок РФ

**Предмет синтеза:** Сопоставление встречных сигналов внутреннего контура РФ и зарубежных регуляторов на **${ctx.date}**.  
**Участники узла:** 🇷🇺 Иван Белый ⟷ 🌐 Kirk Kitten  
**Индекс резонанса:** \`89%\`

---

#### 1. Фактологическая проверка позиций:
- **Контур РФ (Иван Белый):** Указывает на внутреннюю стабильность запасов и работу биржевого демпфера. Однако зафиксирован рост локальных оптовых цен на СПбМТСБ.
- **Внешний контур (Kirk Kitten):** Фиксирует рост фрахтовых премий на 15–18% из-за перестрахования танкеров в портах Балтики.

#### 2. Объективная причинно-следственная связь:
Всплеск биржевых цен в РФ не вызван дефицитом сырья на заводах: это **прямое следствие временного затора отгрузок на экспортных терминалах**. Нефтяные компании вынуждены перераспределять логистику по железной дороге, что создает локальное логистическое "бутылочное горлышко".

#### 3. Беспристрастный вердикт:
- **Степень риска:** Умеренная (\`65%\`).
- **Прогноз:** В течение 14–20 дней ситуация нормализуется по мере аккредитации альтернативных страховых компаний и корректировки биржевых нормативов ФАС.`;

    const suggestedCard = {
      title: `[Синтез] Кросс-контурный анализ: Логистические шоки и оптовый рынок РФ (${ctx.date})`,
      description: `## Аналитический синтез: Влияние внешних ограничений на оптовый сектор РФ

> **Дата:** ${ctx.date}  
> **Арбитр:** ⚖️ Независимый аналитический синтез (Project Lenta)  
> **Участники:** 🇷🇺 Иван Белый & 🌐 Kirk Kitten  
> **Кросс-резонанс:** \`89%\`  
> **Статус:** Анализ верифицирован, прецедент сохранен.

### 1. Тезис внутреннего контура (Иван Белый):
Запасы на НПЗ в пределах нормы, но оптовые биржевые котировки реагируют на график отгрузок.

### 2. Тезис внешнего контура (Kirk Kitten):
Новые требования к страховым сертификатам замедляют выход танкеров из портов Черного и Балтийского морей.

### 3. Итоговое беспристрастное заключение:
Дефицита продукции нет. Логистический лаг устраняется в течение двух недель.

---
*Официальный синтетический материал хроники Lemon Calendarium.*`,
      type: NoteType.DONE,
      folder: 'Synthesis/2026',
      taxonomyPath: 'politics.cross_analysis',
      hashtags: ['Синтез', 'Резонанс89', 'ФАС', 'OFAC', 'Логистика', 'Арбитраж'],
      curator: 'Независимый аналитик',
      resonanceScore: 89,
    };

    return {
      id: `msg-indep-${Date.now()}`,
      sender: 'independent-analyst',
      senderName: 'Независимый аналитик',
      senderRole: 'Кросс-контурный арбитраж и фактологический синтез',
      avatar: '⚖️',
      text,
      timestamp: ctx.timestamp,
      resonanceScore: 89,
      sources: ['СПбМТСБ', 'OFAC Treasury', 'ФАС РФ', 'UN News'],
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
> **Резонанс:** \`80%\`

### Ключевые аспекты:
${bullets.map((b) => `- ${b}`).join('\n')}

---
*Сформировано аналитическим деском Project Lenta.*`,
      type: NoteType.EVENT,
      folder: 'Politics/Asia',
      taxonomyPath: 'politics.international.asia',
      hashtags: ['Китай', 'АТР', 'БРИКС', 'Логистика', 'Клиринг'],
      curator: 'chen-wei',
      resonanceScore: 80,
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
      resonanceScore: s.resonanceScore || 82,
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
      resonanceScore: 80,
      sources: ctx.stories.map((s) => s.source).filter(Boolean),
      newsPosts,
      suggestedCard,
    };
  }

  /**
   * Generates a consolidated modular executive summary from the political curators group,
   * scans for thematic overlap, and identifies candidate resonance nodes for targeted synthesis.
   */
  private static generatePoliticalGroupSummary(ctx: {
    prompt: string;
    date: string;
    ivanStories: DailyNewsCard[];
    kirkStories: DailyNewsCard[];
    chenStories: DailyNewsCard[];
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
    let chenBullets: string[] = [];

    if (timeframe === 'week') {
      headerTitle = `### 📅 Политическая коллегия: Панорама за неделю (${ctx.date})`;
      formatDesc = `Краткое недельное резюме по контурам (без визуального шума)`;
      timeframeLabel = 'неделю';

      ivanBullets = [
        `**Недельный баланс топливного рынка** [⚡ Резонанс: 88%]: Минэнерго и ФАС зафиксировали стабилизацию биржевых цен бензина после корректировки нормативов на СПбМТСБ.`,
        `**Налоговые и регуляторные пакеты** [⚡ Резонанс: 83%]: Госдума завершила слушания поправок в Бюджетный кодекс и пакета инвестиционных преференций.`,
        `**Потребительский сектор** [⚡ Резонанс: 80%]: сдерживание инфляционных ожиданий через жесткую денежно-кредитную политику Банка России.`,
      ];

      kirkBullets = [
        `**Недельная динамика санкций** [⚡ Резонанс: 90%]: смещение фокуса директив OFAC и ЕС с прямых эмбарго на сквозной аудит морского фрахта и страховых полисов P&I клубов.`,
        `**Мировые нефтяные рынки и фрахт** [⚡ Резонанс: 87%]: закрепление независимых танкерных пулов на азиатских маршрутах, ставки фрахта стабилизировались.`,
        `**Многосторонние площадки** [⚡ Резонанс: 82%]: итоги консультаций в органах ООН по трансграничной логистике и минеральным удобрениям.`,
      ];

      chenBullets = [
        `**Недельный трек БРИКС и АТР** [⚡ Резонанс: 85%]: оформление межбанковских договоренностей по прямым валютным парам юань/рубль/рупия без участия SWIFT.`,
        `**Логистические узлы Китая** [⚡ Резонанс: 84%]: порты Шанхай и Нинбо вышли на рекордный недельный грузооборот контейнерных перевозок в восточном направлении.`,
        `**Промышленные коридоры** [⚡ Резонанс: 78%]: координация прямых поставок высокотехнологичного оборудования и автокомпонентов.`,
      ];
    } else if (timeframe === 'month') {
      headerTitle = `### 🗓️ Политическая коллегия: Стратегическая панорама за месяц (${ctx.date})`;
      formatDesc = `Стратегический срез за 30 дней по макротрендам и контурам`;
      timeframeLabel = 'месяц';

      ivanBullets = [
        `**Стратегический срез законов и бюджета** [⚡ Резонанс: 89%]: утверждение базовых параметров трехлетнего бюджета, инвестиционных стимулов и сохранение демпферного щита.`,
        `**Антимонопольный контроль** [⚡ Резонанс: 84%]: системный мониторинг оптовых цепочек поставок и сдерживание роста тарифов естественных монополий.`,
        `**Внутренний рынок труда и производство** [⚡ Резонанс: 81%]: адаптация промышленных мощностей и переориентация сырьевых потоков на дружественные рынки.`,
      ];

      kirkBullets = [
        `**Месячный санкционный пакет** [⚡ Резонанс: 91%]: переход регуляторов Запада к постоянному комплаенсу вторичных институтов и танкерного флота.`,
        `**Трансформация торговых путей** [⚡ Резонанс: 88%]: закрепление независимых страховых пулов и рост фрахтовых мощностей нейтральных юрисдикций.`,
        `**Сырьевой баланс** [⚡ Резонанс: 85%]: стабильность экспортных котировок при растущем спросе со стороны азиатских НПЗ.`,
      ];

      chenBullets = [
        `**Месячные итоги расчетов в нацвалютах** [⚡ Резонанс: 87%]: доля юаня и рубля во взаимной торговле РФ и Китая превысила 92% в совокупном обороте.`,
        `**Развитие МТК «Север-Юг» и Севморпути** [⚡ Резонанс: 86%]: кратный рост перевалки генеральных и контейнерных грузов по восточному вектору.`,
        `**Технологический трансфер** [⚡ Резонанс: 82%]: расширение совместных инженерных кластеров в сфере микроэлектроники и оборудования.`,
      ];
    } else {
      // today
      ivanBullets = [
        ctx.ivanStories[0]
          ? `**${ctx.ivanStories[0].title}** [⚡ Резонанс: 86%]: регуляторный контроль биржевых нормативов моторного топлива на СПбМТСБ и проверка наценок.`
          : 'Завершение нулевых чтений проекта трехлетнего федерального бюджета на 2027–2029 гг. [⚡ Резонанс: 84%].',
        ctx.ivanStories[1]
          ? `**${ctx.ivanStories[1].title}** [⚡ Резонанс: 82%]: действие демпферного механизма и мониторинг оптового звена энергоносителей.`
          : 'ФАС и Минэнерго РФ проводят еженедельный мониторинг баланса поставок моторного топлива в регионы [⚡ Резонанс: 81%].',
      ];

      kirkBullets = [
        ctx.kirkStories[0]
          ? `**${ctx.kirkStories[0].title}** [⚡ Резонанс: 89%]: Минфин США (OFAC) усилил комплаенс-требования к проверке страховых полисов P&I клубов для танкеров.`
          : 'Публикация нового директивного пакета OFAC по контролю условий страхования морских партий нефти [⚡ Резонанс: 88%].',
        ctx.kirkStories[1]
          ? `**${ctx.kirkStories[1].title}** [⚡ Резонанс: 84%]: ставки фрахта и перестрахование судов в портах Балтийского и Черного морей.`
          : 'Повышение ставок морского фрахта и страховых премий Lloyd\'s для танкеров под нейтральными флагами [⚡ Резонанс: 83%].',
      ];

      chenBullets = [
        ctx.chenStories[0]
          ? `**${ctx.chenStories[0].title}** [⚡ Резонанс: 81%]: Народный Банк Китая расширяет каналы прямых межбанковских расчетов со странами БРИКС в обход SWIFT.`
          : 'Народный Банк Китая и партнеры по БРИКС наращивают объемы клиринга в нацвалютах без использования SWIFT [⚡ Резонанс: 82%].',
        'Рост грузооборота по восточным логистическим коридорам (порты Дальнего Востока, Севморпуть) на 12% с начала квартала [⚡ Резонанс: 79%].',
      ];
    }

    // Candidate resonance nodes across curators
    const resonanceNodes: ResonanceNodeCandidate[] = [
      {
        id: `node-oil-logistics-${ctx.date}`,
        title: 'Морской фрахт и оптовый топливный баланс РФ',
        curatorIds: ['ivan-bely', 'kirk-kitten'],
        curatorNames: ['Иван Белый', 'Kirk Kitten'],
        resonanceScore: 86,
        topic: 'oil-freight-dampener',
        reasoning: 'Ужесточение проверок танкерного фрахта со стороны OFAC создает задержки отгрузок в портах, перенаправляя цистерны на внутренний рынок и влияя на биржевые котировки СПбМТСБ.',
        sharedKeywords: ['танкеры', 'нефть', 'топливо', 'демпфер', 'ofac', 'фас'],
        suggestedPrompt: `/synthesis Иван Белый и Kirk Kitten: Влияние морских санкций OFAC на оптовый рынок нефтепродуктов РФ (${ctx.date})`,
      },
      {
        id: `node-payments-trade-${ctx.date}`,
        title: 'Трансграничный клиринг в нацвалютах и торговый баланс',
        curatorIds: ['ivan-bely', 'chen-wei'],
        curatorNames: ['Иван Белый', 'Чэнь Вэй'],
        resonanceScore: 78,
        topic: 'cross-border-settlements',
        reasoning: 'Переход на прямые расчеты в юанях и рублях смягчает давление вторичных финансовых санкций Запада и поддерживает стабильность бюджетных доходов от экспорта.',
        sharedKeywords: ['расчеты', 'клиринг', 'нацвалюты', 'брикс', 'бюджет', 'экспорт'],
        suggestedPrompt: `/synthesis Иван Белый и Чэнь Вэй: Развитие независимой платежной инфраструктуры БРИКС и торговый баланс (${ctx.date})`,
      },
    ];

    const markdownText = `${headerTitle}

> **Формат:** ${formatDesc}  
> **Оптики в эфире:** 🇷🇺 Иван Белый • 🌐 Kirk Kitten • 🇨🇳 Чэнь Вэй  

---

#### 🇷🇺 Внутренний контур РФ (Иван Белый)
${ivanBullets.map((b) => `- ${b}`).join('\n')}

👉 [В тред к Ивану Белому (обсудить ${timeframeLabel}) ↗](action:curator:ivan-bely?timeframe=${timeframe})

#### 🌐 Международный контур / Санкции (Kirk Kitten)
${kirkBullets.map((b) => `- ${b}`).join('\n')}

👉 [В тред к Kirk Kitten (обсудить ${timeframeLabel}) ↗](action:curator:kirk-kitten?timeframe=${timeframe})

#### 🇨🇳 Восточный контур / АТР и БРИКС (Чэнь Вэй)
${chenBullets.map((b) => `- ${b}`).join('\n')}

👉 [В тред к Чэнь Вэю (обсудить ${timeframeLabel}) ↗](action:curator:chen-wei?timeframe=${timeframe})

---

### ⚡ Обнаруженные узлы пересечения (Кандидаты на точечный синтез):

${resonanceNodes
  .map(
    (n, idx) =>
      `${idx + 1}. **${n.title}** [⚡ Резонанс: ${n.resonanceScore}%]  
   • **Контуры:** ${n.curatorNames.join(' ⟷ ')}  
   • **Точка соприкосновения:** ${n.reasoning}  
   • **Команда для синтеза:** \`${n.suggestedPrompt}\``,
  )
  .join('\n\n')}

---
💡 *Сводка собрана в компактном формате без фото и медиа-шума. Вы можете обсудить детали за ${timeframeLabel} в личных тредах кураторов или запустить точечный синтез.*`;

    const suggestedCard = {
      title: `[Резюме] Политическая панорама (${timeframe === 'week' ? 'неделя' : timeframe === 'month' ? 'месяц' : 'день'}, ${ctx.date})`,
      description: `## Политическая коллегия: Панорама за ${timeframeLabel} (${ctx.date})

> **Куратор:** 🏛️ Политическая коллегия (Иван Белый, Kirk Kitten, Чэнь Вэй)  
> **Период:** ${timeframe === 'week' ? '7 дней' : timeframe === 'month' ? '30 дней' : 'Сегодня'}  
> **Узлы резонанса:** ${resonanceNodes.length} обнаружено

### Ключевые аспекты:
- **Контур РФ:** Регуляторика, бюджет и баланс оптовых цен на энергоносители.
- **Внешний контур:** Санкционные директивы OFAC, страховой комплаенс и фрахт.
- **Восточный контур:** Расчеты в нацвалютах БРИКС и грузооборот контейнерных коридоров.

---
*Сформировано аналитическим деском Project Lenta.*`,
      type: NoteType.EVENT,
      folder: 'Politics/Daily',
      taxonomyPath: 'politics.daily_summary',
      hashtags: ['Политика', 'Резюме', 'Коллегия', 'Контуры', 'Резонанс'],
      curator: 'Политическая коллегия',
      resonanceScore: 86,
    };

    const isTg = isTelegramPostRequested(ctx.prompt);
    const postBullets = [
      ...ivanBullets.slice(0, 1),
      ...kirkBullets.slice(0, 1),
      ...chenBullets.slice(0, 1),
    ];
    const textOutput = isTg
      ? formatTelegramPostContent({
          contourTitle: 'Политическая коллегия',
          curatorEmoji: '🏛️',
          curatorName: 'Сводный аналитический деск',
          date: ctx.date,
          period: timeframe === 'week' ? 'week' : 'today',
          bullets: postBullets,
          takeaway: 'Синхронизация регуляторного поля РФ, санкционного давления и восточных финансовых маршрутов.',
          hashtags: ['Политика', 'Коллегия', 'СводкаДня', 'Аналитика', 'Резонанс'],
        }) + `\n\n### ⚡ Обнаруженные узлы пересечения:\n` + resonanceNodes.map((n, idx) => `${idx + 1}. **${n.title}** [${n.resonanceScore}%]: \`${n.suggestedPrompt}\``).join('\n')
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
      resonanceScore: 86,
      sources: ['Правительство РФ', 'СПбМТСБ', 'OFAC', 'Lloyd\'s List', 'Xinhua', 'PBOC'],
      resonanceNodes,
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
В системе работают ключевые кураторы:
1. 🏛️ Политическая коллегия (political-group): Единая группа кураторов. Если запрос направлен к ней (новости на сегодня, резюме дня), сформируй МОДУЛЬНОЕ РЕЗЮМЕ по контурам (РФ, Международный, АТР/БРИКС) и отдельно в конце выдели 1-2 потенциальных УЗЛА ПЕРЕСЕЧЕНИЯ (кандидатов на точечный синтез) с расчетом индекса резонанса. Не смешивай всё в одну кашу — дай структурированный срез по каждому куратору!
2. 🇷🇺 Иван Белый (ivan-bely): Внутренний контур РФ (законы, Госдума, бюджет, ФАС, ЦБ РФ, топливный демпфер, внутренние цены).
3. 🌐 Kirk Kitten (kirk-kitten): Международный контур (OFAC, санкции США/ЕС, морской фрахт, ООН, сырьевые рынки).
4. 🇨🇳 Чэнь Вэй (chen-wei): Восточный контур (Китай, АТР, БРИКС, валютный клиринг, логистика, погранпереходы).
5. ⚖️ Независимый аналитик (independent-analyst): Проводит точечный кросс-контурный синтез и арбитраж по конкретным выявленным узлам.

Контекст новостей на дату:
${JSON.stringify(ctx.contextCards.map((c) => ({ title: c.title, source: c.source, summary: c.summary, curator: c.suggestedCurator })))}

События календаря:
${JSON.stringify(ctx.politicalEvents.map((e) => ({ title: e.title, description: e.description })))}

Запрос пользователя: "${ctx.prompt}"
Целевой агент: "${ctx.resolvedTarget}"

Верни строго JSON массив ответов (без markdown блоков \`\`\`json):
[
  {
    "sender": "political-group" | "ivan-bely" | "kirk-kitten" | "chen-wei" | "independent-analyst",
    "senderName": "Имя агента или группы",
    "senderRole": "Роль",
    "avatar": "эмодзи",
    "text": "Ответ в Markdown",
    "resonanceScore": 85,
    "suggestedCard": {
      "title": "Заголовок для календаря",
      "description": "Markdown текст карточки",
      "type": "SINGLE" | "EVENT" | "PERIOD" | "DONE",
      "folder": "Politics/Daily" | "Politics/Russia" | "Synthesis/2026",
      "taxonomyPath": "politics.daily_summary" | "politics.russia" | "politics.cross_analysis",
      "hashtags": ["тег1", "тег2"],
      "curator": "Политическая коллегия" | "ivan-bely" | "kirk-kitten" | "Независимый аналитик",
      "resonanceScore": 85
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
      resonanceScore: item.resonanceScore || 80,
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
      resonanceScore: surveyResult.crossDomainResonances[0]?.score || 80,
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
      resonanceScore: s.resonanceScore || 85,
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
      resonanceScore: mainStory?.resonanceScore || 85,
      sources: ctx.stories.map((s) => s.source).filter(Boolean),
      newsPosts,
    };
  }
}
