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

export const TaxonomyPage: React.FC = () => {
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
      message.error('Please enter a node name');
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
        message.success('Root node created');
      } else if (modalMode === 'child') {
        const path = `${targetNode!.path}.${childSegment.trim().toLowerCase().replace(/\s+/g, '_')}`;
        await createMutation.mutateAsync({
          name: nodeName.trim(),
          path,
          icon: iconValue,
        });
        message.success('Child taxonomy node created');
      } else if (modalMode === 'edit') {
        await updateMutation.mutateAsync({
          id: targetNode!.id,
          data: {
            name: nodeName.trim(),
            path: fullPath.trim().toLowerCase(),
            icon: iconValue || '',
          },
        });
        message.success('Taxonomy node updated');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to save taxonomy node');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      message.success('Taxonomy node soft-deleted');
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to delete taxonomy node');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restoreMutation.mutateAsync(id);
      message.success('Taxonomy node restored');
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to restore taxonomy node');
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
          className={`group relative flex items-center justify-between py-2 px-3 rounded hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 ${
            depth > 0 ? 'tree-line-horizontal' : ''
          } ${isDeleted ? 'opacity-50' : ''}`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
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
              className="w-6 h-6 rounded flex items-center justify-center bg-surface-container border border-white/10 text-primary flex-shrink-0 shadow-xs"
            >
              <span className="material-symbols-outlined text-[15px]">
                {node.icon || 'label'}
              </span>
            </span>

            {/* Path Chip */}
            <span
              onClick={() => navigate(`/notes?tagPath=${encodeURIComponent(node.path)}`)}
              className="font-mono text-xs text-on-surface bg-surface-container-lowest px-2 py-0.5 rounded border border-outline-variant/30 hover:border-primary/50 hover:text-primary transition-colors cursor-pointer truncate"
            >
              {node.path}
            </span>

            {/* Node Display Name */}
            <span className="font-sans text-xs text-on-surface-variant font-medium truncate">
              ({node.name})
            </span>

            {/* Note Count Pill */}
            <span
              onClick={() => navigate(`/notes?tagPath=${encodeURIComponent(node.path)}`)}
              className="font-mono text-[11px] text-on-surface-variant/80 bg-white/5 px-2 py-0.5 rounded-full hover:bg-white/10 hover:text-secondary transition-colors cursor-pointer flex-shrink-0"
            >
              {node.notesCount} {node.notesCount === 1 ? 'note' : 'notes'}
            </span>

            {isDeleted && (
              <span className="font-mono text-[10px] text-error bg-error/15 px-1.5 py-0.5 rounded flex-shrink-0">
                DELETED
              </span>
            )}
          </div>

          {/* Hover Actions */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            {!isDeleted ? (
              <>
                <button
                  onClick={() => openAddChildModal(node)}
                  className="p-1 text-on-surface-variant hover:text-secondary rounded hover:bg-white/5"
                  title="Add Child Tag"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                </button>
                <button
                  onClick={() => openEditModal(node)}
                  className="p-1 text-on-surface-variant hover:text-primary rounded hover:bg-white/5"
                  title="Edit Tag"
                >
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                </button>
                <Popconfirm
                  title="Soft-delete this tag?"
                  onConfirm={() => handleDelete(node.id)}
                  okText="Delete"
                  cancelText="Cancel"
                  okButtonProps={{ danger: true }}
                >
                  <button
                    className="p-1 text-on-surface-variant hover:text-error rounded hover:bg-white/5"
                    title="Delete Tag"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </Popconfirm>
              </>
            ) : (
              <button
                onClick={() => handleRestore(node.id)}
                className="p-1 text-tertiary hover:text-primary rounded hover:bg-white/5"
                title="Restore Tag"
              >
                <span className="material-symbols-outlined text-[16px]">restore</span>
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
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-sans font-bold text-2xl text-on-surface mb-1">
            Taxonomy Tree
          </h1>
          <p className="text-on-surface-variant font-sans text-sm">
            Manage your hierarchical classification system. Paths are represented in PostgreSQL{' '}
            <code className="text-primary font-mono bg-surface-container px-1 py-0.5 rounded">
              Ltree
            </code>{' '}
            format.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-mono text-on-surface-variant cursor-pointer">
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={(e) => setIncludeDeleted(e.target.checked)}
              className="rounded bg-surface-container border-white/20 text-primary focus:ring-0"
            />
            Show Deleted
          </label>
          <button
            onClick={openAddRootModal}
            className="px-4 py-2 bg-primary text-on-primary hover:bg-primary-fixed-dim rounded font-semibold text-sm transition-all flex items-center gap-2 shadow"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            New Root Node
          </button>
        </div>
      </div>

      {/* Tree View Container */}
      <div className="bg-surface-container-high/40 border border-white/5 rounded-xl p-6 backdrop-blur-sm">
        <div className="space-y-2">
          {treeData.map((rootNode) => renderTreeNode(rootNode, 0))}
        </div>

        {treeData.length === 0 && !isLoading && (
          <div className="p-8 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl text-outline mb-2">
              account_tree
            </span>
            <p className="font-sans text-sm">No taxonomy nodes configured.</p>
            <button
              onClick={openAddRootModal}
              className="mt-3 px-4 py-1.5 bg-primary text-on-primary rounded text-xs font-semibold"
            >
              Add First Root Tag
            </button>
          </div>
        )}
      </div>

      {/* Create / Edit Taxonomy Modal */}
      <Modal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={520}
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
            {modalMode === 'root'
              ? 'New Root Taxonomy Tag'
              : modalMode === 'child'
              ? `Add Child Tag under '${targetNode?.path}'`
              : 'Edit Taxonomy Tag'}
          </h2>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1">
              <label className="block font-mono text-[11px] font-semibold text-on-surface-variant uppercase">
                Display Name
              </label>
              <input
                type="text"
                value={nodeName}
                onChange={(e) => setNodeName(e.target.value)}
                placeholder="e.g. React"
                className="w-full bg-surface-container-lowest border border-white/10 rounded px-3 py-2 text-on-surface text-sm focus:border-primary outline-none"
              />
            </div>

            {modalMode === 'child' ? (
              <div className="space-y-1">
                <label className="block font-mono text-[11px] font-semibold text-on-surface-variant uppercase">
                  Child Identifier
                </label>
                <div className="flex items-center gap-1 font-mono text-xs">
                  <span className="text-secondary bg-surface-container-low px-2 py-1.5 rounded border border-white/5">
                    {targetNode?.path}.
                  </span>
                  <input
                    type="text"
                    value={childSegment}
                    onChange={(e) => setChildSegment(e.target.value)}
                    placeholder="react"
                    className="flex-1 bg-surface-container-lowest border border-white/10 rounded px-3 py-1.5 text-on-surface text-xs focus:border-primary outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <label className="block font-mono text-[11px] font-semibold text-on-surface-variant uppercase">
                  Ltree Path
                </label>
                <input
                  type="text"
                  value={fullPath}
                  onChange={(e) => setFullPath(e.target.value)}
                  placeholder="e.g. technology.frontend.react"
                  className="w-full bg-surface-container-lowest border border-white/10 rounded px-3 py-2 text-on-surface font-mono text-xs focus:border-primary outline-none"
                />
              </div>
            )}

            {/* Icon Picker Component */}
            <IconPicker
              value={nodeIcon}
              onChange={setNodeIcon}
              label="Node Icon (Material Symbol)"
            />

            <div className="pt-3 border-t border-white/5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded text-sm text-on-surface-variant hover:text-on-surface"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-5 py-2 bg-primary text-on-primary hover:bg-primary-fixed-dim rounded font-semibold text-sm shadow"
              >
                Save Tag
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};
