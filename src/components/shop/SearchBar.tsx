import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Animated } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import GeolocationSearch from './GeolocationSearch';
import LocationSearch from './LocationSearch';
import ShopIdSearch from './ShopIdSearch';
import { LinearGradient } from "expo-linear-gradient";

export default function ShopSearchComponent() {
  const [activeFilter, setActiveFilter] = useState('geolocation');
  const [fadeAnim] = useState(new Animated.Value(1));
  const router = useRouter();
  const pathname = usePathname();

  const handleSearch = (searchData) => {
    if (router) {
      router.push({
        pathname: '/shop/SearchResult',
        params: { searchResults: JSON.stringify(searchData), prevRoute: pathname },
      });
    }
  };

  const switchFilter = (filter) => {
    if (filter !== activeFilter) {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
      setActiveFilter(filter);
    }
  };

  return (
    <LinearGradient colors={["#E3F2FD", "#BBDEFB"]} style={styles.container}>
      <View style={styles.filterContainer}>
        {['geolocation', 'location', 'shop ID'].map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterButton, activeFilter === filter && styles.activeFilter]}
            onPress={() => switchFilter(filter)}
          >
            <Text style={[styles.filterText, activeFilter === filter && styles.activeFilterText]}>
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Animated.View style={[styles.searchContainer, { opacity: fadeAnim }]}>
        {activeFilter === 'geolocation' && <GeolocationSearch onSearch={handleSearch} />}
        {activeFilter === 'location' && <LocationSearch onSearch={handleSearch} />}
        {activeFilter === 'shop ID' && <ShopIdSearch onSearch={handleSearch} />}
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15,
    paddingVertical: 12,
    borderRadius: 20,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#78A9E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  activeFilter: {
    backgroundColor: '#4785CC',
    borderColor: '#356EB5',
  },
  filterText: {
    fontSize: 16,
    color: 'black',
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#fff',
    fontWeight: '600',
  },
  searchContainer: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
});
