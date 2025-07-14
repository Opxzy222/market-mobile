import { Stack } from 'expo-router';

export default function ShopLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="AdminShopPage" options={{ title: 'Admin Shop' }} />
      <Stack.Screen name="AllCategories" options={{ title: 'All Categories' }} />
      <Stack.Screen name="AllFollowedShops" options={{ title: 'Followed Shops' }} />
      <Stack.Screen name="AllRecentShops" options={{ title: 'Recent Shops' }} />
      <Stack.Screen name="ChildCategoryList" options={{ title: 'Child Categories' }} />
      <Stack.Screen name="Conversation" options={{ title: 'Conversation' }} />
      <Stack.Screen name="CreateShop" options={{ title: 'Create Shop' }} />
      <Stack.Screen name="CustomerReceipts" options={{ title: 'Customer Receipts' }} />
      <Stack.Screen name="Details" options={{ title: 'Details' }} />
      <Stack.Screen name="EditProfile" options={{ title: 'Edit Profile' }} />
      <Stack.Screen name="GenerateReceipt" options={{ title: 'Generate Receipt' }} />
      <Stack.Screen name="MessageList" options={{ title: 'Message List' }} />
      <Stack.Screen name="ReceiptActions" options={{ title: 'Receipt Actions' }} />
      <Stack.Screen name="SearchResult" options={{ title: 'Search Result' }} />
      <Stack.Screen name="ShopProduct" options={{ title: 'Shop Product' }} />
      <Stack.Screen name="ShopProfile" options={{ title: 'Shop Profile' }} />
      <Stack.Screen name="ShopReceipts" options={{ title: 'Shop Receipts' }} />
      <Stack.Screen name="ShopStatus" options={{ title: 'Shop Status' }} />
      <Stack.Screen name="Signature" options={{ title: 'Signature' }} />
      <Stack.Screen name="StartConversation" options={{ title: 'Start Conversation' }} />
      <Stack.Screen name="SubcategoryList" options={{ title: 'Subcategories' }} />
      <Stack.Screen name="Subscription" options={{ title: 'Subscription' }} />
      <Stack.Screen name="UpdateProduct" options={{ title: 'Update Product' }} />
      <Stack.Screen name="WelcomeWorkingHours" options={{ title: 'Welcome Working Hours' }} />
      <Stack.Screen name="WorkingHours" options={{ title: 'Working Hours' }} />
      <Stack.Screen name="shop-page" options={{ title: 'Shop Page' }} />
    </Stack>
  );
}