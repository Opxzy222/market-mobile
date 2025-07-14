const { withAndroidManifest, withMainApplication } = require('@expo/config-plugins');

const withCustomNotificationChannel = (config) => {
  // Add Firebase Messaging Service and meta-data to AndroidManifest.xml
  config = withAndroidManifest(config, async (config) => {
    const mainApplication = config.modResults.manifest.application[0];
    
    // Add MyFirebaseMessagingService
    mainApplication.service = mainApplication.service || [];
    if (!mainApplication.service.some(service => service.$['android:name'] === '.MyFirebaseMessagingService')) {
      mainApplication.service.push({
        $: {
          'android:name': '.MyFirebaseMessagingService',
          'android:exported': 'false',
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'com.google.firebase.MESSAGING_EVENT' } }],
          },
        ],
      });
    }

    // Add meta-data for default notification channel with tools:replace
    mainApplication['meta-data'] = mainApplication['meta-data'] || [];
    if (!mainApplication['meta-data'].some(meta => meta.$['android:name'] === 'com.google.firebase.messaging.default_notification_channel_id')) {
      mainApplication['meta-data'].push({
        $: {
          'android:name': 'com.google.firebase.messaging.default_notification_channel_id',
          'android:value': 'high_priority_channel',
          'tools:replace': 'android:value',
        },
      });
    }

    return config;
  });

  // Add MyFirebaseMessagingService to MainApplication.kt
  config = withMainApplication(config, async (config) => {
    let contents = config.modResults.contents;
    if (!contents.includes('class MyFirebaseMessagingService')) {
      const packageMatch = contents.match(/package\s+[\w.]+/);
      if (packageMatch) {
        const imports = `
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import com.google.firebase.messaging.FirebaseMessagingService
`;
        contents = contents.replace(
          packageMatch[0],
          `${packageMatch[0]}\n${imports}`
        );
      }
      const code = `
class MyFirebaseMessagingService : FirebaseMessagingService() {
    override fun onCreate() {
        super.onCreate()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                "high_priority_channel",
                "High Priority Notifications",
                NotificationManager.IMPORTANCE_HIGH
            )
            channel.description = "High priority channel for banners"
            channel.enableVibration(true)
            channel.vibrationPattern = longArrayOf(100, 200, 300, 400)
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }
}
`;
      contents += code;
      config.modResults.contents = contents;
    }
    return config;
  });

  return config;
};

module.exports = withCustomNotificationChannel;