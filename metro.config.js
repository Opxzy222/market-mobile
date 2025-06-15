// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

module.exports = (async () => {
  const config = await getDefaultConfig(__dirname);
  return {
    ...config,
    resolver: {
      ...config.resolver,
      sourceExts: [...config.resolver.sourceExts, 'ts', 'tsx', 'native.ts'],
      assetExts: config.resolver.assetExts.filter(ext => ext !== 'wasm'),
      extraNodeModules: {
        '../storage/storage': './src/storage/storage.ts',
        '../storage/sqliteStorage.native': './src/storage/sqliteStorage.native.ts',
        '../src/storage/storage': './src/storage/storage.ts',
      },
      resolveRequest: (context, moduleName, platform) => {
        if (moduleName === '../storage/storage' || moduleName === '../src/storage/storage') {
          console.log('Metro resolving storage module:', moduleName);
          return {
            filePath: require.resolve('./src/storage/storage.ts'),
            type: 'sourceFile',
          };
        }
        return context.resolveRequest(context, moduleName, platform);
      },
    },
    transformer: {
      ...config.transformer,
      getTransformOptions: async () => ({
        transform: {
          experimentalImportSupport: false,
          inlineRequires: true,
        },
      }),
    },
    serializer: {
      ...config.serializer,
      experimentalSerializer: false,
    },
  };
})();