import React from 'react';
import { Zap, Sparkles, Plus, X, BookmarkPlus } from 'lucide-react';
import { QuickAddMacro } from '../../types';
import { useAdminI18n } from '../../i18n';

interface QuickAddMacroBarProps {
  macros: QuickAddMacro[];
  activeMacroId: string | null;
  isDirty: boolean;
  onSelect: (macro: QuickAddMacro | null) => void;
  onOpenSaveModal: () => void;
  onDeleteMacro: (id: string, e: React.MouseEvent) => void;
}

export const QuickAddMacroBar: React.FC<QuickAddMacroBarProps> = ({
  macros,
  activeMacroId,
  isDirty,
  onSelect,
  onOpenSaveModal,
  onDeleteMacro,
}) => {
  const { t } = useAdminI18n();

  return (
    <div className="bg-tile-subtle/80 border border-tile-border rounded-lg p-2 flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-mono text-[10px] font-semibold text-text-muted uppercase tracking-wider">
          <Zap className="w-3 h-3 text-amber-500" />
          <span>{t.macroLabel}</span>
          {isDirty && (
            <span className="text-amber-500 font-sans font-normal lowercase tracking-normal bg-amber-500/10 px-1 rounded text-[10px]">
              {t.macroModified}
            </span>
          )}
        </div>

        {/* Button to save new preset if modified or custom */}
        <button
          type="button"
          onClick={onOpenSaveModal}
          title={t.saveAsMacro}
          className="flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-500/10 px-2 py-0.5 rounded transition-colors"
        >
          <BookmarkPlus className="w-3 h-3" />
          <span>{t.saveAsMacro}</span>
        </button>
      </div>

      {/* Preset Chips Row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* No Preset Chip */}
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`h-6 px-2 rounded-md font-sans text-xs flex items-center gap-1 transition-all cursor-pointer ${
            activeMacroId === null
              ? 'bg-tile-border text-text-main font-semibold shadow-2xs'
              : 'bg-control text-text-muted hover:text-text-main hover:bg-tile border border-tile-border/40'
          }`}
        >
          <Sparkles className="w-3 h-3 opacity-70" />
          <span>{t.noMacro}</span>
        </button>

        {/* Macro Chips */}
        {macros.map((macro) => {
          const isActive = activeMacroId === macro.id;
          return (
            <div
              key={macro.id}
              onClick={() => onSelect(macro)}
              className={`group h-6 pl-2 pr-1.5 rounded-md font-sans text-xs flex items-center gap-1.5 transition-all cursor-pointer border ${
                isActive
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-300 font-semibold shadow-2xs'
                  : 'bg-control border-tile-border/40 text-text-muted hover:text-text-main hover:bg-tile'
              }`}
            >
              <Zap
                className={`w-3 h-3 ${
                  isActive ? 'text-amber-500 fill-amber-500' : 'text-text-muted/60'
                }`}
              />
              <span className="truncate max-w-[130px]">{macro.name}</span>

              {/* Delete button (only for non-system macros) */}
              {!macro.isSystem && (
                <button
                  type="button"
                  title="Удалить макрос"
                  onClick={(e) => onDeleteMacro(macro.id, e)}
                  className="opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-500 p-0.5 rounded transition-all text-text-muted ml-0.5"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
