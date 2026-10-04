import React, { useState, useEffect } from 'react';
import { Drawer, Button, Input, Select, message } from 'antd';
import { NoteType, ACTIVE_CURATOR_PERSONAS_LIST } from '@lenta/shared';
import { FolderSelect } from '../../../components/FolderSelect';
import { HashtagInput } from '../../../components/HashtagInput';
import { NoteTypeSelect } from '../../../components/NoteTypeSelect';
import { FolderInputItem, ChatMessageRecord } from '../../../types';

const { TextArea } = Input;

interface SaveCardDrawerProps {
  open: boolean;
  msg: ChatMessageRecord | null;
  selectedDate: string;
  feeds: any[];
  isPending: boolean;
  onClose: () => void;
  onSave: (payload: any) => Promise<void>;
}

export const SaveCardDrawer: React.FC<SaveCardDrawerProps> = ({
  open,
  msg,
  selectedDate,
  feeds,
  isPending,
  onClose,
  onSave,
}) => {
  const [cardTitle, setCardTitle] = useState('');
  const [cardType, setCardType] = useState<NoteType>(NoteType.EVENT);
  const [cardCurator, setCardCurator] = useState('ivan-bely');
  const [cardFolders, setCardFolders] = useState<FolderInputItem[]>([
    { path: 'Politics/Russia', isPrimary: true, order: 0 },
  ]);
  const [cardTaxonomyPath, setCardTaxonomyPath] = useState('politics.russia');
  const [cardHashtags, setCardHashtags] = useState<string[]>(['повестка', 'хроника']);
  const [cardDescription, setCardDescription] = useState('');
  const [cardFeedId, setCardFeedId] = useState<string>('');
  const [cardSourceLink, setCardSourceLink] = useState<string | undefined>(undefined);

  // Sync state when msg changes
  useEffect(() => {
    if (!msg) return;
    const card = msg.suggestedCard;
    const title =
      card?.title ||
      msg.senderRole + ': ' + msg.text.substring(0, 60).replace(/[#*`]/g, '') + '...';
    const type = card?.type || NoteType.SINGLE;
    const curator =
      card?.curator ||
      (msg.sender === 'political-group'
        ? 'Политическая коллегия'
        : msg.sender === 'okatsiya'
        ? 'Окация'
        : msg.sender);
    const folderPath =
      card?.folder ||
      (msg.sender === 'political-group'
        ? 'Politics/Daily'
        : msg.sender === 'okatsiya'
        ? 'Tech/Daily'
        : msg.sender === 'kirk-kitten'
        ? 'Politics/International'
        : msg.sender === 'chen-wei'
        ? 'Politics/Asia'
        : 'Politics/Russia');
    const taxonomy =
      card?.taxonomyPath ||
      (msg.sender === 'political-group'
        ? 'politics.daily_summary'
        : msg.sender === 'okatsiya'
        ? 'tech.overview'
        : msg.sender === 'kirk-kitten'
        ? 'politics.international'
        : msg.sender === 'chen-wei'
        ? 'politics.international.asia'
        : 'politics.russia');
    const hashtags =
      card?.hashtags ||
      (msg.sender === 'okatsiya' ? ['IT', 'AI', 'Технологии'] : ['новости', 'повестка']);
    const desc =
      card?.description ||
      `## ${title}\n\n> **Куратор:** ${msg.senderName} (${msg.senderRole})  \n> **Дата:** ${selectedDate}\n\n${msg.text}\n\n---\n*Материал зафиксирован из Аналитического Чата.*`;

    setCardTitle(title);
    setCardType(type);
    setCardCurator(curator);
    setCardFolders([{ path: folderPath, isPrimary: true, order: 0 }]);
    setCardTaxonomyPath(taxonomy);
    setCardHashtags(hashtags);
    setCardDescription(desc);
    setCardSourceLink(card?.sourceLink || (msg.sources && msg.sources[0]) || undefined);
    setCardFeedId(feeds[0]?.id || '');
  }, [msg, selectedDate, feeds]);

  const handleSave = async () => {
    if (!cardTitle.trim()) {
      message.error('Укажите заголовок карточки');
      return;
    }

    const primaryFolder =
      cardFolders.find((f) => f.isPrimary)?.path || cardFolders[0]?.path || 'News/Daily';

    await onSave({
      title: cardTitle.trim(),
      description: cardDescription,
      type: cardType,
      feedId: cardFeedId || undefined,
      startDate: `${selectedDate}T12:00:00.000Z`,
      curator: cardCurator,
      sourceLink: cardSourceLink,
      folder: primaryFolder,
      folders: cardFolders,
      taxonomyPath: cardTaxonomyPath,
      hashtags: cardHashtags,
    });
  };

  return (
    <Drawer
      title="Преобразование вывода агента в карточку календаря"
      open={open}
      onClose={onClose}
      width={640}
      destroyOnClose
      extra={
        <Button
          type="primary"
          onClick={handleSave}
          loading={isPending}
          className="bg-primary text-on-primary font-bold"
        >
          Опубликовать в календарь
        </Button>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
            Заголовок карточки
          </label>
          <Input
            value={cardTitle}
            onChange={(e) => setCardTitle(e.target.value)}
            placeholder="Название события или материала..."
            className="font-medium"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
              Тип заметки
            </label>
            <NoteTypeSelect value={cardType} onChange={setCardType} />
          </div>

          <div>
            <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
              Куратор карточки
            </label>
            <Select
              value={cardCurator}
              onChange={setCardCurator}
              className="w-full"
              options={[
                ...ACTIVE_CURATOR_PERSONAS_LIST.map((p) => ({
                  value: p.id,
                  label: `${p.emoji} ${p.name} (${p.shortName})`,
                })),
                { value: 'usr-admin-999', label: '👤 Администратор редакции' },
              ]}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
            Целевая лента
          </label>
          <Select
            value={cardFeedId}
            onChange={setCardFeedId}
            className="w-full"
            placeholder="Выберите ленту..."
            options={feeds.map((f) => ({
              value: f.id,
              label: f.title,
            }))}
          />
        </div>

        <div>
          <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
            Папка в хранилище (Folder)
          </label>
          <FolderSelect
            value={cardFolders}
            onChange={(updated) => setCardFolders(updated)}
            placeholder="Укажите папку (например, Politics/Russia)..."
          />
        </div>

        <div>
          <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
            Иерархическая таксономия (Taxonomy Path)
          </label>
          <Input
            value={cardTaxonomyPath}
            onChange={(e) => setCardTaxonomyPath(e.target.value)}
            placeholder="например: politics.russia или tech.ai"
          />
        </div>

        <div>
          <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
            Хэштеги (Tags)
          </label>
          <HashtagInput
            value={cardHashtags}
            onChange={setCardHashtags}
            placeholder="Добавьте теги..."
          />
        </div>

        <div>
          <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">
            Markdown содержание карточки
          </label>
          <TextArea
            value={cardDescription}
            onChange={(e) => setCardDescription(e.target.value)}
            rows={8}
            className="font-mono text-xs"
          />
        </div>
      </div>
    </Drawer>
  );
};
