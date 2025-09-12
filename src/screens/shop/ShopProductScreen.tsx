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
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInUp } from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import debounce from "lodash.debounce";
import { useInterstitialAd } from "../../components/AdMobManager";

const ShopProduct = () => {
  const [products, setProducts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sessionId, setSessionId] = useState(null);
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
            response = await axios.post(
              "https://retail-alvinia-goza-f6a0e4f7.koyeb.app/shop-products/",
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
          console.log("Fetched products:", fetchedProducts.length);
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
      console.log("Screen mounted, clearing cache and fetching products");
      cleanOldCache();
      fetchShopProducts();

      return () => {
        console.log("Screen unmounted");
      };
    }, [fetchShopProducts, cleanOldCache])
  );

  const handleTryAgain = useCallback(() => {
    console.log("User clicked Try Again");
    cleanOldCache();
    fetchShopProducts();
  }, [fetchShopProducts, cleanOldCache]);

  const handleUpdateProduct = useCallback(() => {
    router.push({ pathname: "/shop/UpdateProduct", params: { shop_id: shopId } });
  }, [router, shopId]);

  const renderProductItem = useCallback(
    ({ item: categoryData }) => (
      <Animated.View entering={FadeInUp} style={styles.categoryCard}>
        <Text style={styles.categoryTitle}>{categoryData.category}</Text>
        {categoryData.subcategories.map((subcategoryData) => (
          <View key={subcategoryData.subcategory} style={styles.subcategorySection}>
            <Text style={styles.subcategoryTitle}>{subcategoryData.subcategory}</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, styles.cellWide, styles.headerCell]}>
                  Product Name
                </Text>
                <Text style={[styles.tableCell, styles.availableCell, styles.headerCell]}>
                  Available
                </Text>
                <Text style={[styles.tableCell, styles.priceCell, styles.headerCell]}>
                  Price
                </Text>
              </View>
              {subcategoryData.products.map((product, index) => (
                <View
                  key={`${categoryData.category}-${subcategoryData.subcategory}-${product.id}-${index}`}
                  style={[styles.tableRow, index % 2 === 0 && styles.alternateRow]}
                >
                  <Text style={[styles.tableCell, styles.cellWide]}>
                    {product.product_name}
                  </Text>
                  <Text style={[styles.tableCell, styles.availableCell]}>
                    {product.is_available ? "✔️" : "❌"}
                  </Text>
                  <Text style={[styles.tableCell, styles.priceCell]}>
                    {product.price !== null &&
                    product.price !== undefined &&
                    !isNaN(Number(product.price))
                      ? `₦${Number(product.price).toLocaleString()}`
                      : "N/A"}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </Animated.View>
    ),
    []
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

  const getItemLayout = useCallback(
    (data, index) => ({
      length: 300,
      offset: 300 * index,
      index,
    }),
    []
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={["#F7FAFC", "#E3F2FD"]} style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.navigate("(tabs)/myshop")}
              style={styles.backButton}
            >
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
        <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
        <LinearGradient colors={["#F7FAFC", "#E3F2FD"]} style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.navigate("(tabs)/myshop")}
              style={styles.backButton}
            >
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
              <LinearGradient
                colors={["#4CAF50", "#388E3C"]}
                style={styles.tryAgainButtonGradient}
              >
                <Text style={styles.tryAgainButtonText}>Try Again</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
      <LinearGradient colors={["#F7FAFC", "#E3F2FD"]} style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.navigate("(tabs)/myshop")}
            style={styles.backButton}
          >
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
            <LinearGradient
              colors={["#4CAF50", "#388E3C"]}
              style={styles.updateButtonGradient}
            >
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
            getItemLayout={getItemLayout}
            initialNumToRender={5}
            maxToRenderPerBatch={5}
            windowSize={3}
          />
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  headerSpacer: {
    width: 42,
  },
  contentWrapper: {
    flex: 1,
    padding: 16,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  searchInput: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    fontSize: 16,
    color: "#1F2937",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
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
  tryAgainButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 16,
  },
  tryAgainButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  tryAgainButtonText: {
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
  categoryCard: {
    marginBottom: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderLeftWidth: 6,
    borderColor: "#3A7BD5",
  },
  categoryTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  subcategorySection: {
    marginBottom: 12,
    padding: 5,
    borderRadius: 12,
    backgroundColor: "#F0F7FF",
    borderLeftWidth: 4,
    borderColor: "#2563EB",
  },
  subcategoryTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 10,
  },
  table: {
    marginTop: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#e0f2fe',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderColor: '#cbd5e1',
  },
  alternateRow: {
    backgroundColor: '#f9fafb',
  },
  tableCell: {
    flex: 1,
    paddingHorizontal: 0,
    flexWrap: 'nowrap',
  },
  tableCells: {
    flexShrink: 0,
    marginRight: -12,
    paddingHorizontal: 0,
  },
  availableCell: {
    width: 70,
    textAlign: 'center',
    fontSize: 14,
    color: '#1e293b',
    flexWrap: 'nowrap',
  },
  priceCell: {
    width: 160,
    textAlign: 'left',
    fontSize: 14,
    color: '#1e293b',
    paddingHorizontal: 8,
    flexWrap: 'nowrap',
  },
  cellWide: {
    flex: 1.2,
    textAlign: 'left',
  },
  headerCell: {
    fontWeight: '700',
    color: '#0f172a',
  },
});

export default ShopProduct;