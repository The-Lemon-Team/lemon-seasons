import React, { useState, useEffect } from 'react';
import { Modal } from 'antd';
import {
  FolderPlus,
  Globe,
  Lock,
  Check,
  Folder as FolderIcon,
  BookOpen,
  Sparkles,
  Film,
  Bot,
  Archive,
  Star,
  CircleDollarSign,
} from 'lucide-react';
import { FolderPrivacy, CreateFolderInput } from '../../types';
import { useAdminI18n } from '../../i18n';
import { FOLDER_COLOR_PALETTE, FOLDER_ICONS_LIST } from './folderTree.utils';

export interface CreateFolderModalProps {
  open: boolean;
  onClose: () => void;
  parentPath?: string;
  defaultPrivacy?: FolderPrivacy;
  onSubmit: (input: CreateFolderInput) => Promise<void>;
  isLoading?: boolean;
}

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  open,
  onClose,
  parentPath = '',
  defaultPrivacy = 'public',
  onSubmit,
  isLoading = false,
}) => {
  const { t } = useAdminI18n();

  const [path, setPath] = useState('');
  const [name, setName] = useState('');
  const [privacy, setPrivacy] = useState<FolderPrivacy>(
    defaultPrivacy === 'obsidian' ? 'public' : defaultPrivacy
  );
  const [color, setColor] = useState(defaultPrivacy === 'private' ? '#a855f7' : '#c9cd58');
  const [icon, setIcon] = useState(defaultPrivacy === 'private' ? 'lock' : 'folder');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      const initialPath = parentPath ? `${parentPath.replace(/\/+$/, '')}/` : '';
      setPath(initialPath);
      setName('');
      const effectivePrivacy = defaultPrivacy === 'obsidian' ? 'public' : defaultPrivacy || 'public';
      setPrivacy(effectivePrivacy);
      setColor(effectivePrivacy === 'private' ? '#a855f7' : '#c9cd58');
      setIcon(effectivePrivacy === 'private' ? 'lock' : 'folder');
      setError('');
    }
  }, [open, parentPath, defaultPrivacy]);

  // Handle ESC key cleanly per Agent UX Standards
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const handlePrivacySelect = (p: FolderPrivacy) => {
    setPrivacy(p);
    if (p === 'private') {
      setColor('#a855f7');
      setIcon('lock');
    } else {
      setColor('#c9cd58');
      setIcon('folder');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPath = path.trim().replace(/^\/+|\/+$/g, '');
    if (!cleanPath) {
      setError(t.folderInputLabel);
      return;
    }

    try {
      await onSubmit({
        path: cleanPath,
        name: name.trim() || undefined,
        privacy,
        color,
        icon,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error creating folder');
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={480}
      styles={{
        content: {
          backgroundColor: '#202222',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
        },
      }}
      title={
        <div className="flex items-center gap-2 text-on-surface">
          <FolderPlus className="w-5 h-5 text-primary" />
          <span className="font-sans font-bold text-base">{t.addFolderBtn}</span>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <div className="p-2.5 rounded bg-error/15 border border-error/30 text-error text-xs font-mono">
            {error}
          </div>
        )}

        {/* Folder Path */}
        <div className="space-y-1">
          <label className="block font-mono text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">
            {t.folderInputLabel} <span className="text-error">*</span>
          </label>
          <input
            type="text"
            required
            value={path}
            onChange={(e) => {
              setPath(e.target.value);
              setError('');
            }}
            placeholder="e.g. 02_Projects/Lenta or News/Tech"
            className="w-full bg-surface-container-lowest border border-white/10 focus:border-primary rounded px-3 py-1.5 text-xs font-mono text-on-surface outline-none transition-colors"
            autoFocus
          />
          <p className="text-[10px] font-mono text-on-surface-variant/60">
            Используйте слеш (/) для создания иерархии вложенных подпапок
          </p>
        </div>

        {/* Display Name */}
        <div className="space-y-1">
          <label className="block font-mono text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">
            {t.folderNameOptional}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={path ? path.split('/').filter(Boolean).pop() : 'Display Name'}
            className="w-full bg-surface-container-lowest border border-white/10 focus:border-primary rounded px-3 py-1.5 text-xs font-mono text-on-surface outline-none transition-colors"
          />
        </div>

        {/* Privacy Selector Cards */}
        <div className="space-y-1.5">
          <label className="block font-mono text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">
            {t.folderPrivacy}
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {/* Public Card */}
            <button
              type="button"
              onClick={() => handlePrivacySelect('public')}
              className={`p-2.5 rounded-lg border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                privacy === 'public'
                  ? 'bg-primary/15 border-primary text-primary font-bold shadow-xs'
                  : 'bg-surface-container-lowest border-white/10 text-on-surface-variant hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs">
                <Globe className="w-4 h-4 text-primary shrink-0" />
                <span className="truncate">{t.folderPrivacyPublic}</span>
              </div>
              <p className="text-[10px] text-on-surface-variant/80 font-normal leading-tight">
                {t.folderPrivacyPublicDesc}
              </p>
            </button>

            {/* Private Card */}
            <button
              type="button"
              onClick={() => handlePrivacySelect('private')}
              className={`p-2.5 rounded-lg border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                privacy === 'private'
                  ? 'bg-purple-500/15 border-purple-500 text-purple-300 font-bold shadow-xs'
                  : 'bg-surface-container-lowest border-white/10 text-on-surface-variant hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs">
                <Lock className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="truncate">{t.folderPrivacyPrivate}</span>
              </div>
              <p className="text-[10px] text-on-surface-variant/80 font-normal leading-tight">
                {t.folderPrivacyPrivateDesc}
              </p>
            </button>
          </div>
        </div>

        {/* Color & Icon Pickers Row */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* Color Palette */}
          <div className="space-y-1">
            <label className="block font-mono text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold">
              {t.folderColorLabel}
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {FOLDER_COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                    color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-black' : 'hover:scale-110 opacity-75'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Icon Picker */}
          <div className="space-y-1">
            <label className="block font-mono text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold">
              {t.folderIconLabel}
            </label>
            <div className="flex items-center gap-1 flex-wrap">
              {FOLDER_ICONS_LIST.slice(0, 6).map((ic) => (
                <button
                  key={ic.id}
                  type="button"
                  onClick={() => setIcon(ic.id)}
                  title={ic.label}
                  className={`p-1 rounded transition-colors cursor-pointer ${
                    icon === ic.id
                      ? 'bg-primary/20 border border-primary text-primary'
                      : 'bg-surface-container-lowest border border-white/10 text-on-surface-variant hover:text-on-surface'
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
                  ) : (
                    <FolderIcon className="w-3.5 h-3.5" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-on-surface-variant hover:text-on-surface rounded font-medium cursor-pointer"
          >
            {t.cancel}
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-1.5 bg-primary text-on-primary hover:bg-primary-fixed-dim rounded font-semibold text-xs transition-all shadow disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isLoading ? t.loading : t.add}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
