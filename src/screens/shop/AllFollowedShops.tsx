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
      style={styles.shopCard}
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
      <View style={styles.shopDetails}>
        <Text style={styles.shopName}>{item.name}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace(prevRoute || '((tabs)/shop)')} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={26} color="#2563EB" />
        </TouchableOpacity>
        <Text style={styles.heading}>Followed Shops</Text>
      </View>
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
    backgroundColor: "#FFFFFF",
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 16,
    elevation: 2,
  },
  backButton: {
    marginRight: 12,
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
    textAlign: "center",
  },
  listContainer: {
    paddingTop: 16,
  },
  shopCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 18,
    marginBottom: 12,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  shopImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 16,
    backgroundColor: "#F3F4F6",
  },
  shopDetails: {
    flex: 1,
  },
  shopName: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
});

export default AllFollowedShops;
