import { Injectable } from '@nestjs/common';
import { NoteType } from '@prisma/client';

export interface PoliticalEventItem {
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
export class PoliticalEngineService {
  /**
   * Returns list of major global and Russian political events for 2026.
   */
  getPoliticalEvents2026(): PoliticalEventItem[] {
    return [
      {
        title: 'Всемирный экономический форум в Давосе (WEF 2026)',
        startDate: '2026-01-19T00:00:00.000Z',
        endDate: '2026-01-23T23:59:59.000Z',
        type: NoteType.PERIOD,
        icon: 'globe',
        imageUrl: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800',
        imageCaption: 'Ежегодный саммит лидеров мировой экономики в Давосе',
        description: `### Всемирный экономический форум (Давос, Швейцария)

Ежегодная встреча глав государств, лидеров крупнейших транснациональных корпораций, экономистов и общественных деятелей.

#### Ключевые темы повестки:
- Глобальная трансформация рынков труда под влиянием AGI и квантовых вычислений.
- Реструктуризация цепочек поставок и энергетический переход.
- Макроэкономическая стабильность и новые финансовые архитектуры.`,
        taxonomyPath: 'politics.international',
        folders: ['Politics/International', 'Politics'],
        hashtags: ['Давос', 'WEF2026', 'МироваяЭкономика', 'Саммит'],
        sourceLink: 'https://www.weforum.org',
      },
      {
        title: 'Истечение срока Договора СНВ-III (New START Treaty)',
        startDate: '2026-02-05T00:00:00.000Z',
        type: NoteType.EVENT,
        icon: 'shield-alert',
        description: `### Истечение срока Договора между РФ и США о сокращении стратегических наступательных вооружений

Критическая дата в архитектуре глобальной ядерной безопасности и контроля над вооружениями. Договор СНВ-III, продленный в 2021 году на пятилетний срок, завершает свое действие 5 февраля 2026 года.

- Вопрос выработки новой модели стратегической стабильности с учетом многополярного мира и новых военных технологий.
- Международные переговоры и дипломатические консультации по формату будущего контроля над ядерными арсеналами.`,
        taxonomyPath: 'politics.international',
        folders: ['Politics/International', 'Politics'],
        hashtags: ['СНВ3', 'Безопасность', 'Геополитика', 'ЯдерныйПаритет'],
      },
      {
        title: 'XVIII Саммит БРИКС 2026 (BRICS Leaders Summit)',
        startDate: '2026-06-15T00:00:00.000Z',
        endDate: '2026-06-18T23:59:59.000Z',
        type: NoteType.PERIOD,
        icon: 'landmark',
        imageUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800',
        imageCaption: 'Саммит лидеров объединения БРИКС',
        description: `### Саммит лидеров государств-участников БРИКС

Встреча лидеров стран межгосударственного объединения БРИКС в расширенном составе. 

#### Повестка дня:
- Развитие независимой платежно-расчетной системы BRICS Pay и расчеты в национальных валютах.
- Новые транспортно-логистические коридоры (Север — Юг).
- Институционализация категорий стран-партнеров БРИКС.`,
        taxonomyPath: 'politics.international',
        folders: ['Politics/International', 'Politics'],
        hashtags: ['БРИКС', 'BRICS2026', 'МногополярныйМир', 'Геополитика'],
      },
      {
        title: '81-я сессия Генеральной Ассамблеи ООН (UNGA 81)',
        startDate: '2026-09-15T00:00:00.000Z',
        endDate: '2026-09-28T23:59:59.000Z',
        type: NoteType.PERIOD,
        icon: 'building-2',
        imageUrl: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800',
        imageCaption: 'Штаб-квартира ООН в Нью-Йорке',
        description: `### 81-я сессия Генеральной Ассамблеи Организации Объединенных Наций

Главное ежегодное дипломатическое событие года в штаб-квартире ООН в Нью-Йорке. Неделя высокого уровня с участием глав государств и правительств всех 193 стран-членов ООН.

- Общие политические дебаты лидеров мировых держав.
- Резолюции по международной безопасности, урегулированию конфликтов и устойчивому развитию.`,
        taxonomyPath: 'politics.international',
        folders: ['Politics/International', 'Politics'],
        hashtags: ['ООН', 'UNGA81', 'Дипломатия', 'МеждународныеОтношения'],
        sourceLink: 'https://www.un.org/ru/ga/',
      },
      {
        title: 'Выборы в Государственную Думу РФ IX созыва (Единый день голосования 2026)',
        startDate: '2026-09-20T00:00:00.000Z',
        type: NoteType.EVENT,
        icon: 'vote',
        imageUrl: 'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=800',
        imageCaption: 'Государственная Дума Федерального Собрания Российской Федерации',
        description: `### Выборы депутатов Государственной Думы Федерального Собрания Российской Федерации IX созыва

Главное внутриполитическое событие года в России. Избрание 450 депутатов нижней палаты парламента на пятилетний срок (2026–2031 гг.) по смешанной избирательной системе:

- **225 депутатов** — по федеральному избирательному округу (партийным спискам).
- **225 депутатов** — по одномандатным избирательным округам.
- Формирование парламентской коалиции и состава комитетов нового созыва.`,
        taxonomyPath: 'politics.elections',
        folders: ['Politics/Elections', 'Politics/Russia', 'Politics'],
        hashtags: ['Госдума2026', 'Выборы2026', 'ПолитикаРоссии', 'ЕДГ2026'],
        sourceLink: 'http://duma.gov.ru',
      },
      {
        title: 'Промежуточные выборы в Конгресс США (US Midterm Elections 2026)',
        startDate: '2026-11-03T00:00:00.000Z',
        type: NoteType.EVENT,
        icon: 'flag',
        imageUrl: 'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=800',
        imageCaption: 'Капитолий США в Вашингтоне',
        description: `### Промежуточные выборы в США (US Midterm Elections)

Общенациональные выборы в законодательный орган США в середине президентского срока.

#### Избирательная кампания:
- Переизбрание всех **435 мест** в Палате представителей США.
- Переизбрание **33 из 100 мест** в Сенате США (Сенаторы Класса II).
- Выборы губернаторов в 36 штатах.
- Определение баланса сил между Республиканской и Демократической партиями и контроль над обеими палатами Конгресса.`,
        taxonomyPath: 'politics.elections',
        folders: ['Politics/Elections', 'Politics/USA', 'Politics'],
        hashtags: ['USMidterms', 'ВыборыСША', 'Конгресс', 'Сенат'],
      },
      {
        title: 'XXI Саммит лидеров стран G20 2026',
        startDate: '2026-11-14T00:00:00.000Z',
        endDate: '2026-11-15T23:59:59.000Z',
        type: NoteType.PERIOD,
        icon: 'globe-2',
        description: `### Саммит лидеров «Группы двадцати» (G20 Summit 2026)

Саммит руководителей 19 ведущих экономик мира, Европейского союза и Африканского союза. Обсуждение глобальной финансовой архитектуры, инвестиций в инфраструктуру, энергетической безопасности и международной торговли.`,
        taxonomyPath: 'politics.international',
        folders: ['Politics/International', 'Politics'],
        hashtags: ['G20', 'СаммитG20', 'МироваяПолитика'],
      },
      {
        title: 'Конференция ООН по климату COP31 (2026 UN Climate Change Conference)',
        startDate: '2026-11-09T00:00:00.000Z',
        endDate: '2026-11-20T23:59:59.000Z',
        type: NoteType.PERIOD,
        icon: 'leaf',
        description: `### 31-я Конференция сторон Рамочной конвенции ООН об изменении климата (COP31)

Крупнейший экологический и геополитический форум мира по выполнению Парижского соглашения, сокращению углеродного следа и финансированию зеленых технологий.`,
        taxonomyPath: 'politics.international',
        folders: ['Politics/International', 'Politics'],
        hashtags: ['COP31', 'Климат', 'ООН', 'Экология'],
      },
    ];
  }
}
