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

const CACHE_KEY = "followedShopsCache";

const AllFollowedShops = () => {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState(null);
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
      const loadCachedData = async () => {
        try {
          const cachedData = await AsyncStorage.getItem(CACHE_KEY);
          if (cachedData) {
            const parsedData = JSON.parse(cachedData);
            setShops(parsedData);
            setLoading(false); // Display cached data immediately
          }
        } catch (error) {
          console.error("Error loading cached shops:", error);
        }
      };

      const fetchAllFollowedShops = async () => {
        try {
          const response = await axios.get(
            "https://retail-alvinia-goza-f6a0e4f7.koyeb.app/shops/followed/",
            {
              headers: {
                Authorization: sessionId,
              },
            }
          );
          const sortedShops = response.data.sort((a, b) =>
            a.name.localeCompare(b.name)
          );
          setShops(sortedShops);
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(sortedShops));
        } catch (error) {
          console.error("Error fetching all followed shops:", error);
        } finally {
          setLoading(false);
        }
      };

      loadCachedData();
      fetchAllFollowedShops();
    }
  }, [sessionId]);

  const AnimatedShopItem = ({ item }) => {
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(20);

    useEffect(() => {
      opacity.value = withTiming(1, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      });
      translateY.value = withTiming(0, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      });
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    }));

    return (
      <Animated.View style={[styles.shopCardContainer, animatedStyle]}>
        <TouchableOpacity
          style={styles.shopCard}
          onPress={() => {
            router.push({
              pathname: "/shops/[id]",
              params: { id: item.id },
            });
          }}
          activeOpacity={0.85}
        >
          <View style={styles.imageContainer}>
            <Image
              source={{
                uri: `https://retail-alvinia-goza-f6a0e4f7.koyeb.app${item.image}`,
              }}
              style={styles.shopImage}
            />
            {/*<LinearGradient
              colors={["transparent", "rgba(0,0,0,0.4)"]}
              style={styles.imageGradient}
            /> */}
          </View>
          <View style={styles.shopDetails}>
            <Text style={styles.shopName}>{item.name}</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderShopItem = ({ item }) => <AnimatedShopItem item={item} />;

  if (loading && shops.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={["#F7FAFC", "#E5E7EB"]} style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.navigate("(tabs)/shop")}
              style={styles.backButton}
            >
              <MaterialIcons name="arrow-back" size={26} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Favorite Shops</Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#3A7BD5" />
            <Text style={styles.loaderText}>Loading favorite shops...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor='#2563EB' />
      <LinearGradient colors={["#F7FAFC", "#E5E7EB"]} style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.navigate( "/(tabs)/shop")}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Favorite Space</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.wrapper}>
          {shops.length === 0 ? (
            <Text style={styles.noDataText}>No favorite shops yet.</Text>
          ) : (
            <FlatList
              data={shops}
              renderItem={renderShopItem}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
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
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  listContainer: {
    paddingBottom: 24,
  },
  shopCardContainer: {
    marginBottom: 20,
  },
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
  imageContainer: {
    position: "relative",
  },
  shopImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginRight: 20,
    backgroundColor: "#E5E7EB",
  },
  imageGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 50,
  },
  shopDetails: {
    flex: 1,
  },
  shopName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    lineHeight: 28,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F7FAFC",
  },
  loaderText: {
    marginTop: 12,
    fontSize: 18,
    color: "#3A7BD5",
    fontWeight: "600",
  },
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