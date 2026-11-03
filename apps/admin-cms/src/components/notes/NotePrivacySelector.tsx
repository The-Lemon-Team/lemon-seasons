import React from 'react';
import { Lock, Globe } from 'lucide-react';
import { NotePrivacy } from '../../types';

interface NotePrivacySelectorProps {
  value: NotePrivacy;
  onChange: (value: NotePrivacy) => void;
  disabled?: boolean;
}

export const NotePrivacySelector: React.FC<NotePrivacySelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  return (
    <div>
      <label className="block text-xs font-mono text-on-surface-variant mb-1 flex items-center gap-1.5">
        {value === 'private' ? (
          <Lock className="w-3.5 h-3.5 text-amber-400" />
        ) : (
          <Globe className="w-3.5 h-3.5 text-blue-400" />
        )}
        <span>Контур приватности</span>
      </label>
      <div className="grid grid-cols-2 gap-2 bg-surface-container-lowest p-1 rounded-lg border border-outline-variant/30">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange('private')}
          className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono transition-all cursor-pointer ${
            value === 'private'
              ? 'bg-amber-950/40 text-amber-300 border border-amber-500/50 shadow-sm font-semibold'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5 border border-transparent'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Личная (Private)</span>
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange('public')}
          className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono transition-all cursor-pointer ${
            value === 'public'
              ? 'bg-blue-950/40 text-blue-300 border border-blue-500/50 shadow-sm font-semibold'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5 border border-transparent'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Публичная (Public)</span>
        </button>
      </div>
      <p className="mt-1 text-[10px] font-mono text-on-surface-variant/80">
        {value === 'private'
          ? '🔒 Скрыта из публичного фида, хранится в приватном контуре CMS (по умолчанию)'
          : '🌐 Доступна в публичной ленте и синхронизируется со Staging'}
      </p>
    </div>
  );
};
