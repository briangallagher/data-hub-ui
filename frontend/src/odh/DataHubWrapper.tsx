import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
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

const DataHubWrapper: React.FC = () => {
  const location = useLocation();
  return (
    <QueryClientProvider client={queryClient}>
      <DataRegistryPage key={location.pathname} />
    </QueryClientProvider>
  );
};

export default DataHubWrapper;
