import React, { useState } from 'react';
import { Modal } from './Modal';
import { ObsidianLogo } from './ObsidianLogo';
import { useI18n } from '../i18n';
import {
  ContainerPrivacy,
  ContainerObserveMode,
} from '@lenta/shared';
import {
  Plus,
  Lock,
  Globe,
  ShieldCheck,
  FolderGit2,
  Trash2,
} from 'lucide-react';

export interface AddContainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: any[];
  onAddContainer: (containerData: {
    name: string;
    description?: string;
    vaultPath: string;
    privacy: ContainerPrivacy;
    boundFolders?: any[];
  }) => void;
}

export const AddContainerModal: React.FC<AddContainerModalProps> = ({
  isOpen,
  onClose,
  folders,
  onAddContainer,
}) => {
  const { t } = useI18n();

  const [form, setForm] = useState<{
    name: string;
    description: string;
    vaultPath: string;
    privacy: ContainerPrivacy;
    folders: Array<{
      path: string;
      name: string;
      isPrimary: boolean;
      observeMode: ContainerObserveMode;
      filterTag?: string;
    }>;
  }>({
    name: '',
    description: '',
    vaultPath: '',
    privacy: 'private',
    folders: [
      {
        path: '01_Daily_Logs',
        name: 'Ежедневные заметки',
        isPrimary: true,
        observeMode: 'recursive',
      },
    ],
  });

  const handleAddFolderRow = () => {
    setForm((prev) => ({
      ...prev,
      folders: [
        ...prev.folders,
        {
          path: '',
          name: '',
          isPrimary: false,
          observeMode: 'recursive',
        },
      ],
    }));
  };

  const handleRemoveFolderRow = (index: number) => {
    setForm((prev) => {
      const nextFolders = prev.folders.filter((_, i) => i !== index);
      if (nextFolders.length > 0 && !nextFolders.some((f) => f.isPrimary)) {
        nextFolders[0].isPrimary = true;
      }
      return { ...prev, folders: nextFolders };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const validFolders = form.folders
      .filter((f) => f.path.trim().length > 0)
      .map((f) => {
        const cleanPath = f.path.trim().replace(/^\/+|\/+$/g, '');
        const matchedFolder = folders.find(
          (m: any) => m.path.toLowerCase() === cleanPath.toLowerCase(),
        );
        return {
          path: cleanPath,
          name: f.name.trim() || matchedFolder?.name || cleanPath.split('/').pop() || cleanPath,
          isPrimary: f.isPrimary,
          observeMode: f.observeMode,
          filterTag: f.filterTag?.trim() || undefined,
          notesCount: matchedFolder?._count?.noteFolders ?? 0,
        };
      });

    onAddContainer({
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      vaultPath: form.vaultPath.trim() || `Vault/${form.name.trim().replace(/\s+/g, '_')}`,
      privacy: form.privacy,
      boundFolders: validFolders.length > 0 ? validFolders : undefined,
    });

    onClose();
    setForm({
      name: '',
      description: '',
      vaultPath: '',
      privacy: 'private',
      folders: [
        {
          path: '01_Daily_Logs',
          name: 'Ежедневные заметки',
          isPrimary: true,
          observeMode: 'recursive',
        },
      ],
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-2xl"
      containerClassName="border-[#a855f7]/40 rounded-2xl"
      title={t.newContainerTitle}
      subtitle="Создание хранилища с выбором приватности и отслеживаемых папок"
      icon={
        <div className="w-8 h-8 rounded-lg bg-[#a855f7]/20 border border-[#a855f7]/50 flex items-center justify-center">
          <ObsidianLogo size={20} />
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 overflow-y-auto">
        {/* Container Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-mono font-semibold text-[#c9c7b2] flex items-center gap-1.5">
            <span>{t.containerName} *</span>
          </label>
          <input
            type="text"
            required
            placeholder="например: Work Roadmap или Личный Дневник"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            className="bg-[#121414] border border-[#242828] focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7] rounded-lg text-xs font-mono px-3.5 py-2 text-[#e2e2e2] outline-none transition-all"
          />
        </div>

        {/* Vault Root Path & Description */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono font-semibold text-[#c9c7b2]">
              {t.vaultPath}
            </label>
            <input
              type="text"
              placeholder="например: Vault/Projects"
              value={form.vaultPath}
              onChange={(e) => setForm((prev) => ({ ...prev, vaultPath: e.target.value }))}
              className="bg-[#121414] border border-[#242828] focus:border-[#a855f7] rounded-lg text-xs font-mono px-3.5 py-2 text-[#e2e2e2] outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono font-semibold text-[#c9c7b2]">
              Описание (опционально)
            </label>
            <input
              type="text"
              placeholder="Краткое назначение контейнера..."
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              className="bg-[#121414] border border-[#242828] focus:border-[#a855f7] rounded-lg text-xs font-mono px-3.5 py-2 text-[#e2e2e2] outline-none"
            />
          </div>
        </div>

        {/* Privacy Choice (Private vs Public) */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-mono font-semibold text-[#c9c7b2] flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#a855f7]" />
            <span>{t.privacySetting}</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Option 1: Private */}
            <label
              className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                form.privacy === 'private'
                  ? 'bg-[#a855f7]/15 border-[#a855f7] ring-1 ring-[#a855f7]/40 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                  : 'bg-[#121414] border-[#242828] hover:border-[#383a3a]'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#a855f7]" />
                  <span className="font-sans font-bold text-xs text-[#f3e8ff]">
                    {t.privacyPrivate}
                  </span>
                </div>
                <input
                  type="radio"
                  name="privacy"
                  value="private"
                  checked={form.privacy === 'private'}
                  onChange={() => setForm((prev) => ({ ...prev, privacy: 'private' }))}
                  className="text-[#a855f7] focus:ring-[#a855f7]"
                />
              </div>
              <p className="text-[11px] text-[#93927e] leading-snug">
                {t.privacyPrivateDesc}
              </p>
            </label>

            {/* Option 2: Public */}
            <label
              className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                form.privacy === 'public'
                  ? 'bg-[#c9cd58]/15 border-[#c9cd58] ring-1 ring-[#c9cd58]/40 shadow-[0_0_15px_rgba(201,205,88,0.2)]'
                  : 'bg-[#121414] border-[#242828] hover:border-[#383a3a]'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#c9cd58]" />
                  <span className="font-sans font-bold text-xs text-[#e5e971]">
                    {t.privacyPublic}
                  </span>
                </div>
                <input
                  type="radio"
                  name="privacy"
                  value="public"
                  checked={form.privacy === 'public'}
                  onChange={() => setForm((prev) => ({ ...prev, privacy: 'public' }))}
                  className="text-[#c9cd58] focus:ring-[#c9cd58]"
                />
              </div>
              <p className="text-[11px] text-[#93927e] leading-snug">
                {t.privacyPublicDesc}
              </p>
            </label>
          </div>
        </div>

        {/* Bound Folders to Observe */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-mono font-semibold text-[#c9c7b2] flex items-center gap-1.5">
                <FolderGit2 className="w-3.5 h-3.5 text-[#a855f7]" />
                <span>{t.boundFoldersTitle}</span>
              </label>
              <p className="text-[11px] text-[#93927e]">
                {t.boundFoldersDesc}
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddFolderRow}
              className="text-xs font-mono text-[#a855f7] hover:text-[#d8b4fe] flex items-center gap-1 font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Добавить еще папку</span>
            </button>
          </div>

          {/* Folder Rows */}
          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto p-1">
            {form.folders.map((folder, index) => (
              <div
                key={index}
                className="p-3 rounded-lg bg-[#121414] border border-[#242828] flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
              >
                <div className="flex-1">
                  <input
                    type="text"
                    required
                    placeholder="Путь: 01_Daily_Logs или Notes/Dev"
                    value={folder.path}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm((prev) => ({
                        ...prev,
                        folders: prev.folders.map((f, i) =>
                          i === index ? { ...f, path: val } : f,
                        ),
                      }));
                    }}
                    className="w-full bg-[#181a1a] border border-[#242828] rounded text-xs font-mono px-2.5 py-1.5 text-[#e2e2e2] outline-none focus:border-[#a855f7]"
                  />
                </div>

                <div className="w-full sm:w-48">
                  <select
                    value={folder.observeMode}
                    onChange={(e) => {
                      const val = e.target.value as ContainerObserveMode;
                      setForm((prev) => ({
                        ...prev,
                        folders: prev.folders.map((f, i) =>
                          i === index ? { ...f, observeMode: val } : f,
                        ),
                      }));
                    }}
                    className="w-full bg-[#181a1a] border border-[#242828] rounded text-xs font-mono px-2.5 py-1.5 text-[#e2e2e2] outline-none"
                  >
                    <option value="recursive">Рекурсивно (все подпапки)</option>
                    <option value="all">Только прямые файлы</option>
                    <option value="filtered">Фильтрация по тегу</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 justify-between sm:justify-end">
                  <label className="flex items-center gap-1.5 text-[11px] font-mono text-[#93927e] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={folder.isPrimary}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setForm((prev) => ({
                          ...prev,
                          folders: prev.folders.map((f, i) => ({
                            ...f,
                            isPrimary: i === index ? checked : checked ? false : f.isPrimary,
                          })),
                        }));
                      }}
                      className="rounded text-[#a855f7]"
                    />
                    <span>Главная</span>
                  </label>

                  {form.folders.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveFolderRow(index)}
                      className="p-1 rounded text-[#555] hover:text-[#f87171] hover:bg-[#242828]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="pt-4 border-t border-[#242828] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#242828] hover:bg-[#333535] text-xs font-mono text-[#e2e2e2] transition-colors"
          >
            {t.cancel}
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-[#a855f7] to-[#8b5cf6] hover:from-[#b76eff] hover:to-[#9d6efc] text-white font-sans font-semibold text-xs shadow-lg transition-all"
          >
            {t.addContainer}
          </button>
        </div>
      </form>
    </Modal>
  );
};
