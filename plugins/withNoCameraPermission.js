const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withNoCameraPermission(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    manifest['uses-permission'] = manifest['uses-permission'].filter(
      (perm) => perm.$['android:name'] !== 'android.permission.CAMERA'
    );
    return config;
  });
};