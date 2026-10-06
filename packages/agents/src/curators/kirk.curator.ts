import { NoteType, TelegramNewsPreview } from '@lenta/shared';
import { ChatMessage } from '../types';
import { CuratorContext } from './ivan.curator';
import {
  isTelegramPostRequested,
  formatTelegramPostContent,
} from '../helpers/telegram-formatters';

export function generateKirkResponse(ctx: CuratorContext): ChatMessage {
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
