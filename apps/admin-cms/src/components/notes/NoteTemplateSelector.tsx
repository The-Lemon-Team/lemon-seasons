import React from 'react';
import {
  FileText,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Rocket,
  Radio,
  Sparkles,
  LayoutTemplate,
} from 'lucide-react';
import { NOTE_TEMPLATES_LIST, NoteTemplateDefinition } from '@lenta/shared';

interface NoteTemplateSelectorProps {
  onSelectTemplate: (template: NoteTemplateDefinition) => void;
  activeTemplateId?: string | null;
  className?: string;
}

function getTemplateIcon(iconName: string) {
  switch (iconName) {
    case 'file-text':
      return <FileText className="w-3.5 h-3.5" />;
    case 'trending-up':
      return <TrendingUp className="w-3.5 h-3.5" />;
    case 'calendar':
      return <Calendar className="w-3.5 h-3.5" />;
    case 'check-circle':
      return <CheckCircle2 className="w-3.5 h-3.5" />;
    case 'rocket':
      return <Rocket className="w-3.5 h-3.5" />;
    case 'radio':
      return <Radio className="w-3.5 h-3.5" />;
    default:
      return <Sparkles className="w-3.5 h-3.5" />;
  }
}

export const NoteTemplateSelector: React.FC<NoteTemplateSelectorProps> = ({
  onSelectTemplate,
  activeTemplateId,
  className = '',
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-mono text-on-surface-variant flex items-center gap-1.5">
          <LayoutTemplate className="w-3.5 h-3.5 text-primary" />
          <span>Шаблоны формы (Templates)</span>
        </label>
        <span className="text-[10px] font-mono text-on-surface-variant/70">
          Быстрая вставка структуры и типа
        </span>
      </div>
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-zinc-800">
        {NOTE_TEMPLATES_LIST.map((tpl) => {
          const isSelected = activeTemplateId === tpl.id;
          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() => onSelectTemplate(tpl)}
              title={tpl.description || tpl.name}
              className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-all border cursor-pointer ${
                isSelected
                  ? 'bg-primary/20 border-primary text-primary font-semibold shadow-xs'
                  : 'bg-surface-container-lowest border-outline-variant/30 text-on-surface-variant hover:border-primary/50 hover:text-on-surface hover:bg-white/5'
              }`}
            >
              <span className={isSelected ? 'text-primary' : 'text-on-surface-variant/70'}>
                {getTemplateIcon(tpl.icon)}
              </span>
              <span>{tpl.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
