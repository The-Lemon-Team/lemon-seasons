import { NoteType } from '@prisma/client';
import { HolidayItem } from '../holidays-engine.service';

/**
 * Official state, public, and cultural non-military holidays of the Russian Federation for 2026.
 */
export function getRussianOfficialHolidaysData(year = 2026): HolidayItem[] {
  return [
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
      hashtags: ['НовыйГод', 'Каникулы', 'Россия', 'Праздники'],
      sourceLink: 'http://government.ru',
    },
    {
      title: 'Татьянин день (День российского студенчества)',
      startDate: `${year}-01-25T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'graduation-cap',
      description: `### Татьянин день — День российского студенчества

Памятная дата России (Указ Президента РФ № 76 от 25 января 2005 года). В 1755 году в день святой мученицы Татианы императрица Елизавета Петровна подписала Указ об учреждении Московского университета (МГУ). Традиционный праздник студенческого братства, молодости и науки.`,
      taxonomyPath: 'holidays.russia.official',
      folders: ['Holidays/Russia/Official', 'Holidays/Russia'],
      hashtags: ['ТатьянинДень', 'Студенты', 'МГУ', 'Россия'],
    },
    {
      title: 'День российской науки',
      startDate: `${year}-02-08T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'flask',
      description: `### 8 февраля — День российской науки

Профессиональный праздник ученых и исследователей. В этот день в 1724 году указом Петра I была основана Российская академия наук (РАН). Чествование выдающихся открытий российских ученых в физике, химии, математике, медицине и исследовании космоса.`,
      taxonomyPath: 'holidays.russia.official',
      folders: ['Holidays/Russia/Official', 'Holidays/Russia'],
      hashtags: ['ДеньНауки', 'РАН', 'НаукаРоссии', 'Исследования'],
    },
    {
      title: 'Международный женский день (8 Марта)',
      startDate: `${year}-03-08T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'heart',
      imageUrl: 'https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11?w=800',
      imageCaption: 'Весенние цветы и поздравления',
      description: `### Международный женский день

Государственный нерабочий праздничный день в России (ст. 112 ТК РФ). Праздник весны, женской красоты, материнства и уважения к женщинам. Традиционно сопровождается дарением тюльпанов, мимоз и теплыми поздравлениями в семье и коллективах.`,
      taxonomyPath: 'holidays.russia.official',
      folders: ['Holidays/Russia/Official', 'Holidays/Russia'],
      hashtags: ['8Марта', 'Весна', 'ЖенскийДень', 'Цветы'],
      sourceLink: 'http://kremlin.ru',
    },
    {
      title: 'День космонавтики (Триумф Юрия Гагарина)',
      startDate: `${year}-04-12T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'rocket',
      imageUrl: 'https://images.unsplash.com/photo-1517976487507-5d3b3da37049?w=800',
      imageCaption: 'Первый полет человека в космос — Юрий Гагарин',
      description: `### 12 апреля — День космонавтики (32-ФЗ)

Памятная дата России и Международный день полета человека в космос (ООН). 12 апреля 1961 года советский космонавт Юрий Алексеевич Гагарин на космическом корабле «Восток-1» впервые в мировой истории совершил орбитальный облет Земли продолжительностью 108 минут. Знаменитое гагаринское: **«Поехали!»**.`,
      taxonomyPath: 'holidays.russia.official',
      folders: ['Holidays/Russia/Official', 'Holidays/Russia'],
      hashtags: ['ДеньКосмонавтики', 'Гагарин', 'Поехали', 'Космос', 'Роскосмос'],
      sourceLink: 'https://roscosmos.ru',
    },
    {
      title: 'Праздник Весны и Труда (1 Мая)',
      startDate: `${year}-05-01T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'sun',
      description: `### Праздник Весны и Труда

Государственный нерабочий праздничный день в РФ. Традиционный российский весенний праздник, символизирующий уважение к труду, созидание и солидарность. Начало майских праздников и дачного сезона.`,
      taxonomyPath: 'holidays.russia.official',
      folders: ['Holidays/Russia/Official', 'Holidays/Russia'],
      hashtags: ['1Мая', 'Первомай', 'ПраздникТруда', 'Весна'],
    },
    {
      title: 'День славянской письменности и культуры',
      startDate: `${year}-05-24T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'book-open',
      description: `### 24 мая — День славянской письменности и культуры

День памяти святых равноапостольных братьев Мефодия и Кирилла, создателей славянской азбуки (кириллицы). Праздник духовного единства славянских народов, просвещения и богатейшего литературного наследия.`,
      taxonomyPath: 'holidays.russia.official',
      folders: ['Holidays/Russia/Official', 'Holidays/Russia'],
      hashtags: ['КириллИМефодий', 'СлавянскаяПисьменность', 'Культура'],
    },
    {
      title: 'Международный день защиты детей',
      startDate: `${year}-06-01T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'smile',
      description: `### 1 июня — День защиты детей

Праздник радости, детства и напоминание взрослым о необходимости соблюдения прав детей на жизнь, здоровье, образование, защиту от насилия и безопасное будущее. Начало школьных летних каникул.`,
      taxonomyPath: 'holidays.russia.official',
      folders: ['Holidays/Russia/Official', 'Holidays/Russia'],
      hashtags: ['ДеньЗащитыДетей', '1Июня', 'Дети', 'Каникулы'],
    },
    {
      title: 'Пушкинский день — День русского языка',
      startDate: `${year}-06-06T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'feather',
      description: `### 6 июня — Пушкинский день в России (День русского языка)

День рождения великого русского поэта Александра Сергеевича Пушкина (1799–1837), основоположника современного русского литературного языка. Праздник русского слова и мирового признания классической литературы.`,
      taxonomyPath: 'holidays.russia.official',
      folders: ['Holidays/Russia/Official', 'Holidays/Russia'],
      hashtags: ['ПушкинскийДень', 'ДеньРусскогоЯзыка', 'Пушкин', 'Литература'],
    },
    {
      title: 'День России',
      startDate: `${year}-06-12T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'flag',
      imageUrl: 'https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=800',
      imageCaption: 'День России — праздник национального единства',
      description: `### День России (12 июня)

Главный государственный праздник страны (ст. 112 ТК РФ), знаменующий принятие Декларации о государственном суверенитете Российской Федерации 12 июня 1990 года. Торжественная церемония вручения Государственных премий РФ в Кремле, праздничные концерты на Красной площади и грандиозный салют.`,
      taxonomyPath: 'holidays.russia.official',
      folders: ['Holidays/Russia/Official', 'Holidays/Russia'],
      hashtags: ['ДеньРоссии', '12Июня', 'Родина', 'ФлагРоссии'],
      sourceLink: 'http://kremlin.ru',
    },
    {
      title: 'День молодежи России',
      startDate: `${year}-06-27T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'zap',
      description: `### День молодежи России

Праздник энергии, стремлений, творчества и инноваций молодого поколения страны. Фестивали, спортивные состязания, научные лектории и образовательные мастер-классы.`,
      taxonomyPath: 'holidays.russia.official',
      folders: ['Holidays/Russia/Official', 'Holidays/Russia'],
      hashtags: ['ДеньМолодежи', 'МолодежьРоссии', 'Энергия'],
    },
    {
      title: 'Всероссийский день семьи, любви и верности',
      startDate: `${year}-07-08T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'heart',
      description: `### 8 июля — День семьи, любви и верности

Государственный праздник России (Указ Президента РФ № 411 от 28 июня 2022 года). Приурочен ко дню памяти святых благоверных князей Петра и Февронии Муромских. Символ праздника — ромашка. Вручение медалей «За любовь и верность» парам, прожившим в браке более 25 лет.`,
      taxonomyPath: 'holidays.russia.official',
      folders: ['Holidays/Russia/Official', 'Holidays/Russia'],
      hashtags: ['ДеньСемьи', 'ЛюбовьИВерность', 'ПетрИФеврония', 'Ромашка'],
    },
    {
      title: 'День Государственного флага Российской Федерации',
      startDate: `${year}-08-22T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'flag',
      imageUrl: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800',
      imageCaption: 'Российский триколор: Белый, Синий, Красный',
      description: `### 22 августа — День Государственного флага РФ

Праздник в честь национального триколора, учрежденный Указом Президента РФ в 1994 году. 22 августа 1991 года Верховный Совет РСФСР постановил считать трехцветное историческое знамя официальным национальным флагом России.`,
      taxonomyPath: 'holidays.russia.official',
      folders: ['Holidays/Russia/Official', 'Holidays/Russia'],
      hashtags: ['ДеньФлага', 'Триколор', 'ФлагРоссии', '22Августа'],
    },
    {
      title: 'День знаний (1 Сентября)',
      startDate: `${year}-09-01T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'book-open',
      imageUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800',
      imageCaption: 'Первый звонок и начало нового учебного года',
      description: `### 1 Сентября — День знаний

Государственный праздник начала нового учебного года в школах, гимназиях, лицеях, колледжах и университетах России. Торжественные школьные линейки, белые банты, первые звонки для первоклассников и букеты учителям.`,
      taxonomyPath: 'holidays.russia.official',
      folders: ['Holidays/Russia/Official', 'Holidays/Russia'],
      hashtags: ['ДеньЗнаний', '1Сентября', 'Школа', 'ПервыйЗвонок'],
    },
    {
      title: 'День учителя в России',
      startDate: `${year}-10-05T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'award',
      description: `### 5 октября — День учителя

Профессиональный праздник работников сферы школьного образования. Чествование благородного и самоотверженного труда педагогов, наставников и воспитателей.`,
      taxonomyPath: 'holidays.russia.official',
      folders: ['Holidays/Russia/Official', 'Holidays/Russia'],
      hashtags: ['ДеньУчителя', 'СпасибоУчителям', 'Образование'],
    },
    {
      title: 'День матери в России',
      startDate: `${year}-11-29T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'heart',
      description: `### День матери (последнее воскресенье ноября)

Трогательный общенациональный праздник, учрежденный Указом Президента РФ в 1998 году. Воздаяние должного материнскому труду, бескорыстной любви, заботе и сохранению семейных традиций. Символ праздника — цветок незабудка.`,
      taxonomyPath: 'holidays.russia.official',
      folders: ['Holidays/Russia/Official', 'Holidays/Russia'],
      hashtags: ['ДеньМатери', 'Мама', 'Семья', 'СпасибоМама'],
    },
    {
      title: 'День Конституции Российской Федерации',
      startDate: `${year}-12-12T00:00:00.000Z`,
      type: NoteType.EVENT,
      icon: 'shield',
      description: `### 12 декабря — День Конституции РФ (32-ФЗ)

Памятная дата России в честь принятия всенародным голосованием Основного Закона страны 12 декабря 1993 года. Конституция провозглашает человека, его права и свободы высшей ценностью, утверждает суверенитет и целостность Российского государства.`,
      taxonomyPath: 'holidays.russia.official',
      folders: ['Holidays/Russia/Official', 'Holidays/Russia'],
      hashtags: ['ДеньКонституции', '12Декабря', 'КонституцияРФ', 'Закон'],
      sourceLink: 'http://constitution.kremlin.ru',
    },
  ];
}
