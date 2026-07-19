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
      id: 'data-registry',
      title: 'Data Registry',
      href: '/ai-hub/data',
      section: 'ai-hub',
      path: '/ai-hub/data/*',
      group: '3_data_registry',
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
