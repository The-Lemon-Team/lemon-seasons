import React, { useState } from 'react';
import { Modal, Input, message, Select } from 'antd';
import { UserCheck, Sparkles, Palette } from 'lucide-react';
import { ChatFolder } from '../../../types';

interface CreateCuratorModalProps {
  open: boolean;
  isPending: boolean;
  folders: ChatFolder[];
  defaultFolderId?: string | null;
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    shortName?: string;
    roleTitle: string;
    personality?: string;
    systemPrompt: string;
    emoji: string;
    accentColor: string;
    folderId?: string | null;
  }) => Promise<void>;
}

export const CreateCuratorModal: React.FC<CreateCuratorModalProps> = ({
  open,
  isPending,
  folders,
  defaultFolderId,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [personality, setPersonality] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [emoji, setEmoji] = useState('👤');
  const [accentColor, setAccentColor] = useState('#10b981');
  const [folderId, setFolderId] = useState<string | null>(defaultFolderId || null);

  const EMOJI_OPTIONS = ['👤', '⚡', '🇷🇺', '🌐', '🇨🇳', '📟', '🏛️', '🔥', '♟️', '🕌', '⚓', '🧠', '🔬', '🛡️', '📊'];

  const handleSubmit = async () => {
    if (!name.trim()) {
      message.error('Укажите имя куратора');
      return;
    }
    if (!roleTitle.trim()) {
      message.error('Укажите роль или титул куратора');
      return;
    }
    if (!systemPrompt.trim()) {
      message.error('Укажите системную инструкцию / фокус куратора');
      return;
    }

    await onSubmit({
      name: name.trim(),
      shortName: shortName.trim() || undefined,
      roleTitle: roleTitle.trim(),
      personality: personality.trim() || undefined,
      systemPrompt: systemPrompt.trim(),
      emoji,
      accentColor,
      folderId: folderId || undefined,
    });

    setName('');
    setShortName('');
    setRoleTitle('');
    setPersonality('');
    setSystemPrompt('');
  };

  return (
    <Modal
      title="🏛️ Создать ИИ-Куратора контура"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={isPending}
      okText="Создать куратора"
      cancelText="Отмена"
      destroyOnClose
      width={560}
    >
      <div className="space-y-4 pt-2">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
              Имя куратора *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="например: Маркус Вейн или Кибер-аналитик"
              className="rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
              Короткое имя
            </label>
            <Input
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              placeholder="Маркус"
              className="rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
            Роль / Титул (область ответственности) *
          </label>
          <Input
            value={roleTitle}
            onChange={(e) => setRoleTitle(e.target.value)}
            placeholder="например: Аналитик полупроводников и серверной инфраструктуры"
            className="rounded-lg"
          />
        </div>

        <div>
          <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
            Характер и стиль общения (Personality)
          </label>
          <Input
            value={personality}
            onChange={(e) => setPersonality(e.target.value)}
            placeholder="например: Сдержанный, оперирует фактами и цифрами, легкая ирония..."
            className="rounded-lg"
          />
        </div>

        <div>
          <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
            Системный промпт / Фокус анализа *
          </label>
          <Input.TextArea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={3}
            placeholder="Опишите, на какие сигналы и события обращает внимание этот куратор, какие источники для него в приоритете, как он формулирует выводы..."
            className="rounded-lg text-xs"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
              Привязка к папке
            </label>
            <Select
              value={folderId || 'global'}
              onChange={(v) => setFolderId(v === 'global' ? null : v)}
              className="w-full"
              options={[
                { value: 'global', label: '🌐 Глобальный (доступен везде)' },
                ...folders.map((f) => ({ value: f.id, label: `${f.icon ? '📁 ' : ''}${f.name}` })),
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
              Эмодзи-аватар
            </label>
            <div className="flex items-center gap-1 flex-wrap">
              {EMOJI_OPTIONS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setEmoji(em)}
                  className={`w-7 h-7 rounded-md text-sm flex items-center justify-center transition-all ${
                    emoji === em ? 'bg-primary/30 border border-primary text-white scale-110' : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
            Акцентный цвет
          </label>
          <div className="flex items-center gap-2">
            {['#10b981', '#38bdf8', '#ec4899', '#f59e0b', '#a855f7', '#ef4444', '#64748b'].map((col) => (
              <button
                key={col}
                type="button"
                onClick={() => setAccentColor(col)}
                className={`w-6 h-6 rounded-full transition-transform ${
                  accentColor === col ? 'scale-110 ring-2 ring-white shadow-md' : 'opacity-80 hover:opacity-100'
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
