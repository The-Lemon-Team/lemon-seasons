import React, { useState, useEffect, useMemo } from 'react';
import { Stream, CreateStreamPayload, UpdateStreamPayload, Feed, StreamPrivacy } from '@lenta/shared';
import { X, Save, Sparkles, Hash, Folder, Lock, Globe, Search, Check } from 'lucide-react';

export interface StreamEditorModalProps {
  stream?: Stream | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: CreateStreamPayload | UpdateStreamPayload) => Promise<void>;
  allFeeds: Feed[];
}

const PRESET_EMOJIS = ['🌐', '💻', '🍋', '🍿', '🎉', '✈️', '🔮', '🔒', '📈', '🔬', '🎮', '⚡', '🧠', '🎧', '🚀', '🤖'];
const PRESET_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#14b8a6'];

const CYRILLIC_MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh',
  з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya'
};

function slugifyStreamTitle(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .split('')
    .map((char) => CYRILLIC_MAP[char] || char)
    .join('')
    .replace(/[^a-z0-9_\s-]/g, '')
    .replace(/[\s_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export const StreamEditorModal: React.FC<StreamEditorModalProps> = ({
  stream,
  isOpen,
  onClose,
  onSave,
  allFeeds = [],
}) => {
  const isEditing = Boolean(stream);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('📁');
  const [color, setColor] = useState('#6366f1');
  const [badge, setBadge] = useState('');
  const [privacy, setPrivacy] = useState<StreamPrivacy>('public');
  const [order, setOrder] = useState<number>(0);
  const [selectedFeedIds, setSelectedFeedIds] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [folderPathsInput, setFolderPathsInput] = useState('');
  const [feedSearchQuery, setFeedSearchQuery] = useState('');
  const [feedCategoryFilter, setFeedCategoryFilter] = useState<'all' | 'tech' | 'media' | 'holidays' | 'private'>('all');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync state on open
  useEffect(() => {
    if (isOpen) {
      if (stream) {
        setTitle(stream.title || '');
        setSlug(stream.slug || '');
        setDescription(stream.description || '');
        setIcon(stream.icon || '📁');
        setColor(stream.color || '#6366f1');
        setBadge(stream.badge || '');
        setPrivacy(stream.privacy || 'public');
        setOrder(stream.order ?? 0);
        setSelectedFeedIds(stream.feedIds || []);
        setTags(stream.tags || []);
        setFolderPathsInput((stream.folderPaths || []).join(', '));
      } else {
        setTitle('');
        setSlug('');
        setDescription('');
        setIcon('✨');
        setColor('#6366f1');
        setBadge('');
        setPrivacy('public');
        setOrder(10);
        setSelectedFeedIds([]);
        setTags([]);
        setFolderPathsInput('');
      }
      setTagInput('');
      setFeedSearchQuery('');
      setFeedCategoryFilter('all');
      setErrorMsg(null);
    }
  }, [isOpen, stream]);

  // Keyboard Escape Handler (Rule 7)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!isEditing && !slug) {
      // Auto-slugify
      setSlug(slugifyStreamTitle(val));
    }
  };

  const handleToggleFeed = (feedId: string) => {
    setSelectedFeedIds((prev) =>
      prev.includes(feedId) ? prev.filter((id) => id !== feedId) : [...prev, feedId]
    );
  };

  const handleAddTag = () => {
    const clean = tagInput.trim().replace(/^#/, '');
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Filtered feeds list for selection
  const filteredFeeds = useMemo(() => {
    return allFeeds.filter((feed) => {
      if (feedCategoryFilter === 'private' && feed.privacy !== 'private') return false;
      if (feedCategoryFilter === 'tech' && !['it', 'dev', 'code', 'js', 'react'].some((k) => feed.slug.includes(k) || feed.title.toLowerCase().includes(k))) return false;
      if (feedCategoryFilter === 'media' && !['film', 'movie', 'music', 'game', 'ent'].some((k) => feed.slug.includes(k) || feed.title.toLowerCase().includes(k))) return false;
      if (feedCategoryFilter === 'holidays' && !['holiday', 'season', 'calendar'].some((k) => feed.slug.includes(k) || feed.title.toLowerCase().includes(k))) return false;

      if (!feedSearchQuery.trim()) return true;
      const q = feedSearchQuery.toLowerCase().trim();
      return (
        feed.title.toLowerCase().includes(q) ||
        feed.slug.toLowerCase().includes(q) ||
        feed.description?.toLowerCase().includes(q)
      );
    });
  }, [allFeeds, feedCategoryFilter, feedSearchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Укажите название стрима');
      return;
    }
    if (!slug.trim()) {
      setErrorMsg('Укажите уникальный слаг');
      return;
    }

    const folderPaths = folderPathsInput
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    const payload: CreateStreamPayload = {
      title: title.trim(),
      slug: slug.trim(),
      description: description.trim() || undefined,
      icon,
      color,
      badge: badge.trim() || undefined,
      privacy,
      order: Number(order) || 0,
      feedIds: selectedFeedIds,
      tags,
      folderPaths,
    };

    try {
      setIsSaving(true);
      setErrorMsg(null);
      await onSave(payload);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Ошибка сохранения стрима');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-platform border border-tile-border rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-tile-border bg-tile-subtle">
          <div className="flex items-center gap-2">
            <span className="text-xl">{icon}</span>
            <div>
              <h2 className="text-sm font-bold text-on-surface">
                {isEditing ? `Редактирование: ${stream?.title}` : 'Новый сквозной стрим'}
              </h2>
              <p className="text-[11px] text-text-muted">
                Настройте агрегацию фидов, фильтры тегов и видимость стрима
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-text-muted hover:text-on-surface hover:bg-tile transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
          {errorMsg && (
            <div className="p-2.5 bg-error/10 border border-error/20 rounded-lg text-xs text-error">
              {errorMsg}
            </div>
          )}

          {/* Title & Slug */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Название стрима *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="напр. IT & Dev"
                required
                className="w-full h-8 px-2.5 bg-control border border-control-border rounded-lg text-xs text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Слаг (ID) *
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="it_dev"
                disabled={isEditing && stream?.isBuiltin}
                required
                className="w-full h-8 px-2.5 font-mono bg-control border border-control-border rounded-lg text-xs text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">
              Описание
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Краткое описание назначения стрима..."
              rows={2}
              className="w-full p-2 bg-control border border-control-border rounded-lg text-xs text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 resize-none"
            />
          </div>

          {/* Icon, Color, Badge & Privacy */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Icon & Color */}
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Иконка и цвет
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  className="w-10 h-8 text-center text-sm bg-control border border-control-border rounded-lg"
                  title="Эмодзи"
                />
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                  title="Акцентный цвет"
                />
                <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar">
                  {PRESET_EMOJIS.slice(0, 5).map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setIcon(e)}
                      className="text-xs p-1 hover:bg-tile rounded cursor-pointer"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Badge & Order */}
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Бейдж и сортировка
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  placeholder="NEW / DEV"
                  maxLength={6}
                  className="w-20 h-8 px-2 font-mono text-center text-xs uppercase bg-control border border-control-border rounded-lg text-on-surface"
                />
                <input
                  type="number"
                  value={order}
                  onChange={(e) => setOrder(Number(e.target.value))}
                  placeholder="0"
                  className="w-16 h-8 px-2 font-mono text-center text-xs bg-control border border-control-border rounded-lg text-on-surface"
                  title="Порядок сортировки"
                />
              </div>
            </div>

            {/* Privacy */}
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Приватность
              </label>
              <div className="flex items-center gap-1.5 h-8">
                <button
                  type="button"
                  onClick={() => setPrivacy('public')}
                  className={`flex-1 h-full rounded-lg text-xs font-mono font-medium flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                    privacy === 'public'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-control text-text-muted hover:text-on-surface border border-control-border'
                  }`}
                >
                  <Globe className="w-3 h-3" />
                  <span>Public</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrivacy('private')}
                  className={`flex-1 h-full rounded-lg text-xs font-mono font-medium flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                    privacy === 'private'
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      : 'bg-control text-text-muted hover:text-on-surface border border-control-border'
                  }`}
                >
                  <Lock className="w-3 h-3" />
                  <span>Private</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bound Feeds Selector */}
          <div className="space-y-2 pt-2 border-t border-tile-border">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                <span>Источники (Feeds)</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-primary/10 text-primary">
                  {selectedFeedIds.length} выбрано
                </span>
              </label>
              <div className="flex items-center gap-1">
                {(['all', 'tech', 'media', 'holidays', 'private'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFeedCategoryFilter(cat)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                      feedCategoryFilter === cat
                        ? 'bg-primary/20 text-primary border border-primary/30 font-bold'
                        : 'text-text-muted hover:text-on-surface'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Feeds */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              <input
                type="text"
                value={feedSearchQuery}
                onChange={(e) => setFeedSearchQuery(e.target.value)}
                placeholder="Поиск ленты по названию или слагу..."
                className="w-full h-7 pl-8 pr-3 bg-control border border-control-border rounded-lg text-xs text-on-surface outline-none focus:border-primary"
              />
            </div>

            {/* Feeds Grid */}
            <div className="max-h-36 overflow-y-auto custom-scrollbar p-1.5 bg-control/50 rounded-lg border border-control-border grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {filteredFeeds.map((feed) => {
                const isSelected = selectedFeedIds.includes(feed.id) || selectedFeedIds.includes(feed.slug);
                return (
                  <button
                    key={feed.id}
                    type="button"
                    onClick={() => handleToggleFeed(feed.id)}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-left text-xs transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-primary/15 border-primary/40 text-on-surface font-medium'
                        : 'bg-tile border-tile-border/50 text-text-muted hover:text-on-surface hover:bg-tile-subtle'
                    }`}
                  >
                    <span className="text-sm shrink-0">{feed.icon || '📁'}</span>
                    <span className="truncate flex-1 text-[11px]">{feed.title}</span>
                    {isSelected && <Check className="w-3 h-3 text-primary shrink-0" />}
                  </button>
                );
              })}
              {filteredFeeds.length === 0 && (
                <div className="col-span-full py-3 text-center text-xs text-text-muted">
                  Ленты не найдены
                </div>
              )}
            </div>
          </div>

          {/* Tags & Folders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-tile-border">
            {/* Tags */}
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Хэштеги (фильтрация)
              </label>
              <div className="flex gap-1.5 mb-1.5">
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
                  placeholder="напр. react, interview"
                  className="flex-1 h-7 px-2 font-mono text-xs bg-control border border-control-border rounded-lg text-on-surface outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-2.5 h-7 bg-control border border-control-border hover:border-primary rounded-lg text-xs font-medium cursor-pointer"
                >
                  +
                </button>
              </div>
              <div className="flex flex-wrap gap-1 min-h-[24px]">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  >
                    <span>#{t}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="hover:text-error cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Folder Paths */}
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Пути к папкам (через запятую)
              </label>
              <input
                type="text"
                value={folderPathsInput}
                onChange={(e) => setFolderPathsInput(e.target.value)}
                placeholder="20. Tech/JS, 50. Entertainment"
                className="w-full h-7 px-2 font-mono text-xs bg-control border border-control-border rounded-lg text-on-surface outline-none focus:border-primary"
              />
              <p className="text-[10px] text-text-muted mt-1">
                Заметки из этих папок будут автоматически включены в стрим
              </p>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-tile-border bg-tile-subtle">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs text-text-muted hover:text-on-surface hover:bg-tile transition-colors cursor-pointer"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary-fixed-dim transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Сохранение...' : 'Сохранить'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
