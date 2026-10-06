import {
  CuratorId,
  getCuratorPersona,
  TelegramNewsPreview,
} from '@lenta/shared';
import { ChatMessage, DailyNewsCard } from '../types';
import {
  isTelegramPostRequested,
  formatTelegramPostContent,
} from '../helpers/telegram-formatters';

export interface GenericCuratorContext {
  prompt: string;
  date: string;
  stories: DailyNewsCard[];
  events: any[];
  timestamp: string;
}

export function generateGenericCuratorResponse(
  curatorId: CuratorId,
  ctx: GenericCuratorContext,
): ChatMessage {
  const persona = getCuratorPersona(curatorId);
  const name = persona?.name || curatorId;
  const role = persona?.role || 'Предметный куратор';
  const emoji = persona?.emoji || '👤';
  const mainStory = ctx.stories[0];
  const isTg = isTelegramPostRequested(ctx.prompt);
  const isWeek = ctx.prompt.toLowerCase().includes('week') || ctx.prompt.toLowerCase().includes('недел');
  const period = isWeek ? 'week' : 'today';

  const bullets =
    ctx.stories.length > 0
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
