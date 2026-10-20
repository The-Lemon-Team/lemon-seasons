import React from 'react';
import { SidebarFoldedBar } from './sidebar/SidebarFoldedBar';
import { SidebarRail } from './sidebar/SidebarRail';
import { SidebarExpanded } from './sidebar/SidebarExpanded';
import { AppSidebarProps } from './sidebar/sidebar.types';

export type { AppSidebarProps };

export const AppSidebar: React.FC<AppSidebarProps> = (props) => {
  if (props.verticalCollapsed) {
    return <SidebarFoldedBar {...props} />;
  }

  if (props.collapsed) {
    return <SidebarRail {...props} />;
  }

  return <SidebarExpanded {...props} />;
};
