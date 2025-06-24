import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  TextInput, StatusBar
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInUp } from "react-native-reanimated";

const ShopProduct = () => {
  const [products, setProducts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const params = useLocalSearchParams();
  const { shopId, prevRoute, category } = params;
  const router = useRouter();

  const fetchShopProducts = async () => {
    try {
      const response = await fetch("https://retail-alvinia-goza-f6a0e4f7.koyeb.app/shop-products/", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ shop_id: shopId }).toString(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error("Error fetching shop products:", err);
      setError("Failed to load products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShopProducts();
  }, [shopId]);

  const handleUpdateProduct = () => {
    router.push({ pathname: "/shop/UpdateProduct", params: { shop_id: shopId } });
  };

  const filteredProducts = products
    ?.map((categoryData) => {
      const filteredSubcategories = categoryData.subcategories
        .map((subcategoryData) => {
          const filteredProducts = subcategoryData.products.filter((product) => {
            const productName = product.product_name.toLowerCase();
            const query = searchQuery.toLowerCase();
            if (!query) return true;
            if (productName.includes(query)) return true;
            if (query.length === 1 && productName.startsWith(query)) return true;
            return false;
          });
          return { ...subcategoryData, products: filteredProducts };
        })
        .filter((subcategory) => subcategory.products.length > 0);
      return { ...categoryData, subcategories: filteredSubcategories };
    })
    .filter((category) => category.subcategories.length > 0) || [];

  const renderProductItem = ({ item: categoryData }) => (
    <Animated.View entering={FadeInUp} style={styles.categoryCard}>
      <Text style={styles.categoryTitle}>{categoryData.category}</Text>
      {categoryData.subcategories.map((subcategoryData) => (
        <View key={subcategoryData.subcategory} style={styles.subcategorySection}>
          <Text style={styles.subcategoryTitle}>{subcategoryData.subcategory}</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.cellWide, styles.headerCell]}>Product Name</Text>
              <Text style={[styles.tableCell, styles.headerCell]}>Available</Text>
              <Text style={[styles.tableCell, styles.headerCell]}>Price</Text>
            </View>
            {subcategoryData.products.map((product, index) => (
              <View
                key={product.id}
                style={[styles.tableRow, index % 2 === 0 && styles.alternateRow]}
              >
                <Text style={[styles.tableCell, styles.cellWide]}>{product.product_name}</Text>
                <Text style={styles.tableCell}>{product.is_available ? "✔️" : "❌"}</Text>
                <Text style={styles.tableCell}>
                  {product.price !== null && product.price !== undefined && !isNaN(Number(product.price))
                    ? `₦${Number(product.price).toLocaleString()}`
                    : "N/A"}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </Animated.View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={["#F7FAFC", "#E3F2FD"]} style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.replace(prevRoute || "/(tabs)/myshop")}
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
            <Text style={styles.loaderText}>Loading products...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor='#2563EB' />
      <LinearGradient colors={["#F7FAFC", "#E3F2FD"]} style={styles.container}>
        {/* Fixed Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.replace(prevRoute || "/(tabs)/shop")}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {category === "Services" ? "Services" : "Products"}
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        {/* Scrollable Content */}
        <View style={styles.contentWrapper}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
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
          {error && <Text style={styles.error}>{error}</Text>}
          {(!products || products.length === 0) && !error && (
            <Text style={styles.noProducts}>No products available.</Text>
          )}
          <FlatList
            data={filteredProducts}
            renderItem={renderProductItem}
            keyExtractor={(item) => item.category}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
    padding: 12,
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
    borderRadius: 10,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#E0F2FE",
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  alternateRow: {
    backgroundColor: "#F9FAFB",
  },
  tableCell: {
    flex: 1,
    fontSize: 14,
    color: "#1F2937",
    textAlign: "left",
  },
  cellWide: {
    flex: 2,
  },
  headerCell: {
    fontWeight: "700",
    color: "#0F172A",
  },
});

export default ShopProduct;