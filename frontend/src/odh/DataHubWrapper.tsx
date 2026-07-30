import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Routes, Route, Navigate } from 'react-router-dom';
import DataRegistryPage from '../app/pages/DataRegistryPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

const DataHubWrapper: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <Routes>
      <Route path="collections" element={<DataRegistryPage />} />
      <Route path="connections" element={<Navigate to="/ai-hub/data/collections?tab=connections" replace />} />
      <Route path="*" element={<Navigate to="collections" replace />} />
    </Routes>
  </QueryClientProvider>
);

export default DataHubWrapper;
