import { NoteType, TelegramNewsPreview } from '@lenta/shared';
import { ChatMessage, DailyNewsCard } from '../types';
import {
  isTelegramPostRequested,
  formatTelegramPostContent,
} from '../helpers/telegram-formatters';

export interface CuratorContext {
  prompt: string;
  date: string;
  stories: DailyNewsCard[];
  events: any[];
  timestamp: string;
}

export function generateIvanResponse(ctx: CuratorContext): ChatMessage {
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
