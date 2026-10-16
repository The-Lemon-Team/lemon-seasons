import React, { useState, useEffect } from 'react';
import { ObsidianContainer, ContainerConfig } from '@lenta/shared';
import { containersApi } from '../api/containersApi';
import {
  Rss,
  Globe,
  Lock,
  Layers,
  Sparkles,
  ExternalLink,
  Check,
  RefreshCw,
  Calendar,
  Zap,
  Info,
} from 'lucide-react';

interface ContainerFeedBindingSectionProps {
  container: ObsidianContainer;
  allContainers: ObsidianContainer[];
  onConfigSaved?: (newConfig: ContainerConfig) => void;
}

const PRESET_EMOJIS = ['📖', '🇷🇺', '☦️', '🎙️', '🛡️', '🏛️', '✨', '⚡', '🍿', '📝', '🧠', '💡'];
const PRESET_COLORS = [
  { label: 'Cyan', color: '#0ea5e9' },
  { label: 'Purple', color: '#a855f7' },
  { label: 'Amber', color: '#f59e0b' },
  { label: 'Lemon', color: '#c9cd58' },
  { label: 'Rose', color: '#f43f5e' },
  { label: 'Emerald', color: '#10b981' },
];

export const ContainerFeedBindingSection: React.FC<ContainerFeedBindingSectionProps> = ({
  container,
  allContainers,
  onConfigSaved,
}) => {
  const initialConfig: ContainerConfig = container.config || {
    version: '1.0.0',
    feedProjection: {
      enabled: false,
      feedSlug: container.id.replace(/^(cont-|feed-)/, ''),
      feedTitle: container.name,
      targetTab: 'classic',
      accentColor: '#0ea5e9',
      emoji: '📖',
      combineWith: [],
    },
    source: {
      type: 'common',
      syncStrategy: 'merge',
    },
  };

  const [config, setConfig] = useState<ContainerConfig>(initialConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSyncingBus, setIsSyncingBus] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  // Sync state if container prop changes
  useEffect(() => {
    if (container.config) {
      setConfig(container.config);
    }
  }, [container.id, container.config]);

  const projection = config.feedProjection || {};
  const source = config.source || {};

  const handleToggleEnabled = () => {
    setConfig((prev) => ({
      ...prev,
      feedProjection: {
        ...prev.feedProjection,
        enabled: !prev.feedProjection?.enabled,
      },
    }));
  };

  const handleFieldChange = <K extends keyof NonNullable<ContainerConfig['feedProjection']>>(
    key: K,
    val: any
  ) => {
    setConfig((prev) => ({
      ...prev,
      feedProjection: {
        ...prev.feedProjection,
        [key]: val,
      },
    }));
  };

  const handleSourceFieldChange = (key: string, val: any) => {
    setConfig((prev) => ({
      ...prev,
      source: {
        ...prev.source,
        [key]: val,
      },
    }));
  };

  const handleToggleCombine = (targetContainerId: string) => {
    const current = projection.combineWith || [];
    const updated = current.includes(targetContainerId)
      ? current.filter((id) => id !== targetContainerId)
      : [...current, targetContainerId];
    handleFieldChange('combineWith', updated);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const res = await containersApi.updateContainerConfig(container.id, config);
      if (res?.success) {
        setSaveSuccess(true);
        if (onConfigSaved) onConfigSaved(config);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err: any) {
      alert(`Ошибка сохранения: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerBusSync = async () => {
    setIsSyncingBus(true);
    setSyncResult(null);
    try {
      const sourceType = source.type || (container.id.includes('wiki') ? 'wiki' : 'daily');
      const res = await containersApi.syncContainerViaBus(container.id, sourceType);
      if (res?.success) {
        setSyncResult(`Синхронизировано заметок: ${res.result?.syncedNotesCount ?? res.result?.notesCount ?? 0}`);
      } else {
        setSyncResult(`Ответ: ${res?.error || 'Выполнено'}`);
      }
    } catch (err: any) {
      setSyncResult(`Ошибка шины: ${err.message}`);
    } finally {
      setIsSyncingBus(false);
    }
  };

  const targetTab = projection.targetTab || 'classic';
  const feedSlug = projection.feedSlug || container.id;
  const feedUrl = `http://localhost:5175/${targetTab}?feed=${feedSlug}`;

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="p-5 rounded-2xl bg-[#181a1a] border border-[#242828] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#242828] pb-4">
          <div>
            <h3 className="font-sans font-bold text-base text-white flex items-center gap-2">
              <Rss className="w-4 h-4 text-[#0ea5e9]" />
              <span>Проекция контейнера в Lenta Feed</span>
            </h3>
            <p className="text-xs text-[#93927e] mt-1">
              Настройте правила трансляции заметок хранилища «{container.name}» в умную ленту.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-mono font-semibold flex items-center gap-1.5 border ${
                projection.enabled
                  ? 'bg-[#0ea5e9]/15 text-[#38bdf8] border-[#0ea5e9]/40'
                  : 'bg-[#1e2020] text-[#93927e] border-[#242828]'
              }`}
            >
              {projection.enabled ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              <span>{projection.enabled ? 'Трансляция включена' : 'Только в Obsidian'}</span>
            </span>

            {projection.enabled && (
              <a
                href={feedUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1 rounded-lg bg-[#0ea5e9]/20 hover:bg-[#0ea5e9]/30 text-[#38bdf8] text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <span>Открыть ленту</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Toggle Projection */}
        <label className="flex items-center gap-3 p-3.5 rounded-xl bg-[#121414] border border-[#242828] cursor-pointer hover:border-[#0ea5e9]/40 transition-colors">
          <input
            type="checkbox"
            checked={Boolean(projection.enabled)}
            onChange={handleToggleEnabled}
            className="w-4 h-4 rounded text-[#0ea5e9] focus:ring-0 bg-[#181a1a] border-[#333]"
          />
          <div className="text-xs">
            <span className="font-semibold text-white block">
              Транслировать заметки контейнера в новостную ленту
            </span>
            <span className="text-[#93927e]">
              Заметки будут агрегироваться в выбранном разделе ленты и доступны для чтения с мобильных и десктопа.
            </span>
          </div>
        </label>
      </div>

      {/* 2. Feed Visual & Category Parameters */}
      {projection.enabled && (
        <div className="p-5 rounded-2xl bg-[#181a1a] border border-[#242828] space-y-4">
          <h4 className="font-sans font-bold text-sm text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#c9cd58]" />
            <span>Параметры отображения в ленте</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            {/* Target Tab */}
            <div>
              <label className="text-[#c9c7b2] block mb-1.5 font-semibold">Целевой раздел ленты (Tab)</label>
              <select
                value={projection.targetTab || 'classic'}
                onChange={(e) => handleFieldChange('targetTab', e.target.value)}
                className="w-full bg-[#121414] border border-[#242828] rounded-lg px-3 py-2 text-white text-xs focus:border-[#0ea5e9] outline-none"
              >
                <option value="classic">🏛️ Classic (Календари, история, события)</option>
                <option value="spark">✨ Spark (AI, технологии, Хабр)</option>
                <option value="seasons">🍋 Seasons (Сезонные подборки, медиа)</option>
                <option value="telegram">✈️ TG Live (Быстрый поток)</option>
              </select>
            </div>

            {/* Feed Slug */}
            <div>
              <label className="text-[#c9c7b2] block mb-1.5 font-semibold">Слаг фида (URL ID)</label>
              <input
                type="text"
                value={projection.feedSlug || ''}
                onChange={(e) => handleFieldChange('feedSlug', e.target.value)}
                placeholder="wiki, tech-notes, daily"
                className="w-full bg-[#121414] border border-[#242828] rounded-lg px-3 py-2 text-white text-xs focus:border-[#0ea5e9] outline-none"
              />
            </div>

            {/* Feed Title */}
            <div>
              <label className="text-[#c9c7b2] block mb-1.5 font-semibold">Заголовок фида</label>
              <input
                type="text"
                value={projection.feedTitle || ''}
                onChange={(e) => handleFieldChange('feedTitle', e.target.value)}
                placeholder="Например: Этот день в истории (Wiki)"
                className="w-full bg-[#121414] border border-[#242828] rounded-lg px-3 py-2 text-white text-xs focus:border-[#0ea5e9] outline-none"
              />
            </div>

            {/* Emoji & Accent Color */}
            <div>
              <label className="text-[#c9c7b2] block mb-1.5 font-semibold">Иконка Emoji</label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_EMOJIS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => handleFieldChange('emoji', em)}
                    className={`w-7 h-7 rounded text-sm flex items-center justify-center transition-all ${
                      projection.emoji === em
                        ? 'bg-[#0ea5e9]/30 border border-[#0ea5e9] scale-110'
                        : 'bg-[#121414] border border-[#242828] hover:border-[#444]'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Color Presets */}
          <div>
            <label className="text-[#c9c7b2] text-xs font-mono block mb-1.5 font-semibold">Акцентный цвет</label>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.color}
                  type="button"
                  onClick={() => handleFieldChange('accentColor', c.color)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${
                    projection.accentColor === c.color ? 'scale-125 border-white' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.color }}
                  title={c.label}
                />
              ))}
              <input
                type="text"
                value={projection.accentColor || '#0ea5e9'}
                onChange={(e) => handleFieldChange('accentColor', e.target.value)}
                className="ml-3 bg-[#121414] border border-[#242828] rounded px-2 py-1 text-[11px] font-mono text-white w-24 outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* 3. Multi-Container Federation (Combine with other containers) */}
      {projection.enabled && (
        <div className="p-5 rounded-2xl bg-[#181a1a] border border-[#242828] space-y-3">
          <h4 className="font-sans font-bold text-sm text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#a855f7]" />
            <span>Объединение контейнеров в одну ленту (Feed Federation)</span>
          </h4>
          <p className="text-xs text-[#93927e]">
            Выберите другие контейнеры, заметки из которых будут объединяться в этот же поток:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            {allContainers
              .filter((c) => c.id !== container.id)
              .map((c) => {
                const isCombined = (projection.combineWith || []).includes(c.id);
                return (
                  <label
                    key={c.id}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      isCombined
                        ? 'bg-[#a855f7]/15 border-[#a855f7]/50 text-white'
                        : 'bg-[#121414] border-[#242828] text-[#c9c7b2] hover:border-[#333]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isCombined}
                      onChange={() => handleToggleCombine(c.id)}
                      className="rounded text-[#a855f7] bg-[#181a1a] border-[#333]"
                    />
                    <div className="truncate">
                      <span className="font-medium block truncate">{c.name}</span>
                      <span className="text-[10px] text-[#93927e] font-mono">{c.notesCount || 0} заметок</span>
                    </div>
                  </label>
                );
              })}
          </div>
        </div>
      )}

      {/* 4. Source Engine & Command Bus Sync */}
      <div className="p-5 rounded-2xl bg-[#181a1a] border border-[#242828] space-y-4">
        <div className="flex items-center justify-between border-b border-[#242828] pb-3">
          <div>
            <h4 className="font-sans font-bold text-sm text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#c9cd58]" />
              <span>Источник данных и обновление (Source Config)</span>
            </h4>
            <p className="text-xs text-[#93927e] mt-0.5">
              Тип источника для автообновлений через бэкенд и шину команд.
            </p>
          </div>

          <button
            type="button"
            onClick={handleTriggerBusSync}
            disabled={isSyncingBus}
            className="px-3 py-1.5 rounded-lg bg-[#c9cd58]/20 hover:bg-[#c9cd58]/30 text-[#e5e971] text-xs font-semibold flex items-center gap-1.5 border border-[#c9cd58]/40 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingBus ? 'animate-spin' : ''}`} />
            <span>{isSyncingBus ? 'Синхронизация...' : '⚡ Синхронизировать через шину'}</span>
          </button>
        </div>

        {syncResult && (
          <div className="p-3 rounded-lg bg-[#c9cd58]/10 border border-[#c9cd58]/30 text-xs text-[#e5e971] flex items-center gap-2 font-mono">
            <Info className="w-4 h-4 shrink-0" />
            <span>{syncResult}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div>
            <label className="text-[#c9c7b2] block mb-1.5 font-semibold">Тип источника (Source Type)</label>
            <select
              value={source.type || 'daily'}
              onChange={(e) => handleSourceFieldChange('type', e.target.value)}
              className="w-full bg-[#121414] border border-[#242828] rounded-lg px-3 py-2 text-white text-xs focus:border-[#c9cd58] outline-none"
            >
              <option value="daily">📅 Daily Source (Обновление каждый день / Wiki)</option>
              <option value="common">📁 Common Source (Единый репозиторий / база знаний)</option>
              <option value="wiki">📖 Wikipedia On-This-Day Engine</option>
              <option value="api">🌐 Внешний API / Webhook</option>
              <option value="rss">📰 RSS поток</option>
            </select>
          </div>

          <div>
            <label className="text-[#c9c7b2] block mb-1.5 font-semibold">Стратегия слияния (Sync Strategy)</label>
            <select
              value={source.syncStrategy || 'merge'}
              onChange={(e) => handleSourceFieldChange('syncStrategy', e.target.value)}
              className="w-full bg-[#121414] border border-[#242828] rounded-lg px-3 py-2 text-white text-xs focus:border-[#c9cd58] outline-none"
            >
              <option value="merge">Merge (Обновлять существующие, добавлять новые)</option>
              <option value="append">Append (Только добавлять)</option>
              <option value="replace">Replace (Перезаписывать)</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="text-[#c9c7b2] block mb-1.5 font-semibold">API Endpoint источника</label>
            <input
              type="text"
              value={source.apiUrl || ''}
              onChange={(e) => handleSourceFieldChange('apiUrl', e.target.value)}
              placeholder="https://ru.wikipedia.org/api/rest_v1/feed/onthisday/events"
              className="w-full bg-[#121414] border border-[#242828] rounded-lg px-3 py-2 text-white text-xs focus:border-[#c9cd58] outline-none"
            />
          </div>
        </div>
      </div>

      {/* 5. Save Button Footer */}
      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-[#93927e] font-mono">
          Конфигурация сохраняется в хранилище и доступна внешним агентам и шине задач.
        </span>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-2 rounded-xl bg-[#c9cd58] hover:bg-[#d8dc6a] text-[#121414] font-semibold text-xs flex items-center gap-2 transition-all shadow-lg shadow-[#c9cd58]/20 disabled:opacity-50"
        >
          {isSaving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : saveSuccess ? (
            <Check className="w-4 h-4" />
          ) : (
            <Zap className="w-4 h-4" />
          )}
          <span>{isSaving ? 'Сохранение...' : saveSuccess ? 'Сохранено!' : 'Сохранить конфигурацию'}</span>
        </button>
      </div>
    </div>
  );
};
