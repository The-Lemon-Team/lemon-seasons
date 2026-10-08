import React, { useState } from 'react';
import { Modal, Input, Button, message } from 'antd';
import { Sparkles } from 'lucide-react';

interface CreateTestSparkModalProps {
  open: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; summary: string; content: string; tags: string[] }) => Promise<void>;
}

export const CreateTestSparkModal: React.FC<CreateTestSparkModalProps> = ({
  open,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('Gemini Spark: Инсайт о микросервисах и AI-конвейере');
  const [summary, setSummary] = useState(
    'Архитектурный срез о переносе интерактивных чатов в локальный сервис Defi и оптимизации ядра заметок.',
  );
  const [tagsInput, setTagsInput] = useState('architecture, defi, gemini-spark, ai-pipeline');
  const [content, setContent] = useState(
    `## Введение\nПеренос чатов позволил Lemon Calendarium полностью сосредоточиться на Notes-First концепции.\n\n### Ключевые преимущества:\n1. Мгновенная реакция файлового слушателя (Chokidar).\n2. Простая дедупликация по SHA-256 хэшу.\n3. Чистая база данных без legacy таблиц.`,
  );

  const handleSubmit = async () => {
    if (!title.trim()) {
      message.error('Укажите заголовок файла');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    await onSubmit({
      title: title.trim(),
      summary: summary.trim(),
      content: content.trim(),
      tags,
    });
  };

  const handleFillTemplate = (variant: 'quantum' | 'macro' | 'crypto') => {
    if (variant === 'quantum') {
      setTitle('Gemini Spark: Прорыв в квантовой коррекции ошибок Willow 2026');
      setSummary('Google DeepMind продемонстрировала физический процессор Willow с экспоненциальным подавлением шума.');
      setTagsInput('quantum, google, deepmind, hardware, physics');
      setContent('### Детали исследования\nВ лаборатории Санта-Барбары зафиксировано рекордное подавление ошибок ниже квантового порога устойчивости.');
    } else if (variant === 'macro') {
      setTitle('Gemini Spark: Макроэкономический дайджест ЕЦБ и ФРС');
      setSummary('Решение центральных банков по процентным ставкам и инфляционные ожидания на IV квартал.');
      setTagsInput('macro, economy, fed, ecb, markets');
      setContent('### Решения регуляторов\nФРС сохраняет выжидательную позицию при стабильном рынке труда.');
    } else {
      setTitle('Gemini Spark: Анализ ликвидности децентрализованных пулов Defi');
      setSummary('Обзор TVL протоколов второго уровня и объемов торгов на кросс-чейн мостах.');
      setTagsInput('defi, crypto, ethereum, l2, tvl');
      setContent('### Динамика TVL\nРост сетевой активности на 18% за прошедшие сутки благодаря новым пулам концентрации капитала.');
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <div className="flex items-center gap-2 text-on-surface">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span className="font-sans font-bold">Создать тестовый Gemini Spark файл</span>
        </div>
      }
      footer={[
        <Button key="cancel" onClick={onClose} disabled={isSubmitting}>
          Отмена
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={isSubmitting}
          onClick={handleSubmit}
          className="bg-primary hover:bg-primary-hover text-on-primary font-semibold"
        >
          Записать .md и запустить обработку
        </Button>,
      ]}
      className="max-w-2xl"
    >
      <div className="space-y-4 py-2">
        {/* Templates shortcuts */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-on-surface-variant">Быстрые шаблоны:</span>
          <button
            type="button"
            onClick={() => handleFillTemplate('quantum')}
            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-cyan-400 transition-colors cursor-pointer"
          >
            ⚛️ Кванты
          </button>
          <button
            type="button"
            onClick={() => handleFillTemplate('macro')}
            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-emerald-400 transition-colors cursor-pointer"
          >
            📊 Макро
          </button>
          <button
            type="button"
            onClick={() => handleFillTemplate('crypto')}
            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-purple-400 transition-colors cursor-pointer"
          >
            💎 Defi
          </button>
        </div>

        <div>
          <label className="block text-xs font-mono text-on-surface-variant mb-1">
            Заголовок заметки (H1 / Title)
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Введите название темы..."
            className="font-sans"
          />
        </div>

        <div>
          <label className="block text-xs font-mono text-on-surface-variant mb-1">
            Краткая выжимка (TL;DR / Summary)
          </label>
          <Input.TextArea
            rows={2}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Суть события в 1-2 предложениях..."
          />
        </div>

        <div>
          <label className="block text-xs font-mono text-on-surface-variant mb-1">
            Теги (через запятую)
          </label>
          <Input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="tech, ai, news"
          />
        </div>

        <div>
          <label className="block text-xs font-mono text-on-surface-variant mb-1">
            Основной Markdown контент
          </label>
          <Input.TextArea
            rows={5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Текст новости или заметки..."
            className="font-mono text-xs"
          />
        </div>
      </div>
    </Modal>
  );
};
