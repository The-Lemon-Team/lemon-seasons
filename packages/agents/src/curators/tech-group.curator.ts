import { NoteType } from '@lenta/shared';
import { ChatMessage, DailyNewsCard } from '../types';
import {
  isTelegramPostRequested,
  formatTelegramPostContent,
} from '../helpers/telegram-formatters';

export interface TechGroupContext {
  prompt: string;
  date: string;
  okatsiyaStories: DailyNewsCard[];
  simonStories: DailyNewsCard[];
  presijoStories: DailyNewsCard[];
  events: any[];
  timestamp: string;
}

export function generateTechGroupSummary(ctx: TechGroupContext): ChatMessage {
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
