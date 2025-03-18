import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import axios from 'axios';
import { useRouter, usePathname } from 'expo-router';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const router = useRouter();
  const pathname = usePathname()

  useEffect(() => {
    axios
      .get('https://127.0.0.1:8000/shop-categories/')
      .then((response) => {
        const categoryArray = Object.values(response.data);
        setCategories(categoryArray);
      })
      .catch((error) => {
        console.error('Error fetching categories:', error);
      });
  }, []);

  const categoryIconMap = {
    vehicles: require('../../../assets/Image/car-icon.svg'),
    electronics: require('../../../assets/Image/computer-icon.png'),
    phone: require('../../../assets/Image/phone-icon.png'),
    furniture: require('../../../assets/Image/furniture-icon.png'),
    '': require('../../../assets/Image/home-appliance-icon.png'),
    fashion: require('../../../assets/Image/wear-icon.png'),
    property: require('../../../assets/Image/property-icon.png'),
    'health & beauty': require('../../../assets/Image/health-beauty-icon2.png'),
    services: require('../../../assets/Image/services-icon.jpg'),
    'babies & kiddies': require('../../../assets/Image/babies-icon.jpg'),
    'agriculture & food': require('../../../assets/Image/agric-icon.jpg'),
  };

  const handleCategoryClick = (categoryId, categoryName) => {
    router.push({pathname: '/shop/SubcategoryList', params: { categoryId: categoryId,
       categoryName: categoryName, prevRoute: pathname }, });
  };

  const renderCategory = ({ item }) => (
    <TouchableOpacity
      style={styles.categoryItem}
      onPress={() => handleCategoryClick(item.id, item.name)}
    >
      {categoryIconMap[item.name.toLowerCase()] && (
        <Image
          source={categoryIconMap[item.name.toLowerCase()]}
          style={styles.icon}
        />
      )}
      <Text style={styles.categoryName}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Shop Categories</Text>
        <TouchableOpacity style={styles.seeAllContainer}
          onPress={() => router.push({ pathname: '/shop/AllCategories', params: { prevRoute: pathname } })}>
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={categories}
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(30, 144, 255, 0.15)',
  },
  seeAll: {
    fontSize: 16,
    color: '#1E40AF',
    fontWeight: 'bold',
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
    width: 50,
    height: 50,
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
