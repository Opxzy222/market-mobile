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
import * as Location from 'expo-location';

const API_BASE_URL = 'https://127.0.0.1:8000';

const SubCategoryList = () => {
  const { categoryId, categoryName, prevRoute } = useLocalSearchParams();
  const router = useRouter();

  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState(null);
  const [isFetchingResults, setIsFetchingResults] = useState(false);

  useEffect(() => {
    const fetchSubcategories = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/shop-subcategories/${categoryId}/`);
        setSubcategories(response.data);
      } catch (error) {
        console.error('Error fetching subcategories:', error);
        Alert.alert('Error', 'Failed to load subcategories');
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubcategories();
  }, [categoryId]);

  const handleSubcategoryClick = useCallback(async (subcategoryId) => {
    setSelectedSubcategoryId(subcategoryId);
    setIsFetchingResults(true);

    try {
      const locationServicesEnabled = await Location.hasServicesEnabledAsync();
      if (!locationServicesEnabled) {
        Alert.alert(
          'Location Services Disabled',
          'Please enable location services to find nearby shops.'
        );
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Please allow location access in your settings.'
        );
        return;
      }

      const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      console.log('Current location:', coords);

      const response = await axios.get(`${API_BASE_URL}/shop-category-search/`, {
        params: { subcategory_id: subcategoryId, lat: coords.latitude, lon: coords.longitude },
      });

      router.push({ pathname: '/shop/SearchResult', params: { searchResults: JSON.stringify(response.data) } });
    } catch (error) {
      console.error('Error during search:', error);
      Alert.alert('Error', 'Failed to load search results');
    } finally {
      setIsFetchingResults(false);
    }
  }, [router]);

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading subcategories...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.errorText}>Failed to load subcategories.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace(prevRoute || '((tabs)/shop)')} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#007BFF" />
        </TouchableOpacity>
        <Text style={styles.heading}>{categoryName}</Text>
      </View>
      <View style={styles.card}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  heading: {
    fontSize: 22,
    fontWeight: "bold",
    marginLeft: 75,
    color: "black",
  },
  backButton: {
    borderRadius: 50,
    backgroundColor: "#E0E0E0",
    marginRight: 12,
  },
  card: {
    padding: 20,
    flex: 1
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
  centeredContainer: {
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
  errorText: {
    fontSize: 16,
    color: '#DC2626',
  },
});

export default SubCategoryList;
