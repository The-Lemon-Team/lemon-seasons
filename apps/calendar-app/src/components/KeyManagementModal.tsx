import React, { useState } from 'react';
import { KeyProvider, UserKey } from '@lenta/shared';
import { useUserKeys } from '../context/UserKeysContext';
import { useI18n } from '../i18n';
import { Modal } from './Modal';
import {
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  ShieldAlert,
  Sparkles,
  Info,
} from 'lucide-react';

interface KeyManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyManagementModal: React.FC<KeyManagementModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useI18n();
  const { keys, providers, generateKey, revokeKey } = useUserKeys();

  const [selectedProvider, setSelectedProvider] = useState<KeyProvider>('obsidian');
  const [keyName, setKeyName] = useState('');
  const [newlyGeneratedKey, setNewlyGeneratedKey] = useState<UserKey | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    const created = generateKey(selectedProvider, keyName);
    setNewlyGeneratedKey(created);
    setKeyName('');
  };

  const handleCopy = (keyText: string, id: string) => {
    navigator.clipboard.writeText(keyText);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const handleRevoke = (keyId: string) => {
    if (window.confirm(t.revokeKeyConfirm)) {
      revokeKey(keyId);
      if (newlyGeneratedKey?.id === keyId) {
        setNewlyGeneratedKey(null);
      }
    }
  };

  const maskKey = (secretKey: string) => {
    if (secretKey.length <= 16) return secretKey;
    const prefix = secretKey.slice(0, 10);
    const suffix = secretKey.slice(-4);
    return `${prefix}••••••••${suffix}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-[#242828]">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c9cd58]/30 to-[#535600]/20 border border-[#c9cd58]/60 flex items-center justify-center text-[#e5e971] shadow-glow-lemon shrink-0">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-sans font-bold text-[#e2e2e2]">
              {t.keyManagementTitle}
            </h2>
            <p className="text-xs font-mono text-[#93927e]">
              {t.keyManagementSubtitle}
            </p>
          </div>
        </div>

        {/* Provider Selection */}
        <div>
          <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[#c9cd58] mb-2.5">
            {t.keyProvider}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {providers.map((p) => {
              const isSelected = selectedProvider === p.id;
              const isAvailable = p.available;

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => isAvailable && setSelectedProvider(p.id)}
                  disabled={!isAvailable}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                    isSelected
                      ? 'bg-[#191d1e] border-[#c9cd58]/70 shadow-glow-lemon'
                      : isAvailable
                      ? 'bg-[#141616] border-[#242828] hover:border-[#484837] hover:bg-[#1a1c1c]'
                      : 'bg-[#121313]/60 border-[#1f2121] opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{p.icon}</span>
                      <span className={`text-xs font-semibold font-mono ${isSelected ? 'text-[#e5e971]' : 'text-[#e2e2e2]'}`}>
                        {p.name}
                      </span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#c9cd58]" />}
                    {!isAvailable && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#242828] text-[#93927e]">
                        Скоро
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-[#93927e] line-clamp-1">
                    {p.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Generate Key Form */}
        <form onSubmit={handleGenerate} className="space-y-3 bg-[#141616] p-4 rounded-xl border border-[#242828]">
          <div>
            <label className="block text-xs font-mono font-medium text-[#c9c7b2] mb-1.5">
              {t.keyNameLabel}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder={t.keyNamePlaceholder}
                className="flex-1 bg-[#1c1e1e] border border-[#2d3030] rounded-lg px-3.5 py-2 text-xs font-mono text-[#e2e2e2] placeholder:text-[#5d6060] focus:outline-none focus:border-[#c9cd58] transition-colors"
              />
              <button
                type="submit"
                className="bg-[#c9cd58] hover:bg-[#d8dc66] text-[#121414] font-mono text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-sm shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t.generateKeyBtn}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Newly Generated Secret Banner */}
        {newlyGeneratedKey && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-[#c9cd58]/15 to-[#535600]/10 border border-[#c9cd58]/60 space-y-2.5 animate-fade-in shadow-glow-lemon">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#e5e971]">
                <Sparkles className="w-4 h-4 text-[#c9cd58]" />
                <span>Новый ключ успешно создан: {newlyGeneratedKey.name}</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 bg-[#121414] p-2.5 rounded-lg border border-[#c9cd58]/30">
              <code className="text-xs font-mono text-[#e5e971] select-all break-all">
                {newlyGeneratedKey.key}
              </code>
              <button
                type="button"
                onClick={() => handleCopy(newlyGeneratedKey.key, newlyGeneratedKey.id)}
                className="p-1.5 rounded-lg bg-[#c9cd58] hover:bg-[#d8dc66] text-[#121414] transition-colors flex items-center gap-1 text-xs font-mono font-semibold shrink-0 cursor-pointer"
              >
                {copiedKeyId === newlyGeneratedKey.id ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>{t.copiedToClipboard}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Копировать</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-[#c9c7b2]">
              <Info className="w-3.5 h-3.5 text-[#c9cd58] shrink-0" />
              <span>{t.keyGeneratedNotice}</span>
            </div>
          </div>
        )}

        {/* Active Keys List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#c9cd58]">
              {t.activeKeysTitle} ({keys.length})
            </h3>
          </div>

          {keys.length === 0 ? (
            <div className="p-6 rounded-xl bg-[#141616] border border-[#242828] text-center space-y-2">
              <ShieldAlert className="w-6 h-6 text-[#5d6060] mx-auto" />
              <p className="text-xs font-mono text-[#93927e]">{t.noKeysFound}</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {keys.map((k) => {
                const meta = providers.find((p) => p.id === k.provider);
                const isCopied = copiedKeyId === k.id;

                return (
                  <div
                    key={k.id}
                    className="p-3 rounded-xl bg-[#141616] border border-[#242828] hover:border-[#383a3a] transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-8 h-8 rounded-lg bg-[#1c1e1e] border border-[#2d3030] flex items-center justify-center text-sm shrink-0">
                        {meta?.icon || '🔑'}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold font-sans text-[#e2e2e2] truncate">
                            {k.name}
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#c9cd58]/15 text-[#e5e971] uppercase font-bold shrink-0">
                            {k.provider}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <code className="text-[11px] font-mono text-[#93927e] truncate">
                            {maskKey(k.key)}
                          </code>
                          <span className="text-[10px] text-[#5d6060] font-mono">
                            • {new Date(k.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopy(k.key, k.id)}
                        title="Скопировать токен"
                        className="p-1.5 rounded-lg text-[#93927e] hover:text-[#e5e971] hover:bg-[#242828] transition-colors"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-[#c9cd58]" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRevoke(k.id)}
                        title="Отозвать ключ"
                        className="p-1.5 rounded-lg text-[#93927e] hover:text-[#ef4444] hover:bg-[#ef4444]/15 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
