import React, { useState, useCallback, useRef } from 'react';
import { View, StyleSheet, Text, Alert } from 'react-native';
import api from '../../api';
import * as Location from 'expo-location';
import AutocompleteInput from '../AutocompleteInput';
import { useInterstitialAd } from '../../components/AdMobManager';
import { useRouter } from 'expo-router';

export default function GeolocationSearch({ onSearch, onFocusChange, onSuggestionsStateChange, onPopulationStateChange }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const { showInterstitial, adLoaded } = useInterstitialAd();
  const router = useRouter();

  const handleSearch = useCallback(
    async (query) => {
      setLoading(true);
      setError(null);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Location permission denied');
          Alert.alert('Permission Denied', 'Location access is required to search nearby shops.');
          setLoading(false);
          return;
        }

        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const { latitude, longitude } = location.coords;

        const response = await api.get('/shop-product-search/', {
          params: { input: query, lat: latitude, lon: longitude },
        });

        if (response.data.error) {
          Alert.alert('Error', response.data.error);
          setLoading(false);
          return;
        }

        if (response.data.shops.length === 0) {
          Alert.alert('No Results', 'No space found for your search.');
          setLoading(false);
          return;
        }

        const shops = response.data.shops.slice(0, 50); // Limit to 50 shops
        await onSearch(shops);
        console.log('Navigating to SearchResult with query:', query.trim(), 'shops:', shops.length);
        router.push({
          pathname: '/shop/SearchResult',
          params: { searchTerm: query.trim(), shops: JSON.stringify(shops) },
        });
      } catch (err) {
        console.error('Error details:', err.response?.data, err.message);
        setError('Error fetching data. Please check your connection.');
        Alert.alert('Error', 'Failed to fetch search results. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [onSearch, router]
  );

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {error && <Text style={styles.error}>{error}</Text>}
        <AutocompleteInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmit={handleSearch}
          onSearch={handleSearch}
          loading={loading}
          style={styles.input}
          onFocusChange={onFocusChange}
          inputRef={inputRef}
          onSuggestionsStateChange={onSuggestionsStateChange}
          onPopulationStateChange={onPopulationStateChange}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'visible',
  },
  input: {
    width: '100%',
  },
  error: {
    color: '#ff4d4d',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 10,
    textAlign: 'center',
  },
});