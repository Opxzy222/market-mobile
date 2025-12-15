// screens/BuyerPODashboard.tsx
// DECEMBER 6, 2025 — FINAL PERFECTION: Real-time Pending + Full History + pickup_pending in Pending

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Image, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../src/api';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

type PO = {
  id: string;
  shop_name: string;
  shop_image_url?: string | null;
  total: string;
  item_count: number;
  status: string;
  version: number;
  last_counter?: 'buyer' | 'seller' | null;
  expires_at?: string | null;
  pickup_expires_at?: string | null;
  pickup_code?: string | null;
  show_pickup_code: boolean;
  requires_action: boolean;
  updated_at: string;
};

type TabType = 'all' | 'pending' | 'completed' | 'cancelled';

const getStatusConfig = (po: PO) => {
  if (po.status === 'completed') return { text: 'Completed', color: '#10B981' };
  if (po.status === 'cancelled') return { text: 'Cancelled by you', color: '#6B7280' };
  if (po.status === 'cancelled_by_seller') return { text: 'Seller cancelled', color: '#EF4444' };
  if (po.status === 'rejected') return { text: 'Seller rejected', color: '#EF4444' };
  if (po.status === 'expired') return { text: 'Offer expired', color: '#6B7280' };

  if (po.status === 'pickup_pending') return { text: 'Ready for Pickup', color: '#10B981' };
  if (po.requires_action && po.status !== 'expired') return { text: 'Your Turn!', color: '#DC2626', pulse: true };
  if (po.last_counter === 'buyer') return { text: 'You countered', color: '#7C3AED' };
  if (po.last_counter === 'seller') return { text: 'Seller countered', color: '#EA580C' };
  return { text: 'Waiting for seller', color: '#2563EB' };
};

const getTimerText = (po: PO): string | null => {
  const terminal = ['completed', 'cancelled_by_buyer', 'cancelled_by_seller', 'rejected', 'expired', 'cancelled'];
  if (terminal.includes(po.status)) return null;

  const date = po.status === 'pickup_pending' ? po.pickup_expires_at : po.expires_at;
  if (!date) return null;

  const diff = new Date(date).getTime() - Date.now();
  if (diff <= 0) return 'Expired';

  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
};

