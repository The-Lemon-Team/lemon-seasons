import { HolidayItem, HolidaysEngineService } from './services/holidays-engine.service';
import { PoliticalEventItem, PoliticalEngineService } from './services/political-engine.service';

export interface PresetFeedDefinition {
  slug: string;
  title: string;
  description: string;
  container?: {
    id: string;
    name: string;
    description: string;
  };
  logEmoji: string;
  logTitle: string;
  getItems: (services: {
    holidays: HolidaysEngineService;
    politics: PoliticalEngineService;
  }) => (HolidayItem | PoliticalEventItem)[];
}

export const PRESET_FEED_DEFINITIONS: Record<string, PresetFeedDefinition> = {
  'russian-official': {
    slug: 'russian-official',
    title: 'Русские праздники (Официальные)',
    description:
      'Официальные нерабочие праздничные дни по ст. 112 ТК РФ, государственные торжества и культурные памятные даты России 2026.',
    container: {
      id: 'cont-russian-official',
      name: '🇷🇺 Праздники России (Официальные)',
      description: 'Государственные праздники РФ по ТК РФ, общенародные и культурные даты.',
    },
    logEmoji: '🇷🇺',
    logTitle: 'Russian Official Holidays 2026',
    getItems: ({ holidays }) => holidays.getRussianOfficialHolidays(2026),
  },
  'russian-military': {
    slug: 'russian-military',
    title: 'Дни воинской славы и военные праздники',
    description:
      'Дни воинской славы и памятные даты России по 32-ФЗ, праздники видов и родов войск Вооруженных Сил РФ.',
    container: {
      id: 'cont-russian-military',
      name: '🎖️ Дни воинской славы и военные праздники России',
      description:
        'Дни воинской славы и памятные даты России по 32-ФЗ, профессиональные праздники видов и родов войск ВС РФ.',
    },
    logEmoji: '🎖️',
    logTitle: 'Russian Military Holidays & Days of Glory 2026',
    getItems: ({ holidays }) => holidays.getRussianMilitaryHolidays(2026),
  },
  'orthodox-holidays': {
    slug: 'orthodox-holidays',
    title: 'Православные праздники',
    description:
      'Двунадесятые и великие православные праздники, Пасха Христова и ключевые дни литургического года 2026.',
    container: {
      id: 'cont-orthodox-calendar',
      name: '☦️ Православный календарь',
      description:
        'Двунадесятые праздники, Пасхальный цикл, многодневные посты и памятные дни святых Православной Церкви.',
    },
    logEmoji: '☦️',
    logTitle: 'Orthodox Church Holidays 2026',
    getItems: ({ holidays }) => holidays.getOrthodoxHolidays(2026),
  },
  'catholic-holidays': {
    slug: 'catholic-holidays',
    title: 'Католические праздники',
    description:
      'Торжества и праздники Римско-католической церкви, григорианский пасхальный цикл и дни святых 2026.',
    container: {
      id: 'cont-catholic-calendar',
      name: '✝️ Католический календарь',
      description:
        'Литургический год Католической церкви: григорианская Пасха, Рождество, Адвент, Великий пост и дни святых.',
    },
    logEmoji: '✝️',
    logTitle: 'Catholic Liturgical Holidays 2026',
    getItems: ({ holidays }) => holidays.getCatholicHolidays(2026),
  },
  'islamic-holidays': {
    slug: 'islamic-holidays',
    title: 'Исламский религиозный календарь',
    description:
      'Ключевые священные даты, посты и праздники исламского календаря (Хиджра 1447–1448 / 2026 год).',
    container: {
      id: 'cont-islamic-calendar',
      name: '☪️ Исламский религиозный календарь',
      description:
        'Календарь священных месяцев, праздников Ураза-байрам, Курбан-байрам и памятных ночей ислама.',
    },
    logEmoji: '☪️',
    logTitle: 'Islamic Hijri Holidays 2026',
    getItems: ({ holidays }) => holidays.getIslamicHolidays(2026),
  },
  'world-religions': {
    slug: 'world-religions',
    title: 'Мировые религии',
    description:
      'Единый межконфессиональный календарь: иудаизм (Песах, Йом Кипур, Ханука), буддизм (Весак, Сагаалган) и мировые конфессии 2026.',
    container: {
      id: 'cont-world-religions',
      name: '🕊️ Календарь мировых религий',
      description:
        'Межконфессиональный сводный календарь духовных традиций и священных дней мировых религий.',
    },
    logEmoji: '🕊️',
    logTitle: 'World Religions Holidays 2026',
    getItems: ({ holidays }) => holidays.getWorldReligionsHolidays(2026),
  },
  'world-holidays': {
    slug: 'world-holidays',
    title: 'Праздники стран мира',
    description:
      'Национальные и культурные праздники ключевых стран мира (США, Франция, Германия, Китай, Ирландия, Бразилия и др.) 2026.',
    container: {
      id: 'cont-world-holidays',
      name: '🌍 Праздники стран мира',
      description: 'Традиционные и государственные праздники стран мира, карнавалы и национальные дни.',
    },
    logEmoji: '🌍',
    logTitle: 'World Countries Holidays 2026',
    getItems: ({ holidays }) => holidays.getWorldHolidays(2026),
  },
  'russian-holidays': {
    slug: 'russian-holidays',
    title: 'Русские праздники',
    description: 'Объединенный календарь государственных, народных и воинских праздников России на 2026 год.',
    container: {
      id: 'cont-russian-holidays',
      name: '🇷🇺 Сводные праздники России',
      description: 'Полный объединенный список официальных и воинских дат РФ.',
    },
    logEmoji: '🇷🇺',
    logTitle: 'Consolidated Russian Holidays 2026',
    getItems: ({ holidays }) => holidays.getRussianHolidays(2026),
  },
  'christian-holidays': {
    slug: 'christian-holidays',
    title: 'Христианские праздники',
    description: 'Великие христианские праздники 2026 года.',
    container: {
      id: 'cont-christian-holidays',
      name: '☦️ Христианские праздники',
      description: 'Сводный список христианских дат.',
    },
    logEmoji: '☦️',
    logTitle: 'Christian Holidays 2026',
    getItems: ({ holidays }) => holidays.getChristianHolidays(2026),
  },
  'politics-2026': {
    slug: 'politics-2026',
    title: 'Политика 2026',
    description: 'Ключевые политические события, выборы, саммиты и геополитические вехи 2026 года.',
    logEmoji: '🏛️',
    logTitle: 'Politics 2026',
    getItems: ({ politics }) => politics.getPoliticalEvents2026(),
  },
};
