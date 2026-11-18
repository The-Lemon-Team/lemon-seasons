import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  toDateTimeLocalInput,
  getDefaultDateTimeLocal,
  fromDateTimeLocalInput,
} from '../dist/index.mjs';

test('toDateTimeLocalInput formats local components and handles empty/date-only inputs', () => {
  assert.equal(toDateTimeLocalInput(null), '');
  assert.equal(toDateTimeLocalInput(undefined), '');
  assert.equal(toDateTimeLocalInput(''), '');
  assert.equal(toDateTimeLocalInput('invalid-date'), '');
  assert.equal(toDateTimeLocalInput('2026-10-31'), '2026-10-31T00:00');
  assert.equal(toDateTimeLocalInput('2026-10-31T14:25'), '2026-10-31T14:25');

  const localDate = new Date(2026, 10, 18, 9, 5, 30);
  assert.equal(toDateTimeLocalInput(localDate), '2026-11-18T09:05');
});

test('getDefaultDateTimeLocal uses current local time when omitted or date-only', () => {
  const fixedNow = new Date(2026, 10, 18, 21, 30, 0);

  assert.equal(getDefaultDateTimeLocal(undefined, fixedNow), '2026-11-18T21:30');
  assert.equal(getDefaultDateTimeLocal('', fixedNow), '2026-11-18T21:30');
  assert.equal(getDefaultDateTimeLocal('2026-12-24', fixedNow), '2026-12-24T21:30');
  assert.equal(getDefaultDateTimeLocal('2026-12-24T08:15', fixedNow), '2026-12-24T08:15');
});

test('fromDateTimeLocalInput converts local datetime string to ISO and supports fallback', () => {
  const fixedNow = new Date('2026-11-18T18:30:00.000Z');
  assert.equal(fromDateTimeLocalInput('', false, fixedNow), undefined);
  assert.equal(fromDateTimeLocalInput('', true, fixedNow), '2026-11-18T18:30:00.000Z');
  assert.equal(fromDateTimeLocalInput('not-a-date', true, fixedNow), '2026-11-18T18:30:00.000Z');

  const localExpected = new Date('2026-11-18T21:30').toISOString();
  assert.equal(fromDateTimeLocalInput('2026-11-18T21:30', false, fixedNow), localExpected);
});
