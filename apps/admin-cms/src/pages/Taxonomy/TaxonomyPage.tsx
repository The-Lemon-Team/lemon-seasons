import React, { useState } from 'react';
import { message, Modal, Popconfirm } from 'antd';
import {
  useTaxonomyTree,
  useCreateTaxonomy,
  useUpdateTaxonomy,
  useDeleteTaxonomy,
  useRestoreTaxonomy,
} from '../../api/queries';
import { TaxonomyTreeNode } from '../../types';
import { IconPicker } from '../../components/IconPicker';
import { useNavigate } from 'react-router-dom';
import { useAdminI18n } from '../../i18n';

export const TaxonomyPage: React.FC = () => {
  const { t } = useAdminI18n();
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>({
    movies: true,
    technology: true,
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'root' | 'child' | 'edit'>('root');
  const [targetNode, setTargetNode] = useState<TaxonomyTreeNode | null>(null);

  // Form State
  const [nodeName, setNodeName] = useState('');
  const [nodeIcon, setNodeIcon] = useState('');
  const [childSegment, setChildSegment] = useState('');
  const [fullPath, setFullPath] = useState('');

  const navigate = useNavigate();

  const { data: treeData = [], isLoading } = useTaxonomyTree(includeDeleted);
  const createMutation = useCreateTaxonomy();
  const updateMutation = useUpdateTaxonomy();
  const deleteMutation = useDeleteTaxonomy();
  const restoreMutation = useRestoreTaxonomy();

  const toggleExpand = (path: string) => {
    setExpandedPaths((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const openAddRootModal = () => {
    setModalMode('root');
    setTargetNode(null);
    setNodeName('');
    setNodeIcon('');
    setFullPath('');
    setIsModalOpen(true);
  };

  const openAddChildModal = (parent: TaxonomyTreeNode) => {
    setModalMode('child');
    setTargetNode(parent);
    setNodeName('');
    setNodeIcon('');
    setChildSegment('');
    setFullPath(`${parent.path}.`);
    setIsModalOpen(true);
  };

  const openEditModal = (node: TaxonomyTreeNode) => {
    setModalMode('edit');
    setTargetNode(node);
    setNodeName(node.name);
    setNodeIcon(node.icon || '');
    setFullPath(node.path);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nodeName.trim()) {
      message.error(t.tagNameLabel);
      return;
    }

    try {
      const iconValue = nodeIcon.trim() || undefined;
      if (modalMode === 'root') {
        const path = fullPath.trim()
          ? fullPath.trim().toLowerCase()
          : nodeName.trim().toLowerCase().replace(/\s+/g, '_');
        await createMutation.mutateAsync({
          name: nodeName.trim(),
          path,
          icon: iconValue,
        });
        message.success(t.tagSavedSuccess);
      } else if (modalMode === 'child') {
        const path = `${targetNode!.path}.${childSegment.trim().toLowerCase().replace(/\s+/g, '_')}`;
        await createMutation.mutateAsync({
          name: nodeName.trim(),
          path,
          icon: iconValue,
        });
        message.success(t.tagSavedSuccess);
      } else if (modalMode === 'edit') {
        await updateMutation.mutateAsync({
          id: targetNode!.id,
          data: {
            name: nodeName.trim(),
            path: fullPath.trim().toLowerCase(),
            icon: iconValue || '',
          },
        });
        message.success(t.tagSavedSuccess);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      message.success(t.tagDeletedSuccess);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restoreMutation.mutateAsync(id);
      message.success(t.tagSavedSuccess);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error');
    }
  };

  // Recursive Tree Node Renderer
  const renderTreeNode = (node: TaxonomyTreeNode, depth = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedPaths[node.path] ?? true;
    const isDeleted = Boolean(node.deletedAt);

    return (
      <div key={node.id} className={depth > 0 ? 'pl-7 relative tree-line' : 'mt-1'}>
        <div
          className={`group relative flex items-center justify-between py-1.5 px-2.5 rounded-lg hover:bg-tile-subtle transition-colors border border-transparent hover:border-tile-border ${
            depth > 0 ? 'tree-line-horizontal' : ''
          } ${isDeleted ? 'opacity-50' : ''}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {hasChildren ? (
              <button
                onClick={() => toggleExpand(node.path)}
                className="text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center w-5 h-5 cursor-pointer flex-shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {isExpanded ? 'expand_more' : 'chevron_right'}
                </span>
              </button>
            ) : (
              <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-outline-variant/60" />
              </span>
            )}

            {/* Node Icon Badge */}
            <span
              title={node.icon ? `Icon: ${node.icon}` : 'Default tag icon'}
              className="w-5.5 h-5.5 rounded flex items-center justify-center bg-tile-subtle border border-tile-border text-primary flex-shrink-0 shadow-xs"
            >
              <span className="material-symbols-outlined text-[14px]">
                {node.icon || 'label'}
              </span>
            </span>

            {/* Path Chip */}
            <span
              onClick={() => navigate(`/notes?tagPath=${encodeURIComponent(node.path)}`)}
              className="font-mono text-[11px] text-on-surface bg-tile px-1.5 py-0.2 rounded border border-tile-border hover:border-primary/50 hover:text-primary transition-colors cursor-pointer truncate"
            >
              {node.path}
            </span>

            {/* Node Display Name */}
            <span className="font-sans text-[11px] text-on-surface-variant font-medium truncate">
              ({node.name})
            </span>

            {/* Note Count Pill */}
            <span
              onClick={() => navigate(`/notes?tagPath=${encodeURIComponent(node.path)}`)}
              className="font-mono text-[10px] text-on-surface-variant bg-tile-subtle border border-tile-border px-1.5 py-0.2 rounded-full hover:bg-tile-muted hover:text-secondary transition-colors cursor-pointer flex-shrink-0"
            >
              {node.notesCount}
            </span>

            {isDeleted && (
              <span className="font-mono text-[9px] text-error bg-error/15 px-1.5 py-0.2 rounded flex-shrink-0">
                DELETED
              </span>
            )}
          </div>

          {/* Hover Actions */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
            {!isDeleted ? (
              <>
                <button
                  onClick={() => openAddChildModal(node)}
                  className="p-1 text-on-surface-variant hover:text-secondary rounded hover:bg-tile-subtle cursor-pointer"
                  title={t.add}
                >
                  <span className="material-symbols-outlined text-[15px]">add</span>
                </button>
                <button
                  onClick={() => openEditModal(node)}
                  className="p-1 text-on-surface-variant hover:text-primary rounded hover:bg-tile-subtle cursor-pointer"
                  title={t.edit}
                >
                  <span className="material-symbols-outlined text-[15px]">edit</span>
                </button>
                <Popconfirm
                  title={t.confirmDeleteTag}
                  onConfirm={() => handleDelete(node.id)}
                  okText={t.delete}
                  cancelText={t.cancel}
                  okButtonProps={{ danger: true }}
                >
                  <button
                    className="p-1 text-on-surface-variant hover:text-error rounded hover:bg-tile-subtle cursor-pointer"
                    title={t.delete}
                  >
                    <span className="material-symbols-outlined text-[15px]">delete</span>
                  </button>
                </Popconfirm>
              </>
            ) : (
              <button
                onClick={() => handleRestore(node.id)}
                className="p-1 text-tertiary hover:text-primary rounded hover:bg-tile-subtle cursor-pointer"
                title="Restore"
              >
                <span className="material-symbols-outlined text-[15px]">restore</span>
              </button>
            )}
          </div>
        </div>

        {/* Child Subtree */}
        {hasChildren && isExpanded && (
          <div className="space-y-1">
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3.5">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-sans font-bold text-lg text-text-main leading-tight">
            {t.taxonomyPageTitle}
          </h1>
          <p className="text-text-muted font-sans text-xs">
            {t.taxonomyPageSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <label className="flex items-center gap-1.5 text-[11px] font-mono text-text-muted cursor-pointer hover:text-text-main transition-colors">
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={(e) => setIncludeDeleted(e.target.checked)}
              className="rounded bg-control border-tile-border text-primary focus:ring-0 w-3.5 h-3.5"
            />
            {t.status}: Deleted
          </label>
          <button
            onClick={openAddRootModal}
            className="h-6.5 px-2.5 bg-primary text-on-primary hover:bg-primary-fixed-dim rounded text-[11px] font-semibold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px]">add_circle</span>
            {t.createTagBtn}
          </button>
        </div>
      </div>

      {/* Tree View Container */}
      <div className="platform-tile p-3 sm:p-4">
        <div className="space-y-1.5">
          {treeData.map((rootNode) => renderTreeNode(rootNode, 0))}
        </div>

        {treeData.length === 0 && !isLoading && (
          <div className="p-8 text-center text-text-muted">
            <span className="material-symbols-outlined text-3xl text-text-muted/60 mb-2">
              account_tree
            </span>
            <p className="font-sans text-xs">{t.taxonomyPageSubtitle}</p>
            <button
              onClick={openAddRootModal}
              className="mt-2.5 h-6.5 px-3 bg-primary text-on-primary rounded text-[11px] font-semibold cursor-pointer shadow-xs"
            >
              {t.createTagBtn}
            </button>
          </div>
        )}
      </div>

      {/* Create / Edit Taxonomy Modal */}
      <Modal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={480}
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
        <div className="p-1 space-y-3.5">
          <h2 className="font-sans font-bold text-base text-text-main">
            {modalMode === 'root'
              ? t.createTagTitle
              : modalMode === 'child'
              ? `${t.createTagBtn} (${targetNode?.path})`
              : t.editTagTitle}
          </h2>

          <form onSubmit={handleSave} className="space-y-3">
            <div className="space-y-1">
              <label className="block font-mono text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                {t.tagNameLabel}
              </label>
              <input
                type="text"
                value={nodeName}
                onChange={(e) => setNodeName(e.target.value)}
                placeholder="e.g. React"
                className="w-full bg-control border border-tile-border rounded px-2.5 py-1.5 text-text-main text-xs focus:border-primary outline-none transition-colors"
              />
            </div>

            {modalMode === 'child' ? (
              <div className="space-y-1">
                <label className="block font-mono text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                  {t.tagSlugLabel}
                </label>
                <div className="flex items-center gap-1 font-mono text-xs">
                  <span className="text-text-muted bg-tile-subtle px-2 py-1.5 rounded border border-tile-border text-[11px]">
                    {targetNode?.path}.
                  </span>
                  <input
                    type="text"
                    value={childSegment}
                    onChange={(e) => setChildSegment(e.target.value)}
                    placeholder="react"
                    className="flex-1 bg-control border border-tile-border rounded px-2.5 py-1.5 text-text-main text-xs focus:border-primary outline-none transition-colors"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <label className="block font-mono text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                  {t.tagSlugLabel}
                </label>
                <input
                  type="text"
                  value={fullPath}
                  onChange={(e) => setFullPath(e.target.value)}
                  placeholder="e.g. technology.frontend.react"
                  className="w-full bg-control border border-tile-border rounded px-2.5 py-1.5 text-text-main font-mono text-xs focus:border-primary outline-none transition-colors"
                />
              </div>
            )}

            {/* Icon Picker Component */}
            <IconPicker
              value={nodeIcon}
              onChange={setNodeIcon}
              label="Icon (Material Symbol)"
            />

            <div className="pt-2.5 border-t border-tile-border flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="h-7 px-3 rounded text-xs text-text-muted hover:text-text-main cursor-pointer transition-colors"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="h-7 px-4 bg-primary text-on-primary hover:bg-primary-fixed-dim rounded font-semibold text-xs shadow-xs cursor-pointer transition-colors"
              >
                {t.save}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};