export default function BuyerPODashboard() {
  const [allPos, setAllPos] = useState<PO[]>([]);           // Full history from API
  const [pendingPos, setPendingPos] = useState<PO[]>([]);   // Real-time from WebSocket (pending + pickup_pending)
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const router = useRouter();

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const pulse = useSharedValue(1);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  const fadeStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 700 });
    translateY.value = withTiming(0, { duration: 700 });
    pulse.value = withRepeat(withSequence(withSpring(1.32), withSpring(1)), -1, true);
  }, []);

  // Load userId
  useEffect(() => {
    const fetchUserId = async () => {
      const id = await AsyncStorage.getItem('user_id');
      setUserId(id);
    };
    fetchUserId();
  }, []);

  // WEBSOCKET: ONLY PENDING + pickup_pending — NEVER TOUCHES allPos
  useEffect(() => {
    if (!userId) return;

    const connect = () => {
      const protocol = __DEV__ ? 'ws' : 'wss';
      const url = `${protocol}://api.gogo-digital.com/ws/po/buyer/${userId}/`;

      console.log('BUYER WS: Connecting →', url);
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => console.log('BUYER WS: Connected');

      wsRef.current.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'po_update' && Array.isArray(data.pos)) {
            const sorted = data.pos.sort((a: any, b: any) =>
              new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            );
            setPendingPos(sorted);
            setLoading(false);
          }
        } catch (err) {
          console.error('BUYER WS Parse error:', err);
        }
      };

      wsRef.current.onclose = () => {
        console.log('BUYER WS: Reconnecting...');
        setTimeout(connect, 2000);
      };
    };

    connect();
    return () => wsRef.current?.close();
  }, [userId]);

  // API: FULL HISTORY — EVERY TIME SCREEN FOCUSED
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const loadPOs = async () => {
        if (!isMounted) return;
        setLoading(true);

        try {
          const token = await AsyncStorage.getItem('sessionToken');
          if (!token) return;

          const res = await api.get('/po/buyer/list/', {
            headers: { Authorization: token },
          });

          const formatted = (res.data.pos || []).map((p: any): PO => ({
            id: p.id,
            shop_name: p.shop_name || 'Unknown Shop',
            shop_image_url: p.shop_image_url || null,
            total: p.total || '0',
            item_count: p.item_count || 0,
            status: p.status || 'proposed',
            version: p.version || 1,
            last_counter: p.last_counter || null,
            expires_at: p.expires_at,
            pickup_expires_at: p.pickup_expires_at,
            pickup_code: p.pickup_code,
            show_pickup_code: p.show_pickup_code || false,
            requires_action: p.requires_action === true,
            updated_at: p.updated_at || new Date().toISOString(),
          }));

          const sortedAll = formatted.sort((a, b) => 
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          );

          if (isMounted) {
            setAllPos(sortedAll);
          }
        } catch (err) {
          console.error('Load failed:', err);
        } finally {
          if (isMounted) {
            setLoading(false);
            setRefreshing(false);
          }
        }
      };

      loadPOs();

      return () => {
        isMounted = false;
      };
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Trigger API reload
    const trigger = async () => {
      try {
        const token = await AsyncStorage.getItem('sessionToken');
        if (!token) return;
        const res = await api.get('/po/buyer/list/', { headers: { Authorization: token } });
        const formatted = (res.data.pos || []).map((p: any): PO => ({
          id: p.id,
          shop_name: p.shop_name || 'Unknown Shop',
          shop_image_url: p.shop_image_url || null,
          total: p.total || '0',
          item_count: p.item_count || 0,
          status: p.status || 'proposed',
          version: p.version || 1,
          last_counter: p.last_counter || null,
          expires_at: p.expires_at,
          pickup_expires_at: p.pickup_expires_at,
          pickup_code: p.pickup_code,
          show_pickup_code: p.show_pickup_code || false,
          requires_action: p.requires_action === true,
          updated_at: p.updated_at || new Date().toISOString(),
        }));
        const sorted = formatted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        setAllPos(sorted);
      } catch (err) {
        console.error('Refresh failed:', err);
      } finally {
        setRefreshing(false);
      }
    };
    trigger();
  }, []);

  const activeCount = pendingPos.filter(p => p.requires_action && p.status !== 'expired').length;

  const groupedPos = React.useMemo(() => {
    if (activeTab !== 'all') return null;

    const groups: { [key: string]: PO[] } = {};
    allPos.forEach(po => {
      const date = parseISO(po.updated_at);
      let key: string;

      if (isToday(date)) key = 'Today';
      else if (isYesterday(date)) key = 'Yesterday';
      else key = format(date, 'MMMM d, yyyy');

      if (!groups[key]) groups[key] = [];
      groups[key].push(po);
    });

    return Object.entries(groups);
  }, [allPos, activeTab]);

  const filteredPos = activeTab === 'all' ? allPos :
                     activeTab === 'pending' ? pendingPos :
                     activeTab === 'completed' ? allPos.filter(p => p.status === 'completed') :
                     allPos.filter(p => [
                       'cancelled_by_buyer',
                       'cancelled_by_seller',
                       'rejected',
                       'expired',
                       'cancelled'
                     ].includes(p.status));

  if (loading && allPos.length === 0 && pendingPos.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#3A7BD5" />
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#60A5FA" />
          <Text style={styles.loaderText}>Loading your orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#3A7BD5" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.navigate("(tabs)/account")} style={styles.backButton}>
          <MaterialIcons name="arrow-back-ios" size={26} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Orders</Text>
      </View>

      {activeCount > 0 && (
        <View style={styles.actionOrbContainer}>
          <Animated.View style={[styles.actionOrb, pulseStyle]}>
            <Text style={styles.actionOrbNumber}>{activeCount}</Text>
          </Animated.View>
        </View>
      )}

      <View style={styles.tabBar}>
        {(['all', 'pending', 'completed', 'cancelled'] as TabType[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab === 'all' ? 'All' :
               tab === 'pending' ? 'Pending' :
               tab === 'completed' ? 'Completed' : 'Cancelled'}
            </Text>
            {activeTab === tab && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      <Animated.View style={[fadeStyle, { flex: 1 }]}>
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3B82F6']} />}
          contentContainerStyle={styles.scrollContent}
        >
          {activeTab === 'all' && groupedPos ? (
            groupedPos.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="cart-outline" size={80} color="#CBD5E1" />
                <Text style={styles.emptyText}>No orders yet</Text>
              </View>
            ) : (
              groupedPos.map(([date, items]) => (
                <View key={date}>
                  <Text style={styles.dateHeader}>{date}</Text>
                  {items.map(po => <UltraCompactCard key={po.id} po={po} router={router} />)}
                </View>
              ))
            )
          ) : filteredPos.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle-outline" size={80} color="#94A3B8" />
              <Text style={styles.emptyText}>All caught up!</Text>
            </View>
          ) : (
            filteredPos.map(po => <UltraCompactCard key={po.id} po={po} router={router} />)
          )}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const UltraCompactCard = ({ po, router }: { po: PO; router: any }) => {
  const status = getStatusConfig(po);
  const timerText = getTimerText(po);

  // ACTION REQUIRED ONLY IF NOT EXPIRED OR TERMINAL
  const showActionBadge = po.requires_action && !['expired', 'completed', 'cancelled', 'cancelled_by_seller', 'rejected'].includes(po.status);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.95}
      onPress={() => router.push(`/cart/BuyerPOEditor?poId=${po.id}`)}
    >
      <View style={styles.topRow}>
        <View style={styles.shopRow}>
          <View style={styles.shopAvatar}>
            {po.shop_image_url ? (
              <Image source={{ uri: po.shop_image_url }} style={styles.shopImage} />
            ) : (
              <Ionicons name="storefront" size={18} color="#60A5FA" />
            )}
          </View>
          <View style={styles.shopInfo}>
            <Text style={styles.shopName} numberOfLines={1}>{po.shop_name}</Text>
            <Text style={styles.meta}>{po.item_count} items • v{po.version}</Text>
          </View>
        </View>

        <Text style={styles.price}>₦{parseFloat(po.total).toLocaleString()}</Text>
      </View>

      <View style={styles.middleRow}>
        <View style={styles.statusBox}>
          <View style={[styles.dot, { backgroundColor: status.color }]} />
          <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
        </View>

        {timerText && (
          <View style={[styles.timerPill, timerText === 'Expired' && styles.timerExpired]}>
            <Ionicons name="time-outline" size={12} color={timerText === 'Expired' ? '#EF4444' : '#3B82F6'} />
            <Text style={[styles.timerText, timerText === 'Expired' && { color: '#EF4444' }]}>
              {timerText}
            </Text>
          </View>
        )}
      </View>

      {po.status === 'pickup_pending' && po.show_pickup_code && po.pickup_code && (
        <View style={styles.pickupBadge}>
          <Ionicons name="shield-checkmark" size={15} color="#3B82F6" />
          <Text style={styles.pickupLabel}>Code:</Text>
          <Text style={styles.pickupCode}>{po.pickup_code}</Text>
        </View>
      )}

      {showActionBadge && (
        <View style={styles.actionBadge}>
          <Text style={styles.actionText}>ACTION REQUIRED</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  header: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 16,
      paddingHorizontal: 12,
      backgroundColor: "#3A7BD5",
      borderBottomLeftRadius: 35,
      borderBottomRightRadius: 35,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 6,
    },
    backButton: {
      padding: 5,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: "700",
      color: "#FFFFFF",
      flex: 1,
      textAlign: "center",
      fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
      letterSpacing: 0.5,
    },
    headerSpacer: {
      width: 50,
    },

  actionOrbContainer: {
    position: 'absolute',
    top: 162,
    right: 20,
    alignItems: 'center',
    zIndex: 10,
  },
  actionOrb: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 16,
  },
  actionOrbNumber: { fontSize: 24, fontWeight: '900', color: '#FFF' },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  activeTab: { borderBottomWidth: 3, borderColor: '#3B82F6' },
  tabText: { fontSize: 15, fontWeight: '700', color: '#64748B' },
  activeTabText: { color: '#3B82F6' },
  tabIndicator: { position: 'absolute', bottom: -1.5, left: 16, right: 16, height: 3, backgroundColor: '#3B82F6', borderRadius: 2 },

  scrollContent: { paddingTop: 16, paddingHorizontal: 18, paddingBottom: 100 },

  dateHeader: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#1E293B',
    marginVertical: 10,
    paddingHorizontal: 4,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1.2,
    borderColor: '#DBEAFE',
  },

  topRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  shopRow: { 
    flexDirection: 'row', 
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  shopAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#93C5FD',
  },
  shopImage: { width: '100%', height: '100%', borderRadius: 21 },
  shopInfo: { flex: 1 },
  shopName: { 
    fontSize: 15.5, 
    fontWeight: '800', 
    color: '#1E293B',
    flexShrink: 1,
  },
  meta: { fontSize: 12.5, color: '#64748B', marginTop: 1 },

  price: { 
    fontSize: 18, 
    fontWeight: '900', 
    color: '#3B82F6',
  },

  middleRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  statusBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flexWrap: 'wrap', 
    gap: 6,
    flex: 1,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13.5, fontWeight: '700' },

  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#93C5FD',
  },
  timerExpired: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' },
  timerText: { fontSize: 12, fontWeight: '800', color: '#3B82F6', marginLeft: 4 },

  pickupBadge: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    alignSelf: 'flex-start',
    borderWidth: 2,
    borderColor: '#93C5FD',
  },
  pickupLabel: { fontSize: 12.5, color: '#1D4ED8', fontWeight: '800', marginLeft: 6 },
  pickupCode: { fontSize: 18, fontWeight: '900', color: '#3B82F6', marginLeft: 8, letterSpacing: 4 },

  actionBadge: {
    position: 'absolute',
    top: 4,
    right: 10,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
  },
  actionText: { color: '#FFF', fontSize: 9.5, fontWeight: '900' },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyText: { fontSize: 20, fontWeight: '800', color: '#64748B', marginTop: 16 },

  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: { marginTop: 20, fontSize: 18, color: '#64748B', fontWeight: '700' },
});