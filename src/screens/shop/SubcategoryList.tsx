import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  StatusBar,
} from 'react-native';
import api from '../../api';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = '';

// In-memory cache for subcategories
const subcategoryCache = new Map();

const SubcategoryList = () => {
  const { categoryId, categoryName, prevRoute, parentCategoryId, parentCategoryName } = useLocalSearchParams();
  const router = useRouter();

  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState(null);
  const [isFetchingResults, setIsFetchingResults] = useState(false);

  // Animation state for cards
  const scaleCard = useSharedValue(1);
  const elevationCard = useSharedValue(4);

  useEffect(() => {
    const loadData = async () => {
      if (!categoryId) {
        if (__DEV__) {
          console.log('No categoryId provided, navigating to shop');
        }
        router.replace('/(tabs)/shop');
        return;
      }

      try {
        if (__DEV__) {
          console.log('Loading subcategories for categoryId:', categoryId);
        }

        // Check in-memory cache
        if (subcategoryCache.has(categoryId)) {
          const cachedData = subcategoryCache.get(categoryId);
          setSubcategories(cachedData);
          setLoading(false);
          if (__DEV__) {
            console.log('Loaded subcategories from in-memory cache');
          }
          return;
        }

        // Check AsyncStorage cache
        const cacheKey = `subcategories_${categoryId}`;
        const cachedData = await AsyncStorage.getItem(cacheKey);
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          setSubcategories(parsedData);
          subcategoryCache.set(categoryId, parsedData);
          setLoading(false);
          if (__DEV__) {
            console.log('Loaded subcategories from AsyncStorage');
          }
          return;
        }

        // Fetch from API
        const sessionToken = await AsyncStorage.getItem('sessionToken');
        const response = await api.get(`${API_BASE_URL}/shop-subcategories/${categoryId}/`, {
          headers: sessionToken ? { Authorization: sessionToken } : {},
        });
        const data = response.data;
        setSubcategories(data);
        subcategoryCache.set(categoryId, data);
        await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
        if (__DEV__) {
          console.log('Fetched subcategories:', data);
        }
      } catch (error) {
        console.error('Error fetching subcategories:', error);
        Alert.alert('Error', 'Failed to load subcategories');
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [categoryId, router]);

  const handleSubcategoryClick = useCallback(async (subcategoryId) => {
    setSelectedSubcategoryId(subcategoryId);
    setIsFetchingResults(true);

    try {
      // Increment search count
      let count = parseInt(await AsyncStorage.getItem('searchCount') || '0', 10);
      count += 1;
      await AsyncStorage.setItem('searchCount', count.toString());
      console.log('Search count incremented:', count);

      const locationServicesEnabled = await Location.hasServicesEnabledAsync();
      if (!locationServicesEnabled) {
        Alert.alert(
          'Location Services Disabled',
          'Please enable location services to find nearby shops.'
        );
        setIsFetchingResults(false);
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Please allow location access in your settings.'
        );
        setIsFetchingResults(false);
        return;
      }

      const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (__DEV__) {
        console.log('Current location:', coords);
      }

      const sessionToken = await AsyncStorage.getItem('sessionToken');
      const response = await api.get(`${API_BASE_URL}/shop-subcategory-search/`, {
        params: { subcategory_id: subcategoryId, lat: coords.latitude, lon: coords.longitude },
        headers: sessionToken ? { Authorization: sessionToken } : {},
      });

      // Extract shops directly from response.data
      const shops = Array.isArray(response.data) ? response.data.slice(0, 50) : []; // Limit to 50 shops
      if (shops.length === 0) {
        Alert.alert('No Results', 'No shops found for this subcategory.');
        setIsFetchingResults(false);
        return;
      }

      router.push({
        pathname: '/shop/SearchResult',
        params: {
          searchTerm: subcategories.find((item) => item.id === subcategoryId)?.name || 'Subcategory',
          shops: JSON.stringify(shops),
        },
      });
    } catch (error) {
      console.error('Error fetching shops:', error);
      Alert.alert('Error', 'Failed to load shop results');
    } finally {
      setIsFetchingResults(false);
    }
  }, [router, subcategories]);

  // Animation handlers
  const handlePressIn = () => {
    scaleCard.value = withSpring(0.95, { damping: 12, stiffness: 150 });
    elevationCard.value = withTiming(8, { duration: 150 });
  };

  const handlePressOut = () => {
    scaleCard.value = withSpring(1, { damping: 12, stiffness: 150 });
    elevationCard.value = withTiming(4, { duration: 150 });
  };

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleCard.value }],
    elevation: elevationCard.value,
  }));

  const fetchSubcategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const sessionToken = await AsyncStorage.getItem('sessionToken');
      const response = await api.get(`${API_BASE_URL}/shop-subcategories/${categoryId}/`, {
        headers: sessionToken ? { Authorization: sessionToken } : {},
      });
      const data = response.data;
      setSubcategories(data);
      subcategoryCache.set(categoryId, data);
      await AsyncStorage.setItem(`subcategories_${categoryId}`, JSON.stringify(data));
      if (__DEV__) {
        console.log('Fetched subcategories:', data);
      }
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      Alert.alert('Error', 'Failed to load subcategories');
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <LinearGradient colors={['#F7FAFC', '#E5E7EB']} style={styles.centeredContainer}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={26} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{categoryName || 'Loading...'}</Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={styles.loadingText}>Loading subcategories...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (error && !subcategories.length) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <LinearGradient colors={['#F7FAFC', '#E5E7EB']} style={styles.centeredContainer}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={26} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{categoryName || 'Error'}</Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.loaderContainer}>
            <Text style={styles.errorText}>Failed to load subcategories.</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchSubcategories}>
              <LinearGradient
                colors={['#6366F1', '#A855F7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.retryButtonGradient}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
      <LinearGradient colors={['#F7FAFC', '#E5E7EB']} style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{categoryName}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.contentWrapper}>
          <FlatList
            data={subcategories}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <Animated.View
                style={[
                  styles.subcategoryCard,
                  selectedSubcategoryId === item.id && styles.subcategoryCardSelected,
                  animatedCardStyle,
                ]}
              >
                <TouchableOpacity
                  style={styles.subcategoryCardInner}
                  onPress={() => handleSubcategoryClick(item.id)}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                  disabled={isFetchingResults}
                >
                  <LinearGradient
                    colors={['#FFFFFF', '#F1F5F9']}
                    style={styles.cardGradient}
                  >
                    <Text style={styles.subcategoryTitle}>{item.name}</Text>
                    {selectedSubcategoryId === item.id && isFetchingResults ? (
                      <ActivityIndicator size="small" color="#6366F1" />
                    ) : (
                      <MaterialIcons name="chevron-right" size={26} color="#14B8A6" />
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </View>
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
  contentWrapper: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  listContent: {
    paddingVertical: 12,
    paddingBottom: 100,
  },
  subcategoryCard: {
    marginVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  subcategoryCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  cardGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 2,
    borderRadius: 20,
  },
  subcategoryCardSelected: {
    borderColor: '#14B8A6',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
    backgroundColor: 'rgba(20, 184, 166, 0.1)', // Subtle teal tint
  },
  subcategoryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    fontFamily: 'System',
    letterSpacing: 0.3,
    lineHeight: 26,
  },
  centeredContainer: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 17,
    fontWeight: '600',
    color: '#1E293B',
    fontFamily: 'System',
    letterSpacing: 0.3,
    lineHeight: 24,
  },
  errorText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#F43F5E',
    fontFamily: 'System',
    letterSpacing: 0.3,
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  retryButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  retryButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});

export default SubcategoryList;