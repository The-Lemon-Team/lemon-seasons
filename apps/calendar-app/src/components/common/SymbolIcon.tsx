import React from 'react';

export interface SymbolIconProps {
  icon?: string | null;
  className?: string;
  fallback?: string;
  size?: number | string;
  title?: string;
}

/**
 * Universal icon renderer that supports both Unicode emojis (e.g. '⏱️', '🍋', '🚀')
 * and Google Material Symbols font icons (e.g. 'trending_up', 'palette', 'architecture', 'calendar_today').
 */
export const SymbolIcon: React.FC<SymbolIconProps> = ({
  icon,
  className = '',
  fallback = '✨',
  size,
  title,
}) => {
  const raw = (icon || fallback || '').trim();
  if (!raw) return null;

  const isLigature = /^[a-z0-9_-]+$/i.test(raw);

  if (isLigature) {
    const iconName = raw.toLowerCase().replace(/-/g, '_');
    return (
      <span
        className={`material-symbols-outlined inline-flex items-center justify-center shrink-0 select-none leading-none ${className}`}
        style={size ? { fontSize: typeof size === 'number' ? `${size}px` : size } : undefined}
        title={title || raw}
        aria-hidden="true"
      >
        {iconName}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 select-none leading-none ${className}`}
      style={size ? { fontSize: typeof size === 'number' ? `${size}px` : size } : undefined}
      title={title}
    >
      {raw}
    </span>
  );
};
