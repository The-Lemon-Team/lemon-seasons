import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import { Note } from '@lenta/shared';

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

export type PeriodActivityStatus = 'active' | 'upcoming' | 'finished';

export interface CalculatedPeriod {
  id: string;
  note: Note;
  title: string;
  description?: string | null;
  startDate: string;
  endDate?: string | null;
  status: PeriodActivityStatus;
  progressPercent: number;
  timeRemainingText: string;
  isEndingSoon: boolean;
  scope: 'global' | 'local';
  feedSlug?: string | null;
  feedTitle?: string | null;
  feedColor?: string | null;
  isPromoted?: boolean;
}

/**
 * Calculates progress metrics and activity status for a period note.
 */
export function calculatePeriodMetrics(note: Note): CalculatedPeriod {
  const now = dayjs();
  const start = note.startDate ? dayjs(note.startDate) : dayjs(note.createdAt);
  const end = note.endDate ? dayjs(note.endDate) : null;

  let status: PeriodActivityStatus = 'active';
  let progressPercent = 0;
  let timeRemainingText = '';
  let isEndingSoon = false;

  if (now.isBefore(start)) {
    status = 'upcoming';
    const daysUntil = start.diff(now, 'day');
    timeRemainingText = daysUntil > 0 ? `Через ${daysUntil} д.` : `Начнется скоро`;
    progressPercent = 0;
  } else if (end && now.isAfter(end)) {
    status = 'finished';
    timeRemainingText = 'Завершен';
    progressPercent = 100;
  } else if (end) {
    status = 'active';
    const totalMs = end.diff(start);
    const elapsedMs = Math.max(0, now.diff(start));
    if (totalMs > 0) {
      progressPercent = Math.min(99, Math.max(1, Math.round((elapsedMs / totalMs) * 100)));
    } else {
      progressPercent = 50;
    }

    const hoursLeft = end.diff(now, 'hour');
    const daysLeft = end.diff(now, 'day');
    if (daysLeft >= 1) {
      timeRemainingText = `Осталось ${daysLeft} д.`;
    } else if (hoursLeft > 0) {
      timeRemainingText = `Осталось ${hoursLeft} ч.`;
    } else {
      timeRemainingText = 'Меньше часа';
    }

    isEndingSoon = progressPercent >= 80 || hoursLeft <= 48;
  } else {
    // Open-ended ongoing period
    status = 'active';
    timeRemainingText = 'Бессрочный';
    progressPercent = 50;
  }

  // Determine scope: global vs local
  const scope: 'global' | 'local' = !note.feedId || note.feed?.slug === 'all' ? 'global' : 'local';

  return {
    id: note.id,
    note,
    title: note.title,
    description: note.description,
    startDate: note.startDate,
    endDate: note.endDate,
    status,
    progressPercent,
    timeRemainingText,
    isEndingSoon,
    scope,
    feedSlug: note.feed?.slug,
    feedTitle: note.feed?.title,
    feedColor: note.feed?.color,
    isPromoted: Boolean(note.metadata?.isPromoted),
  };
}
