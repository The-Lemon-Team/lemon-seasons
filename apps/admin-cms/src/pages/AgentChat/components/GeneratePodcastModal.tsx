import React, { useState } from 'react';
import { Modal, Input, Select } from 'antd';
import { Mic, Headphones, Sparkles } from 'lucide-react';
import { ChatThread } from '../../../types';

interface GeneratePodcastModalProps {
  open: boolean;
  activeThread?: ChatThread | null;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (data: { host1Name?: string; host2Name?: string; tone?: string }) => Promise<void>;
}

export const GeneratePodcastModal: React.FC<GeneratePodcastModalProps> = ({
  open,
  activeThread,
  isPending,
  onClose,
  onSubmit,
}) => {
  const [host1Name, setHost1Name] = useState('Алексей');
  const [host2Name, setHost2Name] = useState('Елена');
  const [tone, setTone] = useState('dynamic');

  const handleSubmit = async () => {
    await onSubmit({
      host1Name: host1Name.trim() || undefined,
      host2Name: host2Name.trim() || undefined,
      tone,
    });
    onClose();
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <Mic className="w-5 h-5 text-purple-400" />
          <span>Генерация NotebookLM Подкаста</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={isPending}
      okText="Сгенерировать диалог"
      cancelText="Отмена"
      destroyOnClose
      width={500}
    >
      <div className="space-y-4 pt-2">
        <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-300">
            <Headphones className="w-3.5 h-3.5 text-purple-400" />
            <span>Двухголосный аналитический аудио-диалог</span>
          </div>
          <div className="text-[11px] text-gray-300 mt-1">
            Gemini соберет ключевые аргументы и факты из текущего топика{' '}
            {activeThread ? `«${activeThread.title}»` : ''} и сформирует живой сценарий подкаста
            (в стиле Google NotebookLM Audio Overview) с таймкодами и ролями.
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
              Ведущий 1 (Голос А)
            </label>
            <Input
              value={host1Name}
              onChange={(e) => setHost1Name(e.target.value)}
              placeholder="Алексей"
              className="rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
              Ведущий 2 (Голос Б)
            </label>
            <Input
              value={host2Name}
              onChange={(e) => setHost2Name(e.target.value)}
              placeholder="Елена"
              className="rounded-lg text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
            Тональность и формат диалога
          </label>
          <Select
            value={tone}
            onChange={setTone}
            className="w-full"
            options={[
              {
                value: 'dynamic',
                label: 'Динамичный и живой (живые реакции, аналогии, понятные примеры)',
              },
              {
                value: 'analytical',
                label: 'Глубокий аналитический (упор на факты, системные связи, риски)',
              },
              {
                value: 'investigative',
                label: 'Журналистское расследование (деконструкция событий, скепсис)',
              },
            ]}
          />
        </div>
      </div>
    </Modal>
  );
};
