import React, { useState } from 'react';
import { Modal, Radio, Input, Select, Checkbox, message } from 'antd';
import { CURATOR_PERSONAS_LIST } from '@lenta/shared';
import { ChatFolder } from '../../../types';

interface CreateThreadModalProps {
  open: boolean;
  folders: ChatFolder[];
  selectedDate: string;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    title: string;
    type: 'DIRECT' | 'GROUP';
    folderId?: string;
    targetAgent?: string;
    participantAgents: string[];
    dateScope: string;
  }) => Promise<void>;
}

export const CreateThreadModal: React.FC<CreateThreadModalProps> = ({
  open,
  folders,
  selectedDate,
  isPending,
  onClose,
  onSubmit,
}) => {
  const [threadType, setThreadType] = useState<'DIRECT' | 'GROUP'>('GROUP');
  const [threadTitle, setThreadTitle] = useState('');
  const [threadFolderId, setThreadFolderId] = useState<string | undefined>(undefined);
  const [threadCurator, setThreadCurator] = useState<string>('ivan-bely');
  const [threadParticipants, setThreadParticipants] = useState<string[]>([
    'ivan-bely',
    'kirk-kitten',
    'chen-wei',
    'independent-analyst',
  ]);

  const handleSubmit = async () => {
    if (!threadTitle.trim()) {
      message.error('Укажите название чата');
      return;
    }

    await onSubmit({
      title: threadTitle.trim(),
      type: threadType,
      folderId: threadFolderId,
      targetAgent: threadType === 'DIRECT' ? threadCurator : undefined,
      participantAgents: threadType === 'GROUP' ? threadParticipants : [threadCurator],
      dateScope: selectedDate,
    });

    setThreadTitle('');
  };

  return (
    <Modal
      title="Создать новый аналитический диалог"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={isPending}
      okText="Создать чат"
      cancelText="Отмена"
      destroyOnClose
    >
      <div className="space-y-4 pt-2">
        <div>
          <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
            Формат диалога
          </label>
          <Radio.Group
            value={threadType}
            onChange={(e) => {
              const val = e.target.value;
              setThreadType(val);
              if (val === 'DIRECT') {
                const p = CURATOR_PERSONAS_LIST.find((x) => x.id === threadCurator);
                setThreadTitle(`${p?.emoji || '👤'} ${p?.name || 'Куратор'} (Личный)`);
              } else {
                setThreadTitle('🏛️ Политическая коллегия');
              }
            }}
            className="w-full grid grid-cols-2 gap-2"
          >
            <Radio.Button value="GROUP" className="text-center">
              👥 Групповая коллегия
            </Radio.Button>
            <Radio.Button value="DIRECT" className="text-center">
              👤 Одиночный (1-на-1)
            </Radio.Button>
          </Radio.Group>
        </div>

        <div>
          <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
            Название чата
          </label>
          <Input
            value={threadTitle}
            onChange={(e) => setThreadTitle(e.target.value)}
            placeholder="например: IT & AI Совет или Иван Белый (Налоги)"
          />
        </div>

        {threadType === 'DIRECT' ? (
          <div>
            <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
              Выберите персонального куратора
            </label>
            <Select
              value={threadCurator}
              onChange={(val) => {
                setThreadCurator(val);
                const p = CURATOR_PERSONAS_LIST.find((x) => x.id === val);
                setThreadTitle(`${p?.emoji || '👤'} ${p?.name} (Личный)`);
              }}
              className="w-full"
              options={CURATOR_PERSONAS_LIST.map((p) => ({
                value: p.id,
                label: `${p.emoji} ${p.name} — ${p.role}`,
              }))}
            />
          </div>
        ) : (
          <div>
            <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
              Участники коллегии (Агенты)
            </label>
            <Checkbox.Group
              value={threadParticipants}
              onChange={(vals: any) => setThreadParticipants(vals)}
              className="grid grid-cols-2 gap-2 pt-1"
            >
              {CURATOR_PERSONAS_LIST.map((p) => (
                <Checkbox key={p.id} value={p.id}>
                  {p.emoji} {p.name}
                </Checkbox>
              ))}
              <Checkbox value="independent-analyst">⚖️ Арбитр (Синтез)</Checkbox>
            </Checkbox.Group>
          </div>
        )}

        <div>
          <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
            Тематическая папка
          </label>
          <Select
            value={threadFolderId}
            onChange={setThreadFolderId}
            className="w-full"
            placeholder="Выберите папку (необязательно)..."
            allowClear
            options={[
              { value: undefined, label: '📁 Без папки (Общий список)' },
              ...folders.map((f) => ({
                value: f.id,
                label: `📁 ${f.name}`,
              })),
            ]}
          />
        </div>
      </div>
    </Modal>
  );
};
