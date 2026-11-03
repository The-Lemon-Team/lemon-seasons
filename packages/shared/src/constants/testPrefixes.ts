/**
 * Reserved prefixes and naming conventions for test entities (Tabs, Feeds, Notes, Folders)
 * to prevent accidental collision with production records and ensure easy cleanup & search isolation.
 */
export const TEST_RESERVED_PREFIX = {
  TAB: '__test_tab_',
  FEED: '__test_feed_',
  NOTE: '__test_note_',
  FOLDER: '__test_folder_',
} as const;

export const TEST_RESERVED_NAMES = {
  TAB_TITLE_PREFIX: '[TEST] Tab',
  FEED_TITLE_PREFIX: '[TEST] Feed',
  NOTE_TITLE_PREFIX: '[TEST] Note',
} as const;

export function isTestEntity(identifierOrTitle?: string | null): boolean {
  if (!identifierOrTitle) return false;
  return (
    identifierOrTitle.startsWith('__test_') ||
    identifierOrTitle.startsWith('[TEST]') ||
    identifierOrTitle.includes('__test_')
  );
}

export function createTestFeedSlug(suffix: string): string {
  return `${TEST_RESERVED_PREFIX.FEED}${suffix}`;
}

export function createTestTabSlug(suffix: string): string {
  return `${TEST_RESERVED_PREFIX.TAB}${suffix}`;
}

export function createTestNoteTitle(suffix: string): string {
  return `${TEST_RESERVED_NAMES.NOTE_TITLE_PREFIX} ${suffix}`;
}

export function createTestFeedTitle(suffix: string): string {
  return `${TEST_RESERVED_NAMES.FEED_TITLE_PREFIX} ${suffix}`;
}

export function createTestTabTitle(suffix: string): string {
  return `${TEST_RESERVED_NAMES.TAB_TITLE_PREFIX} ${suffix}`;
}
