import React, { useState } from 'react';
import { message, Modal } from 'antd';
import { useFeeds, useCreateNote } from '../api/queries';
import { NoteType, FolderInputItem } from '../types';
import { MarkdownEditor } from './MarkdownEditor';
import { NoteTypeSelect } from './NoteTypeSelect';
import { HashtagInput } from './HashtagInput';
import { FolderSelect } from './FolderSelect';
import { useAdminI18n } from '../i18n';
import { LemonLogo } from './LemonLogo';

interface QuickAddModalProps {
  open: boolean;
  onClose: () => void;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({ open, onClose }) => {
  const { t } = useAdminI18n();
  const { data: feeds = [] } = useFeeds();
  const createNoteMutation = useCreateNote();

  const [title, setTitle] = useState('');
  const [feedId, setFeedId] = useState('');
  const [type, setType] = useState<NoteType>('SINGLE');
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [endDate, setEndDate] = useState('');
  const [folders, setFolders] = useState<FolderInputItem[]>([]);
  const [taxonomyPath, setTaxonomyPath] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [description, setDescription] = useState('');

  // Auto-select first feed if none selected
  React.useEffect(() => {
    if (!feedId && feeds.length > 0) {
      setFeedId(feeds[0].id);
    }
  }, [feeds, feedId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      message.error(t.titleInputLabel);
      return;
    }
    if (!feedId) {
      message.error(t.selectFeedPlaceholder);
      return;
    }

    try {
      const tagIds = taxonomyPath.trim()
        ? taxonomyPath
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
        : [];

      await createNoteMutation.mutateAsync({
        feedId,
        title: title.trim(),
        type,
        startDate: new Date(startDate).toISOString(),
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        description: description.trim() || undefined,
        tagIds,
        hashtags,
        folders: folders.length > 0 ? folders : undefined,
      });

      message.success(t.quickAddNoteCreated);
      // Reset form
      setTitle('');
      setDescription('');
      setEndDate('');
      setTaxonomyPath('');
      setFolders([]);
      setHashtags([]);
      onClose();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error');
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={680}
      centered
      destroyOnClose
      styles={{
        content: {
          padding: 0,
          backgroundColor: '#292a2a',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0px 10px 30px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        },
      }}
    >
      <div className="flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-surface-container-highest/50">
          <div className="flex items-center gap-3">
            <LemonLogo size={28} />
            <h2 className="font-sans font-semibold text-lg text-on-surface">
              {t.quickAddModalTitle}
            </h2>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Feed & Type Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block font-mono text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                {t.feedInputLabel}
              </label>
              <select
                value={feedId}
                onChange={(e) => setFeedId(e.target.value)}
                className="w-full bg-surface-container-lowest border border-white/10 rounded px-3 py-2 text-on-surface font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              >
                {feeds.map((f) => (
                  <option key={f.id} value={f.id} className="bg-surface-container">
                    {f.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block font-mono text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                {t.typeInputLabel}
              </label>
              <NoteTypeSelect value={type} onChange={setType} />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1">
            <label className="block font-mono text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
              {t.titleInputLabel}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.titleInputPlaceholder}
              className="w-full bg-surface-container-lowest border border-white/10 rounded px-3 py-2 text-on-surface font-sans text-sm placeholder:text-outline/60 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          {/* Date Range & Taxonomy Path */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block font-mono text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                {t.datesCol}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="flex-1 bg-surface-container-lowest border border-white/10 rounded px-2.5 py-1.5 text-on-surface font-mono text-xs focus:border-primary outline-none [color-scheme:dark]"
                />
                <span className="text-on-surface-variant">-</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder={t.endDateLabel}
                  className="flex-1 bg-surface-container-lowest border border-white/10 rounded px-2.5 py-1.5 text-on-surface font-mono text-xs focus:border-primary outline-none [color-scheme:dark]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block font-mono text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                {t.taxonomy}
              </label>
              <input
                type="text"
                value={taxonomyPath}
                onChange={(e) => setTaxonomyPath(e.target.value)}
                placeholder="e.g. movies.marvel.avengers"
                className="w-full bg-surface-container-lowest border border-white/10 rounded px-3 py-1.5 text-on-surface font-mono text-xs placeholder:text-outline/60 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>

          {/* Obsidian Vault Folders */}
          <div className="space-y-1">
            <label className="block font-mono text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
              {t.folderInputLabel}
            </label>
            <FolderSelect
              value={folders}
              onChange={setFolders}
              placeholder={t.selectFolderPlaceholder}
            />
          </div>

          {/* Hashtags / Global Mentions */}
          <HashtagInput
            value={hashtags}
            onChange={setHashtags}
            placeholder={t.hashtagsPlaceholder}
          />

          {/* Markdown Description */}
          <MarkdownEditor
            value={description}
            onChange={setDescription}
            placeholder="# Markdown..."
            minHeight={120}
          />

          {/* Footer Actions */}
          <div className="pt-3 border-t border-white/5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded text-sm text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-colors font-medium cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={createNoteMutation.isPending}
              className="px-5 py-2 rounded text-sm font-semibold bg-primary text-on-primary hover:bg-primary-fixed-dim transition-all shadow hover:shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {createNoteMutation.isPending ? t.loading : t.save}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

