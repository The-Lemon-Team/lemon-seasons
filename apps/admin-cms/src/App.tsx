import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { lentaThemeConfig } from './theme/themeConfig';
import { AppLayout } from './components/AppLayout';
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { FeedsPage } from './pages/Feeds/FeedsPage';
import { NotesListPage } from './pages/Notes/NotesListPage';
import { NoteEditorPage } from './pages/NoteEditor/NoteEditorPage';
import { TaxonomyPage } from './pages/Taxonomy/TaxonomyPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5000,
    },
  },
});

export const App: React.FC = () => {
  return (
    <ConfigProvider theme={lentaThemeConfig}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/feeds" element={<FeedsPage />} />
              <Route path="/notes" element={<NotesListPage />} />
              <Route path="/notes/new" element={<NoteEditorPage />} />
              <Route path="/notes/:id" element={<NoteEditorPage />} />
              <Route path="/taxonomy" element={<TaxonomyPage />} />
              <Route path="/sync" element={<DashboardPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ConfigProvider>
  );
};

export default App;
