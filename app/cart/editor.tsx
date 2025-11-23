// cart/NewOrderEditor.tsx
// FINAL — NOV 20, 2025 — GLOBAL MESSAGE PER ORDER (PER VERSION)
// @opxzy22 CERTIFIED — DEPLOY NOW

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  ActivityIndicator,
  TextInput, // ← NEW IMPORT
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCart } from '@/context/CartContext';
import CartItemRow from '@/components/cart/CartItemRow';
import AddCustomItemModal from '@/components/cart/AddCustomItemModal';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import api from '../../src/api';

const COLORS = {
  background: '#F9FAFB',
  surface: '#FFFFFF',
  primary: '#3A7BD5',
  primaryLight: '#5E9EFF',
  text: '#1F2937',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
};
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 84 : 70;
const FOOTER_PADDING = 160; // ← Increased for message input
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://api.gogo-digital.com';

export default function NewOrderEditor() {
  const { shopId } = useLocalSearchParams();
  const shopIdNum = parseInt(shopId as string, 10);
  const { getShopItems, totalAmount, clearShopCart } = useCart();
  const router = useRouter();

  const [items, setItems] = useState<any[]>([]);
  const [shopName, setShopName] = useState<string>('');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [message, setMessage] = useState(''); // ← NEW: Global message
  const isMountedRef = useRef(true);

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 500 });
    translateY.value = withTiming(0, { duration: 500 });
  }, []);

  useEffect(() => {
    AsyncStorage.getItem('sessionToken').then(token => {
      if (isMountedRef.current) setSessionToken(token);
    });
  }, []);

  useEffect(() => {
    const currentItems = getShopItems(shopIdNum);
    setItems(currentItems);
    if (currentItems.length > 0 && !shopName) {
      setShopName(currentItems[0].shopName);
    }
  }, [shopIdNum, getShopItems]);

  const handleSuccess = useCallback(() => {
    clearShopCart(shopIdNum);
    router.replace('/cart/BuyerPODashboard');
  }, [clearShopCart, shopIdNum, router]);

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={64} color={COLORS.textSecondary} />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyText}>Add items from the shop first.</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={26} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send Order</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.shopCard}>
        <View style={styles.shopIcon}>
          <Ionicons name="storefront" size={20} color={COLORS.primary} />
        </View>
        <View>
          <Text style={styles.shopName}>{shopName}</Text>
          <Text style={styles.itemCount}>
            {items.length} item{items.length > 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      <Animated.View style={[animatedStyle, { flex: 1 }]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: TAB_BAR_HEIGHT + FOOTER_PADDING },
          ]}
        >
          {items.map((item, index) => (
            <View key={item.id} style={index === 0 ? styles.firstItem : styles.itemWrapper}>
              <CartItemRow item={item} />
            </View>
          ))}

          <AddCustomItemButton onPress={() => setShowCustomModal(true)} />

          {/* NEW: GLOBAL MESSAGE INPUT */}
          <View style={styles.messageContainer}>
            <Text style={styles.messageLabel}>Add a message (optional)</Text>
            <TextInput
              style={styles.messageInput}
              placeholder="E.g. Abeg do fast delivery, I dey rush"
              placeholderTextColor={COLORS.textSecondary}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={4}
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>
              {message.length}/500
            </Text>
          </View>

          <View style={styles.footer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalAmount}>₦{totalAmount.toLocaleString()}</Text>
            </View>

            <SendOrderButton
              shopId={shopIdNum}
              items={items}
              sessionToken={sessionToken}
              message={message} // ← PASSED HERE
              onSuccess={handleSuccess}
            />
          </View>
        </ScrollView>
      </Animated.View>

      <AddCustomItemModal
        visible={showCustomModal}
        onClose={() => setShowCustomModal(false)}
        shopId={shopIdNum}
        shopName={shopName}
      />
    </SafeAreaView>
  );
}

