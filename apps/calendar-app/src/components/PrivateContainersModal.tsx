import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';
import { X, Lock, Key, Copy, Check, ShieldCheck, Folder, RefreshCw, ExternalLink } from 'lucide-react';

interface PrivateContainersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivateContainersModal: React.FC<PrivateContainersModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const { t } = useI18n();

  const [token, setToken] = useState('lenta_jwt_demo_token_user_2026');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateToken = () => {
    const newToken = `lenta_jwt_sec_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;
    setToken(newToken);
    setCopied(false);
  };

  const mockPrivateContainers = [
    {
      id: 'cont-1',
      name: '🔒 Личное Хранилище (Private Vault)',
      vaultPath: 'Vault/Personal',
      isPrivate: true,
      notesCount: 24,
      lastSyncedAt: '2026-08-22T10:15:00.000Z',
    },
    {
      id: 'cont-2',
      name: '🛡️ Секретные Заметки & Проекты',
      vaultPath: 'Vault/Confidential',
      isPrivate: true,
      notesCount: 12,
      lastSyncedAt: '2026-08-21T18:40:00.000Z',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-[#181a1a] border border-[#2d3030] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#242828] bg-[#121414]/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#c9cd58]/20 border border-[#c9cd58]/40 flex items-center justify-center text-sm">
              🔐
            </div>
            <div>
              <h3 className="font-sans font-bold text-sm text-[#e5e971]">
                {t.privateContainers}
              </h3>
              <p className="text-[11px] font-mono text-[#93927e]">
                {t.privateContainersSubtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#93927e] hover:text-white hover:bg-[#242828] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-6 max-h-[80vh] overflow-y-auto">
          {/* Privacy Status Badge */}
          <div className="p-4 rounded-lg bg-[#1a291e] border border-[#2d5236] flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#4ade80] shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-[#86efac] mb-0.5">
                Приватный доступ подтвержден ({user?.email})
              </p>
              <p className="text-[#a7f3d0]/80 text-[11px] leading-relaxed">
                {t.privateVaultNotice}
              </p>
            </div>
          </div>

          {/* Token Management Box */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-mono font-semibold text-[#c9c7b2] uppercase tracking-wider flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-[#c9cd58]" />
              API Токен для плагина Obsidian
            </span>
            <p className="text-[11px] text-[#93927e]">
              {t.connectObsidianDesc}
            </p>

            <div className="flex items-center gap-2 mt-1">
              <input
                type="text"
                readOnly
                value={token}
                className="flex-1 bg-[#121414] border border-[#242828] font-mono text-xs px-3 py-2 text-[#e2e2e2] rounded-md outline-none select-all"
              />
              <button
                onClick={handleCopy}
                className={`px-3 py-2 rounded-md font-mono text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  copied
                    ? 'bg-[#22c55e] text-white'
                    : 'bg-[#c9cd58] text-[#121414] hover:bg-[#dce06b]'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? t.tokenCopied : t.copyToken}</span>
              </button>
              <button
                onClick={handleGenerateToken}
                title={t.generateNewToken}
                className="p-2 rounded-md border border-[#242828] text-[#c9c7b2] hover:text-white hover:bg-[#242828] transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Private Containers List */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[11px] font-mono font-semibold text-[#c9c7b2] uppercase tracking-wider flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-[#c9cd58]" />
              Подключенные приватные контейнеры
            </span>

            <div className="flex flex-col gap-2">
              {mockPrivateContainers.map((c) => (
                <div
                  key={c.id}
                  className="p-3.5 rounded-lg bg-[#121414] border border-[#242828] flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-[#1e2020] border border-[#333] flex items-center justify-center text-sm">
                      🔒
                    </div>
                    <div>
                      <h4 className="font-sans font-semibold text-xs text-[#e2e2e2]">
                        {c.name}
                      </h4>
                      <p className="font-mono text-[10px] text-[#93927e]">
                        Путь: {c.vaultPath} • {c.notesCount} заметок
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded bg-[#c9cd58]/10 text-[#c9cd58] font-mono text-[10px] font-semibold border border-[#c9cd58]/30">
                    Приватный
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="p-4 rounded-lg bg-[#121414] border border-[#242828] text-[11px] text-[#c9c7b2] flex flex-col gap-1.5">
            <h5 className="font-bold text-[#e5e971] flex items-center gap-1.5">
              <span>📖 Как настроить плагин Obsidian:</span>
            </h5>
            <ol className="list-decimal pl-4 flex flex-col gap-1 text-[#93927e]">
              <li>Откройте Obsidian → Настройки → <strong>Lemon Lenta Plugin</strong>.</li>
              <li>Вставьте ваш скопированный API Токен в поле <em>Personal API Token</em>.</li>
              <li>Нажмите кнопку <strong>Sign In & Validate</strong> для активации приватного контейнера.</li>
              <li>Все создаваемые в Obsidian приватные заметки будут автоматически синхронизироваться.</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-[#242828] bg-[#121414]/50">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-[#242828] hover:bg-[#333535] text-xs font-mono text-[#e2e2e2] transition-colors"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
