import { Stack } from 'expo-router';

export default function ShopLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: 'Shop Home' }} />
      <Stack.Screen name="AdminShopPage" options={{ title: 'Admin Page' }} />
      <Stack.Screen name="AllCategories" options={{ title: 'Categories' }} />
      <Stack.Screen name="SubcategoryList" options={{ title: 'Subcategories' }} />
      <Stack.Screen name="ShopPage" options={{ title: 'Shop Page' }} />
      <Stack.Screen name="CreateShop" options={{ title: 'Create Shop' }} />
      <Stack.Screen name="UpdateProduct" options={{ title: 'Update Product' }} />
    </Stack>
  );
}
