import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, Alert, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Modal from 'react-native-modal';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import messaging from '@react-native-firebase/messaging';
import { setupNotificationHandlers } from '../NotificationHandlers';

const MERGE_TYPES = new Set(['shop_follower', 'shop_review']);

const NotificationModal = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
  const [userId, setUserId] = useState(null);
  const socketRef = useRef(null);
  const isConnectedRef = useRef(false);
  const isManuallyClosedRef = useRef(false);
  const pendingNotificationsRef = useRef([]);
  const router = useRouter();

  // Initialize WebSocket and notifications
  useEffect(() => {
    const initialize = async () => {
      try {
        // Setup FCM notifications
        await setupNotificationHandlers();

        // Fetch user ID
        const userIdString = await AsyncStorage.getItem('user_id');
        if (userIdString) {
          const id = parseInt(userIdString, 10);
          setUserId(id);
        } else {
          console.warn('Missing user_id');
          router.push('/login');
        }

        // Load stored notifications
        const storedNotifications = await AsyncStorage.getItem('notifications');
        if (storedNotifications) {
          const parsed = JSON.parse(storedNotifications);
          if (Array.isArray(parsed)) {
            setNotifications(parsed);
            updateUnreadCount(parsed);
          } else {
            console.warn('Invalid notification data:', parsed);
            setNotifications([]);
          }
        }
      } catch (error) {
        console.error('Error initializing:', error);
      }
    };
    initialize();

    // FCM foreground handler
    const unsubscribeFCM = messaging().onMessage(async (remoteMessage) => {
      console.log('Foreground FCM message received:', JSON.stringify(remoteMessage, null, 2));
      try {
        if (remoteMessage?.notification) {
          const notification = {
            id: remoteMessage.data?.id || Math.random().toString(),
            type: remoteMessage.data?.type || 'unknown',
            message: remoteMessage.notification.title || 'Notification',
            shop_id: remoteMessage.data?.shop_id,
            receipt_id: remoteMessage.data?.receipt_id,
            conversation_id: remoteMessage.data?.conversation_id,
            sender_id: remoteMessage.data?.sender_id,
            receiver_id: remoteMessage.data?.receiver_id,
            created_at: new Date().toISOString(),
            is_read: false,
            meta_data: remoteMessage.data || {},
          };
          console.log('FCM notification processed:', notification);
          pendingNotificationsRef.current = [...pendingNotificationsRef.current, notification];
          Toast.show({
            type: 'info',
            text1: notification.message,
            text2: remoteMessage.notification.body || `From shop ${notification.shop_id || 'unknown'}`,
            autoHide: true,
            visibilityTime: 8000,
            position: 'top',
            topOffset: 60,
            onPress: () => handleNotificationPress(notification),
          });
        }
      } catch (error) {
        console.warn('FCM notification error:', error);
      }
    });

    return () => {
      unsubscribeFCM();
    };
  }, []);

  // WebSocket connection
  useEffect(() => {
    if (userId !== null && !isConnectedRef.current) {
      connectWebSocket();
    }
    return () => {
      isManuallyClosedRef.current = true;
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [userId]);

  // Update timestamps when menu is visible
  useEffect(() => {
    if (menuVisible) {
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          timestamp: timeAgo(n.created_at),
        }))
      );
    }
  }, [menuVisible]);

  // Process pending notifications
  useEffect(() => {
    let isMounted = true;
    const processPending = async () => {
      if (pendingNotificationsRef.current.length > 0 && isMounted) {
        const newNotifications = [...pendingNotificationsRef.current];
        pendingNotificationsRef.current = [];
        setNotifications((prev) => {
          let updated = [...prev];
          newNotifications.forEach((notification) => {
            updated = processIncomingNotification(updated, notification);
          });
          return updated;
        });
      }
    };
    const interval = setInterval(processPending, 100);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const connectWebSocket = () => {
    if (socketRef.current) return;

    const wsUrl = `wss://retail-alvinia-goza-f6a0e4f7.koyeb.app/ws/notifications/?user_id=${userId}`;
    console.log('Connecting to WebSocket:', wsUrl);
    socketRef.current = new WebSocket(wsUrl);

    socketRef.current.onopen = () => {
      console.log('✅ Notification WebSocket Connected');
      isConnectedRef.current = true;
      isManuallyClosedRef.current = false;
    };

    socketRef.current.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message:', data);
        if (!data?.id || !data?.type) {
          console.warn('Invalid notification message:', data);
          return;
        }
        pendingNotificationsRef.current = [...pendingNotificationsRef.current, data];
      } catch (error) {
        console.error('WebSocket message error:', error, 'Raw data:', event.data);
      }
    };

    socketRef.current.onerror = (error) => {
      console.error('❌ Notification WebSocket Error:', error);
      isConnectedRef.current = false;
      socketRef.current = null;
      if (!isManuallyClosedRef.current) {
        setTimeout(() => {
          console.log('Retrying WebSocket connection...');
          connectWebSocket();
        }, 5000);
      }
    };

    socketRef.current.onclose = (event) => {
      console.log('⚠️ Notification WebSocket Disconnected:', { code: event.code, reason: event.reason });
      isConnectedRef.current = false;
      socketRef.current = null;
      if (!isManuallyClosedRef.current) {
        setTimeout(() => {
          console.log('Retrying WebSocket connection...');
          connectWebSocket();
        }, 5000);
      }
    };
  };

  const processIncomingNotification = (prevNotifications, notification) => {
    if (!notification?.id || !notification?.type) {
      console.warn('Invalid notification message:', notification);
      return prevNotifications;
    }
    if (prevNotifications.some((n) => n.id === notification.id)) {
      console.log('Duplicate notification ignored:', notification.id);
      return prevNotifications;
    }
    console.log('Adding new notification:', notification);

    if (!notification.is_read) {
      Toast.show({
        type: 'info',
        text1: notification.message,
        text2: `From shop ${notification.shop_id || 'unknown'}`,
        autoHide: true,
        visibilityTime: 8000,
        position: 'top',
        topOffset: 60,
        onPress: () => handleNotificationPress(notification),
      });
    }

    let updatedNotifications = [...prevNotifications];

    if (MERGE_TYPES.has(notification.type)) {
      const existingIndex = updatedNotifications.findIndex(
        (n) => n.type === notification.type && n.shop_id === notification.shop_id && !n.read
      );
      if (existingIndex !== -1) {
        updatedNotifications[existingIndex] = {
          ...notification,
          read: false,
          timestamp: timeAgo(notification.created_at),
          meta_data: {
            ...notification.meta_data,
            count: notification.meta_data?.count || 1,
          },
        };
      } else {
        updatedNotifications = [
          { ...notification, read: false, timestamp: timeAgo(notification.created_at) },
          ...updatedNotifications,
        ];
      }
    } else {
      updatedNotifications = [
        { ...notification, read: false, timestamp: timeAgo(notification.created_at) },
        ...updatedNotifications,
      ];
    }

    AsyncStorage.setItem('notifications', JSON.stringify(updatedNotifications)).catch((error) =>
      console.error('Error saving notifications:', error)
    );
    updateUnreadCount(updatedNotifications);
    return updatedNotifications;
  };

  const updateUnreadCount = (notifications) => {
    const unreadCount = notifications.filter((n) => !n.read).length;
    console.log('Updated Unread Count:', unreadCount);
    setUnreadCount(unreadCount);
  };

  const markNotificationAsRead = async () => {
    const updatedNotifications = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updatedNotifications);
    try {
      await AsyncStorage.setItem('notifications', JSON.stringify(updatedNotifications));
      updateUnreadCount(updatedNotifications);
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ action: 'mark_as_read' }));
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const handleNotificationPress = (item) => {
    setMenuVisible(false);
    markNotificationAsRead();
    const type = item.type?.toLowerCase() || '';

    switch (type) {
      case 'shop_post':
      case 'shop_review':
      case 'shop_follower':
        if (item.shop_id) {
          router.push({ pathname: '/shop/shop-page', params: { shopId: item.shop_id } });
        }
        break;
      case 'receipt_created':
      case 'receipt_status':
        if (item.receipt_id) {
          router.push({
            pathname: item.type === 'receipt_status' && item.meta_data?.status === 'voided' ? '/shop/CustomerReceipts' : '/shop/ShopReceipts',
            params: { receiptId: item.receipt_id, shopId: item.shop_id },
          });
        }
        break;
      case 'chat_message':
        if (item.conversation_id) {
          router.push({
            pathname: '/chat/[conversation_id]',
            params: { conversationId: item.conversation_id, shopId: item.shop_id },
          });
        }
        break;
      default:
        console.warn('Unhandled notification type:', type);
        break;
    }
  };

  const handleMenuOpen = () => {
    setMenuVisible(true);
  };

  const timeAgo = (timestamp) => {
    try {
      const now = new Date();
      const createdAt = new Date(timestamp);
      if (isNaN(createdAt.getTime())) return 'Just now';
      const diffInSeconds = Math.floor((now - createdAt) / 1000);
      if (diffInSeconds < 60) return 'Just now';
      const diffInMinutes = Math.floor(diffInSeconds / 60);
      if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
      const diffInWeeks = Math.floor(diffInDays / 7);
      if (diffInWeeks < 4) return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
      const diffInMonths = Math.floor(diffInDays / 30);
      if (diffInMonths < 12) return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
      const diffInYears = Math.floor(diffInDays / 365);
      return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`;
    } catch {
      return 'Just now';
    }
  };

  return (
    <View style={styles.parentContainer}>
      <TouchableOpacity onPress={handleMenuOpen} style={styles.notificationIconContainer}>
        <Ionicons name="notifications-outline" size={28} color="#FFFFFF" />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
      <Modal
        isVisible={menuVisible}
        onBackdropPress={() => setMenuVisible(false)}
        animationIn="fadeInDown"
        animationOut="fadeOutUp"
        backdropOpacity={0.3}
        style={styles.modalStyle}
        onModalHide={markNotificationAsRead}
      >
        <View style={styles.dropdownContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Notifications</Text>
            <TouchableOpacity onPress={() => setMenuVisible(false)}>
              <Ionicons name="close" size={24} color="black" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleNotificationPress(item)}
                style={[styles.notificationItem, !item.read && styles.unreadNotification]}
              >
                <Image source={{ uri: item.image || 'https://via.placeholder.com/40' }} style={styles.avatar} />
                <View style={styles.textContainer}>
                  <Text style={styles.notificationText}>{item.message || 'No message'}</Text>
                  <Text style={styles.timestamp}>{item.timestamp || 'Just now'}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  parentContainer: { position: 'relative' },
  notificationIconContainer: { position: 'relative', marginHorizontal: 10 },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'red',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  modalStyle: { justifyContent: 'flex-start', alignItems: 'flex-end', margin: 0 },
  dropdownContainer: {
    width: 320,
    backgroundColor: 'white',
    borderRadius: 8,
    paddingVertical: 10,
    elevation: 5,
    maxHeight: 500,
    marginTop: 50,
    marginRight: 10,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15, paddingBottom: 5 },
  title: { fontSize: 18, fontWeight: 'bold' },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: 'white',
  },
  unreadNotification: {
    backgroundColor: '#f5f9ff',
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  textContainer: { marginLeft: 10, flex: 1 },
  notificationText: { fontSize: 16, color: '#333' },
  timestamp: { fontSize: 12, color: '#888' },
  avatar: { width: 40, height: 40, borderRadius: 20 },
});

export default NotificationModal;