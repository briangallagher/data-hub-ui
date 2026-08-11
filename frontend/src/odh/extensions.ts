const PLUGIN_DATA_HUB = 'plugin-data-hub';

const extensions: any[] = [
  {
    type: 'app.area',
    properties: {
      id: PLUGIN_DATA_HUB,
      featureFlags: ['disableFeatureStore'],
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [PLUGIN_DATA_HUB],
    },
    properties: {
      id: 'connections',
      title: 'Connections',
      href: '/ai-hub/connections',
      section: 'ai-hub',
      path: '/ai-hub/connections/*',
      group: '1_connections',
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [PLUGIN_DATA_HUB],
    },
    properties: {
      id: 'data-assets',
      title: 'Data assets',
      href: '/ai-hub/data',
      section: 'ai-hub',
      path: '/ai-hub/data/*',
      group: '2_data_assets',
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [PLUGIN_DATA_HUB],
    },
    properties: {
      path: '/ai-hub/connections/*',
      component: () => import('./ConnectionsWrapper'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [PLUGIN_DATA_HUB],
    },
    properties: {
      path: '/ai-hub/data/*',
      component: () => import('./DataHubWrapper'),
    },
  },
];

export default extensions;
