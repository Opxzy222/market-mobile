import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';

const MyShop = () => {
  const [shops, setShops] = useState([]);
  const [userId, setUserId] = useState(null);
  const router = useRouter();

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
    const confirmClose = window.confirm('Are you sure you want to close this shop?');
    if (confirmClose) {
      try {
        console.log('Close Shop Request Triggered for Shop ID:', shopId);
        const response = await axios.delete(`https://172.27.243.94:8000/close-shop/${shopId}/`);
        console.log('Response:', response.data);
        setShops(shops.filter(shop => shop.id !== shopId));
      } catch (error) {
        console.error('Error closing shop:', error.response?.data || error.message);
        alert('Failed to close the shop. Please try again.');
      }
    }
  };

  const handleCreateShop = async () => {
    if (shops.length > 0) {
      Alert.alert('Error', 'You cannot create a new shop while your current shop is active.');
      return;
    }
    router.push('/shop/CreateShop');
  };

  const handleManageShopPage = (shopId) => {
    router.push({pathname: 'shop/ShopProduct', params: { shopId: shopId }, });
  };

  const handleShopClick = (shopId) => {
    
    router.push({pathname: '/shop/AdminShopPage', params: { shopId: shopId }, });
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.createShopButton} onPress={handleCreateShop}>
        <MaterialIcons name="add-circle" size={24} color="#fff" />
        <Text style={styles.createShopText}>Create Shop</Text>
      </TouchableOpacity>
      <FlatList
        data={shops}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.shopCard}>
            <Text style={styles.shopName}>{item.name}</Text>
            <Text style={styles.shopDetails}>Products Available: {item.product_count}</Text>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => handleShopClick(item.id)}>
                <MaterialIcons name="store" size={24} color="#007bff" />
                <Text style={styles.actionText}>Shop Page</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleManageShopPage(item.id)}>
                <MaterialIcons name="edit" size={24} color="#ffa500" />
                <Text style={styles.actionText}>Shop Product</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleShopClick(item.id)}>
                <MaterialIcons name="close" size={24} color="#f44336" />
                <Text style={styles.actionText}>Close Shop</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
};

export default MyShop;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    padding: 16,
  },
  createShopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4caf50',
    paddingVertical: 12,
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
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  shopName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  shopDetails: {
    fontSize: 14,
    color: '#666',
    marginVertical: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  actionText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});