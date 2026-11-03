import React from 'react';
import { Lock, Globe } from 'lucide-react';
import { NotePrivacy } from '@lenta/shared';

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
      <label className="block text-[11px] font-mono text-[#c9c7b2] mb-1 flex items-center gap-1.5">
        {value === 'private' ? (
          <Lock className="w-3.5 h-3.5 text-amber-400" />
        ) : (
          <Globe className="w-3.5 h-3.5 text-blue-400" />
        )}
        <span>Контур приватности (Privacy)</span>
      </label>
      <div className="grid grid-cols-2 gap-2 bg-[#121414] p-1 rounded-lg border border-[#242828]">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange('private')}
          className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono transition-all cursor-pointer ${
            value === 'private'
              ? 'bg-amber-950/40 text-amber-300 border border-amber-500/50 shadow-sm'
              : 'text-[#93927e] hover:text-[#e2e2e2] hover:bg-white/5 border border-transparent'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span className="font-semibold">Личная (Private)</span>
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange('public')}
          className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono transition-all cursor-pointer ${
            value === 'public'
              ? 'bg-blue-950/40 text-blue-300 border border-blue-500/50 shadow-sm'
              : 'text-[#93927e] hover:text-[#e2e2e2] hover:bg-white/5 border border-transparent'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span className="font-semibold">Публичная (Public)</span>
        </button>
      </div>
      <p className="mt-1 text-[10px] font-mono text-[#93927e]">
        {value === 'private'
          ? '🔒 Доступна только вам и скрыта из публичного фида календаря (по умолчанию)'
          : '🌐 Будет видна в публичной витрине и синхронизироваться со Staging'}
      </p>
    </div>
  );
};
