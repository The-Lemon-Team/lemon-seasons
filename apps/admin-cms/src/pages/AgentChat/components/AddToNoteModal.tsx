import React, { useState, useMemo } from 'react';
import {
  Modal,
  Tabs,
  Input,
  Button,
  Tag,
  Radio,
  Checkbox,
  message,
  notification,
  Spin,
  Empty,
} from 'antd';
import {
  FolderPlus,
  Link as LinkIcon,
  Search,
  Sparkles,
  FileText,
  Calendar,
  Radio as PodcastIcon,
  CheckCircle2,
  ExternalLink,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotes, useCreateNote, useUpdateNote } from '../../../api/queries';
import { NoteType, Note } from '../../../types';
import { NoteTypeBadge } from '../../../components/NoteTypeBadge';
import { useDebounce } from '../hooks/useDebounce';

export interface NoteAttachmentItem {
  title: string;
  summary?: string;
  rawText?: string;
  sourceUrl?: string;
  curator?: string;
  curatorId?: string;
  date?: string;
  tags?: string[];
}

interface AddToNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: NoteAttachmentItem | null;
  activeThread?: any;
  onDispatchChatMessage?: (prompt: string, forcedTarget?: string) => void;
  onSuccess?: (note: Note, action: 'attached' | 'created') => void;
}

