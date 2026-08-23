import React, { useState, useEffect } from 'react';
import {
  Tabs,
  Input,
  Button,
  Select,
  DatePicker,
  Tag,
  message,
  notification,
  Spin,
  Tooltip,
  Modal,
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { NoteType } from '@lenta/shared';
import {
  ingestionApi,
  IngestionStatus,
  IngestionResult,
  MovieReleaseItem,
  HolidayItem,
  PoliticalEventItem,
} from '../../api/client';
import { useFeeds } from '../../api/queries';
import { useAdminI18n } from '../../i18n';

const { TextArea } = Input;

export const GeneratorLabPage: React.FC = () => {
  const { t } = useAdminI18n();
  const { data: feeds = [] } = useFeeds();

  // Status & Provider info
  const [status, setStatus] = useState<IngestionStatus | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncResults, setSyncResults] = useState<IngestionResult[]>([]);

  // 1. AI Studio State (Gemini)
  const [aiTitle, setAiTitle] = useState('Битва на Курской дуге');
  const [aiCategory, setAiCategory] = useState('Русские военные праздники');
  const [aiDate, setAiDate] = useState<Dayjs | null>(dayjs('2026-08-23'));
  const [aiFeedSlug, setAiFeedSlug] = useState('russian-holidays');
  const [aiContext, setAiContext] = useState('');
  const [aiType, setAiType] = useState<NoteType>(NoteType.EVENT);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMarkdown, setGeneratedMarkdown] = useState('');
  const [generatedHashtags, setGeneratedHashtags] = useState<string[]>([]);
  const [isSavingNote, setIsSavingNote] = useState(false);

  // 2. TMDB Movie Radar State
  const [movieQuery, setMovieQuery] = useState('');
  const [isSearchingMovies, setIsSearchingMovies] = useState(false);
  const [moviesList, setMoviesList] = useState<MovieReleaseItem[]>([]);
  const [importingMovieTitle, setImportingMovieTitle] = useState<string | null>(null);

  // 3. Holidays Calculator State
  const [holidayYear, setHolidayYear] = useState(2026);
  const [holidayCategory, setHolidayCategory] = useState<'russian' | 'christian'>('russian');
  const [isLoadingHolidays, setIsLoadingHolidays] = useState(false);
  const [holidaysList, setHolidaysList] = useState<HolidayItem[]>([]);

  // 4. Politics 2026 State
  const [isLoadingPolitics, setIsLoadingPolitics] = useState(false);
  const [politicsList, setPoliticsList] = useState<PoliticalEventItem[]>([]);

  // Load Status on mount
  useEffect(() => {
    loadStatus();
    loadMovies('');
    loadHolidays(2026, 'russian');
    loadPolitics();
  }, []);

  const loadStatus = async () => {
    try {
      const data = await ingestionApi.getStatus();
      setStatus(data);
    } catch {
      // Ignored
    }
  };

  const loadMovies = async (q: string) => {
    setIsSearchingMovies(true);
    try {
      const data = await ingestionApi.searchMovies(q);
      setMoviesList(data);
    } catch (err: any) {
      message.error(`Ошибка поиска фильмов: ${err.message}`);
    } finally {
      setIsSearchingMovies(false);
    }
  };

  const loadHolidays = async (year: number, cat: 'russian' | 'christian') => {
    setIsLoadingHolidays(true);
    try {
      const data = await ingestionApi.getHolidaysPreview(year, cat);
      setHolidaysList(data);
    } catch (err: any) {
      message.error(`Ошибка расчета праздников: ${err.message}`);
    } finally {
      setIsLoadingHolidays(false);
    }
  };

  const loadPolitics = async () => {
    setIsLoadingPolitics(true);
    try {
      const data = await ingestionApi.getPoliticsPreview();
      setPoliticsList(data);
    } catch (err: any) {
      message.error(`Ошибка загрузки событий: ${err.message}`);
    } finally {
      setIsLoadingPolitics(false);
    }
  };

  // Generate with Gemini
  const handleGenerateWithAi = async () => {
    if (!aiTitle.trim()) {
      message.warning('Введите название события');
      return;
    }

    setIsGenerating(true);
    try {
      const dateStr = aiDate ? aiDate.format('YYYY-MM-DD') : '2026';
      const result = await ingestionApi.generateAiContent({
        title: aiTitle.trim(),
        category: aiCategory,
        dateStr,
        context: aiContext.trim() || undefined,
      });

      setGeneratedMarkdown(result.description);
      setGeneratedHashtags(result.hashtags || []);
      message.success('✨ Текст успешно сгенерирован Gemini AI!');
    } catch (err: any) {
      message.error(`Ошибка генерации: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Save generated note directly into DB
  const handleSaveAiNote = async () => {
    if (!generatedMarkdown.trim()) {
      message.warning('Сначала сгенерируйте описание заметки');
      return;
    }

    setIsSavingNote(true);
    try {
      const dateIso = aiDate ? aiDate.toISOString() : new Date().toISOString();
      await ingestionApi.importNote({
        feedSlug: aiFeedSlug,
        title: aiTitle.trim(),
        description: generatedMarkdown,
        type: aiType,
        startDate: dateIso,
        taxonomyPath:
          aiFeedSlug === 'mcu-radar'
            ? 'films.marvel'
            : aiFeedSlug === 'russian-holidays'
            ? 'holidays.russia.military'
            : aiFeedSlug === 'christian-holidays'
            ? 'holidays.christian'
            : 'politics.international',
        folders: [
          aiFeedSlug === 'mcu-radar'
            ? 'Films/Marvel'
            : aiFeedSlug === 'russian-holidays'
            ? 'Holidays/Russia'
            : aiFeedSlug === 'christian-holidays'
            ? 'Holidays/Christian'
            : 'Politics',
        ],
        hashtags: generatedHashtags,
      });

      notification.success({
        message: 'Заметка сохранена в календарь!',
        description: `Заметка "${aiTitle}" добавлена в ленту "${aiFeedSlug}".`,
      });
    } catch (err: any) {
      message.error(`Ошибка сохранения: ${err.message}`);
    } finally {
      setIsSavingNote(false);
    }
  };

  // Import single Movie from TMDB
  const handleImportMovie = async (movie: MovieReleaseItem) => {
    setImportingMovieTitle(movie.title);
    try {
      await ingestionApi.importNote({
        feedSlug: 'mcu-radar',
        title: movie.title,
        description: movie.description,
        type: movie.type || NoteType.FILM_RELEASE,
        startDate: movie.releaseDate,
        endDate: movie.endDate,
        icon: 'movie',
        sourceLink: movie.sourceLink,
        taxonomyPath: movie.taxonomyPath,
        folders: movie.folders,
        hashtags: movie.hashtags,
        imageUrl: movie.posterUrl,
        imageCaption: `Постер: ${movie.title}`,
        trailerUrl: movie.trailerUrl,
      });

      message.success(`🎬 Фильм "${movie.title}" импортирован в MCU Radar!`);
    } catch (err: any) {
      message.error(`Ошибка импорта: ${err.message}`);
    } finally {
      setImportingMovieTitle(null);
    }
  };

  // Import Single Holiday
  const handleImportHoliday = async (item: HolidayItem) => {
    try {
      await ingestionApi.importNote({
        feedSlug: holidayCategory === 'christian' ? 'christian-holidays' : 'russian-holidays',
        title: item.title,
        description: item.description,
        type: item.type || NoteType.EVENT,
        startDate: item.startDate,
        endDate: item.endDate,
        icon: item.icon,
        sourceLink: item.sourceLink,
        taxonomyPath: item.taxonomyPath,
        folders: item.folders,
        hashtags: item.hashtags,
        imageUrl: item.imageUrl,
        imageCaption: item.imageCaption,
      });
      message.success(`✅ Праздник "${item.title}" добавлен в календарь!`);
    } catch (err: any) {
      message.error(`Ошибка импорта: ${err.message}`);
    }
  };

  // Import Single Political Event
  const handleImportPolitics = async (item: PoliticalEventItem) => {
    try {
      await ingestionApi.importNote({
        feedSlug: 'politics-2026',
        title: item.title,
        description: item.description,
        type: item.type || NoteType.PERIOD,
        startDate: item.startDate,
        endDate: item.endDate,
        icon: item.icon,
        sourceLink: item.sourceLink,
        taxonomyPath: item.taxonomyPath,
        folders: item.folders,
        hashtags: item.hashtags,
        imageUrl: item.imageUrl,
        imageCaption: item.imageCaption,
      });
      message.success(`🌐 Событие "${item.title}" добавлено в Политику 2026!`);
    } catch (err: any) {
      message.error(`Ошибка импорта: ${err.message}`);
    }
  };

  // Sync All Preset Feeds
  const handleSyncAllFeeds = async () => {
    setIsSyncingAll(true);
    try {
      const res = await ingestionApi.syncAll();
      setSyncResults(res.results);
      notification.success({
        message: 'Синхронизация завершена!',
        description: `Синхронизировано ${res.results.length} тематических каналов.`,
      });
    } catch (err: any) {
      message.error(`Ошибка синхронизации: ${err.message}`);
    } finally {
      setIsSyncingAll(false);
    }
  };

  // Sync Specific Feed
  const handleSyncSingleFeed = async (slug: string) => {
    try {
      const res = await ingestionApi.syncFeed(slug);
      notification.success({
        message: `Канал "${res.result.feedTitle}" обновлен!`,
        description: `Всего заметок: ${res.result.notesCount} (Создано: ${res.result.created}, Обновлено: ${res.result.updated})`,
      });
    } catch (err: any) {
      message.error(`Ошибка синхронизации ${slug}: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero */}
      <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-surface-container via-surface-container-high to-surface-container p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-primary text-[28px] animate-pulse">
                auto_awesome
              </span>
              <h1 className="text-2xl font-bold font-sans text-primary tracking-tight">
                AI & Generation Lab
              </h1>
              <Tag color="gold" className="ml-2 font-mono text-[11px]">
                PLAYGROUND
              </Tag>
            </div>
            <p className="text-xs text-on-surface-variant font-mono">
              Интерактивная лаборатория для тестирования генераций через Gemini AI, TMDB кинорадар и алгоритмические календари.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Status pills */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-on-surface-variant">Gemini 2.5:</span>
              <span className="text-primary font-bold">ACTIVE</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <span className="text-on-surface-variant">TMDB v3:</span>
              <span className="text-sky-300 font-bold">READY</span>
            </div>

            <Button
              type="primary"
              loading={isSyncingAll}
              onClick={handleSyncAllFeeds}
              className="bg-primary hover:bg-primary-hover text-on-primary font-semibold font-sans flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">sync</span>
              Синхронизировать все фиды
            </Button>
          </div>
        </div>
      </div>

      {/* Main Tabs Container */}
      <div className="bg-surface-container rounded-xl border border-white/5 p-6 shadow-md">
        <Tabs
          defaultActiveKey="gemini"
          tabBarStyle={{ marginBottom: 24 }}
          items={[
            // TAB 1: Gemini AI Studio
            {
              key: 'gemini',
              label: (
                <span className="flex items-center gap-2 font-semibold text-sm">
                  <span className="material-symbols-outlined text-[18px] text-amber-400">
                    psychology
                  </span>
                  Gemini AI Генератор
                </span>
              ),
              children: (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Form Controls */}
                  <div className="lg:col-span-5 space-y-4">
                    <div>
                      <label className="block text-xs font-mono text-on-surface-variant mb-1">
                        Название события / Тема *
                      </label>
                      <Input
                        value={aiTitle}
                        onChange={(e) => setAiTitle(e.target.value)}
                        placeholder="Например: Ледовое побоище или Саммит БРИКС"
                        className="bg-surface-container-high border-white/10 text-on-surface text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-mono text-on-surface-variant mb-1">
                          Категория
                        </label>
                        <Select
                          value={aiCategory}
                          onChange={setAiCategory}
                          className="w-full"
                          options={[
                            { value: 'Русские военные праздники', label: '⚔️ Военные праздники' },
                            { value: 'Русские праздники', label: '🇷🇺 Русские праздники' },
                            { value: 'Христианские праздники', label: '☦️ Христианские праздники' },
                            { value: 'Политические события 2026', label: '🌐 Политика 2026' },
                            { value: 'Marvel Universe', label: '🎬 Marvel Universe' },
                            { value: 'Технологии & Архитектура', label: '⚡ Технологии' },
                          ]}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-mono text-on-surface-variant mb-1">
                          Целевая лента
                        </label>
                        <Select
                          value={aiFeedSlug}
                          onChange={setAiFeedSlug}
                          className="w-full"
                          options={feeds.map((f) => ({
                            value: f.slug,
                            label: `${f.title}`,
                          }))}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-mono text-on-surface-variant mb-1">
                          Дата события
                        </label>
                        <DatePicker
                          value={aiDate}
                          onChange={setAiDate}
                          className="w-full bg-surface-container-high border-white/10"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-mono text-on-surface-variant mb-1">
                          Тип заметки
                        </label>
                        <Select
                          value={aiType}
                          onChange={setAiType}
                          className="w-full"
                          options={[
                            { value: NoteType.EVENT, label: 'EVENT (Событие)' },
                            { value: NoteType.PERIOD, label: 'PERIOD (Период)' },
                            { value: NoteType.SINGLE, label: 'SINGLE (Заметка)' },
                            { value: NoteType.FILM_RELEASE, label: 'FILM_RELEASE (Релиз)' },
                          ]}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-on-surface-variant mb-1">
                        Дополнительные инструкции / Контекст (опционально)
                      </label>
                      <TextArea
                        rows={3}
                        value={aiContext}
                        onChange={(e) => setAiContext(e.target.value)}
                        placeholder="Например: Сделай акцент на значении для истории, добавь цитату полководца и ключевые тезисы."
                        className="bg-surface-container-high border-white/10 text-on-surface text-xs"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        type="primary"
                        loading={isGenerating}
                        onClick={handleGenerateWithAi}
                        className="flex-1 bg-gradient-to-r from-primary to-amber-500 hover:opacity-90 text-on-primary font-bold font-sans h-10 flex items-center justify-center gap-2 shadow-md"
                      >
                        <span className="material-symbols-outlined text-[18px]">magic_button</span>
                        Сгенерировать с Gemini 2.5
                      </Button>
                    </div>
                  </div>

                  {/* Right Column: Workbench & Preview */}
                  <div className="lg:col-span-7 flex flex-col space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-primary flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">edit_note</span>
                        Результат генерации (Markdown)
                      </span>

                      {generatedHashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {generatedHashtags.map((h) => (
                            <Tag key={h} color="olive" className="text-[10px] font-mono">
                              #{h}
                            </Tag>
                          ))}
                        </div>
                      )}
                    </div>

                    {isGenerating ? (
                      <div className="flex-1 min-h-[320px] rounded-lg border border-white/10 bg-surface-container-low flex flex-col items-center justify-center p-8 text-center">
                        <Spin size="large" />
                        <p className="mt-4 font-mono text-xs text-primary animate-pulse">
                          Gemini 2.5 составляет богатое описание, подбирает хештеги и форматирует структуру...
                        </p>
                      </div>
                    ) : (
                      <TextArea
                        rows={14}
                        value={generatedMarkdown}
                        onChange={(e) => setGeneratedMarkdown(e.target.value)}
                        placeholder="Здесь появится сгенерированный Markdown текст заметки. Вы сможете отредактировать его перед сохранением."
                        className="font-mono text-xs bg-surface-container-low border-white/10 text-on-surface leading-relaxed flex-1"
                      />
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[11px] font-mono text-on-surface-variant">
                        Символов: {generatedMarkdown.length}
                      </span>
                      <Button
                        type="primary"
                        loading={isSavingNote}
                        disabled={!generatedMarkdown.trim()}
                        onClick={handleSaveAiNote}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold font-sans flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[16px]">save</span>
                        Сохранить заметку в базу календаря
                      </Button>
                    </div>
                  </div>
                </div>
              ),
            },

            // TAB 2: TMDB Marvel & Movie Explorer
            {
              key: 'tmdb',
              label: (
                <span className="flex items-center gap-2 font-semibold text-sm">
                  <span className="material-symbols-outlined text-[18px] text-red-400">movie</span>
                  TMDB Радар & Marvel
                </span>
              ),
              children: (
                <div className="space-y-4">
                  {/* Search bar */}
                  <div className="flex gap-2">
                    <Input
                      value={movieQuery}
                      onChange={(e) => setMovieQuery(e.target.value)}
                      onPressEnter={() => loadMovies(movieQuery)}
                      placeholder="Поиск фильмов в TMDB (например: Avengers, Spider-Man, Fantastic Four)..."
                      className="bg-surface-container-high border-white/10 text-on-surface text-sm"
                      prefix={
                        <span className="material-symbols-outlined text-[18px] text-on-surface-variant mr-1">
                          search
                        </span>
                      }
                    />
                    <Button
                      type="primary"
                      loading={isSearchingMovies}
                      onClick={() => loadMovies(movieQuery)}
                      className="bg-primary hover:bg-primary-hover text-on-primary font-semibold"
                    >
                      Найти в TMDB
                    </Button>
                    <Button
                      onClick={() => {
                        setMovieQuery('');
                        loadMovies('');
                      }}
                      className="border-white/10 text-on-surface-variant"
                    >
                      Сброс (MCU Фазы 5/6)
                    </Button>
                  </div>

                  {/* Movies Grid */}
                  {isSearchingMovies ? (
                    <div className="py-16 text-center">
                      <Spin size="large" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {moviesList.map((m, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg border border-white/10 bg-surface-container-low hover:border-primary/50 transition-all p-4 flex flex-col justify-between space-y-3 group"
                        >
                          <div className="flex gap-3">
                            <img
                              src={m.posterUrl}
                              alt={m.title}
                              className="w-20 h-28 object-cover rounded shadow border border-white/10 flex-shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-1">
                                <h3 className="font-bold text-sm text-on-surface truncate group-hover:text-primary transition-colors">
                                  {m.title}
                                </h3>
                              </div>
                              {m.originalTitle && (
                                <p className="text-[11px] text-on-surface-variant font-mono truncate">
                                  {m.originalTitle}
                                </p>
                              )}
                              <div className="mt-2 flex items-center gap-2 text-xs font-mono">
                                <Tag color="red" className="text-[10px] m-0">
                                  {dayjs(m.releaseDate).format('DD.MM.YYYY')}
                                </Tag>
                                {m.rating ? (
                                  <span className="text-amber-400 text-[11px] font-bold">
                                    ⭐ {m.rating}/10
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-2 text-xs text-on-surface-variant line-clamp-2 leading-tight">
                                {m.description.replace(/^###.*\n+/, '').slice(0, 100)}...
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-white/5">
                            <span className="text-[10px] font-mono text-outline">
                              {m.taxonomyPath}
                            </span>
                            <Button
                              size="small"
                              type="primary"
                              loading={importingMovieTitle === m.title}
                              onClick={() => handleImportMovie(m)}
                              className="bg-primary/20 hover:bg-primary text-primary hover:text-on-primary font-semibold text-xs border border-primary/40 flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[14px]">
                                library_add
                              </span>
                              Импортировать в радар
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ),
            },

            // TAB 3: Holidays & Computus Calculator
            {
              key: 'holidays',
              label: (
                <span className="flex items-center gap-2 font-semibold text-sm">
                  <span className="material-symbols-outlined text-[18px] text-sky-400">
                    calendar_month
                  </span>
                  Праздники & Пасхалия
                </span>
              ),
              children: (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-container-low p-3 rounded-lg border border-white/5">
                    <div className="flex items-center gap-3">
                      <Select
                        value={holidayCategory}
                        onChange={(cat) => {
                          setHolidayCategory(cat);
                          loadHolidays(holidayYear, cat);
                        }}
                        className="w-56"
                        options={[
                          { value: 'russian', label: '🇷🇺 Русские и военные праздники' },
                          { value: 'christian', label: '☦️ Христианские праздники (Пасхалия)' },
                        ]}
                      />
                      <Select
                        value={holidayYear}
                        onChange={(y) => {
                          setHolidayYear(y);
                          loadHolidays(y, holidayCategory);
                        }}
                        className="w-28"
                        options={[
                          { value: 2025, label: '2025 год' },
                          { value: 2026, label: '2026 год' },
                          { value: 2027, label: '2027 год' },
                          { value: 2028, label: '2028 год' },
                        ]}
                      />
                    </div>

                    <Button
                      type="primary"
                      onClick={() =>
                        handleSyncSingleFeed(
                          holidayCategory === 'christian'
                            ? 'christian-holidays'
                            : 'russian-holidays',
                        )
                      }
                      className="bg-primary hover:bg-primary-hover text-on-primary font-semibold flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">sync</span>
                      Синхронизировать весь раздел
                    </Button>
                  </div>

                  {isLoadingHolidays ? (
                    <div className="py-16 text-center">
                      <Spin size="large" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {holidaysList.map((h, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg border border-white/10 bg-surface-container-low p-4 flex flex-col justify-between space-y-3"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <Tag color="blue" className="font-mono text-[11px] m-0">
                                {dayjs(h.startDate).format('DD MMMM YYYY')}
                              </Tag>
                              <span className="text-[11px] font-mono text-outline">
                                {h.taxonomyPath.split('.').pop()}
                              </span>
                            </div>
                            <h4 className="font-bold text-sm text-on-surface mt-1">{h.title}</h4>
                            <p className="text-xs text-on-surface-variant line-clamp-2 mt-2 leading-relaxed">
                              {h.description.replace(/^###.*\n+/, '').slice(0, 120)}...
                            </p>
                          </div>

                          <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                            <div className="flex gap-1">
                              {h.hashtags.slice(0, 2).map((tag) => (
                                <span key={tag} className="text-[10px] font-mono text-primary/80">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                            <Button
                              size="small"
                              onClick={() => handleImportHoliday(h)}
                              className="text-xs bg-white/5 border-white/10 hover:border-primary text-primary"
                            >
                              Добавить в базу
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ),
            },

            // TAB 4: Politics 2026
            {
              key: 'politics',
              label: (
                <span className="flex items-center gap-2 font-semibold text-sm">
                  <span className="material-symbols-outlined text-[18px] text-rose-400">public</span>
                  Политика 2026
                </span>
              ),
              children: (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-surface-container-low p-3 rounded-lg border border-white/5">
                    <p className="text-xs text-on-surface-variant font-mono">
                      Ключевые международные саммиты, выборы в Госдуму РФ, Конгресс США и геополитические даты 2026 года.
                    </p>
                    <Button
                      type="primary"
                      onClick={() => handleSyncSingleFeed('politics-2026')}
                      className="bg-primary hover:bg-primary-hover text-on-primary font-semibold flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">sync</span>
                      Синхронизировать Политику 2026
                    </Button>
                  </div>

                  {isLoadingPolitics ? (
                    <div className="py-16 text-center">
                      <Spin size="large" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {politicsList.map((p, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg border border-white/10 bg-surface-container-low p-4 flex flex-col justify-between space-y-3"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <Tag color="magenta" className="font-mono text-[11px] m-0">
                                {dayjs(p.startDate).format('DD MMMM YYYY')}
                              </Tag>
                              <span className="text-[11px] font-mono text-outline">
                                {p.taxonomyPath}
                              </span>
                            </div>
                            <h4 className="font-bold text-sm text-on-surface mt-1">{p.title}</h4>
                            <p className="text-xs text-on-surface-variant line-clamp-3 mt-2 leading-relaxed">
                              {p.description.replace(/^###.*\n+/, '').slice(0, 140)}...
                            </p>
                          </div>

                          <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                            <div className="flex gap-1">
                              {p.hashtags.slice(0, 2).map((tag) => (
                                <span key={tag} className="text-[10px] font-mono text-rose-300">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                            <Button
                              size="small"
                              onClick={() => handleImportPolitics(p)}
                              className="text-xs bg-white/5 border-white/10 hover:border-primary text-primary"
                            >
                              Добавить в базу
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ),
            },

            // TAB 5: Fast Ingestion Console
            {
              key: 'console',
              label: (
                <span className="flex items-center gap-2 font-semibold text-sm">
                  <span className="material-symbols-outlined text-[18px] text-emerald-400">
                    terminal
                  </span>
                  Консоль синхронизации
                </span>
              ),
              children: (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      {
                        slug: 'mcu-radar',
                        title: 'Marvel Cinematic Universe',
                        icon: 'movie',
                        color: 'border-red-500/40 bg-red-500/5',
                        tagline: 'TMDB API & Фазы 5/6',
                      },
                      {
                        slug: 'russian-holidays',
                        title: 'Русские праздники',
                        icon: 'flag',
                        color: 'border-blue-500/40 bg-blue-500/5',
                        tagline: '32-ФЗ & ТК РФ 2026',
                      },
                      {
                        slug: 'christian-holidays',
                        title: 'Христианские праздники',
                        icon: 'sparkles',
                        color: 'border-amber-500/40 bg-amber-500/5',
                        tagline: 'Пасхалия Computus 2026',
                      },
                      {
                        slug: 'politics-2026',
                        title: 'Политика 2026',
                        icon: 'public',
                        color: 'border-rose-500/40 bg-rose-500/5',
                        tagline: 'Саммиты & Выборы 2026',
                      },
                    ].map((feed) => (
                      <div
                        key={feed.slug}
                        className={`rounded-xl border p-4 flex flex-col justify-between space-y-4 ${feed.color}`}
                      >
                        <div>
                          <div className="flex items-center gap-2 text-primary mb-2">
                            <span className="material-symbols-outlined text-[24px]">
                              {feed.icon}
                            </span>
                            <h3 className="font-bold text-sm text-on-surface">{feed.title}</h3>
                          </div>
                          <p className="text-xs font-mono text-on-surface-variant">
                            {feed.tagline}
                          </p>
                        </div>

                        <Button
                          type="primary"
                          onClick={() => handleSyncSingleFeed(feed.slug)}
                          className="w-full bg-primary/20 hover:bg-primary text-primary hover:text-on-primary font-semibold text-xs border border-primary/40 flex items-center justify-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">sync</span>
                          Синхронизировать
                        </Button>
                      </div>
                    ))}
                  </div>

                  {syncResults.length > 0 && (
                    <div className="rounded-xl border border-white/10 bg-surface-container-low p-4 space-y-3">
                      <h4 className="font-mono text-xs font-bold text-primary flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        Результаты последней синхронизации
                      </h4>
                      <div className="divide-y divide-white/5">
                        {syncResults.map((r) => (
                          <div
                            key={r.feedSlug}
                            className="py-2.5 flex items-center justify-between text-xs font-mono"
                          >
                            <span className="text-on-surface font-semibold">{r.feedTitle}</span>
                            <div className="flex gap-3 text-on-surface-variant">
                              <span>Всего: <strong className="text-primary">{r.notesCount}</strong></span>
                              <span>Создано: <strong className="text-emerald-400">{r.created}</strong></span>
                              <span>Обновлено: <strong className="text-sky-400">{r.updated}</strong></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
};
export default GeneratorLabPage;
