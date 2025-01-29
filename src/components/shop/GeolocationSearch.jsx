import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Text, ActivityIndicator } from 'react-native';
import axios from 'axios';
import * as Location from 'expo-location';

export default function GeolocationSearch({ onSearch }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (!searchQuery) {
      alert('Please enter a search query.');
      return;
    }

    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setError('Permission to access location was denied.');
      return;
    }

    setLoading(true);
    try {
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      const response = await axios.get('https://172.27.243.94:8000/shop-product-search/', {
        params: {
          input: searchQuery,
          lat: latitude,
          lon: longitude,
        },
      });

      onSearch(response.data);
    } catch (err) {
      setError('Error fetching location or searching for products.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {error && <Text style={styles.error}>{error}</Text>}
      <TextInput
        style={styles.input}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="What are you looking for?"
        editable={!loading}
      />
      <TouchableOpacity
        style={[styles.searchButton, loading && styles.disabledButton]}
        onPress={handleSearch}
        disabled={loading}
      >
        <Text style={styles.searchButtonText}>{loading ? 'Searching...' : 'Search'}</Text>
      </TouchableOpacity>
      {loading && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#007bff" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
  },
  input: {
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
    fontSize: 18,
  },
  searchButton: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  disabledButton: {
    backgroundColor: '#b0c4de',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
  loaderContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
});