export const AddToNoteModal: React.FC<AddToNoteModalProps> = ({
  isOpen,
  onClose,
  item,
  activeThread,
  onDispatchChatMessage,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'existing' | 'new'>('existing');

  // Search state for existing notes
  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebounce(searchText, 300);
  const [selectedParentNote, setSelectedParentNote] = useState<Note | null>(null);
  const [attachmentMode, setAttachmentMode] = useState<'child_note' | 'append_link'>('child_note');

  // New Super Note form state
  const isItContext = useMemo(() => {
    const threadTitle = activeThread?.title?.toLowerCase() || '';
    const target = activeThread?.targetAgent || item?.curatorId || '';
    return (
      threadTitle.includes('it') ||
      threadTitle.includes('habr') ||
      threadTitle.includes('хакер') ||
      threadTitle.includes('технолог') ||
      target === 'german-kernel' ||
      target === 'okatsiya'
    );
  }, [activeThread, item]);

  const isPoliticsContext = useMemo(() => {
    const threadTitle = activeThread?.title?.toLowerCase() || '';
    const target = activeThread?.targetAgent || item?.curatorId || '';
    return (
      threadTitle.includes('полит') ||
      threadTitle.includes('коллег') ||
      threadTitle.includes('санкц') ||
      target === 'ivan-bely' ||
      target === 'kirk-kitten' ||
      target === 'chen-wei' ||
      target === 'political-group'
    );
  }, [activeThread, item]);

  const defaultNewTitle = useMemo(() => {
    const dateScope = item?.date || activeThread?.dateScope || '2026';
    if (isItContext) {
      return `Журнал «Хакер» & Habr (${dateScope})`;
    }
    if (isPoliticsContext) {
      return `Политический дайджест: Контуры РФ и мира (${dateScope})`;
    }
    return item?.title ? `Super Note: ${item.title.substring(0, 45)}` : `Аналитическая Note (${dateScope})`;
  }, [isItContext, isPoliticsContext, item, activeThread]);

  const [newTitle, setNewTitle] = useState(defaultNewTitle);
  const [newFolder, setNewFolder] = useState(() =>
    isItContext ? 'Tech/Habr' : isPoliticsContext ? 'Politics/Daily' : 'General'
  );
  const [prepareForNotebookLM, setPrepareForNotebookLM] = useState(true);

  // Synchronize title when item changes
  React.useEffect(() => {
    if (isOpen) {
      setNewTitle(defaultNewTitle);
      setSelectedParentNote(null);
    }
  }, [isOpen, defaultNewTitle]);

  // Context-aware query for existing notes
  const tagFilter = isItContext ? 'tech' : isPoliticsContext ? 'politics' : undefined;
  const { data: notesData, isLoading: notesLoading } = useNotes({
    search: debouncedSearch || undefined,
    tagPath: debouncedSearch ? undefined : tagFilter,
    limit: 15,
  });

  const candidateNotes = notesData?.items || [];

  // Mutations
  const createNoteMutation = useCreateNote();
  const updateNoteMutation = useUpdateNote();

  if (!item) return null;

  const handleAttachToExisting = async () => {
    if (!selectedParentNote) {
      message.warning('Пожалуйста, выберите целевую Super Note из списка');
      return;
    }

    try {
      if (attachmentMode === 'child_note') {
        // Create Child Note linked via parentNoteId
        const createdChild = await createNoteMutation.mutateAsync({
          title: item.title,
          description: `## ${item.title}\n\n> **Куратор:** ${item.curator || 'Редакция'}  \n> **Источник:** ${item.sourceUrl ? `[Первоисточник](${item.sourceUrl})` : 'Внутренний мониторинг'}\n\n${item.summary || ''}\n\n${item.rawText || ''}`,
          type: NoteType.SINGLE,
          startDate: item.date || activeThread?.dateScope || new Date().toISOString().split('T')[0],
          parentNoteId: selectedParentNote.id,
          sourceLink: item.sourceUrl,
          curator: item.curator,
          folder: selectedParentNote.folders?.[0]?.folder?.path || newFolder,
          hashtags: item.tags,
        });

        notification.success({
          message: 'Материал успешно прикреплен к Note!',
          description: (
            <div className="space-y-2 mt-1">
              <p className="text-xs">
                Новость привязана как дочерняя заметка к Super Note «{selectedParentNote.title}».
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="small"
                  type="primary"
                  onClick={() => {
                    navigate(`/notes/${selectedParentNote.id}`);
                    onClose();
                  }}
                  className="bg-primary text-black font-semibold text-xs"
                >
                  <FileText className="w-3 h-3 mr-1" />
                  Открыть Super Note
                </Button>
                {onDispatchChatMessage && (
                  <Button
                    size="small"
                    onClick={() => {
                      onDispatchChatMessage(
                        `/notebook Сгенерируй дневник NotebookLM по материалам Super Note "${selectedParentNote.title}"`,
                        'notebook-producer'
                      );
                      onClose();
                    }}
                    className="border-primary/40 text-primary text-xs"
                  >
                    <PodcastIcon className="w-3 h-3 mr-1" />
                    Запустить NotebookLM
                  </Button>
                )}
              </div>
            </div>
          ),
          duration: 6,
        });

        onSuccess?.(createdChild, 'attached');
        onClose();
      } else {
        // Append link to parent note's description or links
        const existingDesc = selectedParentNote.description || '';
        const linkEntry = `\n\n- [${item.title}](${item.sourceUrl || '#'}) — *${item.curator || 'Куратор'}* (${item.date || '2026'}): ${item.summary || ''}`;
        const updatedDesc = `${existingDesc}\n### Прикрепленный материал:${linkEntry}`;

        const updated = await updateNoteMutation.mutateAsync({
          id: selectedParentNote.id,
          data: {
            description: updatedDesc,
          },
        });

        message.success(`Материал добавлен в список источников «${selectedParentNote.title}»`);
        onSuccess?.(updated as any, 'attached');
        onClose();
      }
    } catch (err: any) {
      message.error(err?.message || 'Не удалось прикрепить материал');
    }
  };

  const handleCreateSuperNote = async () => {
    if (!newTitle.trim()) {
      message.warning('Укажите название Super Note');
      return;
    }

    try {
      const parentDate = item.date || activeThread?.dateScope || new Date().toISOString().split('T')[0];
      const initialDescription = `# ${newTitle}\n\n> 📌 **Статус:** Сборка материалов для дайджеста / подкаста NotebookLM  \n> 👤 **Куратор:** ${item.curator || 'Герман «Кернел»'}  \n> 📅 **Период:** ${parentDate}  \n\n## 📚 Первичные источники и материалы кластера:\n- **${item.title}** (${item.sourceUrl ? `[Ссылка](${item.sourceUrl})` : 'Внутренний срез'}): ${item.summary || ''}\n\n---\n*Сформировано через конвейер Agent Chat в Lemon Calendarium.*`;

      const superNote = await createNoteMutation.mutateAsync({
        title: newTitle.trim(),
        description: initialDescription,
        type: NoteType.EVENT,
        startDate: parentDate,
        folder: newFolder,
        curator: item.curator || 'Редакция',
        sourceLink: item.sourceUrl,
        hashtags: [
          ...(item.tags || []),
          prepareForNotebookLM ? 'NotebookLM' : 'SuperNote',
          isItContext ? 'Хакер' : 'Аналитика',
        ],
      });

      // Also create the first child note if needed
      await createNoteMutation.mutateAsync({
        title: item.title,
        description: `## ${item.title}\n\n> **Куратор:** ${item.curator || 'Редакция'}\n\n${item.summary || ''}`,
        type: NoteType.SINGLE,
        startDate: parentDate,
        parentNoteId: superNote.id,
        sourceLink: item.sourceUrl,
        folder: newFolder,
        hashtags: item.tags,
      });

      notification.success({
        message: 'Super Note успешно создана!',
        description: (
          <div className="space-y-2 mt-1">
            <p className="text-xs">
              Создана Super Note «{superNote.title}» с прикрепленной первой новостью.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <Button
                size="small"
                type="primary"
                onClick={() => {
                  navigate(`/notes/${superNote.id}`);
                  onClose();
                }}
                className="bg-primary text-black font-semibold text-xs"
              >
                <FileText className="w-3 h-3 mr-1" />
                Открыть Note
              </Button>
              {prepareForNotebookLM && onDispatchChatMessage && (
                <Button
                  size="small"
                  onClick={() => {
                    onDispatchChatMessage(
                      `/notebook Создай дневник и аудио-обзор NotebookLM для Super Note "${superNote.title}"`,
                      'notebook-producer'
                    );
                    onClose();
                  }}
                  className="border-primary/40 text-primary text-xs"
                >
                  <PodcastIcon className="w-3 h-3 mr-1" />
                  Запустить NotebookLM (~3.5 мин)
                </Button>
              )}
            </div>
          </div>
        ),
        duration: 7,
      });

      onSuccess?.(superNote, 'created');
      onClose();
    } catch (err: any) {
      message.error(err?.message || 'Не удалось создать Super Note');
    }
  };

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={640}
      centered
      className="add-to-note-modal"
      title={
        <div className="flex items-center gap-2 text-white pr-6">
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <FolderPlus className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-bold">Добавить материал в базу знаний (Note +)</div>
            <div className="text-[10px] text-gray-400 font-normal">
              Подготовка контента для тематических дайджестов и подкастов NotebookLM
            </div>
          </div>
        </div>
      }
    >
      <div className="space-y-4 pt-2 text-xs">
        {/* Preview of item being added */}
        <div className="bg-[#12161f] border border-white/10 rounded-xl p-3 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
              Входящий материал
            </span>
          </div>
          <h4 className="text-xs font-bold text-white leading-snug line-clamp-2">{item.title}</h4>
          {item.summary && (
            <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">{item.summary}</p>
          )}
          <div className="flex items-center gap-2 pt-1 text-[10px] text-gray-400">
            {item.curator && <span>👤 {item.curator}</span>}
            {item.date && <span>📅 {item.date}</span>}
            {item.sourceUrl && (
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sky-400 hover:underline flex items-center gap-0.5 truncate max-w-[200px]"
              >
                <LinkIcon className="w-2.5 h-2.5" />
                <span>{item.sourceUrl}</span>
              </a>
            )}
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <Tabs
          activeKey={activeTab}
          onChange={(k) => setActiveTab(k as any)}
          items={[
            {
              key: 'existing',
              label: (
                <span className="flex items-center gap-1.5 text-xs">
                  <Layers className="w-3.5 h-3.5" />
                  <span>В существующую Super Note</span>
                </span>
              ),
              children: (
                <div className="space-y-3 pt-1">
                  {/* Context Banner */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10 text-[11px]">
                    <div className="flex items-center gap-1.5 text-gray-300">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        {isItContext
                          ? 'Контекст: IT, Habr & Журнал Хакер'
                          : isPoliticsContext
                          ? 'Контекст: Политика & Контуры РФ'
                          : 'Контекст: Общая хроника'}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono">Умная фильтрация</span>
                  </div>

                  {/* Search input */}
                  <Input
                    prefix={<Search className="w-3.5 h-3.5 text-gray-400" />}
                    placeholder="Быстрый поиск подходящей Note по названию..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    allowClear
                    className="bg-[#161b22] border-white/10 text-xs"
                  />

                  {/* Notes Candidates List */}
                  <div className="border border-white/10 rounded-xl overflow-hidden bg-[#161b22] max-h-52 overflow-y-auto custom-scrollbar">
                    {notesLoading ? (
                      <div className="py-8 flex justify-center">
                        <Spin size="small" />
                      </div>
                    ) : candidateNotes.length === 0 ? (
                      <div className="py-6 text-center text-gray-500">
                        <Empty
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          description="Подходящих Super Notes не найдено. Создайте новую на соседней вкладке."
                        />
                      </div>
                    ) : (
                      <div className="divide-y divide-white/5">
                        {candidateNotes.map((note) => {
                          const isSelected = selectedParentNote?.id === note.id;
                          return (
                            <div
                              key={note.id}
                              onClick={() => setSelectedParentNote(note)}
                              className={`p-2.5 flex items-start justify-between gap-2 cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-primary/20 border-l-2 border-primary'
                                  : 'hover:bg-white/5'
                              }`}
                            >
                              <div className="flex-1 min-w-0 space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <NoteTypeBadge type={note.type} size="sm" />
                                  <span
                                    className={`font-semibold text-xs truncate ${
                                      isSelected ? 'text-primary' : 'text-white'
                                    }`}
                                  >
                                    {note.title}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                  {note.curator && <span>👤 {note.curator}</span>}
                                  <span>📅 {note.startDate}</span>
                                  {note.childNotes && note.childNotes.length > 0 && (
                                    <span className="text-amber-300">
                                      🔗 {note.childNotes.length} дочерних заметок
                                    </span>
                                  )}
                                </div>
                              </div>
                              {isSelected && (
                                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Attachment Method Option */}
                  {selectedParentNote && (
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
                      <div className="font-semibold text-gray-300 text-[11px]">
                        Формат прикрепления к «{selectedParentNote.title}»:
                      </div>
                      <Radio.Group
                        value={attachmentMode}
                        onChange={(e) => setAttachmentMode(e.target.value)}
                        className="space-y-1.5 flex flex-col text-xs text-gray-300"
                      >
                        <Radio value="child_note" className="text-xs text-gray-300">
                          <span className="font-semibold">Дочерняя заметка (Child Note)</span>
                          <span className="block text-[10px] text-gray-400">
                            Создает отдельный тикет/подзадачу со ссылкой на родителя (модель Jira Story)
                          </span>
                        </Radio>
                        <Radio value="append_link" className="text-xs text-gray-300">
                          <span className="font-semibold">Добавить в список источников родителя</span>
                          <span className="block text-[10px] text-gray-400">
                            Вставляет ссылку и тезис непосредственно в текст основной Super Note
                          </span>
                        </Radio>
                      </Radio.Group>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                    <Button onClick={onClose} size="middle" className="text-xs">
                      Отмена
                    </Button>
                    <Button
                      type="primary"
                      onClick={handleAttachToExisting}
                      disabled={!selectedParentNote}
                      loading={createNoteMutation.isPending || updateNoteMutation.isPending}
                      className="bg-primary hover:bg-primary/90 text-black font-bold text-xs"
                    >
                      <FolderPlus className="w-3.5 h-3.5 mr-1" />
                      Прикрепить к выбранной Note
                    </Button>
                  </div>
                </div>
              ),
            },
            {
              key: 'new',
              label: (
                <span className="flex items-center gap-1.5 text-xs">
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Создать новую Super Note</span>
                </span>
              ),
              children: (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-gray-300 text-[11px] font-semibold mb-1">
                      Название новой Super Note:
                    </label>
                    <Input
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Например: Журнал «Хакер» (Сентябрь 2026)"
                      className="bg-[#161b22] border-white/10 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-gray-300 text-[11px] font-semibold mb-1">
                        Раздел / Папка:
                      </label>
                      <Input
                        value={newFolder}
                        onChange={(e) => setNewFolder(e.target.value)}
                        placeholder="Tech/Habr или Politics"
                        className="bg-[#161b22] border-white/10 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-[11px] font-semibold mb-1">
                        Ответственный куратор:
                      </label>
                      <Input
                        value={item.curator || (isItContext ? 'Герман «Кернел»' : 'Иван Белый')}
                        disabled
                        className="bg-[#161b22]/50 border-white/10 text-xs text-gray-400"
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                    <Checkbox
                      checked={prepareForNotebookLM}
                      onChange={(e) => setPrepareForNotebookLM(e.target.checked)}
                      className="text-xs text-gray-200 font-semibold"
                    >
                      Подготовить кластер под генерацию NotebookLM 🎙️
                    </Checkbox>
                    <p className="text-[10px] text-gray-400 pl-6 leading-relaxed">
                      Автоматически свяжет материалы, проставит теги синтеза и подготовит карточку к
                      генерации 2-голосного аудио-подкаста (Deep Dive Overview).
                    </p>
                  </div>

                  {/* Submit */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                    <Button onClick={onClose} size="middle" className="text-xs">
                      Отмена
                    </Button>
                    <Button
                      type="primary"
                      onClick={handleCreateSuperNote}
                      loading={createNoteMutation.isPending}
                      className="bg-primary hover:bg-primary/90 text-black font-bold text-xs"
                    >
                      <FolderPlus className="w-3.5 h-3.5 mr-1" />
                      Создать Super Note и прикрепить материал
                    </Button>
                  </div>
                </div>
              ),
            },
          ]}
        />
      </div>
    </Modal>
  );
};
