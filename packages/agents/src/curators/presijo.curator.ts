import { NoteType, TelegramNewsPreview } from '@lenta/shared';
import { ChatMessage } from '../types';
import { CuratorContext } from './ivan.curator';
import {
  isTelegramPostRequested,
  formatTelegramPostContent,
} from '../helpers/telegram-formatters';

export function generatePresijoResponse(ctx: CuratorContext): ChatMessage {
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
