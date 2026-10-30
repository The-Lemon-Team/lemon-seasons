import React, { useState, useEffect, useMemo } from 'react';
import { Modal, message } from 'antd';
import { Feed, FeedPrivacy, CreateFeedInput } from '../../../types';
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
  onSave: (data: CreateFeedInput) => Promise<void>;
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
  const [privacy, setPrivacy] = useState<FeedPrivacy>('public');
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

  // Map existing folders to their privacy status
  const folderPrivacyMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of existingFolders) {
      if (f.path && f.privacy) {
        map.set(f.path, f.privacy);
      }
    }
    return map;
  }, [existingFolders]);

  const hasPrivateFolderInPublicFeed = useMemo(() => {
    if (privacy !== 'public') return false;
    return folderPaths.some((p) => folderPrivacyMap.get(p) === 'private');
  }, [privacy, folderPaths, folderPrivacyMap]);

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

  useEffect(() => {
    if (editingFeed) {
      setTitle(editingFeed.title || '');
      setDescription(editingFeed.description || '');
      setSlug(editingFeed.slug || '');
      setIcon(editingFeed.icon || 'dynamic_feed');
      setColor(editingFeed.color || '#cacd58');
      setPrivacy(editingFeed.privacy || 'public');
      setFolderPaths(editingFeed.folderPaths || []);
      setHashtags(editingFeed.hashtags || []);
    } else {
      setTitle('');
      setDescription('');
      setSlug(initialGroup ? `${initialGroup.toLowerCase()}-` : '');
      setIcon('dynamic_feed');
      setColor('#cacd58');
      setPrivacy('public');
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

    if (privacy === 'public' && hasPrivateFolderInPublicFeed) {
      message.error('Публичная лента не может содержать приватные папки.');
      return;
    }

    await onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      slug: slug.trim() || undefined,
      icon: icon.trim() || undefined,
      color: color.trim() || undefined,
      privacy,
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
          backgroundColor: 'var(--panel-bg)',
          border: '1px solid var(--tile-border)',
          boxShadow: 'var(--tile-shadow)',
        },
      }}
    >
      <div className="p-1 space-y-3 max-h-[85vh] overflow-y-auto pr-1 custom-scrollbar">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-tile-border shadow-xs"
            style={{ backgroundColor: `${color}25`, color }}
          >
            <span className="material-symbols-outlined text-[18px]">{icon}</span>
          </div>
          <div>
            <h2 className="font-sans font-bold text-base text-text-main leading-tight">
              {editingFeed ? t.editFeedTitle : t.createFeedTitle}
            </h2>
            <p className="text-text-muted text-xs">
              {t.feedsPageSubtitle}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Title & Slug */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="block font-mono text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                {t.feedTitleLabel} *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. World of Warcraft"
                className="w-full bg-control border border-tile-border rounded px-2.5 py-1.5 text-text-main text-xs focus:border-primary outline-none transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-mono text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                {t.feedSlugLabel}
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. spark-wow"
                className="w-full bg-control border border-tile-border rounded px-2.5 py-1.5 text-text-main font-mono text-xs focus:border-primary outline-none transition-colors"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="block font-mono text-[10px] font-semibold text-text-muted uppercase tracking-wider">
              {t.feedDescriptionLabel}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Краткое назначение и фокус ленты..."
              className="w-full bg-control border border-tile-border rounded px-2.5 py-1.5 text-text-main text-xs focus:border-primary outline-none resize-none transition-colors"
            />
          </div>

          {/* Privacy Level Selector */}
          <div className="p-2.5 bg-tile-subtle rounded-lg border border-tile-border space-y-2">
            <span className="font-mono text-[10px] font-semibold text-text-muted uppercase tracking-wider block">
              {t.feedPrivacyLabel}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Public Option */}
              <button
                type="button"
                onClick={() => setPrivacy('public')}
                className={`p-2.5 rounded-lg border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                  privacy === 'public'
                    ? 'bg-primary/15 border-primary text-primary font-bold shadow-xs'
                    : 'bg-control border-tile-border text-text-muted hover:bg-tile-subtle hover:text-text-main'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <span className="material-symbols-outlined text-[16px] text-primary">public</span>
                  <span className="truncate">{t.feedPrivacyPublic}</span>
                </div>
                <p className="text-[10px] text-text-muted font-normal leading-tight">
                  {t.feedPrivacyPublicDesc}
                </p>
              </button>

              {/* Private Option */}
              <button
                type="button"
                onClick={() => setPrivacy('private')}
                className={`p-2.5 rounded-lg border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                  privacy === 'private'
                    ? 'bg-purple-500/15 border-purple-500 text-purple-300 font-bold shadow-xs'
                    : 'bg-control border-tile-border text-text-muted hover:bg-tile-subtle hover:text-text-main'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <span className="material-symbols-outlined text-[16px] text-purple-400">lock</span>
                  <span className="truncate">{t.feedPrivacyPrivate}</span>
                </div>
                <p className="text-[10px] text-text-muted font-normal leading-tight">
                  {t.feedPrivacyPrivateDesc}
                </p>
              </button>
            </div>
          </div>

          {/* Visual Identity: Icon & Accent Color */}
          <div className="p-2.5 bg-tile-subtle rounded-lg border border-tile-border space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                Айдентика ленты (Иконка & Цвет)
              </span>
            </div>

            {/* Quick Icon Selector */}
            <div className="space-y-1">
              <span className="text-[10px] text-text-muted block font-mono">
                {t.feedIconLabel}:
              </span>
              <div className="flex flex-wrap gap-1.5 items-center">
                {QUICK_ICONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setIcon(ic)}
                    className={`w-7 h-7 rounded flex items-center justify-center transition-all cursor-pointer ${
                      icon === ic
                        ? 'bg-primary/20 text-primary border border-primary/40 scale-105 shadow-xs'
                        : 'bg-control text-text-muted hover:text-text-main border border-tile-border'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">{ic}</span>
                  </button>
                ))}
                <input
                  type="text"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="Material Symbol"
                  className="w-28 bg-control border border-tile-border rounded px-2 py-1 text-text-main font-mono text-xs outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Accent Color Palette */}
            <div className="space-y-1 pt-0.5">
              <span className="text-[10px] text-text-muted block font-mono">
                {t.feedAccentColorLabel}:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-5.5 h-5.5 rounded-full transition-transform border cursor-pointer ${
                      color === c ? 'scale-125 border-primary shadow-xs' : 'border-tile-border hover:scale-110'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="#hex"
                  className="w-20 bg-control border border-tile-border rounded px-2 py-1 text-text-main font-mono text-xs outline-none focus:border-primary ml-1"
                />
              </div>
            </div>
          </div>

          {/* Folder Projections Configuration */}
          <div className="p-2.5 bg-tile-subtle rounded-lg border border-tile-border space-y-2">
            <div>
              <label className="block font-mono text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                {t.feedFolderPathsLabel}
              </label>
              <p className="text-[11px] text-text-muted mt-0.5">
                {t.feedFolderPathsHelp}
              </p>
            </div>

            {/* Selected Folder Chips */}
            {folderPaths.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 bg-control rounded border border-tile-border">
                {folderPaths.map((fp) => (
                  <span
                    key={fp}
                    className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-2 py-0.5 rounded text-[11px] font-mono font-medium border border-primary/20"
                  >
                    <span className="material-symbols-outlined text-[13px]">folder</span>
                    {fp}
                    <button
                      type="button"
                      onClick={() => handleRemoveFolder(fp)}
                      className="hover:text-error text-primary/70 transition-colors ml-0.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[12px]">close</span>
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Folder Checkboxes List with Quick Filter */}
            <div className="bg-control/50 rounded border border-tile-border p-2 space-y-1.5">
              <input
                type="text"
                value={folderFilterText}
                onChange={(e) => setFolderFilterText(e.target.value)}
                placeholder="Фильтр папок..."
                className="w-full bg-control border border-tile-border rounded px-2.5 py-1 text-text-main text-xs outline-none focus:border-primary transition-colors"
              />

              <div className="max-h-28 overflow-y-auto space-y-0.5 pr-1 custom-scrollbar">
                {filteredFolders.map((path) => {
                  const isChecked = folderPaths.includes(path);
                  const isFolderPrivate = folderPrivacyMap.get(path) === 'private';
                  return (
                    <label
                      key={path}
                      className={`flex items-center justify-between px-2 py-0.5 rounded cursor-pointer transition-colors text-xs font-mono select-none ${
                        isChecked
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'hover:bg-tile-subtle text-text-muted hover:text-text-main'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 truncate">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleFolder(path)}
                          className="rounded bg-control border-tile-border text-primary focus:ring-0 w-3.5 h-3.5"
                        />
                        <span className="material-symbols-outlined text-[14px]">
                          {isChecked ? 'folder_open' : 'folder'}
                        </span>
                        <span className="truncate">{path}</span>
                      </div>
                      {isFolderPrivate && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] text-purple-400 font-mono px-1 rounded bg-purple-500/10 border border-purple-500/20 shrink-0 ml-1.5">
                          <span className="material-symbols-outlined text-[10px]">lock</span>
                          private
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Warning if private folder selected in public feed */}
            {privacy === 'public' && hasPrivateFolderInPublicFeed && (
              <div className="p-2 rounded bg-error/10 border border-error/20 text-error text-[11px] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px] shrink-0">warning</span>
                <span>В публичной ленте разрешены только публичные папки. Переключите ленту в «Приватная» или снимите выбор с приватных папок.</span>
              </div>
            )}

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
                className="flex-1 bg-control border border-tile-border rounded px-2.5 py-1 text-text-main font-mono text-xs focus:border-primary outline-none transition-colors"
              />
              <button
                type="button"
                onClick={handleAddCustomPath}
                className="h-7 px-3 bg-tile-subtle hover:bg-tile-muted text-text-main rounded text-xs font-semibold border border-tile-border transition-colors cursor-pointer"
              >
                {t.addFolderBtn}
              </button>
            </div>
          </div>

          {/* Hashtags Filter Configuration (Smart View) */}
          <div className="p-2.5 bg-tile-subtle rounded-lg border border-tile-border space-y-2">
            <div>
              <label className="block font-mono text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                {t.feedHashtagsLabel}
              </label>
              <p className="text-[11px] text-text-muted mt-0.5">
                {t.feedHashtagsHelp}
              </p>
            </div>

            {/* Selected Hashtag Chips */}
            {hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 bg-control rounded border border-tile-border">
                {hashtags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 bg-tertiary/15 text-tertiary px-2 py-0.5 rounded text-[11px] font-mono font-medium border border-tertiary/25"
                  >
                    <span>#</span>
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-error text-tertiary/70 transition-colors ml-0.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[12px]">close</span>
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
                className="flex-1 bg-control border border-tile-border rounded px-2.5 py-1 text-text-main font-mono text-xs focus:border-primary outline-none transition-colors"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="h-7 px-3 bg-tile-subtle hover:bg-tile-muted text-text-main rounded text-xs font-semibold border border-tile-border transition-colors cursor-pointer"
              >
                + Тег
              </button>
            </div>

            {/* Suggestions from existing tags */}
            {existingHashtags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[10px] text-text-muted font-mono">Частые:</span>
                {existingHashtags.slice(0, 6).map((h) => {
                  const isChecked = hashtags.includes(h.name.toLowerCase());
                  if (isChecked) return null;
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => setHashtags((prev) => [...prev, h.name.toLowerCase()])}
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-control hover:bg-tile-muted text-text-muted hover:text-text-main border border-tile-border transition-colors cursor-pointer"
                    >
                      +{h.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-2.5 border-t border-tile-border flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-7 px-3 rounded text-xs text-text-muted hover:text-text-main cursor-pointer transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-7 px-4 bg-primary text-on-primary hover:bg-primary-fixed-dim rounded font-semibold text-xs shadow-xs transition-all cursor-pointer"
            >
              {editingFeed ? t.save : t.createFeedBtn}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
