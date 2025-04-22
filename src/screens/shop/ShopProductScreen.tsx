import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, TextInput
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const ShopProduct = () => {
  const [products, setProducts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
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
    console.log("Fetch Success:", data);

    // Ensure data structure matches what is expected
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
    router.push({ pathname: '/shop/UpdateProduct', params: { shop_id: shopId } });
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#3b82f6" style={styles.loader} />;
  }

  const filteredProducts = products
    .map(categoryData => {
      const filteredSubcategories = categoryData.subcategories.map(subcategoryData => {
        const filteredProducts = subcategoryData.products.filter(product => {
          const productName = product.product_name.toLowerCase();
          const query = searchQuery.toLowerCase();

          // If search query is empty, return all products
          if (!query) return true;

          // Show product if it contains the search term anywhere
          if (productName.includes(query)) return true;

          // Show product only if it starts with the search term
          if (query.length === 1 && productName.startsWith(query)) return true;

          return false;
        });

        return {
          ...subcategoryData,
          products: filteredProducts,
        };
      }).filter(subcategory => subcategory.products.length > 0); // Remove empty subcategories

      return {
        ...categoryData,
        subcategories: filteredSubcategories,
      };
    })
    .filter(category => category.subcategories.length > 0); // Remove empty categories

  return (
    <ScrollView>
      <View style={styles.header}>
              <TouchableOpacity onPress={() => router.replace(prevRoute || '((tabs)/shop)')} style={styles.backButton}>
                <MaterialIcons name="arrow-back" size={24} color="#007BFF" />
              </TouchableOpacity>
            </View>
    <ScrollView contentContainerStyle={styles.container}>
      {/* Update Product Button */}
      <TouchableOpacity style={styles.updateButton} onPress={handleUpdateProduct}>
        <Text style={styles.updateButtonText}>
          Click here to update {category === 'Services' ? 'services' : 'products'}
        </Text>
      </TouchableOpacity>
      
      <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              value={searchQuery}
          onChangeText={setSearchQuery}
        />

      {/* Error Handling */}
      {error && <Text style={styles.error}>{error}</Text>}

      {/* No Products Message */}
      {(!products || products.length === 0) && !error && (
        <Text style={styles.noProducts}>No products available.</Text>
      )}

      {/* Render Products */}
      {Array.isArray(products) && filteredProducts.map((categoryData) => (
        <View key={categoryData.category} style={styles.categoryCard}>
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
                    style={[
                      styles.tableRow,
                      index % 2 === 0 && styles.alternateRow,
                    ]}
                  >
                    <Text style={[styles.tableCell, styles.cellWide]}>{product.product_name}</Text>
                    <Text style={styles.tableCell}>
                      {product.is_available ? '✔️' : '❌'}
                    </Text>
                    <Text style={styles.tableCell}>
  {product.price !== null && product.price !== undefined && !isNaN(Number(product.price))
    ? `₦${Number(product.price).toLocaleString()}`
    : 'N/A'}
</Text>

                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 10,
  },
  backButton: {
    borderRadius: 50,
    backgroundColor: "#E0E0E0",
    marginRight: 12,
  },

  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
    backgroundColor: '#ffffff',
  },
  
  loader: {
    marginTop: 50,
  },
  error: {
    textAlign: 'center',
    fontSize: 16,
    color: '#d32f2f',
    marginTop: 20,
  },
  noProducts: {
    textAlign: 'center',
    fontSize: 16,
    color: '#757575',
    marginTop: 20,
  },
  categoryCard: {
    marginBottom: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    borderLeftWidth: 6,
    borderColor: '#3b82f6',
  },
  categoryTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e3a8a',
    marginBottom: 10,
  },
  subcategorySection: {
    marginBottom: 15,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f0f7ff',
    borderLeftWidth: 4,
    borderColor: '#2563eb',
  },
  subcategoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
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
    textAlign: 'left',
    fontSize: 14,
    color: '#1e293b',
  },
  cellWide: {
    flex: 1,
    textAlign: 'left',
  },
  headerCell: {
    fontWeight: '700',
    color: '#0f172a',
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4caf50',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  updateButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default ShopProduct;
