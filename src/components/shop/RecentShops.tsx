import React, { useState, useEffect } from 'react';
import { View, Text, Image, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import axios from 'axios';
import { useRouter, usePathname } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RecentlyVisitedShops = () => {
  const [shops, setShops] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const pathname = usePathname()

  useEffect(() => {
    const fetchUserId = async () => {
      const userIdString = await AsyncStorage.getItem('user_id');
      setUserId(parseInt(userIdString, 10));
    };
    fetchUserId();
  }, []);

  useEffect(() => {
    const fetchRecentlyVisitedShops = async () => {
      try {
        const response = await axios.get(`https://172.27.243.94:8000/shops/recently-visited/${userId}/`);
        setShops(response.data.recently_visited_shops);
      } catch (error) {
        console.error('Error fetching recently visited shops:', error);
      }
    };

    fetchRecentlyVisitedShops();
  }, [userId]);

  const handleShowMore = () => {
    setShowAll(true);
  };

  const renderShopItem = ({ item }) => (
    <View style={styles.shopCard}>
      <Image
        source={{ uri: `https://172.27.243.94:8000/${item.image}` }}
        style={styles.shopImage}
      />
      <View style={styles.shopInfo}>
        <Text style={styles.shopName}>{item.name}</Text>
        <Text style={styles.visitedAt}>
          Visited on: {new Date(item.visited_at).toLocaleDateString()}
        </Text>
        <TouchableOpacity
          style={styles.shopButton}
          onPress={() =>
            router.push({ pathname: "/shop/shop-page", params: { shopId: item.id } })
          }
        >
          <Text style={styles.buttonText}>Go to Shop</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const shopsToDisplay = showAll ? shops : shops.slice(0, 1);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
              <Text style={styles.title}>Recently Visited</Text>
        <TouchableOpacity style={styles.seeAllContainer}
          onPress={() => router.push({ pathname: '/shop/AllRecentShops', params: { prevRoute: pathname } })}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
      <FlatList
        data={shopsToDisplay}
        renderItem={renderShopItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
      />
      {!showAll && shops.length > 1 && (
        <TouchableOpacity onPress={handleShowMore} style={styles.showMoreButton}>
          <Text style={styles.showMoreText}>Show More</Text>
        </TouchableOpacity>
      )}
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
    fontSize: 26,
    fontWeight: '700',
    color: '#333',
  },
  seeAllContainer: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#eef6fd',
  },
  seeAll: {
    fontSize: 16,
    color: '#007aff',
    fontWeight: '600',
  },
  listContainer: {
    paddingBottom: 16,
  },
  shopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  shopImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
    marginRight: 24,
    borderWidth: 2,
    borderColor: '#eee',
    backgroundColor: '#f8f8f8',
  },
  shopInfo: {
    flex: 1,
    paddingLeft: 8,
  },
  shopName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  visitedAt: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 10,
  },
  shopButton: {
    backgroundColor: '#2196f3',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: 'flex-start',
    shadowColor: '#007bff',
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  showMoreButton: {
  marginTop: -10,
  backgroundColor: '#4CAF50',
  paddingVertical: 14,
  paddingHorizontal: 24,
  borderRadius: 25,
  alignItems: 'center',
  flexDirection: 'row',
  justifyContent: 'center',
  shadowColor: '#4CAF50',
  shadowOpacity: 0.4,
  shadowRadius: 6,
  elevation: 5,
},
showMoreText: {
  color: '#FFFFFF',
  fontSize: 16,
  fontWeight: 'bold',
  letterSpacing: 0.8,
  textTransform: 'uppercase',
},

});

export default RecentlyVisitedShops;
