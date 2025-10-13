import * as Notifications from 'expo-notifications';
import { Platform, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';

async function createNotificationChannel() {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('chat_channel', {
        name: 'Chat Notifications',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [100, 200, 300, 400],
        enableVibrate: true,
        sound: 'chat_notification',
      });
      console.log('Chat channel created successfully');
      await Notifications.setNotificationChannelAsync('receipt_channel', {
        name: 'Receipt Notifications',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [100, 200, 300, 400],
        enableVibrate: true,
        sound: 'receipt_notification',
      });
      console.log('Receipt channel created successfully');
    } catch (error) {
      console.error('Error creating notification channels:', error);
      // Fallback to default sound
      await Notifications.setNotificationChannelAsync('chat_channel', {
        name: 'Chat Notifications',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [100, 200, 300, 400],
        enableVibrate: true,
        sound: 'default',
      });
      await Notifications.setNotificationChannelAsync('receipt_channel', {
        name: 'Receipt Notifications',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [100, 200, 300, 400],
        enableVibrate: true,
        sound: 'default',
      });
      console.log('Fallback to default sound for notification channels');
    }
  }
}

export const setupNotificationHandlers = async () => {
  const router = useRouter(); // Initialize router
  try {
    console.log('Starting notification handler setup');
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
      projectId: Constants.expoConfig.extra.eas.projectId,
    });
    console.log('Expo Push Token:', token.data);

    // Send token to backend
    const userId = await AsyncStorage.getItem('user_id');
    const authToken = await AsyncStorage.getItem('sessionToken');
    if (userId && authToken) {
      try {
        await api.post(
          '/api/register-device/',
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
      } catch (error) {
        if (error.response?.status === 403) {
          console.log('Authentication failed (403), navigating to login');
          // Navigate to login screen without clearing data
          router.replace('/login');
          return; // Exit to prevent further processing
        } else {
          console.error('Error sending device token to backend:', error);
        }
      }
    } else {
      console.log('No userId or authToken, navigating to login');
      router.replace('/login');
      return;
    }

    // Set foreground notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    // Handle notification taps
    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification response received:', JSON.stringify(response.notification.request.content, null, 2));
      try {
        const data = response.notification.request.content.data;
        if (data?.type && (data?.shop_id || data?.conversation_id)) {
          if (data.type === 'shop_post') {
            router.push({ pathname: '/shop/shop-page', params: { shopId: data.shop_id } });
          } else if (['receipt_created', 'receipt_status'].includes(data.type)) {
            router.push({
              pathname: data.type === 'receipt_status' && data.status === 'voided' ? '/shop/CustomerReceipts' : '/shop/ShopReceipts',
              params: { receiptId: data.receipt_id, shopId: data.shop_id },
            });
          } else if (['shop_review', 'shop_follower'].includes(data.type)) {
            router.push({
              pathname: 'shop/AdminShopPage',
              params: { shopId: data.shop_id },
            });
          } else if (data.type === 'chat_message') {
            router.push({
              pathname: 'shop/Conversation',
              params: {
                name: data.name,
                conversation_id: data.conversation_id,
                shop_id: data.shop_id,
                shop_is_active: data.shop_is_active,
                role: data.role,
                shopId: data.shopId,
              },
            });
          }
        }
      } catch (error) {
        console.error('Error handling notification response:', error);
      }
    });

    // Handle initial notification
    const initialNotification = await Notifications.getLastNotificationResponseAsync();
    if (initialNotification?.notification?.request?.content?.data) {
      console.log('App opened from terminated state:', JSON.stringify(initialNotification.notification.request.content, null, 2));
      try {
        const data = initialNotification.notification.request.content.data;
        if (data?.type && (data?.shop_id || data?.conversation_id)) {
          if (['shop_post', 'shop_review', 'shop_follower'].includes(data.type)) {
            router.push({ pathname: '/shop/shop-page', params: { shopId: data.shop_id } });
          } else if (['receipt_created', 'receipt_status'].includes(data.type)) {
            router.push({
              pathname: data.type === 'receipt_status' && data.status === 'voided' ? '/shop/CustomerReceipts' : '/shop/ShopReceipts',
              params: { receiptId: data.receipt_id, shopId: data.shop_id },
            });
          } else if (data.type === 'chat_message') {
            router.push({
              pathname: 'shop/Conversation',
              params: {
                name: data.name,
                conversation_id: data.conversation_id,
                shop_id: data.shop_id,
                shop_is_active: data.shop_is_active,
                role: data.role,
                shopId: data.shopId,
              },
            });
          }
        }
      } catch (error) {
        console.error('Error handling initial notification:', error);
      }
    }

    // Store notifications
    Notifications.addNotificationReceivedListener((notification) => {
      console.log('Foreground notification received:', JSON.stringify(notification.request.content, null, 2));
      try {
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
          channel_id: Platform.OS === 'android' ? notification.request.content.android?.channelId || 'unknown' : 'n/a',
          meta_data: {
            id: notification.request.content.data?.id,
            type: notification.request.content.data?.type,
            shop_id: notification.request.content.data?.shop_id,
            receipt_id: notification.request.content.data?.receipt_id,
            conversation_id: notification.request.content.data?.conversation_id,
            sender_id: notification.request.content.data?.sender_id,
            receiver_id: notification.request.content.data?.receiver_id,
            name: notification.request.content.data?.name,
            shop_is_active: notification.request.content.data?.shop_is_active,
            role: notification.request.content.data?.role,
            shopId: notification.request.content.data?.shopId,
          },
        };
        AsyncStorage.getItem('notifications').then((storedNotifications) => {
          try {
            let notifications = storedNotifications ? JSON.parse(storedNotifications) : [];
            if (!Array.isArray(notifications)) notifications = [];
            if (!notifications.some(n => n.id === notificationData.id)) {
              notifications = [notificationData, ...notifications];
              AsyncStorage.setItem('notifications', JSON.stringify(notifications));
              console.log('Notification stored:', notificationData);
            } else {
              console.log('Skipping duplicate notification:', notificationData.id);
            }
          } catch (error) {
            console.error('Error storing notifications:', error);
          }
        }).catch(error => {
          console.error('Error reading AsyncStorage:', error);
        });
      } catch (error) {
        console.error('Error handling received notification:', error);
      }
    });

    console.log('Notification handlers setup completed');
  } catch (error) {
    console.error('Error in setupNotificationHandlers:', error);
  }
};