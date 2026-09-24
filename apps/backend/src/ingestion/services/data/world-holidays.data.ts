import { NoteType } from '@prisma/client';
import { HolidayItem } from '../holidays-engine.service';

/**
 * Famous national, cultural, and international holidays across different countries for 2026.
 */
export function getWorldHolidaysData(year = 2026): HolidayItem[] {
  return [
    {
      title: 'Всемирный Новый год (New Year\'s Day)',
      startDate: `${year}-01-01T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'sparkles',
      description: `### 1 января — Всемирный Новый год

Первый день года по григорианскому календарю, отмечаемый практически во всех странах мира. Праздничные салюты в Сиднее, Лондоне, Нью-Йорке, Токио и Париже. Семейные встречи и запуск новогодних резолюций.`,
      taxonomyPath: 'holidays.world.international',
      folders: ['Holidays/World/International', 'Holidays/World'],
      hashtags: ['НовыйГод', 'NewYear', 'Праздник'],
    },
    {
      title: 'День святого Валентина (День всех влюбленных)',
      startDate: `${year}-02-14T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'heart',
      description: `### 14 февраля — День святого Валентина

Международный праздник любви и романтики. Традиция дарить открытки-валентинки в форме сердца, цветы, шоколад и признаваться в любви. Память раннехристианского мученика Валентина.`,
      taxonomyPath: 'holidays.world.culture',
      folders: ['Holidays/World/Culture', 'Holidays/World'],
      hashtags: ['ДеньВлюбленных', '14Февраля', 'Валентинка', 'Любовь'],
    },
    {
      title: `Китайский Новый год (Чуньцзе — Праздник весны, Год Лошади) ${year}`,
      startDate: `${year}-02-17T00:00:00.000Z`,
      endDate: `${year}-03-03T23:59:59.000Z`,
      type: NoteType.PERIOD,
      icon: 'flame',
      imageUrl: 'https://images.unsplash.com/photo-1544427920-c49ccfb85579?w=800',
      imageCaption: 'Красные фонари и праздник Чуньцзе в Китае',
      description: `### Китайский Новый год ${year} — Праздник весны (Чуньцзе)

Главный и самый продолжительный традиционный праздник Китая и стран Восточной Азии. Начало года Огненной Лошади по лунному календарю.

#### Традиции:
- Украшение домов красными парными надписями (чуньлянь) и фонарями.
- Красные конверты с деньгами (хунбао) детям и молодежи.
- Семейный новогодний ужин (няньефань) с пельменями (цзяоцзы) и рыбой.
- Запуск фейерверков для отпугивания чудовища Нянь и Праздник фонарей (Юаньсяоцзе) на 15-й день.`,
      taxonomyPath: 'holidays.world.asia',
      folders: ['Holidays/World/Asia', 'Holidays/World'],
      hashtags: ['КитайскийНовыйГод', 'Чуньцзе', 'ГодЛошади', 'Китай'],
    },
    {
      title: 'День святого Патрика (Национальный праздник Ирландии)',
      startDate: `${year}-03-17T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'clover',
      description: `### 17 марта — Saint Patrick's Day

Национальный праздник Ирландии, ставший всемирным фестивалем ирландской культуры. Традиция одеваться во все зеленое, носить эмблему трилистника, устраивать уличные парады и пить зеленое пиво от Дублина и Лондона до Нью-Йорка и Чикаго, где даже реку красят в изумрудный цвет.`,
      taxonomyPath: 'holidays.world.europe',
      folders: ['Holidays/World/Europe', 'Holidays/World'],
      hashtags: ['СвятойПатрик', 'StPatricksDay', 'Ирландия', 'Зеленый'],
    },
    {
      title: 'Международный день Матери-Земли (Earth Day)',
      startDate: `${year}-04-22T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'globe',
      description: `### 22 апреля — Всемирный день Земли (ООН)

Глобальная экологическая инициатива, объединяющая миллиарды людей в более чем 190 странах мира. Акции по высадке деревьев, очистке берегов рек и океанов от пластика, переходу на возобновляемую энергетику и защите биоразнообразия планеты.`,
      taxonomyPath: 'holidays.world.international',
      folders: ['Holidays/World/International', 'Holidays/World'],
      hashtags: ['ДеньЗемли', 'EarthDay', 'Экология', 'Планета'],
    },
    {
      title: 'День независимости США (4th of July)',
      startDate: `${year}-07-04T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'flag',
      description: `### 4 июля — День независимости США (Independence Day)

Главный национальный праздник Соединенных Штатов Америки в честь принятия 4 июля 1776 года Декларации независимости от Великобритании. Традиционные семейные барбекю, бейсбольные матчи, парады и грандиозные патриотические салюты под звуки маршей Джона Филипа Сузы.`,
      taxonomyPath: 'holidays.world.americas',
      folders: ['Holidays/World/Americas', 'Holidays/World'],
      hashtags: ['4thOfJuly', 'ДеньНезависимости', 'США', 'IndependenceDay'],
    },
    {
      title: 'День взятия Бастилии (Национальный праздник Франции)',
      startDate: `${year}-07-14T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'shield',
      description: `### 14 июля — Fête nationale française

Национальный праздник Французской Республики в память о штурме крепости-тюрьмы Бастилии 14 июля 1789 года в ходе Великой французской революции и Празднике Федерации 1790 года. Военный парад на Елисейских полях в Париже, салют у Эйфелевой башни и народные балы пожарных. Девиз: **«Свобода, Равенство, Братство»**.`,
      taxonomyPath: 'holidays.world.europe',
      folders: ['Holidays/World/Europe', 'Holidays/World'],
      hashtags: ['ДеньВзятияБастилии', 'Франция', '14Июля', 'Париж'],
    },
    {
      title: 'День германского единства (Tag der Deutschen Einheit)',
      startDate: `${year}-10-03T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'flag',
      description: `### 3 октября — День германского единства

Национальный праздник Федеративной Республики Германия в честь официального объединения Западной (ФРГ) и Восточной (ГДР) Германии 3 октября 1990 года, последовавшего за падением Берлинской стены.`,
      taxonomyPath: 'holidays.world.europe',
      folders: ['Holidays/World/Europe', 'Holidays/World'],
      hashtags: ['Германия', 'БерлинскаяСтена', 'Единство', '3Октября'],
    },
    {
      title: 'Хэллоуин (Канун Дня всех святых / All Hallows\' Eve)',
      startDate: `${year}-10-31T18:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'ghost',
      imageUrl: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?w=800',
      imageCaption: 'Светильники Джека из тыкв на Хэллоуин',
      description: `### 31 октября — Halloween

Древний кельтский праздник Самайн, знаменующий окончание сбора урожая и наступление темного зимнего полугодия. Карнавальные костюмы, светильники из тыквы (Jack-o'-lantern), сбор сладостей детьми («Trick or treat!» — «Кошелек или жизнь!») и просмотр фильмов ужасов.`,
      taxonomyPath: 'holidays.world.culture',
      folders: ['Holidays/World/Culture', 'Holidays/World'],
      hashtags: ['Хэллоуин', 'Halloween', 'Тыква', 'Самайн'],
    },
    {
      title: `День благодарения в США (Thanksgiving Day) ${year}`,
      startDate: `${year}-11-26T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'turkey',
      description: `### День благодарения в США (четвертый четверг ноября)

Семейный государственный праздник США в память о первой совместной трапезе пилигримов Плимутской колонии и индейцев вампаноаг осенью 1621 года. Традиционная запеченная индейка с клюквенным соусом, тыквенный пирог, парад универмага Macy's в Нью-Йорке и церемония помилования индейки Президентом США.`,
      taxonomyPath: 'holidays.world.americas',
      folders: ['Holidays/World/Americas', 'Holidays/World'],
      hashtags: ['ДеньБлагодарения', 'Thanksgiving', 'США', 'Индейка'],
    },
    {
      title: 'Рождество Христово (Christmas Day)',
      startDate: `${year}-12-25T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'gift',
      description: `### 25 декабря — Рождество

Всемирный государственный и религиозный праздник в большинстве стран Европы, Северной и Южной Америки, Австралии и Азии. Рождественская елка, подарки от Санта-Клауса, семейное единение и радость.`,
      taxonomyPath: 'holidays.world.international',
      folders: ['Holidays/World/International', 'Holidays/World'],
      hashtags: ['Рождество', 'Christmas', 'MerryChristmas', 'Праздник'],
    },
    {
      title: 'Канун Нового года (New Year\'s Eve)',
      startDate: `${year}-12-31T18:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'sparkles',
      description: `### 31 декабря — Проводы старого года

Канун Нового года: обратный отсчет последних секунд уходящего года, падение хрустального шара на Таймс-сквер в Нью-Йорке, бой кремлевских курантов в Москве, звон колоколов Биг-Бена в Лондоне, бокалы шампанского и загадывание заветных желаний.`,
      taxonomyPath: 'holidays.world.international',
      folders: ['Holidays/World/International', 'Holidays/World'],
      hashtags: ['КанунНовогоГода', 'NewYearsEve', 'Куранты', 'Салют'],
    },
  ];
}
