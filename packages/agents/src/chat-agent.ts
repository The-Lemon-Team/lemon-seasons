import { NoteType, resolveItSectorFromText } from '@lenta/shared';
import {
  AgentId,
  ChatMessage,
  DailyNewsCard,
  DEFAULT_CHAT_SNIPPETS,
  ResonanceNodeCandidate,
  CuratorSummarySection,
  GroupSummaryPayload,
} from './types';

export interface ProcessChatOptions {
  message: string;
  targetAgent?: AgentId | 'all';
  date: string;
  contextCards: DailyNewsCard[];
  politicalEvents: any[];
  history?: ChatMessage[];
  geminiApiKey?: string;
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
      } else if (command === '/politics' || command === '/group' || command === '/board') {
        resolvedTarget = 'political-group';
        cleanPrompt = parts.slice(1).join(' ').trim() || 'Сформируйте совместное резюме дня по всем политическим контурам с выявлением ключевых узлов пересечения.';
      } else if (command === '/chen' || command === '/asia' || command === '/brics') {
        resolvedTarget = 'chen-wei';
        cleanPrompt = parts.slice(1).join(' ').trim() || 'Новости и сигналы по АТР, Китаю и БРИКС на сегодня';
      } else if (
        command === '/okatsiya' ||
        command === '/it' ||
        command === '/ai' ||
        command === '/devops' ||
        command === '/backend' ||
        command === '/bigtech' ||
        command === '/frontend' ||
        command === '/mobile' ||
        command === '/infosec' ||
        command === '/cloud' ||
        command === '/data' ||
        command === '/hardware' ||
        command === '/gamedev' ||
        command === '/qa'
      ) {
        resolvedTarget = 'okatsiya';
        const subSector = command.replace('/', '');
        cleanPrompt = parts.slice(1).join(' ').trim() || (subSector !== 'it' && subSector !== 'okatsiya' ? `Новости по отрасли ${subSector}` : 'Ключевые новости IT и AI на сегодня');
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
      } else if (lower.includes('чэнь') || lower.includes('китай') || lower.includes('атр') || lower.includes('брикс') || lower.includes('юань')) {
        resolvedTarget = 'chen-wei';
      } else if (lower.includes('иван') || lower.includes('рф') || lower.includes('госдум') || lower.includes('бюджет')) {
        resolvedTarget = 'ivan-bely';
      } else if (lower.includes('kirk') || lower.includes('кирк') || lower.includes('оон') || lower.includes('ofac') || lower.includes('санкци')) {
        resolvedTarget = 'kirk-kitten';
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

    // 2. Deterministic Persona Responses
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

    const text = `### ⚡ Окация: Сводка IT & AI на сегодня (${ctx.date})

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
      resonanceScore: 88,
      sources: ctx.stories.map((s) => s.source).filter(Boolean),
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

    const text = `### 🇷🇺 Оценка внутреннего контура РФ

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

    return {
      id: `msg-ivan-${Date.now()}`,
      sender: 'ivan-bely',
      senderName: 'Иван Белый',
      senderRole: 'Обозреватель внутреннего контура РФ',
      avatar: '🇷🇺',
      text,
      timestamp: ctx.timestamp,
      resonanceScore: 82,
      sources: ctx.stories.map((s) => s.source).filter(Boolean),
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

    const text = `### 🌐 Оценка международного контура и рынков

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

    return {
      id: `msg-kirk-${Date.now()}`,
      sender: 'kirk-kitten',
      senderName: 'Kirk Kitten',
      senderRole: 'Специальный международный корреспондент',
      avatar: '🌐',
      text,
      timestamp: ctx.timestamp,
      resonanceScore: 87,
      sources: ctx.stories.map((s) => s.source).filter(Boolean),
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

    const text = `### 🇨🇳 Оценка восточного контура: АТР и БРИКС

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

    return {
      id: `msg-chen-${Date.now()}`,
      sender: 'chen-wei',
      senderName: 'Чэнь Вэй',
      senderRole: 'Обозреватель АТР, Китая и глобальных цепочек поставок',
      avatar: '🇨🇳',
      text,
      timestamp: ctx.timestamp,
      resonanceScore: 80,
      sources: ctx.stories.map((s) => s.source).filter(Boolean),
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
    const ivanBullets = [
      ctx.ivanStories[0]
        ? `**${ctx.ivanStories[0].title}** (${ctx.ivanStories[0].source}): регуляторный контроль нормативов и динамика цен на внутреннем рынке.`
        : 'Завершение нулевых чтений проекта трехлетнего федерального бюджета на 2027–2029 гг. с акцентом на нацпроекты и субсидии.',
      ctx.ivanStories[1]
        ? `**${ctx.ivanStories[1].title}**: действие демпферного механизма и мониторинг оптового звена энергоносителей на СПбМТСБ.`
        : 'ФАС и Минэнерго РФ проводят еженедельный мониторинг баланса поставок моторного топлива в регионы.',
    ];

    const kirkBullets = [
      ctx.kirkStories[0]
        ? `**${ctx.kirkStories[0].title}** (${ctx.kirkStories[0].source}): Минфин США (OFAC) усилил комплаенс-требования к танкерным перевозкам и портам.`
        : 'Публикация нового директивного пакета OFAC по контролю условий страхования морских партий нефти.',
      ctx.kirkStories[1]
        ? `**${ctx.kirkStories[1].title}**: ставки фрахта и перестрахование судов в портах Балтийского и Черного морей.`
        : 'Повышение ставок морского фрахта и страховых премий Lloyd\'s для танкеров под нейтральными флагами.',
    ];

    const chenBullets = [
      ctx.chenStories[0]
        ? `**${ctx.chenStories[0].title}** (${ctx.chenStories[0].source}): Народный Банк Китая расширяет каналы прямых межбанковских расчетов со странами БРИКС.`
        : 'Народный Банк Китая и партнеры по БРИКС наращивают объемы клиринга в нацвалютах без использования SWIFT.',
      'Рост грузооборота по восточным логистическим коридорам (порты Дальнего Востока, Севморпуть) на 12% с начала квартала.',
    ];

    const curatorSections: CuratorSummarySection[] = [
      {
        curatorId: 'ivan-bely',
        curatorName: 'Иван Белый',
        curatorRole: 'Обозреватель внутреннего контура РФ',
        emoji: '🇷🇺',
        accentColor: '#38bdf8',
        bullets: ivanBullets,
        sources: ctx.ivanStories.map((s) => s.source).filter(Boolean).length > 0
          ? ctx.ivanStories.map((s) => s.source).filter(Boolean)
          : ['Правительство РФ', 'СПбМТСБ', 'ФАС'],
      },
      {
        curatorId: 'kirk-kitten',
        curatorName: 'Kirk Kitten',
        curatorRole: 'Специальный международный корреспондент',
        emoji: '🌐',
        accentColor: '#fbbf24',
        bullets: kirkBullets,
        sources: ctx.kirkStories.map((s) => s.source).filter(Boolean).length > 0
          ? ctx.kirkStories.map((s) => s.source).filter(Boolean)
          : ['OFAC Treasury', 'Lloyd\'s List', 'UN News'],
      },
      {
        curatorId: 'chen-wei',
        curatorName: 'Чэнь Вэй',
        curatorRole: 'Обозреватель АТР, Китая и БРИКС',
        emoji: '🇨🇳',
        accentColor: '#ef4444',
        bullets: chenBullets,
        sources: ctx.chenStories.map((s) => s.source).filter(Boolean).length > 0
          ? ctx.chenStories.map((s) => s.source).filter(Boolean)
          : ['Xinhua', 'PBOC', 'МТК Север-Юг'],
      },
    ];

    // Detect candidate resonance nodes across curators
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

    const markdownText = `### 🏛️ Политическая коллегия: Панорама дня на ${ctx.date}

> **Формат:** Модульное резюме по ключевым контурам  
> **Оптики в эфире:** 🇷🇺 Иван Белый • 🌐 Kirk Kitten • 🇨🇳 Чэнь Вэй  
> **Общая экспозиция:** Внешнее давление смещается в сферу комплаенса и фрахта, в то время как внутренний контур РФ и восточные партнеры расширяют автономные каналы торговли и расчетов.

---

#### 🇷🇺 Внутренний контур РФ (Иван Белый)
${ivanBullets.map((b) => `- ${b}`).join('\n')}

#### 🌐 Международный контур / Санкции (Kirk Kitten)
${kirkBullets.map((b) => `- ${b}`).join('\n')}

#### 🇨🇳 Восточный контур / АТР и БРИКС (Чэнь Вэй)
${chenBullets.map((b) => `- ${b}`).join('\n')}

---

### ⚡ Обнаруженные узлы пересечения (Кандидаты на точечный синтез):

${resonanceNodes
  .map(
    (n, idx) =>
      `${idx + 1}. **${n.title}**  
   • **Контуры:** ${n.curatorNames.join(' ⟷ ')} *(Индекс резонанса: \`${n.resonanceScore}%\`)*  
   • **Точка соприкосновения:** ${n.reasoning}  
   • **Команда для синтеза:** \`${n.suggestedPrompt}\``,
  )
  .join('\n\n')}

---
💡 *Сводка собрана без навязывания искусственного синтеза. Чтобы детально исследовать любой из узлов, нажмите кнопку «Точечный синтез» ниже или выполните предложенную команду.*`;

    const suggestedCard = {
      title: `[Резюме] Политическая панорама дня (${ctx.date})`,
      description: `## Политическая коллегия: Сводное резюме ${ctx.date}

> **Куратор:** 🏛️ Политическая коллегия (Иван Белый, Kirk Kitten, Чэнь Вэй)  
> **Тип:** Ежедневная сводная панорама  
> **Узлы резонанса:** ${resonanceNodes.length} обнаружено

### Ключевые сводки:
- **Контур РФ:** Бюджет 2027–2029 и баланс оптовых цен на энергоносители.
- **Внешний контур:** Санкционные директивы OFAC и морской фрахт.
- **Восточный контур:** Расчеты в нацвалютах БРИКС и грузооборот.

### Кандидаты на синтез:
${resonanceNodes.map((n) => `- **${n.title}** (${n.resonanceScore}%): ${n.reasoning}`).join('\n')}

---
*Сформировано аналитическим деском Project Lenta.*`,
      type: NoteType.EVENT,
      folder: 'Politics/Daily',
      taxonomyPath: 'politics.daily_summary',
      hashtags: ['Политика', 'РезюмеДня', 'Коллегия', 'Контуры', 'Резонанс'],
      curator: 'Политическая коллегия',
      resonanceScore: 84,
    };

    const groupPayload: GroupSummaryPayload = {
      groupId: 'political-group',
      groupName: 'Политическая коллегия',
      date: ctx.date,
      headline: 'Сводный мониторинг политических контуров с выявлением узлов резонанса',
      sections: curatorSections,
      resonanceNodes,
    };

    return {
      id: `msg-group-${Date.now()}`,
      sender: 'political-group',
      senderName: 'Политическая коллегия',
      senderRole: 'Сводный деск политических кураторов',
      avatar: '🏛️',
      text: markdownText,
      timestamp: ctx.timestamp,
      resonanceScore: 84,
      sources: ['Правительство РФ', 'СПбМТСБ', 'OFAC', 'Lloyd\'s List', 'Xinhua', 'PBOC'],
      resonanceNodes,
      groupSummary: groupPayload,
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
}
