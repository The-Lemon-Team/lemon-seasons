import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { Spin } from 'antd';
import { lentaDarkThemeConfig, lentaLightThemeConfig } from './theme/themeConfig';
import { ThemeProvider, useAppTheme } from './theme/ThemeContext';
import { AppLayout } from './components/AppLayout';
import { AdminI18nProvider, useAdminI18n } from './i18n';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const DashboardPage = React.lazy(() => import('./pages/Dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const FeedsPage = React.lazy(() => import('./pages/Feeds/FeedsPage').then(m => ({ default: m.FeedsPage })));
const NotesListPage = React.lazy(() => import('./pages/Notes/NotesListPage').then(m => ({ default: m.NotesListPage })));
const NoteEditorPage = React.lazy(() => import('./pages/NoteEditor/NoteEditorPage').then(m => ({ default: m.NoteEditorPage })));
const GeneratorLabPage = React.lazy(() => import('./pages/GeneratorLab/GeneratorLabPage').then(m => ({ default: m.GeneratorLabPage })));

const PageLoadingFallback = () => (
  <div className="flex h-full w-full items-center justify-center p-12">
    <Spin size="large" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5000,
    },
  },
});

const AppContent: React.FC = () => {
  const { antdLocale } = useAdminI18n();
  const { themeMode } = useAppTheme();
  const currentAntdTheme = themeMode === 'dark' ? lentaDarkThemeConfig : lentaLightThemeConfig;

  return (
    <ConfigProvider theme={currentAntdTheme} locale={antdLocale}>
      <ErrorBoundary fallbackTitle="Критическая ошибка Project Lenta Admin">
        <BrowserRouter>
          <React.Suspense fallback={<PageLoadingFallback />}>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/chat" element={<Navigate to="/notes" replace />} />
                <Route path="/news" element={<Navigate to="/notes" replace />} />
                <Route path="/feeds" element={<FeedsPage />} />
                <Route path="/notes" element={<NotesListPage />} />
                <Route path="/notes/new" element={<NoteEditorPage />} />
                <Route path="/notes/:id" element={<NoteEditorPage />} />
                <Route path="/taxonomy" element={<Navigate to="/notes" replace />} />
                <Route path="/generators" element={<GeneratorLabPage />} />
                <Route path="/sync" element={<Navigate to="/generators?tab=sparks" replace />} />
                <Route path="/bus" element={<Navigate to="/generators?tab=bus" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </React.Suspense>
        </BrowserRouter>
      </ErrorBoundary>
    </ConfigProvider>
  );
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AdminI18nProvider>
          <AppContent />
        </AdminI18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;

