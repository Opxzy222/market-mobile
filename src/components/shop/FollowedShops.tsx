import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from "@expo/vector-icons";

const FollowedShops = ({ shops }) => {
  const [sessionId, setSessionId] = useState(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const fetchSessionId = async () => {
      const sessionIdString = await AsyncStorage.getItem("sessionToken");
      setSessionId(sessionIdString);
    };
    fetchSessionId();
  }, []);

  
  const renderShopItem = ({ item }) => (
    <TouchableOpacity
      style={styles.shopCard}
      onPress={() => router.push({ pathname: '/shop/shop-page', params: { shopId: item.id } })}
    >
      <Image source={{ uri: `https://retail-alvinia-goza-f6a0e4f7.koyeb.app${item.image}` }} style={styles.shopImage} />
      <View style={styles.shopInfo}>
        <Text style={styles.shopName}>{item.name}</Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#007bff" style={styles.chevronIcon} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Followed Space</Text>
        <TouchableOpacity 
          style={styles.seeAllContainer}
          onPress={() => router.push({ pathname: '/shop/AllFollowedShops', params: { prevRoute: pathname } })}
        >
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={shops}
        renderItem={renderShopItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
      />
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
  chevronIcon: {
    marginLeft: 10,
  },
});

export default FollowedShops;
