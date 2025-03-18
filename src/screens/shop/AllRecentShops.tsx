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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams } from "expo-router";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

const AllRecentlyVisitedShops = () => {
  const [shops, setShops] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useLocalSearchParams();
  const { prevRoute } = params;

  useEffect(() => {
  const fetchUserId = async () => {
    const sessionIdString = await AsyncStorage.getItem("sessionToken");
    setSessionId(sessionIdString); // No need to parse as an integer
  };

    const fetchRecentlyVisitedShops = async () => {
      try {
        const response = await axios.get("https://127.0.0.1:8000/shops/all-recently-visited/", {
          headers: {
          Authorization: sessionId,
        },
      });
        setShops(response.data.recently_visited_shops);
      } catch (error) {
        console.error("Error fetching recently visited shops:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserId();
    if (sessionId) {
      fetchRecentlyVisitedShops();
    }
  }, [sessionId]);

  const renderShopCard = ({ item }) => (
    <View style={styles.shopCard}>
      <View style={styles.shopHeader}>
        {item.image && (
          <Image
            source={{ uri: `https://127.0.0.1:8000/${item.image}` }}
            style={styles.shopImage}
          />
        )}
        <View style={styles.shopInfo}>
          <Text style={styles.shopName}>{item.name}</Text>
          <Text style={styles.shopAddress}>{item.address}</Text>
          <Text style={styles.visitedAt}>
            Visited: {new Date(item.visited_at).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <Text style={styles.shopDescription}>{item.description}</Text>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={styles.messageButton}
          onPress={() => console.log(`Message ${item.name}`)}
        >
          <MaterialIcons name="message" size={18} color="#fff" />
          <Text style={styles.buttonText}>Message</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.whatsappButton}
          onPress={() =>
            router.push({ pathname: "/shop/shop-page", params: { shopId: item.id } })
          }
        >
          <MaterialIcons name="storefront" size={18} color="#fff" />
          <Text style={styles.buttonText}>Visit Shop</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace(prevRoute || '((tabs)/shop)')} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={26} color="#007BFF" />
        </TouchableOpacity>
        <Text style={styles.heading}>Recently Visited Shops</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#007BFF" style={{ marginTop: 20 }} />
      ) : shops.length === 0 ? (
        <Text style={styles.noDataText}>No recently visited shops yet.</Text>
      ) : (
        <FlatList
          data={shops}
          renderItem={renderShopCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F9",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 10,
  },
  backButton: {
    marginRight: 10,
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
  },
  listContainer: {
    paddingBottom: 20,
  },
  noDataText: {
    fontSize: 16,
    color: "#888",
    textAlign: "center",
    marginTop: 20,
  },
  shopCard: {
    backgroundColor: "#FFF",
    borderRadius: 15,
    marginBottom: 20,
    padding: 15,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  shopHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  shopImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
    marginRight: 15,
  },
  shopInfo: {
    flex: 1,
  },
  shopName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  shopAddress: {
    fontSize: 14,
    color: "#666",
    marginTop: 3,
  },
  visitedAt: {
    fontSize: 12,
    color: "#999",
    marginTop: 3,
  },
  shopDescription: {
    fontSize: 14,
    color: "#555",
    marginVertical: 10,
    lineHeight: 20,
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  messageButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007BFF",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  whatsappButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#28A745",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 5,
  },
});

export default AllRecentlyVisitedShops;
