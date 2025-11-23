// components/cart/CartItemRow.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useCart } from '../../context/CartContext';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  item: {
    id: string;
    product_name?: string;
    name?: string;
    image?: string;
    price: number;
    original_price: number;
    quantity: number;
  };
};

export default function CartItemRow({ item }: Props) {
  const { updateQuantity, updatePrice, removeItem } = useCart();
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState(item.price.toString());

  const handlePriceSave = () => {
    const newPrice = parseFloat(priceInput) || item.original_price;
    updatePrice(item.id, newPrice);
    setEditingPrice(false);
  };

  const displayName = item.product_name || item.name || 'Item';

  return (
    <View style={styles.container}>
      {/* Image */}
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={styles.placeholder}>
          <Ionicons name="image-outline" size={24} color="#94a3b8" />
        </View>
      )}

      {/* Details */}
      <View style={styles.details}>
        <Text style={styles.name} numberOfLines={2}>{displayName}</Text>

        {/* Price Edit */}
        {editingPrice ? (
          <View style={styles.priceEdit}>
            <TextInput
              style={styles.input}
              value={priceInput}
              onChangeText={setPriceInput}
              keyboardType="numeric"
              autoFocus
              onBlur={handlePriceSave}
              onSubmitEditing={handlePriceSave}
            />
            <TouchableOpacity onPress={handlePriceSave}>
              <Ionicons name="checkmark" size={20} color="#10b981" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setEditingPrice(true)} activeOpacity={0.8}>
            <Text
              style={[
                styles.price,
                item.price !== item.original_price && styles.changed,
              ]}
            >
              ₦{item.price.toLocaleString()}
              {item.price !== item.original_price && ' (edited)'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Quantity */}
        <View style={styles.quantity}>
          <TouchableOpacity
            onPress={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
            disabled={item.quantity <= 1}
          >
            <Ionicons
              name="remove-circle"
              size={26}
              color={item.quantity <= 1 ? '#cbd5e1' : '#64748b'}
            />
          </TouchableOpacity>
          <Text style={styles.qty}>{item.quantity}</Text>
          <TouchableOpacity onPress={() => updateQuantity(item.id, item.quantity + 1)}>
            <Ionicons name="add-circle" size={26} color="#64748b" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Remove */}
      <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.remove}>
        <Ionicons name="close-circle" size={22} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  placeholder: {
    width: 64,
    height: 64,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  details: {
    flex: 1,
    marginLeft: 14,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 6,
    flexShrink: 1,
  },
  price: {
    fontSize: 15,
    color: '#16a34a',
    fontWeight: '600',
  },
  changed: {
    color: '#dc2626',
  },
  priceEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  input: {
    borderBottomWidth: 1.5,
    borderColor: '#2563eb',
    width: 90,
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 2,
  },
  quantity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 8,
  },
  qty: {
    fontSize: 16,
    fontWeight: '700',
    minWidth: 28,
    textAlign: 'center',
    color: '#1e293b',
  },
  remove: {
    padding: 6,
  },
});