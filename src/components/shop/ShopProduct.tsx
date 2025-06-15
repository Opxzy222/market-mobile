import React, { useContext, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import SubscriptionProvider, { SubscriptionContext } from '../SubscriptionProvider';
import SubscriptionRequired from '../RequiredSubscription';
import { LinearGradient } from "expo-linear-gradient";

const ShopProduct = ({ products }) => {
  const { subscriptionStatus, loading } = useContext(SubscriptionContext);
  const [searchQuery, setSearchQuery] = useState('');

  // Wait until the subscription status is determined
  if (loading) {
    return <ActivityIndicator size="large" color="#007BFF" style={styles.loader} />;
  }

  // Show the SubscriptionRequired component if the user does not have a valid subscription
  if (!["regular", "standard", "premium"].includes(subscriptionStatus)) {
    return <SubscriptionRequired />;
  }

  // Filter products based on search query
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
    <LinearGradient colors={["#F7F7F7", "#EAEAEA"]} style={styles.container}>
      {/* Search Bar */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search products..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {filteredProducts.length === 0 ? (
          <Text style={styles.noProducts}>No products found.</Text>
        ) : (
          filteredProducts.map(categoryData => (
            <View key={categoryData.category} style={styles.categoryCard}>
              <Text style={styles.categoryTitle}>{categoryData.category}</Text>
              {categoryData.subcategories.map(subcategoryData => (
                <View key={subcategoryData.subcategory} style={styles.subcategorySection}>
                  <Text style={styles.subcategoryTitle}>{subcategoryData.subcategory}</Text>
                  <View style={styles.table}>
                    <View style={styles.tableHeader}>
  <Text style={[styles.tableCell, styles.cellWide, styles.headerCell]}>Product</Text>
  <Text style={[styles.tableCell, styles.availableCell, styles.headerCell]}>Available</Text>
  <Text style={[styles.tableCells, styles.priceCell, styles.headerCell]}>Price</Text>
</View>
                    {subcategoryData.products.map((product, index) => (
                      <View
                        key={product.id}
                        style={[styles.tableRow, index % 2 === 0 && styles.alternateRow]}
                      >
                        <Text style={[styles.tableCell, styles.cellWide]}>{product.product_name}</Text>
                        <Text style={styles.AvailableCell}>
                          {product.is_available ? '✔️' : '❌'}
                        </Text>
                        <Text style={[styles.tableCell, styles.priceCell]}>
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
          ))
        )}
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 0,
    backgroundColor: '#f8fafc',
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
  scrollContainer: {
    paddingBottom: 20,
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
    padding: 5,
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
    padding: 5,
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
    paddingHorizontal: 1,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 1,
    borderBottomWidth: 1,
    borderColor: '#cbd5e1',
  },
  alternateRow: {
    backgroundColor: '#f9fafb',
  },
  tableCell: {
  flexShrink: 0,
  paddingHorizontal: 0,
  },
  tableCells: {
  flexShrink: 0,
  marginRight: -12,
  paddingHorizontal: 0,
  },
  AvailableCell: {
  flexShrink: 0,
  paddingHorizontal: 12,
  },
  
  priceCell: {
  width: 90, // or something reasonable like 80–100
  textAlign: 'center',
  fontSize: 14,
  color: '#1e293b',
  overflow: 'hidden',
  paddingHorizontal: 8,
  },
  availableCell: {
  width: 62,
  textAlign: 'left',
},

  cellWide: {
    flex: 2,
    textAlign: 'left',
  },
  headerCell: {
    fontWeight: '700',
    color: '#0f172a',
  },
});

export default (props) => (
  <SubscriptionProvider>
    <ShopProduct {...props} />
  </SubscriptionProvider>
);
