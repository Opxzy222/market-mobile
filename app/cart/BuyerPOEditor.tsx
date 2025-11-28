// screens/BuyerPOEditor.tsx
// NOVEMBER 30, 2025 — FINAL PERFECTION: Version Selection Fixed for Completed Orders

import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  StatusBar
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import api from '../../src/api';
import { useCart } from '@/context/CartContext';

type Version = {
  id: string;
  version: number;
  status: string;
  total: string;
  counter_by: string;
  last_counter: 'buyer' | 'seller' | null;
  is_latest: boolean;
  created_at: string;
  message?: string;
  items: Array<{
    product_name: string | null;
    custom_name?: string | null;
    quantity: number;
    original_price: string;
    proposed_price: string;
    total_price: string;
    change_type: string;
    image_url?: string | null;
    custom_image_url?: string | null;
    added_by: 'buyer' | 'seller';
    _from_cart?: boolean;
    note?: string;
  }>;
};

export default function BuyerPOEditor() {
  const { poId } = useLocalSearchParams<{ poId: string }>();
  const router = useRouter();
  const cart = useCart();

  const [po, setPo] = useState<any>(null);
  const [allVersions, setAllVersions] = useState<Version[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>(poId || '');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [showVersions, setShowVersions] = useState(false);
  const [showFullMessage, setShowFullMessage] = useState(false);
  const [rootPoId, setRootPoId] = useState<string | null>(null);
  const [manuallySelectedVersionId, setManuallySelectedVersionId] = useState<string | null>(null);

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 700 });
    translateY.value = withTiming(0, { duration: 700 });
  }, []);

  useEffect(() => {
    AsyncStorage.getItem('sessionToken').then(setSessionToken);
  }, []);

  // FAKE v1 FOR ACCEPTED ORDERS WITH ONLY ONE VERSION
  useEffect(() => {
    if (allVersions.length === 1 && po?.status === 'pickup_pending') {
      const acceptedVersion = allVersions[0];
      const fakeOriginal: Version = {
        ...acceptedVersion,
        id: acceptedVersion.id + '_fake_v1',
        version: acceptedVersion.version - 1,
        status: 'countered',
        counter_by: 'You (Original Offer)',
        is_latest: false,
        items: [...acceptedVersion.items],
      };
      setAllVersions([fakeOriginal, acceptedVersion]);
      setSelectedVersionId(acceptedVersion.id);
    }
  }, [allVersions.length, po?.status]);

  useEffect(() => {
    if (!poId || !sessionToken) return;

    const fetchFullThread = async () => {
      try {
        setLoading(true);
        setAllVersions([]);
        setPo(null);
        setSelectedVersionId('');
        setRootPoId(null);

        const res = await api.get(`/po/buyer/detail/${poId}/`, {
          headers: { Authorization: sessionToken },
        });

        const incomingPo = res.data.po;
        const incomingVersions: Version[] = res.data.versions || [];

        const latestVersion = incomingVersions.find(v => v.is_latest);
        if (!latestVersion) throw new Error('No latest version');

        setRootPoId(latestVersion.id);

        const fullRes = await api.get(`/po/buyer/detail/${latestVersion.id}/`, {
          headers: { Authorization: sessionToken },
        });

        const fullPo = fullRes.data.po;
        const fullVersions: Version[] = fullRes.data.versions || [];
        const sorted = [...fullVersions].sort((a, b) => a.version - b.version);

        setPo(fullPo);
        setAllVersions(sorted);

        // ONLY force latest on first load OR if no manual selection
        if (!manuallySelectedVersionId) {
          const shouldUseLatest = fullPo.status === 'completed' || fullPo.status === 'pickup_pending';
          const finalId = shouldUseLatest ? latestVersion.id : poId;
          setSelectedVersionId(finalId);
        }
        // If user already manually selected a version → keep it!

        if (poId !== latestVersion.id) {
          router.replace(`/cart/BuyerPOEditor?poId=${latestVersion.id}`, { scroll: false });
        }

      } catch (err: any) {
        Alert.alert('Error', err.response?.data?.error || 'Failed to load offer');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    fetchFullThread();
  }, [poId, sessionToken, router]); // ← Removed manuallySelectedVersionId from deps

  // Separate effect: Handle manual version selection without resetting
  useEffect(() => {
    if (manuallySelectedVersionId && allVersions.length > 0) {
      const exists = allVersions.some(v => v.id === manuallySelectedVersionId);
      if (exists) {
        setSelectedVersionId(manuallySelectedVersionId);
      }
    }
  }, [manuallySelectedVersionId, allVersions]);

  const displayItems = useMemo(() => {
    if (!po || allVersions.length === 0) return [];
    const currentVersion = allVersions.find(v => v.id === selectedVersionId) || allVersions[allVersions.length - 1];
    if (!currentVersion) return [];

    if (!['proposed', 'countered'].includes(currentVersion.status)) return currentVersion.items;

    const shopId = po.shop_id || po.shop?.id;
    if (!shopId) return currentVersion.items;

    const localItems = cart.getShopItems(shopId);
    if (!localItems.length) return currentVersion.items;

    const merged = [...currentVersion.items];
    localItems.forEach(item => {
      const exists = merged.some(serverItem => {
        const serverName = serverItem.custom_name || serverItem.product_name;
        const localName = item.custom_name || item.product_name;
        return serverName === localName;
      });

      if (!exists) {
        merged.push({
          product_name: item.product_name || item.custom_name || 'Item',
          custom_name: item.custom_name,
          quantity: item.quantity,
          original_price: item.original_price.toString(),
          proposed_price: item.price.toString(),
          total_price: (item.price * item.quantity).toString(),
          change_type: 'original',
          image_url: item.image || null,
          custom_image_url: null,
          added_by: 'buyer',
          _from_cart: true,
        });
      }
    });

    return merged;
  }, [po, allVersions, selectedVersionId, cart]);

  useEffect(() => {
    if (!po?.pickup_info?.expires_in_seconds || po?.status !== 'pickup_pending') return;

    const start = Date.now();
    const duration = po.pickup_info.expires_in_seconds;

    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const left = Math.max(0, duration - elapsed);

      if (left === 0) {
        setTimeLeft('Expired');
        clearInterval(timer);
        return;
      }

      const h = String(Math.floor(left / 3600)).padStart(2, '0');
      const m = String(Math.floor((left % 3600) / 60)).padStart(2, '0');
      const s = String(left % 60).padStart(2, '0');
      setTimeLeft(`${h}h ${m}m ${s}s`);
    }, 1000);

    return () => clearInterval(timer);
  }, [po?.pickup_info?.expires_in_seconds, po?.status]);

  const currentVersion = useMemo(() => {
    return allVersions.find(v => v.id === selectedVersionId) || allVersions[allVersions.length - 1];
  }, [allVersions, selectedVersionId]);

  const latestVersion = useMemo(() => {
    return allVersions.find(v => v.is_latest) || allVersions[allVersions.length - 1];
  }, [allVersions]);

  const isViewingOldVersion = selectedVersionId !== latestVersion?.id;
  const isNegotiating = currentVersion && ['proposed', 'countered'].includes(currentVersion.status);
  const canAccept = po?.can_accept === true;
  const terminalStatuses = ['completed', 'cancelled', 'cancelled_by_seller', 'rejected', 'expired'];
  const isTerminalStatus = terminalStatuses.includes(po?.status);
  const showActionButtons = !isViewingOldVersion && isNegotiating && !isTerminalStatus;

  const getTrueChangeLabel = (item: any) => {
    const priceChanged = parseFloat(item.proposed_price) !== parseFloat(item.original_price);
    if (item._from_cart) return { text: 'You added from cart', color: '#166534', bg: '#DCFCE7' };
    if (priceChanged) {
      if (currentVersion?.last_counter === 'buyer') {
        return { text: 'You changed price', color: '#3B82F6', bg: '#DBEAFE' };
      } else {
        return { text: 'Seller changed price', color: '#EA580C', bg: '#FFEDD5' };
      }
    }
    if (item.change_type === 'custom' || item.custom_name) {
      return { text: 'Custom item', color: '#7C3AED', bg: '#E9D5FF' };
    }
    return null;
  };

  const handleRemoveItem = (index: number) => {
    Alert.alert('Remove Item', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          setAllVersions(prev => {
            const updated = [...prev];
            const latest = updated.find(v => v.is_latest);
            if (latest) latest.items.splice(index, 1);
            return updated;
          });
        },
      },
    ]);
  };

  const handleAccept = async () => {
    setActionLoading(true);
    const formData = new FormData();
    formData.append('po_id', selectedVersionId);

    try {
      await api.post('/po/accept/', formData, {
        headers: { Authorization: sessionToken!, 'Content-Type': 'multipart/form-data' },
      });
      Alert.alert('Accepted!', 'Offer accepted! Go to the shop.', [
        { text: 'OK', onPress: () => router.replace('/cart/BuyerPODashboard') },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to accept');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelOrReject = async () => {
    setActionLoading(true);
    const action = po?.last_counter === 'buyer' ? 'cancel' : 'cancel';
    const formData = new FormData();
    formData.append('po_id', selectedVersionId);

    try {
      await api.post(`/po/${action}/`, formData, {
        headers: { Authorization: sessionToken!, 'Content-Type': 'multipart/form-data' },
      });
      Alert.alert(action === 'cancel' ? 'Cancelled' : 'Rejected', `Offer ${action}ed.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || `Failed to ${action}`);
    } finally {
      setActionLoading(false);
    }
  };

  const openMap = () => {
    const address = po.pickup_info?.shop_address;
    if (!address || address.includes('not set')) {
      Alert.alert('No Address', 'Shop has not set an address.');
      return;
    }
    const url = Platform.OS === 'ios'
      ? `http://maps.apple.com/?q=${encodeURIComponent(address)}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    Linking.openURL(url);
  };

  const handleVersionSelect = (versionId: string) => {
    setManuallySelectedVersionId(versionId);
    setShowVersions(false);
  };

  if (loading || !currentVersion || allVersions.length === 0) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loaderText}>Loading your offer...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#3A7BD5" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push({pathname: 'cart/BuyerPODashboard'})} style={styles.backBtn}>
          <MaterialIcons name="arrow-back-ios" size={26} color="#FFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{po?.shop_name || 'Shop'}</Text>

        {allVersions.length > 1 && (
          <TouchableOpacity style={styles.versionBtn} onPress={() => setShowVersions(v => !v)}>
            <Text style={styles.versionText}>v{currentVersion.version}</Text>
            <Ionicons name={showVersions ? "chevron-up" : "chevron-down"} size={20} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* VERSION DROPDOWN */}
      {showVersions && allVersions.length > 1 && (
        <View style={styles.versionDropdownContainer}>
          <ScrollView showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>
            {allVersions.map((v) => (
              <TouchableOpacity
                key={v.id}
                style={[styles.versionItem, v.id === selectedVersionId && styles.currentVersion]}
                onPress={() => handleVersionSelect(v.id)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.versionLabel}>
                    v{v.version} • {v.id.includes('_fake') ? 'You (Original Offer)' : v.counter_by}
                    {v.is_latest && ' (Latest)'}
                    {v.is_latest && ['pickup_pending', 'completed'].includes(po?.status) && ' (Accepted)'}
                  </Text>
                  {!v.id.includes('_fake') && !v.message && (
                    <Text style={styles.versionSub}>
                      {new Date(v.created_at).toLocaleString('en-GB', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      })} • ₦{parseFloat(v.total).toLocaleString()}
                    </Text>
                  )}
                </View>
                {v.id === selectedVersionId && <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* COMPACT PICKUP CARD */}
      {po?.status === 'pickup_pending' && currentVersion.is_latest && (
        <View style={styles.compactPickupCard}>
          <View style={styles.pickupHeader}>
            <Ionicons name="checkmark-circle" size={32} color="#10B981" />
            <Text style={styles.pickupTitle}>READY FOR PICKUP!</Text>
          </View>
          <View style={styles.pickupCodeRow}>
            <Text style={styles.codeLabel}>Code:</Text>
            <Text style={styles.pickupCode}>{po.pickup_info.pickup_code}</Text>
          </View>
          <View style={styles.timerRow}>
            <Ionicons name="time-outline" size={20} color="#10B981" />
            <Text style={styles.timerText}>{timeLeft}</Text>
          </View>
          <TouchableOpacity style={styles.mapBtn} onPress={openMap}>
            <Ionicons name="navigate" size={18} color="#065F46" />
            <Text style={styles.mapText}>Open in Maps</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* OLD VERSION BANNER */}
      {isViewingOldVersion && (
        <View style={styles.oldVersionBanner}>
          <Ionicons name="alert-circle-outline" size={20} color="#F59E0B" />
          <Text style={styles.oldVersionText}>Viewing older version • Actions disabled</Text>
        </View>
      )}

      {/* MESSAGE BUBBLE */}
      {currentVersion.message && (
        <View style={[
          styles.messageBubble,
          currentVersion.last_counter === 'seller' ? styles.messageFromSeller : styles.messageFromBuyer,
        ]}>
          <View style={styles.messageHeader}>
            <Text style={styles.messageSender}>
              {currentVersion.last_counter === 'seller' ? po?.shop_name || 'Seller' : 'You'}
            </Text>
            <Text style={styles.messageVersion}>v{currentVersion.version}</Text>
          </View>
          <TouchableOpacity activeOpacity={0.8} onPress={() => setShowFullMessage(p => !p)}>
            <Text style={styles.messageText} numberOfLines={showFullMessage ? undefined : 2}>
              "{currentVersion.message}"
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ITEM LIST */}
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <Animated.View style={animatedStyle}>
          {displayItems.length === 0 ? (
            <View style={styles.emptyItems}>
              <Ionicons name="cart-outline" size={80} color="#CBD5E1" />
              <Text style={styles.emptyText}>No items in this offer</Text>
            </View>
          ) : (
            displayItems.map((item, idx) => {
              const changeInfo = getTrueChangeLabel(item);
              const isEdited = parseFloat(item.proposed_price) !== parseFloat(item.original_price);
              const itemImage = item.custom_image_url || item.image_url;

              return (
                <View key={idx} style={styles.compactCard}>
                  <View style={styles.compactImageWrapper}>
                    {itemImage ? (
                      <Image source={{ uri: itemImage }} style={styles.compactImage} />
                    ) : (
                      <View style={styles.compactPlaceholder}>
                        <Ionicons name="image-outline" size={24} color="#94A3B8" />
                      </View>
                    )}
                  </View>

                  <View style={styles.compactContent}>
                    <Text style={styles.compactName} numberOfLines={2}>
                      {item.custom_name || item.product_name || 'Item'}
                    </Text>

                    <View style={styles.compactPriceRow}>
                      {isEdited && (
                        <Text style={styles.compactOldPrice}>
                          ₦{parseFloat(item.original_price).toLocaleString()}
                        </Text>
                      )}
                      <Text style={styles.compactNewPrice}>
                        ₦{parseFloat(item.proposed_price).toLocaleString()}
                      </Text>
                      <Text style={styles.compactQuantity}>× {item.quantity}</Text>
                    </View>

                    {changeInfo && (
                      <View style={[styles.compactBadge, { backgroundColor: changeInfo.bg + '30' }]}>
                        <Text style={[styles.compactBadgeText, { color: changeInfo.color }]}>
                          {changeInfo.text}
                        </Text>
                      </View>
                    )}
                  </View>

                  {!isViewingOldVersion && !isTerminalStatus && (
                    <TouchableOpacity style={styles.compactRemoveBtn} onPress={() => handleRemoveItem(idx)}>
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}

          <View style={styles.compactTotalCard}>
            <Text style={styles.compactTotalLabel}>Total Amount</Text>
            <Text style={styles.compactTotalPrice}>
              ₦{displayItems.reduce((sum, i) => sum + parseFloat(i.proposed_price) * i.quantity, 0).toLocaleString()}
            </Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* ACTION BUTTONS */}
      {showActionButtons && (
        <View style={styles.modernActions}>
          <TouchableOpacity style={styles.actionBtnCancel} onPress={handleCancelOrReject} disabled={actionLoading}>
            <Text style={styles.actionBtnText}>{currentVersion.last_counter === 'buyer' ? 'Cancel' : 'Cancel'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtnEdit}
            onPress={() => router.push(`/cart/BuyerCounterEditor?po_id=${latestVersion.id}`)}
            disabled={actionLoading}
          >
            <Text style={styles.actionBtnText}>Counter</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtnAccept, !canAccept && styles.actionBtnDisabled]}
            onPress={handleAccept}
            disabled={!canAccept || actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={[styles.actionBtnText, !canAccept && { opacity: 0.6 }]}>
                {canAccept ? 'Accept' : 'Waiting'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// Keep all your beautiful styles here (unchanged)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 18,
    backgroundColor: '#3A7BD5',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    elevation: 16,
  },
  backBtn: { padding: 10, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 16 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#FFF', flex: 1, textAlign: 'center', marginRight: 6 },
  versionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.3)', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 28 },
  versionText: { color: '#FFF', fontWeight: '900', fontSize: 16 },

  versionDropdownContainer: {
    position: 'absolute',
    top: 120,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    elevation: 30,
    minWidth: 340,
    maxHeight: 480,
    zIndex: 1000,
    borderWidth: 1.8,
    borderColor: '#BFDBFE',
  },
  versionItem: { padding: 16, borderRadius: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  currentVersion: { backgroundColor: '#EBF5FF' },
  versionLabel: { fontSize: 16, fontWeight: '800', color: '#1E40AF' },
  versionSub: { fontSize: 13.5, color: '#64748B', marginTop: 4 },

  compactPickupCard: {
    margin: 20,
    marginTop: 16,
    backgroundColor: '#ECFDF5',
    borderRadius: 24,
    padding: 20,
    borderWidth: 2,
    borderColor: '#10B981',
    elevation: 8,
  },
  pickupHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pickupTitle: { fontSize: 22, fontWeight: '900', color: '#065F46' },
  pickupCodeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 12 },
  codeLabel: { fontSize: 16, fontWeight: '700', color: '#065F46' },
  pickupCode: { fontSize: 36, fontWeight: '900', color: '#065F46', letterSpacing: 8 },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  timerText: { fontSize: 18, fontWeight: '800', color: '#10B981' },
  mapBtn: {
    marginTop: 14,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 20,
    gap: 8,
  },
  mapText: { color: '#FFF', fontSize: 16, fontWeight: '800' },

  oldVersionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFBEB',
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#FCD34D',
  },
  oldVersionText: { fontSize: 15.5, fontWeight: '700', color: '#92400E' },

  messageBubble: {
    marginHorizontal: 20,
    marginVertical: 12,
    padding: 18,
    borderRadius: 24,
    maxWidth: '86%',
    elevation: 8,
  },
  messageFromSeller: { backgroundColor: '#EFF6FF', borderBottomRightRadius: 6, alignSelf: 'flex-end', borderWidth: 1.8, borderColor: '#BFDBFE' },
  messageFromBuyer: { backgroundColor: '#F0FDF4', borderBottomLeftRadius: 6, alignSelf: 'flex-start', borderWidth: 1.8, borderColor: '#BBF7D0' },
  messageHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  messageSender: { fontSize: 15, fontWeight: '800', color: '#1E40AF' },
  messageVersion: { fontSize: 12.5, color: '#64748B' },
  messageText: { fontSize: 17.5, color: '#1E293B', lineHeight: 26 },

  compactCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginVertical: 6,
    borderRadius: 20,
    padding: 12,
    elevation: 6,
    borderWidth: 1.2,
    borderColor: '#E0E7FF',
  },
  compactImageWrapper: { marginRight: 14 },
  compactImage: { width: 68, height: 68, borderRadius: 16 },
  compactPlaceholder: { width: 68, height: 68, borderRadius: 16, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  compactContent: { flex: 1 },
  compactName: { fontSize: 15.5, fontWeight: '800', color: '#1E293B', lineHeight: 20 },
  compactPriceRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  compactOldPrice: { fontSize: 13, color: '#94A3B8', textDecorationLine: 'line-through' },
  compactNewPrice: { fontSize: 17, fontWeight: '900', color: '#3B82F6' },
  compactQuantity: { fontSize: 14, color: '#475569', fontWeight: '700' },
  compactBadge: { marginTop: 6, alignSelf: 'flex-start', backgroundColor: '#F8FAFC', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1.2, borderColor: '#BFDBFE' },
  compactBadgeText: { fontSize: 11, fontWeight: '800' },
  compactRemoveBtn: { padding: 8 },

  compactTotalCard: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    marginTop: 28,
    paddingVertical: 28,
    paddingHorizontal: 28,
    borderRadius: 28,
    alignItems: 'center',
    elevation: 20,
    borderWidth: 3.5,
    borderColor: '#3B82F6',
  },
  compactTotalLabel: { fontSize: 18, fontWeight: '900', color: '#1E40AF' },
  compactTotalPrice: { fontSize: 42, fontWeight: '900', color: '#3B82F6', marginTop: 8 },

  modernActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1.8,
    borderColor: '#E2E8F0',
    paddingBottom: Platform.OS === 'ios' ? 44 : 24,
    elevation: 24,
  },
  actionBtnCancel: { flex: 1, backgroundColor: '#EF4444', paddingVertical: 20, borderRadius: 20, elevation: 10 },
  actionBtnEdit: { flex: 1, backgroundColor: '#F59E0B', paddingVertical: 20, borderRadius: 20, elevation: 10 },
  actionBtnAccept: { flex: 1, backgroundColor: '#10B981', paddingVertical: 20, borderRadius: 20, elevation: 10 },
  actionBtnDisabled: { backgroundColor: '#94A3B8', opacity: 0.7 },
  actionBtnText: { textAlign: 'center', fontWeight: '900', fontSize: 17, color: '#FFF' },

  emptyItems: { padding: 100, alignItems: 'center' },
  emptyText: { fontSize: 18, color: '#64748B', marginTop: 16, fontWeight: '600' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  loaderText: { marginTop: 24, fontSize: 19, color: '#64748B', fontWeight: '700' },
});