import React, { useState } from 'react';
import { Modal, Input, Select, Tag } from 'antd';
import { Palette, Sparkles } from 'lucide-react';
import { ChatThread } from '../../../types';

interface GeneratePhotoModalProps {
  open: boolean;
  activeThread?: ChatThread | null;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (prompt?: string, aspectRatio?: string) => Promise<void>;
}

export const GeneratePhotoModal: React.FC<GeneratePhotoModalProps> = ({
  open,
  activeThread,
  isPending,
  onClose,
  onSubmit,
}) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');

  const folder = activeThread?.folder;

  const handleSubmit = async () => {
    await onSubmit(prompt.trim() || undefined, aspectRatio);
    setPrompt('');
    onClose();
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-emerald-400" />
          <span>Генерация фото Gemini (Imagen)</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={isPending}
      okText="Сгенерировать фото"
      cancelText="Отмена"
      destroyOnClose
      width={500}
    >
      <div className="space-y-4 pt-2">
        {folder?.imageStylePrompt && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Стиль папки «{folder.name}» активен:</span>
            </div>
            <div className="text-[11px] text-gray-300 mt-1 font-mono italic">
              «{folder.imageStylePrompt}»
            </div>
            <div className="text-[10px] text-gray-400 mt-1">
              Этот стиль будет автоматически подмешан к запросу в Gemini Imagen.
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
            Описание изображения (промпт)
          </label>
          <Input.TextArea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder={
              activeThread
                ? `Опишите сюжет или оставьте пустым, чтобы Gemini сформировал изображение по контексту «${activeThread.title}»...`
                : 'Опишите сюжет или детали изображения...'
            }
            className="rounded-lg text-xs"
          />
          <span className="text-[10px] text-gray-500 mt-0.5 block">
            Если поле пустое, Gemini автоматически извлечет визуальный образ из последних сообщений диалога.
          </span>
        </div>

        <div>
          <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
            Соотношение сторон (Aspect Ratio)
          </label>
          <Select
            value={aspectRatio}
            onChange={setAspectRatio}
            className="w-full"
            options={[
              { value: '16:9', label: '16:9 (Горизонтальный баннер / Хроника / Широкий экран)' },
              { value: '1:1', label: '1:1 (Квадрат / Карточка / Пост в соцсетях)' },
              { value: '9:16', label: '9:16 (Вертикальный формат / Stories / Shorts)' },
              { value: '4:3', label: '4:3 (Классический фотоформат)' },
            ]}
          />
        </div>
      </div>
    </Modal>
  );
};
