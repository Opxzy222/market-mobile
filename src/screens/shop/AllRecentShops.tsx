import React, { useState, useEffect } from "react";
import {
 View,
 Text,
 StyleSheet,
 FlatList,
 Image,
 TouchableOpacity,
 ActivityIndicator,
 StatusBar,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams } from "expo-router";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInUp, ZoomIn } from "react-native-reanimated";
import { getFullUrl } from "../../utils/imageUtils"; // Import the utility

export default function AllRecentlyVisitedShops() {
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
 const response = await axios.get(
 "https://retail-alvinia-goza-f6a0e4f7.koyeb.app/shops/all-recently-visited/",
 {
 headers: {
 Authorization: sessionId,
 },
 }
 );
 const shopsData = response.data.recently_visited_shops;
 setShops(shopsData);
 // Prefetch images
 shopsData.forEach((shop) => {
 if (shop.image) {
 Image.prefetch(getFullUrl(shop.image));
 }
 });
 } catch (error) {
 console.error("Error fetching recently visited shops:", error);
 } finally {
 setLoading(false);
 }
 };

 fetchRecentlyVisitedShops();
 }
 }, [sessionId]);

 const renderShopCard = ({ item, index }) => (
 <Animated.View entering={FadeInUp.delay(index * 100).duration(300)}>
 <TouchableOpacity
 style={styles.shopCard}
 activeOpacity={0.9}
 onPress={() =>
 router.push({ pathname: "/shop/shop-page", params: { shopId: item.id } })
 }
 >
 <View style={styles.imageContainer}>
 {item.image ? (
 <Image
 source={{ uri: getFullUrl(item.image) }} // Use getFullUrl
 style={styles.shopImage}
 resizeMode="cover"
 onError={(e) => console.error(`Image load error for shop ${item.id}:`, e.nativeEvent.error)} // Add error handling
 />
 ) : (
 <LinearGradient
 colors={["#E5E7EB", "#D1D5DB"]}
 style={[styles.shopImage, styles.placeholderImage]}
 >
 <MaterialIcons name="store" size={40} color="#6B7280" />
 </LinearGradient>
 )}
 <LinearGradient
 colors={["transparent", "rgba(0,0,0,0.5)"]}
 style={styles.imageGradient}
 />
 <Text style={styles.shopNameOverlay}>{item.name}</Text>
 </View>
 <View style={styles.shopContent}>
 <View style={styles.shopInfo}>
 <Text style={styles.shopAddress} numberOfLines={2}>
 {item.address}
 </Text>
 <Text style={styles.visitedAt}>
 Visited: {new Date(item.visited_at).toLocaleDateString()}
 </Text>
 <Text style={styles.shopDescription} numberOfLines={2}>
 {item.description}
 </Text>
 </View>
 <Animated.View entering={ZoomIn.delay(index * 100 + 200).duration(200)}>
 <TouchableOpacity style={styles.visitButton} activeOpacity={0.7}>
 <LinearGradient
 colors={["#22C55E", "#15803D"]}
 style={styles.buttonGradient}
 >
 <MaterialIcons name="storefront" size={20} color="#fff" />
 <Text style={styles.buttonText}>Visit</Text>
 </LinearGradient>
 </TouchableOpacity>
 </Animated.View>
 </View>
 </TouchableOpacity>
 </Animated.View>
 );

 return (
 <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
 <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
 <LinearGradient
 colors={["#3A7BD5", "#2563EB"]}
 style={styles.header}
 >
 <TouchableOpacity
 onPress={() => router.navigate("(tabs)/shop")}
 style={styles.backButton}
 >
 <MaterialIcons name="arrow-back" size={26} color="#fff" />
 </TouchableOpacity>
 <Text style={styles.headerTitle}>Recently Visited</Text>
 <View style={styles.headerSpacer} />
 </LinearGradient>
 <LinearGradient
 colors={["#F8FAFC", "#E2E8F0"]}
 style={styles.wrapper}
 >
 {loading ? (
 <LinearGradient
 colors={["#F8FAFC", "#E2E8F0"]}
 style={styles.loaderContainer}
 >
 <ActivityIndicator size="large" color="#3A7BD5" />
 <Text style={styles.loaderText}>Loading your recently visited shops...</Text>
 </LinearGradient>
 ) : shops.length === 0 ? (
 <View style={styles.emptyContainer}>
 <MaterialIcons name="store" size={48} color="#6B7280" />
 <Text style={styles.noDataText}>No recently visited shops yet.</Text>
 <Text style={styles.noDataSubText}>Explore shops to start building your visit history!</Text>
 </View>
 ) : (
 <FlatList
 data={shops}
 renderItem={renderShopCard}
 keyExtractor={(item) => item.id.toString()}
 contentContainerStyle={styles.listContainer}
 initialNumToRender={10}
 windowSize={21}
 showsVerticalScrollIndicator={false}
 />
 )}
 </LinearGradient>
 </SafeAreaView>
 );
}

