import { NoteType, TelegramNewsPreview } from '@lenta/shared';
import { ChatMessage } from '../types';
import { CuratorContext } from './ivan.curator';
import {
  isTelegramPostRequested,
  formatTelegramPostContent,
} from '../helpers/telegram-formatters';

export function generateChenResponse(ctx: CuratorContext): ChatMessage {
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
