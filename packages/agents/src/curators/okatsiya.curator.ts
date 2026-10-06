import { NoteType, resolveItSectorFromText } from '@lenta/shared';
import { ChatMessage } from '../types';
import { CuratorContext } from './ivan.curator';
import {
  isTelegramPostRequested,
  formatTelegramPostContent,
} from '../helpers/telegram-formatters';

export function generateOkatsiyaResponse(ctx: CuratorContext): ChatMessage {
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

  // 3. Combined IT & AI Comprehensive Digest
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
