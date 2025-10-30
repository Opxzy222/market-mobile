import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const ShopProduct = ({ products }) => {
  const [searchQuery, setSearchQuery] = useState('');

  // No loading state – assume data is ready
  const filteredProducts = products
    .map(categoryData => {
      const filteredSubcategories = categoryData.subcategories
        .map(subcategoryData => {
          const filteredProducts = subcategoryData.products.filter(product => {
            const productName = product.product_name.toLowerCase();
            const query = searchQuery.toLowerCase();
            if (!query) return true;
            if (productName.includes(query)) return true;
            if (query.length === 1 && productName.startsWith(query)) return true;
            return false;
          });
          return {
            ...subcategoryData,
            products: filteredProducts,
          };
        })
        .filter(subcategory => subcategory.products.length > 0);

      return {
        ...categoryData,
        subcategories: filteredSubcategories,
      };
    })
    .filter(category => category.subcategories.length > 0);

  return (
    <LinearGradient colors={['#F7F7F7', '#EAEAEA']} style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search products..."
        placeholderTextColor="#888"
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
                <View
                  key={subcategoryData.subcategory}
                  style={styles.subcategorySection}
                >
                  <Text style={styles.subcategoryTitle}>
                    {subcategoryData.subcategory}
                  </Text>
                  <View style={styles.table}>
                    <View style={styles.tableHeader}>
                      <Text
                        style={[
                          styles.tableCell,
                          styles.cellWide,
                          styles.headerCell,
                        ]}
                      >
                        Product
                      </Text>
                      <Text
                        style={[
                          styles.tableCell,
                          styles.availableCell,
                          styles.headerCell,
                        ]}
                      >
                        Available
                      </Text>
                      <Text
                        style={[
                          styles.tableCell,
                          styles.priceCell,
                          styles.headerCell,
                        ]}
                      >
                        Price
                      </Text>
                    </View>
                    {subcategoryData.products.map((product, index) => (
                      <View
                        key={`${categoryData.category}-${subcategoryData.subcategory}-${product.id}-${index}`}
                        style={[
                          styles.tableRow,
                          index % 2 === 0 && styles.alternateRow,
                        ]}
                      >
                        <Text style={[styles.tableCell, styles.cellWide]}>
                          {product.product_name}
                        </Text>
                        <Text style={[styles.tableCell, styles.availableCell]}>
                          {product.is_available ? '✔️' : '❌'}
                        </Text>
                        <Text style={[styles.tableCell, styles.priceCell]}>
                          {product.price !== null &&
                          product.price !== undefined &&
                          !isNaN(Number(product.price))
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
    paddingHorizontal: 10,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderColor: '#cbd5e1',
  },
  alternateRow: {
    backgroundColor: '#f9fafb',
  },
  tableCell: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
    textAlign: 'left',
    paddingHorizontal: 8,
  },
  availableCell: {
    width: 120,
    textAlign: 'center',
    fontSize: 12,
    color: '#1e293b',
    paddingHorizontal: 8,
    flexShrink: 0,
    flexWrap: 'nowrap',
  },
  priceCell: {
    width: 90,
    textAlign: 'center',
    fontSize: 14,
    color: '#1e293b',
    paddingHorizontal: 8,
    flexShrink: 0,
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

export default ShopProduct;