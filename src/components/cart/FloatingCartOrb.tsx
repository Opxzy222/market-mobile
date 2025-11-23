// components/cart/FloatingCartOrb.tsx
// NOVEMBER 19, 2025 — FINAL SMART COUNT: Number of shops with activity
// No double-counting, real-time, perfect

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { useCart } from '../../context/CartContext';
import { ShopSelectorModal } from './ShopSelectorModal';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api';

const { width, height } = Dimensions.get('window');
const ORB_SIZE = 60;
const SNAP_MARGIN = 20;
const SAFE_TOP = 100;
const SAFE_BOTTOM = 120;

export const FloatingCartOrb = () => {
  const { items } = useCart();
  const [shopCount, setShopCount] = useState(0);
  const [showShops, setShowShops] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const ws = useRef<WebSocket | null>(null);

  const translateX = useSharedValue(width - ORB_SIZE - SNAP_MARGIN);
  const translateY = useSharedValue(height - ORB_SIZE - SAFE_BOTTOM);

  // Load auth
  useEffect(() => {
    const load = async () => {
      const [token, uid] = await Promise.all([
        AsyncStorage.getItem('sessionToken'),
        AsyncStorage.getItem('user_id'),
      ]);
      setSessionToken(token);
      setUserId(uid);
    };
    load();
  }, []);

  // WebSocket for real-time PO updates
  useEffect(() => {
    if (!userId || !sessionToken) return;

    const connect = () => {
      const protocol = __DEV__ ? 'ws' : 'wss';
      const host = 'retail-alvinia-goza-f6a0e4f7.koyeb.app';
      const url = `${protocol}://${host}/ws/po/buyer/${userId}/`;

      ws.current = new WebSocket(url);

      ws.current.onopen = () => console.log('Buyer WS connected');

      ws.current.onmessage = (e) => {
        try {
          const { type, pos } = JSON.parse(e.data);
          if (type === 'po_update' && Array.isArray(pos)) {
            runOnJS(updateShopCount)(pos);
          }
        } catch (err) {}
      };

      ws.current.onclose = () => {
        setTimeout(connect, 3000);
      };
    };

    connect();
    return () => ws.current?.close();
  }, [userId, sessionToken]);

  // Initial fetch + cart changes
  const updateShopCount = async (poList?: any[]) => {
    let activePOs: any[] = poList || [];

    if (!poList && sessionToken) {
      try {
        const res = await api.get('/po/buyer/list/', {
          headers: { Authorization: sessionToken },
        });
        activePOs = (res.data.pos || []).filter((p: any) =>
          ['proposed', 'countered', 'pickup_pending'].includes(p.status)
        );
      } catch (err) {}
    }

    // Get unique shop IDs from cart
    const cartShopIds = new Set(items.map(i => i.shopId.toString()));

    // Get unique shop IDs from active POs
    const poShopIds = new Set(activePOs.map(p => p.shop_id?.toString() || p.shopId));

    // Merge: count unique shops
    const allShopIds = new Set([...cartShopIds, ...poShopIds]);
    setShopCount(allShopIds.size);
  };

  // Update on cart changes
  useEffect(() => {
    updateShopCount();
  }, [items]);

  // Initial load
  useEffect(() => {
    if (sessionToken) updateShopCount();
  }, [sessionToken]);

  // Gesture handlers
  const onGestureEvent = (event: PanGestureHandlerGestureEvent) => {
    'worklet';
    translateX.value = event.nativeEvent.translationX + (width - ORB_SIZE - SNAP_MARGIN);
    translateY.value = event.nativeEvent.translationY + (height - ORB_SIZE - SAFE_BOTTOM);
  };

  const onGestureEnd = () => {
    'worklet';
    let newX = translateX.value > width / 2
      ? width - ORB_SIZE - SNAP_MARGIN
      : SNAP_MARGIN;

    let newY = translateY.value;
    if (newY < SAFE_TOP) newY = SAFE_TOP;
    if (newY > height - ORB_SIZE - SAFE_BOTTOM) newY = height - ORB_SIZE - SAFE_BOTTOM;

    translateX.value = withSpring(newX);
    translateY.value = withSpring(newY);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  if (shopCount === 0) return null;

  return (
    <>
      <PanGestureHandler onGestureEvent={onGestureEvent} onEnded={onGestureEnd}>
        <Animated.View style={[styles.orb, animatedStyle]}>
          <TouchableOpacity
            style={styles.orbInner}
            onPress={() => setShowShops(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="cart" size={28} color="#fff" />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{shopCount}</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </PanGestureHandler>

      <ShopSelectorModal
        visible={showShops}
        onClose={() => setShowShops(false)}
        activePOs={shopCount} // we don't need separate counts anymore
        totalItems={items.length}
      />
    </>
  );
};

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
    width: ORB_SIZE,
    height: ORB_SIZE,
    zIndex: 9999,
  },
  orbInner: {
    flex: 1,
    backgroundColor: '#3B82F6',
    borderRadius: ORB_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.37,
    shadowRadius: 12,
    elevation: 16,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 16,
    minWidth: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderWidth: 3,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
});