// UPDATED: Now sends global `message`, not `note`
const SendOrderButton: React.FC<{
  shopId: number;
  items: any[];
  sessionToken: string | null;
  message: string;
  onSuccess: () => void;
}> = ({ shopId, items, sessionToken, message, onSuccess }) => {
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!sessionToken) {
      Alert.alert('Error', 'Please log in again.');
      return;
    }
    if (items.length === 0) return;

    setLoading(true);

    const form = new FormData();
    form.append('shop_id', shopId.toString());
    form.append('message', message.trim()); // ← NOW SENDS GLOBAL MESSAGE

    items.forEach((item, i) => {
      const p = `items[${i}]`;
      form.append(`${p}[product_name]`, item.product_name || item.custom_name || 'Item');
      form.append(`${p}[custom_name]`, item.custom_name || '');
      form.append(`${p}[quantity]`, item.quantity.toString());
      form.append(`${p}[proposed_price]`, item.price.toString());
      form.append(`${p}[original_price]`, (item.original_price || item.price).toString());
      form.append(`${p}[image_url]`, item.image || ''); // New: Send the image URL (signed or remote)

      if (item.image && item.image.startsWith('file://')) {
        form.append(`${p}[custom_image]`, {
          uri: item.image,
          name: `img_${Date.now()}_${i}.jpg`,
          type: 'image/jpeg',
        } as any);
      }
    });

    try {
      const response = await fetch(`${API_BASE}/po/create/`, {
        method: 'POST',
        headers: {
          Authorization: sessionToken,
        },
        body: form,
      });

      const responseText = await response.text();
      console.log('Raw response:', responseText.substring(0, 200));

      let data: any = null;
      if (responseText.trim().startsWith('{')) {
        try { data = JSON.parse(responseText); } catch (e) {}
      }

      if (!response.ok) {
        const errorMsg = data?.error || responseText || `HTTP ${response.status}`;
        Alert.alert('Send Failed', errorMsg);
        return;
      }

      Alert.alert('Order Sent!', 'Your order has been sent to the seller.', [
        { text: 'OK', onPress: onSuccess }
      ]);

    } catch (error: any) {
      Alert.alert('Error', 'Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={loading}>
      <LinearGradient colors={[COLORS.primary, COLORS.primaryLight]} style={styles.sendGradient}>
        {loading ? (
          <ActivityIndicator color="#FFF" style={{ marginRight: 8 }} />
        ) : (
          <Ionicons name="send" size={18} color="#FFF" style={{ marginRight: 8 }} />
        )}
        <Text style={styles.sendText}>
          {loading ? 'Sending...' : 'Send Order'}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const AddCustomItemButton = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity style={styles.addCustomBtn} onPress={onPress}>
    <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
    <Text style={styles.addCustomText}>Add Custom Item</Text>
  </TouchableOpacity>
);

// UPDATED STYLES — Added message input
const styles = StyleSheet.create({
  // ... all your existing styles ...

  messageContainer: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  messageLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  messageInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: 6,
  },

  // Keep all your original styles below unchanged
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
 backButton: { padding: 5, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  shopCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', marginHorizontal: 16, marginTop: 16, padding: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2, gap: 12 },
  shopIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  shopName: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  itemCount: { fontSize: 14, color: COLORS.textSecondary },
  scrollView: { flex: 1, marginTop: 12 },
  scrollContent: { paddingHorizontal: 16 },
  firstItem: { marginTop: 0 },
  itemWrapper: { marginTop: 12 },
  addCustomBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFF6FF', padding: 16, borderRadius: 16, marginTop: 20, borderWidth: 1.5, borderColor: COLORS.primary, borderStyle: 'dashed', gap: 8 },
  addCustomText: { fontSize: 16, fontWeight: '600', color: COLORS.primary },
  footer: { backgroundColor: '#FFF', padding: 16, marginTop: 24, marginHorizontal: -16, marginBottom: -16, borderTopWidth: 1, borderColor: COLORS.border, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  totalLabel: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  totalAmount: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  sendBtn: { borderRadius: 16, overflow: 'hidden', elevation: 3 },
  sendGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  sendText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginTop: 16 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8, marginBottom: 24 },
  backBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backBtnText: { color: '#FFF', fontWeight: '600' },
});