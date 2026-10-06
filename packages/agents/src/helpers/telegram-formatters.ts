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

export interface TelegramPostOptions {
  contourTitle: string;
  curatorEmoji: string;
  curatorName: string;
  date: string;
  period: 'today' | 'week' | 'month';
  bullets: string[];
  takeaway: string;
  hashtags: string[];
}

export function formatTelegramPostContent(opts: TelegramPostOptions): string {
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
