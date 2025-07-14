const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withFirebaseManifest(config) {
  return withAndroidManifest(config, async (config) => {
    const mainApplication = config.modResults.manifest.application[0];
    mainApplication['meta-data'] = mainApplication['meta-data'] || [];
    mainApplication['meta-data'] = mainApplication['meta-data'].filter(
      (metaData) =>
        metaData.$['android:name'] !==
        'com.google.firebase.messaging.default_notification_color'
    );
    mainApplication['meta-data'].push({
      $: {
        'android:name': 'com.google.firebase.messaging.default_notification_color',
        'android:resource': '@color/notification_icon_color',
        'tools:replace': 'android:resource',
      },
    });
    return config;
  });
};