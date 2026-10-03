import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            const normalized = id.replace(/\\/g, '/');
            if (
              normalized.includes('/node_modules/react/') ||
              normalized.includes('/node_modules/react-dom/') ||
              normalized.includes('/node_modules/scheduler/') ||
              normalized.includes('/node_modules/react-router/') ||
              normalized.includes('/node_modules/react-router-dom/')
            ) {
              return 'vendor-react';
            }
            if (normalized.includes('/node_modules/lucide-react/')) {
              return 'vendor-icons';
            }
            if (normalized.includes('/node_modules/@tanstack/')) {
              return 'vendor-tanstack';
            }
            if (
              normalized.includes('/node_modules/react-markdown/') ||
              normalized.includes('/node_modules/remark-gfm/') ||
              normalized.includes('/node_modules/unified/') ||
              normalized.includes('/node_modules/micromark')
            ) {
              return 'vendor-markdown';
            }
            if (
              normalized.includes('/node_modules/antd/') ||
              normalized.includes('/node_modules/@ant-design/') ||
              normalized.includes('/node_modules/rc-')
            ) {
              return 'vendor-antd';
            }
            if (normalized.includes('/node_modules/dayjs/')) {
              return 'vendor-dayjs';
            }
          }
        },
      },
    },
  },
});
