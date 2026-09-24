import { NoteType } from '@prisma/client';
import { HolidayItem } from '../holidays-engine.service';

/**
 * Calculates Western/Catholic Easter date in UTC using the anonymous Gregorian algorithm (Meeus/Jones/Butcher).
 */
export function calculateCatholicEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

export function getCatholicHolidaysData(year = 2026): HolidayItem[] {
  const easter = calculateCatholicEaster(year);

  const addDays = (base: Date, days: number): string => {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString();
  };

  const ashWednesday = addDays(easter, -46);
  const lentEnd = addDays(easter, -1);
  const palmSunday = addDays(easter, -7);
  const holyThursday = addDays(easter, -3);
  const goodFriday = addDays(easter, -2);
  const easterMonday = addDays(easter, 1);
  const divineMercySunday = addDays(easter, 7);
  const ascension = addDays(easter, 39);
  const pentecost = addDays(easter, 49);
  const trinitySunday = addDays(easter, 56);
  const corpusChristi = addDays(easter, 60);
  const sacredHeart = addDays(easter, 68);

  return [
    {
      title: 'Торжество Пресвятой Богородицы (Католический Новый год)',
      startDate: `${year}-01-01T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'sparkles',
      description: `### Торжество Пресвятой Богородицы Девы Марии (Sollemnitas Sanctae Dei Genetricis Mariae)

Октава Рождества Христова и обязательное торжество римского литургического календаря. В Католической церкви 1 января также отмечается Всемирный день мира (World Day of Peace).`,
      taxonomyPath: 'holidays.christian.catholic.solemnities',
      folders: ['Holidays/Christian/Catholic/Solemnities', 'Holidays/Christian/Catholic'],
      hashtags: ['Богородица', 'Католицизм', 'ДеньМира', 'НовыйГод'],
    },
    {
      title: 'Богоявление (Торжество трех царей / Epiphania Domini)',
      startDate: `${year}-01-06T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'crown',
      imageUrl: 'https://images.unsplash.com/photo-1543258103-a62bd9610bd6?w=800',
      imageCaption: 'Поклонение волхвов и Вифлеемская звезда',
      description: `### Торжество Богоявления Господня

Праздник поклонения волхвов (Каспара, Мельхиора и Бальтазара) Младенцу Христу. Символ явления Христа языческому миру. Традиция освящения мела, ладана и воды, надписание дверей «C+M+B» (Christus Mansionem Benedicat — «Христос да благословит это жилище»).`,
      taxonomyPath: 'holidays.christian.catholic.solemnities',
      folders: ['Holidays/Christian/Catholic/Solemnities', 'Holidays/Christian/Catholic'],
      hashtags: ['Богоявление', 'ТриЦаря', 'Эпифания', 'Католицизм'],
    },
    {
      title: 'Сретение Господне (Candlemas)',
      startDate: `${year}-02-02T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'church',
      description: `### Праздник Очищения Пресвятой Девы Марии и Сретения Господня

Праздник освящения свечей (Громницы / Candlemas), символизирующих Христа как «Свет для просвещения язычников». Также отмечается как День посвященной Богу жизни.`,
      taxonomyPath: 'holidays.christian.catholic.feasts',
      folders: ['Holidays/Christian/Catholic/Feasts', 'Holidays/Christian/Catholic'],
      hashtags: ['Сретение', 'Громницы', 'Свечи', 'Католицизм'],
    },
    {
      title: `Пепельная среда (Начало католического Великого поста) ${year}`,
      startDate: ashWednesday,
      type: NoteType.EVENT,
      icon: 'hourglass',
      description: `### Пепельная среда (Dies Cinerum)

Начало сорокадневного Великого поста (Quadragesima) в латинском обряде. Священник посыпает головы верующих освященным пеплом со словами: *«Помни, что ты прах, и в прах возвратишься»* или *«Покайтесь и веруйте в Евангелие»*. День строгого поста и воздержания.`,
      taxonomyPath: 'holidays.christian.catholic.fasts',
      folders: ['Holidays/Christian/Catholic/Fasts', 'Holidays/Christian/Catholic'],
      hashtags: ['ПепельнаяСреда', 'ВеликийПост', 'Католицизм', 'Покаяние'],
    },
    {
      title: `Католический Великий пост ${year}`,
      startDate: ashWednesday,
      endDate: lentEnd,
      type: NoteType.PERIOD,
      icon: 'hourglass',
      description: `### Четыредесятница (Великий пост) ${year} года

Литургический период покаяния, молитвы и милосердия перед Пасхой. Включает богослужения Крестного пути (Via Crucis) по пятницам.`,
      taxonomyPath: 'holidays.christian.catholic.fasts',
      folders: ['Holidays/Christian/Catholic/Fasts', 'Holidays/Christian/Catholic'],
      hashtags: ['ВеликийПост', 'Пост', 'КрестныйПуть', 'Католицизм'],
    },
    {
      title: 'День святого Патрика',
      startDate: `${year}-03-17T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'clover',
      description: `### Память святого Патрика, епископа и просветителя Ирландии

Праздник небесного покровителя Ирландии, использовавшего трилистник (клевер) для объяснения тайны Святой Троицы. Международный культурный и духовный праздник.`,
      taxonomyPath: 'holidays.christian.catholic.feasts',
      folders: ['Holidays/Christian/Catholic/Feasts', 'Holidays/Christian/Catholic'],
      hashtags: ['СвятойПатрик', 'Ирландия', 'Трилистник', 'Католицизм'],
    },
    {
      title: 'Торжество святого Иосифа, Обручника Девы Марии',
      startDate: `${year}-03-19T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'shield',
      description: `### Торжество святого Иосифа, Обручника Пресвятой Девы Марии

День памяти главы Святого Семейства, покровителя отцов, трудящихся и Вселенской Церкви. Символ смирения, мужества и верности воле Божьей.`,
      taxonomyPath: 'holidays.christian.catholic.solemnities',
      folders: ['Holidays/Christian/Catholic/Solemnities', 'Holidays/Christian/Catholic'],
      hashtags: ['СвятойИосиф', 'Семья', 'Католицизм'],
    },
    {
      title: 'Благовещение Господне (Annuntiatio Domini)',
      startDate: `${year}-03-25T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'sparkles',
      description: `### Торжество Благовещения Господня

Воспоминание возвещения архангелом Гавриилом Деве Марии тайны Воплощения Сына Божия: *«Се, Раба Господня; да будет Мне по слову твоему»*.`,
      taxonomyPath: 'holidays.christian.catholic.solemnities',
      folders: ['Holidays/Christian/Catholic/Solemnities', 'Holidays/Christian/Catholic'],
      hashtags: ['Благовещение', 'Мария', 'Католицизм'],
    },
    {
      title: `Пальмовое воскресенье (Вход Господень в Иерусалим) ${year}`,
      startDate: palmSunday,
      type: NoteType.EVENT,
      icon: 'flower',
      description: `### Пальмовое воскресенье (Dominica in Palmis)

Начало Страстной недели (Hebdomada Sancta). Процессия с пальмовыми и оливковыми ветвями и чтение Страстей Господних по Евангелию.`,
      taxonomyPath: 'holidays.christian.catholic.easter_cycle',
      folders: ['Holidays/Christian/Catholic/Easter', 'Holidays/Christian/Catholic'],
      hashtags: ['ПальмовоеВоскресенье', 'СтрастнаяНеделя', 'Католицизм'],
    },
    {
      title: `Пасхальное триденствие: Великий четверг ${year}`,
      startDate: holyThursday,
      type: NoteType.EVENT,
      icon: 'flame',
      description: `### Великий четверг: Месса Вечери Господней

Начало Пасхального триденствия (Triduum Paschale). Установление таинств Евхаристии и Священства. Обряд омовения ног (Mandatum).`,
      taxonomyPath: 'holidays.christian.catholic.easter_cycle',
      folders: ['Holidays/Christian/Catholic/Easter', 'Holidays/Christian/Catholic'],
      hashtags: ['ВеликийЧетверг', 'Евхаристия', 'ТайнаяВечеря', 'Католицизм'],
    },
    {
      title: `Пасхальное триденствие: Страстная пятница ${year}`,
      startDate: goodFriday,
      type: NoteType.EVENT,
      icon: 'crosshair',
      description: `### Страстная пятница: Воспоминание Страстей и Смерти Господней

День крестной жертвы Спасителя на Голгофе. Поклонение Святому Кресту. День строгого поста и безмолвия (месса не совершается).`,
      taxonomyPath: 'holidays.christian.catholic.easter_cycle',
      folders: ['Holidays/Christian/Catholic/Easter', 'Holidays/Christian/Catholic'],
      hashtags: ['СтрастнаяПятница', 'Крест', 'Голгофа', 'Католицизм'],
    },
    {
      title: `Светлое Христово Воскресение (Католическая Пасха) ${year}`,
      startDate: easter.toISOString(),
      type: NoteType.EVENT,
      icon: 'sun',
      imageUrl: 'https://images.unsplash.com/photo-1521747116042-5a810fda9664?w=800',
      imageCaption: 'Католическая Пасха — Воскресение Господне (Resurrectio Domini)',
      description: `### Светлое Христово Воскресение — Пасха ${year} (Латинский обряд)

**«Surrexit Christus vere, alleluia!» («Воистину воскрес Христос, аллилуйя!»)**

Главное торжество всего литургического года. Ночное Пасхальное бдение (Vigilia Paschalis) с благословением огня, возжжением Пасхала и гимном Exsultet. Традиционное папское благословение Urbi et Orbi («Городу и миру») из Ватикана.`,
      taxonomyPath: 'holidays.christian.catholic.easter_cycle',
      folders: ['Holidays/Christian/Catholic/Easter', 'Holidays/Christian/Catholic'],
      hashtags: ['Пасха', 'КатолическаяПасха', 'UrbiEtOrbi', 'ВоскресениеХристово'],
      sourceLink: 'https://www.vatican.va',
    },
    {
      title: `Пасхальный понедельник (Polite Monday) ${year}`,
      startDate: easterMonday,
      type: NoteType.EVENT,
      icon: 'sun',
      description: `### Пасхальный понедельник (Второй день Пасхи)

Продолжение празднования Пасхальной октавы. Во многих европейских странах — государственный выходной день. Воспоминание путешествия учеников в Эммаус.`,
      taxonomyPath: 'holidays.christian.catholic.easter_cycle',
      folders: ['Holidays/Christian/Catholic/Easter', 'Holidays/Christian/Catholic'],
      hashtags: ['ПасхальныйПонедельник', 'Эммаус', 'Католицизм'],
    },
    {
      title: `Праздник Божественного Милосердия ${year}`,
      startDate: divineMercySunday,
      type: NoteType.EVENT,
      icon: 'heart',
      description: `### Воскресенье Божественного Милосердия (2-е воскресенье Пасхи)

Праздник, установленный святым Иоанном Павлом II на основе откровений святой Фаустины Ковальской. Икона Иисуса Милосердного («Иисус, уповаю на Тебя») и Венчик Милосердию.`,
      taxonomyPath: 'holidays.christian.catholic.easter_cycle',
      folders: ['Holidays/Christian/Catholic/Easter', 'Holidays/Christian/Catholic'],
      hashtags: ['БожьеМилосердие', 'ФаустинаКовальская', 'Католицизм'],
    },
    {
      title: `Вознесение Господне (Католический календарь) ${year}`,
      startDate: ascension,
      type: NoteType.EVENT,
      icon: 'cloud-sun',
      description: `### Торжество Вознесения Господня

40-й день после Пасхи. Воспоминание вознесения воскресшего Господа во плоти на небеса и обетования ниспослания Святого Духа Утешителя.`,
      taxonomyPath: 'holidays.christian.catholic.easter_cycle',
      folders: ['Holidays/Christian/Catholic/Easter', 'Holidays/Christian/Catholic'],
      hashtags: ['Вознесение', 'Католицизм'],
    },
    {
      title: `Пятидесятница (Сошествие Святого Духа) ${year}`,
      startDate: pentecost,
      type: NoteType.EVENT,
      icon: 'flame',
      description: `### Торжество Сошествия Святого Духа (Pentecoste)

50-й день после Пасхи. Сошествие Святого Духа на апостолов в Сионской горнице. Завершение Пасхального периода литургического года.`,
      taxonomyPath: 'holidays.christian.catholic.easter_cycle',
      folders: ['Holidays/Christian/Catholic/Easter', 'Holidays/Christian/Catholic'],
      hashtags: ['Пятидесятница', 'СвятойДух', 'Католицизм'],
    },
    {
      title: `Торжество Пресвятой Троицы ${year}`,
      startDate: trinitySunday,
      type: NoteType.EVENT,
      icon: 'church',
      description: `### Торжество Пресвятой Троицы (Sollemnitas Sanctissimae Trinitatis)

Первое воскресенье после Пятидесятницы, посвященное прославлению тайны Единого Бога в Трех Лицах — Отца, Сына и Святого Духа.`,
      taxonomyPath: 'holidays.christian.catholic.solemnities',
      folders: ['Holidays/Christian/Catholic/Solemnities', 'Holidays/Christian/Catholic'],
      hashtags: ['Троица', 'ПресвятаяТроица', 'Католицизм'],
    },
    {
      title: `Торжество Пресвятого Тела и Крови Христа (Corpus Christi) ${year}`,
      startDate: corpusChristi,
      type: NoteType.EVENT,
      icon: 'sparkle',
      description: `### Торжество Святейшего Тела и Крови Христа (Corpus Christi)

Четверг после праздника Троицы. Торжественная Евхаристическая процессия по украшенным цветами улицам со Святыми Дарами в дароносице (монстранции).`,
      taxonomyPath: 'holidays.christian.catholic.solemnities',
      folders: ['Holidays/Christian/Catholic/Solemnities', 'Holidays/Christian/Catholic'],
      hashtags: ['CorpusChristi', 'Евхаристия', 'Католицизм'],
    },
    {
      title: `Торжество Святейшего Сердца Иисуса ${year}`,
      startDate: sacredHeart,
      type: NoteType.EVENT,
      icon: 'heart',
      description: `### Торжество Пресвятого Сердца Иисуса

Пятница на третьей неделе после Пятидесятницы. Почитание безграничной любви Спасителя к человеческому роду.`,
      taxonomyPath: 'holidays.christian.catholic.solemnities',
      folders: ['Holidays/Christian/Catholic/Solemnities', 'Holidays/Christian/Catholic'],
      hashtags: ['СердцеИисуса', 'ЛюбовьБожья', 'Католицизм'],
    },
    {
      title: 'Торжество святых апостолов Петра и Павла',
      startDate: `${year}-06-29T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'shield',
      description: `### Торжество святых апостолов Петра и Павла

Память двух столпов раннехристианской Церкви, принявших мученическую кончину в Риме при императоре Нероне. В Риме — день особого чествования преемников апостола Петра.`,
      taxonomyPath: 'holidays.christian.catholic.solemnities',
      folders: ['Holidays/Christian/Catholic/Solemnities', 'Holidays/Christian/Catholic'],
      hashtags: ['ПетрИПавел', 'Рим', 'Апостолы', 'Католицизм'],
    },
    {
      title: 'Успение и Вознесение Девы Марии (Assumptio Mariae)',
      startDate: `${year}-08-15T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'sparkles',
      description: `### Торжество Успения Пресвятой Богородицы

Догмат о взятии Пресвятой Девы Марии телом и душой в небесную славу. Во многих католических странах Европы — главный летний государственный выходной день (Ferragosto). Освящение трав и цветов.`,
      taxonomyPath: 'holidays.christian.catholic.solemnities',
      folders: ['Holidays/Christian/Catholic/Solemnities', 'Holidays/Christian/Catholic'],
      hashtags: ['УспениеМарии', 'ВознесениеБогородицы', 'Католицизм'],
    },
    {
      title: 'Торжество Всех Святых (Sollemnitas Omnium Sanctorum)',
      startDate: `${year}-11-01T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'sun',
      description: `### Торжество Всех Святых

Прославление всех праведников, пребывающих в небесной славе перед Престолом Божиим, как прославленных Церковью, так и безымянных святых.`,
      taxonomyPath: 'holidays.christian.catholic.solemnities',
      folders: ['Holidays/Christian/Catholic/Solemnities', 'Holidays/Christian/Catholic'],
      hashtags: ['ВсеСвятые', 'AllSaints', 'Католицизм'],
    },
    {
      title: 'День поминовения всех усопших верных (All Souls\' Day)',
      startDate: `${year}-11-02T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'candle',
      description: `### Поминовение всех усопших верных

День молитвы об избавлении душ усопших из чистилища. Посещение кладбищ, зажжение поминальных лампад и свечей.`,
      taxonomyPath: 'holidays.christian.catholic.feasts',
      folders: ['Holidays/Christian/Catholic/Feasts', 'Holidays/Christian/Catholic'],
      hashtags: ['ПоминовениеУсопших', 'AllSouls', 'Католицизм'],
    },
    {
      title: `Период Адвента (Ожидание Рождества) ${year}`,
      startDate: `${year}-11-29T00:00:00.000Z`,
      endDate: `${year}-12-24T23:59:59.000Z`,
      type: NoteType.PERIOD,
      icon: 'sparkles',
      description: `### Литургический период Адвента (Adventus)

Начало нового церковного года в католической традиции. Четыре недели радостного и сосредоточенного ожидания Рождества Христова и Его второго пришествия. Традиции: Рождественский венок с 4 свечами, адвент-календари и утренние мессы Рораты (Rorate).`,
      taxonomyPath: 'holidays.christian.catholic.advent',
      folders: ['Holidays/Christian/Catholic/Advent', 'Holidays/Christian/Catholic'],
      hashtags: ['Адвент', 'Рождество', 'РождественскийВенок', 'Католицизм'],
    },
    {
      title: 'Непорочное Зачатие Пресвятой Девы Марии',
      startDate: `${year}-12-08T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'sparkles',
      description: `### Торжество Непорочного Зачатия Пресвятой Девы Марии

Догмат католической веры о том, что Дева Мария в первый миг Своего зачатия была особой благодатью Всемогущего Бога сохранена незапятнанной от первородного греха.`,
      taxonomyPath: 'holidays.christian.catholic.solemnities',
      folders: ['Holidays/Christian/Catholic/Solemnities', 'Holidays/Christian/Catholic'],
      hashtags: ['НепорочноеЗачатие', 'Богородица', 'Католицизм'],
    },
    {
      title: 'Рождественский сочельник (Вигилия Рождества)',
      startDate: `${year}-12-24T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'gift',
      imageUrl: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=800',
      imageCaption: 'Рождественский сочельник и праздничный ужин',
      description: `### Вигилия Рождества Господня (Christmas Eve)

Торжественный семейный ужин («Вигилия»), преломление рождественских облаток (оплатков), пение колядок. Ночная торжественная месса Пастырей («Пастырка» / Misa del Gallo).`,
      taxonomyPath: 'holidays.christian.catholic.christmas',
      folders: ['Holidays/Christian/Catholic/Christmas', 'Holidays/Christian/Catholic'],
      hashtags: ['Сочельник', 'Пастырка', 'Вигилия', 'Рождество', 'Католицизм'],
    },
    {
      title: 'Рождество Господне (Католическое Рождество)',
      startDate: `${year}-12-25T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'sparkles',
      imageUrl: 'https://images.unsplash.com/photo-1543258103-a62bd9610bd6?w=800',
      imageCaption: 'Рождество Христово (Nativitas Domini)',
      description: `### Рождество Господа нашего Иисуса Христа

Одно из величайших торжеств христианского мира по григорианскому календарю. Праздник рождения Спасителя в Вифлеемском вертепе. Рождественские подарки, семейное тепло и благовестие ангелов: *«Слава в вышних Богу, и на земле мир, в человеках благоволение!»*.`,
      taxonomyPath: 'holidays.christian.catholic.christmas',
      folders: ['Holidays/Christian/Catholic/Christmas', 'Holidays/Christian/Catholic'],
      hashtags: ['Рождество', 'Christmas', 'Католицизм', 'Праздник'],
      sourceLink: 'https://www.vatican.va',
    },
    {
      title: 'День святого Стефана Первомученика',
      startDate: `${year}-12-26T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'shield',
      description: `### Праздник святого Стефана, первомученика и архидиакона

Второй день Рождественской октавы. Воспоминание первого христианского мученика, побитого камнями за свидетельство о Христе. В англоязычных странах — Boxing Day.`,
      taxonomyPath: 'holidays.christian.catholic.feasts',
      folders: ['Holidays/Christian/Catholic/Christmas', 'Holidays/Christian/Catholic'],
      hashtags: ['СвятойСтефан', 'BoxingDay', 'Католицизм'],
    },
  ];
}
