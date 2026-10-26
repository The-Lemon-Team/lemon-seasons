import React, { useState, useEffect, useMemo } from 'react';
import { Modal, message, Spin } from 'antd';
import { extractCleanSnippet } from '@lenta/shared';
import { useNote, useFeeds, useUpdateNote } from '../api/queries';
import { AppSelect } from './common/AppSelect';
import {
  Send,
  Globe,
  Lock,
  Radio,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Clock,
  X,
  ArrowRight,
} from 'lucide-react';

export interface PublishToStagingModalProps {
  noteId: string | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const PublishToStagingModal: React.FC<PublishToStagingModalProps> = ({
  noteId,
  open,
  onClose,
  onSuccess,
}) => {
  const { data: note, isLoading } = useNote(noteId || '');
  const { data: feeds = [] } = useFeeds();
  const updateNoteMutation = useUpdateNote();

  const [publicFeedId, setPublicFeedId] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Public feeds prioritized first
  const sortedFeeds = useMemo(() => {
    return [...feeds].sort((a, b) => {
      const aPub = a.privacy !== 'private' ? 0 : 1;
      const bPub = b.privacy !== 'private' ? 0 : 1;
      if (aPub !== bPub) return aPub - bPub;
      return a.title.localeCompare(b.title);
    });
  }, [feeds]);

  useEffect(() => {
    if (note && open) {
      setPublicFeedId(note.publicFeedId || note.feedId || sortedFeeds[0]?.id || '');
      const initialSummary =
        note.summary ||
        extractCleanSnippet(note.description || '', 300, { title: note.title }) ||
        '';
      setSummary(initialSummary);
    }
  }, [note, open, sortedFeeds]);

  if (!open) return null;

  const isPrivate = !note?.privacy || note.privacy === 'private';
  const isStaging = note?.privacy === 'public' && note?.status !== 'PUBLISHED';
  const isPublished = note?.privacy === 'public' && note?.status === 'PUBLISHED';

  const handleAutoSummary = () => {
    if (!note) return;
    const generated = extractCleanSnippet(note.description || '', 300, {
      title: note.title,
    });
    setSummary(generated);
  };

  const handleTransition = async (targetPrivacy: 'private' | 'public', targetStatus: 'DRAFT' | 'PUBLISHED') => {
    if (!note || isSubmitting) return;
    if (targetPrivacy === 'public' && !publicFeedId) {
      message.warning('Выберите целевую ленту стейджинга / паблика');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateNoteMutation.mutateAsync({
        id: note.id,
        data: {
          privacy: targetPrivacy,
          status: targetStatus,
          publicFeedId: targetPrivacy === 'public' ? publicFeedId : null,
          summary: summary.trim() || undefined,
          ...(targetStatus === 'PUBLISHED' ? { publishAt: new Date().toISOString() } : {}),
        },
      });

      if (targetPrivacy === 'private') {
        message.success('Заметка возвращена в приватный контур (privacy = private)');
      } else if (targetStatus === 'DRAFT') {
        message.success('Заметка отправлена в Хаб публикаций (Стейджинг) на премодерацию');
      } else {
        message.success('Заметка одобрена и опубликована в публичной ленте!');
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || 'Ошибка при обновлении статуса публикации');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={620}
      zIndex={1150}
      centered
      destroyOnClose
      closable={false}
      styles={{
        content: {
          padding: 0,
          backgroundColor: 'var(--panel-bg)',
          border: '1px solid var(--tile-border)',
          boxShadow: 'var(--tile-shadow)',
          overflow: 'hidden',
          borderRadius: 12,
        },
      }}
    >
      {isLoading || !note ? (
        <div className="py-16 flex flex-col items-center justify-center gap-2.5">
          <Spin size="large" />
          <span className="font-mono text-xs text-text-muted">Загрузка карточки публикации...</span>
        </div>
      ) : (
        <div className="flex flex-col">
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-tile-border bg-tile-subtle flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0">
                <Send className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="font-sans font-bold text-sm sm:text-base text-on-surface truncate">
                  Публикация в Стейджинг-хаб и Паблик
                </h3>
                <p className="text-[11px] font-mono text-on-surface-variant truncate">
                  Премодерация для Telegram-формата и Lemon Seasons
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-tile-muted transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {/* Current Status Pipeline Banner */}
            <div className="p-3 rounded-xl bg-control border border-tile-border flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-text-muted">Текущий режим:</span>
                {isPrivate && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-300 border border-slate-500/30 font-semibold">
                    <Lock className="w-3 h-3" />
                    <span>Приватная (private)</span>
                  </span>
                )}
                {isStaging && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                    <Clock className="w-3 h-3" />
                    <span>В Стейджинге (премодерация)</span>
                  </span>
                )}
                {isPublished && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Опубликовано в паблике</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-[11px] font-mono">
                <a
                  href="http://localhost:5175?appMode=staging"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-amber-400 hover:underline"
                >
                  <span>Стейджинг :5175</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <span className="text-outline/40">•</span>
                <a
                  href="http://localhost:5176"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
                >
                  <span>Паблик :5176</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Note Title Preview */}
            <div className="p-3 rounded-lg bg-tile-subtle border border-tile-border">
              <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted mb-1">
                Публикуемая заметка
              </div>
              <div className="font-sans font-bold text-sm text-on-surface">{note.title}</div>
            </div>

            {/* Feed Mapping: Internal Admin Feed -> Target Staging/Public Feed */}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1.2fr] items-center gap-2.5 p-3.5 rounded-xl bg-surface-container border border-tile-border">
              <div className="min-w-0">
                <label className="block text-[10px] font-mono uppercase tracking-wider text-text-muted mb-1">
                  Исходная Админ-лента (сохраняется)
                </label>
                <div className="h-8 px-2.5 rounded-lg bg-control border border-tile-border flex items-center gap-1.5 text-xs font-mono text-on-surface-variant truncate">
                  <Lock className="w-3.5 h-3.5 text-text-muted shrink-0" />
                  <span className="truncate">{note.feed?.title || 'Внутренняя база'}</span>
                </div>
              </div>

              <div className="hidden sm:flex items-center justify-center pt-4 text-primary">
                <ArrowRight className="w-4 h-4" />
              </div>

              <div className="min-w-0">
                <label className="block text-[10px] font-mono uppercase tracking-wider text-primary font-semibold mb-1">
                  Целевая лента Стейджинга / Паблика *
                </label>
                <AppSelect
                  value={publicFeedId}
                  onChange={setPublicFeedId}
                  placeholder="Выберите публичную ленту..."
                  options={sortedFeeds.map((f) => ({
                    value: f.id,
                    label: `${f.title} (${f.slug})`,
                    icon: <Radio className="w-3.5 h-3.5 text-primary" />,
                  }))}
                />
              </div>
            </div>

            {/* Telegram-style Concise Summary / Post Body */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-mono text-on-surface-variant flex items-center gap-1.5">
                  <span>✈️ Ёмкий пост для ленты (в духе Telegram)</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAutoSummary}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/15 text-primary hover:bg-primary/25 text-[10px] font-mono transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Сжать из текста</span>
                  </button>
                  <span
                    className={`text-[10px] font-mono ${
                      summary.length > 360 ? 'text-amber-400' : 'text-text-muted'
                    }`}
                  >
                    {summary.length} симв. (рек. до 320)
                  </span>
                </div>
              </div>

              <textarea
                rows={4}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Краткая ёмкая суть поста для ленты (в стиле Telegram). Полный текст заметки останется доступен по клику «Развернуть детали»..."
                className="w-full rounded-lg bg-surface-container border border-outline-variant focus:border-primary p-3 text-xs sm:text-sm text-on-surface placeholder-outline outline-none resize-y leading-relaxed"
              />
              <p className="text-[11px] font-mono text-text-muted">
                В ленте отображается этот ёмкий пост, а полное описание ({note.description?.length || 0} симв.) и ссылки открываются по клику.
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-5 py-3 border-t border-tile-border bg-tile-subtle flex flex-wrap items-center justify-between gap-2">
            <div>
              {!isPrivate && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleTransition('private', 'DRAFT')}
                  className="h-8 px-3 rounded-lg bg-control hover:bg-tile-muted text-text-muted hover:text-text-main border border-tile-border text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Вернуть в приватные</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="h-8 px-3 rounded-lg bg-tile-subtle border border-tile-border text-text-muted hover:text-text-main text-xs font-mono transition-colors cursor-pointer"
              >
                Отмена
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleTransition('public', 'DRAFT')}
                className="h-8 px-3.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>В Стейджинг (Премодерация)</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleTransition('public', 'PUBLISHED')}
                className="h-8 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Сразу в Паблик</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
