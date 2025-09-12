import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const Categories = ({ categories }) => {
  const router = useRouter();
  const pathname = usePathname();

  // Sort categories alphabetically by name
  const sortedCategories = [...categories].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  // Log categories and normalized names in development mode
  useEffect(() => {
    if (__DEV__) {
      console.log(categories, 'categories');
      console.log(
        sortedCategories.map((item) => normalizeCategoryName(item.name)),
        'normalized category names'
      );
    }
  }, [categories]);

  const categoryIconMap = {
    Vehicles: require('../../../assets/G-images/Vehicle.jpg'),
    electronics: require('../../../assets/G-images/Electronics.jpg'),
    phone: require('../../../assets/Image/phone-icon.png'),
    furniture: require('../../../assets/G-images/Furniture.jpg'),
    '': require('../../../assets/Image/home-appliance-icon.png'),
    fashion: require('../../../assets/G-images/Fashion.jpg'),
    property: require('../../../assets/Image/property-icon.png'),
    'health & beauty': require('../../../assets/G-images/Health.jpg'),
    services: require('../../../assets/G-images/Services.jpg'),
    'medical & healthcare': require('../../../assets/G-images/Medical.jpg'),
  };

  // Normalize category names to handle variations
  const normalizeCategoryName = (name) => {
    if (!name) return '';
    return name
      .toLowerCase()
      .replace(/and/g, '&')
      .replace(/[^a-z0-9& ]/g, '') // Remove special characters except & and spaces
      .trim();
  };

  const handleCategoryClick = (categoryId, categoryName) => {
    router.push({
      pathname: '/shop/ChildCategoryList',
      params: { categoryId, categoryName, prevRoute: pathname },
    });
  };

  const renderCategory = ({ item }) => {
    const normalizedName = normalizeCategoryName(item.name);
    const iconSource = categoryIconMap[normalizedName] || categoryIconMap['']; // Fallback to default icon

    if (__DEV__ && !iconSource) {
      console.warn(`No icon found for category: ${item.name} (normalized: ${normalizedName})`);
    }

    return (
      <TouchableOpacity
        style={styles.categoryItem}
        onPress={() => handleCategoryClick(item.id, item.name)}
      >
        {iconSource && (
          <Image
            source={iconSource}
            style={styles.icon}
            onError={(error) => console.error(`Failed to load image for ${item.name}:`, error.nativeEvent)}
          />
        )}
        <Text style={styles.categoryName}>{item.name}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Categories</Text>
        <TouchableOpacity
          style={styles.seeAllContainer}
          onPress={() => router.push({ pathname: '/shop/AllCategories', params: { prevRoute: pathname } })}
        >
          <LinearGradient
            colors={['#3B82F6', '#1D4ED8']}
            style={styles.seeAllGradient}
          >
            <Text style={styles.seeAll}>See All</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
      <FlatList
        data={sortedCategories}
        renderItem={renderCategory}
        keyExtractor={(item) => item.id.toString()}
        numColumns={3}
        columnWrapperStyle={styles.row}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#333',
  },
  seeAllContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  seeAllGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  seeAll: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  categoryItem: {
    width: '30%',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    marginHorizontal: 5,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  icon: {
    width: 80,
    height: 55,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 14,
    textAlign: 'center',
    color: '#333',
    fontWeight: '600',
  },
});

export default Categories;