const styles = StyleSheet.create({
 container: {
 flex: 1,
 },
 header: {
 flexDirection: "row",
 alignItems: "center",
 paddingVertical: 16,
 paddingHorizontal: 16,
 borderBottomLeftRadius: 24,
 borderBottomRightRadius: 24,
 shadowColor: "#000",
 shadowOffset: { width: 0, height: 4 },
 shadowOpacity: 0.3,
 shadowRadius: 8,
 elevation: 8,
 },
 backButton: {
 padding: 8,
 borderRadius: 12,
 backgroundColor: "rgba(255, 255, 255, 0.2)",
 },
 headerTitle: {
 fontSize: 22,
 fontWeight: "700",
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
 paddingBottom: 100,
 },
 shopCard: {
 backgroundColor: "#FFFFFF",
 borderRadius: 16,
 marginBottom: 16,
 overflow: "hidden",
 shadowColor: "#000",
 shadowOpacity: 0.15,
 shadowRadius: 10,
 shadowOffset: { width: 0, height: 2 },
 elevation: 5,
 },
 imageContainer: {
 position: "relative",
 height: 120,
 },
 shopImage: {
 width: "100%",
 height: "100%",
 borderTopLeftRadius: 16,
 borderTopRightRadius: 16,
 },
 placeholderImage: {
 justifyContent: "center",
 alignItems: "center",
 },
 imageGradient: {
 position: "absolute",
 top: 0,
 left: 0,
 right: 0,
 bottom: 0,
 },
 shopNameOverlay: {
 position: "absolute",
 bottom: 12,
 left: 12,
 fontSize: 18,
 fontWeight: "700",
 color: "#FFFFFF",
 textShadowColor: "rgba(0, 0, 0, 0.5)",
 textShadowOffset: { width: 1, height: 1 },
 textShadowRadius: 2,
 },
 shopContent: {
 flexDirection: "row",
 justifyContent: "space-between",
 alignItems: "center",
 padding: 12,
 },
 shopInfo: {
 flex: 1,
 paddingRight: 12,
 },
 shopAddress: {
 fontSize: 14,
 color: "#374151",
 lineHeight: 20,
 marginBottom: 4,
 },
 visitedAt: {
 fontSize: 12,
 color: "#6B7280",
 marginBottom: 4,
 },
 shopDescription: {
 fontSize: 13,
 color: "#4B5563",
 lineHeight: 18,
 },
 visitButton: {
 borderRadius: 10,
 overflow: "hidden",
 },
 buttonGradient: {
 flexDirection: "row",
 alignItems: "center",
 paddingVertical: 10,
 paddingHorizontal: 16,
 borderRadius: 10,
 },
 buttonText: {
 color: "#fff",
 fontSize: 14,
 fontWeight: "600",
 marginLeft: 6,
 },
 loaderContainer: {
 flex: 1,
 justifyContent: "center",
 alignItems: "center",
 },
 loaderText: {
 marginTop: 12,
 fontSize: 16,
 color: "#3A7BD5",
 fontWeight: "600",
 },
 emptyContainer: {
 flex: 1,
 justifyContent: "center",
 alignItems: "center",
 paddingHorizontal: 20,
 },
 noDataText: {
 fontSize: 18,
 color: "#1F2937",
 fontWeight: "600",
 marginTop: 16,
 textAlign: "center",
 },
 noDataSubText: {
 fontSize: 14,
 color: "#6B7280",
 marginTop: 8,
 textAlign: "center",
 },
});