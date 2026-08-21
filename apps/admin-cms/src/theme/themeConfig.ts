import { ThemeConfig, theme } from 'antd';

export const lentaThemeConfig: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    // Primary Olive Gold
    colorPrimary: '#c9cd58',
    colorPrimaryHover: '#e6e971',
    colorPrimaryActive: '#939626',
    colorPrimaryBg: 'rgba(201, 205, 88, 0.12)',

    // Surfaces & Backgrounds
    colorBgBase: '#121414',
    colorBgContainer: '#1f2020',
    colorBgElevated: '#292a2a',
    colorBgLayout: '#121414',
    colorBgSpotlight: '#343535',

    // Text & Content
    colorText: '#e3e2e2',
    colorTextSecondary: '#c9c7b2',
    colorTextTertiary: '#93927e',
    colorTextQuaternary: '#484837',

    // Borders & Outlines
    colorBorder: 'rgba(255, 255, 255, 0.08)',
    colorBorderSecondary: 'rgba(255, 255, 255, 0.05)',

    // Functional Colors
    colorSuccess: '#a4d0bf',
    colorWarning: '#e6e4bf',
    colorError: '#ffb4ab',
    colorInfo: '#a4d0bf',

    // Geometry & Typography
    borderRadius: 4,
    borderRadiusLG: 8,
    borderRadiusSM: 2,
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontFamilyCode: 'JetBrains Mono, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontSize: 14,
  },
  components: {
    Button: {
      borderRadius: 4,
      fontWeight: 600,
      controlHeight: 36,
      defaultBg: '#1f2020',
      defaultBorderColor: 'rgba(255, 255, 255, 0.1)',
      defaultColor: '#e3e2e2',
    },
    Input: {
      borderRadius: 4,
      colorBgContainer: '#1b1c1c',
      colorBorder: 'rgba(255, 255, 255, 0.1)',
      activeBorderColor: '#c9cd58',
      hoverBorderColor: 'rgba(201, 205, 88, 0.6)',
    },
    Select: {
      borderRadius: 4,
      colorBgContainer: '#1b1c1c',
      colorBorder: 'rgba(255, 255, 255, 0.1)',
    },
    DatePicker: {
      borderRadius: 4,
      colorBgContainer: '#1b1c1c',
      colorBorder: 'rgba(255, 255, 255, 0.1)',
    },
    Table: {
      colorBgContainer: '#1f2020',
      headerBg: '#292a2a',
      headerColor: '#c9c7b2',
      rowHoverBg: 'rgba(255, 255, 255, 0.04)',
      borderColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: 8,
    },
    Modal: {
      contentBg: '#292a2a',
      headerBg: '#292a2a',
      borderRadiusLG: 12,
    },
    Card: {
      colorBgContainer: '#1f2020',
      colorBorderSecondary: 'rgba(255, 255, 255, 0.05)',
      borderRadiusLG: 8,
    },
    Tag: {
      borderRadiusSM: 9999,
    },
    Tree: {
      colorBgContainer: 'transparent',
      nodeHoverBg: 'rgba(255, 255, 255, 0.05)',
      nodeSelectedBg: 'rgba(201, 205, 88, 0.15)',
    },
  },
};
