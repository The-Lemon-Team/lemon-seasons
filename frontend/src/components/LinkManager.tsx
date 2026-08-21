import React, { useState } from 'react';
import { message, Popconfirm, Tooltip, Spin, Modal, Input } from 'antd';
import { NoteLink, CreateNoteLinkInput } from '../types';
import {
  useAddNoteLinks,
  useSetSourceNoteLink,
  useReorderNoteLinks,
  useUpdateNoteLink,
  useDeleteNoteLink,
} from '../api/queries';

interface LinkManagerProps {
  noteId?: string;
  links?: NoteLink[];
  pendingLinks?: CreateNoteLinkInput[];
  pendingSourceIndex?: number;
  onPendingLinksChange?: (links: CreateNoteLinkInput[], sourceIndex: number) => void;
  onInsertMarkdown?: (markdownSnippet: string) => void;
  readOnly?: boolean;
}

export const LinkManager: React.FC<LinkManagerProps> = ({
  noteId,
  links = [],
  pendingLinks = [],
  pendingSourceIndex = 0,
  onPendingLinksChange,
  onInsertMarkdown,
  readOnly = false,
}) => {
  const isExistingNote = Boolean(noteId && noteId !== 'new');

  // New link form state
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Edit modal state
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editingPendingIndex, setEditingPendingIndex] = useState<number | null>(null);
  const [editUrl, setEditUrl] = useState('');
  const [editTitle, setEditTitle] = useState('');

  const addLinksMutation = useAddNoteLinks();
  const setSourceMutation = useSetSourceNoteLink();
  const reorderMutation = useReorderNoteLinks();
  const updateMutation = useUpdateNoteLink();
  const deleteMutation = useDeleteNoteLink();

  const isMutating =
    addLinksMutation.isPending ||
    setSourceMutation.isPending ||
    reorderMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  const extractDomain = (url: string) => {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      return parsed.hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  };

  const handleAddLink = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedUrl = newUrl.trim();
    if (!trimmedUrl) {
      message.warning('Please enter a valid URL');
      return;
    }

    const formattedUrl = trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')
      ? trimmedUrl
      : `https://${trimmedUrl}`;

    const titleToUse = newTitle.trim() || extractDomain(formattedUrl);

    if (isExistingNote && noteId) {
      try {
        await addLinksMutation.mutateAsync({
          id: noteId,
          links: [
            {
              url: formattedUrl,
              title: titleToUse,
              isSource: links.length === 0,
            },
          ],
        });
        message.success('Link added successfully');
        setNewUrl('');
        setNewTitle('');
        setIsAdding(false);
      } catch (err: any) {
        message.error(err.response?.data?.message || 'Failed to add link');
      }
    } else if (onPendingLinksChange) {
      const isSource = pendingLinks.length === 0;
      const updated = [
        ...pendingLinks,
        {
          url: formattedUrl,
          title: titleToUse,
          isSource,
        },
      ];
      onPendingLinksChange(updated, isSource ? 0 : pendingSourceIndex);
      setNewUrl('');
      setNewTitle('');
      setIsAdding(false);
      message.success('Link added to list');
    }
  };

  // Set Primary Source
  const handleSetSource = async (link: NoteLink) => {
    if (!isExistingNote || !noteId) return;
    try {
      await setSourceMutation.mutateAsync({ noteId, linkId: link.id });
      message.success('Primary source updated');
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to update source link');
    }
  };

  const handleSetPendingSource = (index: number) => {
    if (onPendingLinksChange) {
      const updated = pendingLinks.map((l, i) => ({
        ...l,
        isSource: i === index,
      }));
      onPendingLinksChange(updated, index);
      message.success('Primary source updated');
    }
  };

  // Reorder
  const handleMove = async (currentIndex: number, targetIndex: number) => {
    if (targetIndex < 0) return;

    if (isExistingNote && noteId) {
      if (targetIndex >= links.length) return;
      const reordered = [...links];
      const [moved] = reordered.splice(currentIndex, 1);
      reordered.splice(targetIndex, 0, moved);

      const items = reordered.map((item, idx) => ({ id: item.id, order: idx }));
      try {
        await reorderMutation.mutateAsync({ noteId, items });
      } catch (err: any) {
        message.error(err.response?.data?.message || 'Failed to reorder links');
      }
    } else if (onPendingLinksChange) {
      if (targetIndex >= pendingLinks.length) return;
      const reordered = [...pendingLinks];
      const [moved] = reordered.splice(currentIndex, 1);
      reordered.splice(targetIndex, 0, moved);

      let newSourceIdx = pendingSourceIndex;
      if (currentIndex === pendingSourceIndex) {
        newSourceIdx = targetIndex;
      } else if (currentIndex < pendingSourceIndex && targetIndex >= pendingSourceIndex) {
        newSourceIdx -= 1;
      } else if (currentIndex > pendingSourceIndex && targetIndex <= pendingSourceIndex) {
        newSourceIdx += 1;
      }

      onPendingLinksChange(reordered, newSourceIdx);
    }
  };

  // Delete
  const handleDelete = async (linkId: string) => {
    if (!isExistingNote || !noteId) return;
    try {
      await deleteMutation.mutateAsync({ noteId, linkId });
      message.success('Link removed');
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to delete link');
    }
  };

  const handleDeletePending = (index: number) => {
    if (onPendingLinksChange) {
      const updated = pendingLinks.filter((_, i) => i !== index);
      let newSourceIndex = pendingSourceIndex;
      if (index === pendingSourceIndex) {
        newSourceIndex = 0;
        if (updated.length > 0) {
          updated[0].isSource = true;
        }
      } else if (index < pendingSourceIndex) {
        newSourceIndex = Math.max(0, pendingSourceIndex - 1);
      }
      onPendingLinksChange(updated, newSourceIndex);
      message.success('Link removed');
    }
  };

  // Start Edit
  const handleStartEdit = (link: NoteLink) => {
    setEditingLinkId(link.id);
    setEditUrl(link.url);
    setEditTitle(link.title || '');
  };

  const handleStartEditPending = (index: number) => {
    const p = pendingLinks[index];
    setEditingPendingIndex(index);
    setEditUrl(p.url);
    setEditTitle(p.title || '');
  };

  const handleSaveEdit = async () => {
    const trimmedUrl = editUrl.trim();
    if (!trimmedUrl) {
      message.warning('URL cannot be empty');
      return;
    }
    const formattedUrl = trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')
      ? trimmedUrl
      : `https://${trimmedUrl}`;

    if (isExistingNote && noteId && editingLinkId) {
      try {
        await updateMutation.mutateAsync({
          noteId,
          linkId: editingLinkId,
          data: {
            url: formattedUrl,
            title: editTitle.trim() || undefined,
          },
        });
        message.success('Link updated successfully');
        setEditingLinkId(null);
      } catch (err: any) {
        message.error(err.response?.data?.message || 'Failed to update link');
      }
    } else if (onPendingLinksChange && editingPendingIndex !== null) {
      const updated = [...pendingLinks];
      updated[editingPendingIndex] = {
        ...updated[editingPendingIndex],
        url: formattedUrl,
        title: editTitle.trim() || extractDomain(formattedUrl),
      };
      onPendingLinksChange(updated, pendingSourceIndex);
      setEditingPendingIndex(null);
      message.success('Link updated');
    }
  };

  // Copy / Insert Markdown
  const handleCopyMarkdown = (url: string, title?: string | null) => {
    const label = title || extractDomain(url) || 'Source Link';
    const snippet = `[${label}](${url})`;

    if (onInsertMarkdown) {
      onInsertMarkdown(snippet);
      message.success('Inserted Markdown link into editor');
    } else {
      navigator.clipboard.writeText(snippet);
      message.success('Copied Markdown link to clipboard: ' + snippet);
    }
  };

  const itemsCount = isExistingNote ? links.length : pendingLinks.length;

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">
            link
          </span>
          <h3 className="font-sans font-semibold text-base text-on-surface">
            Links & Sources
          </h3>
          <span className="bg-surface-container-highest px-2 py-0.5 rounded-full text-xs font-mono text-on-surface-variant">
            {itemsCount} {itemsCount === 1 ? 'link' : 'links'}
          </span>
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={() => setIsAdding((prev) => !prev)}
            disabled={isMutating}
            className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high border border-white/10 hover:border-primary/40 text-on-surface rounded text-xs font-medium transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px] text-primary">
              {isAdding ? 'close' : 'add_link'}
            </span>
            {isAdding ? 'Cancel' : 'Add Link'}
          </button>
        )}
      </div>

      {/* Add Link Form */}
      {isAdding && !readOnly && (
        <div className="p-3.5 bg-surface-container-high border border-primary/30 rounded-xl space-y-3 shadow-md animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-mono text-on-surface-variant uppercase font-medium">
                URL <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAddLink();
                  }
                }}
                placeholder="https://..."
                autoFocus
                className="w-full bg-surface-container-lowest border border-white/10 rounded px-3 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-mono text-on-surface-variant uppercase font-medium">
                Title / Label (Optional)
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAddLink();
                  }
                }}
                placeholder="e.g. Official Trailer, Documentation, Source Article"
                className="w-full bg-surface-container-lowest border border-white/10 rounded px-3 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setNewUrl('');
                setNewTitle('');
              }}
              className="px-3 py-1.5 text-xs text-on-surface-variant hover:text-on-surface rounded hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAddLink();
              }}
              disabled={!newUrl.trim() || isMutating}
              className="px-4 py-1.5 bg-primary text-on-primary rounded text-xs font-semibold hover:bg-primary-fixed-dim transition-all shadow disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Save Link
            </button>
          </div>
        </div>
      )}

      {/* Loading Spinner */}
      {isMutating && (
        <div className="flex items-center justify-center py-3 gap-2 text-xs text-primary font-mono bg-surface-container/40 rounded-lg">
          <Spin size="small" />
          <span>Updating links...</span>
        </div>
      )}

      {/* Empty State */}
      {itemsCount === 0 && !isAdding && (
        <div className="border border-dashed border-white/10 rounded-xl p-6 text-center bg-surface-container/30">
          <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center mx-auto mb-2 text-on-surface-variant">
            <span className="material-symbols-outlined text-[20px]">link_off</span>
          </div>
          <p className="text-sm font-medium text-on-surface">No links added yet</p>
          <p className="text-xs text-outline mt-1 font-mono">
            Add relevant reference links, press citations, or documentation URLs. You can mark one as the primary source.
          </p>
          {!readOnly && (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="mt-3 px-3 py-1.5 bg-surface-container hover:bg-surface-container-high border border-white/10 text-primary rounded text-xs font-medium inline-flex items-center gap-1 transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">add</span>
              Add First Link
            </button>
          )}
        </div>
      )}

      {/* Links List - Existing Note */}
      {isExistingNote && links.length > 0 && (
        <div className="space-y-2">
          {links.map((link, idx) => {
            const domain = extractDomain(link.url);

            return (
              <div
                key={link.id}
                className={`group rounded-lg p-3 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  link.isSource
                    ? 'bg-surface-container-high border-primary/40 ring-1 ring-primary/20 shadow-sm'
                    : 'bg-surface-container border-white/10 hover:border-white/20'
                }`}
              >
                {/* Link Info */}
                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                  {/* Link / Domain Icon */}
                  <div
                    className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${
                      link.isSource
                        ? 'bg-primary/20 text-primary'
                        : 'bg-surface-container-highest text-on-surface-variant group-hover:text-primary'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {link.isSource ? 'star' : 'language'}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-xs sm:text-sm text-on-surface truncate">
                        {link.title || domain}
                      </span>
                      {link.isSource && (
                        <span className="bg-primary text-on-primary text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-sm">
                          <span className="material-symbols-outlined text-[12px]">verified</span>
                          Source
                        </span>
                      )}
                      <span className="text-[11px] font-mono text-outline">
                        {domain}
                      </span>
                    </div>

                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-on-surface-variant hover:text-primary transition-colors truncate block max-w-full underline underline-offset-2 opacity-80 hover:opacity-100"
                    >
                      {link.url}
                    </a>
                  </div>
                </div>

                {/* Actions & Controls */}
                <div className="flex items-center justify-between sm:justify-end gap-1 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                  {/* Set As Source */}
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleSetSource(link)}
                      disabled={link.isSource || isMutating}
                      className={`text-xs px-2 py-1 rounded font-medium flex items-center gap-1 transition-all ${
                        link.isSource
                          ? 'text-primary font-bold cursor-default bg-primary/10'
                          : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        {link.isSource ? 'verified' : 'star_border'}
                      </span>
                      {link.isSource ? 'Primary Source' : 'Set as Source'}
                    </button>
                  )}

                  {/* Action Icons */}
                  <div className="flex items-center gap-0.5">
                    {/* Open Link */}
                    <Tooltip title="Open in new tab">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-white/5 rounded transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          open_in_new
                        </span>
                      </a>
                    </Tooltip>

                    {/* Copy / Insert to Markdown */}
                    <Tooltip title="Insert Markdown Link [Title](url)">
                      <button
                        type="button"
                        onClick={() => handleCopyMarkdown(link.url, link.title)}
                        className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-white/5 rounded transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          content_paste_go
                        </span>
                      </button>
                    </Tooltip>

                    {/* Edit */}
                    {!readOnly && (
                      <Tooltip title="Edit link">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(link)}
                          disabled={isMutating}
                          className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-white/5 rounded transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            edit
                          </span>
                        </button>
                      </Tooltip>
                    )}

                    {/* Move Up */}
                    {!readOnly && idx > 0 && (
                      <Tooltip title="Move Up">
                        <button
                          type="button"
                          onClick={() => handleMove(idx, idx - 1)}
                          disabled={isMutating}
                          className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-white/5 rounded transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            arrow_upward
                          </span>
                        </button>
                      </Tooltip>
                    )}

                    {/* Move Down */}
                    {!readOnly && idx < links.length - 1 && (
                      <Tooltip title="Move Down">
                        <button
                          type="button"
                          onClick={() => handleMove(idx, idx + 1)}
                          disabled={isMutating}
                          className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-white/5 rounded transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            arrow_downward
                          </span>
                        </button>
                      </Tooltip>
                    )}

                    {/* Delete */}
                    {!readOnly && (
                      <Popconfirm
                        title="Remove link"
                        description="Are you sure you want to remove this link?"
                        okText="Delete"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => handleDelete(link.id)}
                      >
                        <button
                          type="button"
                          disabled={isMutating}
                          className="p-1.5 text-outline hover:text-error hover:bg-error/10 rounded transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </Popconfirm>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Links List - Pending Links (New Note) */}
      {!isExistingNote && pendingLinks.length > 0 && (
        <div className="space-y-2">
          {pendingLinks.map((link, idx) => {
            const isSource = idx === pendingSourceIndex || link.isSource;
            const domain = extractDomain(link.url);

            return (
              <div
                key={`${link.url}-${idx}`}
                className={`group rounded-lg p-3 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isSource
                    ? 'bg-surface-container-high border-primary/40 ring-1 ring-primary/20 shadow-sm'
                    : 'bg-surface-container border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                  <div
                    className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSource
                        ? 'bg-primary/20 text-primary'
                        : 'bg-surface-container-highest text-on-surface-variant'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {isSource ? 'star' : 'language'}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-xs sm:text-sm text-on-surface truncate">
                        {link.title || domain}
                      </span>
                      {isSource && (
                        <span className="bg-primary text-on-primary text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-sm">
                          <span className="material-symbols-outlined text-[12px]">verified</span>
                          Source
                        </span>
                      )}
                      <span className="text-[11px] font-mono text-outline">
                        {domain}
                      </span>
                    </div>

                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-on-surface-variant hover:text-primary transition-colors truncate block max-w-full underline underline-offset-2 opacity-80 hover:opacity-100"
                    >
                      {link.url}
                    </a>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-1 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                  <button
                    type="button"
                    onClick={() => handleSetPendingSource(idx)}
                    className={`text-xs px-2 py-1 rounded font-medium flex items-center gap-1 transition-all ${
                      isSource
                        ? 'text-primary font-bold cursor-default bg-primary/10'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      {isSource ? 'verified' : 'star_border'}
                    </span>
                    {isSource ? 'Primary Source' : 'Set as Source'}
                  </button>

                  <div className="flex items-center gap-0.5">
                    <Tooltip title="Insert Markdown Link [Title](url)">
                      <button
                        type="button"
                        onClick={() => handleCopyMarkdown(link.url, link.title)}
                        className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-white/5 rounded transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          content_paste_go
                        </span>
                      </button>
                    </Tooltip>

                    <Tooltip title="Edit link">
                      <button
                        type="button"
                        onClick={() => handleStartEditPending(idx)}
                        className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-white/5 rounded transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          edit
                        </span>
                      </button>
                    </Tooltip>

                    {idx > 0 && (
                      <Tooltip title="Move Up">
                        <button
                          type="button"
                          onClick={() => handleMove(idx, idx - 1)}
                          className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-white/5 rounded transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            arrow_upward
                          </span>
                        </button>
                      </Tooltip>
                    )}

                    {idx < pendingLinks.length - 1 && (
                      <Tooltip title="Move Down">
                        <button
                          type="button"
                          onClick={() => handleMove(idx, idx + 1)}
                          className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-white/5 rounded transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            arrow_downward
                          </span>
                        </button>
                      </Tooltip>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeletePending(idx)}
                      className="p-1.5 text-outline hover:text-error hover:bg-error/10 rounded transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Link Modal */}
      <Modal
        open={Boolean(editingLinkId || editingPendingIndex !== null)}
        title="Edit Link"
        onCancel={() => {
          setEditingLinkId(null);
          setEditingPendingIndex(null);
        }}
        onOk={handleSaveEdit}
        confirmLoading={isMutating}
        okText="Save Changes"
        centered
      >
        <div className="space-y-3 pt-2">
          <div className="space-y-1">
            <label className="block text-xs font-mono text-on-surface-variant uppercase">
              URL
            </label>
            <Input
              value={editUrl}
              onChange={(e) => setEditUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-mono text-on-surface-variant uppercase">
              Title / Label
            </label>
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="e.g. Official Website"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
