import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import axios from 'axios';
import { useRouter, usePathname } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from "expo-linear-gradient";

const MyShop = () => {
  const [shops, setShops] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const router = useRouter();
  const pathname = usePathname();

  // Function to fetch session ID
  const fetchSessionId = useCallback(async () => {
    const sessionIdString = await AsyncStorage.getItem("sessionToken");
    setSessionId(sessionIdString);
  }, []);

  // Function to fetch shop data
  const fetchShops = useCallback(async () => {
    if (!sessionId) return;

    try {
      const response = await axios.post(
        'https://127.0.0.1:8000/shops-product-count/',
        {},
        {
          headers: {
            Authorization: sessionId,
            "Content-Type": "application/json",
          },
        }
      );
      setShops(response.data);
    } catch (error) {
      console.error('Error fetching shops', error);
    }
  }, [sessionId]);

  // Reload data when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchSessionId().then(fetchShops);
    }, [fetchSessionId, fetchShops])
  );

  const handleCloseShop = async (shopId) => {
    Alert.alert('Confirm', 'Are you sure you want to close this shop?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Close Shop',
        onPress: async () => {
          try {
            await axios.delete(`https://127.0.0.1:8000/close-shop/${shopId}/`);
            setShops((prev) => prev.filter((shop) => shop.id !== shopId));
            Alert.alert('Success', 'Shop closed successfully.');
          } catch (error) {
            Alert.alert('Error', 'Failed to close shop.');
          }
        },
      },
    ]);
  };

  const handleCreateShop = async () => {
    if (shops.length > 0) {
      Alert.alert('Error', 'You cannot create a new shop while your current shop is active.');
      return;
    }
    router.push('/shop/CreateShop');
  };

  return (
  <LinearGradient colors={["#E3F2FD", "#BBDEFB"]} style={styles.container}>
    {shops.length === 0 && (
      <TouchableOpacity style={styles.createShopButton} onPress={handleCreateShop}>
        <MaterialIcons name="add-circle" size={24} color="#fff" />
        <Text style={styles.createShopText}>Create Shop</Text>
      </TouchableOpacity>
    )}

    {shops.length === 0 ? (
      <View style={styles.noShopContainer}>
        <Text style={styles.noShopText}>No shop found. Loading...</Text>
      </View>
    ) : (
      <FlatList
        data={shops}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.shopCard}>
            <Text style={styles.shopName}>{item.name}</Text>
            <Text style={styles.shopDetails}>Products Available: {item.product_count}</Text>
            <View style={styles.actionsContainer}>
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => router.push({ pathname: '/shop/AdminShopPage', params: { shopId: item.id, prevRoute: pathname } })}>
                  <MaterialIcons name="store" size={28} color="#007bff" />
                  <Text style={styles.actionText}>Shop Page</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push({ pathname: 'shop/ShopProduct', params: { shopId: item.id, prevRoute: pathname } })}>
                  <MaterialIcons name="shopping-cart" size={28} color="#ffa500" />
                  <Text style={styles.actionText}>Products</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push({ pathname: '/shop/ShopStatus', params: { shopId: item.id, prevRoute: pathname } })}>
                  <MaterialIcons name="update" size={28} color="#9c27b0" />
                  <Text style={styles.actionText}>Status Updates</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => router.push({ pathname: '/shop/ReceiptActions', params: { shopId: item.id, prevRoute: pathname } })}>
                  <MaterialIcons name="receipt" size={28} color="#795548" />
                  <Text style={styles.actionText}>Receipt</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push({ pathname: '/shop/ShopProfile', params: { shopId: item.id, prevRoute: pathname } })}>
                  <MaterialIcons name="info" size={28} color="#4caf50" />
                  <Text style={styles.actionText}>Profile Details</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleCloseShop(item.id)}>
                  <MaterialIcons name="close" size={28} color="#f44336" />
                  <Text style={styles.actionText}>Quit Shop</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />
    )}
  </LinearGradient>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  createShopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4caf50',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 16,
  },
  createShopText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  shopCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 5,
  },
  shopName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  shopDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  actionsContainer: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: '#ddd',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
  },
  actionText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center'
  },
});

export default MyShop;