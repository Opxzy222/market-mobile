// components/cart/SellerFloatingOrb.tsx
// NOVEMBER 28, 2025 — FINAL VICTORY EDITION: SELLER ORB WORKS 100%

import React, { useState, useEffect, useRef, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppResetContext } from '@/context/AppResetContext';

const { width, height } = Dimensions.get('window');
const ORB_SIZE = 65;
const SNAP_MARGIN = 20;
const SAFE_TOP = 100;
const SAFE_BOTTOM = 150;

export const SellerFloatingOrb = () => {
  const [activePOs, setActivePOs] = useState(0);
  const [isSeller, setIsSeller] = useState(false);
  const [shopId, setShopId] = useState<string | null>(null);

  const shouldRenderOrb = isSeller && activePOs > 0;

  const translateX = useSharedValue(SNAP_MARGIN);
  const translateY = useSharedValue(height - ORB_SIZE - SAFE_BOTTOM);
  const pulse = useSharedValue(1);

  const router = useRouter();
  const wsRef = useRef<WebSocket | null>(null);

  const { resetAppState } = useContext(AppResetContext);

  // Load shop_id only
  useEffect(() => {
    const load = async () => {
      try {
        const sid = await AsyncStorage.getItem('shop_id');
        if (sid) {
          setShopId(sid);
          setIsSeller(true);
          console.log('SELLER MODE: shop_id loaded →', sid);
        } else {
          setIsSeller(false);
          setShopId(null);
          console.log('SELLER MODE: no shop_id found');
        }
      } catch (err) {
        console.error('Failed to load shop_id:', err);
        setIsSeller(false);
      }
    };

    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [resetAppState]);

  // Pulse when count increases
  useEffect(() => {
    if (activePOs > 0) {
      pulse.value = withSequence(
        withTiming(1.5, { duration: 200 }),
        withTiming(1.0, { duration: 400 })
      );
    }
  }, [activePOs]);

  // WebSocket — FULL LOGGING + CLEAN URL
  useEffect(() => {
    if (!isSeller || !shopId) {
      console.log('SELLER WS: Not a seller or no shopId → disabled');
      setActivePOs(0);
      return;
    }

    const connect = () => {
      const protocol = __DEV__ ? 'ws' : 'wss';
      const url = `${protocol}://api.gogo-digital.com/ws/po/updates/${shopId}/`;

      console.log('SELLER WS: CONNECTING TO →', url);

      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        console.log('SELLER WS: CONNECTED');
      };

      wsRef.current.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          console.log('SELLER WS: RECEIVED ←', data);

          if (data.type === 'po_update') {
            const backendCount = data.active_count || 0;
            const posArrayLength = Array.isArray(data.pos) ? data.pos.length : 0;

            console.log(`SELLER WS: Backend says active_count = ${backendCount}`);
            console.log(`SELLER WS: pos array has ${posArrayLength} items`);

            // TRUST THE BACKEND — IT KNOWS BEST
            setActivePOs(backendCount);

            // Extra debug: show what statuses are in the list
            if (Array.isArray(data.pos)) {
              const statuses = data.pos.map((p: any) => p.status).join(', ');
              console.log(`SELLER WS: Statuses received: [${statuses || 'none'}]`);
            }
          }
        } catch (err) {
          console.error('SELLER WS: Failed to parse message:', err, e.data);
        }
      };

      wsRef.current.onerror = (e) => {
        console.error('SELLER WS: ERROR →', e);
      };

      wsRef.current.onclose = (event) => {
        console.log('SELLER WS: CLOSED →', event.code, event.reason || 'no reason');
        // Reconnect after 2s
        setTimeout(connect, 2000);
      };
    };

    connect();

    return () => {
      console.log('SELLER WS: Cleaning up');
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [isSeller, shopId]);

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx: any) => {
      ctx.startX = translateX.value;
      ctx.startY = translateY.value;
    },
    onActive: (event, ctx: any) => {
      translateX.value = ctx.startX + event.translationX;
      translateY.value = ctx.startY + event.translationY;
    },
    onEnd: () => {
      const targetX = translateX.value > width / 2
        ? width - ORB_SIZE - SNAP_MARGIN
        : SNAP_MARGIN;

      let targetY = translateY.value;
      if (targetY < SAFE_TOP) targetY = SAFE_TOP;
      if (targetY > height - ORB_SIZE - SAFE_BOTTOM) targetY = height - ORB_SIZE - SAFE_BOTTOM;

      translateX.value = withSpring(targetX);
      translateY.value = withSpring(targetY);
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: pulse.value },
    ],
    opacity: shouldRenderOrb ? 1 : 0,
    pointerEvents: shouldRenderOrb ? 'auto' : 'none',
  }));

  if (!shouldRenderOrb) {
    console.log('SELLER ORB: Hidden → activePOs =', activePOs, 'isSeller =', isSeller);
    return null;
  }

  console.log('SELLER ORB: RENDERED WITH COUNT →', activePOs);

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={[styles.orb, animatedStyle]}>
        <TouchableOpacity
          style={styles.orbInner}
          onPress={() => router.push('/cart/SellerPODashboard')}
          activeOpacity={0.9}
        >
          <Ionicons name="storefront" size={38} color="#fff" />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {activePOs > 99 ? '99+' : activePOs}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </PanGestureHandler>
  );
};

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
    zIndex: 99999,
  },
  orbInner: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    backgroundColor: '#dc2626',
    borderRadius: ORB_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.7,
    shadowRadius: 20,
    elevation: 40,
    borderWidth: 1,
    borderColor: '#fff',
  },
  badge: {
    position: 'absolute',
    top: -12,
    right: -12,
    backgroundColor: '#f97316',
    borderRadius: 24,
    minWidth: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderWidth: 5,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
});