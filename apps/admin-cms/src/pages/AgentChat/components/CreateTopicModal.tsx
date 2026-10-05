import React, { useState } from 'react';
import { Modal, Input, message, Select } from 'antd';
import { MessageSquare, Sparkles } from 'lucide-react';
import { ChatFolder, Curator } from '../../../types';

interface CreateTopicModalProps {
  open: boolean;
  isPending: boolean;
  folders: ChatFolder[];
  curators: Curator[];
  defaultFolderId?: string | null;
  onClose: () => void;
  onSubmit: (payload: {
    title: string;
    folderId: string;
    curatorId?: string | null;
    starterMessage?: string;
  }) => Promise<void>;
}

export const CreateTopicModal: React.FC<CreateTopicModalProps> = ({
  open,
  isPending,
  folders,
  curators,
  defaultFolderId,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [folderId, setFolderId] = useState<string>(() => {
    if (defaultFolderId && defaultFolderId !== 'all') return defaultFolderId;
    return folders[0]?.id || '';
  });
  const [curatorId, setCuratorId] = useState<string | null>(null);
  const [starterMessage, setStarterMessage] = useState('');

  // Update folderId if defaultFolderId changes
  React.useEffect(() => {
    if (defaultFolderId && defaultFolderId !== 'all') {
      setFolderId(defaultFolderId);
    } else if (folders.length > 0 && !folderId) {
      setFolderId(folders[0].id);
    }
  }, [defaultFolderId, folders]);

  const filteredCurators = curators.filter(
    (c) => !c.folderId || c.folderId === folderId,
  );

  const handleSubmit = async () => {
    if (!title.trim()) {
      message.error('Укажите заголовок топика');
      return;
    }
    if (!folderId) {
      message.error('Выберите папку контура');
      return;
    }

    await onSubmit({
      title: title.trim(),
      folderId,
      curatorId: curatorId || undefined,
      starterMessage: starterMessage.trim() || undefined,
    });

    setTitle('');
    setStarterMessage('');
    setCuratorId(null);
  };

  return (
    <Modal
      title="💬 Создать рабочий топик контура"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={isPending}
      okText="Создать топик"
      cancelText="Отмена"
      destroyOnClose
      width={520}
    >
      <div className="space-y-4 pt-2">
        <div>
          <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
            Тема / Заголовок топика *
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="например: Выжимка релизов LLM за неделю или Серия постов про чипы"
            className="rounded-lg"
          />
        </div>

        <div>
          <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
            Папка контура *
          </label>
          <Select
            value={folderId}
            onChange={(val) => {
              setFolderId(val);
              setCuratorId(null);
            }}
            className="w-full"
            options={folders.map((f) => ({
              value: f.id,
              label: `${f.icon ? '📁 ' : ''}${f.name}`,
            }))}
          />
        </div>

        <div>
          <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
            Ведущий куратор топика (опционально)
          </label>
          <Select
            value={curatorId || 'none'}
            onChange={(val) => setCuratorId(val === 'none' ? null : val)}
            className="w-full"
            options={[
              { value: 'none', label: '🤖 Общий интеллектуальный координатор топика' },
              ...filteredCurators.map((c) => ({
                value: c.id,
                label: `${c.emoji} ${c.name} (${c.roleTitle})`,
              })),
            ]}
          />
        </div>

        <div>
          <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
            Первый вопрос или вводный контекст (опционально)
          </label>
          <Input.TextArea
            value={starterMessage}
            onChange={(e) => setStarterMessage(e.target.value)}
            rows={3}
            placeholder="Задайте первый вопрос или отправьте материалы для разбора..."
            className="rounded-lg text-xs"
          />
        </div>
      </div>
    </Modal>
  );
};
