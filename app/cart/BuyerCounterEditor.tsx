// cart/BuyerCounterEditor.tsx
// DECEMBER 1, 2025 — FINAL PERFECTION: Animated Message + Max Items

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  TextInput,
  Platform,
  Image,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../src/api';
import { useCart } from '@/context/CartContext';
import AddCustomItemModal from '@/components/cart/AddCustomItemModal';

interface POItem {
  id: string;
  name: string;
  image_url?: string | null;
  custom_image_url?: string | null;
  quantity: number;
  original_price: number;
  proposed_price: number;
  added_by?: 'buyer' | 'seller';
  _source: 'server' | 'local_cart';
  note?: string;
  is_custom?: boolean;
  _from_cart?: boolean;
}

export default function BuyerCounterEditor() {
  const { po_id } = useLocalSearchParams<{ po_id: string }>();
  const router = useRouter();
  const cart = useCart();

  const [items, setItems] = useState<POItem[]>([]);
  const [shopName, setShopName] = useState('Shop');
  const [shopId, setShopId] = useState<number | null>(null);
  const [version, setVersion] = useState(1);
  const [sellerMessage, setSellerMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const pulse = useSharedValue(1);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const animatedStyle = useAnimatedStyle(() => ({
  opacity: opacity.value,
  transform: [{ translateY: translateY.value }],
}))

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 700 });
    translateY.value = withTiming(0, { duration: 700 });
    if (sellerMessage) {
      pulse.value = withRepeat(
        withSequence(
          withSpring(1.35),
          withSpring(1)
        ),
        -1,
        true
      );
    }
  }, [sellerMessage]);

  useEffect(() => {
    AsyncStorage.getItem('sessionToken').then(setSessionToken);
  }, []);

  // FETCH + MERGE WITH CART
  useEffect(() => {
    if (!po_id || !sessionToken) return;

    const loadPO = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/po/buyer/detail/${po_id}/`, {
          headers: { Authorization: sessionToken },
        });

        const po = res.data.po;
        const versions = res.data.versions || [];
        const latest = versions.find((v: any) => v.is_latest) || versions[0];

        if (!latest) return router.back();
        if (po_id !== latest.id.toString()) {
          router.replace(`/cart/BuyerCounterEditor?po_id=${latest.id}`);
          return;
        }

        setShopName(po.shop_name || 'Shop');
        setShopId(po.shop_id);
        setVersion(latest.version);
        setSellerMessage(latest.message || '');

        const serverItems: POItem[] = latest.items.map((i: any, idx: number) => ({
          id: i.id?.toString() || `server-${idx}`,
          name: i.custom_name || i.product_name || 'Item',
          image_url: i.image_url || null,
          custom_image_url: i.custom_image_url || null,
          quantity: Number(i.quantity) || 1,
          original_price: Number(i.original_price) || 0,
          proposed_price: Number(i.proposed_price) || 0,
          added_by: i.added_by,
          _source: 'server' as const,
          note: i.note,
          is_custom: !!i.custom_name,
        }));

        const merged: POItem[] = [...serverItems];
        const localCartItems = cart.getShopItems(po.shop_id);

        localCartItems.forEach(cartItem => {
          const exists = merged.some(serverItem => {
            const serverName = serverItem.custom_name || serverItem.name;
            const cartName = cartItem.custom_name || cartItem.product_name;
            return serverName === cartName;
          });

          if (!exists) {
            merged.push({
              id: `cart-${cartItem.id}`,
              name: cartItem.custom_name || cartItem.product_name || 'Item',
              image_url: cartItem.image || null,
              custom_image_url: null,
              quantity: cartItem.quantity,
              original_price: cartItem.original_price,
              proposed_price: cartItem.price,
              added_by: 'buyer',
              _source: 'local_cart' as const,
              note: cartItem.note,
              is_custom: cartItem.is_custom,
              _from_cart: true,
            });
          }
        });

        setItems(merged);
      } catch (err: any) {
        Alert.alert('Error', err.response?.data?.error || 'Failed to load offer');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    loadPO();
  }, [po_id, sessionToken, router, cart]);

  const handleAddCustomItem = (itemData: any) => {
    const newItem: POItem = {
      id: `local-${Date.now()}-${Math.random()}`,
      name: itemData.product_name,
      image_url: null,
      custom_image_url: itemData.image || null,
      quantity: 1,
      original_price: itemData.price,
      proposed_price: itemData.price,
      added_by: 'buyer',
      _source: 'local_cart',
      note: itemData.note,
      is_custom: true,
      _from_cart: true,
    };
    setItems(prev => [...prev, newItem]);
    setCustomModalVisible(false);
  };

  const updateItem = (id: string, field: 'quantity' | 'proposed_price', value: number) => {
    setItems(prev => prev.map(it => (it.id === id ? { ...it, [field]: value } : it)));
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(it => it.id !== id));

  const sendCounter = async () => {
    if (items.length === 0) return Alert.alert('Empty Order', 'Please add at least one item');

    setSending(true);
    const form = new FormData();
    form.append('po_id', po_id);
    if (message.trim()) form.append('message', message.trim());

    items.forEach((it, i) => {
      const prefix = `items[${i}]`;
      form.append(`${prefix}[product_name]`, it.name);
      if (it.is_custom) form.append(`${prefix}[custom_name]`, it.name);
      form.append(`${prefix}[quantity]`, it.quantity.toString());
      form.append(`${prefix}[proposed_price]`, it.proposed_price.toString());
      form.append(`${prefix}[original_price]`, it.original_price.toString());
      if (it.note) form.append(`${prefix}[note]`, it.note);

      if (it.image_url && it._source === 'server') {
        form.append(`${prefix}[image_url]`, it.image_url);
      }

      if (it.custom_image_url && it._source === 'local_cart') {
        const uri = it.custom_image_url;
        const filename = uri.split('/').pop() || `custom_${i}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        (form as any).append(`${prefix}[custom_image]`, { uri, name: filename, type });
      }
    });

    try {
      await api.post('/po/counter/', form, {
        headers: { Authorization: sessionToken! },
      });

      Alert.alert('Counter Sent!', 'Your counter offer has been sent.', [
        { text: 'OK', onPress: () => router.replace('/cart/BuyerPODashboard') }
      ]);
    } catch (err: any) {
      Alert.alert('Failed', err.response?.data?.error || 'Try again.');
    } finally {
      setSending(false);
    }
  };

  const total = useMemo(() => items.reduce((s, i) => s + i.proposed_price * i.quantity, 0), [items]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#3A7BD5" />
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#60A5FA" />
          <Text style={styles.loaderText}>Preparing your counter...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#3A7BD5" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back-ios" size={26} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{shopName}</Text>
        <View style={styles.versionBadge}>
          <Text style={styles.versionText}>v{version}</Text>
        </View>
      </View>

      {/* SELLER MESSAGE — ANIMATED ICON + POPUP */}
      {sellerMessage ? (
        <TouchableOpacity style={styles.messageTrigger} onPress={() => setShowMessageModal(true)}>
          <Animated.View style={[styles.messageIcon, pulseStyle]}>
            <Ionicons name="chatbubble-ellipses" size={28} color="#3B82F6" />
          </Animated.View>
          <Text style={styles.messageHint}>Seller sent a message</Text>
        </TouchableOpacity>
      ) : null}

      <Animated.View style={[animatedStyle, { flex: 1 }]}>
        <ScrollView contentContainerStyle={{ paddingBottom: 340 }}>
          {items.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="cart-outline" size={84} color="#CBD5E1" />
              <Text style={styles.emptyText}>No items yet</Text>
              <Text style={styles.emptySub}>Add items from shop or create custom ones</Text>
            </View>
          ) : (
            items.map(item => (
              <UltraCompactItem key={item.id} item={item} onUpdateQuantity={q => updateItem(item.id, 'quantity', q)} onUpdatePrice={p => updateItem(item.id, 'proposed_price', p)} onRemove={() => removeItem(item.id)} />
            ))
          )}

          <TouchableOpacity style={styles.addBtn} onPress={() => setCustomModalVisible(true)}>
            <Ionicons name="add-circle" size={34} color="#3B82F6" />
            <Text style={styles.addText}>Add Custom Item</Text>
          </TouchableOpacity>

          <View style={styles.messageSection}>
            <Text style={styles.messageLabel}>Your message (optional)</Text>
            <TextInput
              style={styles.messageInput}
              placeholder="E.g. Can you do better on the price?"
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={500}
            />
            <Text style={styles.charCount}>{message.length}/500</Text>
          </View>

          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalPrice}>₦{total.toLocaleString()}</Text>
          </View>
        </ScrollView>
      </Animated.View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.sendBtn, (sending || items.length === 0) && styles.sendBtnDisabled]}
          onPress={sendCounter}
          disabled={sending || items.length === 0}
        >
          {sending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="send" size={26} color="#FFF" />
              <Text style={styles.sendText}>Send Counter Offer</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* FULL MESSAGE MODAL */}
      <Modal visible={showMessageModal} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowMessageModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.messageModal}>
              <Text style={styles.modalMessage}>“{sellerMessage}”</Text>
              <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowMessageModal(false)}>
                <Ionicons name="close-circle" size={40} color="#3B82F6" />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <AddCustomItemModal
        visible={customModalVisible}
        onClose={() => setCustomModalVisible(false)}
        shopId={shopId || 0}
        shopName={shopName}
        onAddItem={handleAddCustomItem}
      />
    </SafeAreaView>
  );
}

