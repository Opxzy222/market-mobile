import React, { useState, useEffect } from "react";
import { Tabs } from "expo-router";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import SubscriptionProvider from "@/components/SubscriptionProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import { SelectProvider } from '@mobile-reality/react-native-select-pro';
import { initializeDatabase } from '../src/storage/storage';

const linking = {
  prefixes: [Linking.createURL("/")],
  config: {
    screens: {
      "(tabs)/shop": "home",
      "(tabs)/placeholder": "messages",
      "(tabs)/status": "status",
      "(tabs)/myshop": "myshop",
      "(tabs)/account": "account",
      "(tabs)/profile": "profile",
      login: "login",
      signup: "signup",
      ChangePassword: "change-password",
      notFound: "*",
    },
  },
};

export default function RootLayout() {
  const [userId, setUserId] = useState<number | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    const setupDatabase = async () => {
      try {
        await initializeDatabase();
        console.log('Database initialized in layout');
      } catch (error) {
        console.error('Failed to initialize database in layout:', error);
      }
    };
    setupDatabase();
  }, []);

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

  useEffect(() => {
    if (!userId) return;

    const ws = new WebSocket(
      `wss://retail-alvinia-goza-f6a0e4f7.koyeb.app/ws/unread-messages/?userId=${userId}`
    );

    ws.onopen = () => {
      console.log("WebSocket connected");
      ws.send(JSON.stringify({ action: "get_unread_count" }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.unread_count !== undefined) {
        setUnreadCount(data.unread_count);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("WebSocket closed. Reconnecting...");
      setTimeout(() => {
        setSocket(
          new WebSocket(
            `wss://retail-alvinia-goza-f6a0e4f7.koyeb.app/ws/unread-messages/?userId=${userId}`
          )
        );
      }, 5000);
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, [userId]);

  return (
    <SelectProvider>
      <SubscriptionProvider userId={userId}>
        <Tabs
          linking={linking}
          screenOptions={{
            headerShown: false,
            tabBarShowLabel: true,
            tabBarStyle: {
              backgroundColor: "#ffffff",
              borderTopWidth: 0,
              elevation: 10,
              height: 60,
            },
            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: "600",
              marginBottom: 5,
              width: 70,
            },
            tabBarItemStyle: {
              justifyContent: "center",
              alignItems: "center",
            },
            tabBarActiveTintColor: "#007AFF",
            tabBarInactiveTintColor: "#000000",
            tabBarLabelPosition: "below-icon",
          }}
        >
          <Tabs.Screen
            name="(tabs)/shop"
            options={{
              title: "Home",
              tabBarIcon: ({ color }) => (
                <Ionicons name="home" color={color} size={22} />
              ),
            }}
          />
          <Tabs.Screen
            name="(tabs)/placeholder"
            options={{
              title: "Messages",
              tabBarIcon: ({ color }) => (
                <MaterialIcons name="message" color={color} size={22} />
              ),
              tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
            }}
          />
          <Tabs.Screen
            name="(tabs)/status"
            options={{
              title: "Status",
              tabBarIcon: ({ color }) => (
                <Ionicons name="time-outline" color={color} size={22} />
              ),
            }}
          />
          <Tabs.Screen
            name="(tabs)/myshop"
            options={{
              title: "My Shop",
              tabBarIcon: ({ color }) => (
                <FontAwesome5 name="store" color={color} size={22} />
              ),
            }}
          />
          <Tabs.Screen
            name="(tabs)/account"
            options={{
              title: "Account",
              tabBarIcon: ({ color }) => (
                <Ionicons name="card-outline" color={color} size={22} />
              ),
            }}
          />
          <Tabs.Screen
            name="(tabs)/profile"
            options={{
              title: "Profile",
              tabBarIcon: ({ color }) => (
                <Ionicons name="person-circle" color={color} size={22} />
              ),
            }}
          />

          {/* Non-tabbed routes */}
          <Tabs.Screen name="homepage" options={{ href: null }} />
          <Tabs.Screen name="+not-found" options={{ href: null }} />
          <Tabs.Screen name="index" options={{ href: null }} />
          <Tabs.Screen name="login" options={{ href: null }} />
          <Tabs.Screen name="signup" options={{ href: null }} />
          <Tabs.Screen name="shop/_layout" options={{ href: null }} />
          <Tabs.Screen name="(tabs)" options={{ href: null }} />
          <Tabs.Screen name="shop" options={{ href: null }} />
          <Tabs.Screen name="ChangePassword" options={{ href: null }} />
          <Tabs.Screen name="RequestToken" options={{ href: null }} />
          <Tabs.Screen name="ResetPassword" options={{ href: null }} />
          <Tabs.Screen name="VerifyEmail" options={{ href: null }} />
          <Tabs.Screen name="ForgotPassword" options={{ href: null }} />
          <Tabs.Screen name="EnterOtp" options={{ href: null }} />
        </Tabs>
      </SubscriptionProvider>
    </SelectProvider>
  );
}