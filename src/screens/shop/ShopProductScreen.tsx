import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Image,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInUp } from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from '../../api';
import debounce from "lodash.debounce";
import { useInterstitialAd } from "../../components/AdMobManager";
import { Ionicons } from '@expo/vector-icons';

const ShopProduct = () => {
  const [products, setProducts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [fullScreenImage, setFullScreenImage] = useState<{ visible: boolean; url: string }>({
    visible: false,
    url: '',
  });
  const params = useLocalSearchParams();
  const { shopId, prevRoute, category } = params;
  const router = useRouter();
  const isMountedRef = useRef(true);
  const { adLoaded } = useInterstitialAd();

  const cleanOldCache = useCallback(async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => key.startsWith("products_"));
      for (const key of cacheKeys) {
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.error("Error cleaning cache:", error);
    }
  }, []);

  // ────────────────────── SUBSCRIPTION CHECK ──────────────────────
  useEffect(() => {
    const loadSubscription = async () => {
      try {
        const cache = await AsyncStorage.getItem('subscription_cache');
        if (cache) {
          const parsed = JSON.parse(cache);
          const plan = parsed.plan?.trim().toLowerCase();
          setSubscriptionStatus(plan);
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadSubscription();
  }, []);

  const isSubscribed = subscriptionStatus && ['regular', 'standard', 'premium'].includes(subscriptionStatus);

  const openFullScreen = (url: string) => {
    if (isSubscribed) {
      setFullScreenImage({ visible: true, url });
    } else {
      alert('Upgrade to Standard plan to view images in full screen.');
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    const fetchSessionId = async () => {
      try {
        const sessionIdString = await AsyncStorage.getItem("sessionToken");
        if (isMountedRef.current) {
          setSessionId(sessionIdString);
        }
      } catch (err) {
        console.error("Error fetching session ID:", err);
      }
    };
    fetchSessionId();
    cleanOldCache();

    return () => {
      isMountedRef.current = false;
    };
  }, [cleanOldCache]);

  const fetchShopProducts = useCallback(
    debounce(async () => {
      if (!isMountedRef.current) return;

      try {
        setLoading(true);
        setError(null);
        setProducts(null);

        const formData = new FormData();
        formData.append("shop_id", shopId);

        let response;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            response = await api.post(
              "/shop-products/",
              formData,
              {
                headers: {
                  "Content-Type": "multipart/form-data",
                  Authorization: sessionId ? `Bearer ${sessionId}` : "",
                },
                timeout: 10000,
              }
            );
            break;
          } catch (err) {
            if (attempt === 3) throw err;
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }

        if (isMountedRef.current) {
          const fetchedProducts = response.data.products || [];
          setProducts(fetchedProducts);
        }
      } catch (err) {
        if (isMountedRef.current) {
          console.error("Error fetching shop products:", err);
          setError(
            err.message.includes("Network")
              ? "Network error. Please check your connection and try again."
              : `Failed to load products: ${err.message}`
          );
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    }, 300),
    [shopId, sessionId]
  );

  useFocusEffect(
    useCallback(() => {
      cleanOldCache();
      fetchShopProducts();
      return () => {};
    }, [fetchShopProducts, cleanOldCache])
  );

  const handleTryAgain = useCallback(() => {
    cleanOldCache();
    fetchShopProducts();
  }, [fetchShopProducts, cleanOldCache]);

  const handleUpdateProduct = useCallback(() => {
    router.push({ pathname: "/shop/UpdateProduct", params: { shop_id: shopId } });
  }, [router, shopId]);

  const renderProductItem = useCallback(
    ({ item: categoryData }) => (
      <Animated.View entering={FadeInUp} style={styles.categorySection}>
        <Text style={styles.categoryTitle}>{categoryData.category}</Text>

        {categoryData.subcategories.map((subcategoryData) => (
          <View key={subcategoryData.subcategory} style={styles.subcategorySection}>
            <Text style={styles.subcategoryTitle}>{subcategoryData.subcategory}</Text>

            {subcategoryData.products.map((product) => (
              <View key={product.id} style={styles.productCard}>
                {/* Product Image */}
                <TouchableOpacity
                  onPress={() => product.image && openFullScreen(product.image)}
                  style={styles.imageWrapper}
                >
                  {product.image ? (
                    <Image
                      source={{ uri: product.image }}
                      style={styles.productImg}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.placeholderContainer}>
                      <Ionicons name="image-outline" size={28} color="#94A3B8" />
                      <Text style={styles.placeholderText}>No Image</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Text: Name + Availability + Price */}
                <View style={styles.textColumn}>
                  <Text style={styles.productName}>{product.product_name}</Text>

                  <View style={styles.priceRow}>
                    <View style={styles.availabilityBadge}>
                      <Text
                        style={[
                          styles.availability,
                          product.is_available ? styles.available : styles.notAvailable,
                        ]}>
                        {product.is_available ? 'Available' : 'Unavailable'}
                      </Text>
                    </View>

                    <Text style={styles.priceText}>
                      {product.price != null
                        ? `₦${Math.floor(product.price).toLocaleString()}`
                        : 'N/A'}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ))}
      </Animated.View>
    ),
    [isSubscribed]
  );

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products
      .map((categoryData) => {
        const filteredSubcategories = categoryData.subcategories
          .map((subcategoryData) => {
            const filteredProducts = subcategoryData.products.filter((product) => {
              const productName = product.product_name.toLowerCase();
              const query = searchQuery.toLowerCase();
              return !query || productName.includes(query) || (query.length === 1 && productName.startsWith(query));
            });
            return { ...subcategoryData, products: filteredProducts };
          })
          .filter((subcategory) => subcategory.products.length > 0);
        return { ...categoryData, subcategories: filteredSubcategories };
      })
      .filter((category) => category.subcategories.length > 0);
  }, [products, searchQuery]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={["#F7FAFC", "#E3F2FD"]} style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.navigate("(tabs)/myshop")} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={26} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {category === "Services" ? "Services" : "Products"}
            </Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#3A7BD5" />
            <Text style={styles.loaderText}>Loading...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <StatusBar barStyle="light-content" backgroundColor="#3A7BD5" />
        <LinearGradient colors={["#F7FAFC", "#E3F2FD"]} style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.navigate("(tabs)/myshop")} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={26} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {category === "Services" ? "Services" : "Products"}
            </Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.loaderContainer}>
            <Text style={styles.error}>{error}</Text>
            <TouchableOpacity style={styles.tryAgainButton} onPress={handleTryAgain}>
              <LinearGradient colors={["#4CAF50", "#388E3C"]} style={styles.tryAgainButtonGradient}>
                <Text style={styles.tryAgainButtonText}>Try Again</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <StatusBar barStyle="light-content" backgroundColor="#3A7BD5" />
        <LinearGradient colors={["#F7FAFC", "#E3F2FD"]} style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.navigate("(tabs)/myshop")} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={26} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {category === "Services" ? "Services" : "Products"} Listing
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.contentWrapper}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              placeholderTextColor="#5A5A5A"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            <TouchableOpacity style={styles.updateButton} onPress={handleUpdateProduct}>
              <LinearGradient colors={["#4CAF50", "#388E3C"]} style={styles.updateButtonGradient}>
                <Text style={styles.updateButtonText}>
                  Update {category === "Services" ? "services" : "products"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {(!products || products.length === 0) && (
              <Text style={styles.noProducts}>No products available.</Text>
            )}

            <FlatList
              data={filteredProducts}
              renderItem={renderProductItem}
              keyExtractor={(item) => item.category}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
              initialNumToRender={5}
              maxToRenderPerBatch={5}
              windowSize={3}
            />
          </View>
        </LinearGradient>
      </SafeAreaView>

      {/* Full-Screen Image Modal */}
      {fullScreenImage.visible && (
        <Modal transparent animationType="fade">
          <View style={styles.fullScreenOverlay}>
            <Image
              source={{ uri: fullScreenImage.url }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
            <TouchableOpacity
              style={styles.closeFullScreen}
              onPress={() => setFullScreenImage({ visible: false, url: '' })}
            >
              <Ionicons name="close" size={32} color="#fff" />
            </TouchableOpacity>
          </View>
        </Modal>
      )}
    </>
  );
};

/* ===================================================== */
/*                   STYLES – CLEAN & MODERN             */
/* ===================================================== */
const styles = StyleSheet.create({
  container: { flex: 1 },
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
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
    flex: 1,
  },
  headerSpacer: { width: 42 },

  contentWrapper: { flex: 1, padding: 16 },
  contentContainer: { paddingBottom: 30 },

  searchInput: {
    height: 48,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  updateButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
  },
  updateButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  updateButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },

  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loaderText: {
    marginTop: 10,
    fontSize: 16,
    color: "#3A7BD5",
    fontWeight: "600",
  },
  error: {
    fontSize: 18,
    color: "#DC2626",
    textAlign: "center",
    marginVertical: 20,
    fontWeight: "600",
  },
  noProducts: {
    fontSize: 18,
    color: "#1F2937",
    textAlign: "center",
    marginVertical: 20,
    fontWeight: "600",
  },

  // Category & Subcategory
  categorySection: { marginBottom: 24 },
  categoryTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  subcategorySection: { marginBottom: 20 },
  subcategoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginLeft: 35,
  },

  // Product Card
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

  imageWrapper: {
    width: 60,
    height: 60,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 14,
  },
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

  textColumn: { flex: 1, justifyContent: 'center' },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 6,
    flexShrink: 1,
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
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
  priceText: {
    fontSize: 15,
    color: '#2e7d32',
    fontWeight: 'bold',
  },

  // Full-Screen
  fullScreenOverlay: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: { width: '100%', height: '100%' },
  closeFullScreen: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },

  // Retry Button
  tryAgainButton: { borderRadius: 12, overflow: "hidden", marginTop: 16 },
  tryAgainButtonGradient: { paddingVertical: 14, paddingHorizontal: 16, alignItems: "center" },
  tryAgainButtonText: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
});

export default ShopProduct;