import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api';

const ShopIdSearch = () => {
  const [shopId, setShopId] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    const fetchSessionId = async () => {
      const sessionIdString = await AsyncStorage.getItem("sessionToken");
      setSessionId(sessionIdString);
    };

    fetchSessionId();
  }, []);

  const handleSearch = async () => {
    setError(null);
    if (!shopId) {
      setError("Please enter a Shop ID");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(
        "/search-shop-id/",
        { shop_id: shopId },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: sessionId,
          },
        }
      );

      if (response.status === 200) {
        router.push({
          pathname: "/shop/shop-page",
          params: { shopId: response.data.shop_id },
        });
      } else {
        setError(response.data.error || "Shop not found");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>Enter Space ID</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter Space ID"
          placeholderTextColor="#888"
          value={shopId}
          onChangeText={setShopId}
        />
        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.searchButton} onPress={handleSearch} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.searchButtonText}>Search</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
};

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
  error: {
    color: "red",
    fontSize: 12,
    marginBottom: 8,
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
});

export default ShopIdSearch;