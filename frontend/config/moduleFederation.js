const path = require('path');
const { ModuleFederationPlugin } = require('@module-federation/enhanced/webpack');

const deps = require('../package.json').dependencies;

const moduleFederationConfig = {
  name: 'dataHub',
  filename: 'remoteEntry.js',

  shared: {
    react: { singleton: true, eager: true, requiredVersion: deps.react },
    'react-dom': { singleton: true, eager: true, requiredVersion: deps['react-dom'] },
    'react-router': { singleton: true, eager: true, requiredVersion: deps['react-router'] },
    'react-router-dom': { singleton: true, eager: true, requiredVersion: deps['react-router-dom'] },
    '@patternfly/react-core': { singleton: true, requiredVersion: deps['@patternfly/react-core'] },
  },
  exposes: {
    './extensions': './src/odh/extensions',
  },
  runtime: false,
  dts: false,
};

module.exports = {
  moduleFederationPlugins: [new ModuleFederationPlugin(moduleFederationConfig)],
};
