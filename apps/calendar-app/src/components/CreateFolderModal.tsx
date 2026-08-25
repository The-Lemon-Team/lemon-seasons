import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import { useFoldersContext } from '../context/FoldersContext';
import { FolderPrivacy, CreateFolderInput } from '@lenta/shared';
import {
  FolderPlus,
  Lock,
  Globe,
  X,
  Check,
  Folder,
  BookOpen,
  Sparkles,
  Film,
  Bot,
  Archive,
  Star,
  Shield,
  CircleDollarSign,
  Palette,
} from 'lucide-react';
import { Modal } from './Modal';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentPath?: string;
  defaultPrivacy?: FolderPrivacy;
}

const COLOR_PALETTE = [
  '#c9cd58', // Lemon
  '#a855f7', // Purple
  '#3b82f6', // Blue
  '#f59e0b', // Amber
  '#f43f5e', // Rose
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#ec4899', // Pink
];

const ICONS = [
  { id: 'folder', label: 'Папка' },
  { id: 'lock', label: 'Замок' },
  { id: 'book-open', label: 'Дневник' },
  { id: 'sparkles', label: 'Идеи' },
  { id: 'film', label: 'Медиа' },
  { id: 'bot', label: 'ИИ & Tech' },
  { id: 'archive', label: 'Архив' },
  { id: 'star', label: 'Избранное' },
  { id: 'circle-dollar-sign', label: 'Финансы' },
];

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  isOpen,
  onClose,
  parentPath = '',
  defaultPrivacy = 'public',
}) => {
  const { t } = useI18n();
  const { addFolder } = useFoldersContext();

  const [path, setPath] = useState('');
  const [name, setName] = useState('');
  const [privacy, setPrivacy] = useState<FolderPrivacy>(defaultPrivacy);
  const [color, setColor] = useState(defaultPrivacy === 'private' ? '#a855f7' : '#c9cd58');
  const [icon, setIcon] = useState(defaultPrivacy === 'private' ? 'lock' : 'folder');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      const initialPath = parentPath ? `${parentPath.replace(/\/+$/, '')}/` : '';
      setPath(initialPath);
      setName('');
      setPrivacy(defaultPrivacy);
      setColor(defaultPrivacy === 'private' ? '#a855f7' : '#c9cd58');
      setIcon(defaultPrivacy === 'private' ? 'lock' : 'folder');
      setError('');
    }
  }, [isOpen, parentPath, defaultPrivacy]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPath = path.trim().replace(/^\/+|\/+$/g, '');
    if (!cleanPath) {
      setError('Укажите путь к папке');
      return;
    }

    const input: CreateFolderInput = {
      path: cleanPath,
      name: name.trim() || undefined,
      privacy,
      color,
      icon,
    };

    addFolder(input);
    onClose();
  };

  const handlePrivacySelect = (selected: FolderPrivacy) => {
    setPrivacy(selected);
    if (selected === 'private' && color === '#c9cd58') {
      setColor('#a855f7');
      setIcon('lock');
    } else if (selected === 'public' && color === '#a855f7') {
      setColor('#c9cd58');
      setIcon('folder');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      showDefaultHeader={false}
      maxWidth="max-w-lg"
    >
      <div className="flex flex-col">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#242828] flex items-center justify-between bg-[#1f2121]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#c9cd58]/20 text-[#e5e971]">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-sm text-[#e2e2e2]">
                {t.newFolder}
              </h3>
              <p className="text-[11px] font-mono text-[#93927e]">
                {parentPath ? `Создание подпапки в ${parentPath}` : t.folderManagerSubtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#93927e] hover:text-[#e2e2e2] hover:bg-[#282a2a] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-sans text-[#c9c7b2]">
          {error && (
            <div className="p-2.5 rounded bg-[#ef4444]/20 border border-[#ef4444]/40 text-[#fca5a5] text-xs font-mono">
              {error}
            </div>
          )}

          {/* Folder Path */}
          <div className="space-y-1.5">
            <label className="block font-mono text-[11px] uppercase tracking-wider text-[#93927e]">
              {t.folderPath} <span className="text-[#ef4444]">*</span>
            </label>
            <input
              type="text"
              required
              value={path}
              onChange={(e) => {
                setPath(e.target.value);
                setError('');
              }}
              placeholder="например: 02_Projects/Lenta или Private/Roadmap"
              className="w-full bg-[#121414] border border-[#2d3030] focus:border-[#c9cd58] rounded px-3 py-2 text-xs font-mono text-[#e2e2e2] outline-none transition-colors"
            />
            <p className="text-[10px] font-mono text-[#93927e]">
              Слэш (/) создает вложенную структуру директорий в стиле Obsidian
            </p>
          </div>

          {/* Display Name */}
          <div className="space-y-1.5">
            <label className="block font-mono text-[11px] uppercase tracking-wider text-[#93927e]">
              {t.folderName} (опционально)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={path ? path.split('/').pop() : 'Отображаемое имя'}
              className="w-full bg-[#121414] border border-[#2d3030] focus:border-[#c9cd58] rounded px-3 py-2 text-xs font-mono text-[#e2e2e2] outline-none transition-colors"
            />
          </div>

          {/* Privacy Rule Selector */}
          <div className="space-y-2">
            <label className="block font-mono text-[11px] uppercase tracking-wider text-[#93927e]">
              {t.folderPrivacy}
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Public Folder Card */}
              <button
                type="button"
                onClick={() => handlePrivacySelect('public')}
                className={`p-3 rounded-lg border text-left transition-all flex flex-col gap-1.5 ${
                  privacy === 'public'
                    ? 'bg-[#c9cd58]/15 border-[#c9cd58] text-[#e5e971] shadow-glow-lemon'
                    : 'bg-[#141616] border-[#2d3030] text-[#93927e] hover:bg-[#1a1c1c]'
                }`}
              >
                <div className="flex items-center gap-2 font-mono font-bold text-xs">
                  <Globe className="w-3.5 h-3.5 text-[#c9cd58]" />
                  <span>{t.folderPrivacyPublic}</span>
                </div>
                <p className="text-[10px] leading-relaxed opacity-85">
                  {t.folderPrivacyPublicDesc}
                </p>
              </button>

              {/* Private Folder Card */}
              <button
                type="button"
                onClick={() => handlePrivacySelect('private')}
                className={`p-3 rounded-lg border text-left transition-all flex flex-col gap-1.5 ${
                  privacy === 'private'
                    ? 'bg-[#a855f7]/15 border-[#a855f7] text-[#d8b4fe] shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                    : 'bg-[#141616] border-[#2d3030] text-[#93927e] hover:bg-[#1a1c1c]'
                }`}
              >
                <div className="flex items-center gap-2 font-mono font-bold text-xs">
                  <Lock className="w-3.5 h-3.5 text-[#a855f7]" />
                  <span>{t.folderPrivacyPrivate}</span>
                </div>
                <p className="text-[10px] leading-relaxed opacity-85">
                  {t.folderPrivacyPrivateDesc}
                </p>
              </button>
            </div>
          </div>

          {/* Color & Icon Pickers Row */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            {/* Color Palette */}
            <div className="space-y-1.5">
              <label className="block font-mono text-[10px] uppercase tracking-wider text-[#93927e]">
                Цветовой маркер
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-6 h-6 rounded-full transition-transform ${
                      color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-[#181a1a]' : 'hover:scale-110 opacity-80'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Icon Picker */}
            <div className="space-y-1.5">
              <label className="block font-mono text-[10px] uppercase tracking-wider text-[#93927e]">
                Иконка
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {ICONS.map((ic) => (
                  <button
                    key={ic.id}
                    type="button"
                    onClick={() => setIcon(ic.id)}
                    title={ic.label}
                    className={`p-1.5 rounded transition-colors ${
                      icon === ic.id
                        ? 'bg-[#c9cd58]/20 border border-[#c9cd58] text-[#e5e971]'
                        : 'bg-[#141616] border border-[#2d3030] text-[#93927e] hover:text-white'
                    }`}
                  >
                    {ic.id === 'lock' ? (
                      <Lock className="w-3.5 h-3.5" />
                    ) : ic.id === 'book-open' ? (
                      <BookOpen className="w-3.5 h-3.5" />
                    ) : ic.id === 'sparkles' ? (
                      <Sparkles className="w-3.5 h-3.5" />
                    ) : ic.id === 'film' ? (
                      <Film className="w-3.5 h-3.5" />
                    ) : ic.id === 'bot' ? (
                      <Bot className="w-3.5 h-3.5" />
                    ) : ic.id === 'archive' ? (
                      <Archive className="w-3.5 h-3.5" />
                    ) : ic.id === 'star' ? (
                      <Star className="w-3.5 h-3.5" />
                    ) : ic.id === 'circle-dollar-sign' ? (
                      <CircleDollarSign className="w-3.5 h-3.5" />
                    ) : (
                      <Folder className="w-3.5 h-3.5" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[#242828] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded font-mono text-xs text-[#c9c7b2] hover:bg-[#242828] hover:text-white transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded font-mono text-xs font-bold bg-[#c9cd58] hover:bg-[#d8db6f] text-[#121414] transition-all flex items-center gap-2 shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{t.createFolder}</span>
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
