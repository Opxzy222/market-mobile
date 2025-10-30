# Preserve gRPC classes (for Google Places SDK)
-keep class io.grpc.** { *; }
-keepclassmembers class io.grpc.** { *; }
-dontwarn io.grpc.**

# Preserve Google Places SDK classes
-keep class com.google.android.libraries.places.** { *; }
-keepclassmembers class com.google.android.libraries.places.** { *; }
-dontwarn com.google.android.libraries.places.**

# Ignore time4j-android warning
-dontwarn de.dmarcini.submatix.android4.**

# Preserve Firebase classes
-keep class com.google.firebase.** { *; }
-keepclassmembers class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# Preserve Dojah SDK classes
-keep class com.dojah.** { *; }
-keepclassmembers class com.dojah.** { *; }
-dontwarn com.dojah.**

# Preserve Expo modules
-keep class expo.modules.** { *; }
-keepclassmembers class expo.modules.** { *; }
-dontwarn expo.modules.**

# Preserve WorkManager classes
-keep class androidx.work.** { *; }
-keepclassmembers class androidx.work.** { *; }
-dontwarn androidx.work.**

# Preserve React Native native modules
-keep class com.facebook.react.** { *; }
-keepclassmembers class com.facebook.react.** { *; }
-dontwarn com.facebook.react.**

# Preserve Expo app loader
-keep class expo.modules.adapters.react.apploader.** { *; }
-keepclassmembers class expo.modules.adapters.react.apploader.** { *; }
-dontwarn expo.modules.adapters.react.apploader.**