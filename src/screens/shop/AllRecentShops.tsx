import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator, StatusBar
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams } from "expo-router";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInUp } from "react-native-reanimated";

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
      setSessionId(sessionIdString);
    };

    fetchUserId();
  }, []);

  useEffect(() => {
    if (sessionId) {
      const fetchRecentlyVisitedShops = async () => {
        try {
          const response = await axios.get("https://retail-alvinia-goza-f6a0e4f7.koyeb.app/shops/all-recently-visited/", {
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

      fetchRecentlyVisitedShops();
    }
  }, [sessionId]);

  const renderShopCard = ({ item }) => (
    <Animated.View entering={FadeInUp}>
      <View style={styles.shopCard}>
        <View style={styles.shopHeader}>
          {item.image ? (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: `https://retail-alvinia-goza-f6a0e4f7.koyeb.app${item.image}` }}
                style={styles.shopImage}
              />
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.3)"]}
                style={styles.imageGradient}
              />
            </View>
          ) : (
            <View style={[styles.shopImage, styles.placeholderImage]}>
              <MaterialIcons name="store" size={40} color="#999" />
            </View>
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
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={["#007BFF", "#005BB5"]}
              style={styles.buttonGradient}
            >
              <MaterialIcons name="message" size={20} color="#fff" />
              <Text style={styles.buttonText}>Message</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.whatsappButton}
            onPress={() =>
              router.push({ pathname: "/shop/shop-page", params: { shopId: item.id } })
            }
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={["#28A745", "#1A7F33"]}
              style={styles.buttonGradient}
            >
              <MaterialIcons name="storefront" size={20} color="#fff" />
              <Text style={styles.buttonText}>Visit Shop</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor='#2563EB' />
      <LinearGradient
        colors={["#F7FAFC", "#E3F2FD"]}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.replace(prevRoute || "/(tabs)/shop")}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Recently Visited</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.wrapper}>
          {loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#3A7BD5" />
              <Text style={styles.loaderText}>Loading shops...</Text>
            </View>
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
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: "#3A7BD5",
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  backButton: {
    padding: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
    flex: 1,
  },
  headerSpacer: {
    width: 42,
  },
  wrapper: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  listContainer: {
    paddingBottom: 20,
  },
  noDataText: {
    fontSize: 18,
    color: "#1F2937",
    textAlign: "center",
    marginTop: 40,
    fontWeight: "600",
  },
  shopCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    marginBottom: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  shopHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  imageContainer: {
    position: "relative",
  },
  shopImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 16,
  },
  placeholderImage: {
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  imageGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
  },
  shopInfo: {
    flex: 1,
  },
  shopName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  shopAddress: {
    fontSize: 14,
    color: "#4B5563",
    marginTop: 4,
  },
  visitedAt: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  shopDescription: {
    fontSize: 14,
    color: "#4B5563",
    marginVertical: 12,
    lineHeight: 22,
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  messageButton: {
    borderRadius: 10,
    overflow: "hidden",
  },
  whatsappButton: {
    borderRadius: 10,
    overflow: "hidden",
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F7FAFC",
  },
  loaderText: {
    marginTop: 10,
    fontSize: 16,
    color: "#3A7BD5",
    fontWeight: "600",
  },
});

export default AllRecentlyVisitedShops;