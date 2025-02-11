import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import axios from "axios";
import { useRouter, useLocalSearchParams } from 'expo-router';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from "@react-native-async-storage/async-storage";

const AllFollowedShops = () => {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const params = useLocalSearchParams();
  const { prevRoute } = params;


  useEffect(() => {
    const fetchUserId = async () => {
      const userIdString = await AsyncStorage.getItem("user_id");
      setUserId(parseInt(userIdString, 10));
    };

    const fetchAllFollowedShops = async () => {
      try {
        const response = await axios.get(
          `https://172.27.243.94:8000/shops/followed/${userId}/`
        );
        const sortedShops = response.data.sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        setShops(sortedShops);
      } catch (error) {
        console.error("Error fetching all followed shops:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserId();
    if (userId) {
      fetchAllFollowedShops();
    }
  }, [userId]);

  const renderShopItem = ({ item }) => (
    <TouchableOpacity
      style={styles.shopContainer}
      onPress={() => {
        router.push({
          pathname: '/shop/shop-page',
          params: { shopId: item.id },
        });
      }}
    >
      <Image
        source={{ uri: `https://172.27.243.94:8000/${item.image}` }}
        style={styles.shopImage}
      />
      <Text style={styles.shopName}>{item.name}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace(prevRoute || '((tabs)/shop)')} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#007BFF" />
        </TouchableOpacity>
      </View>
      <Text style={styles.heading}>Shops You Are Following</Text>
      <FlatList
        data={shops}
        renderItem={renderShopItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  heading: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 20,
    textAlign: "center",
  },
  listContainer: {
    paddingBottom: 16,
  },
  shopContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 12,
    marginBottom: 10,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  shopImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: "#f3f4f6",
  },
  shopName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
  },
});

export default AllFollowedShops;
