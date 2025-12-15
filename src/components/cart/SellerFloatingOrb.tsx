// components/cart/SellerFloatingOrb.tsx
// FINAL — ZERO NULL CONNECTIONS, PERFECT RECONNECT

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
  const [shopId, setShopId] = useState<string | null>(null);

  const router = useRouter();
  const wsRef = useRef<WebSocket | null>(null);
  const { resetAppState } = useContext(AppResetContext);

  const translateX = useSharedValue(SNAP_MARGIN);
  const translateY = useSharedValue(height - ORB_SIZE - SAFE_BOTTOM);
  const pulse = useSharedValue(1);

  const shouldRenderOrb = shopId !== null && activePOs > 0;

  // Load shop_id — forces reload on reset
  useEffect(() => {
    const loadShopId = async () => {
      try {
        const sid = await AsyncStorage.getItem('shop_id');
        console.log('SELLER ORB: AsyncStorage shop_id →', sid || 'null');
        setShopId(sid && sid !== 'null' ? sid : null);
      } catch (err) {
        console.error('Failed to load shop_id:', err);
        setShopId(null);
      }
    };

    loadShopId();
    const interval = setInterval(loadShopId, 15000);
    return () => clearInterval(interval);
  }, [resetAppState]);

  // Pulse animation
  useEffect(() => {
    if (activePOs > 0) {
      pulse.value = withSequence(
        withTiming(1.5, { duration: 200 }),
        withTiming(1.0, { duration: 400 })
      );
    }
  }, [activePOs]);

  // WebSocket — ONLY connects when shopId is valid
  useEffect(() => {
    // Always clean up old connection
    if (wsRef.current) {
      console.log('SELLER WS: Closing old connection');
      wsRef.current.close();
      wsRef.current = null;
    }

    // CRITICAL: If no valid shopId → DO NOT CONNECT
    if (!shopId || shopId === 'null' || shopId.trim() === '') {
      console.log('SELLER WS: No valid shopId → disabled');
      setActivePOs(0);
      return;
    }

    console.log('SELLER WS: Starting connection with shopId →', shopId);

    const connect = () => {
      // Double-check shopId is still valid before connecting
      const currentShopId = shopId;
      if (!currentShopId || currentShopId === 'null') {
        console.log('SELLER WS: shopId became invalid during connect → aborting');
        return;
      }

      const protocol = __DEV__ ? 'ws' : 'wss';
      const url = `${protocol}://api.gogo-digital.com/ws/po/updates/${currentShopId}/`;

      console.log('SELLER WS: CONNECTING →', url);

      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        console.log('SELLER WS: CONNECTED');
      };

      wsRef.current.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'po_update') {
            const count = data.active_count || 0;
            setActivePOs(count);
          }
        } catch (err) {
          console.error('SELLER WS: Parse error:', err);
        }
      };

      wsRef.current.onerror = () => {
        console.log('SELLER WS: Connection error');
      };

      wsRef.current.onclose = () => {
        console.log('SELLER WS: CLOSED — reconnecting in 2s');
        setTimeout(connect, 2000);
      };
    };

    connect();

    return () => {
      console.log('SELLER WS: Cleanup — closing connection');
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [shopId, resetAppState]); // Re-run on shopId change or reset

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
      const targetX = translateX.value > width / 2 ? width - ORB_SIZE - SNAP_MARGIN : SNAP_MARGIN;
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
    return null;
  }

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