const UltraCompactItem = ({ item, onUpdateQuantity, onUpdatePrice, onRemove }: {
  item: POItem;
  onUpdateQuantity: (qty: number) => void;
  onUpdatePrice: (price: number) => void;
  onRemove: () => void;
}) => {
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState(item.proposed_price.toString());

  const handleSave = () => {
    const price = parseFloat(priceInput) || item.original_price;
    onUpdatePrice(price);
    setEditingPrice(false);
  };

  const priceChanged = item.proposed_price !== item.original_price;
  const displayImage = item.custom_image_url || item.image_url;

  const getChangeInfo = () => {
    if (item._from_cart) return { text: 'Added from cart', color: '#166534', icon: 'cart-outline' };
    if (item.is_custom && item._source === 'local_cart') return { text: 'New custom', color: '#7C3AED', icon: 'sparkles' };
    if (item.is_custom) return { text: 'Custom item', color: '#7C3AED', icon: 'create-outline' };
    if (priceChanged && item.added_by === 'buyer') return { text: 'You changed', color: '#3B82F6', icon: 'arrow-up-outline' };
    if (priceChanged && item.added_by === 'seller') return { text: 'Seller changed', color: '#EA580C', icon: 'arrow-down-outline' };
    return null;
  };

  const change = getChangeInfo();

  return (
    <View style={styles.compactCard}>
      <View style={styles.compactImageWrapper}>
        {displayImage ? (
          <Image source={{ uri: displayImage }} style={styles.compactImage} />
        ) : (
          <View style={styles.compactPlaceholder}>
            <Ionicons name="image-outline" size={24} color="#94A3B8" />
          </View>
        )}
      </View>

      <View style={styles.compactContent}>
        <Text style={styles.compactName} numberOfLines={2}>{item.name}</Text>

        <View style={styles.compactPriceRow}>
          {priceChanged && (
            <Text style={styles.compactOldPrice}>₦{item.original_price.toLocaleString()}</Text>
          )}
          <Text style={styles.compactNewPrice}>₦{item.proposed_price.toLocaleString()}</Text>
          <Text style={styles.compactQuantity}>× {item.quantity}</Text>
        </View>

        {change && (
          <View style={[styles.compactBadge, { backgroundColor: change.bg + '30' }]}>
            <Text style={[styles.compactBadgeText, { color: change.color }]}>{change.text}</Text>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.compactRemoveBtn} onPress={onRemove}>
        <Ionicons name="trash-outline" size={20} color="#EF4444" />
      </TouchableOpacity>
    </View>
  );
};

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
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#FFF', flex: 1, textAlign: 'center', marginRight: -60 },
  versionBadge: { backgroundColor: 'rgba(255,255,255,0.3)', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 28 },
  versionText: { color: '#FFF', fontWeight: '900', fontSize: 16 },

  // ANIMATED MESSAGE TRIGGER
  messageTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 18,
    padding: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#BFDBFE',
    elevation: 8,
  },
  messageIcon: {
    width: 38,
    height: 38,
    borderRadius: 24,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  messageHint: { fontSize: 16.5, fontWeight: '800', color: '#1E40AF' },

  // ULTRA COMPACT CARD
  compactCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginVertical: 6,
    borderRadius: 20,
    padding: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1.2,
    borderColor: '#E0E7FF',
  },
  compactImageWrapper: { marginRight: 14 },
  compactImage: { width: 64, height: 64, borderRadius: 16 },
  compactPlaceholder: { width: 64, height: 64, borderRadius: 16, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#E2E8F0', borderStyle: 'dashed' },

  compactContent: { flex: 1 },
  compactName: { fontSize: 15.5, fontWeight: '800', color: '#1E293B', lineHeight: 20, flexShrink: 1 },
  compactPriceRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  compactOldPrice: { fontSize: 12.5, color: '#94A3B8', textDecorationLine: 'line-through' },
  compactNewPrice: { fontSize: 16.5, fontWeight: '900', color: '#3B82F6' },
  compactQuantity: { fontSize: 13.5, color: '#475569', fontWeight: '700' },

  compactBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  compactBadgeText: { fontSize: 11, fontWeight: '800' },

  compactRemoveBtn: { padding: 8 },

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 20, marginVertical: 20, padding: 20, backgroundColor: '#EFF6FF', borderRadius: 24, borderWidth: 2.5, borderColor: '#3B82F6', borderStyle: 'dashed' },
  addText: { fontSize: 17.5, fontWeight: '800', color: '#3B82F6', marginLeft: 12 },

  messageSection: { marginHorizontal: 20, marginTop: 8, backgroundColor: '#FFF', padding: 20, borderRadius: 24, elevation: 8, borderWidth: 1.8, borderColor: '#BFDBFE' },
  messageLabel: { fontSize: 16.5, fontWeight: '800', color: '#1E40AF', marginBottom: 12 },
  messageInput: { backgroundColor: '#F8FAFC', borderRadius: 18, padding: 16, fontSize: 16, height: 110, textAlignVertical: 'top', borderWidth: 1.8, borderColor: '#E2E8F0' },
  charCount: { fontSize: 12.5, color: '#64748B', textAlign: 'right', marginTop: 8 },

  totalCard: { margin: 20, marginTop: 32, backgroundColor: '#FFF', paddingVertical: 34, paddingHorizontal: 28, borderRadius: 30, alignItems: 'center', elevation: 24, shadowColor: '#3B82F6', shadowOpacity: 0.3, shadowRadius: 25, borderWidth: 3.5, borderColor: '#3B82F6' },
  totalLabel: { fontSize: 19, fontWeight: '800', color: '#1E40AF' },
  totalPrice: { fontSize: 46, fontWeight: '900', color: '#3B82F6', marginTop: 8 },

  footer: { padding: 20, backgroundColor: '#FFF', borderTopWidth: 1.8, borderColor: '#E2E8F0', paddingBottom: Platform.OS === 'ios' ? 44 : 24, elevation: 24 },
  sendBtn: { backgroundColor: '#3B82F6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 24, borderRadius: 24, gap: 14, elevation: 12 },
  sendBtnDisabled: { backgroundColor: '#94A3B8', opacity: 0.7 },
  sendText: { color: '#FFF', fontSize: 19, fontWeight: '900' },

  // MESSAGE MODAL
  modalOverlay: { flex: 1, backgroundColor: '#000000CC', justifyContent: 'center', alignItems: 'center' },
  messageModal: { backgroundColor: '#FFF', marginHorizontal: 30, padding: 32, borderRadius: 32, elevation: 20, maxHeight: '80%' },
  modalMessage: { fontSize: 20, color: '#1E293B', lineHeight: 32, textAlign: 'center' },
  closeModalBtn: { position: 'absolute', top: 16, right: 16 },

  empty: { paddingTop: 80, alignItems: 'center' },
  emptyText: { fontSize: 20, fontWeight: '700', color: '#64748B', marginTop: 16 },
  emptySub: { fontSize: 15, color: '#94A3B8', marginTop: 6 },

  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: { marginTop: 24, fontSize: 18, color: '#64748B', fontWeight: '700' },
});