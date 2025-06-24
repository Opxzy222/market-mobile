import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator, StatusBar
} from 'react-native';
import axios from 'axios';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { prevRoute } = useLocalSearchParams();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        if (__DEV__) {
          console.log('Fetching all categories');
        }
        setLoading(true);
        const response = await axios.get('https://retail-alvinia-goza-f6a0e4f7.koyeb.app/all-shop-categories/');
        const categoryArray = Object.values(response.data);
        setCategories(categoryArray);
        if (__DEV__) {
          console.log('Fetched categories:', categoryArray);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const handleCategoryClick = (categoryId, categoryName) => {
    router.push({
      pathname: '/shop/ChildCategoryList',
      params: { categoryId: categoryId, categoryName: categoryName, prevRoute: '/shop/AllCategories' },
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

  if (loading) {
    return (
      <SafeAreaView style={styles.centeredContainer} edges={['top', 'left', 'right']}>
        <LinearGradient colors={['#E3F2FD', '#BBDEFB']} style={styles.centeredContainer}>
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
              onPress={() => router.replace(prevRoute || '/(tabs)/shop')}
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
                fetchCategories();
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