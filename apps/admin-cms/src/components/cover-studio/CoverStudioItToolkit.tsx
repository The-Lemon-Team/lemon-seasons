import React, { useState } from 'react';
import { Tooltip } from 'antd';
import { Sliders, Cpu, Sparkles, Plus, Check, Zap } from 'lucide-react';
import {
  CoverAspectRatio,
  IT_SCENE_MODIFIERS,
  IT_WORKFLOW_TEMPLATES,
  STYLE_PRESETS,
} from './coverStudio.constants';
import {
  buildTemplatePrompt,
  ItStyleRecommendation,
  toggleModifierInPrompt,
} from './coverStudio.utils';

interface CoverStudioItToolkitProps {
  prompt: string;
  style: string;
  aspectRatio: CoverAspectRatio;
  baseTopic: string;
  recommendation: ItStyleRecommendation | null;
  onPromptChange: (newPrompt: string) => void;
  onStyleChange: (newStyle: string) => void;
  onAspectRatioChange: (newRatio: CoverAspectRatio) => void;
}

export const CoverStudioItToolkit: React.FC<CoverStudioItToolkitProps> = ({
  prompt,
  style,
  baseTopic,
  recommendation,
  onPromptChange,
  onStyleChange,
  onAspectRatioChange,
}) => {
  const [styleFilter, setStyleFilter] = useState<'all' | 'it' | 'general'>('all');
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);

  const filteredStyles = STYLE_PRESETS.filter((preset) =>
    styleFilter === 'all' ? true : preset.category === styleFilter,
  );

  const handleApplyTemplate = (templateId: string) => {
    const built = buildTemplatePrompt(templateId, baseTopic || prompt);
    if (!built) return;
    setActiveTemplateId(templateId);
    onPromptChange(built.prompt);
    onStyleChange(built.styleId);
    onAspectRatioChange(built.aspectRatio);
  };

  const handleApplyRecommendation = () => {
    if (!recommendation) return;
    if (recommendation.templateId) {
      handleApplyTemplate(recommendation.templateId);
    } else {
      onStyleChange(recommendation.styleId);
      onAspectRatioChange(recommendation.aspectRatio);
    }
  };

  const selectedStyleObj = STYLE_PRESETS.find((s) => s.id === style);

  return (
    <div className="space-y-3.5">
      {/* Smart IT Auto-Recommendation Banner */}
      {recommendation && style !== recommendation.styleId && (
        <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-primary/10 border border-primary/30 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-on-surface truncate">
              <strong className="text-primary font-mono">AI IT-Детектор:</strong>{' '}
              {recommendation.reason}
            </span>
          </div>
          <button
            type="button"
            onClick={handleApplyRecommendation}
            className="px-2.5 py-1 rounded bg-primary text-on-primary font-bold text-[11px] hover:bg-primary/90 transition-all shrink-0 cursor-pointer"
          >
            Применить пресет
          </button>
        </div>
      )}

      {/* IT Workflow Templates (Podcasts, Changelogs, Security, AI, Cloud) */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[11px] font-mono text-on-surface-variant uppercase flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-primary" />
            <span>IT-Сценарии (Подкасты, Changelogs, Security, AI)</span>
          </label>
          <span className="text-[10px] font-mono text-text-muted">
            Авто-шаблон промпта + стиль + формат
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {IT_WORKFLOW_TEMPLATES.map((tpl) => {
            const isSelected = activeTemplateId === tpl.id && style === tpl.styleId;
            return (
              <Tooltip key={tpl.id} title={tpl.description}>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate(tpl.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-left border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-primary/20 border-primary text-primary shadow-sm'
                      : 'bg-surface-container border-white/5 text-on-surface-variant hover:text-on-surface hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm shrink-0">{tpl.icon}</span>
                    <span className="text-xs font-medium truncate">{tpl.label}</span>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/30 text-text-muted shrink-0">
                    {tpl.aspectRatio}
                  </span>
                </button>
              </Tooltip>
            );
          })}
        </div>
      </div>

      {/* Visual Style Chips with Category Filter */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
          <label className="text-[11px] font-mono text-on-surface-variant uppercase flex items-center gap-1">
            <Sliders className="w-3 h-3 text-primary" />
            <span>Визуальный стиль</span>
            {selectedStyleObj && (
              <span className="text-[10px] font-normal text-text-muted normal-case ml-1 hidden sm:inline">
                — {selectedStyleObj.description}
              </span>
            )}
          </label>

          <div className="flex items-center gap-1 bg-surface-container rounded-md p-0.5 border border-white/5 text-[10px] font-mono">
            {(
              [
                { id: 'all', label: 'Все (14)' },
                { id: 'it', label: '⚡ IT & Tech (8)' },
                { id: 'general', label: 'Базовые (6)' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStyleFilter(tab.id)}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  styleFilter === tab.id
                    ? 'bg-primary/20 text-primary font-bold'
                    : 'text-text-muted hover:text-text-main'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {filteredStyles.map((p) => {
            const isActive = style === p.id;
            return (
              <Tooltip key={p.id} title={p.description}>
                <button
                  type="button"
                  onClick={() => onStyleChange(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-primary/20 border-primary text-primary shadow-sm'
                      : 'bg-surface-container-high border-white/5 text-on-surface-variant hover:text-on-surface hover:border-white/20'
                  }`}
                >
                  <span>{p.icon}</span>
                  <span>{p.label}</span>
                  {p.badge && (
                    <span
                      className={`text-[9px] font-mono px-1 py-0.2 rounded uppercase ${
                        isActive
                          ? 'bg-primary/30 text-primary font-bold'
                          : 'bg-white/5 text-text-muted'
                      }`}
                    >
                      {p.badge}
                    </span>
                  )}
                </button>
              </Tooltip>
            );
          })}
        </div>
      </div>

      {/* Scene Modifiers / Detail Boosters */}
      <div>
        <label className="block text-[10px] font-mono text-on-surface-variant uppercase mb-1 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-primary" />
          <span>IT-Модификаторы сцены (клик добавляет деталь в промпт)</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {IT_SCENE_MODIFIERS.map((mod) => {
            const isIncluded = prompt.includes(mod.snippet);
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => onPromptChange(toggleModifierInPrompt(prompt, mod.snippet))}
                className={`px-2 py-1 rounded-md text-[11px] font-mono flex items-center gap-1 border transition-all cursor-pointer ${
                  isIncluded
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-surface-container border-white/5 text-text-muted hover:text-on-surface hover:border-white/15'
                }`}
              >
                <span>{mod.icon}</span>
                <span>{mod.label}</span>
                {isIncluded ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Plus className="w-3 h-3 opacity-60" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
