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
  const [sessionId, setSessionId] = useState(null);
  const params = useLocalSearchParams();
  const { prevRoute } = params;

  useEffect(() => {
    const fetchUserId = async () => {
      const sessionIdString = await AsyncStorage.getItem("sessionToken");
      setSessionId(sessionIdString); // No need to parse as an integer
    };

    fetchUserId();
    console.log(sessionId, 'heya')
  }, []);

  useEffect(() => {
    if (sessionId) {
      console.log(sessionId, 'heya')
      const fetchAllFollowedShops = async () => {
        try {
          const response = await axios.get("https://retail-alvinia-goza-f6a0e4f7.koyeb.app/shops/followed/", {
            headers: {
              Authorization: sessionId,
            },
          });
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

      fetchAllFollowedShops();
    }
  }, [sessionId]);

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
        source={{ uri: `https://retail-alvinia-goza-f6a0e4f7.koyeb.app${item.image}` }}
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
      <View style={styles.wrapper}>
      <FlatList
        data={shops}
        renderItem={renderShopItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 12,
    backdropFilter: "blur(10px)", // Glass effect
  },
  heading: {
    fontSize: 22,
    fontWeight: "bold",
    marginLeft: 75,
    color: "black",
  },
  backButton: {
    borderRadius: 50,
    backgroundColor: "#E0E0E0",
    marginRight: 12,
  },
  wrapper: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 15,
  },
  listContainer: {
    paddingTop: 0,
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
