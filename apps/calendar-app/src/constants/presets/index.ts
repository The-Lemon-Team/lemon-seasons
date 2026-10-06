import { Note } from '@lenta/shared';
import { PUBLIC_FEED_PRESETS, createTag, createHashtag } from './types';
import { RUSSIAN_OFFICIAL_NOTES, RUSSIAN_MILITARY_NOTES } from './russian.presets';
import {
  ORTHODOX_NOTES,
  CATHOLIC_NOTES,
  ISLAMIC_NOTES,
  WORLD_RELIGIONS_NOTES,
} from './religious.presets';
import { WORLD_HOLIDAYS_NOTES } from './world.presets';
import { POLITICS_NOTES, WOW_NOTES } from './special.presets';

export * from './types';
export * from './russian.presets';
export * from './religious.presets';
export * from './world.presets';
export * from './special.presets';

// Unified Record mapping every preset slug to its rich sample note set
export const PRESET_SAMPLE_NOTES: Record<string, Note[]> = {
  'russian-official': RUSSIAN_OFFICIAL_NOTES,
  'russian-military': RUSSIAN_MILITARY_NOTES,
  'orthodox-holidays': ORTHODOX_NOTES,
  'catholic-holidays': CATHOLIC_NOTES,
  'islamic-holidays': ISLAMIC_NOTES,
  'world-religions': WORLD_RELIGIONS_NOTES,
  'world-holidays': WORLD_HOLIDAYS_NOTES,
  // Umbrella feeds combining sets for backward compatibility
  'russian-holidays': [...RUSSIAN_OFFICIAL_NOTES, ...RUSSIAN_MILITARY_NOTES],
  'christian-holidays': [...ORTHODOX_NOTES, ...CATHOLIC_NOTES],
  'politics-2026': POLITICS_NOTES,
  'wow-calendar': WOW_NOTES,
};
