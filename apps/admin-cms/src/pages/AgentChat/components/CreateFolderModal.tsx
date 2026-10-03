import React, { useState } from 'react';
import { Modal, Input, message } from 'antd';

interface CreateFolderModalProps {
  open: boolean;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (payload: { name: string; color: string; icon: string }) => Promise<void>;
}

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  open,
  isPending,
  onClose,
  onSubmit,
}) => {
  const [folderName, setFolderName] = useState('');
  const [folderColor, setFolderColor] = useState('#3b82f6');
  const [folderIcon] = useState('Folder');

  const handleSubmit = async () => {
    if (!folderName.trim()) {
      message.error('Укажите название папки');
      return;
    }

    await onSubmit({
      name: folderName.trim(),
      color: folderColor,
      icon: folderIcon,
    });

    setFolderName('');
  };

  return (
    <Modal
      title="Создать тематическую папку чатов"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={isPending}
      okText="Создать папку"
      cancelText="Отмена"
      destroyOnClose
    >
      <div className="space-y-4 pt-2">
        <div>
          <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
            Название папки
          </label>
          <Input
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="например: Технологии & IT или Политика & РФ"
          />
        </div>

        <div>
          <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
            Цветовой акцент
          </label>
          <div className="flex items-center gap-2">
            {['#38bdf8', '#a855f7', '#10b981', '#fbbf24', '#ef4444', '#64748b'].map((col) => (
              <button
                key={col}
                type="button"
                onClick={() => setFolderColor(col)}
                className={`w-7 h-7 rounded-full transition-transform ${
                  folderColor === col ? 'scale-110 ring-2 ring-white' : 'opacity-80 hover:opacity-100'
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
