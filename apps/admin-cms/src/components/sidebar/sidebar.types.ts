export interface AppSidebarProps {
  collapsed: boolean;
  verticalCollapsed?: boolean;
  onToggle: () => void;
  onToggleVertical?: () => void;
  onOpenQuickAdd: () => void;
}
