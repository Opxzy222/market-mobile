const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

module.exports = (async () => {
  const config = await getDefaultConfig(__dirname);

  // Ensure Metro resolves all required extensions
  config.resolver.sourceExts = [
    ...config.resolver.sourceExts,
    "jsx",
    "js",
    "ts",
    "tsx",
  ];

  // Add alias configuration for Metro bundler
  config.resolver.extraNodeModules = {
    ...config.resolver.extraNodeModules,
    "@": path.resolve(__dirname, "src"), // Alias for `@` pointing to `src`
  };

  return config;
})();
