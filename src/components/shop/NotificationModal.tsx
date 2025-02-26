import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Modal from 'react-native-modal';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MERGE_TYPES = new Set(['shop_follower', 'shop_review', 'status_update']);

const NotificationDropdown = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadTypes, setUnreadTypes] = useState(new Set());
  const [menuVisible, setMenuVisible] = useState(false);
  const [userId, setUserId] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const socketRef = useRef(null);
  const isConnected = useRef(false);
  const isManuallyClosed = useRef(false);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchUserId = async () => {
      const userIdString = await AsyncStorage.getItem('user_id');
      if (userIdString) {
        setUserId(parseInt(userIdString, 10));
      }
    };

    const loadNotifications = async () => {
      const storedNotifications = await AsyncStorage.getItem('notifications');
      if (storedNotifications) {
        const parsed = JSON.parse(storedNotifications);
        setNotifications(parsed);
        updateUnreadCount(parsed);
      }
    };

    fetchUserId();
    loadNotifications();
  }, []);

  useEffect(() => {
    if (userId !== null && !isConnected.current) {
      connectWebSocket();
    }

    return () => {
      isManuallyClosed.current = true;
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [userId]);

  const connectWebSocket = () => {
    if (socketRef.current) return;

    const wsUrl = `ws://172.27.243.94:8001/ws/notifications/?user_id=${userId}`;
    socketRef.current = new WebSocket(wsUrl);

    socketRef.current.onopen = () => {
      console.log('✅ WebSocket Connected');
      isConnected.current = true;
      isManuallyClosed.current = false;
    };

    socketRef.current.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      setNotifications((prev) => processIncomingNotification(prev, data));
    };

    socketRef.current.onerror = (error) => {
      console.error('❌ WebSocket Error:', error);
    };

    socketRef.current.onclose = () => {
      console.log('⚠ WebSocket Disconnected');
      isConnected.current = false;
      socketRef.current = null;

      if (!isManuallyClosed.current) {
        setTimeout(connectWebSocket, 5000);
      }
    };
  };

  const processIncomingNotification = (prevNotifications, newNotification) => {
    console.log('Incoming Notification:', newNotification);

    let updatedNotifications = [...prevNotifications];

    if (newNotification.type === 'new_post') {
        const existingIndex = updatedNotifications.findIndex(
            (n) => n.type === 'new_post' && n.shop_id === newNotification.shop_id && !n.read
        );

        if (existingIndex !== -1) {
            // **Instead of adding counts, REPLACE the old unread notification**
            updatedNotifications[existingIndex] = {
                ...newNotification, 
                read: false,
                timestamp: timeAgo(newNotification.created_at) // Add formatted time
            };
        } else {
            // No unread notification for this shop, create a new one
            updatedNotifications = [{ ...newNotification, read: false, timestamp: timeAgo(newNotification.created_at) }, ...updatedNotifications];
        }
    } else if (MERGE_TYPES.has(newNotification.type)) {
        // Merge other notification types (only keep the latest unread one)
        updatedNotifications = updatedNotifications.filter((n) => n.type !== newNotification.type || n.read);
        updatedNotifications = [{ ...newNotification, read: false, timestamp: timeAgo(newNotification.created_at) }, ...updatedNotifications];
    } else {
        // Default behavior: add a new notification
        updatedNotifications = [{ ...newNotification, read: false, timestamp: timeAgo(newNotification.created_at) }, ...updatedNotifications];
    }

    // Save to AsyncStorage
    AsyncStorage.setItem('notifications', JSON.stringify(updatedNotifications));
    updateUnreadCount(updatedNotifications);

    return updatedNotifications;
};

const updateUnreadCount = (notifications) => {
    // Count only unique unread notifications
    const unreadCount = notifications.filter((n) => !n.read).length;

    console.log("Updated Unread Count:", unreadCount);
    setUnreadCount(unreadCount);
};

  const markNotificationAsRead = async () => {
    const updatedNotifications = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updatedNotifications);
    await AsyncStorage.setItem('notifications', JSON.stringify(updatedNotifications));
    updateUnreadCount(updatedNotifications);

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'mark_as_read' }));
    }
  };

  const handleNotificationPress = (item) => {
    markNotificationAsRead();
    if (item.type === 'shop_post' && item.shop_id) {
      navigation.navigate('ShopPost', { shopId: item.shop_id });
    }
  };

  const handleMenuOpen = () => {
  const updatedNotifications = notifications.map(n => ({
    ...n,
    timestamp: timeAgo(n.created_at) // Recalculate relative time
  }));
  
  setNotifications(updatedNotifications); // Update state with new timestamps
  setMenuVisible(true);
};

  const timeAgo = (timestamp) => {
  const now = new Date();
  const createdAt = new Date(timestamp);
  const diffInSeconds = Math.floor((now - createdAt) / 1000);

  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""} ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) return `${diffInWeeks} week${diffInWeeks > 1 ? "s" : ""} ago`;
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths} month${diffInMonths > 1 ? "s" : ""} ago`;
  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} year${diffInYears > 1 ? "s" : ""} ago`;
};


  return (
    <View style={styles.parentContainer}>
      <TouchableOpacity onPress={handleMenuOpen} style={styles.notificationIconContainer}>
        <Ionicons name="notifications-outline" size={28} color="#333" />
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
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleNotificationPress(item)}
                style={[styles.notificationItem, !item.read && styles.unreadNotification]}
              >
                <Image source={{ uri: item.image || 'https://via.placeholder.com/40' }} style={styles.avatar} />
                <View style={styles.textContainer}>
                  <Text style={styles.notificationText}>{item.message}</Text>
                  <Text style={styles.timestamp}>{item.timestamp}</Text>
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
    backgroundColor: '#f5f9ff', // Light blue background for unread notifications
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6', // Blue indicator bar
  },
  textContainer: {
    marginLeft: 10,
    flex: 1,
  },
  notificationText: {
    fontSize: 16,
    color: '#333',
  },
  boldText: {
    fontWeight: 'bold',
    color: '#1e40af', // Darker blue for emphasis on read messages
  },
  timestamp: {
    fontSize: 12,
    color: '#888',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
});

export default NotificationDropdown;