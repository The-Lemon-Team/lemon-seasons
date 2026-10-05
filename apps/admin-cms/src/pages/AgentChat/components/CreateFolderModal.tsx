import React, { useState } from 'react';
import { Modal, Input, message } from 'antd';
import { Sparkles, Palette, Shield } from 'lucide-react';

interface CreateFolderModalProps {
  open: boolean;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    description?: string;
    color: string;
    icon: string;
    imageStylePrompt?: string;
    contextRules?: string;
  }) => Promise<void>;
}

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  open,
  isPending,
  onClose,
  onSubmit,
}) => {
  const [folderName, setFolderName] = useState('');
  const [description, setDescription] = useState('');
  const [folderColor, setFolderColor] = useState('#10b981');
  const [folderIcon] = useState('Folder');
  const [imageStylePrompt, setImageStylePrompt] = useState('');
  const [contextRules, setContextRules] = useState('');

  const handleSubmit = async () => {
    if (!folderName.trim()) {
      message.error('Укажите название папки');
      return;
    }

    await onSubmit({
      name: folderName.trim(),
      description: description.trim() || undefined,
      color: folderColor,
      icon: folderIcon,
      imageStylePrompt: imageStylePrompt.trim() || undefined,
      contextRules: contextRules.trim() || undefined,
    });

    setFolderName('');
    setDescription('');
    setImageStylePrompt('');
    setContextRules('');
  };

  return (
    <Modal
      title="📁 Создать контур / папку ответственности"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={isPending}
      okText="Создать папку"
      cancelText="Отмена"
      destroyOnClose
      width={520}
    >
      <div className="space-y-4 pt-2">
        <div>
          <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
            Название папки / контура *
          </label>
          <Input
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="например: IT & Инфраструктура или Политика & Макро"
            className="rounded-lg"
          />
        </div>

        <div>
          <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
            Краткое описание / фокус
          </label>
          <Input.TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="О чем этот контур, какие процессы и темы здесь курируются..."
            className="rounded-lg text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Стиль генерации фото Gemini (Image Style Prompt)
          </label>
          <Input.TextArea
            value={imageStylePrompt}
            onChange={(e) => setImageStylePrompt(e.target.value)}
            rows={2}
            placeholder="например: cinematic tech photography, neon emerald accents, server room, 8k photography"
            className="rounded-lg text-xs"
          />
          <span className="text-[10px] text-gray-500 mt-0.5 block">
            Этот стиль будет автоматически подмешиваться ко всем запросам на генерацию фото в данной папке.
          </span>
        </div>

        <div>
          <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-sky-400" />
            Правила контура для ИИ-кураторов (Context Rules)
          </label>
          <Input.TextArea
            value={contextRules}
            onChange={(e) => setContextRules(e.target.value)}
            rows={2}
            placeholder="например: Строгая инженерная точность, ориентация на бенчмарки и архитектурные схемы..."
            className="rounded-lg text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-gray-400" />
            Цветовой акцент папки
          </label>
          <div className="flex items-center gap-2">
            {['#10b981', '#38bdf8', '#ec4899', '#f59e0b', '#a855f7', '#64748b'].map((col) => (
              <button
                key={col}
                type="button"
                onClick={() => setFolderColor(col)}
                className={`w-7 h-7 rounded-full transition-transform ${
                  folderColor === col ? 'scale-110 ring-2 ring-white shadow-md' : 'opacity-80 hover:opacity-100'
                }`}
                style={{ backgroundColor: col }}
              />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};
