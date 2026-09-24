import { NoteType } from '@prisma/client';
import { HolidayItem } from '../holidays-engine.service';

/**
 * Calculates Orthodox Easter date in UTC using the Meeus/Computus algorithm.
 */
export function calculateOrthodoxEaster(year: number): Date {
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

export function getOrthodoxHolidaysData(year = 2026): HolidayItem[] {
  const easter = calculateOrthodoxEaster(year);

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
      taxonomyPath: 'holidays.christian.orthodox.great_feasts',
      folders: ['Holidays/Christian/Orthodox/Feasts', 'Holidays/Christian/Orthodox'],
      hashtags: ['Рождество', 'Православие', 'Христианство', 'Святки'],
      sourceLink: 'https://azbyka.ru/days/p-rozhdestvo-hristovo',
    },
    {
      title: 'Обрезание Господне и память святителя Василия Великого',
      startDate: `${year}-01-14T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'church',
      description: `### Обрезание Господне и память святителя Василия Великого

Великий православный праздник, совершаемый на 8-й день после Рождества Христова, когда Богомладенец принял наречение святого имени Иисус. В этот же день почитается вселенский учитель Церкви святитель Василий Великий.`,
      taxonomyPath: 'holidays.christian.orthodox.feasts',
      folders: ['Holidays/Christian/Orthodox/Feasts', 'Holidays/Christian/Orthodox'],
      hashtags: ['ОбрезаниеГосподне', 'ВасилийВеликий', 'Православие'],
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
      taxonomyPath: 'holidays.christian.orthodox.great_feasts',
      folders: ['Holidays/Christian/Orthodox/Feasts', 'Holidays/Christian/Orthodox'],
      hashtags: ['Крещение', 'Богоявление', 'Водосвятие', 'Православие'],
      sourceLink: 'https://azbyka.ru/days/p-kreshhenie-gospodne',
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
      taxonomyPath: 'holidays.christian.orthodox.great_feasts',
      folders: ['Holidays/Christian/Orthodox/Feasts', 'Holidays/Christian/Orthodox'],
      hashtags: ['Сретение', 'Православие', 'Церковь'],
      sourceLink: 'https://azbyka.ru/days/p-sretenie-gospodne',
    },
    {
      title: `Великий пост ${year}`,
      startDate: lentStart,
      endDate: lentEnd,
      type: NoteType.PERIOD,
      icon: 'hourglass',
      imageUrl: 'https://images.unsplash.com/photo-1509021436665-8f07dbf5bf1d?w=800',
      imageCaption: 'Время молитвы и духовного сосредоточения',
      description: `### Святая Четыредесятница и Страстная Седмица ${year} года

Главный и самый строгий многодневный пост в православном календаре, готовящий верующих к празднованию Пасхи Христовой.

#### Структура Великого поста:
1. **Святая Четыредесятница (40 дней):** В память сорокадневного поста Христа в пустыне.
2. **Лазарева суббота и Вербное воскресенье.**
3. **Страстная седмица (6 дней):** Воспоминание спасительных страданий и крестной смерти Спасителя.

> Период духовного очищения, молитвы, покаяния и дел милосердия.`,
      taxonomyPath: 'holidays.christian.orthodox.fasts',
      folders: ['Holidays/Christian/Orthodox/Fasts', 'Holidays/Christian/Orthodox'],
      hashtags: ['ВеликийПост', 'Пост', 'Духовность', 'Православие'],
      sourceLink: 'https://azbyka.ru/velikij-post',
    },
    {
      title: 'Благовещение Пресвятой Богородицы',
      startDate: `${year}-04-07T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'sparkles',
      description: `### Благовещение Пресвятой Владычицы нашей Богородицы

Двунадесятый непереходящий праздник в память возвещения архангелом Гавриилом Деве Марии тайны воплощения от Нее Сына Божия.
«Днесь спасения нашего главизна, и еже от века таинства явление...»`,
      taxonomyPath: 'holidays.christian.orthodox.great_feasts',
      folders: ['Holidays/Christian/Orthodox/Feasts', 'Holidays/Christian/Orthodox'],
      hashtags: ['Благовещение', 'Богородица', 'Православие'],
      sourceLink: 'https://azbyka.ru/days/p-blagoveshhenie-presvyatoj-bogorodicy',
    },
    {
      title: 'Вход Господень в Иерусалим (Вербное воскресенье)',
      startDate: palmSunday,
      type: NoteType.EVENT,
      icon: 'flower',
      description: `### Вход Господень в Иерусалим

Двунадесятый переходящий праздник, отмечаемый ровно за неделю до Пасхи. Воспоминание торжественного входа Иисуса Христа в Иерусалим накануне Его крестных страданий. В русской традиции ветви финиковых пальм заменяются цветущими ветвями вербы.`,
      taxonomyPath: 'holidays.christian.orthodox.easter_cycle',
      folders: ['Holidays/Christian/Orthodox/Feasts', 'Holidays/Christian/Orthodox'],
      hashtags: ['ВербноеВоскресенье', 'ПасхальныйЦикл', 'Православие'],
      sourceLink: 'https://azbyka.ru/days/p-vhod-gospoden-v-ierusalim',
    },
    {
      title: `Светлое Христово Воскресение — ПАСХА ${year}`,
      startDate: easter.toISOString(),
      type: NoteType.EVENT,
      icon: 'sun',
      imageUrl: 'https://images.unsplash.com/photo-1521747116042-5a810fda9664?w=800',
      imageCaption: 'Пасха Христова — Праздник праздников и Торжество торжеств',
      description: `### Светлое Христово Воскресение (Пасха) ${year}

**«Христос воскресе из мертвых, смертию смерть поправ, и сущим во гробех живот даровав!»**

Главное событие церковного года, победа жизни над смертью и искупление грехов человечества.

#### Пасхальные традиции:
- Ночное торжественное Пасхальное богослужение и крестный ход.
- Освящение куличей, творожных пасох и крашеных яиц.
- Светлая седмица — неделя непрекращающейся колокольной радости.`,
      taxonomyPath: 'holidays.christian.orthodox.easter_cycle',
      folders: ['Holidays/Christian/Orthodox/Feasts', 'Holidays/Christian/Orthodox'],
      hashtags: ['Пасха', 'ХристосВоскресе', `Пасха${year}`, 'Православие'],
      sourceLink: 'https://azbyka.ru/days/p-pasha',
    },
    {
      title: `Вознесение Господне ${year}`,
      startDate: ascension,
      type: NoteType.EVENT,
      icon: 'cloud-sun',
      description: `### Вознесение Господне

Двунадесятый праздник, совершаемый на 40-й день после Пасхи. Воспоминание вознесения воскресшего Иисуса Христа во плоти на небо в присутствии апостолов на Елеонской горе.`,
      taxonomyPath: 'holidays.christian.orthodox.easter_cycle',
      folders: ['Holidays/Christian/Orthodox/Feasts', 'Holidays/Christian/Orthodox'],
      hashtags: ['Вознесение', 'ПасхальныйЦикл', 'Православие'],
      sourceLink: 'https://azbyka.ru/days/p-voznesenie-gospodne',
    },
    {
      title: `День Святой Троицы (Пятидесятница) ${year}`,
      startDate: pentecost,
      type: NoteType.EVENT,
      icon: 'flame',
      description: `### День Святой Троицы (Пятидесятница)

Двунадесятый праздник, совершаемый на 50-й день после Пасхи. Сошествие Святого Духа на апостолов в Сионской горнице. День рождения Новозаветной Церкви Христовой. Храмы украшаются свежей зеленью, березовыми ветвями и цветами.`,
      taxonomyPath: 'holidays.christian.orthodox.easter_cycle',
      folders: ['Holidays/Christian/Orthodox/Feasts', 'Holidays/Christian/Orthodox'],
      hashtags: ['Троица', 'Пятидесятница', 'СвятойДух', 'Православие'],
      sourceLink: 'https://azbyka.ru/days/p-troica',
    },
    {
      title: `День Святого Духа ${year}`,
      startDate: holySpiritDay,
      type: NoteType.EVENT,
      icon: 'sparkle',
      description: `### День Святого Духа (Духов день)

Понедельник после Пятидесятницы, посвященный прославлению Всесвятого и Животворящего Духа, от Отца исходящего.`,
      taxonomyPath: 'holidays.christian.orthodox.easter_cycle',
      folders: ['Holidays/Christian/Orthodox/Feasts', 'Holidays/Christian/Orthodox'],
      hashtags: ['ДуховДень', 'СвятойДух', 'Православие'],
    },
    {
      title: 'День памяти святителя Николая Чудотворца (Вешний)',
      startDate: `${year}-05-22T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'shield',
      description: `### Перенесение мощей святителя и чудотворца Николая из Мир Ликийских в Бар

Один из самых любимых на Руси праздников в честь святителя Николая Чудотворца, скорого помощника и молитвенника о всех страждущих.`,
      taxonomyPath: 'holidays.christian.orthodox.feasts',
      folders: ['Holidays/Christian/Orthodox/Feasts', 'Holidays/Christian/Orthodox'],
      hashtags: ['НиколайЧудотворец', 'НиколаВешний', 'Православие'],
    },
    {
      title: 'День святых Петра и Февронии Муромских',
      startDate: `${year}-07-08T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'heart',
      description: `### Память святых благоверных князя Петра и княгини Февронии, Муромских чудотворцев

Православный день памяти святых покровителей христианского брака, супружеской верности, любви и семьи. В России отмечается также как государственный День семьи, любви и верности.`,
      taxonomyPath: 'holidays.christian.orthodox.feasts',
      folders: ['Holidays/Christian/Orthodox/Feasts', 'Holidays/Christian/Orthodox'],
      hashtags: ['ПетрИФеврония', 'Семья', 'ЛюбовьИВерность', 'Православие'],
    },
    {
      title: 'Преображение Господне (Яблочный Спас)',
      startDate: `${year}-08-19T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'sparkle',
      description: `### Преображение Господа Бога и Спаса нашего Иисуса Христа

Явление Божественного величия и славы Спасителя перед тремя ближайшими учениками (Петром, Иаковом и Иоанном) на горе Фавор. По церковной традиции в этот день освящаются плоды нового урожая (яблоки, виноград).`,
      taxonomyPath: 'holidays.christian.orthodox.great_feasts',
      folders: ['Holidays/Christian/Orthodox/Feasts', 'Holidays/Christian/Orthodox'],
      hashtags: ['Преображение', 'ЯблочныйСпас', 'Православие'],
      sourceLink: 'https://azbyka.ru/days/p-preobrazhenie-gospodne',
    },
    {
      title: 'Успение Пресвятой Богородицы',
      startDate: `${year}-08-28T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'shield',
      description: `### Успение Пресвятой Владычицы нашей Богородицы и Приснодевы Марии

Один из самых почитаемых на Руси праздников («Богородичная Пасха»). Завершение земного пути Пресвятой Девы и Ее телесное вознесение на небо Сыном Божьим. Завершает Успенский пост.`,
      taxonomyPath: 'holidays.christian.orthodox.great_feasts',
      folders: ['Holidays/Christian/Orthodox/Feasts', 'Holidays/Christian/Orthodox'],
      hashtags: ['Успение', 'Богородица', 'Православие'],
      sourceLink: 'https://azbyka.ru/days/p-uspenie-bogorodicy',
    },
    {
      title: 'Усекновение главы Иоанна Предтечи',
      startDate: `${year}-09-11T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'shield',
      description: `### Усекновение главы святого пророка, Предтечи и Крестителя Господня Иоанна

Воспоминание мученической кончины святого Иоанна Крестителя. День строгого поста в знак скорби о гибели Величайшего из пророков.`,
      taxonomyPath: 'holidays.christian.orthodox.great_feasts',
      folders: ['Holidays/Christian/Orthodox/Feasts', 'Holidays/Christian/Orthodox'],
      hashtags: ['ИоаннПредтеча', 'Усекновение', 'Пост', 'Православие'],
    },
    {
      title: 'День памяти святого князя Александра Невского',
      startDate: `${year}-09-12T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'shield',
      description: `### Перенесение мощей святого благоверного великого князя Александра Невского

День памяти небесного покровителя Руси, защитника земли Русской и православной веры. Перенесение мощей из Владимира в Санкт-Петербург в 1724 году.`,
      taxonomyPath: 'holidays.christian.orthodox.feasts',
      folders: ['Holidays/Christian/Orthodox/Feasts', 'Holidays/Christian/Orthodox'],
      hashtags: ['АлександрНевский', 'Православие', 'Россия'],
    },
    {
      title: 'Рождество Пресвятой Богородицы',
      startDate: `${year}-09-21T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'sparkles',
      description: `### Рождество Пресвятой Владычицы нашей Богородицы и Приснодевы Марии

Первый двунадесятый праздник нового церковного года. Воспоминание рождения Девы Марии у праведных Иоакима и Анны. Праздник вселенской радости и начала исполнения спасения человечества.`,
      taxonomyPath: 'holidays.christian.orthodox.great_feasts',
      folders: ['Holidays/Christian/Orthodox/Feasts', 'Holidays/Christian/Orthodox'],
      hashtags: ['РождествоБогородицы', 'Богородица', 'ДвунадесятыеПраздники', 'Православие'],
      sourceLink: 'https://azbyka.ru/days/p-rozhdestvo-bogorodicy',
    },
    {
      title: 'Воздвижение Креста Господня',
      startDate: `${year}-09-27T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'shield',
      description: `### Всемирное Воздвижение Честнаго и Животворящего Креста Господня

Двунадесятый праздник в память обретения Честного Креста в Иерусалиме царицей Еленой. День строгого поста и торжественного поклонения Кресту Христову.`,
      taxonomyPath: 'holidays.christian.orthodox.great_feasts',
      folders: ['Holidays/Christian/Orthodox/Feasts', 'Holidays/Christian/Orthodox'],
      hashtags: ['ВоздвижениеКреста', 'КрестГосподень', 'ДвунадесятыеПраздники', 'Православие'],
    },
    {
      title: 'День памяти святых Веры, Надежды, Любови и матери их Софии',
      startDate: `${year}-09-30T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'heart',
      description: `### Память святых мучениц Веры, Надежды, Любови и матери их Софии

Воспоминание мученического подвига святых сестер и их матери в Риме II века. Торжество трех главных христианских добродетелей — Веры, Надежды и Любви.`,
      taxonomyPath: 'holidays.christian.orthodox.feasts',
      folders: ['Holidays/Christian/Orthodox/Feasts', 'Holidays/Christian/Orthodox'],
      hashtags: ['ВераНадеждаЛюбовь', 'СвятаяСофия', 'Православие'],
    },
    {
      title: 'Покров Пресвятой Богородицы',
      startDate: `${year}-10-14T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'shield',
      description: `### Покров Пресвятой Владычицы нашей Богородицы и Приснодевы Марии

Великий праздник в память явления Богоматери святому Андрею Юродивому во Влахернском храме Константинополя. Молитвенный покров и заступничество Божией Матери над всеми верующими.`,
      taxonomyPath: 'holidays.christian.orthodox.great_feasts',
      folders: ['Holidays/Christian/Orthodox/Feasts', 'Holidays/Christian/Orthodox'],
      hashtags: ['Покров', 'Богородица', 'Православие'],
      sourceLink: 'https://azbyka.ru/days/p-pokrov-presvyatoj-bogorodicy',
    },
    {
      title: 'Празднование Казанской иконе Божией Матери',
      startDate: `${year}-11-04T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'shield',
      description: `### Празднование Казанской иконе Божией Матери (в память избавления Москвы и России от поляков в 1612 году)

Великий общецерковный праздник в память освобождения Москвы силами народного ополчения Кузьмы Минина и князя Дмитрия Пожарского. В России отмечается также государственный праздник День народного единства.`,
      taxonomyPath: 'holidays.christian.orthodox.feasts',
      folders: ['Holidays/Christian/Orthodox/Feasts', 'Holidays/Christian/Orthodox'],
      hashtags: ['КазанскаяИкона', 'Богородица', 'ДеньНародногоЕдинства', 'Православие'],
    },
    {
      title: 'Введение во храм Пресвятой Богородицы',
      startDate: `${year}-12-04T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'church',
      description: `### Введение во храм Пресвятой Владычицы нашей Богородицы и Приснодевы Марии

Двунадесятый праздник. Воспоминание приведения трехлетней Марии родителями Иоакимом и Анной в Иерусалимский храм для посвящения Богу.`,
      taxonomyPath: 'holidays.christian.orthodox.great_feasts',
      folders: ['Holidays/Christian/Orthodox/Feasts', 'Holidays/Christian/Orthodox'],
      hashtags: ['ВведениеВоХрам', 'Богородица', 'ДвунадесятыеПраздники', 'Православие'],
    },
    {
      title: 'День памяти святителя Николая Чудотворца (Зимний)',
      startDate: `${year}-12-19T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'gift',
      description: `### День памяти святителя Николая, архиепископа Мир Ликийских, чудотворца

Один из самых радостных зимних церковных праздников. Святитель Николай — покровитель путешественников, сирот, моряков и защитник невинно осужденных. Прообраз рождественского дарителя подарков.`,
      taxonomyPath: 'holidays.christian.orthodox.feasts',
      folders: ['Holidays/Christian/Orthodox/Feasts', 'Holidays/Christian/Orthodox'],
      hashtags: ['НиколайЧудотворец', 'НиколаЗимний', 'Православие', 'Подарки'],
    },
  ];
}
