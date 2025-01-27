import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

const ShopProduct = ({ products }) => {
  if (!products || products.length === 0) {
    return <Text style={styles.noProducts}>No products available.</Text>;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {products.map((categoryData) => (
        <View key={categoryData.category} style={styles.categoryCard}>
          <Text style={styles.categoryTitle}>{categoryData.category}</Text>
          {categoryData.subcategories.map((subcategoryData) => (
            <View key={subcategoryData.subcategory} style={styles.subcategorySection}>
              <Text style={styles.subcategoryTitle}>{subcategoryData.subcategory}</Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableCell, styles.cellWide, styles.headerCell]}>Product</Text>
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
                        ? `₦${Number(product.price)}`
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
  );
};

const styles = StyleSheet.create({
  container: {
    
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
    textAlign: 'center',
    fontSize: 14,
    color: '#1e293b',
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
