import * as Notifications from 'expo-notifications';
import { Platform, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

async function createNotificationChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('high_priority_channel', {
      name: 'High Priority Notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [100, 200, 300, 400],
      enableVibrate: true,
      sound: 'default',
    });
  }
}

export const setupNotificationHandlers = async () => {
  try {
    // Request notification permissions
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.log('Notification permissions denied');
      Alert.alert(
        'Notifications Disabled',
        'Please enable notifications in your device settings to receive alerts.',
        [{ text: 'OK', onPress: () => Linking.openSettings() }]
      );
      return;
    }
    console.log('Notification permissions granted');

    await createNotificationChannel();

    // Get Expo push token
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: 'f80ca8bf-7b1e-44db-999f-2b562f845d48',
    });
    console.log('Expo Push Token:', token.data);

    // Send token to backend
    const userId = await AsyncStorage.getItem('user_id');
    const authToken = await AsyncStorage.getItem('sessionToken');
    if (userId && authToken) {
      await axios.post(
        'https://retail-alvinia-goza-f6a0e4f7.koyeb.app/api/register-device/',
        {
          user_id: userId,
          device_token: token.data,
        },
        {
          headers: { Authorization: authToken },
        }
      );
      console.log('Device token sent to backend for user_id:', userId);
      await AsyncStorage.setItem('expo_push_token', token.data);
    }

    // Set foreground notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    // Handle notification taps when app is in foreground or background
    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification response received:', JSON.stringify(response.notification.request.content, null, 2));
      const data = response.notification.request.content.data;
      if (data?.type && (data?.shop_id || data?.conversation_id)) {
        const router = require('expo-router').useRouter();
        if (['shop_post', 'shop_review', 'shop_follower'].includes(data.type)) {
          router.push({ pathname: '/shop/shop-page', params: { shopId: data.shop_id } });
        } else if (['receipt_created', 'receipt_status'].includes(data.type)) {
          router.push({
            pathname: data.type === 'receipt_status' && data.status === 'voided' ? '/shop/CustomerReceipts' : '/shop/ShopReceipts',
            params: { receiptId: data.receipt_id, shopId: data.shop_id },
          });
        } else if (data.type === 'chat_message') {
          router.push({
            pathname: 'shop/conversation',
            params: { conversation_id: data.conversation_id, shopId: data.shop_id },
          });
        }
      }
    });

    // Handle notifications when app is opened from terminated state
    const initialNotification = await Notifications.getLastNotificationResponseAsync();
    if (initialNotification?.notification?.request?.content?.data) {
      console.log('App opened from terminated state:', JSON.stringify(initialNotification.notification.request.content, null, 2));
      const data = initialNotification.notification.request.content.data;
      if (data?.type && (data?.shop_id || data?.conversation_id)) {
        const router = require('expo-router').useRouter();
        if (['shop_post', 'shop_review', 'shop_follower'].includes(data.type)) {
          router.push({ pathname: '/shop/shop-page', params: { shopId: data.shop_id } });
        } else if (['receipt_created', 'receipt_status'].includes(data.type)) {
          router.push({
            pathname: data.type === 'receipt_status' && data.status === 'voided' ? '/shop/CustomerReceipts' : '/shop/ShopReceipts',
            params: { receiptId: data.receipt_id, shopId: data.shop_id },
          });
        } else if (data.type === 'chat_message') {
          router.push({
            pathname: 'shop/conversation',
            params: { conversation_id: data.conversation_id, shopId: data.shop_id },
          });
        }
      }
    }

    // Store notifications for display
    Notifications.addNotificationReceivedListener((notification) => {
      console.log('Foreground notification received:', JSON.stringify(notification.request.content, null, 2));
      const notificationData = {
        id: notification.request.content.data?.id || Math.random().toString(),
        type: notification.request.content.data?.type || 'unknown',
        message: notification.request.content.title || 'Notification',
        shop_id: notification.request.content.data?.shop_id,
        receipt_id: notification.request.content.data?.receipt_id,
        conversation_id: notification.request.content.data?.conversation_id,
        sender_id: notification.request.content.data?.sender_id,
        receiver_id: notification.request.content.data?.receiver_id,
        created_at: new Date().toISOString(),
        is_read: false,
        meta_data: notification.request.content.data || {},
      };
      AsyncStorage.getItem('notifications').then((storedNotifications) => {
        let notifications = storedNotifications ? JSON.parse(storedNotifications) : [];
        if (!Array.isArray(notifications)) notifications = [];
        notifications = [notificationData, ...notifications];
        AsyncStorage.setItem('notifications', JSON.stringify(notifications));
        console.log('Notification stored:', notificationData);
      });
    });
  } catch (error) {
    console.error('Error setting up notification handlers:', error);
    if (error.response?.status === 403) {
      console.warn('Session expired, redirecting to login');
      AsyncStorage.removeItem('sessionToken');
      const router = require('expo-router').useRouter();
      router.push('/login');
    }
  }
};