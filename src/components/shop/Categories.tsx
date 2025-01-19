import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const navigation = useNavigation();

  useEffect(() => {
    axios
      .get('https://172.27.243.94:8000/shop-categories/')
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
    navigation.navigate('Subcategories', { categoryId, categoryName });
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
        <Text style={styles.seeAll}>See All</Text>
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
    marginHorizontal: 20,  // Reduced for alignment with other sections
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  seeAll: {
    fontSize: 14,
    color: '#007bff',
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  categoryItem: {
    width: '30%',
    alignItems: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  icon: {
    width: 50,
    height: 50,
    marginBottom: 6,
  },
  categoryName: {
    fontSize: 14,
    textAlign: 'center',
    color: '#555',
  },
});

export default Categories;
