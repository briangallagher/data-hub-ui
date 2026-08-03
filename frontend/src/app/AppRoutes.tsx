import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { NotFound } from 'mod-arch-shared';
import { NavDataItem } from '~/app/standalone/types';
import useUser from './hooks/useUser';
import MainPage from './pages/MainPage';
import SettingsMainPage from './pages/SettingsMainPage';
import DataHubWrapper from '../odh/DataHubWrapper';

export const useAdminSettings = (): NavDataItem[] => {
  const { clusterAdmin } = useUser();

  if (!clusterAdmin) {
    return [];
  }

  return [
    {
      label: 'Settings',
      children: [{ label: 'Main View Settings', path: '/main-view-settings' }],
    },
  ];
};

export const useNavData = (): NavDataItem[] => {
  const baseNavItems: NavDataItem[] = [
    { label: 'Home', path: '/' },
    { label: 'Projects', path: '/projects' },
    {
      label: 'AI hub',
      children: [
        { label: 'Models', path: '/models' },
        { label: 'Data Registry', path: '/ai-hub/data/collections' },
      ],
    },
    {
      label: 'Develop & train',
      children: [{ label: 'Notebooks', path: '/notebooks' }],
    },
    { label: 'Learning resources', path: '/learning-resources' },
    {
      label: 'Applications',
      children: [{ label: 'Enabled', path: '/applications' }],
    },
  ];

  return [...baseNavItems, ...useAdminSettings()];
};

const AppRoutes: React.FC = () => {
  const { clusterAdmin } = useUser();

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/ai-hub/data/collections" replace />} />
      <Route path="/ai-hub/data/*" element={<DataHubWrapper />} />
      <Route path="/projects" element={<MainPage />} />
      <Route path="/models" element={<MainPage />} />
      <Route path="/notebooks" element={<MainPage />} />
      <Route path="/learning-resources" element={<MainPage />} />
      <Route path="/applications" element={<MainPage />} />
      <Route path="/main-view/*" element={<MainPage />} />
      <Route path="*" element={<NotFound />} />
      {clusterAdmin && <Route path="/main-view-settings/*" element={<SettingsMainPage />} />}
    </Routes>
  );
};

export default AppRoutes;
