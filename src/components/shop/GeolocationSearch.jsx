import React, { useState } from "react";
import { View, TextInput, TouchableOpacity, StyleSheet, Text, ActivityIndicator, Alert } from "react-native";
import axios from "axios";
import * as Location from "expo-location";

export default function GeolocationSearch({ onSearch }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert("Input Required", "Please enter a search query.");
      return;
    }

    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setError("Permission to access location was denied.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = location.coords;

      const response = await axios.get("https://retail-alvinia-goza-f6a0e4f7.koyeb.app/shop-product-search/", {
        params: { input: searchQuery, lat: latitude, lon: longitude },
      });

      if (response.data.length === 0) {
        Alert.alert("No Results", "No shops found for your search.");
      }

      onSearch(response.data);
    } catch (err) {
      setError("Error fetching data. Please check your connection.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {error && <Text style={styles.error}>{error}</Text>}
        
        <TextInput
          style={styles.input}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="What are you looking for?"
          placeholderTextColor="#777"
          editable={!loading}
        />

        <TouchableOpacity style={styles.searchButton} onPress={handleSearch} disabled={loading} activeOpacity={0.8}>
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.searchButtonText}>Search</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#555",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#F8FAFC",
    marginBottom: 12,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: "#007bff",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  searchButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  error: {
    color: "red",
    fontSize: 12,
    marginBottom: 8,
    textAlign: "center",
  },
});
