import React, { useState, useEffect } from 'react';
import { Modal } from 'antd';
import { X, BookmarkPlus, Zap } from 'lucide-react';
import { useAdminI18n } from '../../i18n';
import { FolderInputItem, NoteType } from '../../types';

interface SaveMacroModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (name: string, description?: string) => Promise<void>;
  isSaving: boolean;
  currentFeedTitle?: string;
  currentFolders: FolderInputItem[];
  currentType: NoteType;
}

export const SaveMacroModal: React.FC<SaveMacroModalProps> = ({
  open,
  onClose,
  onSave,
  isSaving,
  currentFeedTitle,
  currentFolders,
  currentType,
}) => {
  const { t } = useAdminI18n();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSaving) return;
    await onSave(name, description);
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={460}
      zIndex={1200}
      centered
      destroyOnClose
      closable={false}
      styles={{
        content: {
          padding: 0,
          backgroundColor: 'var(--panel-bg)',
          border: '1px solid var(--tile-border)',
          boxShadow: 'var(--tile-shadow)',
          overflow: 'hidden',
          borderRadius: 12,
        },
      }}
    >
      <div className="flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-tile-border flex items-center justify-between bg-tile-subtle">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-xs text-text-main">
                {t.saveMacroTitle}
              </h3>
              <p className="font-mono text-[10px] text-text-muted">
                {t.saveMacroDesc}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-text-muted hover:text-text-main hover:bg-tile rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          {/* Summary Preview */}
          <div className="bg-tile-subtle rounded-lg p-2.5 border border-tile-border text-[11px] font-mono space-y-1 text-text-muted">
            <div className="flex items-center justify-between">
              <span>Лента:</span>
              <span className="text-text-main font-semibold">
                {currentFeedTitle || 'Без ленты (общая база)'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Папка:</span>
              <span className="text-text-main font-semibold">
                {currentFolders.length > 0
                  ? currentFolders.map((f) => f.path).join(', ')
                  : 'Без папки'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Тип заметки:</span>
              <span className="text-primary font-semibold">{currentType}</span>
            </div>
          </div>

          {/* Name Input */}
          <div className="space-y-1">
            <label className="block font-mono text-[10px] font-semibold text-text-muted uppercase tracking-wider">
              {t.macroName} *
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="например: JM-Daily или Tech-Review"
              className="w-full bg-control border border-tile-border rounded px-2.5 py-1.5 text-text-main font-sans text-xs placeholder:text-text-muted/60 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
            />
          </div>

          {/* Description Input */}
          <div className="space-y-1">
            <label className="block font-mono text-[10px] font-semibold text-text-muted uppercase tracking-wider">
              Описание (опционально)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Краткое назначение пресета"
              className="w-full bg-control border border-tile-border rounded px-2.5 py-1.5 text-text-main font-sans text-xs placeholder:text-text-muted/60 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex justify-end gap-2 border-t border-tile-border">
            <button
              type="button"
              onClick={onClose}
              className="h-7 px-3 rounded text-xs text-text-muted hover:text-text-main hover:bg-tile-subtle transition-colors font-medium cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSaving}
              className="h-7 px-4 rounded text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span>{isSaving ? t.loading : t.save}</span>
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
