module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['@babel/plugin-transform-class-properties', { loose: true }],
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@/screens': './src/screens',
            '@/components': './src/components',
            '@/assets': './src/assets',
            '../storage/storage': './src/storage/storage.ts',
            '../storage/sqliteStorage.native': './src/storage/sqliteStorage.native.ts',
            '../src/storage/storage': './src/storage/storage.ts',
          },
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
      ],
      'react-native-reanimated/plugin', // Must be last
    ],
    env: {
      production: {
        plugins: ['transform-remove-console'],
      },
    },
  };
};