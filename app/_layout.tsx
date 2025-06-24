import React, { useState, useCallback, useMemo, memo, useRef, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import SubscriptionProvider from '@/components/SubscriptionProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { SelectProvider } from '@mobile-reality/react-native-select-pro';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { usePathname, useRouter, useSegments } from 'expo-router';
import Toast from 'react-native-toast-message'

const linking = {
  prefixes: [Linking.createURL('/')],
  config: {
    screens: {
      index: '',
      '(tabs)': {
        path: 'tabs',
        screens: {
          shop: 'shop',
          messages: 'messages',
          status: 'status',
          myshop: 'myshop',
          account: 'account',
          profile: 'profile',
        },
      },
      shop: {
        path: 'shop',
        screens: {
          Conversation: 'conversation',
          ShopProfile: 'shop-profile',
          AdminShopPage: 'admin-shop-page',
          AllCategories: 'all-categories',
          AllFollowedShops: 'all-followed-shops',
          AllRecentShops: 'all-recent-shops',
          ChildCategoryList: 'child-category-list',
          CreateShop: 'create-shop',
          CustomerReceipts: 'customer-receipts',
          Details: 'details',
          EditProfile: 'edit-profile',
          GenerateReceipt: 'generate-receipt',
          MessageList: 'message-list',
          ReceiptActions: 'receipt-actions',
          SearchResult: 'search-result',
          ShopProduct: 'shop-product',
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
  const [userId, setUserId] = useState<number | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const insets = useSafeAreaInsets();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const lastUnreadCountRef = useRef(0);
  const pathname = usePathname();
  const router = useRouter();
  const segments = useSegments();

  // Memoize WebSocket setup to prevent re-creation
  const setupWebSocket = useCallback(() => {
    if (!userId || reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.log('Skipping WebSocket: no userId or max reconnects reached', { userId, attempts: reconnectAttemptsRef.current });
      return () => {};
    }

    const ws = new WebSocket(
      `wss://retail-alvinia-goza-f6a0e4f7.koyeb.app/ws/unread-messages/?userId=${userId}`
    );

    ws.onopen = () => {
      console.log('WebSocket connected');
      reconnectAttemptsRef.current = 0;
      ws.send(JSON.stringify({ action: 'get_unread_count' }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.unread_count !== undefined && data.unread_count !== lastUnreadCountRef.current) {
        lastUnreadCountRef.current = data.unread_count;
        console.log('Updating unread count:', data.unread_count);
        setUnreadCount(data.unread_count);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current += 1;
        console.log(`Reconnecting WebSocket (attempt ${reconnectAttemptsRef.current})`);
        setTimeout(setupWebSocket, 10000);
      } else {
        console.log('Max WebSocket reconnect attempts reached');
      }
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, [userId]);

  // Fetch userId only once on mount
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const userIdString = await AsyncStorage.getItem('user_id');
        if (userIdString) {
          const parsedId = parseInt(userIdString, 10);
          if (!isNaN(parsedId)) {
            console.log('Fetched userId:', parsedId);
            setUserId(parsedId);
          }
        }
      } catch (error) {
        console.error('Error fetching user ID:', error);
      }
    };
    fetchUserId();
  }, []);

  // Setup WebSocket only when userId changes
  useEffect(() => {
    if (userId) {
      return setupWebSocket();
    }
  }, [userId, setupWebSocket]);

  // Memoize isShopActive to reduce recalculations
  const isShopActive = useMemo(() => {
    const normalizedPath = pathname.split('?')[0].replace(/\/+$/, '').toLowerCase();
    const otherTabNames = ['messages', 'status', 'myshop', 'account', 'profile'];
    const isShopTab = segments.includes('(tabs)') && segments.includes('shop');
    const isOtherTab = segments.includes('(tabs)') && otherTabNames.some((tab) => segments.includes(tab));
    const isShopSubRoute = normalizedPath.startsWith('/shop/');
    const result = isOtherTab || isShopSubRoute;
    console.log('Evaluating isShopActive', {
      pathname,
      normalizedPath,
      segments,
      isShopTab,
      isOtherTab,
      isShopSubRoute,
      isShopActive: result,
      timestamp: new Date().toISOString(),
    });
    return result;
  }, [pathname, segments]);

  // Memoize tabBarButton to prevent re-creation
  const shopTabButton = useCallback(
    (props: any) => (
      <TouchableOpacity
        {...props}
        onPress={() => {
          console.log('Shop tab pressed', {
            isShopActive,
            destination: isShopActive ? '(tabs)/shop' : '/',
            pathname,
            segments,
            timestamp: new Date().toISOString(),
          });
          router.push(isShopActive ? '(tabs)/shop' : '/');
        }}
      />
    ),
    [isShopActive, router, pathname, segments]
  );

  // Memoize tab options to prevent style recalculation
  const tabOptions = useMemo(
    () => ({
      headerShown: false,
      tabBarShowLabel: true,
      tabBarStyle: {
        backgroundColor: '#E3F2FD',
        borderTopWidth: 0,
        elevation: 10,
        height: 60 + (Platform.OS === 'android' ? insets.bottom : 0),
        paddingBottom: Platform.OS === 'android' ? insets.bottom : 0,
        display: 'flex',
      },
      tabBarLabelStyle: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 5,
        width: 70,
      },
      tabBarItemStyle: {
        justifyContent: 'center',
        alignItems: 'center',
      },
      tabBarActiveTintColor: '#007AFF',
      tabBarInactiveTintColor: '#000000',
      tabBarLabelPosition: 'below-icon' as const,
    }),
    [insets.bottom]
  );

  // Memoize screen options to prevent re-creation
  const screenOptions = useMemo(
    () => [
      { name: 'index', options: { href: null, tabBarStyle: { display: 'none' } } },
      {
        name: '(tabs)/shop',
        options: {
          title: isShopActive ? 'Explore' : 'Home',
          tabBarIcon: ({ color }: { color: string }) => (
            <Ionicons name={isShopActive ? 'search-outline' : 'home-outline'} size={22} color={color} />
          ),
          tabBarButton: shopTabButton,
        },
      },
      {
        name: '(tabs)/messages',
        options: {
          title: 'Messages',
          tabBarIcon: ({ color }: { color: string }) => <MaterialIcons name='message' color={color} size={22} />,
          tabBarBadge: unreadCount > 0 ? unreadCount : null,
        },
      },
      {
        name: '(tabs)/status',
        options: {
          title: 'Status',
          tabBarIcon: ({ color }: { color: string }) => <Ionicons name='time-outline' color={color} size={22} />,
        },
      },
      {
        name: '(tabs)/myshop',
        options: {
          title: 'My Space',
          tabBarIcon: ({ color }: { color: string }) => <FontAwesome5 name='store' color={color} size={22} />,
        },
      },
      {
        name: '(tabs)/account',
        options: {
          title: 'Account',
          tabBarIcon: ({ color }: { color: string }) => <Ionicons name='card-outline' color={color} size={22} />,
        },
      },
      {
        name: '(tabs)/profile',
        options: {
          title: 'Profile',
          tabBarIcon: ({ color }: { color: string }) => (
            <Ionicons name='person-circle-outline' color={color} size={22} />
          ),
        },
      },
      // Non-tab screens
      ...[
        'shop/Conversation',
        'shop/ShopProfile',
        'shop/AdminShopPage',
        'shop/AllCategories',
        'shop/AllFollowedShops',
        'shop/AllRecentShops',
        'shop/ChildCategoryList',
        'shop/CreateShop',
        'shop/CustomerReceipts',
        'shop/Details',
        'shop/EditProfile',
        'shop/GenerateReceipt',
        'shop/MessageList',
        'shop/ReceiptActions',
        'shop/SearchResult',
        'shop/ShopProduct',
        'shop/ShopReceipts',
        'shop/ShopStatus',
        'shop/Signature',
        'shop/StartConversation',
        'shop/SubcategoryList',
        'shop/Subscription',
        'shop/UpdateProduct',
        'shop/WelcomeWorkingHours',
        'shop/WorkingHours',
        'shop/shop-page',
        'homepage',
        'login',
        'signup',
        'ChangePassword',
        'RequestToken',
        'ResetPassword',
        'VerifyEmail',
        'ForgotPassword',
        'EnterOtp',
        '+not-found',
      ].map((name) => ({
        name,
        options: { href: null, tabBarStyle: name === 'index' || name === 'login' || name === 'signup' || name === 'ChangePassword' || name === 'RequestToken' || name === 'ResetPassword' || name === 'VerifyEmail' || name === 'ForgotPassword' || name === 'EnterOtp' || name === '+not-found' ? { display: 'none' } : undefined },
      })),
    ],
    [isShopActive, shopTabButton, unreadCount]
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <SelectProvider>
          <SubscriptionProvider userId={userId}>
            <MemoizedTabs screenOptions={tabOptions}>
              {screenOptions.map(({ name, options }) => (
                <Tabs.Screen key={name} name={name} options={options} />
              ))}
            </MemoizedTabs>
            <Toast />
          </SubscriptionProvider>
        </SelectProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default memo(RootLayout);