import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import ConnectionsPage from '../app/pages/ConnectionsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

const ConnectionsWrapper: React.FC = () => {
  const location = useLocation();
  return (
    <QueryClientProvider client={queryClient}>
      <ConnectionsPage key={location.pathname} />
    </QueryClientProvider>
  );
};

export default ConnectionsWrapper;
