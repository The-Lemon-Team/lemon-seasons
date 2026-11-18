/**
 * Date and Time Slice utilities for Calendar & Gantt views.
 */

export function formatDateISO(date: Date | string | number): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return d.toISOString();
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_LOCAL_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/**
 * Formats a Date or ISO timestamp into a local `YYYY-MM-DDTHH:mm` string
 * suitable for `<input type="datetime-local" />`.
 */
export function toDateTimeLocalInput(date?: Date | string | number | null): string {
  if (date === null || date === undefined || date === '') return '';
  if (typeof date === 'string') {
    const trimmed = date.trim();
    if (!trimmed) return '';
    if (DATE_ONLY_REGEX.test(trimmed)) {
      return `${trimmed}T00:00`;
    }
    if (DATETIME_LOCAL_REGEX.test(trimmed)) {
      return trimmed;
    }
  }
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/**
 * Returns a local `YYYY-MM-DDTHH:mm` default for note creation inputs.
 * When `defaultDate` is omitted or date-only (`YYYY-MM-DD`), pairs it with the current local time.
 */
export function getDefaultDateTimeLocal(
  defaultDate?: Date | string | null,
  now: Date = new Date()
): string {
  if (!defaultDate) {
    return toDateTimeLocalInput(now);
  }
  if (typeof defaultDate === 'string') {
    const trimmed = defaultDate.trim();
    if (!trimmed) {
      return toDateTimeLocalInput(now);
    }
    if (DATE_ONLY_REGEX.test(trimmed)) {
      return `${trimmed}T${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
    }
    if (DATETIME_LOCAL_REGEX.test(trimmed)) {
      return trimmed;
    }
    return toDateTimeLocalInput(trimmed) || toDateTimeLocalInput(now);
  }
  return toDateTimeLocalInput(defaultDate) || toDateTimeLocalInput(now);
}

/**
 * Converts a `<input type="datetime-local" />` (or date/ISO) value to an ISO UTC string.
 */
export function fromDateTimeLocalInput(
  value?: string | null,
  fallbackToNow = false,
  now: Date = new Date()
): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return fallbackToNow ? now.toISOString() : undefined;
  }
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) {
    return fallbackToNow ? now.toISOString() : undefined;
  }
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
