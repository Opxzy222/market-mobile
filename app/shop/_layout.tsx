// app/shop/_layout.tsx
import { Stack } from 'expo-router';

export default function ShopLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SearchResult" options={{ title: 'Search Results' }} />
      <Stack.Screen name="shop-page" options={{ title: 'Shop Page' }} />
    </Stack>
  );
}
