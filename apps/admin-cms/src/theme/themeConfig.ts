import { ThemeConfig, theme } from 'antd';

export const lentaDarkThemeConfig: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    // Primary Atom Warm Lemon-Gold
    colorPrimary: '#e5c07b',
    colorPrimaryHover: '#f0d38d',
    colorPrimaryActive: '#c99a45',
    colorPrimaryBg: 'rgba(229, 192, 123, 0.12)',

    // Surfaces & Backgrounds (Atom One Dark slate palette)
    colorBgBase: '#1b1d23',
    colorBgContainer: '#282c34',
    colorBgElevated: '#2c313a',
    colorBgLayout: '#21252b',
    colorBgSpotlight: '#353b45',

    // Text & Content (One Dark typography)
    colorText: '#abb2bf',
    colorTextSecondary: '#828997',
    colorTextTertiary: '#5c6370',
    colorTextQuaternary: '#4b5263',

    // Borders & Outlines
    colorBorder: 'rgba(255, 255, 255, 0.09)',
    colorBorderSecondary: 'rgba(255, 255, 255, 0.06)',

    // Functional Colors (Atom Syntax Accents)
    colorSuccess: '#98c379',
    colorWarning: '#e5c07b',
    colorError: '#e06c75',
    colorInfo: '#61afef',

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
      defaultBg: '#282c34',
      defaultBorderColor: 'rgba(255, 255, 255, 0.11)',
      defaultColor: '#abb2bf',
    },
    Input: {
      borderRadius: 6,
      controlHeight: 28,
      colorBgContainer: '#1e2227',
      colorBorder: 'rgba(255, 255, 255, 0.11)',
      activeBorderColor: '#e5c07b',
      hoverBorderColor: 'rgba(229, 192, 123, 0.6)',
    },
    Select: {
      borderRadius: 6,
      controlHeight: 28,
      colorBgContainer: '#1e2227',
      colorBorder: 'rgba(255, 255, 255, 0.11)',
    },
    DatePicker: {
      borderRadius: 6,
      controlHeight: 28,
      colorBgContainer: '#1e2227',
      colorBorder: 'rgba(255, 255, 255, 0.11)',
    },
    Table: {
      colorBgContainer: 'transparent',
      headerBg: '#242830',
      headerColor: '#828997',
      rowHoverBg: 'rgba(255, 255, 255, 0.04)',
      borderColor: 'rgba(255, 255, 255, 0.08)',
      borderRadius: 8,
      fontSize: 11,
    },
    Modal: {
      contentBg: '#242830',
      headerBg: '#242830',
      borderRadiusLG: 12,
    },
    Card: {
      colorBgContainer: '#282c34',
      colorBorderSecondary: 'rgba(255, 255, 255, 0.08)',
      borderRadiusLG: 8,
    },
    Tag: {
      borderRadiusSM: 4,
    },
    Tree: {
      colorBgContainer: 'transparent',
      nodeHoverBg: 'rgba(255, 255, 255, 0.06)',
      nodeSelectedBg: 'rgba(229, 192, 123, 0.15)',
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

    // Text & Content (Softened ergonomic palette)
    colorText: '#383a42',
    colorTextSecondary: '#5c6370',
    colorTextTertiary: '#7c8492',
    colorTextQuaternary: '#9da3af',

    // Borders & Outlines (Expressive, clear structural borders)
    colorBorder: 'rgba(15, 23, 42, 0.18)',
    colorBorderSecondary: 'rgba(15, 23, 42, 0.12)',

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
      defaultBorderColor: 'rgba(15, 23, 42, 0.18)',
      defaultColor: '#383a42',
    },
    Input: {
      borderRadius: 6,
      controlHeight: 28,
      colorBgContainer: '#ffffff',
      colorBorder: 'rgba(15, 23, 42, 0.18)',
      activeBorderColor: '#707600',
      hoverBorderColor: 'rgba(112, 118, 0, 0.6)',
      colorText: '#383a42',
      colorTextPlaceholder: '#8b929e',
    },
    Select: {
      borderRadius: 6,
      controlHeight: 28,
      colorBgContainer: '#ffffff',
      colorBorder: 'rgba(15, 23, 42, 0.18)',
    },
    DatePicker: {
      borderRadius: 6,
      controlHeight: 28,
      colorBgContainer: '#ffffff',
      colorBorder: 'rgba(15, 23, 42, 0.18)',
    },
    Table: {
      colorBgContainer: 'transparent',
      headerBg: '#f1f5f9',
      headerColor: '#5c6370',
      rowHoverBg: 'rgba(15, 23, 42, 0.03)',
      borderColor: 'rgba(15, 23, 42, 0.18)',
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
      colorBorderSecondary: 'rgba(15, 23, 42, 0.16)',
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
