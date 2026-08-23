import { Injectable } from '@nestjs/common';
import { NoteType } from '@prisma/client';

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
    const a = year % 4;
    const b = year % 7;
    const c = year % 19;
    const d = (19 * c + 15) % 30;
    const e = (2 * a + 4 * b - d + 34) % 7;
    const month = Math.floor((d + e + 114) / 31);
    const day = ((d + e + 114) % 31) + 1;
    // Julian to Gregorian shift in 20th-21st centuries is +13 days
    const julianEaster = new Date(Date.UTC(year, month - 1, day));
    julianEaster.setUTCDate(julianEaster.getUTCDate() + 13);
    return julianEaster;
  }

  /**
   * Generates complete Christian & Orthodox Holiday Calendar for a given year.
   */
  getChristianHolidays(year = 2026): HolidayItem[] {
    const easter = this.calculateOrthodoxEaster(year);

    const addDays = (base: Date, days: number): string => {
      const d = new Date(base);
      d.setUTCDate(d.getUTCDate() + days);
      return d.toISOString();
    };

    const lentStart = addDays(easter, -48);
    const lentEnd = addDays(easter, -1);
    const palmSunday = addDays(easter, -7);
    const ascension = addDays(easter, 39);
    const pentecost = addDays(easter, 49);
    const holySpiritDay = addDays(easter, 50);

    return [
      {
        title: 'Рождество Христово',
        startDate: `${year}-01-07T00:00:00.000Z`,
        type: NoteType.EVENT,
        icon: 'sparkles',
        imageUrl: 'https://images.unsplash.com/photo-1543258103-a62bd9610bd6?w=800',
        imageCaption: 'Рождественская звезда и свечи',
        description: `### Рождество Господа Бога и Спаса нашего Иисуса Христа

Один из главных двунадесятых праздников христианского мира, знаменующий рождение Спасителя в Вифлееме от Девы Марии.

#### Традиции и значение:
- **Сочельник (6 января):** Строгий пост «до первой звезды», вкушение сочива (кутьи).
- **Святки (7–18 января):** Двенадцать святых дней радости и милосердия до Крещенского сочельника.
- **Тропарь:** *«Рождество Твое, Христе Боже наш, возсия мирови свет разума...»*

> Праздник духовного обновления, мира и надежды.`,
        taxonomyPath: 'holidays.christian.great_feasts',
        folders: ['Holidays/Christian/Feasts', 'Holidays/Christian'],
        hashtags: ['Рождество', 'Православие', 'Христианство', 'Святки'],
        sourceLink: 'https://azbyka.ru/days/p-rozhdestvo-hristovo',
      },
      {
        title: 'Крещение Господне (Святое Богоявление)',
        startDate: `${year}-01-19T00:00:00.000Z`,
        type: NoteType.EVENT,
        icon: 'droplets',
        imageUrl: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800',
        imageCaption: 'Крещенское освящение воды',
        description: `### Крещение Господа Бога и Спаса нашего Иисуса Христа

Праздник Богоявления, установленный в память крещения Иисуса Христа в реке Иордан Иоанном Предтечей. В этот момент миру явилась Пресвятая Троица: Бог Отец гласом с небес, Бог Сын крещением, Бог Дух Святой в виде голубя.

- Великое освящение воды (Агиасма).
- Традиционные крещенские купания в иорданях.`,
        taxonomyPath: 'holidays.christian.great_feasts',
        folders: ['Holidays/Christian/Feasts', 'Holidays/Christian'],
        hashtags: ['Крещение', 'Богоявление', 'Водосвятие', 'Православие'],
      },
      {
        title: 'Сретение Господне',
        startDate: `${year}-02-15T00:00:00.000Z`,
        type: NoteType.EVENT,
        icon: 'church',
        description: `### Сретение Господа нашего Иисуса Христа

Встреча человечества в лице старца Симеона и пророчицы Анны с Богомладенцем Иисусом на сороковой день после Его Рождества в Иерусалимском храме.

- Символ встречи Ветхого и Нового Заветов.
- Празднование Дня православной молодежи.`,
        taxonomyPath: 'holidays.christian.great_feasts',
        folders: ['Holidays/Christian/Feasts', 'Holidays/Christian'],
        hashtags: ['Сретение', 'Православие', 'Церковь'],
      },
      {
        title: 'Великий пост 2026',
        startDate: lentStart,
        endDate: lentEnd,
        type: NoteType.PERIOD,
        icon: 'hourglass',
        imageUrl: 'https://images.unsplash.com/photo-1509021436665-8f07dbf5bf1d?w=800',
        imageCaption: 'Время молитвы и духовного сосредоточения',
        description: `### Святая Четыредесятница и Страстная Седмица 2026 года

Главный и самый строгий многодневный пост в православном календаре, готовящий верующих к празднованию Пасхи Христовой.

#### Структура Великого поста:
1. **Святая Четыредесятница (40 дней):** В память сорокадневного поста Христа в пустыне.
2. **Лазарева суббота и Вербное воскресенье.**
3. **Страстная седмица (6 дней):** Воспоминание спасительных страданий и крестной смерти Спасителя.

> Период духовного очищения, молитвы, покаяния и дел милосердия.`,
        taxonomyPath: 'holidays.christian.fasts',
        folders: ['Holidays/Christian/Fasts', 'Holidays/Christian'],
        hashtags: ['ВеликийПост', 'Пост', 'Духовность', 'Православие'],
      },
      {
        title: 'Вход Господень в Иерусалим (Вербное воскресенье)',
        startDate: palmSunday,
        type: NoteType.EVENT,
        icon: 'flower',
        description: `### Вход Господень в Иерусалим

Двунадесятый переходящий праздник, отмечаемый ровно за неделю до Пасхи. Воспоминание торжественного входа Иисуса Христа в Иерусалим накануне Его крестных страданий. В русской традиции ветви финиковых пальм заменяются цветущими ветвями вербы.`,
        taxonomyPath: 'holidays.christian.easter_cycle',
        folders: ['Holidays/Christian/Feasts', 'Holidays/Christian'],
        hashtags: ['ВербноеВоскресенье', 'ПасхальныйЦикл'],
      },
      {
        title: 'Светлое Христово Воскресение — ПАСХА 2026',
        startDate: easter.toISOString(),
        type: NoteType.EVENT,
        icon: 'sun',
        imageUrl: 'https://images.unsplash.com/photo-1521747116042-5a810fda9664?w=800',
        imageCaption: 'Пасха Христова — Праздник праздников и Торжество торжеств',
        description: `### Светлое Христово Воскресение (Пасха) 2026

**«Христос воскресе из мертвых, смертию смерть поправ, и сущим во гробех живот даровав!»**

Главное событие церковного года, победа жизни над смертью и искупление грехов человечества.

#### Пасхальные традиции:
- Ночное торжественное Пасхальное богослужение и крестный ход.
- Освящение куличей, творожных пасох и крашеных яиц.
- Светлая седмица — неделя непрекращающейся колокольной радости.`,
        taxonomyPath: 'holidays.christian.easter_cycle',
        folders: ['Holidays/Christian/Feasts', 'Holidays/Christian'],
        hashtags: ['Пасха', 'ХристосВоскресе', 'Пасха2026', 'Православие'],
        sourceLink: 'https://azbyka.ru/days/p-pasha',
      },
      {
        title: 'Вознесение Господне 2026',
        startDate: ascension,
        type: NoteType.EVENT,
        icon: 'cloud-sun',
        description: `### Вознесение Господне

Двунадесятый праздник, совершаемый на 40-й день после Пасхи. Воспоминание вознесения воскресшего Иисуса Христа во плоти на небо в присутствии апостолов на Елеонской горе.`,
        taxonomyPath: 'holidays.christian.easter_cycle',
        folders: ['Holidays/Christian/Feasts', 'Holidays/Christian'],
        hashtags: ['Вознесение', 'ПасхальныйЦикл'],
      },
      {
        title: 'День Святой Троицы (Пятидесятница) 2026',
        startDate: pentecost,
        type: NoteType.EVENT,
        icon: 'flame',
        description: `### День Святой Троицы (Пятидесятница)

Двунадесятый праздник, совершаемый на 50-й день после Пасхи. Сошествие Святого Духа на апостолов в Сионской горнице. День рождения Новозаветной Церкви Христовой. Храмы украшаются свежей зеленью, березовыми ветвями и цветами.`,
        taxonomyPath: 'holidays.christian.easter_cycle',
        folders: ['Holidays/Christian/Feasts', 'Holidays/Christian'],
        hashtags: ['Троица', 'Пятидесятница', 'СвятойДух'],
      },
      {
        title: 'Преображение Господне (Яблочный Спас)',
        startDate: `${year}-08-19T00:00:00.000Z`,
        type: NoteType.EVENT,
        icon: 'sparkle',
        description: `### Преображение Господа Бога и Спаса нашего Иисуса Христа

Явление Божественного величия и славы Спасителя перед тремя ближайшими учениками (Петром, Иаковом и Иоанном) на горе Фавор. По церковной традиции в этот день освящаются плоды нового урожая (яблоки, виноград).`,
        taxonomyPath: 'holidays.christian.great_feasts',
        folders: ['Holidays/Christian/Feasts', 'Holidays/Christian'],
        hashtags: ['Преображение', 'ЯблочныйСпас', 'Православие'],
      },
      {
        title: 'Успение Пресвятой Богородицы',
        startDate: `${year}-08-28T00:00:00.000Z`,
        type: NoteType.EVENT,
        icon: 'shield',
        description: `### Успение Пресвятой Владычицы нашей Богородицы и Приснодевы Марии

Один из самых почитаемых на Руси праздников («Богородичная Пасха»). Завершение земного пути Пресвятой Девы и Ее телесное вознесение на небо Сыном Божьим.`,
        taxonomyPath: 'holidays.christian.great_feasts',
        folders: ['Holidays/Christian/Feasts', 'Holidays/Christian'],
        hashtags: ['Успение', 'Богородица', 'Православие'],
      },
    ];
  }

  /**
   * Generates Russian Official & Military Holidays (32-FZ) for a given year.
   */
  getRussianHolidays(year = 2026): HolidayItem[] {
    return [
      // 1. Official State Holidays
      {
        title: 'Новогодние каникулы и Рождество в России',
        startDate: `${year}-01-01T00:00:00.000Z`,
        endDate: `${year}-01-08T23:59:59.000Z`,
        type: NoteType.PERIOD,
        icon: 'gift',
        imageUrl: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=800',
        imageCaption: 'Праздничные новогодние огни и ель',
        description: `### Новогодние каникулы в Российской Федерации

Официальный период нерабочих праздничных дней в России (ст. 112 Трудового кодекса РФ). 

- 1, 2, 3, 4, 5, 6 и 8 января — Новогодние каникулы.
- 7 января — Рождество Христово.
- Главные семейные торжества, подарки, подведение итогов года и запуск новых планов.`,
        taxonomyPath: 'holidays.russia.official',
        folders: ['Holidays/Russia/Official', 'Holidays/Russia'],
        hashtags: ['НовыйГод', 'Каникулы', 'Россия'],
      },
      {
        title: 'День защитника Отечества',
        startDate: `${year}-02-23T00:00:00.000Z`,
        type: NoteType.EVENT,
        icon: 'shield',
        imageUrl: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800',
        imageCaption: 'Чествование защитников Родины',
        description: `### День защитника Отечества (23 февраля)

Государственный праздник России и День воинской славы. День чествования всех поколений воинов, защищавших суверенитет и безопасность Отечества, а также дань уважения действующим военнослужащим и ветеранам Вооруженных Сил РФ.`,
        taxonomyPath: 'holidays.russia.military',
        folders: ['Holidays/Russia/Military', 'Holidays/Russia/Official'],
        hashtags: ['23Февраля', 'ДеньЗащитникаОтечества', 'АрмияРоссии'],
      },
      {
        title: 'Международный женский день (8 Марта)',
        startDate: `${year}-03-08T00:00:00.000Z`,
        type: NoteType.EVENT,
        icon: 'heart',
        imageUrl: 'https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11?w=800',
        imageCaption: 'Весенние цветы и поздравления',
        description: `### Международный женский день

Государственный нерабочий праздничный день в России. Праздник весны, женской красоты, материнства и уважения к женщинам. Традиционно сопровождается дарением тюльпанов, мимоз и теплыми поздравлениями в семье и коллективах.`,
        taxonomyPath: 'holidays.russia.official',
        folders: ['Holidays/Russia/Official', 'Holidays/Russia'],
        hashtags: ['8Марта', 'Весна', 'ЖенскийДень'],
      },
      {
        title: 'Праздник Весны и Труда (1 Мая)',
        startDate: `${year}-05-01T00:00:00.000Z`,
        type: NoteType.EVENT,
        icon: 'sun',
        description: `### Праздник Весны и Труда

Традиционный российский весенний праздник, символизирующий уважение к труду, солидарность и расцвет природы. Выходной день в РФ.`,
        taxonomyPath: 'holidays.russia.official',
        folders: ['Holidays/Russia/Official', 'Holidays/Russia'],
        hashtags: ['1Мая', 'Первомай', 'ПраздникТруда'],
      },
      {
        title: 'День Победы советского народа в Великой Отечественной войне',
        startDate: `${year}-05-09T00:00:00.000Z`,
        type: NoteType.EVENT,
        icon: 'flame',
        imageUrl: 'https://images.unsplash.com/photo-1569974498991-d3c12a504f95?w=800',
        imageCaption: 'Вечный огонь в память о героях Великой Отечественной войны',
        description: `### День Победы (9 Мая 1945 года)

Священный всенародный праздник и главный День воинской славы России (ФЗ № 32-ФЗ). Торжество победы над нацистской Германией.

#### Всероссийские традиции:
- Военный парад на Красной площади в Москве и городах-героях.
- Общенародная акция памяти «Бессмертный полк».
- Всероссийская Минута молчания в 18:55.
- Праздничный салют Победы.

> «Никто не забыт, ничто не забыто!»`,
        taxonomyPath: 'holidays.russia.military',
        folders: ['Holidays/Russia/Military', 'Holidays/Russia/Official'],
        hashtags: ['9Мая', 'ДеньПобеды', 'БессмертныйПолк', 'ВеликаяОтечественная'],
      },
      {
        title: 'День России',
        startDate: `${year}-06-12T00:00:00.000Z`,
        type: NoteType.EVENT,
        icon: 'flag',
        imageUrl: 'https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=800',
        imageCaption: 'День России — праздник национального единства',
        description: `### День России (12 июня)

Главный государственный праздник страны, знаменующий принятие Декларации о государственном суверенитете Российской Федерации. День вручения Государственных премий РФ в Кремле, праздничных концертов и фестивалей.`,
        taxonomyPath: 'holidays.russia.official',
        folders: ['Holidays/Russia/Official', 'Holidays/Russia'],
        hashtags: ['ДеньРоссии', '12Июня', 'Родина'],
      },
      {
        title: 'День народного единства',
        startDate: `${year}-11-04T00:00:00.000Z`,
        type: NoteType.EVENT,
        icon: 'users',
        description: `### День народного единства (4 ноября)

Государственный праздник и День воинской славы России. Установлен в память освобождения Москвы силами народного ополчения под предводительством Кузьмы Минина и Дмитрия Пожарского от польских интервентов в 1612 году, что положило конец Смутному времени.`,
        taxonomyPath: 'holidays.russia.military',
        folders: ['Holidays/Russia/Military', 'Holidays/Russia/Official'],
        hashtags: ['4Ноября', 'ДеньНародногоЕдинства', 'МининИПожарский'],
      },

      // 2. Days of Military Glory (32-FZ)
      {
        title: 'День полного освобождения Ленинграда от фашистской блокады',
        startDate: `${year}-01-27T00:00:00.000Z`,
        type: NoteType.EVENT,
        icon: 'award',
        description: `### 27 января 1944 года — Снятие блокады Ленинграда

День воинской славы России. В этот день в 1944 году советские войска полностью освободили город Ленинград от 872-дневной вражеской фашистской блокады. Символ беспримерного мужества, стойкости и силы духа защитников и жителей города на Неве.`,
        taxonomyPath: 'holidays.russia.military',
        folders: ['Holidays/Russia/Military'],
        hashtags: ['БлокадаЛенинграда', 'ДеньВоинскойСлавы', 'Ленинград'],
      },
      {
        title: 'День победы в Сталинградской битве',
        startDate: `${year}-02-02T00:00:00.000Z`,
        type: NoteType.EVENT,
        icon: 'shield-alert',
        description: `### 2 февраля 1943 года — Разгром немецко-фашистских войск в Сталинграде

День воинской славы России. Окончание 200-дневной Сталинградской битвы, окружение и капитуляция 6-й армии фельдмаршала Паулюса. Коренной перелом во всей Второй мировой войне.`,
        taxonomyPath: 'holidays.russia.military',
        folders: ['Holidays/Russia/Military'],
        hashtags: ['Сталинград', 'СталинградскаяБитва', 'ДеньВоинскойСлавы'],
      },
      {
        title: 'День Ледового побоища (Битва на Чудском озере)',
        startDate: `${year}-04-18T00:00:00.000Z`,
        type: NoteType.EVENT,
        icon: 'swords',
        description: `### 18 апреля (5 апреля по ст. ст. 1242 г.) — Ледовое побоище

День воинской славы России. Разгром рыцарей Ливонского ордена русскими дружинами под командованием святого благоверного великого князя Александра Невского на льду Чудского озера. Защита северо-западных рубежей Руси от экспансии крестоносцев.`,
        taxonomyPath: 'holidays.russia.military',
        folders: ['Holidays/Russia/Military'],
        hashtags: ['ЛедовоеПобоище', 'АлександрНевский', 'ДревняяРусь'],
      },
      {
        title: 'День Военно-Морского Флота России (День ВМФ 2026)',
        startDate: `${year}-07-26T00:00:00.000Z`, // Last Sunday of July
        type: NoteType.EVENT,
        icon: 'anchor',
        imageUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800',
        imageCaption: 'Главный военно-морской парад в Санкт-Петербурге',
        description: `### День Военно-Морского Флота Российской Федерации

Профессиональный праздник военных моряков и памятный день Вооруженных Сил РФ, отмечаемый в последнее воскресенье июля. Традиционный Главный военно-морской парад в Санкт-Петербурге и Кронштадте, парады кораблей в Севастополе, Владивостоке, Североморске, Балтийске и Каспийске.`,
        taxonomyPath: 'holidays.russia.military',
        folders: ['Holidays/Russia/Military'],
        hashtags: ['ДеньВМФ', 'ФлотРоссии', 'АндреевскийФлаг'],
      },
      {
        title: 'День Воздушно-десантных войск (День ВДВ)',
        startDate: `${year}-08-02T00:00:00.000Z`,
        type: NoteType.EVENT,
        icon: 'parachute',
        description: `### 2 августа — День Воздушно-десантных войск (День ВДВ)

Праздник «крылатой пехоты». Установлен в память первого парашютного десантирования 12 человек под Воронежем 2 августа 1930 года на учениях Московского военного округа. Девиз ВДВ: **«Никто, кроме нас!»**`,
        taxonomyPath: 'holidays.russia.military',
        folders: ['Holidays/Russia/Military'],
        hashtags: ['ДеньВДВ', 'ВДВ', 'НиктоКромеНас', 'Десант'],
      },
      {
        title: 'День Бородинского сражения',
        startDate: `${year}-09-08T00:00:00.000Z`,
        type: NoteType.EVENT,
        icon: 'landmark',
        description: `### 8 сентября (26 августа по ст. ст. 1812 г.) — Бородинская битва

День воинской славы России. Крупнейшее генеральное сражение Отечественной войны 1812 года между русской армией под командованием генерала от инфантерии М.И. Голенищева-Кутузова и французской армией императора Наполеона I Бонапарта.`,
        taxonomyPath: 'holidays.russia.military',
        folders: ['Holidays/Russia/Military'],
        hashtags: ['Бородино', 'ОтечественнаяВойна1812', 'Кутузов'],
      },
      {
        title: 'День победы русских полков в Куликовской битве',
        startDate: `${year}-09-21T00:00:00.000Z`,
        type: NoteType.EVENT,
        icon: 'shield',
        description: `### 21 сентября (8 сентября по ст. ст. 1380 г.) — Куликовская битва

День воинской славы России. Разгром ордынских войск темника Мамая объединенными русскими полками под предводительством великого князя Московского и Владимирского Дмитрия Ивановича (Донского) на Куликовом поле у слияния Дона и Непрядвы. Важнейший шаг к возрождению единого Русского государства.`,
        taxonomyPath: 'holidays.russia.military',
        folders: ['Holidays/Russia/Military'],
        hashtags: ['КуликовскаяБитва', 'ДмитрийДонской', 'КуликовоПоле'],
      },
      {
        title: 'День Ракетных войск стратегического назначения (РВСН)',
        startDate: `${year}-12-17T00:00:00.000Z`,
        type: NoteType.EVENT,
        icon: 'zap',
        description: `### 17 декабря — День РВСН

Памятный день Вооруженных Сил РФ. Главный компонент стратегических ядерных сил Российской Федерации, гарант глобального ядерного сдерживания и стратегической стабильности. Девиз: **«После нас — тишина»**.`,
        taxonomyPath: 'holidays.russia.military',
        folders: ['Holidays/Russia/Military'],
        hashtags: ['РВСН', 'ЯдерныйЩит', 'АрмияРоссии'],
      },
    ];
  }
}
