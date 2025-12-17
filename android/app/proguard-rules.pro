# -------------------------------------------------
# React Native core
# -------------------------------------------------
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# -------------------------------------------------
# Reanimated (you already have this)
# -------------------------------------------------
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# -------------------------------------------------
# Firebase / FCM (notifications)
# -------------------------------------------------
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# -------------------------------------------------
# Expo modules (keep native classes)
# -------------------------------------------------
-keep class expo.modules.** { *; }
-keep class com.expo.** { *; }

# -------------------------------------------------
# Google Mobile Ads
# -------------------------------------------------
-keep class com.google.android.gms.ads.** { *; }
-dontwarn com.google.android.gms.ads.**

# -------------------------------------------------
# SQLite / SecureStore / Location / Sensors
# -------------------------------------------------
-keep class expo.modules.sqlite.** { *; }
-keep class expo.modules.securestore.** { *; }
-keep class expo.modules.location.** { *; }
-keep class expo.modules.sensors.** { *; }

# -------------------------------------------------
# General safety nets
# -------------------------------------------------
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes InnerClasses
-dontwarn okio.**
-dontwarn okhttp3.**