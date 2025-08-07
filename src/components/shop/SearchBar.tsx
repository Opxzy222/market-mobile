import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Animated, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GeolocationSearch from './GeolocationSearch';
import LocationSearch from './LocationSearch';
import ShopIdSearch from './ShopIdSearch';
import { LinearGradient } from 'expo-linear-gradient';

const FILTERS = [
  { key: 'geolocation', label: 'Geolocation' },
  { key: 'location', label: 'Location' },
  { key: 'spaceId', label: 'Space ID' },
];

export default function SearchBar({ onSuggestionsStateChange, onFocusChange, onPopulationStateChange }) {
  const [activeFilter, setActiveFilter] = useState('geolocation');
  const [fadeAnim] = useState(new Animated.Value(1));
  const router = useRouter();

  const handleSearch = async (searchData) => {
    try {
      let count = parseInt(await AsyncStorage.getItem('searchCount') || '0', 10);
      count += 1;
      await AsyncStorage.setItem('searchCount', count.toString());
      console.log('Search count incremented:', count);
      return { searchData, router };
    } catch (error) {
      console.error('Error incrementing search count:', error);
    }
  };

  const switchFilter = (filterKey) => {
    if (filterKey !== activeFilter) {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
      setActiveFilter(filterKey);
    }
  };

  const renderSearchComponent = () => {
    switch (activeFilter) {
      case 'geolocation':
        return (
          <GeolocationSearch
            onSearch={handleSearch}
            onFocusChange={onFocusChange}
            onSuggestionsStateChange={onSuggestionsStateChange}
            onPopulationStateChange={onPopulationStateChange} // Pass prop
          />
        );
      case 'location':
        return <LocationSearch onSearch={handleSearch} />;
      case 'spaceId':
        return <ShopIdSearch onSearch={handleSearch} />;
      default:
        return null;
    }
  };

  return (
    <LinearGradient colors={['#E3F2FD', '#BBDEFB']} style={styles.container}>
      <View style={styles.filterContainer}>
        {FILTERS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.filterButton, activeFilter === key && styles.activeFilter]}
            onPress={() => switchFilter(key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, activeFilter === key && styles.activeFilterText]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Animated.View style={[styles.searchContainer, { opacity: fadeAnim }]}>{renderSearchComponent()}</Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 20,
    overflow: 'visible',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F2F7FC',
    padding: 10,
    borderRadius: 30,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  filterButton: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 12 : 14,
    marginHorizontal: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A7C7E7',
  },
  activeFilter: {
    backgroundColor: '#2563EB',
    borderColor: '#1E40AF',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  filterText: {
    fontSize: 15,
    color: '#4B5563',
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 4,
  },
});