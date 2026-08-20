import React, { useState } from 'react';
import { message, Modal } from 'antd';
import { useFeeds, useTaxonomyTree, useCreateNote } from '../api/queries';
import { NoteType } from '../types';
import { MarkdownEditor } from './MarkdownEditor';

interface QuickAddModalProps {
  open: boolean;
  onClose: () => void;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({ open, onClose }) => {
  const { data: feeds = [] } = useFeeds();
  const { data: taxonomyTree = [] } = useTaxonomyTree();
  const createNoteMutation = useCreateNote();

  const [title, setTitle] = useState('');
  const [feedId, setFeedId] = useState('');
  const [type, setType] = useState<NoteType>('SINGLE');
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [endDate, setEndDate] = useState('');
  const [taxonomyPath, setTaxonomyPath] = useState('');
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
      message.error('Please enter a note title');
      return;
    }
    if (!feedId) {
      message.error('Please select a feed');
      return;
    }

    try {
      const tagIds = taxonomyPath.trim()
        ? taxonomyPath
            .split(',')
            .map((t) => t.trim())
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
      });

      message.success('Note added successfully!');
      // Reset form
      setTitle('');
      setDescription('');
      setEndDate('');
      setTaxonomyPath('');
      onClose();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to create note');
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
            <img
              alt="Lemon Seasons Logo"
              className="w-7 h-7 object-contain rounded-full border border-white/10"
              src="/logo.png"
            />
            <h2 className="font-sans font-semibold text-lg text-on-surface">
              Quick Add Note
            </h2>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Feed & Type Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block font-mono text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                Target Feed
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
                Note Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as NoteType)}
                className="w-full bg-surface-container-lowest border border-white/10 rounded px-3 py-2 text-on-surface font-mono text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="SINGLE" className="bg-surface-container">SINGLE</option>
                <option value="PERIOD" className="bg-surface-container">PERIOD</option>
                <option value="EVENT" className="bg-surface-container">EVENT</option>
                <option value="FILM_RELEASE" className="bg-surface-container">FILM_RELEASE</option>
                <option value="MENTION" className="bg-surface-container">MENTION</option>
                <option value="DONE" className="bg-surface-container">DONE</option>
              </select>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1">
            <label className="block font-mono text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter note title..."
              className="w-full bg-surface-container-lowest border border-white/10 rounded px-3 py-2 text-on-surface font-sans text-sm placeholder:text-outline/60 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          {/* Date Range & Taxonomy Path */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block font-mono text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                Dates (Start - End)
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
                  placeholder="Optional end"
                  className="flex-1 bg-surface-container-lowest border border-white/10 rounded px-2.5 py-1.5 text-on-surface font-mono text-xs focus:border-primary outline-none [color-scheme:dark]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block font-mono text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                Taxonomy Path (Ltree)
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

          {/* Markdown Description */}
          <MarkdownEditor
            value={description}
            onChange={setDescription}
            placeholder="# Write note description in Markdown..."
            minHeight={130}
          />

          {/* Footer Actions */}
          <div className="pt-3 border-t border-white/5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded text-sm text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createNoteMutation.isPending}
              className="px-5 py-2 rounded text-sm font-semibold bg-primary text-on-primary hover:bg-primary-fixed-dim transition-all shadow hover:shadow-lg disabled:opacity-50"
            >
              {createNoteMutation.isPending ? 'Saving...' : 'Save Note'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
