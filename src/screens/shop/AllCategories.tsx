import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import api from '../../api';
import * as SecureStore from 'expo-secure-store';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';

const categoryIconMap = {
  'Agriculture & Food': require('../../../assets/G-images/Agriculture.jpg'),
  'Babies & Kiddies': require('../../../assets/G-images/Babies.jpg'),
  'Books & Stationery': require('../../../assets/G-images/Books.jpg'),
  'Commercial Equipments & Tools': require('../../../assets/G-images/Commercial.jpg'),
  'Construction Tools & Materials': require('../../../assets/G-images/Construction.jpg'),
  'Custom & Personalized': require('../../../assets/G-images/Custom.jpg'),
  'Electronics': require('../../../assets/G-images/Electronics.jpg'),
  'Fashion': require('../../../assets/G-images/Fashion.jpg'),
  'Food & Restaurants': require('../../../assets/G-images/Food.jpg'),
  'Fuel & Automotive Retail': require('../../../assets/G-images/Fuel.jpg'),
  'Furniture': require('../../../assets/G-images/Furniture.jpg'),
  'Green & Eco-friendly': require('../../../assets/G-images/Green.jpg'),
  'Grocery & Supermarkets': require('../../../assets/G-images/Grocery.jpg'),
  'Health & Beauty': require('../../../assets/G-images/Health.jpg'),
  'Hospitality & Accommodations': require('../../../assets/G-images/Hospitality.jpg'),
  'Industrial & Scientific': require('../../../assets/G-images/Industrial.jpg'),
  'Luxury & Designer': require('../../../assets/G-images/Luxury.jpg'),
  'Medical & Healthcare': require('../../../assets/G-images/Medical.jpg'),
  'Music & Audio': require('../../../assets/G-images/Music.jpg'),
  'Office & School Supplies': require('../../../assets/G-images/Office.jpg'),
  'Party & Event Supplies': require('../../../assets/G-images/Party.jpg'),
  'Pets': require('../../../assets/G-images/Pets.jpg'),
  'Printing & Publishing': require('../../../assets/G-images/Printing.jpg'),
  'Promotional Products': require('../../../assets/G-images/Promotional.jpg'),
  'Property': require('../../../assets/G-images/Property.jpg'),
  'Seasonal & Holiday': require('../../../assets/G-images/Seasonal.jpg'),
  'Services': require('../../../assets/G-images/Services.jpg'),
  'Spiritual & Wellness': require('../../../assets/G-images/Spiritual.jpg'),
  'Sports, Arts & outdoors': require('../../../assets/G-images/Sports.jpg'),
  'Textiles & Fabrics': require('../../../assets/G-images/Textile.jpg'),
  'Toys & Hobbies': require('../../../assets/G-images/Toys.jpg'),
  'Travel & Luggage': require('../../../assets/G-images/Travel.jpg'),
  'Vehicles': require('../../../assets/G-images/Vehicle.jpg'),
  'Vintage & Thrift': require('../../../assets/G-images/Vintage.jpg'),
  '': require('../../../assets/G-images/default.jpg'),
};

const AllCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { prevRoute } = useLocalSearchParams();

  const fetchCategories = async () => {
    try {
      // Check for cached categories
      const cachedCategories = await SecureStore.getItemAsync('categories_cache');
      if (cachedCategories) {
        if (__DEV__) {
          console.log('Using cached categories');
        }
        const parsedCategories = JSON.parse(cachedCategories);
        setCategories(parsedCategories);
        setLoading(false);
        return;
      }

      // Fetch from backend if no cache
      if (__DEV__) {
        console.log('Fetching all categories from backend');
      }
      setLoading(true);
      const response = await api.get('/all-shop-categories/');
      const categoryArray = Object.values(response.data);
      const sortedCategories = categoryArray.sort((a, b) => a.name.localeCompare(b.name));
      setCategories(sortedCategories);

      // Cache the fetched categories
      await SecureStore.setItemAsync('categories_cache', JSON.stringify(sortedCategories));
      if (__DEV__) {
        console.log('Fetched and cached categories:', sortedCategories.map(item => item.name));
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCategoryClick = (categoryId, categoryName) => {
    router.push({
      pathname: '/shop/ChildCategoryList',
      params: { categoryId: categoryId, categoryName: categoryName, prevRoute: '/shop/AllCategories' },
    });
  };

  const renderCategoryItem = ({ item, index }) => {
    const normalizedName = item.name.trim();
    const imageSource = categoryIconMap[normalizedName] || categoryIconMap[''];
    
    if (!categoryIconMap[normalizedName]) {
      console.warn(`No image found for category: ${normalizedName}, using fallback`);
    }

    const isLastAndOdd = index === categories.length - 1 && categories.length % 2 !== 0;

    return (
      <TouchableOpacity
        style={[styles.categoryItem, isLastAndOdd && styles.lastCategoryItem]}
        onPress={() => handleCategoryClick(item.id, item.name)}
      >
        <LinearGradient
          colors={['#FFFFFF', '#F5F8FA']}
          style={styles.iconContainer}
        >
          <Image
            source={imageSource}
            style={styles.icon}
            resizeMode="contain"
          />
        </LinearGradient>
        <Text style={styles.categoryName}>{item.name}</Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centeredContainer} edges={['top', 'left', 'right']}>
        <LinearGradient colors={['#E3F2FD', '#BBDEFB']} style={styles.centeredContainer}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.navigate('(tabs)/shop')}
              style={styles.backButton}
            >
              <MaterialIcons name="arrow-back" size={26} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>All Categories</Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#3A7BD5" />
            <Text style={styles.loadingText}>Loading categories...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centeredContainer} edges={['top', 'left', 'right']}>
        <LinearGradient colors={['#E3F2FD', '#BBDEFB']} style={styles.centeredContainer}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.navigate('(tabs)/shop')}
              style={styles.backButton}
            >
              <MaterialIcons name="arrow-back" size={26} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>All Categories</Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.loaderContainer}>
            <Text style={styles.errorText}>Failed to load categories.</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setLoading(true);
                setError(null);
                fetchCategories(); // Now in scope
              }}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor='#2563EB' />
      <LinearGradient colors={['#E3F2FD', '#BBDEFB']} style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.navigate("(tabs)/shop")}
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
          initialNumToRender={6}
          windowSize={5}
        />
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centeredContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#3A7BD5',
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
    padding: 16,
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
  lastCategoryItem: {
    maxWidth: '48%',
  },
  iconContainer: {
    borderRadius: 20,
    padding: 7,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  icon: {
    width: 100,
    height: 100,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    lineHeight: 20,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2A44',
    fontFamily: 'System',
    letterSpacing: 0.3,
    lineHeight: 22,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#DC2626',
    fontFamily: 'System',
    letterSpacing: 0.3,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: '#3A7BD5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

export default AllCategories;