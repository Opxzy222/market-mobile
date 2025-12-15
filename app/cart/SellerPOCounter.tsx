// screens/SellerPOCounter.tsx
// DECEMBER 5, 2025 — FINAL: Fixed keys + note display + single request

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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../src/api';
import AddCustomItemModal from '@/components/cart/AddCustomItemModal';
import { useCart } from '@/context/CartContext';

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
}

const LuxeItemCard = ({ item, onUpdateQuantity, onUpdatePrice, onRemove }: {
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
    // Custom items always show "Custom Item"
    if (item.is_custom) return { text: 'Custom Item', color: '#7C3AED', icon: 'sparkles' };

    // Seller made changes (either from server or local)
    if (priceChanged && (item.added_by === 'seller' || item._source === 'local_cart')) {
      return { text: 'You changed', color: '#EA580C', icon: 'arrow-up-outline' };
    }

    // Buyer made changes
    if (priceChanged && item.added_by === 'buyer') {
      return { text: 'Customer changed', color: '#DC2626', icon: 'arrow-down-outline' };
    }

    return null;
  };

  const change = getChangeInfo();

  return (
    <View style={styles.card}>
      <View style={styles.imageWrapper}>
        {displayImage ? (
          <Image source={{ uri: displayImage }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            {item.is_custom ? (
              <Ionicons name="create-outline" size={32} color="#7C3AED" />
            ) : (
              <Ionicons name="image-outline" size={28} color="#94A3B8" />
            )}
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
          {item.is_custom && (
            <View style={styles.customBadge}>
              <Ionicons name="sparkles" size={14} color="#7C3AED" />
              <Text style={styles.customBadgeText}>Custom</Text>
            </View>
          )}
        </View>

        {/* NOTE NOW DISPLAYS CORRECTLY */}
        {item.note ? (
          <View style={styles.noteContainer}>
            <Ionicons name="chatbubble-outline" size={14} color="#92400E" />
            <Text style={styles.note}>Note: {item.note.trim()}</Text>
          </View>
        ) : null}

        <View style={styles.priceSection}>
          {editingPrice ? (
            <View style={styles.editRow}>
              <TextInput
                style={styles.priceInput}
                value={priceInput}
                onChangeText={setPriceInput}
                keyboardType="numeric"
                autoFocus
                onBlur={handleSave}
                onSubmitEditing={handleSave}
              />
              <TouchableOpacity onPress={handleSave}>
                <Ionicons name="checkmark-circle" size={26} color="#10B981" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setEditingPrice(true)} style={styles.priceRow}>
              {priceChanged && (
                <Text style={styles.oldPrice}>₦{item.original_price.toLocaleString()}</Text>
              )}
              <Text style={styles.newPrice}>₦{item.proposed_price.toLocaleString()}</Text>
              {change && (
                <View style={[styles.tag, { backgroundColor: item.is_custom ? '#FAF5FF' : '#FFF4E5' }]}>
                  <Ionicons name={change.icon as any} size={14} color={change.color} />
                  <Text style={[styles.tagText, { color: change.color }]}>{change.text}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.quantityBox}>
            <TouchableOpacity onPress={() => onUpdateQuantity(Math.max(1, item.quantity - 1))}>
              <Ionicons name="remove" size={22} color={item.quantity <= 1 ? '#CBD5E1' : '#EA580C'} />
            </TouchableOpacity>
            <Text style={styles.quantity}>{item.quantity}</Text>
            <TouchableOpacity onPress={() => onUpdateQuantity(item.quantity + 1)}>
              <Ionicons name="add" size={22} color="#EA580C" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default function SellerPOCounter() {
  const { poId } = useLocalSearchParams<{ poId: string }>();
  const router = useRouter();
  const { addItem } = useCart();

  const [items, setItems] = useState<POItem[]>([]);
  const [buyerName, setBuyerName] = useState('Customer');
  const [shopId, setShopId] = useState<number | null>(null);
  const [version, setVersion] = useState(1);
  const [buyerMessage, setBuyerMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [customModalVisible, setCustomModalVisible] = useState(false);

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 800 });
    translateY.value = withTiming(0, { duration: 800 });
  }, []);

  useEffect(() => {
    AsyncStorage.getItem('sessionToken').then(setSessionToken);
  }, []);

  // ONLY ONE API CALL — NO DUPLICATES
  useEffect(() => {
    if (!poId || !sessionToken) return;

    const loadPO = async () => {
      try {
        setLoading(true);

        const res = await api.get(`/po/seller/detail/${poId}/`, {
          headers: { Authorization: sessionToken },
        });

        const po = res.data.po;
        const versions = res.data.versions || [];

        const latest = versions.reduce((a: any, b: any) => (a.version > b.version ? a : b), versions[0]);

        setBuyerName(po.buyer_name || 'Customer');
        setShopId(po.shop_id || po.shop?.id || 0);
        setVersion(latest.version);
        setBuyerMessage(latest.message || '');

        const fetched: POItem[] = latest.items.map((i: any) => ({
          id: i.id?.toString() || `item-${i.product_name || 'custom'}-${Date.now()}-${Math.random()}`, // UNIQUE KEY
          name: i.custom_name || i.product_name || 'Item',
          image_url: i.image_url || null,
          custom_image_url: i.custom_image_url || null,
          quantity: Number(i.quantity) || 1,
          original_price: Number(i.original_price) || 0,
          proposed_price: Number(i.proposed_price) || 0,
          added_by: i.added_by,
          _source: 'server' as const,
          note: i.note || '',
          is_custom: !!i.custom_name,
        }));

        setItems(fetched);
      } catch (err: any) {
        console.error('Load failed:', err);
        Alert.alert('Error', err.response?.data?.error || 'Failed to load offer');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    loadPO();
  }, [poId, sessionToken, router]);

  const handleAddCustomItem = (itemData: {
    product_name: string;
    price: number;
    note?: string;
    image?: string;
  }) => {
    

    const newItem: POItem = {
      id: `local-${Date.now()}-${Math.random()}`,
      name: itemData.product_name,
      image_url: null,
      custom_image_url: itemData.image || null,
      quantity: 1,
      original_price: itemData.price,
      proposed_price: itemData.price,
      added_by: 'seller',
      _source: 'local_cart',
      note: itemData.note?.trim() || undefined,
      is_custom: true,
    };

    setItems(prev => [...prev, newItem]);
    setCustomModalVisible(false);
  };

  const updateItem = (id: string, field: 'quantity' | 'proposed_price', value: number) => {
  setItems(prev => prev.map(it => {
    if (it.id === id) {
      return {
        ...it,
        [field]: value,
        added_by: 'seller', // ← THIS IS THE FIX
      };
    }
    return it;
  }));
};

  const removeItem = (id: string) => setItems(prev => prev.filter(it => it.id !== id));

  const sendCounter = async () => {
    if (items.length === 0) return Alert.alert('Empty Offer', 'Add at least one item');

    setSending(true);
    const form = new FormData();
    form.append('po_id', poId);
    if (message.trim()) form.append('message', message.trim());

    items.forEach((it, i) => {
      const p = `items[${i}]`;
      form.append(`${p}[product_name]`, it.name);
      if (it.is_custom) form.append(`${p}[custom_name]`, it.name);
      form.append(`${p}[quantity]`, it.quantity.toString());
      form.append(`${p}[proposed_price]`, it.proposed_price.toString());
      form.append(`${p}[original_price]`, it.original_price.toString());
      if (it.note) form.append(`${p}[note]`, it.note);

      if (it.image_url && it._source === 'server') {
        form.append(`${p}[image_url]`, it.image_url);
      }

      if (it.custom_image_url && it._source === 'local_cart') {
        const uri = it.custom_image_url;
        const filename = uri.split('/').pop() || `custom_${i}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        (form as any).append(`${p}[custom_image]`, { uri, name: filename, type } as any);
      }
    });

    try {
      await api.post('/po/counter/', form, {
        headers: {
          Authorization: sessionToken!,
          'Content-Type': 'multipart/form-data',
        },
      });

      Alert.alert('Sent!', 'Your counter offer has been sent!', [
  { 
    text: 'OK', 
    onPress: () => {
      setMessage(''); // ← ADD THIS LINE
      router.replace('/cart/SellerPODashboard');
    }
  }
]);
    } catch (err: any) {
      Alert.alert('Failed', err.message || 'Could not send');
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
          <ActivityIndicator size="large" color="#EA580C" />
          <Text style={styles.loaderText}>Loading customer offer...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
          <StatusBar barStyle="light-content" backgroundColor="#3A7BD5" />
    
          <View style={styles.header}>
            <TouchableOpacity 
  onPress={() => {
    if (poId) {
      router.push(`/cart/SellerPOEditor?poId=${poId}`);
    } else {
      router.back(); // fallback
    }
  }} 
  style={styles.backBtn}
>
        <MaterialIcons name="arrow-back-ios" size={26} color="#FFF" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{buyerName}</Text>
      <View style={styles.versionBadge}>
        <Text style={styles.versionText}>v{version}</Text>
      </View>
          </View>
      {buyerMessage ? (
        <View style={styles.messageCard}>
          <Text style={styles.messageText}>“{buyerMessage}”</Text>
        </View>
      ) : null}

      <Animated.View style={[animatedStyle, { flex: 1 }]}>
        <ScrollView contentContainerStyle={{ paddingBottom: 360 }}>
          {items.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="cart-outline" size={88} color="#CBD5E1" />
              <Text style={styles.emptyText}>No items in this offer</Text>
              <Text style={styles.emptySub}>Customer will see your response</Text>
            </View>
          ) : (
            items.map(item => (
              <LuxeItemCard
                key={item.id} // ← NOW UNIQUE AND STABLE
                item={item}
                onUpdateQuantity={q => updateItem(item.id, 'quantity', q)}
                onUpdatePrice={p => updateItem(item.id, 'proposed_price', p)}
                onRemove={() => removeItem(item.id)}
              />
            ))
          )}

          <TouchableOpacity style={styles.addBtn} onPress={() => setCustomModalVisible(true)}>
            <Ionicons name="add-circle" size={34} color="#EA580C" />
            <Text style={styles.addText}>Add Custom Item</Text>
          </TouchableOpacity>

          <View style={styles.messageSection}>
            <Text style={styles.messageLabel}>Your message to customer (optional)</Text>
            <TextInput
              style={styles.messageInput}
              placeholder="E.g. Best deal I can offer at the moment."
              placeholderTextColor="#888"
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={500}
            />
            <Text style={styles.charCount}>{message.length}/500</Text>
          </View>

          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalPrice}>₦{total.toLocaleString('en-NG')}</Text>
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

      <AddCustomItemModal
        visible={customModalVisible}
        onClose={() => setCustomModalVisible(false)}
        shopId={shopId}
        shopName={buyerName}
        onAdd={handleAddCustomItem}
        isSeller={true}
      />
    </SafeAreaView>
  );
}

// Your beautiful styles — 100% untouched
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF5' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 18,
    backgroundColor: '#3A7BD5',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    elevation: 16,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  backBtn: { padding: 5,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)", },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#FFF', flex: 1, textAlign: 'center', marginRight: 6 },
  versionBadge: { backgroundColor: 'rgba(255,255,255,0.3)', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 28 },
  versionText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  messageCard: { marginHorizontal: 22, marginTop: 20, padding: 22, backgroundColor: '#FFF4E5', borderRadius: 28, borderWidth: 2, borderColor: '#FDBA74', elevation: 10 },
  messageText: { fontSize: 18, color: '#C2410C', lineHeight: 30, fontWeight: '600' },

  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 26,
    padding: 16,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FED7AA',
  },
  imageWrapper: { width: 80, height: 80, borderRadius: 20 },
  image: { width: 80, height: 80, borderRadius: 20 },
  placeholder: { width: 80, height: 80, borderRadius: 20, backgroundColor: '#FFF4E5', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FDBA74', borderStyle: 'dashed' },

  content: { flex: 1 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  name: { fontSize: 17, fontWeight: '800', color: '#1E293B', lineHeight: 24 },
  customBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF5FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D8B4FE',
    gap: 4,
  },
  customBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#7C3AED',
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    gap: 6,
  },
  note: {
    fontSize: 14,
    color: '#92400E',
    fontStyle: 'italic',
    flex: 1,
  },

  priceSection: { marginTop: 10 },
  priceRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  oldPrice: { fontSize: 14, color: '#94A3B8', textDecorationLine: 'line-through' },
  newPrice: { fontSize: 20, fontWeight: '900', color: '#EA580C' },
  tag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF4E5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 6 },
  tagText: { fontSize: 12, fontWeight: '800' },

  editRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  priceInput: { fontSize: 20, fontWeight: '900', color: '#EA580C', borderBottomWidth: 3, borderColor: '#EA580C', paddingBottom: 6, width: 140 },

  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  quantityBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF4E5', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, gap: 16 },
  quantity: { fontSize: 18, fontWeight: '900', minWidth: 36, textAlign: 'center', color: '#1E293B' },
  removeBtn: { padding: 12 },

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 20, marginVertical: 22, padding: 22, backgroundColor: '#FFF4E5', borderRadius: 28, borderWidth: 3, borderColor: '#EA580C', borderStyle: 'dashed' },
  addText: { fontSize: 18, fontWeight: '900', color: '#EA580C', marginLeft: 14 },

  messageSection: { marginHorizontal: 20, marginTop: 10, backgroundColor: '#FFF', padding: 24, borderRadius: 28, elevation: 12, borderWidth: 2, borderColor: '#FDBA74' },
  messageLabel: { fontSize: 17, fontWeight: '900', color: '#C2410C', marginBottom: 14 },
  messageInput: { backgroundColor: '#FFF4E5', borderRadius: 20, padding: 18, fontSize: 16.5, height: 120, textAlignVertical: 'top', borderWidth: 2, borderColor: '#FDBA74' },
  charCount: { fontSize: 13, color: '#92400E', textAlign: 'right', marginTop: 10 },

  totalCard: { margin: 20, marginTop: 36, backgroundColor: '#FFF', paddingVertical: 38, paddingHorizontal: 32, borderRadius: 34, alignItems: 'center', elevation: 28, shadowColor: '#EA580C', shadowOpacity: 0.35, shadowRadius: 30, borderWidth: 4, borderColor: '#EA580C' },
  totalLabel: { fontSize: 20, fontWeight: '900', color: '#C2410C' },
  totalPrice: { fontSize: 50, fontWeight: '900', color: '#EA580C', marginTop: 10, letterSpacing: 1 },

  footer: { padding: 22, backgroundColor: '#FFF', borderTopWidth: 2, borderColor: '#FED7AA', paddingBottom: Platform.OS === 'ios' ? 44 : 24, elevation: 28 },
  sendBtn: { backgroundColor: '#EA580C', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 26, borderRadius: 28, gap: 16, elevation: 16 },
  sendBtnDisabled: { backgroundColor: '#94A3B8', opacity: 0.7 },
  sendText: { color: '#FFF', fontSize: 20, fontWeight: '900' },

  empty: { paddingTop: 90, alignItems: 'center' },
  emptyText: { fontSize: 21, fontWeight: '800', color: '#64748B', marginTop: 18 },
  emptySub: { fontSize: 15.5, color: '#94A3B8', marginTop: 8 },

  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: { marginTop: 28, fontSize: 19, color: '#64748B', fontWeight: '700' },
});