import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Animated } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import GeolocationSearch from './GeolocationSearch';
import LocationSearch from './LocationSearch';
import ShopIdSearch from './ShopIdSearch';
import { LinearGradient } from 'expo-linear-gradient';

export default function SearchBar({ onSuggestionsStateChange, onFocusChange }) {
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
    <LinearGradient colors={['#E3F2FD', '#BBDEFB']} style={[styles.container, { overflow: 'visible' }]}>
      <View style={styles.filterContainer}>
        {['geolocation', 'location', 'space ID'].map((filter) => (
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

      <Animated.View style={[styles.searchContainer, { opacity: fadeAnim, overflow: 'visible' }]}>
        {activeFilter === 'geolocation' && (
          <GeolocationSearch
            onSearch={handleSearch}
            onFocusChange={onFocusChange}
            onSuggestionsStateChange={onSuggestionsStateChange}
          />
        )}
        {activeFilter === 'location' && <LocationSearch onSearch={handleSearch} />}
        {activeFilter === 'space ID' && <ShopIdSearch onSearch={handleSearch} />}
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    overflow: 'visible',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    backgroundColor: '#F2F7FC',
    padding: 10,
    borderRadius: 25,
    marginBottom: 15,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 14,
    marginHorizontal: 4,
    borderRadius: 25,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A7C7E7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  activeFilter: {
    backgroundColor: '#4785CC',
    borderColor: '#356EB5',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  filterText: {
    fontSize: 16,
    color: '#5A5A5A',
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#fff',
    fontWeight: '700',
  },
  searchContainer: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    overflow: 'visible',
  },
});