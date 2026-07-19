import React from 'react';
import { Navigate } from 'react-router-dom';

const ConnectionsPage: React.FC = () => (
  <Navigate to="/ai-hub/data/collections?tab=connections" replace />
);

export default ConnectionsPage;
