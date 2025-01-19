// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false, // Ensures the header is hidden if needed
        tabBarShowLabel: true, // Show labels for tabs
      }}
    >
      {/* Define tab screens */}
      <Tabs.Screen name="shop" options={{ title: 'Shop' }} />
      <Tabs.Screen name="/(tabs)/myshop" options={{ title: 'My shop' }} />
      <Tabs.Screen name="placeholder" options={{ title: 'Placeholder' }} />
    </Tabs>
  );
}
