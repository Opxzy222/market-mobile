import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import GeolocationSearch from './GeolocationSearch';
import LocationSearch from './LocationSearch';
import ShopIdSearch from './ShopIdSearch';

export default function ShopSearchComponent() {
  const [activeFilter, setActiveFilter] = useState('geolocation');
  const [fadeAnim] = useState(new Animated.Value(1)); // Fade animation
  const router = useRouter();

  const handleSearch = (searchData) => {
    console.log('Search Data:', searchData);
    if (router) {
      router.push({
        pathname: '/shop/SearchResult',
        params: { searchResults: JSON.stringify(searchData) },
      });
    }
  };

  const switchFilter = (filter) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    setActiveFilter(filter);
  };

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, activeFilter === 'geolocation' && styles.activeFilter]}
          onPress={() => switchFilter('geolocation')}
        >
          <Text style={[styles.filterText, activeFilter === 'geolocation' && styles.activeFilterText]}>Geolocation</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, activeFilter === 'location' && styles.activeFilter]}
          onPress={() => switchFilter('location')}
        >
          <Text style={[styles.filterText, activeFilter === 'location' && styles.activeFilterText]}>Location</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, activeFilter === 'shopId' && styles.activeFilter]}
          onPress={() => switchFilter('shopId')}
        >
          <Text style={[styles.filterText, activeFilter === 'shopId' && styles.activeFilterText]}>Shop ID</Text>
        </TouchableOpacity>
      </View>
      <Animated.View style={[styles.searchContainer, { opacity: fadeAnim }]}>
        {activeFilter === 'geolocation' && <GeolocationSearch onSearch={handleSearch} />}
        {activeFilter === 'location' && <LocationSearch onSearch={handleSearch} />}
        {activeFilter === 'shopId' && <ShopIdSearch onSearch={handleSearch} />}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f9f9f9',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingVertical: 10,
    backgroundColor: '#F5F7F8',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 5,
    borderRadius: 10,
    backgroundColor: '#e6e6e6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeFilter: {
    backgroundColor: '#35374B',
  },
  filterText: {
    fontSize: 16,
    color: '#555',
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  searchContainer: {
    flex: 1,
    backgroundColor: '#F5F7F8',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
