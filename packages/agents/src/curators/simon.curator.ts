import { NoteType, TelegramNewsPreview } from '@lenta/shared';
import { ChatMessage } from '../types';
import { CuratorContext } from './ivan.curator';
import {
  isTelegramPostRequested,
  formatTelegramPostContent,
} from '../helpers/telegram-formatters';

export function generateSimonResponse(ctx: CuratorContext): ChatMessage {
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

export function generateGermanResponse(ctx: CuratorContext): ChatMessage {
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

> **Ремарка Германа:** «Акация пусть рассказывает про презентации в долине и котировки бигтеха, а на нашей кухне важны живые статьи: что люди собирают руками, где наступают на грабли и какие решения реально работают».`;

  const suggestedCard = {
    title: mainStory
      ? `[Super Note] ${mainStory.title}`
      : `[Super Note] Подборка публикаций Habr & Хакер (${ctx.date})`,
    description: `## 📟 Habr & Хакер: Инженерный дайджест ${ctx.date}

### Ключевые материалы:
1. ${mainStory ? mainStory.title : 'Инженерный лонгрид на Habr'} — подробный разбор.
2. ${secondaryStory ? secondaryStory.title : 'Схемотехника и ретро-железо'} — нестандартный взгляд.
3. Материалы xakep.ru подготовлены для передачи в NotebookLM.

---
*Сформировано Германом «Кернел» в Project Lenta.*`,
    type: NoteType.SINGLE,
    folder: 'Tech/Kernel',
    taxonomyPath: 'tech.community.habr',
    hashtags: ['Habr', 'Хакер', 'ITСтатьи', 'СвояКухня'],
    curator: 'Герман «Кернел»',
    sourceLink: mainStory?.url,
  };

  return {
    id: `msg-german-${Date.now()}`,
    sender: 'german-kernel',
    senderName: 'Герман «Кернел»',
    senderRole: 'Специалист по IT-статьям, Habr и своей кухне',
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
    suggestedCard,
  };
}
