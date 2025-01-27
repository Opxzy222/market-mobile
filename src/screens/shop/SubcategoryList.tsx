import React, { useState, useEffect } from 'react';
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
import * as Location from 'expo-location';

const SubCategoryList = () => {
  const params = useLocalSearchParams();
  const { categoryId, categoryName } = params;
  const router = useRouter();

  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState(null);
  const [isFetchingResults, setIsFetchingResults] = useState(false);

  useEffect(() => {
    axios
      .get(`https://172.27.243.94:8000/shop-subcategories/${categoryId}/`)
      .then((response) => {
        setSubcategories(response.data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching subcategories:', error);
        Alert.alert('Error', 'Failed to load subcategories');
        setError(error);
        setLoading(false);
      });
  }, [categoryId]);

  const handleSubcategoryClick = async (subcategoryId) => {
    console.log('Subcategory clicked:', subcategoryId);
    setSelectedSubcategoryId(subcategoryId);
    setIsFetchingResults(true);

    try {
      // Check location services
      const locationServicesEnabled = await Location.hasServicesEnabledAsync();
      if (!locationServicesEnabled) {
        Alert.alert(
          'Location Services Disabled',
          'Please enable location services in your device settings to find nearby shops.'
        );
        console.error('Location services are disabled.');
        setIsFetchingResults(false);
        return;
      }

      // Request location permissions
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to find nearby shops. Please allow access in your settings.'
        );
        console.error('Location permission denied.');
        setIsFetchingResults(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      console.log('Current location:', { latitude, longitude });

      const response = await axios.get('https://172.27.243.94:8000/shop-category-search/', {
        params: {
          subcategory_id: subcategoryId,
          lat: latitude,
          lon: longitude,
        },
      });

      console.log('Search results:', response.data);

      router.push({
        pathname: '/shop/SearchResult',
        params: { searchResults: JSON.stringify(response.data) },
      });
    } catch (error) {
      console.error('Error during subcategory search:', error);
      Alert.alert('Error', 'Failed to load search results');
    } finally {
      setIsFetchingResults(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading subcategories...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load subcategories.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#007BFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Back</Text>
        </View>
      <Text style={styles.heading}>{categoryName}</Text>
      <FlatList
        data={subcategories}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.subcategoryItem,
              selectedSubcategoryId === item.id && styles.subcategoryItemSelected,
            ]}
            onPress={() => handleSubcategoryClick(item.id)}
            disabled={isFetchingResults}
          >
            <Text style={styles.subcategoryName}>{item.name}</Text>
            {selectedSubcategoryId === item.id && isFetchingResults && (
              <ActivityIndicator size="small" color="#4F46E5" />
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  heading: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1F2937',
    textAlign: 'center',
  },
  subcategoryItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subcategoryItemSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#EFF6FF',
  },
  subcategoryName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
  },
});

export default SubCategoryList;
