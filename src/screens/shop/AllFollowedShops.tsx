import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  TextInput,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { getFullUrl } from "../../utils/imageUtils";
import api from '../../api';

const CACHE_KEY = "followedShopsCache";

const AllFollowedShops = () => {
  const [shops, setShops] = useState([]);
  const [filteredShops, setFilteredShops] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState(null);
  const router = useRouter();
  const params = useLocalSearchParams();
  const { prevRoute } = params;

  // Prevent double render flash
  const hasMounted = useRef(false);
  const initialLoadDone = useRef(false);

  const searchInputOpacity = useSharedValue(0);
  const searchInputScale = useSharedValue(0.95);

  useEffect(() => {
    const fetchUserId = async () => {
      const sessionIdString = await AsyncStorage.getItem("sessionToken");
      setSessionId(sessionIdString);
    };
    fetchUserId();
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    const loadData = async () => {
      let data = [];

      // 1. Try cache first
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          data = JSON.parse(cached);
          // Only show cached data on first mount
          if (!hasMounted.current) {
            setShops(data);
            setFilteredShops(data);
            // Prefetch images silently
            data.forEach((shop) => {
              if (shop.image) Image.prefetch(getFullUrl(shop.image));
            });
          }
        }
      } catch (e) {
        console.error("Cache read error:", e);
      }

      // 2. Always fetch fresh data from server
      try {
        const response = await api.get("/shops/followed/", {
          headers: { Authorization: sessionId },
        });

        const sorted = response.data.sort((a: any, b: any) =>
          a.name.localeCompare(b.name)
        );

        // Only update if data actually changed OR it's first load
        if (!hasMounted.current || JSON.stringify(sorted) !== JSON.stringify(data)) {
          setShops(sorted);
          setFilteredShops(sorted);
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(sorted));
        }

        // Prefetch new images
        sorted.forEach((shop: any) => {
          if (shop.image) Image.prefetch(getFullUrl(shop.image));
        });

      } catch (error) {
        console.error("Error fetching shops:", error);
        // If API fails but we have cache → keep showing cache (no flash)
        if (data.length > 0 && shops.length === 0) {
          setShops(data);
          setFilteredShops(data);
        }
      } finally {
        if (!initialLoadDone.current) {
          setLoading(false);
          initialLoadDone.current = true;
        }
        hasMounted.current = true;
      }
    };

    loadData();
  }, [sessionId]);

  // Search animation (only once)
  useEffect(() => {
    if (!loading) {
      searchInputOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
      searchInputScale.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
    }
  }, [loading]);

  // Filter logic
  useEffect(() => {
    if (!searchQuery) {
      setFilteredShops(shops);
      return;
    }
    const filtered = shops.filter((shop: any) =>
      shop.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredShops(filtered);
  }, [searchQuery, shops]);

  const animatedSearchStyle = useAnimatedStyle(() => ({
    opacity: searchInputOpacity.value,
    transform: [{ scale: searchInputScale.value }],
  }));

  const handleClearSearch = () => setSearchQuery("");

  const AnimatedShopItem = ({ item }: { item: any }) => {
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(30);

    useEffect(() => {
      opacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
      translateY.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) });
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    }));

    return (
      <Animated.View style={[styles.shopCardContainer, animatedStyle]}>
        <TouchableOpacity
          style={styles.shopCard}
          onPress={() => router.push({ pathname: "/shop/shop-page", params: { shopId: item.id } })}
          activeOpacity={0.85}
        >
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: getFullUrl(item.image) }}
              style={styles.shopImage}
              resizeMode="cover"
            />
          </View>
          <View style={styles.shopDetails}>
            <Text style={styles.shopName}>{item.name}</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderShopItem = ({ item }: { item: any }) => <AnimatedShopItem item={item} />;

  // Show loader only on very first load
  if (loading && !initialLoadDone.current) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={["#F7FAFC", "#E5E7EB"]} style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.navigate("(tabs)/shop")} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={26} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Favorite Shops</Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#3A7BD5" />
            <Text style={styles.loaderText}>Loading your favorite space...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor="#3A7BD5" />
      <LinearGradient colors={["#F7FAFC", "#E5E7EB"]} style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.navigate("/(tabs)/shop")} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Favorite Space</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.wrapper}>
          <Animated.View style={[styles.searchContainer, animatedSearchStyle]}>
            <MaterialIcons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search space"
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={handleClearSearch} style={styles.clearButton}>
                <MaterialIcons name="clear" size={20} color="#6B7280" />
              </TouchableOpacity>
            )}
          </Animated.View>

          {filteredShops.length === 0 ? (
            <Text style={styles.noDataText}>
              {searchQuery ? "No space match your search." : "No favorite space yet."}
            </Text>
          ) : (
            <FlatList
              data={filteredShops}
              renderItem={renderShopItem}
              keyExtractor={(item: any) => item.id.toString()}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={21}
            />
          )}
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

// Styles unchanged (same as yours)
const styles = StyleSheet.create({
  container: { flex: 1 },
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
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
    flex: 1,
  },
  headerSpacer: { width: 42 },
  wrapper: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 12,
    marginBottom: 20,
    height: 48,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, color: "#1F2937", height: "100%" },
  clearButton: { padding: 4 },
  listContainer: { paddingBottom: 24 },
  shopCardContainer: { marginBottom: 20 },
  shopCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
    borderLeftWidth: 4,
    borderColor: "#3A7BD5",
  },
  imageContainer: { position: "relative" },
  shopImage: { width: 90, height: 90, borderRadius: 45, marginRight: 20, backgroundColor: "#E5E7EB" },
  shopDetails: { flex: 1 },
  shopName: { fontSize: 20, fontWeight: "700", color: "#1F2937", lineHeight: 28 },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F7FAFC" },
  loaderText: { marginTop: 12, fontSize: 18, color: "#3A7BD5", fontWeight: "600" },
  noDataText: {
    fontSize: 20,
    color: "#1F2937",
    textAlign: "center",
    marginTop: 48,
    fontWeight: "600",
    lineHeight: 28,
  },
});

export default AllFollowedShops;