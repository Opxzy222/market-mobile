import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const FollowedShops = () => {
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
    const fetchFollowedShops = async () => {
      try {
        if (userId) {
          const response = await axios.get(
            `https://172.27.243.94:8000/shops/followed/${userId}/`
          );
          setShops(response.data);
        }
      } catch (error) {
        console.error('Error fetching followed shops:', error);
      }
    };

    fetchFollowedShops();
  }, [userId]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Followed Shops</Text>
        <TouchableOpacity onPress={() => router.push('/shop/AllFollowedShops')}>
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.shopRow}>
        {shops.slice(0, 3).map((shop) => (
          <TouchableOpacity
            key={shop.id}
            style={styles.shopCard}
            onPress={() => {
              router.push({
                pathname: '/shop/shop-page',
                params: { shopId: shop.id },
              });
            }}
          >
            <Image
              source={{ uri: `https://172.27.243.94:8000/${shop.image}` }}
              style={styles.shopImage}
            />
            <Text style={styles.shopName}>{shop.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  seeAll: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: '600',
    //textDecorationLine: 'underline',
  },
  shopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  shopCard: {
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  shopImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginBottom: 5,
  },
  shopName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
});

export default FollowedShops;
