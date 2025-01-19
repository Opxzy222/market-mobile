import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import GeolocationSearch from './GeolocationSearch';
import LocationSearch from './LocationSearch';

export default function ShopSearchComponent() {
  const [activeFilter, setActiveFilter] = useState('geolocation');
  const router = useRouter();
  
  const handleSearch = (searchData) => {
    console.log('Search Data:', searchData);
    if (router) {
      // Navigate with encoded searchResults
      router.push({
        pathname: '/shop/SearchResult',
        params: { searchResults: JSON.stringify(searchData) },
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, activeFilter === 'geolocation' && styles.activeFilter]}
          onPress={() => setActiveFilter('geolocation')}
        >
          <Text style={[styles.filterText, activeFilter === 'geolocation' && styles.activeFilterText]}>
            Geolocation
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, activeFilter === 'location' && styles.activeFilter]}
          onPress={() => setActiveFilter('location')}
        >
          <Text style={[styles.filterText, activeFilter === 'location' && styles.activeFilterText]}>
            Location
          </Text>
        </TouchableOpacity>
      </View>
      {activeFilter === 'geolocation' ? (
        <GeolocationSearch onSearch={handleSearch} />
      ) : (
        <LocationSearch onSearch={handleSearch} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f9f9f9',
    flexGrow: 0,
    alignSelf: 'stretch',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 5,
    borderRadius: 10,
    backgroundColor: '#e6e6e6',
    alignItems: 'center',
  },
  activeFilter: {
    backgroundColor: 'black',
  },
  filterText: {
    fontSize: 16,
    color: '#666',
  },
  activeFilterText: {
    color: '#fff',
    fontWeight: '600',
  },
});
