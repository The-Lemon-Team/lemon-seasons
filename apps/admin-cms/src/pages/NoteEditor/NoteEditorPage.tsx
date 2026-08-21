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
import { notesApi } from '../../api/client';
import { NoteType, CreateNoteLinkInput, FolderInputItem } from '../../types';
import { MarkdownEditor } from '../../components/MarkdownEditor';
import { NoteTypeBadge } from '../../components/NoteTypeBadge';
import { NoteTypeSelect } from '../../components/NoteTypeSelect';
import { ImageManager } from '../../components/ImageManager';
import { LinkManager } from '../../components/LinkManager';
import { HashtagInput } from '../../components/HashtagInput';
import { FolderSelect } from '../../components/FolderSelect';

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
  const [icon, setIcon] = useState('');
  const [assignedFolders, setAssignedFolders] = useState<FolderInputItem[]>([]);
  const [selectedTagPaths, setSelectedTagPaths] = useState<string[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [description, setDescription] = useState('');

  // Pending images & links for new note
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingMainIndex, setPendingMainIndex] = useState(0);
  const [pendingLinks, setPendingLinks] = useState<CreateNoteLinkInput[]>([]);
  const [pendingSourceIndex, setPendingSourceIndex] = useState(0);

  // Populate data when editing
  useEffect(() => {
    if (note && !isNew) {
      setTitle(note.title);
      setFeedId(note.feedId);
      setType(note.type);
      setStartDate(new Date(note.startDate).toISOString().slice(0, 16));
      setEndDate(note.endDate ? new Date(note.endDate).toISOString().slice(0, 16) : '');
      setIcon(note.icon || '');
      setDescription(note.description || '');
      setSelectedTagPaths(note.tags?.map((t) => t.path) || []);
      setHashtags(note.hashtags?.map((h) => h.name) || []);
      setAssignedFolders(
        note.folders?.map((nf, idx) => ({
          path: nf.folder?.path || '',
          isPrimary: nf.isPrimary ?? idx === 0,
          order: nf.order ?? idx,
        })).filter((item) => Boolean(item.path)) || [],
      );
    } else if (isNew && feeds.length > 0 && !feedId) {
      setFeedId(feeds[0].id);
    }
  }, [note, isNew, feeds, feedId]);

  const filteredTaxonomyNodes = taxonomyNodes.filter((node) => {
    const query = tagSearchQuery.trim().toLowerCase();
    if (!query) return true;
    const matchPath = node.path.toLowerCase().includes(query);
    const matchName = node.name && node.name.toLowerCase().includes(query);
    return matchPath || matchName;
  });

  const handleTagToggle = (path: string) => {
    setSelectedTagPaths((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path],
    );
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
          icon: icon.trim() || undefined,
          description: description.trim() || undefined,
          tagIds: selectedTagPaths,
          hashtags,
          folders: assignedFolders,
          links:
            pendingLinks.length > 0
              ? pendingLinks.map((l, i) => ({
                  ...l,
                  isSource: i === pendingSourceIndex,
                }))
              : undefined,
        });

        // Upload any pending photos that were selected before creating the note
        if (pendingFiles.length > 0) {
          try {
            const uploadedImages = await notesApi.uploadImages(created.id, pendingFiles);
            if (
              pendingMainIndex > 0 &&
              pendingMainIndex < uploadedImages.length
            ) {
              await notesApi.setMainImage(created.id, uploadedImages[pendingMainIndex].id);
            }
          } catch (uploadErr) {
            console.error('Failed to upload pending photos', uploadErr);
          }
        }

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
            icon: icon.trim() || undefined,
            description: description.trim() || undefined,
            tagIds: selectedTagPaths,
            hashtags,
            folders: assignedFolders,
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

  const handleInsertMarkdownSnippet = (snippet: string) => {
    setDescription((prev) => (prev ? `${prev}\n\n${snippet}` : snippet));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/notes')}
            className="p-1.5 rounded hover:bg-white/5 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
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
                className="px-3 py-1.5 border border-error/40 text-error hover:bg-error/10 rounded text-xs font-mono transition-colors cursor-pointer"
              >
                Delete
              </button>
            </Popconfirm>
          )}
          <button
            onClick={handleSave}
            disabled={createNoteMutation.isPending || updateNoteMutation.isPending}
            className="px-5 py-2 bg-primary text-on-primary hover:bg-primary-fixed-dim rounded font-semibold text-sm transition-all shadow hover:shadow-lg disabled:opacity-50 cursor-pointer"
          >
            {createNoteMutation.isPending || updateNoteMutation.isPending
              ? 'Saving...'
              : 'Save Note'}
          </button>
        </div>
      </div>

      {/* Main Editor Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Title, Markdown Content, Links & Image Gallery (Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Content Box */}
          <div className="space-y-5 bg-surface-container rounded-lg border border-white/5 p-5">
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
            <div className="space-y-1.5">
              <label className="block font-mono text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                Note Content (Markdown)
              </label>
              <MarkdownEditor
                value={description}
                onChange={setDescription}
                placeholder="# Write note description in Markdown..."
                minHeight={280}
              />
            </div>
          </div>

          {/* Image Manager Section */}
          <div className="bg-surface-container rounded-lg border border-white/5 p-5">
            <ImageManager
              noteId={id}
              images={note?.images || []}
              pendingFiles={pendingFiles}
              pendingMainIndex={pendingMainIndex}
              onPendingFilesChange={(files, mainIdx) => {
                setPendingFiles(files);
                setPendingMainIndex(mainIdx);
              }}
              onInsertMarkdown={handleInsertMarkdownSnippet}
            />
          </div>
        </div>

        {/* Right Column: Metadata & Chronological Details (Span 1) */}
        <div className="space-y-5 bg-surface-container rounded-lg border border-white/5 p-5 h-fit">
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
            <NoteTypeSelect value={type} onChange={setType} />
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

          {/* Vault Folders Section (Obsidian Physical Multi-Folder Location) */}
          <div className="pt-2 border-t border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block font-mono text-[11px] font-semibold text-on-surface-variant uppercase">
                Vault Folders (Obsidian)
              </label>
              <span className="text-[10px] font-mono text-primary/80">
                multi-folder sync
              </span>
            </div>
            <FolderSelect
              value={assignedFolders}
              onChange={setAssignedFolders}
              placeholder="Assign folder (e.g. News/Tech)..."
            />
            <p className="text-[10px] font-mono text-on-surface-variant/60 leading-tight">
              Primary folder holds canonical note. Secondary folders hold linked references with sub-id.
            </p>
          </div>

          {/* Links & Sources Manager */}
          <LinkManager
            noteId={id}
            links={note?.links || []}
            pendingLinks={pendingLinks}
            pendingSourceIndex={pendingSourceIndex}
            onPendingLinksChange={(links, sourceIdx) => {
              setPendingLinks(links);
              setPendingSourceIndex(sourceIdx);
            }}
            onInsertMarkdown={handleInsertMarkdownSnippet}
          />

          {/* Hashtags / Global Mentions */}
          <div className="pt-2 border-t border-white/5">
            <HashtagInput
              value={hashtags}
              onChange={setHashtags}
              placeholder="e.g. keynote, ai, launch2026..."
            />
          </div>

          {/* Taxonomy Tags Selection */}
          <div className="space-y-2 pt-2 border-t border-white/5">
            <div className="flex items-center justify-between">
              <label className="block font-mono text-[11px] font-semibold text-on-surface-variant uppercase">
                Taxonomy Tags (Ltree)
              </label>
              {selectedTagPaths.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                    {selectedTagPaths.length} selected
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedTagPaths([])}
                    className="text-[10px] font-mono text-error/80 hover:text-error transition-colors underline cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Tag Search Input */}
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-2.5 text-on-surface-variant/60 text-[16px] pointer-events-none select-none">
                search
              </span>
              <input
                type="text"
                value={tagSearchQuery}
                onChange={(e) => setTagSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (filteredTaxonomyNodes.length === 1) {
                      handleTagToggle(filteredTaxonomyNodes[0].path);
                    }
                  }
                }}
                placeholder="Search tags by name or path..."
                className="w-full bg-surface-container-lowest border border-white/10 rounded pl-8 pr-7 py-1.5 text-on-surface font-mono text-xs placeholder:text-on-surface-variant/40 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              />
              {tagSearchQuery && (
                <button
                  type="button"
                  onClick={() => setTagSearchQuery('')}
                  className="absolute right-2 text-on-surface-variant/60 hover:text-on-surface transition-colors p-0.5 flex items-center justify-center rounded cursor-pointer"
                  title="Clear search"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              )}
            </div>

            {/* Selected Tags Tray (Visible when tags are selected) */}
            {selectedTagPaths.length > 0 && (
              <div className="space-y-1 p-2 bg-surface-container-lowest/70 border border-primary/20 rounded">
                <div className="text-[10px] font-mono uppercase tracking-wider text-primary/80">
                  Active Selected ({selectedTagPaths.length})
                </div>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {selectedTagPaths.map((path) => {
                    const tagNode = taxonomyNodes.find((n) => n.path === path);
                    return (
                      <span
                        key={path}
                        className="inline-flex items-center gap-1 pl-1.5 pr-1 py-0.5 rounded-full font-mono text-[11px] bg-primary/20 text-primary border border-primary/40 font-semibold"
                      >
                        <span className="material-symbols-outlined text-[13px] text-primary">
                          {tagNode?.icon || 'label'}
                        </span>
                        <span className="truncate max-w-[180px]" title={path}>
                          {path}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleTagToggle(path)}
                          className="p-0.5 hover:bg-primary/30 rounded-full text-primary hover:text-error transition-colors flex items-center justify-center cursor-pointer"
                          title={`Remove tag ${path}`}
                        >
                          <span className="material-symbols-outlined text-[12px] leading-none">
                            close
                          </span>
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Filtered Available Tags List */}
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1.5 bg-surface-container-lowest rounded border border-white/5">
              {filteredTaxonomyNodes.length > 0 ? (
                filteredTaxonomyNodes.map((node) => {
                  const isSelected = selectedTagPaths.includes(node.path);
                  const hasDifferentName =
                    node.name && node.name.toLowerCase() !== node.path.toLowerCase();
                  return (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => handleTagToggle(node.path)}
                      title={hasDifferentName ? `${node.name} (${node.path})` : node.path}
                      className={`group px-2 py-0.5 rounded-full font-mono text-[11px] border transition-all flex items-center gap-1.5 text-left cursor-pointer ${
                        isSelected
                          ? 'bg-primary/20 text-primary border-primary/40 font-semibold shadow-sm'
                          : 'bg-surface-container text-on-surface-variant border-white/5 hover:border-white/20 hover:text-on-surface hover:bg-surface-container-high'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[13px] leading-none text-primary/80 group-hover:text-primary">
                        {node.icon || 'label'}
                      </span>
                      <span>{node.path}</span>
                      {hasDifferentName && (
                        <span className="text-[10px] text-on-surface-variant/60 group-hover:text-on-surface-variant font-sans">
                          ({node.name})
                        </span>
                      )}
                      {isSelected && (
                        <span className="material-symbols-outlined text-[12px] leading-none text-primary ml-0.5">
                          check
                        </span>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="w-full py-4 text-center text-xs text-on-surface-variant font-mono">
                  {taxonomyNodes.length === 0 ? (
                    <p>No taxonomy tags configured.</p>
                  ) : (
                    <div className="space-y-1.5">
                      <p>No tags matching &ldquo;{tagSearchQuery}&rdquo;</p>
                      <button
                        type="button"
                        onClick={() => setTagSearchQuery('')}
                        className="text-primary hover:underline text-[11px] font-mono cursor-pointer"
                      >
                        Clear search filter
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
