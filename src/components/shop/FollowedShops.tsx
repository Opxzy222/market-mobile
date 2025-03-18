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
import { useRouter, usePathname } from 'expo-router';

const FollowedShops = () => {
  const [shops, setShops] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
  const fetchSessionId = async () => {
    const sessionIdString = await AsyncStorage.getItem("sessionToken");
    setSessionId(sessionIdString); // No need to parse as an integer
  };
    fetchSessionId();
  }, []);

  useEffect(() => {
    const fetchFollowedShops = async () => {
      try {
        if (sessionId) {
          const response = await axios.get("https://127.0.0.1:8000/shops/followed/", {
            headers: {
              Authorization: sessionId,
        },
      });
          setShops(response.data);
        }
      } catch (error) {
        console.error('Error fetching followed shops:', error);
      }
    };

    fetchFollowedShops();
  }, [sessionId]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Followed Shops</Text>
        <TouchableOpacity 
          style={styles.seeAllContainer}
          onPress={() => router.push({ pathname: '/shop/AllFollowedShops', params: { prevRoute: pathname } })}
        >
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.shopRow}>
        {shops.slice(0, 3).map((shop) => (
          <TouchableOpacity
            key={shop.id}
            style={styles.shopCard}
            activeOpacity={0.8}
            onPress={() => {
              router.push({
                pathname: '/shop/shop-page',
                params: { shopId: shop.id },
              });
            }}
          >
            <Image
              source={{ uri: `https://127.0.0.1:8000/${shop.image}` }}
              style={styles.shopImage}
            />
            <Text style={styles.shopName} numberOfLines={1}>
              {shop.name}
            </Text>
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
    marginBottom: 15,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#333',
  },
  seeAllContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(30, 144, 255, 0.15)',
  },
  seeAll: {
    fontSize: 16,
    color: '#1E40AF',
    fontWeight: 'bold',
  },
  shopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  shopCard: {
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
    backgroundColor: '#fefefe',
    borderRadius: 16,
    padding: 15,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  shopImage: {
    width: 80,
    height: 80,
    borderRadius: 20,
    marginBottom: 10,
  },
  shopName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
});

export default FollowedShops;
