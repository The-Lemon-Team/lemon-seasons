import { DailyNewsCard } from '../types';

export const STORY_PREDICATES: Record<string, (c: DailyNewsCard) => boolean> = {
  'ivan-bely': (c) =>
    c.suggestedCurator === 'ivan-bely' ||
    c.category.includes('Внутренняя') ||
    c.category.includes('РФ'),

  'kirk-kitten': (c) =>
    c.suggestedCurator === 'kirk-kitten' ||
    c.category.includes('Международный') ||
    c.summary.toLowerCase().includes('сша'),

  'tariq-said': (c) => {
    const s = c.summary.toLowerCase();
    return (
      c.suggestedCurator === 'tariq-said' ||
      s.includes('ирак') ||
      s.includes('залив') ||
      s.includes('иран') ||
      s.includes('mena') ||
      s.includes('восток')
    );
  },

  'alex-vector': (c) =>
    c.suggestedCurator === 'alex-vector' ||
    Boolean(c.isBreaking) ||
    c.category.includes('Breaking') ||
    c.category.includes('Пульс') ||
    c.category.includes('Политика'),

  'chen-wei': (c) =>
    c.suggestedCurator === 'chen-wei' ||
    c.category.includes('Азия') ||
    c.category.includes('Китай') ||
    c.category.includes('БРИКС'),

  okatsiya: (c) => {
    const s = c.summary.toLowerCase();
    return (
      c.suggestedCurator === 'okatsiya' ||
      c.category.includes('IT') ||
      c.category.includes('Девайс') ||
      s.includes('девайс') ||
      s.includes('анонс')
    );
  },

  'simon-habr': (c) => {
    const src = (c.source || '').toLowerCase();
    return (
      c.suggestedCurator === 'simon-habr' ||
      c.suggestedCurator === 'german-kernel' ||
      src.includes('habr') ||
      src.includes('хабр') ||
      src.includes('xakep') ||
      c.category.includes('Инженерия')
    );
  },

  'presijo-ai': (c) => {
    const s = c.summary.toLowerCase();
    return (
      c.suggestedCurator === 'presijo-ai' ||
      s.includes('инструмент') ||
      s.includes('библиотек') ||
      s.includes('telegram') ||
      s.includes('фич') ||
      c.category.includes('Инструменты')
    );
  },

  'marcus-vane': (c) =>
    c.suggestedCurator === 'marcus-vane' ||
    (c.branchingPotentialScore !== undefined && c.branchingPotentialScore >= 60),

  'helena-brandt': (c) => {
    const s = c.summary.toLowerCase();
    return (
      c.suggestedCurator === 'helena-brandt' ||
      s.includes('нефть') ||
      s.includes('сырье') ||
      s.includes('пролив')
    );
  },
};

/**
 * Filter daily cards for a curator, using declarative predicates.
 */
export function filterStoriesForCurator(
  curatorId: string,
  cards: DailyNewsCard[],
): DailyNewsCard[] {
  const predicate = STORY_PREDICATES[curatorId];
  return predicate ? cards.filter(predicate) : [];
}

/**
 * Filter calendar events matching a target date.
 */
export function filterEventsForDate(events: any[], date: string): any[] {
  return (events || []).filter((e) => {
    const s = (e.startDate || '').split('T')[0];
    const end = (e.endDate || '').split('T')[0];
    if (s === date) return true;
    if (end && date >= s && date <= end) return true;
    return false;
  });
}
