import React, { useState, useCallback, useMemo, memo, useRef, useEffect, useContext } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { SellerFloatingOrb } from '@/components/cart/SellerFloatingOrb';
import { CartProvider } from '@/context/CartContext';
import { FloatingCartOrb } from '@/components/cart/FloatingCartOrb';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { SelectProvider } from '@mobile-reality/react-native-select-pro';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, StyleSheet, TouchableOpacity, Animated, View, Text } from 'react-native';
import { usePathname, useRouter, useSegments } from 'expo-router';
import Toast from 'react-native-toast-message';
import { setupNotificationHandlers } from '@/components/NotificationHandlers';
import { initializeApp } from 'firebase/app';
import { AdProvider } from "@/context/AdContext";
import { AppResetContext } from '@/context/AppResetContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as WebBrowser from 'expo-web-browser';

// Call this early (e.g., in App.tsx or index.tsx)
WebBrowser.maybeCompleteAuthSession(); // Handles redirect callbacks

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase for mobile
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (e) {
  console.warn('Firebase app not initialized. Ensure native configuration files are set up:', e);
}

const linking = {
  prefixes: [Linking.createURL('/')],
  config: {
    screens: {
      index: '',
      '(tabs)': {
        path: 'tabs',
        screens: {
          shop: 'shop',
          status: 'status',
          messages: 'messages',
          myshop: 'myshop',
          account: 'account',
          profile: 'profile',
        },
      },
      shop: {
        path: 'shop',
        screens: {
          index: '',
          AdminShopPage: 'admin-shop-page',
          AllCategories: 'all-categories',
          AllFollowedShops: 'all-followed-shops',
          AllRecentShops: 'all-recent-shops',
          ChildCategoryList: 'child-category-list',
          Conversation: 'conversation',
          CreateShop: 'create-shop',
          CustomerReceipts: 'customer-receipts',
          Details: 'details',
          EditProfile: 'edit-profile',
          GenerateReceipt: 'generate-receipt',
          MessageList: 'message-list',
          ReceiptActions: 'receipt-actions',
          SearchResult: 'search-result',
          ShopProduct: 'shop-product',
          ShopProfile: 'shop-profile',
          ShopReceipts: 'shop-receipts',
          ShopStatus: 'shop-status',
          Signature: 'signature',
          StartConversation: 'start-conversation',
          SubcategoryList: 'subcategory-list',
          Subscription: 'subscription',
          UpdateProduct: 'update-product',
          WelcomeWorkingHours: 'welcome-working-hours',
          WorkingHours: 'working-hours',
          'shop-page': 'shop-page',
        },
      },
      login: 'login',
      signup: 'signup',
      ChangePassword: 'change-password',
      RequestToken: 'request-token',
      ResetPassword: 'reset-password',
      VerifyEmail: 'verify-email',
      ForgotPassword: 'forgot-password',
      EnterOtp: 'enter-otp',
      notFound: '*',
    },
  },
};

const MemoizedTabs = memo(Tabs);

