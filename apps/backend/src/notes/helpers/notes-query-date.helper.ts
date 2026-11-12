import { Prisma } from '@prisma/client';
import { QueryNotesDto } from '../dto/query-notes.dto';

/**
 * Builds Prisma date filtering conditions for single date bounds and time-window overlaps.
 */
export function buildDateFilterConditions(query: QueryNotesDto): Prisma.NoteWhereInput[] {
  const {
    startDateFrom,
    startDateTo,
    endDateFrom,
    endDateTo,
    queryStart,
    queryEnd,
    overlapStart,
    overlapEnd,
  } = query;

  const conditions: Prisma.NoteWhereInput[] = [];
  const qStart = queryStart || overlapStart;
  const qEnd = queryEnd || overlapEnd;

  if (qStart && qEnd) {
    const windowStart = new Date(qStart);
    const windowEnd = new Date(qEnd);

    conditions.push({
      startDate: { lte: windowEnd },
      OR: [
        { endDate: { gte: windowStart } },
        { endDate: null, startDate: { gte: windowStart } },
        { type: 'PERIOD', endDate: null },
      ],
    });
  } else {
    if (startDateFrom || startDateTo) {
      conditions.push({
        startDate: {
          ...(startDateFrom ? { gte: new Date(startDateFrom) } : {}),
          ...(startDateTo ? { lte: new Date(startDateTo) } : {}),
        },
      });
    }
    if (endDateFrom || endDateTo) {
      conditions.push({
        endDate: {
          ...(endDateFrom ? { gte: new Date(endDateFrom) } : {}),
          ...(endDateTo ? { lte: new Date(endDateTo) } : {}),
        },
      });
    }
  }

  return conditions;
}
