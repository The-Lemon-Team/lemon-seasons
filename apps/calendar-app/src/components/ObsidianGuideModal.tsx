import React from 'react';
import { Modal } from './Modal';
import { ObsidianLogo } from './ObsidianLogo';
import { useI18n } from '../i18n';

export interface ObsidianGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ObsidianGuideModal: React.FC<ObsidianGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useI18n();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-2xl"
      containerClassName="rounded-2xl"
      title={t.pluginInstructionsTitle}
      subtitle="Lemon Lenta Plugin • Двусторонняя синхронизация Markdown"
      icon={
        <div className="w-8 h-8 rounded-lg bg-[#a855f7]/20 border border-[#a855f7]/50 flex items-center justify-center">
          <ObsidianLogo size={20} />
        </div>
      }
    >
      {/* Body Guide */}
      <div className="p-6 flex flex-col gap-4 overflow-y-auto text-xs text-[#c9c7b2] leading-relaxed">
        <div className="p-4 rounded-xl bg-[#121414] border border-[#242828] flex flex-col gap-2">
          <h4 className="font-bold text-[#e5e971] flex items-center gap-2">
            <span>1. Установка плагина в Obsidian</span>
          </h4>
          <p className="text-[#93927e] text-[11px]">
            Плагин находится в пакете{' '}
            <code className="text-[#d8b4fe] bg-[#1e2020] px-1.5 py-0.5 rounded">
              packages/obsidian-plugin
            </code>
            . Скопируйте файлы <code className="text-[#d8b4fe]">main.js</code> и{' '}
            <code className="text-[#d8b4fe]">manifest.json</code> в папку{' '}
            <code className="text-[#d8b4fe]">.obsidian/plugins/lemon-lenta-sync</code>{' '}
            вашего хранилища.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#121414] border border-[#242828] flex flex-col gap-2">
          <h4 className="font-bold text-[#e5e971] flex items-center gap-2">
            <span>2. Настройка подключения и API-токена</span>
          </h4>
          <p className="text-[#93927e] text-[11px]">
            Откройте <strong>Настройки Obsidian → Lemon Lenta Plugin</strong>:
          </p>
          <ul className="list-disc pl-5 flex flex-col gap-1 text-[#93927e] text-[11px]">
            <li>
              Укажите <strong>Server URL</strong>:{' '}
              <code className="text-[#c9cd58]">http://localhost:3001</code>
            </li>
            <li>Вставьте ваш <strong>API Токен контейнера</strong> из списка выше.</li>
            <li>Нажмите <strong>Sign In & Validate</strong> для подтверждения подключения.</li>
          </ul>
        </div>

        <div className="p-4 rounded-xl bg-[#121414] border border-[#242828] flex flex-col gap-2">
          <h4 className="font-bold text-[#e5e971] flex items-center gap-2">
            <span>3. Наблюдение за папками (Observed Folders)</span>
          </h4>
          <p className="text-[#93927e] text-[11px]">
            Все заметки с YAML frontmatter в отслеживаемых папках будут автоматически парситься,
            версионироваться и отображаться в едином календаре Lemon Calendarium.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-[#242828] bg-[#141616] flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-1.5 rounded-lg bg-[#242828] hover:bg-[#333] text-xs font-mono text-[#e2e2e2]"
        >
          {t.close}
        </button>
      </div>
    </Modal>
  );
};
