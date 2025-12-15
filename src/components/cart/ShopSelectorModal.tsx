// src/components/cart/ShopSelectorModal.tsx
// FINAL — LONG NAMES FIXED + CLEAN LAYOUT + COMPACT DESIGN

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useCart } from '../../context/CartContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api';
import { Ionicons } from '@expo/vector-icons';

const { height } = Dimensions.get('window');

type CartShop = {
  shopId: string;
  shopName: string;
  itemCount: number;
  totalAmount: number;
  type: 'cart';
};

type POShop = {
  shopId: string;
  shopName: string;
  itemCount: number;
  totalAmount: number;
  poId: string;
  status: 'proposed' | 'countered' | 'pickup_pending';
  type: 'po';
  last_counter?: 'buyer' | 'seller' | null;
  pickup_code?: string | null;
  _hasLocalItems?: boolean;
};

type Shop = CartShop | POShop;

type Props = {
  visible: boolean;
  onClose: () => void;
  activePOs?: number;
  totalItems?: number;
};

export const ShopSelectorModal = ({
  visible,
  onClose,
  activePOs = 0,
  totalItems = 0,
}: Props) => {
  const { items } = useCart();
  const router = useRouter();

  const [sessionToken, setSessionToken] = React.useState<string | null>(null);
  const [buyerPOs, setBuyerPOs] = React.useState<POShop[]>([]);
  const [loadingPOs, setLoadingPOs] = React.useState(false);

  React.useEffect(() => {
    const load = async () => {
      const token = await AsyncStorage.getItem('sessionToken');
      setSessionToken(token);
    };
    load();
  }, []);

  React.useEffect(() => {
    if (!visible || !sessionToken) return;

    const fetch = async () => {
      setLoadingPOs(true);
      try {
        const res = await api.get('/po/buyer/list/', {
          headers: { Authorization: sessionToken },
        });

        const active = (res.data.pos || [])
          .filter((p: any) => ['proposed', 'countered', 'pickup_pending'].includes(p.status))
          .map((p: any): POShop => ({
            shopId: String(p.shop_id || p.shop?.id || 'unknown').trim(),
            shopName: p.shop_name || p.shop__name || 'Unknown Shop',
            itemCount: p.item_count || 0,
            totalAmount: parseFloat(p.total) || 0,
            poId: p.id,
            status: p.status,
            type: 'po',
            last_counter: p.last_counter,
            pickup_code: p.pickup_code || null,
          }))
          .filter(po => po.shopId && po.shopId !== 'unknown' && po.shopId !== 'null');

        setBuyerPOs(active);
      } catch (e) {
        console.error('Failed to load buyer POs', e);
      } finally {
        setLoadingPOs(false);
      }
    };

    fetch();
  }, [visible, sessionToken]);

  const scale = React.useRef(new Animated.Value(0.92)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 8.5, tension: 120, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const cartKey = React.useMemo(() =>
    JSON.stringify(items.map(i => `${i.shopId}-${i.id}-${i.quantity}-${i.price}`))
  , [items]);

  const cartShops = React.useMemo(() => {
    const map = new Map<string, CartShop>();
    items.forEach(i => {
      const key = String(i.shopId).trim();
      if (!key || key === 'undefined' || key === 'null') return;

      const amount = i.price * i.quantity;
      const existing = map.get(key);

      if (existing) {
        existing.itemCount += 1;
        existing.totalAmount += amount;
      } else {
        map.set(key, {
          shopId: key,
          shopName: i.shopName,
          itemCount: 1,
          totalAmount: amount,
          type: 'cart',
        });
      }
    });
    return Array.from(map.values());
  }, [cartKey]);

  const allShops: Shop[] = React.useMemo(() => {
    const result: Shop[] = [];

    buyerPOs
      .filter(po => ['proposed', 'countered'].includes(po.status))
      .forEach(po => {
        const cartForShop = cartShops.find(c => c.shopId === po.shopId);

        if (cartForShop && cartForShop.itemCount > 0) {
          result.push({
            ...po,
            itemCount: po.itemCount + cartForShop.itemCount,
            totalAmount: po.totalAmount + cartForShop.totalAmount,
            _hasLocalItems: true,
          });
        } else {
          result.push(po);
        }
      });

    cartShops.forEach(cartShop => {
      const hasActivePO = buyerPOs.some(po =>
        po.shopId === cartShop.shopId && ['proposed', 'countered'].includes(po.status)
      );
      if (!hasActivePO) {
        result.push(cartShop);
      }
    });

    buyerPOs
      .filter(po => po.status === 'pickup_pending')
      .forEach(po => result.push(po));

    return result.sort((a, b) => {
      const aTurn = a.type === 'po' && (a as POShop).last_counter === 'seller';
      const bTurn = b.type === 'po' && (b as POShop).last_counter === 'seller';
      if (aTurn && !bTurn) return -1;
      if (!aTurn && bTurn) return 1;

      const aPickup = a.type === 'po' && (a as POShop).status === 'pickup_pending';
      const bPickup = b.type === 'po' && (b as POShop).status === 'pickup_pending';
      if (aPickup && !bPickup) return -1;
      if (!aPickup && bPickup) return 1;

      return 0;
    });
  }, [buyerPOs, cartShops]);

  const openShop = (shop: Shop) => {
    onClose();
    if (shop.type === 'cart') {
      router.push(`/cart/editor?shopId=${shop.shopId}`);
    } else {
      router.push(`/cart/BuyerPOEditor?poId=${(shop as POShop).poId}`);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none">
      <Pressable style={styles.overlay} onPress={onClose}>
        <LinearGradient colors={['#000000CC', '#000000F0']} style={StyleSheet.absoluteFill} />

        <Animated.View style={[styles.modalContainer, { opacity: opacityAnim, transform: [{ scale }] }]}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ flex: 1 }}>
            <View style={styles.modalCard}>
              {/* Header + X Button */}
              <View style={styles.header}>
                <View style={styles.titleContainer}>
                  <Text style={styles.title}>Your Active Orders</Text>
                  <Text style={styles.subtitle}>
                    {totalItems > 0 && `${totalItems} item${totalItems > 1 ? 's' : ''} in cart`}
                    {totalItems > 0 && activePOs > 0 && '  •  '}
                    {activePOs > 0 && `${activePOs} active negotiation${activePOs > 1 ? 's' : ''}`}
                  </Text>
                </View>
                <TouchableOpacity style={styles.closeXButton} onPress={onClose}>
                  <Ionicons name="close" size={28} color="#475569" />
                </TouchableOpacity>
              </View>

              {/* FULLY SCROLLABLE LIST */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                style={{ flex: 1 }}
              >
                {loadingPOs ? (
                  <View style={styles.loader}>
                    <ActivityIndicator size="large" color="#60A5FA" />
                    <Text style={styles.loaderText}>Loading your orders…</Text>
                  </View>
                ) : allShops.length === 0 ? (
                  <View style={styles.empty}>
                    <Ionicons name="cart-outline" size={90} color="#94A3B8" />
                    <Text style={styles.emptyTitle}>All clear!</Text>
                    <Text style={styles.emptySubtitle}>No active orders or cart items</Text>
                  </View>
                ) : (
                  allShops.map((shop, idx) => (
                    <ShopRow key={`${shop.shopId}-${shop.type}-${idx}`} shop={shop} index={idx} onPress={() => openShop(shop)} />
                  ))
                )}
              </ScrollView>

              <TouchableOpacity style={styles.bottomCloseButton} onPress={onClose}>
                <Text style={styles.bottomCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const ShopRow = React.memo(({ shop, index, onPress }: { shop: Shop; index: number; onPress: () => void }) => {
  const translateY = React.useRef(new Animated.Value(60)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.stagger(70, [
      Animated.delay(index * 80),
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, friction: 9, tension: 100, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, [index]);

  const isPickup = shop.type === 'po' && shop.status === 'pickup_pending';
  const hasLocalItems = (shop as any)._hasLocalItems;

  let badgeText: string;
  let badgeColor: string;
  let badgeIcon: string | null = null;

  if (shop.type === 'cart') {
    badgeText = 'New Order';
    badgeColor = '#3B82F6';
    badgeIcon = 'add-circle';
  } else if (isPickup) {
    badgeText = 'Ready!';
    badgeColor = '#10B981';
    badgeIcon = 'checkmark-circle';
  } else if (hasLocalItems) {
    badgeText = 'Updated';
    badgeColor = '#F59E0B';
    badgeIcon = 'alert-circle';
  } else if (shop.last_counter === 'seller') {
    badgeText = 'Your Turn!';
    badgeColor = '#DC2626';
    badgeIcon = 'arrow-forward-circle';
  } else if (shop.last_counter === 'buyer') {
    badgeText = 'You Countered';
    badgeColor = '#7C3AED';
  } else {
    badgeText = 'Waiting';
    badgeColor = '#64748B';
  }

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <TouchableOpacity style={styles.shopCard} onPress={onPress} activeOpacity={0.92}>
        <LinearGradient colors={['#FFFFFF', '#F8FAFC']} style={StyleSheet.absoluteFill} />
        <View style={styles.cardContent}>
          {/* Shop Name — Full width, no truncation */}
          <Text style={styles.shopName} numberOfLines={2}>
            {shop.shopName}
          </Text>

          {/* Badge moved BELOW name — never squeezes text */}
          <View style={styles.badgeContainer}>
            <View style={[styles.badge, { backgroundColor: badgeColor }]}>
              {badgeIcon && <Ionicons name={badgeIcon as any} size={16} color="#FFF" />}
              <Text style={styles.badgeText}>{badgeText}</Text>
            </View>
          </View>

          {/* Price + Item Count */}
          <View style={styles.cardBody}>
            <Text style={styles.itemCount}>
              {shop.itemCount} item{shop.itemCount > 1 ? 's' : ''}
            </Text>
            <Text style={styles.price}>₦{shop.totalAmount.toLocaleString()}</Text>
          </View>

          {isPickup && shop.pickup_code && (
            <View style={styles.pickupBox}>
              <Ionicons name="shield-checkmark" size={22} color="#10B981" />
              <Text style={styles.pickupLabel}>Pickup Code:</Text>
              <Text style={styles.pickupCode}>{shop.pickup_code}</Text>
            </View>
          )}

          {!isPickup && (
            <Text style={styles.statusHint}>
              {shop.type === 'cart'
                ? 'Ready to send • Tap to review & send'
                : hasLocalItems
                ? 'New items added • Tap to continue'
                : shop.last_counter === 'seller'
                ? 'Seller countered • Your turn to respond'
                : shop.last_counter === 'buyer'
                ? 'You countered • Waiting for seller'
                : 'Waiting for seller response'}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.9)',
  },

  modalContainer: {
    width: '94%',
    maxWidth: 500,
    height: height * 0.88,
    maxHeight: height * 0.9,
    borderRadius: 38,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 50,
    elevation: 50,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 38,
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 28,
    backgroundColor: '#F0F9FF',
    borderBottomWidth: 2,
    borderColor: '#BAE6FD',
  },
  titleContainer: { flex: 1, paddingRight: 20 },
  title: { fontSize: 30, fontWeight: '900', color: '#0C4A6B', letterSpacing: -0.8 },
  subtitle: { marginTop: 10, fontSize: 16, color: '#64748B', fontWeight: '600' },

  closeXButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 12,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },

  loader: { alignItems: 'center', paddingVertical: 100 },
  loaderText: { marginTop: 20, fontSize: 18, color: '#64748B', fontWeight: '600' },

  empty: { alignItems: 'center', paddingVertical: 120 },
  emptyTitle: { marginTop: 28, fontSize: 26, fontWeight: '800', color: '#1E293B' },
  emptySubtitle: { marginTop: 12, fontSize: 16, color: '#64748B' },

  shopCard: {
    marginBottom: 14, // Reduced from 20
    borderRadius: 26,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E0F2FE',
  },
  cardContent: { padding: 18 }, // Reduced from 24

  // Shop name — full width, wraps cleanly
  shopName: {
    fontSize: 21,
    fontWeight: '900',
    color: '#1E293B',
    lineHeight: 26,
    marginBottom: 6,
  },

  // Badge now below name — no more squeezing
  badgeContainer: {
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 30,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 14,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  itemCount: { fontSize: 16, color: '#64748B', fontWeight: '600' },
  price: { fontSize: 25, fontWeight: '900', color: '#DC2626' },

  statusHint: {
    marginTop: 14,
    fontSize: 14.5,
    color: '#64748B',
    fontStyle: 'italic',
    lineHeight: 20,
  },

  pickupBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 24,
    marginTop: 14,
    alignSelf: 'flex-start',
    borderWidth: 3,
    borderColor: '#10B981',
  },
  pickupLabel: { marginLeft: 10, fontSize: 15, fontWeight: '800', color: '#166534' },
  pickupCode: { marginLeft: 12, fontSize: 30, fontWeight: '900', color: '#10B981', letterSpacing: 6 },

  bottomCloseButton: {
    marginTop: 8,
    marginBottom: 20,
    alignSelf: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 64,
    paddingVertical: 20,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: '#CBD5E1',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  bottomCloseText: { fontSize: 19, fontWeight: '800', color: '#475569' },
});

export default ShopSelectorModal;