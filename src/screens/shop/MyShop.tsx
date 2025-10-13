import React, { useState, useCallback, useEffect, useRef, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
  AppState,
} from "react-native";
import api from '../../api';
import { useRouter, usePathname, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigationInterstitialAd } from "../../components/AdMobManager";
import { SubscriptionContext } from "../../components/SubscriptionProvider";

const CACHE_KEY = "MyShop_Cache";
const NAVIGATION_THRESHOLD = 3;
const SESSION_CHECK_INTERVAL = 1000; // Check session every 1s
const FETCH_DEBOUNCE_MS = 10000; // Debounce fetch by 10s

const MyShop = () => {
  const { subscriptionStatus, loading: subscriptionLoading } = useContext(SubscriptionContext);
  const { showInterstitial, adLoaded } = useNavigationInterstitialAd();
  const [shops, setShops] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const [error, setError] = useState(false);
  const [showAd, setShowAd] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const isMountedRef = useRef(true);
  const isShowingAdRef = useRef(false);
  const lastAdCheckTimeRef = useRef(0);
  const lastFocusTimeRef = useRef(0);
  const lastFetchTimeRef = useRef(0);
  const appStateRef = useRef(AppState.currentState);
  const lastRouteRef = useRef(pathname);
  const lastSessionIdRef = useRef(null);

  // Clear cache for new session
  const clearCache = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
      console.log("Cache cleared");
      setShops([]);
      setHasFetched(false);
    } catch (error) {
      console.error("Error clearing cache:", error);
    }
  }, []);

  // Check session changes
  const checkSession = useCallback(async () => {
    try {
      const newSessionId = await AsyncStorage.getItem("sessionToken");
      if (newSessionId !== lastSessionIdRef.current) {
        console.log("Session changed: old=", lastSessionIdRef.current, "new=", newSessionId);
        lastSessionIdRef.current = newSessionId;
        setSessionId(newSessionId);
        if (newSessionId) {
          await clearCache();
          setLoading(true);
          await fetchShops(newSessionId);
        } else {
          setShops([]);
          setLoading(false);
          router.push("/login");
        }
      }
    } catch (error) {
      console.error("Error checking session:", error);
      setError(true);
      setLoading(false);
    }
  }, [clearCache, router]);

  // Load cached data
  const loadCachedData = useCallback(async () => {
    try {
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      if (cachedData) {
        const data = JSON.parse(cachedData);
        setShops(data || []);
        console.log("Loaded cached shops data");
        setLoading(false);
      } else {
        console.log("No cached data found");
        setLoading(true); // Trigger fetch if no cache
      }
    } catch (error) {
      console.error("Error loading cached data:", error);
      setError(true);
      setLoading(false);
    }
  }, []);

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
  const fetchShops = useCallback(
    async (currentSessionId = sessionId) => {
      if (!currentSessionId) {
        console.log("No sessionId, skipping fetchShops");
        setLoading(false);
        return;
      }

      const now = Date.now();
      if (now - lastFetchTimeRef.current < FETCH_DEBOUNCE_MS) {
        console.log("Fetch debounced: too soon since last fetch");
        setLoading(false);
        return;
      }
      lastFetchTimeRef.current = now;

      try {
        const response = await api.post(
          "/shops-product-count/",
          {},
          {
            headers: {
              Authorization: currentSessionId,
              "Content-Type": "application/json",
            },
          }
        );
        console.log("Fetched shops:", response.data);
        setShops(response.data);
        setHasFetched(true);
        saveToCache(response.data);
        setError(false);
      } catch (error) {
        console.error("Error fetching shops:", error);
        setError(true);
        Alert.alert("Error", "Failed to load shops. Using cached data if available.");
      } finally {
        setLoading(false);
      }
    },
    [sessionId, saveToCache]
  );

  // Increment navigation count
  const incrementNavigationCount = useCallback(async () => {
    try {
      const count = parseInt(await AsyncStorage.getItem("navigationCount") || "0", 10) + 1;
      await AsyncStorage.setItem("navigationCount", count.toString());
      console.log("Navigation count incremented:", count);
      return count;
    } catch (error) {
      console.error("Error updating navigation count:", error);
      return 0;
    }
  }, []);

  // Check ad display
  const checkAd = useCallback(async () => {
    const now = Date.now();
    if (now - lastAdCheckTimeRef.current < 2000) {
      console.log("Ad check debounced: too soon since last check");
      return;
    }
    lastAdCheckTimeRef.current = now;

    if (subscriptionLoading || !isMountedRef.current || isShowingAdRef.current) {
      console.log(
        "Ad check skipped: subscriptionLoading=",
        subscriptionLoading,
        "isMounted=",
        isMountedRef.current,
        "isShowingAd=",
        isShowingAdRef.current
      );
      return;
    }

    const isFreeOrRegularUser =
      !["standard", "premium"].includes(subscriptionStatus) ||
      subscriptionStatus === "free" ||
      subscriptionStatus == null;

    if (isFreeOrRegularUser && adLoaded) {
      const count = parseInt(await AsyncStorage.getItem("navigationCount") || "0", 10);
      console.log("Current navigationCount:", count, "adLoaded:", adLoaded);
      if (count >= NAVIGATION_THRESHOLD) {
        console.log("Triggering interstitial ad display");
        isShowingAdRef.current = true;
        setShowAd(true);
        try {
          await showInterstitial();
          console.log("Interstitial ad displayed");
          await AsyncStorage.setItem("navigationCount", "0");
          console.log("navigationCount reset to 0");
        } catch (error) {
          console.error("Error displaying interstitial ad:", error);
        } finally {
          setShowAd(false);
          isShowingAdRef.current = false;
        }
      }
    }
  }, [subscriptionStatus, subscriptionLoading, adLoaded, showInterstitial]);

  // Initial load and session check
  useEffect(() => {
    isMountedRef.current = true;
    const initialize = async () => {
      await checkSession();
      await loadCachedData();
      if (sessionId) {
        await fetchShops(sessionId);
      }
    };
    initialize();

    // Periodic session check
    const sessionCheckInterval = setInterval(checkSession, SESSION_CHECK_INTERVAL);

    return () => {
      isMountedRef.current = false;
      clearInterval(sessionCheckInterval);
      console.log("MyShop unmounted");
    };
  }, [checkSession, loadCachedData, fetchShops, sessionId]);

  // Handle focus with debouncing and route check
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastFocusTimeRef.current < 2000) {
        console.log("Focus debounced: too soon since last focus");
        return;
      }
      lastFocusTimeRef.current = now;

      console.log("MyShop focused, subscriptionStatus:", subscriptionStatus, "appState:", appStateRef.current);
      checkSession().then(() => {
        if (sessionId) {
          fetchShops(); // Fetch fresh data in background
        }
      });

      // Only increment navigationCount on route change
      if (lastRouteRef.current !== pathname && appStateRef.current === "active") {
        console.log("MyShop focused via navigation, prevRoute:", lastRouteRef.current, "currentRoute:", pathname);
        lastRouteRef.current = pathname;
        incrementNavigationCount().then((count) => {
          console.log("Navigation count after focus:", count);
          if (count >= NAVIGATION_THRESHOLD) {
            checkAd();
          }
        });
      } else {
        console.log("MyShop focused without route change, appState:", appStateRef.current);
      }

      return () => {
        console.log("MyShop unfocused");
      };
    }, [checkSession, fetchShops, sessionId, incrementNavigationCount, checkAd, subscriptionStatus, pathname])
  );

  // Track AppState changes
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      console.log("AppState changed:", nextAppState);
      appStateRef.current = nextAppState;
      if (nextAppState === "active") {
        checkSession();
      }
    });
    return () => {
      subscription.remove();
      console.log("AppState listener removed");
    };
  }, [checkSession]);

  // Handle reload button press
  const handleReload = useCallback(() => {
    console.log("Reload button pressed");
    setLoading(true);
    checkSession().then(() => {
      if (sessionId) {
        fetchShops();
      }
    });
  }, [checkSession, fetchShops, sessionId]);

  const handleCloseShop = useCallback(
    async (shopId) => {
      Alert.alert("Confirm", "Are you sure you want to close this space?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Close Space",
          onPress: async () => {
            try {
              await api.delete(
                `/close-shop/${shopId}/`,
                {
                  headers: { Authorization: sessionId },
                }
              );
              setShops((prev) => prev.filter((shop) => shop.id !== shopId));
              saveToCache(shops.filter((shop) => shop.id !== shopId));
              Alert.alert("Success", "Space closed successfully.");
            } catch (error) {
              console.error("Error closing shop:", error);
              Alert.alert("Error", "Failed to close space.");
            }
          },
        },
      ]);
    },
    [saveToCache, shops, sessionId]
  );

  const handleCreateShop = useCallback(async () => {
    if (shops.length > 0) {
      Alert.alert("Error", "You cannot create a new space while your current space is active.");
      return;
    }
    console.log("Navigating to CreateShop");
    try {
      const count = await incrementNavigationCount();
      router.push("shop/CreateShop");
      if (count >= NAVIGATION_THRESHOLD) {
        await checkAd();
      }
    } catch (error) {
      console.error("Navigation error to CreateShop:", error);
      Alert.alert("Error", "Failed to navigate to Create Space.");
    }
  }, [shops, router, incrementNavigationCount, checkAd]);

  const navigateToShopPage = useCallback(
    async (shopId) => {
      console.log("Navigating to AdminShopPage, shopId:", shopId);
      try {
        const count = await incrementNavigationCount();
        router.push({
          pathname: "shop/AdminShopPage",
          params: { shopId, prevRoute: pathname },
        });
        if (count >= NAVIGATION_THRESHOLD) {
          await checkAd();
        }
      } catch (error) {
        console.error("Navigation error to AdminShopPage:", error);
        Alert.alert("Error", "Failed to navigate to Space.");
      }
    },
    [pathname, router, incrementNavigationCount, checkAd]
  );

  const navigateToShopProduct = useCallback(
    async (shopId, category) => {
      console.log("Navigating to ShopProduct, shopId:", shopId, "category:", category);
      try {
        const count = await incrementNavigationCount();
        router.push({
          pathname: "shop/ShopProduct",
          params: { shopId, category, prevRoute: pathname },
        });
        if (count >= NAVIGATION_THRESHOLD) {
          await checkAd();
        }
      } catch (error) {
        console.error("Navigation error to ShopProduct:", error);
        Alert.alert("Error", "Failed to navigate to Products/Services.");
      }
    },
    [pathname, router, incrementNavigationCount, checkAd]
  );

  const navigateToShopStatus = useCallback(
    async (shopId) => {
      console.log("Navigating to ShopStatus, shopId:", shopId);
      try {
        const count = await incrementNavigationCount();
        router.push({
          pathname: "shop/ShopStatus",
          params: { shopId, prevRoute: pathname },
        });
        if (count >= NAVIGATION_THRESHOLD) {
          await checkAd();
        }
      } catch (error) {
        console.error("Navigation error to ShopStatus:", error);
        Alert.alert("Error", "Failed to navigate to Status Updates.");
      }
    },
    [pathname, router, incrementNavigationCount, checkAd]
  );

  const navigateToReceiptActions = useCallback(
    async (shopId) => {
      console.log("Navigating to ReceiptActions, shopId:", shopId);
      try {
        const count = await incrementNavigationCount();
        router.push({
          pathname: "shop/ReceiptActions",
          params: { shopId, prevRoute: pathname },
        });
        if (count >= NAVIGATION_THRESHOLD) {
          await checkAd();
        }
      } catch (error) {
        console.error("Navigation error to ReceiptActions:", error);
        Alert.alert("Error", "Failed to navigate to Receipt.");
      }
    },
    [pathname, router, incrementNavigationCount, checkAd]
  );

  const navigateToDetails = useCallback(
    async (shopId) => {
      console.log("Navigating to Details, shopId:", shopId);
      try {
        const count = await incrementNavigationCount();
        router.push({
          pathname: "shop/Details",
          params: { shopId, prevRoute: pathname },
        });
        if (count >= NAVIGATION_THRESHOLD) {
          await checkAd();
        }
      } catch (error) {
        console.error("Navigation error to Details:", error);
        Alert.alert("Error", "Failed to navigate to Details.");
      }
    },
    [pathname, router, incrementNavigationCount, checkAd]
  );

  if (showAd || (loading && shops.length === 0 && !hasFetched)) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>
            {showAd ? "Loading Ad..." : "Loading your space..."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
      <LinearGradient colors={["#E3F2FD", "#BBDEFB"]} style={styles.container}>
        {error && shops.length === 0 && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Failed to load shops due to a network issue.</Text>
            <TouchableOpacity style={styles.reloadButton} onPress={handleReload}>
              <MaterialIcons name="refresh" size={24} color="#fff" />
              <Text style={styles.reloadText}>Reload</Text>
            </TouchableOpacity>
          </View>
        )}

        {!error && hasFetched && shops.length === 0 && (
          <TouchableOpacity style={styles.createShopButton} onPress={handleCreateShop}>
            <MaterialIcons name="add-circle" size={24} color="#fff" />
            <Text style={styles.createShopText}>Create Business Space</Text>
          </TouchableOpacity>
        )}

        {hasFetched && shops.length === 0 && (
          <View style={styles.noShopContainer}>
            <Text style={styles.noShopText}>No space found. Create a new business space to get started.</Text>
          </View>
        )}

        {shops.length > 0 && (
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
                        <MaterialIcons name="store" size= {28} color="#007bff" />
                        <Text style={styles.actionText}>Admin</Text>
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
                        <Text style={styles.actionText}>Stories</Text>
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