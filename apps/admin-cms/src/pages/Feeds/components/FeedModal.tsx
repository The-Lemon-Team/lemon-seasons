import React, { useState, useEffect } from 'react';
import { Modal, message } from 'antd';
import { Feed } from '../../../types';
import { AdminTranslations } from '../../../i18n';
import { useFolders, useHashtags } from '../../../api/queries';

const DEFAULT_SUGGESTED_FOLDERS = [
  'Spark/AI',
  'Spark/Habr',
  'Spark/World of Warcraft',
  'Editorial/Seasons',
  'Editorial/Daily',
  'Personal/Vault',
];

const PRESET_COLORS = [
  '#cacd58', // Olive Gold (Primary)
  '#a4d0be', // Teal (Tertiary)
  '#e6cc80', // Warm Amber
  '#c9c8a5', // Sage
  '#78dce8', // Cyan
  '#ab9df2', // Lavender
  '#ffb4ab', // Coral / Error
  '#fc9867', // Orange
];

const QUICK_ICONS = [
  'dynamic_feed',
  'bolt',
  'event',
  'radar',
  'terminal',
  'sports_esports',
  'newspaper',
  'podcasts',
  'science',
  'auto_awesome',
  'folder',
  'bookmark',
];

interface FeedModalProps {
  open: boolean;
  editingFeed: Feed | null;
  initialGroup?: string;
  onClose: () => void;
  onSave: (data: {
    title: string;
    description?: string;
    slug?: string;
    icon?: string;
    color?: string;
    folderPaths: string[];
    hashtags: string[];
  }) => Promise<void>;
  isSubmitting: boolean;
  t: AdminTranslations;
}

