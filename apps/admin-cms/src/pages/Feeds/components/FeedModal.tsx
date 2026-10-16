import React, { useState, useEffect } from 'react';
import { Modal, message } from 'antd';
import { Feed } from '../../../types';
import { AdminTranslations } from '../../../i18n';
import { useFolders } from '../../../api/queries';

const DEFAULT_SUGGESTED_FOLDERS = [
  'Spark/AI',
  'Spark/Habr',
  'Editorial/Seasons',
  'Editorial/Daily',
  'Personal/Vault',
];

interface FeedModalProps {
  open: boolean;
  editingFeed: Feed | null;
  onClose: () => void;
  onSave: (data: {
    title: string;
    description?: string;
    slug?: string;
    folderPaths: string[];
  }) => Promise<void>;
  isSubmitting: boolean;
  t: AdminTranslations;
}

export const FeedModal: React.FC<FeedModalProps> = ({
  open,
  editingFeed,
  onClose,
  onSave,
  isSubmitting,
  t,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [folderPaths, setFolderPaths] = useState<string[]>([]);
  const [customPathInput, setCustomPathInput] = useState('');
  const [folderFilterText, setFolderFilterText] = useState('');

  const { data: existingFolders = [] } = useFolders();

  // Combine folders from DB and defaults into a distinct list
  const availableFolders = React.useMemo(() => {
    const set = new Set<string>();
    for (const p of DEFAULT_SUGGESTED_FOLDERS) {
      set.add(p);
    }
    for (const f of existingFolders) {
      if (f.path) set.add(f.path);
    }
    // Also include any folders already selected in editingFeed
    for (const p of folderPaths) {
      set.add(p);
    }
    return Array.from(set).sort();
  }, [existingFolders, folderPaths]);

  const filteredFolders = React.useMemo(() => {
    if (!folderFilterText.trim()) return availableFolders;
    const q = folderFilterText.toLowerCase().trim();
    return availableFolders.filter((f) => f.toLowerCase().includes(q));
  }, [availableFolders, folderFilterText]);

  useEffect(() => {
    if (editingFeed) {
      setTitle(editingFeed.title || '');
      setDescription(editingFeed.description || '');
      setSlug(editingFeed.slug || '');
      setFolderPaths(editingFeed.folderPaths || []);
    } else {
      setTitle('');
      setDescription('');
      setSlug('');
      setFolderPaths([]);
    }
    setCustomPathInput('');
    setFolderFilterText('');
  }, [editingFeed, open]);

  const handleToggleFolder = (path: string) => {
    setFolderPaths((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  const handleAddCustomPath = () => {
    const clean = customPathInput
      .trim()
      .replace(/\\/g, '/')
      .replace(/\/+/g, '/')
      .replace(/^\/|\/$/g, '');

    if (!clean) return;

    if (folderPaths.includes(clean)) {
      message.info('Папка уже добавлена');
      setCustomPathInput('');
      return;
    }

    setFolderPaths((prev) => [...prev, clean]);
    setCustomPathInput('');
  };

  const handleRemoveFolder = (path: string) => {
    setFolderPaths((prev) => prev.filter((p) => p !== path));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      message.error(t.feedTitleLabel);
      return;
    }

    await onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      slug: slug.trim() || undefined,
      folderPaths,
    });
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={560}
      centered
      destroyOnClose
      styles={{
        content: {
          backgroundColor: '#292a2a',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
      }}
    >
      <div className="p-2 space-y-4">
        <h2 className="font-sans font-bold text-lg text-on-surface">
          {editingFeed ? t.editFeedTitle : t.createFeedTitle}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block font-mono text-[11px] font-semibold text-on-surface-variant uppercase">
              {t.feedTitleLabel}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. AI & Neuro News"
              className="w-full bg-surface-container-lowest border border-white/10 rounded px-3 py-2 text-on-surface text-sm focus:border-primary outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-mono text-[11px] font-semibold text-on-surface-variant uppercase">
              {t.feedSlugLabel}
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. spark-ai"
              className="w-full bg-surface-container-lowest border border-white/10 rounded px-3 py-2 text-on-surface font-mono text-xs focus:border-primary outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-mono text-[11px] font-semibold text-on-surface-variant uppercase">
              {t.feedDescriptionLabel}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="—"
              className="w-full bg-surface-container-lowest border border-white/10 rounded px-3 py-2 text-on-surface text-sm focus:border-primary outline-none resize-none"
            />
          </div>

          {/* Folder Projections Configuration */}
          <div className="pt-2 border-t border-white/5 space-y-2">
            <div>
              <label className="block font-mono text-[11px] font-semibold text-on-surface-variant uppercase">
                {t.feedFolderPathsLabel}
              </label>
              <p className="text-xs text-on-surface-variant/80 mt-0.5">
                {t.feedFolderPathsHelp}
              </p>
            </div>

            {/* Selected Folder Chips */}
            {folderPaths.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 bg-surface-container-lowest rounded border border-white/10">
                {folderPaths.map((fp) => (
                  <span
                    key={fp}
                    className="inline-flex items-center gap-1.5 bg-primary/15 text-primary px-2.5 py-1 rounded text-xs font-mono font-medium border border-primary/25"
                  >
                    <span className="material-symbols-outlined text-[14px]">folder</span>
                    {fp}
                    <button
                      type="button"
                      onClick={() => handleRemoveFolder(fp)}
                      className="hover:text-error text-primary/70 transition-colors ml-0.5"
                    >
                      <span className="material-symbols-outlined text-[13px]">close</span>
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Folder Checkboxes List with Quick Filter */}
            <div className="bg-surface-container-lowest rounded border border-white/10 p-2.5 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={folderFilterText}
                  onChange={(e) => setFolderFilterText(e.target.value)}
                  placeholder="Фильтр папок..."
                  className="w-full bg-surface-container border border-white/10 rounded px-2.5 py-1 text-on-surface text-xs outline-none focus:border-primary"
                />
              </div>

              <div className="max-h-36 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {filteredFolders.map((path) => {
                  const isChecked = folderPaths.includes(path);
                  return (
                    <label
                      key={path}
                      className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors text-xs font-mono select-none ${
                        isChecked
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'hover:bg-white/5 text-on-surface-variant'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleFolder(path)}
                        className="rounded bg-surface-container border-white/20 text-primary focus:ring-0"
                      />
                      <span className="material-symbols-outlined text-[14px]">
                        {isChecked ? 'folder_open' : 'folder'}
                      </span>
                      <span>{path}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Add Custom Folder Path */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customPathInput}
                onChange={(e) => setCustomPathInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomPath();
                  }
                }}
                placeholder={t.feedFolderAddPlaceholder}
                className="flex-1 bg-surface-container-lowest border border-white/10 rounded px-3 py-1.5 text-on-surface font-mono text-xs focus:border-primary outline-none"
              />
              <button
                type="button"
                onClick={handleAddCustomPath}
                className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-container text-on-surface rounded text-xs font-semibold border border-white/10 transition-colors"
              >
                {t.addFolderBtn}
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-white/5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded text-sm text-on-surface-variant hover:text-on-surface"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-primary text-on-primary hover:bg-primary-fixed-dim rounded font-semibold text-sm shadow transition-all"
            >
              {editingFeed ? t.save : t.createFeedBtn}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
