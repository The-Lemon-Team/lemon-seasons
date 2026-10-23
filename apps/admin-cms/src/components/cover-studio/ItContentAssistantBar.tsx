import React from 'react';
import { Tooltip, message } from 'antd';
import { Terminal, FileText, Hash } from 'lucide-react';
import { NoteType } from '../../types';

export interface ItEditorBlueprint {
  id: string;
  label: string;
  icon: string;
  noteType: NoteType;
  tags: string[];
  markdownTemplate: (title: string) => string;
  description: string;
}

export const IT_EDITOR_BLUEPRINTS: ItEditorBlueprint[] = [
  {
    id: 'podcast',
    label: '🎙️ IT / AI Подкаст',
    icon: '🎙️',
    noteType: 'PERIOD',
    tags: ['podcast', 'ai', 'it-digest', 'audio'],
    description: 'Вставить структуру шоу-ноутов подкаста с таймкодами, ключевыми тезисами и авто-тегами',
    markdownTemplate: (title) => `## 🎙️ О выпуске: ${title || 'IT & AI Дайджест'}

> 🎧 **Формат:** Сводный аудиовыпуск / ИИ-подкаст
> **Главные темы:** Нейросети, инфраструктура, релизы и кибербезопасность

## ⏱️ Таймкоды выпуска
- \`00:00\` — Вступление и главная интрига недели
- \`02:15\` — Главный релиз / Архитектурный разбор
- \`06:40\` — Секция Security & Zero-Day
- \`10:30\` — Выводы и прогнозы для индустрии

## 🧠 Ключевые инсайты
- **Тренд 1:** ...
- **Тренд 2:** ...
- **Практический вывод:** ...

## 🔗 Материалы и репозитории из выпуска
- [Документация / Источник](#)`,
  },
  {
    id: 'changelog',
    label: '🚀 Changelog / Релиз',
    icon: '🚀',
    noteType: 'SINGLE',
    tags: ['changelog', 'release', 'devops', 'update'],
    description: 'Вставить структуру Changelog (New Features, Breaking Changes, Performance, Fixes)',
    markdownTemplate: (title) => `## 🚀 Сводка релиза: ${title || 'Новое обновление'}

> 📦 **Статус:** Stable Release | **Влияние на инфраструктуру:** Среднее / Высокое

## ✨ Ключевые нововведения (Features)
- **Новая функциональность:** ...
- **API / SDK обновления:** ...

## ⚡ Производительность и архитектура
- Оптимизация потребления памяти и скорости отклика: ...

## ⚠️ Breaking Changes & Миграция
- Обратите внимание при обновлении: ...

## 🐛 Исправленные ошибки (Bugfixes)
- Устранена проблема с ...`,
  },
  {
    id: 'security',
    label: '🛡️ Security / CVE Разбор',
    icon: '🛡️',
    noteType: 'SINGLE',
    tags: ['security', 'cybersecurity', 'cve', 'infosec'],
    description: 'Вставить карточку ИБ-инцидента / CVE-уязвимости (CVSS, вектор атаки, IoC, патчи)',
    markdownTemplate: (title) => `## 🛡️ Сводка ИБ-инцидента: ${title || 'Анализ уязвимости'}

> 🚨 **Критичность:** Высокая (CVSS 8.5+) | **Статус патча:** Доступно обновление

## 🎯 Затронутые компоненты и вектор атаки
- **Уязвимые версии:** ...
- **Механизм эксплуатации:** ...

## 🔍 Технический разбор и детекция (IoC)
- Признаки компрометации и логи: ...

## ✅ Рекомендации по защите и патчинг
1. Обновить пакет/ядро до версии ...
2. Ограничить сетевой доступ к ...`,
  },
  {
    id: 'ai-model',
    label: '🧠 AI Модель / Агенты',
    icon: '🧠',
    noteType: 'SINGLE',
    tags: ['ai', 'llm', 'agents', 'ml'],
    description: 'Вставить структуру обзора AI-модели, бенчмарков, контекстного окна и сценариев применения',
    markdownTemplate: (title) => `## 🧠 Обзор модели / технологии: ${title || 'Новый AI-релиз'}

> 🤖 **Категория:** LLM / Multimodal / Autonomous Agents

## 📊 Архитектура и ключевые параметры
- **Контекстное окно и скорость:** ...
- **Лицензия и доступность весов:** ...

## 🏆 Результаты бенчмарков (Coding & Reasoning)
- Сравнение с предыдущим поколением: ...

## 🛠️ Применение в разработке и агентных пайплайнах
- Как интегрировать в рабочий стек: ...`,
  },
];

interface ItContentAssistantBarProps {
  currentTitle: string;
  currentDescription: string;
  currentHashtags: string[];
  onApplyBlueprint: (payload: {
    markdown: string;
    hashtags: string[];
    icon: string;
    noteType?: NoteType;
  }) => void;
}

export const ItContentAssistantBar: React.FC<ItContentAssistantBarProps> = ({
  currentTitle,
  currentDescription,
  currentHashtags,
  onApplyBlueprint,
}) => {
  const handleSelectBlueprint = (bp: ItEditorBlueprint) => {
    const snippet = bp.markdownTemplate(currentTitle);
    const nextMarkdown = currentDescription.trim()
      ? `${currentDescription.trim()}\n\n${snippet}`
      : snippet;
    const mergedTags = Array.from(new Set([...currentHashtags, ...bp.tags]));

    onApplyBlueprint({
      markdown: nextMarkdown,
      hashtags: mergedTags,
      icon: bp.icon,
      noteType: bp.noteType,
    });

    message.success(`Применён IT-шаблон «${bp.label}» и добавлены профильные теги`);
  };

  return (
    <div className="bg-surface-container-low/90 border border-white/5 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-1.5 text-[11px] font-mono text-on-surface-variant">
        <Terminal className="w-3.5 h-3.5 text-primary" />
        <span>IT-Шаблоны заметки (Markdown + Теги):</span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {IT_EDITOR_BLUEPRINTS.map((bp) => (
          <Tooltip key={bp.id} title={bp.description}>
            <button
              type="button"
              onClick={() => handleSelectBlueprint(bp)}
              className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-primary/15 border border-white/5 hover:border-primary/40 text-on-surface-variant hover:text-primary text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3 h-3 opacity-70" />
              <span>{bp.label}</span>
              <Hash className="w-2.5 h-2.5 opacity-50" />
            </button>
          </Tooltip>
        ))}
      </div>
    </div>
  );
};