export const FeedModal: React.FC<FeedModalProps> = ({
  open,
  editingFeed,
  initialGroup,
  onClose,
  onSave,
  isSubmitting,
  t,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [icon, setIcon] = useState('dynamic_feed');
  const [color, setColor] = useState('#cacd58');
  const [folderPaths, setFolderPaths] = useState<string[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);

  // Inputs
  const [customPathInput, setCustomPathInput] = useState('');
  const [folderFilterText, setFolderFilterText] = useState('');
  const [tagInput, setTagInput] = useState('');

  const { data: existingFolders = [] } = useFolders();
  const { data: existingHashtags = [] } = useHashtags();

  // Combine folders from DB and defaults into a distinct list
  const availableFolders = React.useMemo(() => {
    const set = new Set<string>();
    for (const p of DEFAULT_SUGGESTED_FOLDERS) {
      set.add(p);
    }
    for (const f of existingFolders) {
      if (f.path) set.add(f.path);
    }
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
      setIcon(editingFeed.icon || 'dynamic_feed');
      setColor(editingFeed.color || '#cacd58');
      setFolderPaths(editingFeed.folderPaths || []);
      setHashtags(editingFeed.hashtags || []);
    } else {
      setTitle('');
      setDescription('');
      setSlug(initialGroup ? `${initialGroup.toLowerCase()}-` : '');
      setIcon('dynamic_feed');
      setColor('#cacd58');
      setFolderPaths([]);
      setHashtags([]);
    }
    setCustomPathInput('');
    setFolderFilterText('');
    setTagInput('');
  }, [editingFeed, initialGroup, open]);

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

  const handleAddTag = () => {
    const clean = tagInput.trim().replace(/^#/, '').toLowerCase();
    if (!clean) return;
    if (hashtags.includes(clean)) {
      setTagInput('');
      return;
    }
    setHashtags((prev) => [...prev, clean]);
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setHashtags((prev) => prev.filter((t) => t !== tag));
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
      icon: icon.trim() || undefined,
      color: color.trim() || undefined,
      folderPaths,
      hashtags,
    });
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
      centered
      destroyOnClose
      styles={{
        content: {
          backgroundColor: '#202121',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
      }}
    >
      <div className="p-2 space-y-4 max-h-[85vh] overflow-y-auto pr-1">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border border-white/10"
            style={{ backgroundColor: `${color}25`, color }}
          >
            <span className="material-symbols-outlined text-[22px]">{icon}</span>
          </div>
          <div>
            <h2 className="font-sans font-bold text-lg text-on-surface">
              {editingFeed ? t.editFeedTitle : t.createFeedTitle}
            </h2>
            <p className="text-on-surface-variant text-xs">
              {t.feedsPageSubtitle}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title & Slug */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block font-mono text-[11px] font-semibold text-on-surface-variant uppercase">
                {t.feedTitleLabel} *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. World of Warcraft"
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
                placeholder="e.g. spark-wow"
                className="w-full bg-surface-container-lowest border border-white/10 rounded px-3 py-2 text-on-surface font-mono text-xs focus:border-primary outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="block font-mono text-[11px] font-semibold text-on-surface-variant uppercase">
              {t.feedDescriptionLabel}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Краткое назначение и фокус ленты..."
              className="w-full bg-surface-container-lowest border border-white/10 rounded px-3 py-2 text-on-surface text-sm focus:border-primary outline-none resize-none"
            />
          </div>

          {/* Visual Identity: Icon & Accent Color */}
          <div className="p-3 bg-surface-container-lowest rounded-lg border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-semibold text-on-surface-variant uppercase">
                Айдентика ленты (Иконка & Цвет)
              </span>
            </div>

            {/* Quick Icon Selector */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-on-surface-variant block font-mono">
                {t.feedIconLabel}:
              </span>
              <div className="flex flex-wrap gap-1.5 items-center">
                {QUICK_ICONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setIcon(ic)}
                    className={`w-8 h-8 rounded flex items-center justify-center transition-all ${
                      icon === ic
                        ? 'bg-primary/20 text-primary border border-primary/40 scale-105'
                        : 'bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-white/5'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">{ic}</span>
                  </button>
                ))}
                <input
                  type="text"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="Material Symbol"
                  className="w-28 bg-surface-container border border-white/10 rounded px-2 py-1 text-on-surface font-mono text-xs outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Accent Color Palette */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] text-on-surface-variant block font-mono">
                {t.feedAccentColorLabel}:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full transition-transform border ${
                      color === c ? 'scale-125 border-white shadow' : 'border-transparent hover:scale-110'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="#hex"
                  className="w-24 bg-surface-container border border-white/10 rounded px-2 py-1 text-on-surface font-mono text-xs outline-none focus:border-primary ml-1"
                />
              </div>
            </div>
          </div>

          {/* Folder Projections Configuration */}
          <div className="p-3 bg-surface-container-lowest rounded-lg border border-white/10 space-y-2">
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
              <div className="flex flex-wrap gap-1.5 p-2 bg-surface-container rounded border border-white/5">
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
            <div className="bg-surface-container rounded border border-white/5 p-2 space-y-2">
              <input
                type="text"
                value={folderFilterText}
                onChange={(e) => setFolderFilterText(e.target.value)}
                placeholder="Фильтр папок..."
                className="w-full bg-surface-container-lowest border border-white/10 rounded px-2.5 py-1 text-on-surface text-xs outline-none focus:border-primary"
              />

              <div className="max-h-28 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
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
                        className="rounded bg-surface-container-lowest border-white/20 text-primary focus:ring-0"
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
                className="flex-1 bg-surface-container border border-white/10 rounded px-3 py-1.5 text-on-surface font-mono text-xs focus:border-primary outline-none"
              />
              <button
                type="button"
                onClick={handleAddCustomPath}
                className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded text-xs font-semibold border border-white/10 transition-colors"
              >
                {t.addFolderBtn}
              </button>
            </div>
          </div>

          {/* Hashtags Filter Configuration (Smart View) */}
          <div className="p-3 bg-surface-container-lowest rounded-lg border border-white/10 space-y-2">
            <div>
              <label className="block font-mono text-[11px] font-semibold text-on-surface-variant uppercase">
                {t.feedHashtagsLabel}
              </label>
              <p className="text-xs text-on-surface-variant/80 mt-0.5">
                {t.feedHashtagsHelp}
              </p>
            </div>

            {/* Selected Hashtag Chips */}
            {hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 bg-surface-container rounded border border-white/5">
                {hashtags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 bg-tertiary/15 text-tertiary px-2.5 py-1 rounded text-xs font-mono font-medium border border-tertiary/25"
                  >
                    <span>#</span>
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-error text-tertiary/70 transition-colors ml-0.5"
                    >
                      <span className="material-symbols-outlined text-[13px]">close</span>
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Input tag */}
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder={t.feedHashtagsPlaceholder}
                className="flex-1 bg-surface-container border border-white/10 rounded px-3 py-1.5 text-on-surface font-mono text-xs focus:border-primary outline-none"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded text-xs font-semibold border border-white/10 transition-colors"
              >
                + Тег
              </button>
            </div>

            {/* Suggestions from existing tags */}
            {existingHashtags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] text-outline font-mono">Частые:</span>
                {existingHashtags.slice(0, 6).map((h) => {
                  const isChecked = hashtags.includes(h.name.toLowerCase());
                  if (isChecked) return null;
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => setHashtags((prev) => [...prev, h.name.toLowerCase()])}
                      className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface-container hover:bg-white/10 text-on-surface-variant transition-colors"
                    >
                      +{h.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
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
