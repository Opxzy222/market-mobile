import React, { useState, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import SubscriptionProvider from "@/components/SubscriptionProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function RootLayout() {
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const userIdString = await AsyncStorage.getItem("user_id");
        if (userIdString) {
          const parsedId = parseInt(userIdString, 10);
          if (!isNaN(parsedId)) {
            setUserId(parsedId);
          }
        }
      } catch (error) {
        console.error("Error fetching user ID:", error);
      }
    };

    fetchUserId();
  }, []);

  return (
    <SubscriptionProvider userId={userId}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopWidth: 0,
            elevation: 10,
            height: 60,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
            marginBottom: 5,
          },
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: '#000000',
        }}
      >
        {/* Home */}
        <Tabs.Screen
          name="(tabs)/shop"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" color={color} size={size || 24} />
            ),
          }}
        />

        {/* Messages */}
        <Tabs.Screen
          name="(tabs)/placeholder"
          options={{
            title: 'Messages',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="message" color={color} size={size || 24} />
            ),
          }}
        />

        {/* Status */}
        <Tabs.Screen
          name="(tabs)/status"
          options={{
            title: 'Status',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="time-outline" color={color} size={size || 24} />
            ),
          }}
        />

        {/* My Shop */}
        <Tabs.Screen
          name="(tabs)/myshop"
          options={{
            title: 'My Shop',
            tabBarIcon: ({ color, size }) => (
              <FontAwesome5 name="store" color={color} size={size || 24} />
            ),
          }}
        />

        {/* Account */}
        <Tabs.Screen
          name="(tabs)/account"
          options={{
            title: 'Account',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="card-outline" color={color} size={size || 24} />
            ),
          }}
        />

        {/* Profile */}
        <Tabs.Screen
          name="(tabs)/profile"
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
        <Tabs.Screen name="ChangePassword" options={{ href: null }} />
      </Tabs>
    </SubscriptionProvider>
  );
}
