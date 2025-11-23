// components/po/POItemRow.tsx
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  item: {
    name: string;
    quantity: number;
    original_price: string;
    proposed_price: string;
    change_type: 'original' | 'buyer_changed' | 'seller_changed' | 'custom';
    image?: string;
  };
};

export default function POItemRow({ item }: Props) {
  const priceDiff = parseFloat(item.proposed_price) - parseFloat(item.original_price);
  const isSellerUp = item.change_type === 'seller_changed' && priceDiff > 0;
  const isSellerDown = item.change_type === 'seller_changed' && priceDiff < 0;
  const isCustom = item.change_type === 'custom';

  return (
    <View style={styles.container}>
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={styles.placeholder}>
          <Ionicons name="image-outline" size={20} color="#94a3b8" />
        </View>
      )}

      <View style={styles.details}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.qty}>× {item.quantity}</Text>

        <View style={styles.priceRow}>
          <Text style={[
            styles.price,
            isSellerUp && styles.priceUp,
            isSellerDown && styles.priceDown,
            isCustom && styles.custom,
          ]}>
            ₦{parseFloat(item.proposed_price).toLocaleString()}
          </Text>
          {item.change_type === 'seller_changed' && (
            <Text style={[styles.diff, isSellerUp ? styles.diffUp : styles.diffDown]}>
              {priceDiff > 0 ? '+' : ''}₦{Math.abs(priceDiff).toLocaleString()}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  image: { width: 56, height: 56, borderRadius: 12 },
  placeholder: {
    width: 56,
    height: 56,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  details: { flex: 1, marginLeft: 12 },
  name: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  qty: { fontSize: 14, color: '#64748b', marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 },
  price: { fontSize: 16, fontWeight: '700' },
  priceUp: { color: '#dc2626' },
  priceDown: { color: '#16a34a' },
  custom: { color: '#f59e0b' },
  diff: { fontSize: 13, fontWeight: '600' },
  diffUp: { color: '#dc2626' },
  diffDown: { color: '#16a34a' },
});