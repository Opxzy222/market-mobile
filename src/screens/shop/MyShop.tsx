import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import axios from "axios";
import { useRouter, usePathname, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

const CACHE_KEY = "MyShop_Cache";

const MyShop = () => {
  const [shops, setShops] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [error, setError] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Load cached data and session ID
  const loadCachedData = useCallback(async () => {
    try {
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      if (cachedData) {
        const data = JSON.parse(cachedData);
        setShops(data || []);
        console.log("Loaded cached shops data");
      }
    } catch (error) {
      console.error("Error loading cached data:", error);
    }

    try {
      const sessionIdString = await AsyncStorage.getItem("sessionToken");
      console.log("Fetched sessionToken:", sessionIdString);
      setSessionId(sessionIdString);
      if (!sessionIdString) {
        Alert.alert("Error", "No session token found. Please log in.");
        router.push("/login");
      }
    } catch (error) {
      console.error("Error fetching session token:", error);
      Alert.alert("Error", "Failed to load session.");
    }
  }, [router]);

  // Save response to cache
  const saveToCache = useCallback(async (data) => {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
      console.log("Cached shops data saved");
    } catch (error) {
      console.error("Error saving to cache:", error);
    }
  }, []);

  // Fetch shop data from backend
  const fetchShops = useCallback(async () => {
    if (!sessionId) {
      console.log("No sessionId, skipping fetchShops");
      return;
    }

    setLoading(true);
    setError(false);
    try {
      const response = await axios.post(
        "https://retail-alvinia-goza-f6a0e4f7.koyeb.app/shops-product-count/",
        {},
        {
          headers: {
            Authorization: sessionId,
            "Content-Type": "application/json",
          },
        }
      );
      console.log("Fetched shops:", response.data);
      setShops(response.data);
      setHasFetched(true);
      saveToCache(response.data); // Cache the response
    } catch (error) {
      console.error("Error fetching shops:", error);
      setError(true);
      Alert.alert("Error", "Failed to load shops. Using cached data if available.");
    } finally {
      setLoading(false);
    }
  }, [sessionId, saveToCache]);

  // Load cache and fetch data on screen focus
  useFocusEffect(
    useCallback(() => {
      console.log("Screen focused, loading data");
      loadCachedData().then(() => {
        if (sessionId) {
          fetchShops(); // Always fetch fresh data
        }
      });
    }, [loadCachedData, fetchShops, sessionId])
  );

  // Handle reload button press
  const handleReload = () => {
    console.log("Reload button pressed");
    loadCachedData().then(fetchShops);
  };

  const handleCloseShop = async (shopId) => {
    Alert.alert("Confirm", "Are you sure you want to close this space?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Close Space",
        onPress: async () => {
          try {
            await axios.delete(
              `https://retail-alvinia-goza-f6a0e4f7.koyeb.app/close-shop/${shopId}/`
            );
            setShops((prev) => prev.filter((shop) => shop.id !== shopId));
            saveToCache(shops.filter((shop) => shop.id !== shopId)); // Update cache
            Alert.alert("Success", "Space closed successfully.");
          } catch (error) {
            console.error("Error closing shop:", error);
            Alert.alert("Error", "Failed to close space.");
          }
        },
      },
    ]);
  };

  const handleCreateShop = async () => {
    if (shops.length > 0) {
      Alert.alert("Error", "You cannot create a new space while your current space is active.");
      return;
    }
    console.log("Navigating to CreateShop");
    try {
      router.push("shop/CreateShop");
    } catch (error) {
      console.error("Navigation error to CreateShop:", error);
      Alert.alert("Error", "Failed to navigate to Create Space.");
    }
  };

  const navigateToShopPage = (shopId) => {
    console.log("Navigating to AdminShopPage, shopId:", shopId, "prevRoute:", pathname);
    try {
      router.push({
        pathname: "shop/AdminShopPage",
        params: { shopId, prevRoute: pathname },
      });
    } catch (error) {
      console.error("Navigation error to AdminShopPage:", error);
      Alert.alert("Error", "Failed to navigate to Space.");
    }
  };

  const navigateToShopProduct = (shopId, category) => {
    console.log("Navigating to ShopProduct, shopId:", shopId, "category:", category, "prevRoute:", pathname);
    try {
      router.push({
        pathname: "shop/ShopProduct",
        params: { shopId, category, prevRoute: pathname },
      });
    } catch (error) {
      console.error("Navigation error to ShopProduct:", error);
      Alert.alert("Error", "Failed to navigate to Products/Services.");
    }
  };

  const navigateToShopStatus = (shopId) => {
    console.log("Navigating to ShopStatus, shopId:", shopId, "prevRoute:", pathname);
    try {
      router.push({
        pathname: "shop/ShopStatus",
        params: { shopId, prevRoute: pathname },
      });
    } catch (error) {
      console.error("Navigation error to ShopStatus:", error);
      Alert.alert("Error", "Failed to navigate to Status Updates.");
    }
  };

  const navigateToReceiptActions = (shopId) => {
    console.log("Navigating to ReceiptActions, shopId:", shopId, "prevRoute:", pathname);
    try {
      router.push({
        pathname: "shop/ReceiptActions",
        params: { shopId, prevRoute: pathname },
      });
    } catch (error) {
      console.error("Navigation error to ReceiptActions:", error);
      Alert.alert("Error", "Failed to navigate to Receipt.");
    }
  };

  const navigateToDetails = (shopId) => {
    console.log("Navigating to Details, shopId:", shopId, "prevRoute:", pathname);
    try {
      router.push({
        pathname: "shop/Details",
        params: { shopId, prevRoute: pathname },
      });
    } catch (error) {
      console.error("Navigation error to Details:", error);
      Alert.alert("Error", "Failed to navigate to Details.");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
      <LinearGradient colors={["#E3F2FD", "#BBDEFB"]} style={styles.container}>
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007bff" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        )}

        {!loading && error && shops.length === 0 && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Failed to load shops due to a network issue.</Text>
            <TouchableOpacity style={styles.reloadButton} onPress={handleReload}>
              <MaterialIcons name="refresh" size={24} color="#fff" />
              <Text style={styles.reloadText}>Reload</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && hasFetched && shops.length === 0 && (
          <TouchableOpacity style={styles.createShopButton} onPress={handleCreateShop}>
            <MaterialIcons name="add-circle" size={24} color="#fff" />
            <Text style={styles.createShopText}>Create Shop</Text>
          </TouchableOpacity>
        )}

        {!loading && shops.length === 0 && hasFetched && (
          <View style={styles.noShopContainer}>
            <Text style={styles.noShopText}>No space found. Create a new space to get started.</Text>
          </View>
        )}

        {(shops.length > 0 || (!loading && !hasFetched)) && (
          <FlatList
            data={shops}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => {
              const isService = item.category?.toLowerCase() === "services";

              return (
                <View style={styles.shopCard}>
                  <Text style={styles.shopName}>{item.name}</Text>
                  <Text style={styles.shopDetails}>
                    {isService ? "Services Available" : "Products Available"}: {item.product_count}
                  </Text>
                  <View style={styles.actionsContainer}>
                    <View style={styles.actions}>
                      <TouchableOpacity
                        onPress={() => navigateToShopPage(item.id)}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons name="store" size={28} color="#007bff" />
                        <Text style={styles.actionText}>Admin Page</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => navigateToShopProduct(item.id, item.category)}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons
                          name={isService ? "home-repair-service" : "shopping-cart"}
                          size={28}
                          color="#ffa500"
                        />
                        <Text style={styles.actionText}>{isService ? "Services" : "Products"}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => navigateToShopStatus(item.id)}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons name="update" size={28} color="#9c27b0" />
                        <Text style={styles.actionText}>Status Updates</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.actions}>
                      <TouchableOpacity
                        onPress={() => navigateToReceiptActions(item.id)}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons name="receipt" size={28} color="#795548" />
                        <Text style={styles.actionText}>Receipt</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => navigateToDetails(item.id)}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons name="info" size={28} color="#4caf50" />
                        <Text style={styles.actionText}>Details</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleCloseShop(item.id)}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons name="close" size={28} color="#f44336" />
                        <Text style={styles.actionText}>Quit Space</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            }}
            contentContainerStyle={styles.flatListContainer}
          />
        )}
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#333",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#f44336",
    marginBottom: 20,
    textAlign: "center",
  },
  reloadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#007bff",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  reloadText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  createShopButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4caf50",
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 16,
  },
  createShopText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  noShopContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noShopText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  shopCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 5,
  },
  shopName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  shopDetails: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
  },
  actionsContainer: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: "#ddd",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 10,
  },
  actionText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  flatListContainer: {
    paddingBottom: 20,
  },
});

export default MyShop;