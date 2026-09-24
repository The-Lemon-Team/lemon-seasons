import { Injectable } from '@nestjs/common';
import { NoteType } from '@prisma/client';
import { calculateOrthodoxEaster, getOrthodoxHolidaysData } from './data/orthodox-holidays.data';
import { calculateCatholicEaster, getCatholicHolidaysData } from './data/catholic-holidays.data';
import { getIslamicHolidaysData } from './data/islamic-holidays.data';
import { getWorldReligionsHolidaysData } from './data/world-religions.data';
import { getRussianOfficialHolidaysData } from './data/russian-official.data';
import { getRussianMilitaryHolidaysData } from './data/russian-military.data';
import { getWorldHolidaysData } from './data/world-holidays.data';

export interface HolidayItem {
  title: string;
  startDate: string; // ISO date
  endDate?: string;
  type: NoteType;
  description: string;
  icon?: string;
  sourceLink?: string;
  imageUrl?: string;
  imageCaption?: string;
  taxonomyPath: string;
  folders: string[];
  hashtags: string[];
}

@Injectable()
export class HolidaysEngineService {
  /**
   * Calculates Orthodox Easter date in UTC using the Meeus/Computus algorithm.
   */
  calculateOrthodoxEaster(year: number): Date {
    return calculateOrthodoxEaster(year);
  }

  /**
   * Calculates Catholic/Western Easter date in UTC using the anonymous Gregorian algorithm.
   */
  calculateCatholicEaster(year: number): Date {
    return calculateCatholicEaster(year);
  }

  /**
   * Orthodox Church feasts, Easter cycle, and fasts.
   */
  getOrthodoxHolidays(year = 2026): HolidayItem[] {
    return getOrthodoxHolidaysData(year);
  }

  /**
   * Catholic Church solemnities, liturgical seasons, and Gregorian Easter cycle.
   */
  getCatholicHolidays(year = 2026): HolidayItem[] {
    return getCatholicHolidaysData(year);
  }

  /**
   * Islamic religious calendar: Ramadan, Eid al-Fitr, Eid al-Adha, Laylat al-Qadr, Ashura, Hijri New Year.
   */
  getIslamicHolidays(year = 2026): HolidayItem[] {
    return getIslamicHolidaysData(year);
  }

  /**
   * World religions calendar: Islam, Judaism (Pesach, Yom Kippur, Hanukkah), and Buddhism (Vesak, Sagaalgan).
   */
  getWorldReligionsHolidays(year = 2026): HolidayItem[] {
    return getWorldReligionsHolidaysData(year);
  }

  /**
   * Official Russian state, non-military, and cultural holidays (ст. 112 ТК РФ).
   */
  getRussianOfficialHolidays(year = 2026): HolidayItem[] {
    return getRussianOfficialHolidaysData(year);
  }

  /**
   * Russian Days of Military Glory, memorial dates, and armed forces branches holidays (32-FZ).
   */
  getRussianMilitaryHolidays(year = 2026): HolidayItem[] {
    return getRussianMilitaryHolidaysData(year);
  }

  /**
   * National and cultural holidays in different countries (USA, France, Germany, China, Ireland, etc.).
   */
  getWorldHolidays(year = 2026): HolidayItem[] {
    return getWorldHolidaysData(year);
  }

  /**
   * Backward-compatible Christian holidays (Orthodox + great feasts).
   */
  getChristianHolidays(year = 2026): HolidayItem[] {
    return this.getOrthodoxHolidays(year);
  }

  /**
   * Backward-compatible Russian holidays (Official + Military).
   */
  getRussianHolidays(year = 2026): HolidayItem[] {
    return [
      ...this.getRussianOfficialHolidays(year),
      ...this.getRussianMilitaryHolidays(year),
    ];
  }
}
