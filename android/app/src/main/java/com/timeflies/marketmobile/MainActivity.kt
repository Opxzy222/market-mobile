package com.timeflies.marketmobile;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;
import com.facebook.react.ReactActivity;

public class MainActivity extends ReactActivity {
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      NotificationChannel channel = new NotificationChannel(
          "default_channel",
          "Default Notifications",
          NotificationManager.IMPORTANCE_HIGH
      );
      channel.setDescription("Default channel for app notifications");
      channel.enableVibration(true);
      channel.setShowBadge(true);
      NotificationManager manager = getSystemService(NotificationManager.class);
      manager.createNotificationChannel(channel);
    }
  }

  @Override
  protected String getMainComponentName() {
    return "marketmobile";
  }
}