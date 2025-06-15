import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated'; // Optional for animations

const API_BASE_URL = 'https://retail-alvinia-goza-f6a0e4f7.koyeb.app';

const ChildCategoryList = () => {
  const { categoryId, categoryName, prevRoute } = useLocalSearchParams();
  const router = useRouter();

  const [childCategories, setChildCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  // Animation state for cards
  const scaleCard = useSharedValue(1);

  useEffect(() => {
    const fetchChildCategories = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/shop-childcategories/${categoryId}/`);
        setChildCategories(response.data);
      } catch (error) {
        console.error('Error fetching child categories:', error);
        Alert.alert('Error', 'Failed to load child categories');
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchChildCategories();
  }, [categoryId]);

  const handleCategoryClick = useCallback((categoryId, categoryName) => {
    setSelectedCategoryId(categoryId);
    router.push({
      pathname: '/shop/SubcategoryList',
      params: { categoryId: categoryId, categoryName: categoryName, prevRoute: '/shop/ChildCategoryList' },
    });
  }, [router]);

  // Animation handlers
  const handlePressIn = () => {
    scaleCard.value = withSpring(0.98);
  };
  const handlePressOut = () => {
    scaleCard.value = withSpring(1);
  };

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleCard.value }],
  }));

  if (loading) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <LinearGradient colors={['#F7FAFC', '#E5E7EB']} style={styles.centeredContainer}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.replace(prevRoute || '/(tabs)/shop')}
              style={styles.backButton}
            >
              <MaterialIcons name="arrow-back" size={26} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{categoryName}</Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#3A7BD5" />
            <Text style={styles.loadingText}>Loading child categories...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <LinearGradient colors={['#F7FAFC', '#E5E7EB']} style={styles.centeredContainer}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <MaterialIcons name="arrow-back" size={26} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{categoryName}</Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.loaderContainer}>
            <Text style={styles.errorText}>Failed to load child categories.</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setLoading(true);
                setError(null);
                fetchChildCategories();
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
      <LinearGradient colors={['#F7FAFC', '#E5E7EB']} style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.replace(prevRoute || '/(tabs)/shop')}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{categoryName}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.contentWrapper}>
          <FlatList
            data={childCategories}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <Animated.View
                style={[
                  styles.subcategoryCard,
                  selectedCategoryId === item.id && styles.subcategoryCardSelected,
                  animatedCardStyle,
                ]}
              >
                <TouchableOpacity
                  style={styles.subcategoryCardInner}
                  onPress={() => handleCategoryClick(item.id, item.name)}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                >
                  <Text style={styles.subcategoryTitle}>{item.name}</Text>
                  <MaterialIcons name="chevron-right" size={24} color="#6B7280" />
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
    backgroundColor: '#3A7BD5', // Preserved
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
    paddingHorizontal: 20, // Reduced for balance
    paddingTop: 24, // Increased for spacing
  },
  listContent: {
    paddingVertical: 12,
    paddingBottom: 80, // More padding for scroll comfort
  },
  subcategoryCard: {
    marginVertical: 8,
    borderRadius: 16, // Softer corners
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB', // Subtle border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  subcategoryCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16, // Taller cards
    paddingHorizontal: 20,
  },
  subcategoryCardSelected: {
    backgroundColor: '#F5FAFF', // Light blue for selected state
    borderColor: '#3A7BD5', // Match header
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  subcategoryTitle: {
    fontSize: 17, // Slightly smaller for balance
    fontWeight: '600', // Semi-bold for elegance
    color: '#111827', // Darker for contrast
    fontFamily: 'System',
    letterSpacing: 0.2,
    lineHeight: 24,
  },
  centeredContainer: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16, // Smaller for subtlety
    fontWeight: '500', // Medium weight
    color: '#1F2A44', // Darker for professionalism
    fontFamily: 'System',
    letterSpacing: 0.3,
    lineHeight: 22,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#DC2626', // Red for error
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
    backgroundColor: '#3A7BD5', // Match header
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

export default ChildCategoryList;