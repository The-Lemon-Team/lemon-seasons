import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { Spin } from 'antd';
import { lentaThemeConfig } from './theme/themeConfig';
import { AppLayout } from './components/AppLayout';
import { AdminI18nProvider, useAdminI18n } from './i18n';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const DashboardPage = React.lazy(() => import('./pages/Dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const AgentChatPage = React.lazy(() => import('./pages/AgentChat/AgentChatPage').then(m => ({ default: m.AgentChatPage })));
const NewsCurationPage = React.lazy(() => import('./pages/NewsCuration/NewsCurationPage').then(m => ({ default: m.NewsCurationPage })));
const FeedsPage = React.lazy(() => import('./pages/Feeds/FeedsPage').then(m => ({ default: m.FeedsPage })));
const NotesListPage = React.lazy(() => import('./pages/Notes/NotesListPage').then(m => ({ default: m.NotesListPage })));
const NoteEditorPage = React.lazy(() => import('./pages/NoteEditor/NoteEditorPage').then(m => ({ default: m.NoteEditorPage })));
const TaxonomyPage = React.lazy(() => import('./pages/Taxonomy/TaxonomyPage').then(m => ({ default: m.TaxonomyPage })));
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

  return (
    <ConfigProvider theme={lentaThemeConfig} locale={antdLocale}>
      <ErrorBoundary fallbackTitle="Критическая ошибка Project Lenta Admin">
        <BrowserRouter>
          <React.Suspense fallback={<PageLoadingFallback />}>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/chat" element={<AgentChatPage />} />
                <Route path="/news" element={<NewsCurationPage />} />
                <Route path="/feeds" element={<FeedsPage />} />
                <Route path="/notes" element={<NotesListPage />} />
                <Route path="/notes/new" element={<NoteEditorPage />} />
                <Route path="/notes/:id" element={<NoteEditorPage />} />
                <Route path="/taxonomy" element={<TaxonomyPage />} />
                <Route path="/generators" element={<GeneratorLabPage />} />
                <Route path="/sync" element={<DashboardPage />} />
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
      <AdminI18nProvider>
        <AppContent />
      </AdminI18nProvider>
    </QueryClientProvider>
  );
};

export default App;

