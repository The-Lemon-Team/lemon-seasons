import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NoteType } from '@prisma/client';

export interface MovieReleaseItem {
  title: string;
  originalTitle?: string;
  releaseDate: string; // ISO date
  endDate?: string;
  type: NoteType;
  description: string;
  posterUrl: string;
  backdropUrl?: string;
  trailerUrl?: string;
  sourceLink?: string;
  taxonomyPath: string;
  folders: string[];
  hashtags: string[];
  rating?: number;
}

@Injectable()
export class TmdbService {
  private readonly logger = new Logger(TmdbService.name);
  private readonly apiKey?: string;
  private readonly baseUrl = 'https://api.themoviedb.org/3';
  private readonly imageBaseUrl = 'https://image.tmdb.org/t/p/w780';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('TMDB_API_KEY');
    if (this.apiKey) {
      this.logger.log('🎬 TMDB API key detected. Live movie sync active.');
    } else {
      this.logger.log('🎬 Using curated MCU Phase 5 & 6 snapshot with TMDB CDN assets.');
    }
  }

  /**
   * Returns list of Marvel Cinematic Universe movie and series releases.
   */
  async getMcuReleases(): Promise<MovieReleaseItem[]> {
    if (this.apiKey) {
      try {
        const liveItems = await this.fetchLiveMcuReleases();
        if (liveItems.length > 0) {
          return liveItems;
        }
      } catch (error: any) {
        this.logger.error(`Failed to fetch live MCU releases from TMDB: ${error?.message}. Using curated MCU dataset.`);
      }
    }

    return this.getCuratedMcuDataset();
  }

  private async fetchLiveMcuReleases(): Promise<MovieReleaseItem[]> {
    // Marvel Studios Company ID in TMDB is 420
    const url = `${this.baseUrl}/discover/movie?api_key=${this.apiKey}&with_companies=420&primary_release_date.gte=2025-01-01&sort_by=primary_release_date.asc&language=ru-RU`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`TMDB error ${res.status}`);
    const data = await res.json();

    const results: MovieReleaseItem[] = [];
    for (const m of data.results || []) {
      if (!m.release_date || !m.title) continue;
      results.push({
        title: m.title,
        originalTitle: m.original_title,
        releaseDate: new Date(m.release_date).toISOString(),
        type: NoteType.FILM_RELEASE,
        description: `### ${m.title} (${m.original_title})\n\n${m.overview || 'Официальный кинорелиз Marvel Studios.'}\n\n- **Рейтинг TMDB:** ⭐ ${m.vote_average || 'Ожидается'}/10\n- **Дата мировой премьеры:** ${m.release_date}\n\n> Релиз входит в Кинематографическую вселенную Marvel (MCU).`,
        posterUrl: m.poster_path ? `${this.imageBaseUrl}${m.poster_path}` : 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=800',
        backdropUrl: m.backdrop_path ? `https://image.tmdb.org/t/p/original${m.backdrop_path}` : undefined,
        sourceLink: `https://www.themoviedb.org/movie/${m.id}`,
        taxonomyPath: 'films.marvel.movies',
        folders: ['Films/Marvel'],
        hashtags: ['Marvel', 'MCU', 'Кинопремьера'],
        rating: m.vote_average,
      });
    }

    return results;
  }

  /**
   * Search movies by title across TMDB or curated database
   */
  async searchMovies(query: string): Promise<MovieReleaseItem[]> {
    if (!query || !query.trim()) {
      return this.getCuratedMcuDataset();
    }

    if (this.apiKey) {
      try {
        const url = `${this.baseUrl}/search/movie?api_key=${this.apiKey}&query=${encodeURIComponent(query.trim())}&language=ru-RU&include_adult=false`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const items: MovieReleaseItem[] = [];
          for (const m of data.results || []) {
            if (!m.title) continue;
            items.push({
              title: m.title,
              originalTitle: m.original_title,
              releaseDate: m.release_date ? new Date(m.release_date).toISOString() : new Date().toISOString(),
              type: NoteType.FILM_RELEASE,
              description: `### ${m.title} (${m.original_title})\n\n${m.overview || 'Кинопремьера.'}\n\n- **Рейтинг TMDB:** ⭐ ${m.vote_average || 0}/10\n- **Дата выхода:** ${m.release_date || 'Не указана'}`,
              posterUrl: m.poster_path ? `${this.imageBaseUrl}${m.poster_path}` : 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800',
              backdropUrl: m.backdrop_path ? `https://image.tmdb.org/t/p/original${m.backdrop_path}` : undefined,
              sourceLink: `https://www.themoviedb.org/movie/${m.id}`,
              taxonomyPath: 'films.movies',
              folders: ['Films'],
              hashtags: ['Кино', 'Премьера'],
              rating: m.vote_average,
            });
          }
          if (items.length > 0) return items;
        }
      } catch (err: any) {
        this.logger.warn(`TMDB live search error: ${err.message}`);
      }
    }

    const q = query.toLowerCase().trim();
    return this.getCuratedMcuDataset().filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        (m.originalTitle && m.originalTitle.toLowerCase().includes(q)) ||
        m.description.toLowerCase().includes(q),
    );
  }

  /**
   * Curated high-fidelity MCU Phase 5 & 6 snapshot with accurate dates and TMDB posters
   */
  getCuratedMcuDataset(): MovieReleaseItem[] {
    return [
      {
        title: 'Капитан Америка: Новый мир',
        originalTitle: 'Captain America: Brave New World',
        releaseDate: '2025-02-14T00:00:00.000Z',
        type: NoteType.FILM_RELEASE,
        description: `### Капитан Америка: Новый мир (Captain America: Brave New World)

Сэм Уилсон официально берет на себя мантию Капитана Америки и оказывается втянутым в глобальный международный заговор. Президент США Таддеус Росс предлагает Сэму восстановить статус Мстителей, но напряжение между мировыми державами из-за адамантия ставит мир на грань войны.

#### Ключевые персонажи и события:
- **Сэм Уилсон (Энтони Маки)** — новый символ надежды и дипломатии.
- **Таддеус "Громовержец" Росс / Красный Халк (Харрисон Форд)**.
- **Лидер / Сэмюэл Стернс (Тим Блейк Нельсон)** — скрытый манипулятор событий.
- Введение металла адамантия в Киновселенную Marvel.

> "Ты можешь быть Капитаном Америкой, но ты не Стив Роджерс." — Президент Росс`,
        posterUrl: 'https://image.tmdb.org/t/p/w780/pzId5qGvI8t2Nn7b2qP7EaX2fLh.jpg',
        backdropUrl: 'https://image.tmdb.org/t/p/original/b33nnKl1GSFbao8l3urDDujMMQj.jpg',
        trailerUrl: 'https://www.youtube.com/watch?v=1pHDWnXmK7Y',
        sourceLink: 'https://www.marvel.com/movies/captain-america-brave-new-world',
        taxonomyPath: 'films.marvel.phase5',
        folders: ['Films/Marvel/Phase5', 'Films/Marvel'],
        hashtags: ['Marvel', 'CaptainAmerica', 'MCU', 'КрасныйХалк'],
      },
      {
        title: 'Сорвиголова: Рожденный заново (Сезон 1)',
        originalTitle: 'Daredevil: Born Again',
        releaseDate: '2025-03-04T00:00:00.000Z',
        endDate: '2025-04-22T00:00:00.000Z',
        type: NoteType.PERIOD,
        description: `### Сорвиголова: Рожденный заново (Daredevil: Born Again)

Долгожданное возвращение Мэтта Мердока и Уилсона Фиска в телевизионном формате Marvel Television на Disney+. Фиск баллотируется в мэры Нью-Йорка, ведя войну с супергероями на улицах Адской Кухни.

#### В главных ролях:
- **Чарли Кокс** — Мэтт Мердок / Сорвиголова
- **Винсент Д’Онофрио** — Уилсон Фиск / Кингпин
- **Джон Бернтал** — Фрэнк Касл / Каратель
- **Элден Хенсон & Дебора Энн Уолл** — Фогги Нельсон и Карен Пейдж

> Уличный уровень Киновселенной Marvel возвращает взрослый рейтинг TV-MA и мрачный тон.`,
        posterUrl: 'https://image.tmdb.org/t/p/w780/fcFMb4YtVfC1rYy0f10c6X3N0Yp.jpg',
        trailerUrl: 'https://www.youtube.com/watch?v=7XjB5jI4JjA',
        sourceLink: 'https://www.marvel.com/tv-shows/daredevil-born-again',
        taxonomyPath: 'films.marvel.series',
        folders: ['Films/Marvel/Series', 'Films/Marvel'],
        hashtags: ['Daredevil', 'Сорвиголова', 'Punisher', 'DisneyPlus'],
      },
      {
        title: 'Громовержцы*',
        originalTitle: 'Thunderbolts*',
        releaseDate: '2025-05-02T00:00:00.000Z',
        type: NoteType.FILM_RELEASE,
        description: `### Громовержцы* (Thunderbolts*)

Необычная команда антигероев и бывших наемников отправляется на секретную самоубийственную миссию под кураторством графини Валентины Аллегры де Фонтейн.

#### Состав команды:
- **Елена Белова (Флоренс Пью)** — Белая Вдова
- **Баки Барнс (Себастиан Стэн)** — Зимний Солдат
- **Алексей Шостаков (Дэвид Харбор)** — Красный Страж
- **Джон Уокер (Уайатт Рассел)** — Агент США
- **Призрак (Ханна Джон-Кэймен)** & **Таскмастер (Ольга Куриленко)**
- **Боб / Часовой (Льюис Пуллман)** — могущественный Sentry

> Звездочка в названии фильма скрывает важный сюжетный твист финала 5 Фазы MCU!`,
        posterUrl: 'https://image.tmdb.org/t/p/w780/mNm5bWzXnJ9o9oY7r8rF8kM4G0b.jpg',
        backdropUrl: 'https://image.tmdb.org/t/p/original/9BBTo63ANSmAgdva2UT6uv8e6yt.jpg',
        trailerUrl: 'https://www.youtube.com/watch?v=-sao-wP9_uM',
        sourceLink: 'https://www.marvel.com/movies/thunderbolts',
        taxonomyPath: 'films.marvel.phase5',
        folders: ['Films/Marvel/Phase5', 'Films/Marvel'],
        hashtags: ['Thunderbolts', 'Громовержцы', 'YelenaBelova', 'BuckyBarnes'],
      },
      {
        title: 'Фантастическая Четвёрка: Первые шаги',
        originalTitle: 'The Fantastic Four: First Steps',
        releaseDate: '2025-07-25T00:00:00.000Z',
        type: NoteType.FILM_RELEASE,
        description: `### Фантастическая Четвёрка: Первые шаги (The Fantastic Four: First Steps)

Первая семья Marvel вступает в MCU в ретро-футуристическом сеттинге 1960-х годов альтернативной вселенной. Герои сталкиваются с космической угрозой в лице Пожирателя Миров Галактуса и его вестника Серебряного Сёрфера.

#### Состав Четвёрки:
- **Педро Паскаль** — Рид Ричардс / Мистер Фантастик
- **Ванесса Кирби** — Сью Шторм / Невидимая Леди
- **Джозеф Куинн** — Джонни Шторм / Человек-Факел
- **Эбон Мосс-Бакрак** — Бен Гримм / Существо
- **Ральф Айнесон** — Галактус
- **Джулия Гарнер** — Шалла-Бал / Серебряный Сёрфер

> Официальный старт Шестой Фазы Киновселенной Marvel (Phase 6).`,
        posterUrl: 'https://image.tmdb.org/t/p/w780/4kK9kZ0C1n4N2P3p2kF8p6q6y2X.jpg',
        sourceLink: 'https://www.marvel.com/movies/the-fantastic-four-first-steps',
        taxonomyPath: 'films.marvel.phase6',
        folders: ['Films/Marvel/Phase6', 'Films/Marvel'],
        hashtags: ['FantasticFour', 'ФантастическаяЧетверка', 'MCUPhase6', 'Galactus'],
      },
      {
        title: 'Мстители: Судный день',
        originalTitle: 'Avengers: Doomsday',
        releaseDate: '2026-05-01T00:00:00.000Z',
        type: NoteType.FILM_RELEASE,
        description: `### Мстители: Судный день (Avengers: Doomsday)

Кульминация Саги Мультивселенной. Братья Энтони и Джо Руссо возвращаются к режиссуре самого масштабного кроссовера десятилетия. 

#### Главная сенсация:
- **Роберт Дауни-младший** возвращается в киновселенную в роли величайшего злодея — **Виктора фон Дума / Доктора Дума**!
- Сбор героев Земли, Фантастической Четверки, Людей Икс и героев из параллельных измерений.
- Начало столкновения миров (Incursions), ведущее к коллапсу временных линий.

> "Новая маска. Тот же уровень величия." — Роберт Дауни-мл. на Comic-Con.`,
        posterUrl: 'https://image.tmdb.org/t/p/w780/7WsyChvgzgdujVy3v5A2w7Xp6A.jpg',
        sourceLink: 'https://www.marvel.com/movies/avengers-doomsday',
        taxonomyPath: 'films.marvel.phase6',
        folders: ['Films/Marvel/Phase6', 'Films/Marvel'],
        hashtags: ['Avengers', 'Doomsday', 'DoctorDoom', 'RDJ', 'Мстители'],
      },
      {
        title: 'Человек-паук: Совершенно новый день (Человек-паук 4)',
        originalTitle: 'Spider-Man 4: Brand New Day',
        releaseDate: '2026-07-24T00:00:00.000Z',
        type: NoteType.FILM_RELEASE,
        description: `### Человек-паук 4 (Spider-Man: Brand New Day)

Том Холланд возвращается к роли Питера Паркера в новой трилогии. После заклятия Доктора Стрэнджа мир забыл о существовании Питера, и юный герой вынужден балансировать между учебой в колледже, защитой улиц Нью-Йорка и новыми угрозами.

- **Режиссер:** Дестин Дэниел Креттон (*Шан-Чи*)
- **В главных ролях:** Том Холланд, Зендея
- Взаимодействие с уличными героями Marvel (Сорвиголова) и подготовка к битве в *Secret Wars*.`,
        posterUrl: 'https://image.tmdb.org/t/p/w780/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg',
        sourceLink: 'https://www.marvel.com/movies/spider-man',
        taxonomyPath: 'films.marvel.phase6',
        folders: ['Films/Marvel/Phase6', 'Films/Marvel'],
        hashtags: ['SpiderMan', 'ЧеловекПаук', 'TomHolland', 'MCU'],
      },
      {
        title: 'Мстители: Секретные войны',
        originalTitle: 'Avengers: Secret Wars',
        releaseDate: '2027-05-07T00:00:00.000Z',
        type: NoteType.FILM_RELEASE,
        description: `### Мстители: Секретные войны (Avengers: Secret Wars)

Грандиозный финал Саги Мультивселенной (The Multiverse Saga). Создание Мира Битв (Battleworld) и объединение абсолютно всех итераций супергероев Marvel за всю 25-летнюю историю кинематографа: MCU, вселенной Fox (Люди Икс), вселенных Сэма Рэйми и Марка Уэбба.

> Фильм призван стать величайшим кроссовером в истории кино и мягким перезапуском Вселенной Marvel на следующее десятилетие.`,
        posterUrl: 'https://image.tmdb.org/t/p/w780/bOGkgRGdhrBYJSLpXaxhXVstNsV.jpg',
        sourceLink: 'https://www.marvel.com/movies/avengers-secret-wars',
        taxonomyPath: 'films.marvel.phase6',
        folders: ['Films/Marvel/Phase6', 'Films/Marvel'],
        hashtags: ['AvengersSecretWars', 'Battleworld', 'MultiverseSaga', 'Marvel'],
      },
    ];
  }
}
