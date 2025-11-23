// screens/seller/SellerPODashboard.tsx
// DECEMBER 4, 2025 — FINAL PERFECTION: Always Fresh Once + Max Visibility

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../src/api';
import { format, isToday, isYesterday, parseISO } from 'date-fns';

type Version = {
  id: string;
  version: number;
  status: string;
  counter_by: string;
  last_counter: 'buyer' | 'seller' | null;
  is_latest: boolean;
  created_at: string;
  message?: string;
};

type PO = {
  id: string;
  buyer_name: string;
  buyer_image_url?: string | null;
  total: string;
  item_count: number;
  status: string;
  version: number;
  last_counter?: 'buyer' | 'seller' | null;
  expires_at?: string | null;
  pickup_expires_at?: string | null;
  requires_action: boolean;
  updated_at: string;
  versions: Version[];
};

type TabType = 'pending' | 'all' | 'completed' | 'cancelled';

export default function SellerPODashboard() {
  const [allPos, setAllPos] = useState<PO[]>([]);
  const [activePos, setActivePos] = useState<PO[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  // ALWAYS FETCH ONCE ON EVERY MOUNT — NO MORE, NO LESS
  useEffect(() => {
    let isMounted = true;

    const loadPOs = async () => {
      if (!isMounted) return;
      setLoading(true);

      try {
        const token = await AsyncStorage.getItem('sessionToken');
        if (!token) return;

        const res = await api.get('/po/seller/list/', {
          headers: { Authorization: token },
        });

        const formatted = (res.data.pos || []).map((p: any): PO => ({
          id: p.id,
          buyer_name: p.buyer_name || 'Customer',
          buyer_image_url: p.buyer_image_url || null,
          total: p.total || '0',
          item_count: p.item_count || 0,
          status: p.status || 'proposed',
          version: p.version || 1,
          last_counter: p.last_counter || null,
          expires_at: p.expires_at,
          pickup_expires_at: p.pickup_expires_at,
          requires_action: p.requires_action === true,
          updated_at: p.updated_at || new Date().toISOString(),
          versions: p.versions || [],
        }));

        const sortedAll = formatted.sort((a, b) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );

        if (isMounted) {
          setAllPos(sortedAll);
          setActivePos(sortedAll.filter(p => 
            ['proposed', 'countered', 'pickup_pending'].includes(p.status)
          ));
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
  }, []); // ← Empty dependency array = only once per mount

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Re-run the same fetch logic
    const refresh = async () => {
      try {
        const token = await AsyncStorage.getItem('sessionToken');
        if (!token) return;

        const res = await api.get('/po/seller/list/', {
          headers: { Authorization: token },
        });

        const formatted = (res.data.pos || []).map((p: any): PO => ({
          id: p.id,
          buyer_name: p.buyer_name || 'Customer',
          buyer_image_url: p.buyer_image_url || null,
          total: p.total || '0',
          item_count: p.item_count || 0,
          status: p.status || 'proposed',
          version: p.version || 1,
          last_counter: p.last_counter || null,
          expires_at: p.expires_at,
          pickup_expires_at: p.pickup_expires_at,
          requires_action: p.requires_action === true,
          updated_at: p.updated_at || new Date().toISOString(),
          versions: p.versions || [],
        }));

        const sortedAll = formatted.sort((a, b) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );

        setAllPos(sortedAll);
        setActivePos(sortedAll.filter(p => 
          ['proposed', 'countered', 'pickup_pending'].includes(p.status)
        ));
      } catch (err) {
        console.error('Refresh failed:', err);
      } finally {
        setRefreshing(false);
      }
    };

    refresh();
  }, []);

  const timeLeft = (date?: string | null): string | null => {
    if (!date) return null;
    const diff = new Date(date).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
  };

  const getStatusConfig = (po: PO) => {
    if (po.status === 'completed') return { text: 'Completed', color: '#10B981' };
    if (['cancelled_by_seller', 'rejected', 'expired'].includes(po.status)) 
      return { text: 'Cancelled', color: '#6B7280' };
    if (po.status === 'pickup_pending') return { text: 'Buyer on the way', color: '#10B981' };
    if (po.requires_action) return { text: 'Your Turn!', color: '#EA580C', pulse: true };
    if (po.last_counter === 'buyer') return { text: 'Customer sent offer', color: '#EA580C' };
    if (po.last_counter === 'seller') return { text: 'You countered', color: '#7C3AED' };
    return { text: 'New Order', color: '#3B82F6' };
  };

  const activeCount = activePos.filter(p => p.requires_action).length;

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
                     activeTab === 'pending' ? activePos :
                     activeTab === 'completed' ? allPos.filter(p => p.status === 'completed') :
                     allPos.filter(p => ['cancelled_by_seller', 'rejected', 'expired'].includes(p.status));

  if (loading && allPos.length === 0) {
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

      {/* BLUE HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shop Orders</Text>
      </View>

      {/* ACTION ORB */}
      {activeCount > 0 && (
        <View style={styles.actionOrbContainer}>
          <Animated.View style={[styles.actionOrb, pulseStyle]}>
            <Text style={styles.actionOrbNumber}>{activeCount}</Text>
          </Animated.View>
          {/*  <Text style={styles.actionOrbText}>Action Required</Text> */}
        </View>
      )}

      {/* TABS */}
      <View style={styles.tabBar}>
        {(['pending', 'all', 'completed', 'cancelled'] as TabType[]).map(tab => (
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
                <Ionicons name="basket-outline" size={80} color="#CBD5E1" />
                <Text style={styles.emptyText}>No orders yet</Text>
              </View>
            ) : (
              groupedPos.map(([date, items]) => (
                <View key={date}>
                  <Text style={styles.dateHeader}>{date}</Text>
                  {items.map(po => <UltraModernCard key={po.id} po={po} router={router} />)}
                </View>
              ))
            )
          ) : filteredPos.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle-outline" size={80} color="#94A3B8" />
              <Text style={styles.emptyText}>All caught up!</Text>
            </View>
          ) : (
            filteredPos.map(po => <UltraModernCard key={po.id} po={po} router={router} />)
          )}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const UltraModernCard = ({ po, router }: { po: PO; router: any }) => {
  const [showVersions, setShowVersions] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState(po.id);

  const status = getStatusConfig(po);
  const timerText = po.expires_at ? timeLeft(po.status === 'pickup_pending' ? po.pickup_expires_at : po.expires_at) : null;

  const handleVersionSelect = (versionId: string) => {
    setSelectedVersionId(versionId);
    setShowVersions(false);
    router.push(`/cart/SellerPOEditor?poId=${versionId}`);
  };

  return (
    <View style={styles.cardWrapper}>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.95}
        onPress={() => router.push(`/cart/SellerPOEditor?poId=${selectedVersionId}`)}
      >
        {/* HEADER WITH VERSION DROPDOWN */}
        <View style={styles.cardHeader}>
          <View style={styles.buyerRow}>
            <View style={styles.avatar}>
              {po.buyer_image_url ? (
                <Image source={{ uri: po.buyer_image_url }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person" size={18} color="#94A3B8" />
              )}
            </View>
            <View style={styles.buyerInfo}>
              <Text style={styles.buyerName} numberOfLines={1}>{po.buyer_name}</Text>
              <Text style={styles.meta}>{po.item_count} items</Text>
            </View>
          </View>

          {/* VERSION BUTTON */}
          {po.versions.length > 1 && (
            <TouchableOpacity style={styles.versionBtn} onPress={(e) => { e.stopPropagation(); setShowVersions(v => !v); }}>
              <Text style={styles.versionText}>v{po.version}</Text>
              <Ionicons name={showVersions ? "chevron-up" : "chevron-down"} size={18} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* PRICE */}
        <Text style={styles.price}>₦{parseFloat(po.total).toLocaleString()}</Text>

        {/* STATUS + TIMER */}
        <View style={styles.statusRow}>
          <View style={styles.statusBox}>
            <View style={[styles.dot, { backgroundColor: status.color }]} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
            {po.last_counter && (
              <Text style={styles.counterText}>
                {' • '}{po.last_counter === 'buyer' ? 'Customer' : 'You'} countered
              </Text>
            )}
          </View>

          {timerText && (
            <View style={[styles.timerPill, timerText === 'Expired' && styles.timerExpired]}>
              <Ionicons name="time-outline" size={12} color={timerText === 'Expired' ? '#EF4444' : '#EA580C'} />
              <Text style={[styles.timerText, timerText === 'Expired' && { color: '#EF4444' }]}>
                {timerText}
              </Text>
            </View>
          )}
        </View>

        {/* ACTION REQUIRED */}
        {po.requires_action && (
          <View style={styles.actionBadge}>
            <Text style={styles.actionText}>ACTION REQUIRED</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* VERSION DROPDOWN — SAME LOGIC AS BUYER */}
      {showVersions && po.versions.length > 1 && (
        <View style={styles.versionDropdown}>
          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
            {po.versions.map(v => (
              <TouchableOpacity
                key={v.id}
                style={[styles.versionItem, v.id === selectedVersionId && styles.currentVersion]}
                onPress={() => handleVersionSelect(v.id)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.versionLabel}>
                    v{v.version} • {v.counter_by}
                    {v.is_latest && ' (Latest)'}
                  </Text>
                  {v.message ? (
                    <Text style={styles.versionMessage}>“{v.message}”</Text>
                  ) : (
                    <Text style={styles.versionSub}>
                      {new Date(v.created_at).toLocaleString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  )}
                </View>
                {v.id === selectedVersionId && <Ionicons name="checkmark-circle" size={22} color="#EA580C" />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const getStatusConfig = (po: PO) => {
  if (po.status === 'completed') return { text: 'Completed', color: '#10B981' };
  if (['cancelled_by_seller', 'rejected', 'expired'].includes(po.status)) 
    return { text: 'Cancelled', color: '#6B7280' };
  if (po.status === 'pickup_pending') return { text: 'Buyer on the way', color: '#10B981' };
  if (po.requires_action) return { text: 'Your Turn!', color: '#EA580C', pulse: true };
  if (po.last_counter === 'buyer') return { text: 'Customer sent offer', color: '#EA580C' };
  if (po.last_counter === 'seller') return { text: 'You countered', color: '#7C3AED' };
  return { text: 'New Order', color: '#3B82F6' };
};

const timeLeft = (date?: string | null): string | null => {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  header: {
    paddingVertical: 22,
    paddingHorizontal: 20,
    backgroundColor: '#3A7BD5',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    elevation: 12,
  },
  headerTitle: { fontSize: 23, fontWeight: '900', color: '#FFF', textAlign: 'center' },

  actionOrbContainer: {
    position: 'absolute',
    top: 156,
    right: 20,
    alignItems: 'center',
    zIndex: 10,
  },
  actionOrb: {
    width: 23,
    height: 23,
    borderRadius: 29,
    backgroundColor: '#EA580C',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 16,
  },
  actionOrbNumber: { fontSize: 16, fontWeight: '900', color: '#FFF' },
  actionOrbText: { marginTop: 6, fontSize: 10, fontWeight: '800', color: '#EA580C' },


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

  // CARD WRAPPER FOR DROPDOWN
  cardWrapper: { marginBottom: 12 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1.2,
    borderColor: '#E0E7FF',
  },

  cardHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  buyerRow: { 
    flexDirection: 'row', 
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  avatar: {
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
  avatarImage: { width: '100%', height: '100%', borderRadius: 21 },
  buyerInfo: { flex: 1 },
  buyerName: { 
    fontSize: 15.5, 
    fontWeight: '800', 
    color: '#1E293B',
    flexShrink: 1,
  },
  meta: { fontSize: 12.5, color: '#64748B', marginTop: 1 },

  versionBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#EA580C', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 16 
  },
  versionText: { color: '#FFF', fontWeight: '900', fontSize: 13 },

  price: { 
    fontSize: 19, 
    fontWeight: '900', 
    color: '#3B82F6',
  },

  statusRow: { 
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
  counterText: { fontSize: 12.5, color: '#64748B', fontWeight: '600' },

  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4E5',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FDBA74',
  },
  timerExpired: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' },
  timerText: { fontSize: 12, fontWeight: '800', color: '#EA580C', marginLeft: 4 },

  actionBadge: {
    position: 'absolute',
    top: 4,
    right: 10,
    backgroundColor: '#EA580C',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
  },
  actionText: { color: '#FFF', fontSize: 9.5, fontWeight: '900' },

  // VERSION DROPDOWN
  versionDropdown: {
    marginTop: 8,
    backgroundColor: '#FFF',
    borderRadius: 18,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    maxHeight: 300,
  },
  versionItem: { 
    padding: 14, 
    borderBottomWidth: 1, 
    borderColor: '#FED7AA', 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  currentVersion: { backgroundColor: '#FFF4E5' },
  versionLabel: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
  versionMessage: { fontSize: 13.5, color: '#EA580C', fontStyle: 'italic', marginTop: 2 },
  versionSub: { fontSize: 12.5, color: '#64748B', marginTop: 2 },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyText: { fontSize: 20, fontWeight: '800', color: '#64748B', marginTop: 16 },

  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: { marginTop: 20, fontSize: 18, color: '#64748B', fontWeight: '700' },
});