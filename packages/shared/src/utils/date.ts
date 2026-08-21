/**
 * Date and Time Slice utilities for Calendar & Gantt views.
 */

export function formatDateISO(date: Date | string | number): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return d.toISOString();
}

export function formatLocalDateKey(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getMonthBounds(year: number, monthIndex: number): { start: string; end: string } {
  const startDate = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));
  return {
    start: startDate.toISOString(),
    end: endDate.toISOString(),
  };
}

export function getDaysDifference(start: Date | string, end: Date | string): number {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)));
}

export function isPeriodOverlapping(
  noteStart: Date | string,
  noteEnd: Date | string | null | undefined,
  windowStart: Date | string,
  windowEnd: Date | string
): boolean {
  const nStart = new Date(noteStart).getTime();
  const nEnd = noteEnd ? new Date(noteEnd).getTime() : null;
  const wStart = new Date(windowStart).getTime();
  const wEnd = new Date(windowEnd).getTime();

  // Condition: (startDate <= windowEnd) AND (endDate >= windowStart OR endDate IS NULL)
  const startsBeforeEnd = nStart <= wEnd;
  const endsAfterStart = nEnd !== null ? nEnd >= wStart : true;

  return startsBeforeEnd && endsAfterStart;
}
