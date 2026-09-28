import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Button,
  Tag,
  DatePicker,
  Radio,
  Drawer,
  Modal,
  Input,
  Select,
  Checkbox,
  message,
  Tooltip,
  Badge,
  Spin,
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import {
  useDailyNews,
  useTransformNews,
  useDismissNews,
  useGeneratePodcast,
  usePublishPodcast,
  useFeeds,
} from '../../api/queries';
import { NoteType, CURATOR_PERSONAS, getCuratorPersona } from '@lenta/shared';
import { DailyNewsCard, PodcastScript, PodcastDialogueTurn } from '@lemon/agents';

export const NewsCurationPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'ACCEPTED' | 'DISMISSED'>('ALL');

  // Queries
  const { data: newsData, isLoading, refetch } = useDailyNews(selectedDate);
  const { data: feedsData } = useFeeds();
  const transformMutation = useTransformNews();
  const dismissMutation = useDismissNews();
  const generatePodcastMutation = useGeneratePodcast();
  const publishPodcastMutation = usePublishPodcast();

  // Transformation Drawer State
  const [transformDrawerOpen, setTransformDrawerOpen] = useState(false);
  const [activeNewsCard, setActiveNewsCard] = useState<DailyNewsCard | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editType, setEditType] = useState<NoteType>(NoteType.SINGLE);
  const [editCurator, setEditCurator] = useState<string>('ivan-bely');
  const [editFolder, setEditFolder] = useState('News/Daily');
  const [editFeedId, setEditFeedId] = useState<string>('');
  const [editHashtags, setEditHashtags] = useState<string[]>([]);
  const [editDescription, setEditDescription] = useState('');

  // Podcast Studio State
  const [podcastModalOpen, setPodcastModalOpen] = useState(false);
  const [selectedNewsForPodcast, setSelectedNewsForPodcast] = useState<string[]>([]);
  const [host1Name, setHost1Name] = useState('Алексей');
  const [host2Name, setHost2Name] = useState('Елена');
  const [currentPodcast, setCurrentPodcast] = useState<PodcastScript | null>(null);

  // Audio Playback State (Web Speech Synthesis for 2 hosts)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentTurnIndex, setCurrentTurnIndex] = useState<number>(-1);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const rawCards: DailyNewsCard[] = (newsData?.news as any) || [];

  const filteredCards = rawCards.filter((c) => {
    if (statusFilter === 'ALL') return true;
    return c.status === statusFilter;
  });

  const totalCount = rawCards.length;
  const pendingCount = rawCards.filter((c) => c.status === 'PENDING').length;
  const acceptedCount = rawCards.filter((c) => c.status === 'ACCEPTED').length;
  const avgResonance =
    totalCount > 0
      ? Math.round(rawCards.reduce((acc, c) => acc + c.resonanceScore, 0) / totalCount)
      : 0;

  // Open Transform Drawer
  const handleOpenTransform = (card: DailyNewsCard) => {
    setActiveNewsCard(card);
    setEditTitle(card.title);
    setEditType(card.suggestedType || NoteType.SINGLE);
    setEditCurator(card.suggestedCurator || 'ivan-bely');
    setEditFolder('News/Daily');
    setEditFeedId(feedsData?.[0]?.id || '');
    setEditHashtags(card.suggestedTags || []);
    setEditDescription(`## ${card.title}

> **Источник:** [${card.source}](${card.url || '#'})  
> **Оценка контура:** ${card.suggestedCurator === 'ivan-bely' ? '🇷🇺 Внутренний контур (Иван Белый)' : '🌐 Международный контур (Kirk Kitten)'}  
> **Индекс резонанса:** \`${card.resonanceScore}%\`

### Ключевые тезисы:
${card.keyPoints.map((p) => `- ${p}`).join('\n')}

---
*Верифицировано в Lemon Curation Studio.*
`);
    setTransformDrawerOpen(true);
  };

  const handleSubmitTransform = async () => {
    if (!activeNewsCard) return;
    try {
      await transformMutation.mutateAsync({
        id: activeNewsCard.id,
        payload: {
          title: editTitle,
          type: editType,
          curator: editCurator,
          folder: editFolder,
          feedId: editFeedId || undefined,
          hashtags: editHashtags,
          description: editDescription,
        },
      });
      message.success('Новость успешно преобразована и опубликована в календаре!');
      setTransformDrawerOpen(false);
      refetch();
    } catch (err: any) {
      message.error(err?.message || 'Ошибка публикации карточки');
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await dismissMutation.mutateAsync(id);
      message.info('Новость отклонена');
      refetch();
    } catch (err: any) {
      message.error(err?.message || 'Ошибка отклонения');
    }
  };

  // Open Podcast Studio
  const handleOpenPodcastStudio = () => {
    // Default select all non-dismissed news
    const ids = rawCards.filter((c) => c.status !== 'DISMISSED').map((c) => c.id);
    setSelectedNewsForPodcast(ids);
    setPodcastModalOpen(true);
  };

  const handleGeneratePodcast = async () => {
    try {
      const result = await generatePodcastMutation.mutateAsync({
        date: selectedDate,
        newsIds: selectedNewsForPodcast,
        host1Name,
        host2Name,
      });
      setCurrentPodcast(result);
      message.success('Сценарий подкаста успешно сгенерирован!');
    } catch (err: any) {
      message.error(err?.message || 'Ошибка генерации подкаста');
    }
  };

  const handlePublishPodcast = async () => {
    if (!currentPodcast) return;
    try {
      await publishPodcastMutation.mutateAsync({
        date: selectedDate,
        podcast: currentPodcast,
        feedId: feedsData?.[0]?.id,
      });
      message.success('Подкаст дня успешно опубликован в календаре!');
      setPodcastModalOpen(false);
    } catch (err: any) {
      message.error(err?.message || 'Ошибка публикации подкаста');
    }
  };

  // Audio Playback using Web Speech API (2 voices)
  const stopAudio = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingAudio(false);
    setCurrentTurnIndex(-1);
  };

  const playTurn = (turns: PodcastDialogueTurn[], index: number) => {
    if (index >= turns.length) {
      setIsPlayingAudio(false);
      setCurrentTurnIndex(-1);
      return;
    }

    setCurrentTurnIndex(index);
    const turn = turns[index];
    const utterance = new SpeechSynthesisUtterance(turn.text);
    utterance.lang = 'ru-RU';
    utterance.rate = playbackSpeed;

    // Distinct voice / pitch settings for Host 1 vs Host 2
    if (turn.role === 'host1') {
      utterance.pitch = 0.9; // Deeper male/analytical pitch
    } else {
      utterance.pitch = 1.25; // Higher female/inquisitive pitch
    }

    // Try to pick distinct available voices if present
    const voices = window.speechSynthesis.getVoices();
    const ruVoices = voices.filter((v) => v.lang.startsWith('ru'));
    if (ruVoices.length > 1) {
      utterance.voice = turn.role === 'host1' ? ruVoices[0] : ruVoices[1];
    } else if (ruVoices.length === 1) {
      utterance.voice = ruVoices[0];
    }

    utterance.onend = () => {
      playTurn(turns, index + 1);
    };

    utterance.onerror = () => {
      setIsPlayingAudio(false);
      setCurrentTurnIndex(-1);
    };

    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const handleTogglePlayAudio = () => {
    if (!currentPodcast || !currentPodcast.turns || currentPodcast.turns.length === 0) return;

    if (isPlayingAudio) {
      stopAudio();
    } else {
      setIsPlayingAudio(true);
      const startIndex = currentTurnIndex >= 0 ? currentTurnIndex : 0;
      playTurn(currentPodcast.turns, startIndex);
    }
  };

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-3xl text-primary">newspaper</span>
            <h1 className="text-2xl font-bold text-on-surface tracking-tight">
              Ежедневные новости & AI-Куратор
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-mono font-semibold rounded bg-primary/20 text-primary border border-primary/30">
              Admin Studio
            </span>
          </div>
          <p className="text-sm text-on-surface-variant mt-1">
            Отбор актуальных сюжетов, разметка кураторами РФ/Мир и трансформация в карточки хроники.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Date Selector */}
          <div className="flex items-center bg-surface-container rounded-lg p-1 border border-white/10">
            <Button
              type="text"
              size="small"
              onClick={() => setSelectedDate(dayjs(selectedDate).subtract(1, 'day').format('YYYY-MM-DD'))}
              className="text-on-surface-variant hover:text-on-surface"
            >
              Вчера
            </Button>
            <DatePicker
              value={dayjs(selectedDate)}
              onChange={(d: Dayjs | null) => d && setSelectedDate(d.format('YYYY-MM-DD'))}
              allowClear={false}
              className="bg-transparent border-0 text-sm font-mono"
            />
            <Button
              type="text"
              size="small"
              onClick={() => setSelectedDate(dayjs().format('YYYY-MM-DD'))}
              className={selectedDate === dayjs().format('YYYY-MM-DD') ? 'text-primary font-bold' : 'text-on-surface-variant'}
            >
              Сегодня
            </Button>
            <Button
              type="text"
              size="small"
              onClick={() => setSelectedDate(dayjs(selectedDate).add(1, 'day').format('YYYY-MM-DD'))}
              className="text-on-surface-variant hover:text-on-surface"
            >
              Завтра
            </Button>
          </div>

          {/* Podcast Studio Launcher Button */}
          <Button
            type="primary"
            onClick={handleOpenPodcastStudio}
            className="bg-primary text-surface font-semibold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
          >
            <span className="material-symbols-outlined text-lg">podcasts</span>
            Подкаст дня (NotebookLM)
          </Button>
        </div>
      </div>

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-container border border-white/5 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-on-surface-variant font-mono uppercase">Всего сюжетов</div>
            <div className="text-2xl font-bold text-on-surface mt-1">{totalCount}</div>
          </div>
          <span className="material-symbols-outlined text-3xl text-on-surface-variant/40">feed</span>
        </div>

        <div className="bg-surface-container border border-white/5 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-on-surface-variant font-mono uppercase">К разбору</div>
            <div className="text-2xl font-bold text-secondary mt-1">{pendingCount}</div>
          </div>
          <span className="material-symbols-outlined text-3xl text-secondary/40">hourglass_top</span>
        </div>

        <div className="bg-surface-container border border-white/5 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-on-surface-variant font-mono uppercase">В календаре</div>
            <div className="text-2xl font-bold text-tertiary mt-1">{acceptedCount}</div>
          </div>
          <span className="material-symbols-outlined text-3xl text-tertiary/40">check_circle</span>
        </div>

        <div className="bg-surface-container border border-white/5 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-on-surface-variant font-mono uppercase">Ср. Резонанс</div>
            <div className="text-2xl font-bold text-primary mt-1">{avgResonance}%</div>
          </div>
          <span className="material-symbols-outlined text-3xl text-primary/40">bolt</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between">
        <Radio.Group
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          buttonStyle="solid"
          className="lemon-radio-group"
        >
          <Radio.Button value="ALL">Все сюжета ({totalCount})</Radio.Button>
          <Radio.Button value="PENDING">К разбору ({pendingCount})</Radio.Button>
          <Radio.Button value="ACCEPTED">Опубликованные ({acceptedCount})</Radio.Button>
          <Radio.Button value="DISMISSED">Отклоненные</Radio.Button>
        </Radio.Group>
      </div>

      {/* News Cards List */}
      {isLoading ? (
        <div className="py-20 flex justify-center items-center">
          <Spin size="large" tip="Загрузка новостей дня..." />
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="text-center py-16 bg-surface-container rounded-2xl border border-white/5">
          <span className="material-symbols-outlined text-5xl text-outline/50">inbox</span>
          <h3 className="text-lg font-medium text-on-surface mt-3">Нет новостей по заданным фильтрам</h3>
          <p className="text-sm text-on-surface-variant mt-1">
            Выберите другую дату или смените статус фильтра.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredCards.map((card) => {
            const persona = getCuratorPersona(card.suggestedCurator);
            const isAccepted = card.status === 'ACCEPTED';
            const isDismissed = card.status === 'DISMISSED';

            return (
              <div
                key={card.id}
                className={`bg-surface-container rounded-xl p-5 border transition-all duration-200 flex flex-col justify-between ${
                  isAccepted
                    ? 'border-tertiary/40 bg-tertiary/5'
                    : isDismissed
                    ? 'border-white/5 opacity-50'
                    : 'border-white/10 hover:border-primary/50 shadow-md'
                }`}
              >
                <div>
                  {/* Meta Bar */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-mono text-on-surface-variant flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-outline">source</span>
                      {card.source}
                    </span>

                    <div className="flex items-center gap-2">
                      {/* Resonance Gauge */}
                      <span
                        className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          card.resonanceScore >= 70
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-white/5 text-on-surface-variant'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">bolt</span>
                        {card.resonanceScore}%
                      </span>

                      {/* Status Tag */}
                      {isAccepted ? (
                        <Tag color="success" className="m-0">
                          В календаре
                        </Tag>
                      ) : isDismissed ? (
                        <Tag color="default" className="m-0">
                          Отклонено
                        </Tag>
                      ) : (
                        <Tag color="processing" className="m-0">
                          Ожидает
                        </Tag>
                      )}
                    </div>
                  </div>

                  {/* Title & Source Link */}
                  <h3 className="text-base font-semibold text-on-surface leading-snug hover:text-primary transition-colors">
                    {card.title}
                  </h3>

                  {/* Curator Lens Badge */}
                  <div className="mt-3 flex items-center gap-2">
                    {persona ? (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border"
                        style={{
                          backgroundColor: persona.badgeBg,
                          borderColor: persona.borderAccent,
                          color: persona.accentColor,
                        }}
                      >
                        <span>{persona.emoji}</span>
                        <span>{persona.name}</span>
                        <span className="text-[10px] text-white/50">({persona.shortName})</span>
                      </span>
                    ) : (
                      <Tag color="purple">Общий куратор</Tag>
                    )}

                    <span className="text-xs text-outline font-mono">
                      Тип: {card.suggestedType}
                    </span>
                  </div>

                  {/* Key Takeaways */}
                  <div className="mt-4 p-3 rounded-lg bg-surface-container-low border border-white/5 text-xs text-on-surface-variant space-y-1.5">
                    {card.keyPoints.map((point, idx) => (
                      <div key={idx} className="flex items-start gap-1.5">
                        <span className="text-primary font-bold leading-none mt-0.5">•</span>
                        <span>{point}</span>
                      </div>
                    ))}
                  </div>

                  {/* Tags */}
                  {card.suggestedTags && card.suggestedTags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {card.suggestedTags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/5 text-on-surface-variant"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {card.url && (
                      <a
                        href={card.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-outline hover:text-primary flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                        Источник
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {!isDismissed && (
                      <Button
                        size="small"
                        danger
                        type="text"
                        onClick={() => handleDismiss(card.id)}
                        className="text-xs text-error/80 hover:text-error"
                      >
                        Отклонить
                      </Button>
                    )}

                    {!isAccepted ? (
                      <Button
                        size="small"
                        type="primary"
                        onClick={() => handleOpenTransform(card)}
                        className="bg-primary text-surface font-medium flex items-center gap-1 text-xs"
                      >
                        <span className="material-symbols-outlined text-[16px]">add_task</span>
                        Превратить в карточку
                      </Button>
                    ) : (
                      <Button size="small" disabled className="text-xs">
                        Опубликовано
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Transformation Drawer */}
      <Drawer
        title="⚡ Преобразование новости в карточку календаря"
        width={600}
        open={transformDrawerOpen}
        onClose={() => setTransformDrawerOpen(false)}
        className="lemon-drawer"
        extra={
          <Button
            type="primary"
            onClick={handleSubmitTransform}
            loading={transformMutation.isPending}
            className="bg-primary text-surface font-semibold"
          >
            Опубликовать в календарь
          </Button>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-on-surface-variant uppercase mb-1">
              Заголовок заметки
            </label>
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="bg-surface-container border-white/10 text-on-surface"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-on-surface-variant uppercase mb-1">
                Тип события
              </label>
              <Select
                value={editType}
                onChange={(val) => setEditType(val)}
                className="w-full"
                options={[
                  { value: NoteType.SINGLE, label: 'SINGLE (Точечная заметка)' },
                  { value: NoteType.EVENT, label: 'EVENT (Событие)' },
                  { value: NoteType.PERIOD, label: 'PERIOD (Период)' },
                  { value: NoteType.DONE, label: 'DONE (Синтез / Веха)' },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-on-surface-variant uppercase mb-1">
                Куратор / Персона
              </label>
              <Select
                value={editCurator}
                onChange={(val) => setEditCurator(val)}
                className="w-full"
                options={[
                  { value: 'ivan-bely', label: '🇷🇺 Иван Белый (Внутренний контур РФ)' },
                  { value: 'kirk-kitten', label: '🌐 Kirk Kitten (Мировой контур / Рынки)' },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-on-surface-variant uppercase mb-1">
                Папка
              </label>
              <Input
                value={editFolder}
                onChange={(e) => setEditFolder(e.target.value)}
                className="bg-surface-container border-white/10"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-on-surface-variant uppercase mb-1">
                Фид календаря
              </label>
              <Select
                value={editFeedId}
                onChange={(val) => setEditFeedId(val)}
                className="w-full"
                options={feedsData?.map((f: any) => ({ value: f.id, label: f.title }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-on-surface-variant uppercase mb-1">
              Хэштеги (через запятую)
            </label>
            <Select
              mode="tags"
              value={editHashtags}
              onChange={(val) => setEditHashtags(val)}
              className="w-full"
              placeholder="Добавьте теги..."
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-on-surface-variant uppercase mb-1">
              Содержание Markdown
            </label>
            <Input.TextArea
              rows={10}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="bg-surface-container border-white/10 font-mono text-xs"
            />
          </div>
        </div>
      </Drawer>

      {/* Podcast Studio Modal (NotebookLM Style) */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">podcasts</span>
            <span className="font-bold text-lg">AI Podcast Studio (NotebookLM Style)</span>
          </div>
        }
        open={podcastModalOpen}
        onCancel={() => {
          stopAudio();
          setPodcastModalOpen(false);
        }}
        width={800}
        footer={null}
        className="lemon-modal"
      >
        <div className="space-y-6 pt-2">
          <p className="text-xs text-on-surface-variant">
            Генерация динамического диалога двух ведущих на основе отобранных новостей за <b>{selectedDate}</b>.
            Используется Gemini AI для диалогового синтеза и речевой движок для аудиовоспроизведения.
          </p>

          {/* Step 1: News Selection */}
          <div className="bg-surface-container-low rounded-xl p-4 border border-white/5">
            <label className="block text-xs font-mono text-on-surface-variant uppercase mb-2">
              1. Выберите сюжеты для включения в выпуск:
            </label>
            <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
              {rawCards.map((c) => (
                <div key={c.id} className="flex items-start gap-2 text-xs">
                  <Checkbox
                    checked={selectedNewsForPodcast.includes(c.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedNewsForPodcast([...selectedNewsForPodcast, c.id]);
                      } else {
                        setSelectedNewsForPodcast(selectedNewsForPodcast.filter((id) => id !== c.id));
                      }
                    }}
                  />
                  <span className="text-on-surface">{c.title}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Step 2: Host Personas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-on-surface-variant uppercase mb-1">
                Ведущий 1 (Аналитик)
              </label>
              <Input
                value={host1Name}
                onChange={(e) => setHost1Name(e.target.value)}
                placeholder="Имя ведущего 1"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-on-surface-variant uppercase mb-1">
                Ведущий 2 (Интервьюер)
              </label>
              <Input
                value={host2Name}
                onChange={(e) => setHost2Name(e.target.value)}
                placeholder="Имя ведущего 2"
              />
            </div>
          </div>

          {/* Generate Button */}
          <Button
            type="primary"
            block
            size="large"
            onClick={handleGeneratePodcast}
            loading={generatePodcastMutation.isPending}
            disabled={selectedNewsForPodcast.length === 0}
            className="bg-primary text-surface font-semibold flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">auto_awesome</span>
            Сгенерировать диалог двух ведущих
          </Button>

          {/* Generated Podcast Player & Transcript */}
          {currentPodcast && (
            <div className="bg-surface-container rounded-xl p-5 border border-primary/30 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div>
                  <h4 className="text-base font-bold text-on-surface">{currentPodcast.title}</h4>
                  <p className="text-xs text-on-surface-variant mt-0.5">{currentPodcast.tagline}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="primary"
                    shape="circle"
                    size="large"
                    onClick={handleTogglePlayAudio}
                    className={`flex items-center justify-center ${isPlayingAudio ? 'bg-secondary' : 'bg-primary'}`}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {isPlayingAudio ? 'pause' : 'play_arrow'}
                    </span>
                  </Button>

                  <Select
                    size="small"
                    value={playbackSpeed}
                    onChange={(s) => setPlaybackSpeed(s)}
                    options={[
                      { value: 1.0, label: '1.0x' },
                      { value: 1.25, label: '1.25x' },
                      { value: 1.5, label: '1.5x' },
                    ]}
                  />
                </div>
              </div>

              {/* Dialogue Transcript Bubble Stream */}
              <div className="max-h-72 overflow-y-auto space-y-3 p-3 bg-surface-container-low rounded-lg">
                {currentPodcast.turns.map((turn, idx) => {
                  const isHost1 = turn.role === 'host1';
                  const isActive = currentTurnIndex === idx;

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl text-xs transition-all duration-200 ${
                        isHost1
                          ? 'mr-10 bg-sky-950/40 border border-sky-800/40 text-sky-100'
                          : 'ml-10 bg-amber-950/40 border border-amber-800/40 text-amber-100'
                      } ${isActive ? 'ring-2 ring-primary scale-[1.01] shadow-lg' : ''}`}
                    >
                      <div className="flex items-center justify-between font-bold mb-1 opacity-80">
                        <span>{turn.speaker}</span>
                        <span className="text-[10px] font-mono">
                          {isHost1 ? 'Аналитик' : 'Интервьюер'}
                        </span>
                      </div>
                      <p className="leading-relaxed">{turn.text}</p>
                    </div>
                  );
                })}
              </div>

              {/* Publish to Calendar Button */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="primary"
                  onClick={handlePublishPodcast}
                  loading={publishPodcastMutation.isPending}
                  className="bg-primary text-surface font-semibold flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">publish</span>
                  Опубликовать подкаст в календарь
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
