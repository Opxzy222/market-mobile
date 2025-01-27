import { Tabs, Stack } from 'expo-router';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

export default function RootLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: '#ffffff', // Modern white background
          borderTopWidth: 0, // Remove border for cleaner look
          elevation: 10, // Shadow for depth
          height: 60, // Slightly taller tab for better usability
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginBottom: 5, // Add spacing between text and icons
        },
        tabBarActiveTintColor: '#007AFF', // Active color (modern blue)
        tabBarInactiveTintColor: '#A0A0A0', // Inactive color (subtle gray)
      }}
    >
      {/* Home Tab */}
      <Tabs.Screen
        name="(tabs)/shop"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" color={color} size={size || 24} />
          ),
        }}
      />

      {/* Messages Tab */}
      <Tabs.Screen
        name="(tabs)/placeholder"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="message" color={color} size={size || 24} />
          ),
        }}
      />

      {/* My Shop Tab */}
      <Tabs.Screen
        name="(tabs)/myshop"
        options={{
          title: 'My Shop',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="store" color={color} size={size || 24} />
          ),
        }}
      />

      {/* Profile Tab */}
      <Tabs.Screen
        name="(tabs)/shopt"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle" color={color} size={size || 24} />
          ),
        }}
      />

      {/* Other screens outside of (tabs) */}
      
      <Tabs.Screen name="homepage" options={{ href: null }} />
      <Tabs.Screen name="+not-found" options={{ href: null }} />
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="login" options={{ href: null }} />
      <Tabs.Screen name="signup" options={{ href: null }} />
      <Tabs.Screen name="shop/_layout" options={{ href: null }} />
      <Tabs.Screen name="(tabs)" options={{ href: null }} />
      <Tabs.Screen name="shop" options={{ href: null }} />
    </Tabs>
  );
}
