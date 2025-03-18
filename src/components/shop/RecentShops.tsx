import React, { useState, useEffect } from 'react';
import { View, Text, Image, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import axios from 'axios';
import { useRouter, usePathname } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from "@expo/vector-icons";

const RecentlyVisitedShops = () => {
  const [shops, setShops] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const router = useRouter();
  const [sessionId, setSessionId] = useState(null);
  const pathname = usePathname()

  useEffect(() => {
  const fetchSessionId = async () => {
    const sessionIdString = await AsyncStorage.getItem("sessionToken");
    setSessionId(sessionIdString); // No need to parse as an integer
  };
    fetchSessionId();
  }, []);

  useEffect(() => {
    const fetchRecentlyVisitedShops = async () => {
      try {
        const response = await axios.get("https://127.0.0.1:8000/shops/all-recently-visited/", {
        headers: {
          Authorization: sessionId,
        },
      });
        setShops(response.data.recently_visited_shops);
      } catch (error) {
        console.error('Error fetching recently visited shops:', error);
      }
    };

    fetchRecentlyVisitedShops();
  }, [sessionId]);

  const handleShowMore = () => {
    setShowAll(true);
  };

  const renderShopItem = ({ item }) => (
    <TouchableOpacity
      style={styles.shopCard}
      onPress={() => router.push({ pathname: '/shop/shop-page', params: { shopId: item.id } })}
    >
      <Image source={{ uri: `https://127.0.0.1:8000/${item.image}` }} style={styles.shopImage} />
      <View style={styles.shopInfo}>
        <Text style={styles.shopName}>{item.name}</Text>
        <Text style={styles.visitedAt}>Visited: {new Date(item.visited_at).toLocaleDateString()}</Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#007bff" style={styles.chevronIcon} />
    </TouchableOpacity>
  );

  const shopsToDisplay = showAll ? shops : shops.slice(0, 3);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recently Visited</Text>
        <TouchableOpacity style={styles.seeAllContainer} onPress={() => router.push('/shop/AllRecentShops')}>
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={shopsToDisplay}
        renderItem={renderShopItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
      />
      {!showAll && shops.length > 3 && (
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
  listContainer: {
    paddingBottom: 10,
  },
  shopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    marginBottom: 15,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  shopImage: {
    width: 65,
    height: 65,
    borderRadius: 14,
    backgroundColor: '#f2f2f2',
  },
  shopInfo: {
    flex: 1,
    marginLeft: 15,
  },
  shopName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  visitedAt: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  chevronIcon: {
    marginLeft: 10,
  },
  showMoreButton: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#007bff',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  showMoreText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default RecentlyVisitedShops;