const RootLayout = () => {
  const [userId, setUserId] = useState(null); // Removed TypeScript generic to avoid previous error
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState(null);
  const [resetKey, setResetKey] = useState(0);
  const insets = useSafeAreaInsets();
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef(null); // Added to track reconnection timeouts
  const maxReconnectAttempts = 5;
  const lastUnreadCountRef = useRef(0);
  const prevActiveTabRef = useRef(null);
  const pathname = usePathname();
  const router = useRouter();
  const segments = useSegments();

  // Animation refs
  const scaleAnims = useRef({
    shop: new Animated.Value(0.8),
    status: new Animated.Value(0.8),
    messages: new Animated.Value(0.8),
    myshop: new Animated.Value(0.8),
    account: new Animated.Value(0.8),
    profile: new Animated.Value(0.8),
  }).current;

  const resetAppState = useCallback(() => {
    setUserId(null);
    setUnreadCount(0);
    setSocket((prevSocket) => {
      if (prevSocket) {
        prevSocket.close();
      }
      return null;
    });
    reconnectAttemptsRef.current = 0;
    lastUnreadCountRef.current = 0;
    prevActiveTabRef.current = null;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    Object.keys(scaleAnims).forEach((key) => {
      scaleAnims[key].setValue(0.8);
      opacityAnims[key].setValue(0.6);
    });

    setResetKey((prev) => prev + 1);
   
    if (__DEV__) console.log('App state reset');
  }, []);

  const opacityAnims = useRef({
    shop: new Animated.Value(0.6),
    status: new Animated.Value(0.6),
    messages: new Animated.Value(0.6),
    myshop: new Animated.Value(0.6),
    account: new Animated.Value(0.6),
    profile: new Animated.Value(0.6),
  }).current;

  // Setup notification handlers
  useEffect(() => {
    setupNotificationHandlers();
  }, []);

  // Fetch userId on mount
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const userIdString = await AsyncStorage.getItem('user_id');
        if (userIdString) {
          const parsedId = parseInt(userIdString, 10);
          if (!isNaN(parsedId)) {
            if (__DEV__) console.log('Fetched userId:', parsedId);
            setUserId(parsedId);
          } else {
            if (__DEV__) console.warn('Invalid userId in AsyncStorage:', userIdString);
            Toast.show({
              type: 'error',
              text1: 'Session Error',
              text2: 'Please log in again.',
            });
            router.replace('/login');
          }
        } else {
          if (__DEV__) console.warn('No userId found in AsyncStorage');
          Toast.show({
            type: 'error',
            text1: 'Session Expired',
            text2: 'Please log in again.',
          });
          router.replace('/login');
        }
      } catch (error) {
        console.error('Error fetching user ID:', error);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to load session. Please try again.',
        });
      }
    };
    fetchUserId();
  }, [resetKey, router]);

  // Memoize WebSocket setup
  const setupWebSocket = useCallback(() => {
    if (!userId || reconnectAttemptsRef.current >= maxReconnectAttempts) {
      if (__DEV__) {
        console.log('Skipping WebSocket setup:', {
          userId,
          reconnectAttempts: reconnectAttemptsRef.current,
          maxReconnectAttempts,
        });
      }
      return () => {};
    }

    // Clear any existing reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    const ws = new WebSocket(
      `wss://retail-alvinia-goza-f6a0e4f7.koyeb.app/ws/unread-messages/?userId=${userId}`
    );

    ws.onopen = () => {
      if (__DEV__) console.log('Messages WebSocket connected for userId:', userId);
      reconnectAttemptsRef.current = 0;
      ws.send(JSON.stringify({ action: 'get_unread_count' }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (__DEV__) console.log('Messages WebSocket message received:', data);
        if (data.unread_count !== undefined && data.unread_count !== lastUnreadCountRef.current) {
          lastUnreadCountRef.current = data.unread_count;
          setUnreadCount(data.unread_count);
          if (__DEV__) console.log('Updated unreadCount:', data.unread_count);
        }
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };

    ws.onerror = (error) => {
      if (__DEV__) console.error('Messages WebSocket error:', error);
    };

    ws.onclose = (event) => {
      if (__DEV__) console.log('Messages WebSocket closed:', { code: event.code, reason: event.reason });
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current += 1;
        const delay = Math.pow(2, reconnectAttemptsRef.current) * 1000; // Exponential backoff: 1s, 2s, 4s, etc.
        if (__DEV__) console.log(`Reconnecting WebSocket (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}) in ${delay}ms`);
        reconnectTimeoutRef.current = setTimeout(setupWebSocket, delay);
      } else {
        if (__DEV__) console.log('Max reconnect attempts reached. WebSocket setup stopped.');
      }
    };

    setSocket(ws);

    return () => {
      if (__DEV__) console.log('Cleaning up WebSocket for userId:', userId);
      ws.close();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [userId]);

  // Setup WebSocket when userId changes
  useEffect(() => {
    if (__DEV__) console.log('WebSocket useEffect triggered:', { userId, socket: socket ? 'Connected' : 'Disconnected' });
    if (userId) {
      // Close any existing socket before setting up a new one
      if (socket) {
        if (__DEV__) console.log('Closing existing WebSocket before new setup');
        socket.close();
        setSocket(null);
      }
      return setupWebSocket();
    }
    return () => {
      if (socket) {
        if (__DEV__) console.log('Cleaning up WebSocket on userId change or unmount');
        socket.close();
        setSocket(null);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [userId, setupWebSocket]);

  // Memoize isShopActive and activeTab
  const { isShopActive, activeTab } = useMemo(() => {
    const normalizedPath = pathname.split('?')[0].replace(/\/+$/, '').toLowerCase();
    const otherTabNames = ['status', 'messages', 'myshop', 'account', 'profile'];
    const isShopSubRoute = 
      normalizedPath.startsWith('/shop/') ||
      normalizedPath.startsWith('/cart/');

    const isOtherTab = segments.includes('(tabs)') && otherTabNames.some((tab) => segments.includes(tab));
    const isShopActive = isOtherTab || isShopSubRoute;

    let activeTab = segments.includes('(tabs)') ? segments[segments.indexOf('(tabs)') + 1] : null;
    if (isShopSubRoute) {
      activeTab = 'shop';
    } else if (pathname === '/') {
      activeTab = 'shop';
    } else if (segments.includes('(tabs)') && activeTab === 'shop' && isShopActive) {
      activeTab = null;
    }

    return { isShopActive, activeTab };
  }, [pathname, segments]);

  // Animate only changed tabs
  useEffect(() => {
    if (activeTab !== prevActiveTabRef.current) {
      const tabsToAnimate = [activeTab, prevActiveTabRef.current].filter(Boolean) as string[];
      tabsToAnimate.forEach((tab) => {
        const isFocused = tab === activeTab;
        Animated.parallel([
          Animated.spring(scaleAnims[tab], {
            toValue: isFocused ? 1 : 0.8,
            friction: 6,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnims[tab], {
            toValue: isFocused ? 1 : 0.6,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      });
      prevActiveTabRef.current = activeTab;
    }
  }, [activeTab]);

  // Memoize tab buttons
  const tabButtons = useMemo(
    () => ({
      status: (props: any) => {
        const isFocused = activeTab === 'status';
        return (
          <TouchableOpacity
            {...props}
            style={styles.tabItem}
            onPress={() => router.replace('(tabs)/status')}
          >
            <View style={styles.iconContainer}>
              <Animated.View
                style={{
                  transform: [{ scale: scaleAnims.status }],
                  opacity: opacityAnims.status,
                }}
              >
                <Ionicons name="time-outline" size={24} color={isFocused ? '#1E88E5' : '#254D70'} />
              </Animated.View>
            </View>
            <Animated.Text
              style={[styles.tabLabel, { color: isFocused ? '#1E88E5' : '#254D70' }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              Updates
            </Animated.Text>
            {isFocused && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        );
      },
      messages: (props: any) => {
        const isFocused = activeTab === 'messages';
        return (
          <TouchableOpacity
            {...props}
            style={styles.tabItem}
            onPress={() => router.replace('(tabs)/messages')}
          >
            <View style={styles.iconContainer}>
              <Animated.View
                style={{
                  transform: [{ scale: scaleAnims.messages }],
                  opacity: opacityAnims.messages,
                }}
              >
                <MaterialIcons name="message" size={24} color={isFocused ? '#1E88E5' : '#254D70'} />
              </Animated.View>
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
              )}
            </View>
            <Animated.Text
              style={[styles.tabLabel, { color: isFocused ? '#1E88E5' : '#254D70' }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              Chats
            </Animated.Text>
            {isFocused && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        );
      },
      myshop: (props: any) => {
        const isFocused = activeTab === 'myshop';
        return (
          <TouchableOpacity
            {...props}
            style={styles.tabItem}
            onPress={() => router.replace('(tabs)/myshop')}
          >
            <View style={styles.iconContainer}>
              <Animated.View
                style={{
                  transform: [{ scale: scaleAnims.myshop }],
                  opacity: opacityAnims.myshop,
                }}
              >
                <FontAwesome5 name="store" size={24} color={isFocused ? '#1E88E5' : '#254D70'} />
              </Animated.View>
            </View>
            <Animated.Text
              style={[styles.tabLabel, { color: isFocused ? '#1E88E5' : '#254D70' }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              My Space
            </Animated.Text>
            {isFocused && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        );
      },
      account: (props: any) => {
        const isFocused = activeTab === 'account';
        return (
          <TouchableOpacity
            {...props}
            style={styles.tabItem}
            onPress={() => router.replace('(tabs)/account')}
          >
            <View style={styles.iconContainer}>
              <Animated.View
                style={{
                  transform: [{ scale: scaleAnims.account }],
                  opacity: opacityAnims.account,
                }}
              >
                <Ionicons name="card-outline" size={24} color={isFocused ? '#1E88E5' : '#254D70'} />
              </Animated.View>
            </View>
            <Animated.Text
              style={[styles.tabLabel, { color: isFocused ? '#1E88E5' : '#254D70' }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              Account
            </Animated.Text>
            {isFocused && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        );
      },
      profile: (props: any) => {
        const isFocused = activeTab === 'profile';
        return (
          <TouchableOpacity
            {...props}
            style={styles.tabItem}
            onPress={() => router.replace('(tabs)/profile')}
          >
            <View style={styles.iconContainer}>
              <Animated.View
                style={{
                  transform: [{ scale: scaleAnims.profile }],
                  opacity: opacityAnims.profile,
                }}
              >
                <Ionicons name="person-circle-outline" size={24} color={isFocused ? '#1E88E5' : '#254D70'} />
              </Animated.View>
            </View>
            <Animated.Text
              style={[styles.tabLabel, { color: isFocused ? '#1E88E5' : '#254D70' }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              Profile
            </Animated.Text>
            {isFocused && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        );
      },
    }),
    [activeTab, unreadCount, router]
  );

  // Custom shop tab button
  const shopTabButton = useCallback(
    (props: any) => {
      const isFocused = activeTab === 'shop';
      return (
        <TouchableOpacity
          {...props}
          style={styles.tabItem}
          onPress={() => router.replace(isShopActive ? '(tabs)/shop' : '/')}
        >
          <Animated.View
            style={[
              styles.iconContainer,
              {
                transform: [{ scale: scaleAnims.shop }],
                opacity: opacityAnims.shop,
              },
            ]}
          >
            <Ionicons
              name={isShopActive ? 'search-outline' : 'home-outline'}
              size={24}
              color={isFocused ? '#254D70' : '#254D70'}
            />
          </Animated.View>
          <Animated.Text
            style={[styles.tabLabel, { color: isFocused ? '#254D70' : '#254D70' }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {isShopActive ? 'Explore' : 'Home'}
          </Animated.Text>
        </TouchableOpacity>
      );
    },
    [isShopActive, activeTab, router]
  );

  // Memoize tab options
  const tabOptions = useMemo(
    () => ({
      headerShown: false,
      tabBarShowLabel: true,
      tabBarStyle: {
        backgroundColor: '#ECEFF1',
        borderTopWidth: 0,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 12,
        minHeight: 70,
        height: Platform.select({
          ios: 70 + insets.bottom,
          android: 60 + insets.bottom,
          default: 70,
        }),
        paddingBottom: insets.bottom || 10,
        paddingTop: 10,
        paddingHorizontal: '2%',
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
      },
      tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: '700',
        marginTop: 4,
        width: '100%',
        textAlign: 'center',
      },
      tabBarItemStyle: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 2,
        flex: 1,
      },
      tabBarActiveTintColor: '#1E88E5',
      tabBarInactiveTintColor: '#254D70',
      tabBarLabelPosition: 'below-icon' as const,
    }),
    [insets.bottom]
  );

  // Memoize screen options
  const screenOptions = useMemo(
    () => [
      { name: 'index', options: { href: null, tabBarStyle: { display: 'none' } } },
      {
        name: '(tabs)/shop',
        options: {
          title: isShopActive ? 'Explore' : 'Home',
          tabBarIcon: ({ color }: { color: string }) => (
            <Animated.View
              style={{
                transform: [{ scale: scaleAnims.shop }],
                opacity: opacityAnims.shop,
              }}
            >
              <Ionicons name={isShopActive ? 'search-outline' : 'home-outline'} size={24} color={color} />
            </Animated.View>
          ),
          tabBarButton: shopTabButton,
        },
      },
      {
        name: '(tabs)/status',
        options: {
          title: 'Updates',
          tabBarIcon: ({ color }: { color: string }) => (
            <Animated.View
              style={{
                transform: [{ scale: scaleAnims.status }],
                opacity: opacityAnims.status,
              }}
            >
              <Ionicons name="time-outline" color={color} size={24} />
            </Animated.View>
          ),
          tabBarButton: tabButtons.status,
        },
      },
      {
        name: '(tabs)/messages',
        options: {
          title: 'Messages',
          tabBarIcon: ({ color }: { color: string }) => (
            <View style={{ position: 'relative' }}>
              <Animated.View
                style={{
                  transform: [{ scale: scaleAnims.messages }],
                  opacity: opacityAnims.messages,
                }}
              >
                <MaterialIcons name="message" color={color} size={24} />
              </Animated.View>
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
              )}
            </View>
          ),
          tabBarButton: tabButtons.messages,
          tabBarBadge: undefined,
        },
      },
      {
        name: '(tabs)/myshop',
        options: {
          title: 'My Space',
          tabBarIcon: ({ color }: { color: string }) => (
            <Animated.View
              style={{
                transform: [{ scale: scaleAnims.myshop }],
                opacity: opacityAnims.myshop,
              }}
            >
              <FontAwesome5 name="store" color={color} size={24} />
            </Animated.View>
          ),
          tabBarButton: tabButtons.myshop,
        },
      },
      {
        name: '(tabs)/account',
        options: {
          title: 'Account',
          tabBarIcon: ({ color }: { color: string }) => (
            <Animated.View
              style={{
                transform: [{ scale: scaleAnims.account }],
                opacity: opacityAnims.account,
              }}
            >
              <Ionicons name="card-outline" color={color} size={24} />
            </Animated.View>
          ),
          tabBarButton: tabButtons.account,
        },
      },
      {
        name: '(tabs)/profile',
        options: {
          title: 'Profile',
          tabBarIcon: ({ color }: { color: string }) => (
            <Animated.View
              style={{
                transform: [{ scale: scaleAnims.profile }],
                opacity: opacityAnims.profile,
              }}
            >
              <Ionicons name="person-circle-outline" color={color} size={24} />
            </Animated.View>
          ),
          tabBarButton: tabButtons.profile,
        },
      },
      ...[
        'shop',
        'login',
        'signup',
        'ChangePassword',
        'RequestToken',
        'DeleteUser',
        'ResetPassword',
        'VerifyEmail',
        'ForgotPassword',
        'EnterOtp',
        '+not-found',
        'homepage',
        'PhoneVerification',
        'OTPVerification',
        'VerificationStatus',
        'IDVerification',
        'verification',
        'cart/editor',
        'cart/BuyerPODashboard',
        'cart/SellerPOEditor',
        'cart/SellerPODashboard',
        'cart/SellerPOCounter',
        'cart/BuyerPOEditor',
        'cart/BuyerCounterEditor'
      ].map((name) => ({
        name,
        options: {
          href: null,
          tabBarStyle:
            name === 'index' ||
            name === 'login' ||
            name === 'signup' ||
            name === 'ChangePassword' ||
            name === 'RequestToken' ||
            name === 'ResetPassword' ||
            name === 'VerifyEmail' ||
            name === 'ForgotPassword' ||
            name === 'EnterOtp' ||
            name === '+not-found' ||
            name === 'PhoneVerification' ||
            name === 'OTPVerification' ||
            name === 'VerificationStatus'
              ? { display: 'none' }
              : undefined,
        },
      })),
    ],
    [isShopActive, activeTab, shopTabButton, unreadCount, tabButtons]
  );

  return (
    <GestureHandlerRootView style={styles.container} key={resetKey}>
      <SafeAreaProvider>
        <SelectProvider>
          <CartProvider>
          
            <AdProvider>
              <AppResetContext.Provider value={{ resetAppState }}>
                <MemoizedTabs screenOptions={tabOptions}>
                  {screenOptions.map(({ name, options }) => (
                    <Tabs.Screen key={name} name={name} options={options} />
                  ))}
                </MemoizedTabs>
                <Toast position="top" topOffset={50} visibilityTime={7000} />
              </AppResetContext.Provider>
            </AdProvider>
            <SellerFloatingOrb />
            <FloatingCartOrb />
          </CartProvider>
          
        </SelectProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 5,
  },
  iconContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
    width: '100%',
    textAlign: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -5,
    width: 30,
    height: 3,
    backgroundColor: '#1E88E5',
    borderRadius: 2,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -10,
    backgroundColor: '#D32F2F',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
  },
});

export default memo(RootLayout);