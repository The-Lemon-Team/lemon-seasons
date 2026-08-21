/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#c9cd58",
        "primary-container": "#484a00",
        "on-primary": "#313300",
        "on-primary-container": "#e6e971",
        "primary-fixed": "#e6e971",
        "primary-fixed-dim": "#c9cd58",
        "on-primary-fixed": "#1c1d00",
        "on-primary-fixed-variant": "#484a00",
        "inverse-primary": "#606200",

        "secondary": "#c9c8a5",
        "secondary-container": "#48482d",
        "on-secondary": "#313219",
        "on-secondary-container": "#e6e4c0",
        "secondary-fixed": "#e6e4c0",
        "secondary-fixed-dim": "#c9c8a5",
        "on-secondary-fixed": "#1c1d06",
        "on-secondary-fixed-variant": "#48482d",

        "tertiary": "#a4d0bf",
        "tertiary-container": "#254e40",
        "on-tertiary": "#0a372b",
        "on-tertiary-container": "#bfecd9",
        "tertiary-fixed": "#bfecda",
        "tertiary-fixed-dim": "#a4d0bf",
        "on-tertiary-fixed": "#002117",
        "on-tertiary-fixed-variant": "#244e41",

        "error": "#ffb4ab",
        "error-container": "#93000a",
        "on-error": "#690005",
        "on-error-container": "#ffdad6",

        "surface": "#121414",
        "surface-dim": "#121414",
        "surface-bright": "#393939",
        "surface-container-lowest": "#0d0e0f",
        "surface-container-low": "#1b1c1c",
        "surface-container": "#1f2020",
        "surface-container-high": "#292a2a",
        "surface-container-highest": "#343535",
        "surface-variant": "#343535",
        "surface-tint": "#c9cd58",

        "background": "#121414",
        "on-background": "#e3e2e2",
        "on-surface": "#e3e2e2",
        "on-surface-variant": "#c9c7b2",
        "inverse-surface": "#e3e2e2",
        "inverse-on-surface": "#303031",

        "outline": "#93927e",
        "outline-variant": "#484837",
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "sm": "0.125rem",
        "md": "0.375rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      spacing: {
        "container-padding": "24px",
        "unit": "4px",
        "stack-sm": "8px",
        "stack-md": "16px",
        "stack-lg": "32px",
        "gutter": "16px"
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
        "body-md": ["Inter", "sans-serif"],
        "code-md": ["JetBrains Mono", "monospace"],
        "label-caps": ["JetBrains Mono", "monospace"],
        "metadata": ["JetBrains Mono", "monospace"],
        "display": ["Inter", "sans-serif"],
        "headline-md": ["Inter", "sans-serif"],
        "headline-sm": ["Inter", "sans-serif"],
      },
      fontSize: {
        "code-md": ["13px", { lineHeight: "1.5", fontWeight: "400" }],
        "metadata": ["12px", { lineHeight: "1.4", fontWeight: "400" }],
        "body-lg": ["16px", { lineHeight: "1.6", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        "headline-md": ["24px", { lineHeight: "1.3", fontWeight: "600" }],
        "label-caps": ["11px", { lineHeight: "1.2", letterSpacing: "0.05em", fontWeight: "600" }],
        "headline-sm": ["18px", { lineHeight: "1.4", fontWeight: "600" }],
        "display": ["32px", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "600" }]
      }
    },
  },
  plugins: [],
}
