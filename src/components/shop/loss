import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';
import * as Location from 'expo-location';
import AutocompleteInput from '../AutocompleteInput';
import { LinearGradient } from 'expo-linear-gradient';

export default function GeolocationSearch({ onSearch, onFocusChange, onSuggestionsStateChange }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const handleSearch = useCallback(
    async (query) => {
      setLoading(true);
      setError(null);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Location permission denied');
          return;
        }

        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const { latitude, longitude } = location.coords;

        const response = await axios.get('https://retail-alvinia-goza-f6a0e4f7.koyeb.app/shop-product-search/', {
          params: { input: query, lat: latitude, lon: longitude },
        });

        if (response.data.error) {
          Alert.alert('Error', response.data.error);
          return;
        }

        if (response.data.shops.length === 0) {
          Alert.alert('No Results', 'No shops found for your search.');
        }

        onSearch(response.data.shops);
      } catch (err) {
        console.error('Error details:', err.response?.data, err.message);
        setError('Error fetching data. Please check your connection.');
      } finally {
        setLoading(false);
      }
    },
    [onSearch]
  );

  return (
    <View
      style={styles.container}
      onStartShouldSetResponder={() => true}
      onResponderRelease={() => console.log('GeolocationSearch touch captured')}
    >
      <LinearGradient colors={['#E3F2FD', '#BBDEFB']} style={styles.gradient}>
        <View style={styles.card}>
          {error && <Text style={styles.error}>{error}</Text>}
          <AutocompleteInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmit={handleSearch}
            style={styles.input}
            onFocusChange={onFocusChange}
            inputRef={inputRef}
            onSuggestionsStateChange={onSuggestionsStateChange}
          />
          <TouchableOpacity
            style={[styles.searchButton, loading && styles.searchButtonDisabled]}
            onPress={() => handleSearch(searchQuery)}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.searchButtonText}>Search</Text>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },
  input: {
    marginBottom: 12,
  },
  searchButton: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  searchButtonDisabled: {
    backgroundColor: '#A7C7E7',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  error: {
    color: 'red',
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
});