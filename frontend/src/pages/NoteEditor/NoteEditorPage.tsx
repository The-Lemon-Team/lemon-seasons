import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { message, Popconfirm } from 'antd';
import {
  useNote,
  useFeeds,
  useTaxonomyFlat,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
} from '../../api/queries';
import { NoteType } from '../../types';
import { MarkdownEditor } from '../../components/MarkdownEditor';
import { NoteTypeBadge } from '../../components/NoteTypeBadge';

export const NoteEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();

  const { data: note, isLoading: isNoteLoading } = useNote(id || '');
  const { data: feeds = [] } = useFeeds();
  const { data: taxonomyNodes = [] } = useTaxonomyFlat();

  const createNoteMutation = useCreateNote();
  const updateNoteMutation = useUpdateNote();
  const deleteNoteMutation = useDeleteNote();

  // Form State
  const [title, setTitle] = useState('');
  const [feedId, setFeedId] = useState('');
  const [type, setType] = useState<NoteType>('SINGLE');
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 16),
  );
  const [endDate, setEndDate] = useState('');
  const [sourceLink, setSourceLink] = useState('');
  const [icon, setIcon] = useState('');
  const [selectedTagPaths, setSelectedTagPaths] = useState<string[]>([]);
  const [description, setDescription] = useState('');

  // Populate data when editing
  useEffect(() => {
    if (note && !isNew) {
      setTitle(note.title);
      setFeedId(note.feedId);
      setType(note.type);
      setStartDate(new Date(note.startDate).toISOString().slice(0, 16));
      setEndDate(note.endDate ? new Date(note.endDate).toISOString().slice(0, 16) : '');
      setSourceLink(note.sourceLink || '');
      setIcon(note.icon || '');
      setDescription(note.description || '');
      setSelectedTagPaths(note.tags?.map((t) => t.path) || []);
    } else if (isNew && feeds.length > 0 && !feedId) {
      setFeedId(feeds[0].id);
    }
  }, [note, isNew, feeds, feedId]);

  const handleTagToggle = (path: string) => {
    setSelectedTagPaths((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path],
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      message.error('Please enter a note title');
      return;
    }
    if (!feedId) {
      message.error('Please select a target feed');
      return;
    }

    try {
      if (isNew) {
        const created = await createNoteMutation.mutateAsync({
          feedId,
          title: title.trim(),
          type,
          startDate: new Date(startDate).toISOString(),
          endDate: endDate ? new Date(endDate).toISOString() : undefined,
          sourceLink: sourceLink.trim() || undefined,
          icon: icon.trim() || undefined,
          description: description.trim() || undefined,
          tagIds: selectedTagPaths,
        });
        message.success('Note created successfully!');
        navigate(`/notes/${created.id}`);
      } else {
        await updateNoteMutation.mutateAsync({
          id: id!,
          data: {
            feedId,
            title: title.trim(),
            type,
            startDate: new Date(startDate).toISOString(),
            endDate: endDate ? new Date(endDate).toISOString() : undefined,
            sourceLink: sourceLink.trim() || undefined,
            icon: icon.trim() || undefined,
            description: description.trim() || undefined,
            tagIds: selectedTagPaths,
          },
        });
        message.success('Note updated successfully!');
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to save note');
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteNoteMutation.mutateAsync(id);
      message.success('Note soft-deleted successfully');
      navigate('/notes');
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to delete note');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/notes')}
            className="p-1.5 rounded hover:bg-white/5 text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-sans font-bold text-2xl text-on-surface">
                {isNew ? 'Create New Note' : 'Edit Note'}
              </h1>
              {!isNew && <NoteTypeBadge type={type} />}
            </div>
            <p className="text-xs font-mono text-on-surface-variant">
              {isNew ? 'Single source of truth record' : `ID: ${id}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isNew && (
            <Popconfirm
              title="Soft-delete this note?"
              onConfirm={handleDelete}
              okText="Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <button
                type="button"
                className="px-3 py-1.5 border border-error/40 text-error hover:bg-error/10 rounded text-xs font-mono transition-colors"
              >
                Delete
              </button>
            </Popconfirm>
          )}
          <button
            onClick={handleSave}
            disabled={createNoteMutation.isPending || updateNoteMutation.isPending}
            className="px-5 py-2 bg-primary text-on-primary hover:bg-primary-fixed-dim rounded font-semibold text-sm transition-all shadow hover:shadow-lg disabled:opacity-50"
          >
            {createNoteMutation.isPending || updateNoteMutation.isPending
              ? 'Saving...'
              : 'Save Note'}
          </button>
        </div>
      </div>

      {/* Main Editor Grid */}
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Markdown & Content (Span 2) */}
        <div className="lg:col-span-2 space-y-5 bg-surface-container rounded-lg border border-white/5 p-5">
          {/* Note Title */}
          <div className="space-y-1.5">
            <label className="block font-mono text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
              Note Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Marvel Cinematic Universe Phase 5 Overview"
              className="w-full bg-surface-container-lowest border border-white/10 rounded px-3 py-2 text-on-surface font-sans text-base focus:border-primary outline-none"
            />
          </div>

          {/* Description (Raw Markdown Editor + Live Preview) */}
          <MarkdownEditor
            value={description}
            onChange={setDescription}
            placeholder="# Write note description in Markdown..."
            minHeight={320}
          />
        </div>

        {/* Right Column: Metadata & Chronological Details (Span 1) */}
        <div className="space-y-5 bg-surface-container rounded-lg border border-white/5 p-5">
          <h3 className="font-sans font-bold text-sm text-on-surface border-b border-white/5 pb-2">
            Metadata & Chronology
          </h3>

          {/* Target Feed */}
          <div className="space-y-1">
            <label className="block font-mono text-[11px] font-semibold text-on-surface-variant uppercase">
              Target Feed
            </label>
            <select
              value={feedId}
              onChange={(e) => setFeedId(e.target.value)}
              className="w-full bg-surface-container-lowest border border-white/10 rounded px-3 py-2 text-on-surface text-xs focus:border-primary outline-none"
            >
              {feeds.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.title} (/{f.slug})
                </option>
              ))}
            </select>
          </div>

          {/* Note Type */}
          <div className="space-y-1">
            <label className="block font-mono text-[11px] font-semibold text-on-surface-variant uppercase">
              Note Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as NoteType)}
              className="w-full bg-surface-container-lowest border border-white/10 rounded px-3 py-2 text-on-surface font-mono text-xs focus:border-primary outline-none"
            >
              <option value="SINGLE">SINGLE (One-off milestone or post)</option>
              <option value="PERIOD">PERIOD (Span with start and end)</option>
              <option value="EVENT">EVENT (Scheduled conference / meeting)</option>
              <option value="FILM_RELEASE">FILM_RELEASE (Media premiere)</option>
              <option value="MENTION">MENTION (Reference / citation)</option>
              <option value="DONE">DONE (Completed deliverable)</option>
            </select>
          </div>

          {/* Start Date */}
          <div className="space-y-1">
            <label className="block font-mono text-[11px] font-semibold text-on-surface-variant uppercase">
              Start Date & Time
            </label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-surface-container-lowest border border-white/10 rounded px-3 py-1.5 text-on-surface font-mono text-xs focus:border-primary outline-none [color-scheme:dark]"
            />
          </div>

          {/* End Date */}
          <div className="space-y-1">
            <label className="block font-mono text-[11px] font-semibold text-on-surface-variant uppercase">
              End Date & Time (Optional)
            </label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-surface-container-lowest border border-white/10 rounded px-3 py-1.5 text-on-surface font-mono text-xs focus:border-primary outline-none [color-scheme:dark]"
            />
          </div>

          {/* Source Link */}
          <div className="space-y-1">
            <label className="block font-mono text-[11px] font-semibold text-on-surface-variant uppercase">
              Source URL
            </label>
            <input
              type="url"
              value={sourceLink}
              onChange={(e) => setSourceLink(e.target.value)}
              placeholder="https://..."
              className="w-full bg-surface-container-lowest border border-white/10 rounded px-3 py-1.5 text-on-surface text-xs focus:border-primary outline-none"
            />
          </div>

          {/* Taxonomy Tags Selection */}
          <div className="space-y-1.5 pt-2 border-t border-white/5">
            <label className="block font-mono text-[11px] font-semibold text-on-surface-variant uppercase">
              Taxonomy Tags (Ltree)
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1 bg-surface-container-lowest rounded border border-white/5">
              {taxonomyNodes.map((node) => {
                const isSelected = selectedTagPaths.includes(node.path);
                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => handleTagToggle(node.path)}
                    className={`px-2 py-0.5 rounded-full font-mono text-[11px] border transition-all ${
                      isSelected
                        ? 'bg-primary/20 text-primary border-primary/40 font-semibold'
                        : 'bg-surface-container text-on-surface-variant border-white/5 hover:border-white/20'
                    }`}
                  >
                    {node.path}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
