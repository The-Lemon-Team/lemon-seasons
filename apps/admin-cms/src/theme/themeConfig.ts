import { ThemeConfig, theme } from 'antd';

export const lentaDarkThemeConfig: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    // Primary Olive Gold
    colorPrimary: '#c9cd58',
    colorPrimaryHover: '#e6e971',
    colorPrimaryActive: '#939626',
    colorPrimaryBg: 'rgba(201, 205, 88, 0.12)',

    // Surfaces & Backgrounds
    colorBgBase: '#121414',
    colorBgContainer: '#1a1d22',
    colorBgElevated: '#21242a',
    colorBgLayout: '#07080a',
    colorBgSpotlight: '#2a2d34',

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

    // Geometry & Typography (Compact)
    borderRadius: 6,
    borderRadiusLG: 10,
    borderRadiusSM: 4,
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontFamilyCode: 'JetBrains Mono, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontSize: 12,
  },
  components: {
    Button: {
      borderRadius: 6,
      fontWeight: 500,
      controlHeight: 28,
      defaultBg: '#1f2020',
      defaultBorderColor: 'rgba(255, 255, 255, 0.1)',
      defaultColor: '#e3e2e2',
    },
    Input: {
      borderRadius: 6,
      controlHeight: 28,
      colorBgContainer: '#0c0e12',
      colorBorder: 'rgba(255, 255, 255, 0.08)',
      activeBorderColor: '#c9cd58',
      hoverBorderColor: 'rgba(201, 205, 88, 0.6)',
    },
    Select: {
      borderRadius: 6,
      controlHeight: 28,
      colorBgContainer: '#0c0e12',
      colorBorder: 'rgba(255, 255, 255, 0.08)',
    },
    DatePicker: {
      borderRadius: 6,
      controlHeight: 28,
      colorBgContainer: '#0c0e12',
      colorBorder: 'rgba(255, 255, 255, 0.08)',
    },
    Table: {
      colorBgContainer: 'transparent',
      headerBg: 'rgba(255, 255, 255, 0.03)',
      headerColor: '#c9c7b2',
      rowHoverBg: 'rgba(255, 255, 255, 0.04)',
      borderColor: 'rgba(255, 255, 255, 0.06)',
      borderRadius: 8,
      fontSize: 11,
    },
    Modal: {
      contentBg: '#16181d',
      headerBg: '#16181d',
      borderRadiusLG: 12,
    },
    Card: {
      colorBgContainer: '#16181d',
      colorBorderSecondary: 'rgba(255, 255, 255, 0.06)',
      borderRadiusLG: 8,
    },
    Tag: {
      borderRadiusSM: 4,
    },
    Tree: {
      colorBgContainer: 'transparent',
      nodeHoverBg: 'rgba(255, 255, 255, 0.05)',
      nodeSelectedBg: 'rgba(201, 205, 88, 0.15)',
    },
  },
};

export const lentaLightThemeConfig: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    // Primary Olive / Lemon Gold
    colorPrimary: '#707600',
    colorPrimaryHover: '#878e00',
    colorPrimaryActive: '#595d00',
    colorPrimaryBg: 'rgba(112, 118, 0, 0.08)',

    // Surfaces & Backgrounds (Crisp White & Architectural Platform)
    colorBgBase: '#ffffff',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBgLayout: '#eaedf2',
    colorBgSpotlight: '#1e293b',

    // Text & Content
    colorText: '#0f172a',
    colorTextSecondary: '#475569',
    colorTextTertiary: '#64748b',
    colorTextQuaternary: '#94a3b8',

    // Borders & Outlines
    colorBorder: 'rgba(15, 23, 42, 0.08)',
    colorBorderSecondary: 'rgba(15, 23, 42, 0.05)',

    // Functional Colors
    colorSuccess: '#16a34a',
    colorWarning: '#d97706',
    colorError: '#dc2626',
    colorInfo: '#0284c7',

    // Geometry & Typography (Compact)
    borderRadius: 6,
    borderRadiusLG: 10,
    borderRadiusSM: 4,
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontFamilyCode: 'JetBrains Mono, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontSize: 12,
  },
  components: {
    Button: {
      borderRadius: 6,
      fontWeight: 500,
      controlHeight: 28,
      defaultBg: '#ffffff',
      defaultBorderColor: 'rgba(15, 23, 42, 0.12)',
      defaultColor: '#0f172a',
    },
    Input: {
      borderRadius: 6,
      controlHeight: 28,
      colorBgContainer: '#ffffff',
      colorBorder: 'rgba(15, 23, 42, 0.12)',
      activeBorderColor: '#707600',
      hoverBorderColor: 'rgba(112, 118, 0, 0.6)',
      colorText: '#0f172a',
      colorTextPlaceholder: '#94a3b8',
    },
    Select: {
      borderRadius: 6,
      controlHeight: 28,
      colorBgContainer: '#ffffff',
      colorBorder: 'rgba(15, 23, 42, 0.12)',
    },
    DatePicker: {
      borderRadius: 6,
      controlHeight: 28,
      colorBgContainer: '#ffffff',
      colorBorder: 'rgba(15, 23, 42, 0.12)',
    },
    Table: {
      colorBgContainer: 'transparent',
      headerBg: '#f8fafc',
      headerColor: '#475569',
      rowHoverBg: 'rgba(15, 23, 42, 0.03)',
      borderColor: 'rgba(15, 23, 42, 0.06)',
      borderRadius: 8,
      fontSize: 11,
    },
    Modal: {
      contentBg: '#ffffff',
      headerBg: '#ffffff',
      borderRadiusLG: 12,
    },
    Card: {
      colorBgContainer: '#ffffff',
      colorBorderSecondary: 'rgba(15, 23, 42, 0.08)',
      borderRadiusLG: 8,
    },
    Tag: {
      borderRadiusSM: 4,
    },
    Tree: {
      colorBgContainer: 'transparent',
      nodeHoverBg: 'rgba(15, 23, 42, 0.04)',
      nodeSelectedBg: 'rgba(112, 118, 0, 0.1)',
    },
  },
};

// Default export alias for backward compatibility
export const lentaThemeConfig = lentaDarkThemeConfig;
