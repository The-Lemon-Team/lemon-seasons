import React from 'react';
import { Pin, CalendarRange, Calendar, Film, AtSign, CheckCircle2, Tag } from 'lucide-react';
import { NoteType } from '../types';
import { NOTE_TYPE_CONFIGS } from '../constants/noteTypes';
import { useAdminI18n } from '../i18n';

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  SINGLE: Pin,
  PERIOD: CalendarRange,
  EVENT: Calendar,
  FILM_RELEASE: Film,
  MENTION: AtSign,
  DONE: CheckCircle2,
};

interface NoteTypeBadgeProps {
  type: NoteType | string;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export const NoteTypeBadge: React.FC<NoteTypeBadgeProps> = ({
  type,
  size = 'md',
  showIcon = true,
}) => {
  const { getTypeLabel } = useAdminI18n();
  const config = (NOTE_TYPE_CONFIGS as any)[type] || {
    label: type,
    bg: 'bg-white/10',
    text: 'text-on-surface',
    border: 'border-white/10',
    icon: 'label',
  };

  const sizeClasses =
    size === 'sm'
      ? 'px-1.5 py-0.5 text-[10px] gap-1'
      : 'px-2 py-0.5 text-[11px] gap-1.5';

  const iconClass = size === 'sm' ? 'w-3 h-3 shrink-0' : 'w-3.5 h-3.5 shrink-0';
  const label = typeof type === 'string' && (NOTE_TYPE_CONFIGS as any)[type] ? getTypeLabel(type as NoteType) : config.label;
  const IconComp = TYPE_ICONS[type] || Tag;

  return (
    <span
      className={`inline-flex items-center font-mono font-semibold uppercase tracking-wider rounded-sm border ${config.bg} ${config.text} ${config.border} ${sizeClasses}`}
    >
      {showIcon && <IconComp className={iconClass} />}
      <span>{label}</span>
    </span>
  );
};


