import { useState, useMemo, useCallback } from 'react';
import { message } from 'antd';
import { useMacros, useCreateMacro, useDeleteMacro } from '../../api/queries';
import { QuickAddMacro, NoteType, FolderInputItem } from '../../types';
import { useAdminI18n } from '../../i18n';

interface UseQuickAddMacrosProps {
  currentFeedId: string;
  currentFolders: FolderInputItem[];
  currentType: NoteType;
  onApply: (preset: {
    feedId: string;
    folders: FolderInputItem[];
    type: NoteType;
  }) => void;
  onClear: () => void;
}

export function useQuickAddMacros({
  currentFeedId,
  currentFolders,
  currentType,
  onApply,
  onClear,
}: UseQuickAddMacrosProps) {
  const { t } = useAdminI18n();
  const { data: macros = [], isLoading } = useMacros();
  const createMacroMutation = useCreateMacro();
  const deleteMacroMutation = useDeleteMacro();

  const [activeMacroId, setActiveMacroId] = useState<string | null>(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);

  // Активный макрос
  const activeMacro = useMemo(() => {
    return macros.find((m) => m.id === activeMacroId) || null;
  }, [macros, activeMacroId]);

  // Проверка: изменились ли поля формы по сравнению с активным пресетом (isDirty)
  const isDirty = useMemo(() => {
    if (!activeMacro) return false;

    const macroFeedId = activeMacro.feedId || '';
    const formFeedId = currentFeedId || '';
    if (macroFeedId !== formFeedId) return true;

    const macroFolders = (activeMacro.folderPaths || (activeMacro.folderPath ? [activeMacro.folderPath] : [])).sort();
    const formFolders = currentFolders.map((f) => f.path).sort();
    if (macroFolders.length !== formFolders.length) return true;
    for (let i = 0; i < macroFolders.length; i++) {
      if (macroFolders[i] !== formFolders[i]) return true;
    }

    if (activeMacro.noteType && activeMacro.noteType !== currentType) {
      return true;
    }

    return false;
  }, [activeMacro, currentFeedId, currentFolders, currentType]);

  // Выбор пресета
  const selectMacro = useCallback(
    (macro: QuickAddMacro | null) => {
      if (!macro) {
        setActiveMacroId(null);
        onClear();
        return;
      }

      setActiveMacroId(macro.id);
      const folders: FolderInputItem[] = (
        macro.folderPaths && macro.folderPaths.length > 0
          ? macro.folderPaths
          : macro.folderPath
          ? [macro.folderPath]
          : []
      ).map((path, idx) => ({
        path,
        isPrimary: idx === 0,
        order: idx,
      }));

      onApply({
        feedId: macro.feedId || '',
        folders,
        type: (macro.noteType as NoteType) || 'SINGLE',
      });
    },
    [onApply, onClear],
  );

  // Создание нового пресета
  const saveNewMacro = useCallback(
    async (name: string, description?: string) => {
      if (!name.trim()) return;

      const folderPaths = currentFolders.map((f) => f.path);
      const primaryFolder = folderPaths[0] || undefined;

      try {
        const created = await createMacroMutation.mutateAsync({
          name: name.trim(),
          description: description?.trim() || undefined,
          feedId: currentFeedId || undefined,
          folderPath: primaryFolder,
          folderPaths,
          noteType: currentType,
        });

        message.success(t.macroSaved);
        setActiveMacroId(created.id);
        setSaveModalOpen(false);
      } catch (err: any) {
        message.error(err.response?.data?.message || 'Error saving preset');
      }
    },
    [createMacroMutation, currentFeedId, currentFolders, currentType, t.macroSaved],
  );

  // Удаление макроса
  const deleteMacro = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await deleteMacroMutation.mutateAsync(id);
        message.info(t.macroDeleted);
        if (activeMacroId === id) {
          setActiveMacroId(null);
        }
      } catch (err: any) {
        message.error(err.response?.data?.message || 'Error deleting preset');
      }
    },
    [deleteMacroMutation, activeMacroId, t.macroDeleted],
  );

  return {
    macros,
    isLoading,
    activeMacroId,
    activeMacro,
    isDirty,
    saveModalOpen,
    setSaveModalOpen,
    selectMacro,
    saveNewMacro,
    deleteMacro,
    isSaving: createMacroMutation.isPending,
  };
}
