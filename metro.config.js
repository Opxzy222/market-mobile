const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add Dojah-specific Metro configurations
config.resolver.blockList = [
  ...Array.from(config.resolver.blockList ?? []),
  new RegExp(path.resolve('..', 'node_modules', 'react')),
  new RegExp(path.resolve('..', 'node_modules', 'react-native')),
];

config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, './node_modules'),
  path.resolve(__dirname, '../node_modules'),
];

config.watchFolders = [path.resolve(__dirname, '..')];

// Retain your existing transformer and resolver settings
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

config.resolver = {
  ...config.resolver,
  sourceExts: [...config.resolver.sourceExts, 'ts', 'tsx', 'svg'],
  alias: {
    '@/screens': './src/screens',
    '@/components': './src/components',
    '@/assets': './src/assets',
    '../storage/storage': './src/storage/storage.ts',
    '../storage/sqliteStorage.native': './src/storage/sqliteStorage.native.ts',
    '../src/storage/storage': './src/storage/storage.ts',
  },
};

module.exports = config;