import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Modal from 'react-native-modal';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import messaging from '@react-native-firebase/messaging';
import { setupNotificationHandlers } from '../NotificationHandlers';
import { v4 as uuidv4 } from 'uuid';

const MERGE_TYPES = new Set(['shop_follower', 'shop_review', 'shop_post']);
const FALLBACK_IMAGE_URL = 'https://via.placeholder.com/40';

const NotificationModal = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
  const [userId, setUserId] = useState(null);
  const socketRef = useRef(null);
  const isConnectedRef = useRef(false);
  const isManuallyClosedRef = useRef(false);
  const pendingNotificationsRef = useRef([]);
  const displayedNotificationIdsRef = useRef(new Set());
  const router = useRouter();
  const isMountedRef = useRef(true);

  const cleanOldDisplayedIds = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('displayed_notification_ids');
      if (stored) {
        const { ids, timestamp } = JSON.parse(stored);
        if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
          await AsyncStorage.removeItem('displayed_notification_ids');
          displayedNotificationIdsRef.current.clear();
          console.log('Cleared expired displayed notification IDs');
        }
      }
    } catch (error) {
      console.error('Error cleaning displayed notification IDs:', error);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    const initialize = async () => {
      try {
        await setupNotificationHandlers();
        const userIdString = await AsyncStorage.getItem('user_id');
        if (userIdString) {
          const id = parseInt(userIdString, 10);
          if (isMountedRef.current) setUserId(id);
        } else {
          console.warn('Missing user_id');
          router.push('/login');
        }

        const storedNotifications = await AsyncStorage.getItem('notifications');
        let filteredNotifications = [];
        if (storedNotifications) {
          const parsed = JSON.parse(storedNotifications);
          if (Array.isArray(parsed)) {
            const seenIds = new Set();
            filteredNotifications = parsed
              .filter((n) => {
                if (!n.id) {
                  console.warn('Notification missing id, assigning UUID:', JSON.stringify(n, null, 2));
                  n.id = uuidv4();
                }
                if (seenIds.has(n.id)) {
                  console.warn('Duplicate notification id found in storage:', n.id, JSON.stringify(n, null, 2));
                  return false;
                }
                seenIds.add(n.id);
                return (
                  n.id &&
                  n.type?.toLowerCase() !== 'chat_message' &&
                  n.type?.toLowerCase() !== 'unknown'
                );
              })
              .map((n) => ({
                ...n,
                timestamp: timeAgo(n.created_at),
                image: n.image || FALLBACK_IMAGE_URL,
              }));
            console.log('Loaded notifications from storage:', filteredNotifications.length);
            if (isMountedRef.current) {
              setNotifications(filteredNotifications);
              updateUnreadCount(filteredNotifications);
            }
            await AsyncStorage.setItem('notifications', JSON.stringify(filteredNotifications));
          } else {
            console.warn('Invalid notification data:', parsed);
            await AsyncStorage.setItem('notifications', JSON.stringify([]));
          }
        } else {
          console.log('No notifications in storage');
          await AsyncStorage.setItem('notifications', JSON.stringify([]));
        }

        const storedDisplayedIds = await AsyncStorage.getItem('displayed_notification_ids');
        if (storedDisplayedIds) {
          const { ids } = JSON.parse(storedDisplayedIds);
          displayedNotificationIdsRef.current = new Set(ids);
          console.log('Loaded displayed notification IDs:', ids.length);
        }
        await cleanOldDisplayedIds();
      } catch (error) {
        console.error('Error initializing:', error);
      }
    };
    initialize();

    const unsubscribeFCM = messaging().onMessage(async (remoteMessage) => {
      console.log('Foreground FCM message received:', JSON.stringify(remoteMessage, null, 2));
      try {
        if (remoteMessage?.notification) {
          let notificationData = {};
          if (remoteMessage.data?.body) {
            try {
              notificationData = JSON.parse(remoteMessage.data.body);
            } catch (e) {
              console.warn('Failed to parse data.body as JSON:', remoteMessage.data.body);
              notificationData = remoteMessage.data || {};
            }
          } else {
            notificationData = remoteMessage.data || {};
          }

          const notification = {
            id: notificationData.id || remoteMessage.messageId || uuidv4(),
            type: (notificationData.type || remoteMessage.data?.type || 'unknown').toLowerCase(),
            message: remoteMessage.notification.title || 'Notification',
            shop_id: notificationData.shop_id || remoteMessage.data?.shop_id,
            receipt_id: notificationData.receipt_id || remoteMessage.data?.receipt_id,
            conversation_id: notificationData.conversation_id || remoteMessage.data?.conversation_id,
            sender_id: notificationData.sender_id || remoteMessage.data?.sender_id,
            receiver_id: notificationData.receiver_id || remoteMessage.data?.receiver_id,
            po_id: notificationData.po_id || remoteMessage.data?.po_id,
            created_at: new Date().toISOString(),
            is_read: false,
            meta_data: {
              ...notificationData,
              po_id: notificationData.po_id || remoteMessage.data?.po_id,
              pickup_code: notificationData.pickup_code || remoteMessage.data?.pickup_code,
            },
            image: notificationData.image || FALLBACK_IMAGE_URL,
          };

          if (!notification.id) return;

          if (displayedNotificationIdsRef.current.has(notification.id)) return;

          Toast.show({
            type: 'info',
            text1: notification.message,
            autoHide: true,
            visibilityTime: 8000,
            position: 'top',
            topOffset: 60,
            onPress: () => handleNotificationPress(notification),
          });

          displayedNotificationIdsRef.current.add(notification.id);
          await AsyncStorage.setItem(
            'displayed_notification_ids',
            JSON.stringify({ ids: Array.from(displayedNotificationIdsRef.current), timestamp: Date.now() })
          );

          if (notification.type !== 'chat_message' && notification.type !== 'unknown') {
            pendingNotificationsRef.current = [...pendingNotificationsRef.current, notification];
          }
        }
      } catch (error) {
        console.warn('FCM notification error:', error);
      }
    });

    return () => {
      unsubscribeFCM();
      isMountedRef.current = false;
    };
  }, [router, cleanOldDisplayedIds]);

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

  useEffect(() => {
    if (menuVisible && isMountedRef.current) {
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          timestamp: timeAgo(n.created_at),
        }))
      );
    }
  }, [menuVisible]);

  useEffect(() => {
    const processPending = async () => {
      if (pendingNotificationsRef.current.length > 0 && isMountedRef.current) {
        const seenIds = new Set(notifications.map((n) => n.id));
        const newNotifications = pendingNotificationsRef.current.filter((n) => {
          if (!n.id) n.id = uuidv4();
          if (seenIds.has(n.id)) return false;
          seenIds.add(n.id);
          return n.id && n.type?.toLowerCase() !== 'chat_message' && n.type?.toLowerCase() !== 'unknown';
        });
        pendingNotificationsRef.current = [];
        if (newNotifications.length > 0) {
          setNotifications((prev) => {
            let updated = [...prev];
            newNotifications.forEach((notification) => {
              updated = processIncomingNotification(updated, notification);
            });
            return updated.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          });
        }
      }
    };
    const interval = setInterval(processPending, 500);
    return () => clearInterval(interval);
  }, [notifications]);

  const connectWebSocket = useCallback(() => {
    if (socketRef.current || !userId) return;
    const wsUrl = `wss://api.gogo-digital.com/ws/notifications/?user_id=${userId}`;
    console.log('Connecting to WebSocket:', wsUrl);
    socketRef.current = new WebSocket(wsUrl);

    socketRef.current.onopen = () => {
      console.log('Notification WebSocket Connected');
      isConnectedRef.current = true;
      isManuallyClosedRef.current = false;
    };

    socketRef.current.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        if (!data?.type) return;

        const notification = {
          id: data.id || uuidv4(),
          type: (data.type || 'unknown').toLowerCase(),
          message: data.message || 'Notification',
          shop_id: data.shop_id,
          receipt_id: data.meta_data?.receipt_id,
          conversation_id: data.meta_data?.conversation_id,
          sender_id: data.meta_data?.sender_id,
          receiver_id: data.meta_data?.receiver_id,
          po_id: data.meta_data?.po_id,
          created_at: data.created_at || new Date().toISOString(),
          is_read: data.is_read || false,
          meta_data: {
            ...data.meta_data,
            po_id: data.meta_data?.po_id,
            pickup_code: data.meta_data?.pickup_code,
          },
          image: data.meta_data?.image || FALLBACK_IMAGE_URL,
        };

        if (displayedNotificationIdsRef.current.has(notification.id)) return;

        Toast.show({
          type: 'info',
          text1: notification.message,
          autoHide: true,
          visibilityTime: 8000,
          position: 'top',
          topOffset: 60,
          onPress: () => handleNotificationPress(notification),
        });

        displayedNotificationIdsRef.current.add(notification.id);
        await AsyncStorage.setItem(
          'displayed_notification_ids',
          JSON.stringify({ ids: Array.from(displayedNotificationIdsRef.current), timestamp: Date.now() })
        );

        if (notification.type !== 'chat_message' && notification.type !== 'unknown') {
          pendingNotificationsRef.current = [...pendingNotificationsRef.current, notification];
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };

    socketRef.current.onerror = () => {
      isConnectedRef.current = false;
      socketRef.current = null;
      if (!isManuallyClosedRef.current) setTimeout(connectWebSocket, 5000);
    };

    socketRef.current.onclose = () => {
      isConnectedRef.current = false;
      socketRef.current = null;
      if (!isManuallyClosedRef.current) setTimeout(connectWebSocket, 5000);
    };
  }, [userId]);

  const processIncomingNotification = useCallback((prevNotifications, notification) => {
    if (!notification?.id || !notification?.type || notification.type.toLowerCase() === 'chat_message' || notification.type.toLowerCase() === 'unknown') {
      return prevNotifications;
    }
    if (prevNotifications.some((n) => n.id === notification.id)) return prevNotifications;

    let updatedNotifications = [...prevNotifications];

    if (MERGE_TYPES.has(notification.type)) {
      const existingIndex = updatedNotifications.findIndex(
        (n) => n.type === notification.type && n.shop_id === notification.shop_id && !n.is_read
      );
      if (existingIndex !== -1) {
        const count = (notification.meta_data?.count || 1) + (updatedNotifications[existingIndex].meta_data?.count || 0);
        updatedNotifications[existingIndex] = {
          ...notification,
          is_read: false,
          timestamp: timeAgo(notification.created_at),
          message: notification.type === 'shop_post' ? `${count} New post${count > 1 ? 's' : ''} from ${notification.meta_data.shop_name || 'Shop'}` : notification.message,
          meta_data: { ...notification.meta_data, count },
        };
      } else {
        updatedNotifications = [
          {
            ...notification,
            is_read: false,
            timestamp: timeAgo(notification.created_at),
            message: notification.type === 'shop_post' ? `1 New post from ${notification.meta_data.shop_name || 'Shop'}` : notification.message,
            meta_data: { ...notification.meta_data, count: 1 },
            image: notification.image || FALLBACK_IMAGE_URL,
          },
          ...updatedNotifications,
        ];
      }
    } else {
      updatedNotifications = [
        {
          ...notification,
          is_read: false,
          timestamp: timeAgo(notification.created_at),
          image: notification.image || FALLBACK_IMAGE_URL,
        },
        ...updatedNotifications,
      ];
    }

    updatedNotifications = updatedNotifications.filter(
      (n) => n.id && n.type.toLowerCase() !== 'chat_message' && n.type.toLowerCase() !== 'unknown'
    );
    AsyncStorage.setItem('notifications', JSON.stringify(updatedNotifications)).catch(() => { });
    updateUnreadCount(updatedNotifications);
    return updatedNotifications;
  }, []);

  const updateUnreadCount = useCallback((notifications) => {
    if (!isMountedRef.current) return;
    const unread = notifications.filter(
      (n) => !n.is_read && n.id && n.type.toLowerCase() !== 'chat_message' && n.type.toLowerCase() !== 'unknown'
    ).length;
    setUnreadCount(unread);
  }, []);

  const markNotificationAsRead = useCallback(async () => {
    if (!isMountedRef.current) return;
    const updatedNotifications = notifications.map((n) => ({ ...n, is_read: true }));
    const filteredNotifications = updatedNotifications.filter(
      (n) => n.id && n.type.toLowerCase() !== 'chat_message' && n.type.toLowerCase() !== 'unknown'
    );
    setNotifications(filteredNotifications);
    try {
      await AsyncStorage.setItem('notifications', JSON.stringify(filteredNotifications));
      updateUnreadCount(filteredNotifications);
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ action: 'mark_as_read' }));
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  }, [notifications]);

  const handleNotificationPress = useCallback(
  (item) => {
    setMenuVisible(false);
    if (item.type.toLowerCase() !== 'chat_message' && item.type.toLowerCase() !== 'unknown') {
      markNotificationAsRead();
    }

    // === PO NOTIFICATION — PERFECT ROLE DETECTION + NAVIGATION ===
    if (item.type === 'po_notification' && item.po_id) {
      const message = (item.message || '').toLowerCase();

      const isSeller =
        message.includes("new order from") ||
        message.includes("countered your offer") ||
        message.includes("accepted your offer") ||
        message.includes("is coming to pick up") ||
        message.includes("cancelled the order");

      const route = isSeller
        ? `/cart/SellerPOEditor?poId=${item.po_id}`
        : `/cart/BuyerPOEditor?poId=${item.po_id}`;

      router.push(route);
      return; // ← Stop here — no need to check other types
    }

    // === ALL OTHER NOTIFICATIONS — UNCHANGED ===
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
      // New receipt → always go to CustomerReceipts (for the buyer)
      if (item.receipt_id) {
        router.push({
          pathname: '/shop/CustomerReceipts',
          params: { receiptId: item.receipt_id, shopId: item.shop_id },
        });
      }
      break;

    case 'receipt_status':
      if (item.receipt_id) {
        const isVoided = item.meta_data?.status === 'voided' || item.status === 'voided';
    
        // If receipt was voided → notify customer → go to CustomerReceipts
        // Otherwise: accept/reject → notify shop owner → go to ShopReceipts
        const pathname = isVoided 
          ? '/shop/CustomerReceipts' 
          : '/shop/ShopReceipts';

        router.push({
          pathname,
          params: { receiptId: item.receipt_id, shopId: item.shop_id },
        });
      }
      break;

      case 'chat_message':
        if (item.conversation_id) {
          router.push({
            pathname: 'shop/Conversation',
            params: {
              name: item.meta_data.name,
              conversation_id: item.conversation_id,
              shop_id: item.meta_data.shop_id,
              shop_is_active: item.meta_data.shop_is_active,
              role: item.meta_data.role,
              shopId: item.meta_data.shopId,
            },
          });
        }
        break;

      default:
        break;
    }
  },
  [router, markNotificationAsRead]
);
  const handleMenuOpen = useCallback(() => {
    setMenuVisible(true);
  }, []);

  const timeAgo = useCallback((timestamp) => {
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
  }, []);

  const getItemLayout = useCallback(
    (data, index) => ({
      length: 60,
      offset: 60 * index,
      index,
    }),
    []
  );

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
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => {
              const isPO = item.type === 'po_notification';
              const messageText = item.message || '';
              const hasCode = messageText.includes('Code:') || messageText.includes('code:');

              return (
                <TouchableOpacity
                  onPress={() => handleNotificationPress(item)}
                  style={[styles.notificationItem, !item.is_read && styles.unreadNotification]}
                >
                  <View style={[styles.avatar, isPO && styles.poAvatar]}>
                    <Ionicons
                      name={isPO ? "cart-outline" : "notifications-outline"}
                      size={24}
                      color={isPO ? "#F59E0B" : "#666"}
                    />
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={styles.notificationText}>{messageText}</Text>
                    {hasCode && (
                      <Text style={styles.pickupCode}>
                        Pickup Code: <Text style={styles.code}>
                          {messageText.split('Code:')[1]?.trim() || messageText.split('code:')[1]?.trim()}
                        </Text>
                      </Text>
                    )}
                    <Text style={styles.timestamp}>{item.timestamp || 'Just now'}</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
            getItemLayout={getItemLayout}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            ListEmptyComponent={<Text style={styles.noNotifications}>No notifications available</Text>}
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  parentContainer: { position: 'relative', zIndex: 2001 },
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  poAvatar: {
    backgroundColor: '#FEF3C7',
  },
  textContainer: { flex: 1 },
  notificationText: { fontSize: 16, color: '#333', fontWeight: '500' },
  pickupCode: { fontSize: 13, color: '#666', marginTop: 4 },
  code: { fontWeight: 'bold', color: '#10B981' },
  timestamp: { fontSize: 12, color: '#888', marginTop: 4 },
  noNotifications: { textAlign: 'center', padding: 20, color: '#888' },
});

export default NotificationModal;