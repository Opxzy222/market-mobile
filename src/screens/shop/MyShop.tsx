import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import axios from 'axios';
import { useRouter, usePathname } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';

const MyShop = () => {
  const [shops, setShops] = useState([]);
  const [userId, setUserId] = useState(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const fetchUserId = async () => {
      const userIdString = await AsyncStorage.getItem('user_id');
      setUserId(parseInt(userIdString, 10));
    };
    fetchUserId();
  }, []);

  useEffect(() => {
    if (userId) {
      const fetchShops = async () => {
        try {
          const formData = new FormData();
          formData.append('user_id', userId);

          const response = await axios.post('https://172.27.243.94:8000/shops-product-count/', formData);
          setShops(response.data);
        } catch (error) {
          console.error('Error fetching shops', error);
        }
      };
      fetchShops();
    }
  }, [userId]);

  const handleCloseShop = async (shopId) => {
    Alert.alert('Confirm', 'Are you sure you want to close this shop?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Close Shop',
        onPress: async () => {
          try {
            await axios.delete(`https://172.27.243.94:8000/close-shop/${shopId}/`);
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
    <View style={styles.container}>
      <TouchableOpacity style={styles.createShopButton} onPress={handleCreateShop}>
        <MaterialIcons name="add-circle" size={24} color="#fff" />
        <Text style={styles.createShopText}>Create Shop</Text>
      </TouchableOpacity>

      {shops.length === 0 ? (
        <View style={styles.noShopContainer}>
          <Text style={styles.noShopText}>No shop found. loading...</Text>
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
                    <Text style={styles.actionText}>Pofile Details</Text>
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
    </View>
  );
};

export default MyShop;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    textAlign: 'center',
  },
});
