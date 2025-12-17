const { AndroidConfig, withAndroidManifest } = require('@expo/config-plugins');

const { getMainApplicationOrThrow, addMetaDataItemToMainApplication } = AndroidConfig.Manifest;

module.exports = function withAdMobAppId(config) {
  return withAndroidManifest(config, async (config) => {
    const mainApplication = getMainApplicationOrThrow(config.modResults);

    addMetaDataItemToMainApplication(
      mainApplication,
      'com.google.android.gms.ads.APPLICATION_ID',
      'ca-app-pub-2360241039001516~8918197768'  // Your Android App ID
    );

    return config;
  });
};