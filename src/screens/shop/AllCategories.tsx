import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import axios from 'axios';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient'; // Added import

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

const AllCategories = () => {
  const [categories, setCategories] = useState([]);
  const router = useRouter();
  const params = useLocalSearchParams();
  const { prevRoute } = params;

  useEffect(() => {
    axios
      .get('https://retail-alvinia-goza-f6a0e4f7.koyeb.app/all-shop-categories/')
      .then((response) => {
        const categoryArray = Object.values(response.data);
        setCategories(categoryArray);
      })
      .catch((error) => {
        console.error('Error fetching categories:', error);
      });
  }, []);

  const handleCategoryClick = (categoryId, categoryName) => {
    router.push({
      pathname: '/shop/ChildCategoryList',
      params: { categoryId: categoryId, categoryName: categoryName },
    });
  };

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity
      style={styles.categoryItem}
      onPress={() => handleCategoryClick(item.id, item.name)}
    >
      <LinearGradient
        colors={['#E3F2FD', '#BBDEFB']}
        style={styles.iconContainer}
      >
        <Image
          source={categoryIconMap[item.name.trim().toLowerCase()]}
          style={styles.icon}
          resizeMode="contain"
        />
      </LinearGradient>
      <Text style={styles.categoryName}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <LinearGradient
        colors={['#E3F2FD', '#BBDEFB']}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.replace(prevRoute || '/(tabs)/shop')}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>All Categories</Text>
          <View style={styles.headerSpacer} />
        </View>
        <FlatList
          data={categories}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          columnWrapperStyle={styles.row}
        />
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: "#3A7BD5",
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    shadowColor: '#000',
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
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    flex: 1,
  },
  headerSpacer: {
    width: 42,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 16,
  },
  row: {
    justifyContent: 'space-between',
  },
  categoryItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  iconContainer: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  icon: {
    width: 48,
    height: 48,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default AllCategories;