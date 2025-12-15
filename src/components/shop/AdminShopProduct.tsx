// components/shop/ShopProduct.tsx
// FINAL — NO SUBSCRIPTION LIMITS, FULL ACCESS FOR EVERYONE, BEAUTIFUL & COLLAPSIBLE
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '@/context/CartContext';

const { width } = Dimensions.get('window');

type Product = {
  id: number | string;
  product_name: string;
  typography: string;
  price: number | null;
  is_available: boolean;
  image?: string;
};

type Subcategory = {
  subcategory: string;
  products: Product[];
};

type Category = {
  category: string;
  subcategories: Subcategory[];
};

type Props = {
  products?: Category[] | null;
  shopId: string | number;
  shopName?: string;
};

const ShopProduct = ({ products = [], shopId, shopName }: Props) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [fullScreenImage, setFullScreenImage] = useState<{ visible: boolean; url: string }>({
    visible: false,
    url: '',
  });
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const router = useRouter();
  const params = useLocalSearchParams();
  const { addItem } = useCart();

  const currentShopId = Number(shopId || params.shopId);
  const currentShopName = shopName || params.name || `Shop #${currentShopId}`;

  useEffect(() => {
    // Just simulate loading briefly — no subscription check anymore
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryName)) next.delete(categoryName);
      else next.add(categoryName);
      return next;
    });
  };

  const openFullScreen = (url: string) => {
    setFullScreenImage({ visible: true, url });
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#0EA5E9" />
      </View>
    );
  }

  // No subscription check — everyone sees the full shop
  const safeProducts = Array.isArray(products) ? products : [];

  // Filter products by search
  const filteredData = safeProducts
    .map(category => {
      if (!category?.category || !Array.isArray(category.subcategories)) return null;

      const filteredSubs = category.subcategories
        .map(sub => {
          if (!sub?.subcategory || !Array.isArray(sub.products)) return null;
          return {
            ...sub,
            products: sub.products.filter(p => {
              const name = p.product_name?.toLowerCase() || '';
              const q = searchQuery.toLowerCase();
              return !q || name.includes(q);
            }),
          };
        })
        .filter(sub => sub && sub.products.length > 0);

      return filteredSubs.length > 0 ? { ...category, subcategories: filteredSubs } : null;
    })
    .filter(Boolean);

  return (
    <>
      <LinearGradient colors={['#F0F9FF', '#E0F2FE']} style={styles.container}>
        {/* Modern Floating Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={filteredData}
          keyExtractor={item => item.category}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          nestedScrollEnabled={true}
          renderItem={({ item: category }) => {
            const isExpanded = expandedCategories.has(category.category);

            return (
              <View style={styles.categoryBlock}>
                {/* Category Header */}
                <TouchableOpacity
                  style={styles.categoryHeader}
                  onPress={() => toggleCategory(category.category)}
                  activeOpacity={0.8}
                >
                  <View style={styles.categoryTitleRow}>
                    <Text style={styles.categoryTitle}>{category.category}</Text>
                    <View style={styles.itemCountBadge}>
                      <Text style={styles.itemCountText}>
                        {category.subcategories.reduce((sum, sub) => sum + sub.products.length, 0)}
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name="chevron-down"
                    size={24}
                    color="#0EA5E9"
                    style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}
                  />
                </TouchableOpacity>

                {/* Subcategories (only show if expanded) */}
                {isExpanded && (
                  <View style={styles.subcategoriesContainer}>
                    {category.subcategories.map(sub => (
                      <View key={sub.subcategory} style={styles.subcategoryBlock}>
                        <Text style={styles.subcategoryTitle}>{sub.subcategory}</Text>
                        {sub.products.map(product => (
                          <View key={product.id} style={styles.productCard}>
                            {/* Product Image — full-screen always allowed */}
                            <TouchableOpacity
                              onPress={() => product.image && openFullScreen(product.image)}
                              style={styles.imageWrapper}
                            >
                              {product.image ? (
                                <Image source={{ uri: product.image }} style={styles.productImg} resizeMode="cover" />
                              ) : (
                                <View style={styles.placeholderContainer}>
                                  <Ionicons name="image-outline" size={28} color="#94A3B8" />
                                  <Text style={styles.placeholderText}>No Image</Text>
                                </View>
                              )}
                            </TouchableOpacity>

                            <View style={styles.textColumn}>
                              <Text style={styles.productName}>{product.product_name}</Text>
                              <View style={styles.priceRow}>
                                <View style={styles.availabilityBadge}>
                                  <Text
                                    style={[
                                      styles.availability,
                                      product.is_available ? styles.available : styles.notAvailable,
                                    ]}
                                  >
                                    {product.is_available ? 'Available' : 'Unavailable'}
                                  </Text>
                                </View>
                                <Text style={styles.priceText}>
                                  {product.price != null ? `₦${Math.floor(product.price).toLocaleString()}` : 'N/A'}
                                </Text>
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={64} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No products found</Text>
              <Text style={styles.emptyText}>Try a different search term</Text>
            </View>
          }
        />
      </LinearGradient>

      {/* Full Screen Image Modal — always accessible */}
      <Modal visible={fullScreenImage.visible} transparent animationType="fade">
        <View style={styles.fullScreenOverlay}>
          <Image source={{ uri: fullScreenImage.url }} style={styles.fullScreenImage} resizeMode="contain" />
          <TouchableOpacity
            style={styles.closeFullScreen}
            onPress={() => setFullScreenImage({ visible: false, url: '' })}
          >
            <View style={styles.closeBtnBg}>
              <Ionicons name="close" size={28} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F9FF' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  searchInput: { flex: 1, fontSize: 16, color: '#1E293B', marginLeft: 12 },
  listContent: { paddingBottom: 40 },
  categoryBlock: { marginBottom: 12 },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginHorizontal: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  categoryTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  categoryTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  itemCountBadge: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },
  itemCountText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  subcategoriesContainer: { marginTop: 12 },
  subcategoryBlock: { marginBottom: 20, paddingHorizontal: 16 },
  subcategoryTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0369A1',
    marginBottom: 10,
    marginLeft: 8,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  imageWrapper: { width: 60, height: 60, borderRadius: 10, overflow: 'hidden', marginRight: 14 },
  productImg: { width: '100%', height: '100%' },
  placeholderContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  placeholderText: { marginTop: 4, fontSize: 10, color: '#94A3B8' },
  textColumn: { flex: 1, justifyContent: 'space-between' },
  productName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 6, flexShrink: 1 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  availabilityBadge: {},
  availability: {
    fontSize: 13,
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  available: { backgroundColor: '#dcfce7', color: '#166534' },
  notAvailable: { backgroundColor: '#fee2e2', color: '#991b1b' },
  priceText: { fontSize: 15, color: '#2e7d32', fontWeight: 'bold' },
  addToCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 4,
  },
  addToCartBtnDisabled: { backgroundColor: '#94a3b8' },
  addToCartText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#475569', marginTop: 16 },
  emptyText: { fontSize: 15, color: '#94A3B8', marginTop: 8 },
  fullScreenOverlay: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  fullScreenImage: { width: '100%', height: '100%' },
  closeFullScreen: { position: 'absolute', top: 50, right: 20 },
  closeBtnBg: { backgroundColor: 'rgba(0,0,0,0.6)', width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
});

export default ShopProduct;