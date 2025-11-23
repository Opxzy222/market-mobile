// components/cart/SellerFloatingOrb.tsx
// NOVEMBER 22, 2025 — FINAL PERFECTION: ONLY SHOWS WHEN THERE IS A PENDING PO

import React, { useState, useEffect, useRef } from 'react';
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
import api from '../../api';

const { width, height } = Dimensions.get('window');
const ORB_SIZE = 72;
const SNAP_MARGIN = 20;
const SAFE_TOP = 100;
const SAFE_BOTTOM = 150;

export const SellerFloatingOrb = () => {
  const [activePOs, setActivePOs] = useState(0);
  const [isSeller, setIsSeller] = useState(false);
  const [shopId, setShopId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  // Only render orb if we have pending POs AND are a seller
  const shouldRenderOrb = isSeller && activePOs > 0;

  const translateX = useSharedValue(SNAP_MARGIN);
  const translateY = useSharedValue(height - ORB_SIZE - SAFE_BOTTOM);
  const pulse = useSharedValue(1);

  const router = useRouter();
  const wsRef = useRef<WebSocket | null>(null);

  // Load session + shop
  useEffect(() => {
    const load = async () => {
      try {
        const [token, sid] = await Promise.all([
          AsyncStorage.getItem('sessionToken'),
          AsyncStorage.getItem('shop_id'),
        ]);

        if (sid && token) {
          setShopId(sid);
          setSessionToken(token);
          setIsSeller(true);
        } else {
          setIsSeller(false);
        }
      } catch (err) {
        setIsSeller(false);
      }
    };

    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  // Pulse animation when new order arrives
  useEffect(() => {
    if (activePOs > 0) {
      pulse.value = withSequence(
        withTiming(1.4, { duration: 200 }),
        withTiming(1.0, { duration: 400 })
      );
    }
  }, [activePOs]);

  // WebSocket: Real-time PO updates
  useEffect(() => {
    if (!isSeller || !shopId || !sessionToken) {
      setActivePOs(0);
      return;
    }

    const protocol = __DEV__ ? 'ws' : 'wss';
    const url = `${protocol}://retail-alvinia-goza-f6a0e4f7.koyeb.app/ws/po/updates/${shopId}/?token=${sessionToken}`;

    const ws = new WebSocket(url);
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'po_update' && Array.isArray(data.pos)) {
          const count = data.pos.filter((po: any) =>
            ['proposed', 'countered', 'pickup_pending'].includes(po.status)
          ).length;
          setActivePOs(count);
        }
      } catch (err) {
        // Silent
      }
    };

    ws.onerror = () => setActivePOs(prev => prev); // Keep current
    ws.onclose = () => setTimeout(() => wsRef.current?.close(), 5000);

    wsRef.current = ws;
    return () => ws.close();
  }, [isSeller, shopId, sessionToken]);

  // HTTP Fallback: Poll every 30s
  useEffect(() => {
    if (!isSeller || !sessionToken) {
      setActivePOs(0);
      return;
    }

    const fetchPOs = async () => {
      try {
        const res = await api.get('/po/seller/list/', {
          headers: { Authorization: sessionToken },
          timeout: 8000,
        });
        const count = (res.data.pos || []).filter((po: any) =>
          ['proposed', 'countered', 'pickup_pending'].includes(po.status)
        ).length;
        setActivePOs(count);
      } catch (err) {
        // Silent fail — keep previous count
      }
    };

    fetchPOs();
    const interval = setInterval(fetchPOs, 30000);
    return () => clearInterval(interval);
  }, [isSeller, sessionToken]);

  // Gesture handler — only active when orb is visible
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

  // FINAL: Do NOT render anything if no pending POs
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
    borderWidth: 6,
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