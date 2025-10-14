import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
 View,
 Text,
 StyleSheet,
 Image,
 TouchableOpacity,
 FlatList,
 ActivityIndicator,
 Alert,
 Clipboard,
 ToastAndroid,
 Platform,
 KeyboardAvoidingView,
 StatusBar,
} from "react-native";
import api from '../../api';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import ShopReview from "../../components/shop/ShopReview";
import Followers from "../../components/shop/Followers";
import ShopProduct from "../../components/shop/ShopProduct";
import ShopPostForm from "../../components/shop/ShopPostForm";
import AdminShopPosts from "../../components/shop/AdminShopPost";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { getFullUrl } from "../../utils/imageUtils"; // Import the utility

const CACHE_KEY = "AdminShopPage_Cache";

const AdminShopPage = () => {
 const params = useLocalSearchParams();
 const { shopId, prevRoute } = params;
 const router = useRouter();
 const [shop, setShop] = useState(null);
 const [reviews, setReviews] = useState([]);
 const [followerCount, setFollowerCount] = useState(0);
 const [followers, setFollowers] = useState([]);
 const [posts, setPosts] = useState([]);
 const [activeTab, setActiveTab] = useState("posts");
 const [error, setError] = useState("");
 const [sessionId, setSessionId] = useState(null);
 const [copied, setCopied] = useState(false);
 const renderCountRef = useRef(0);

 useEffect(() => {
 renderCountRef.current += 1;
 console.log(`AdminShopPage rendered (count: ${renderCountRef.current})`);
 return () => {
 console.log("AdminShopPage unmounted");
 };
 }, []);

 // Load cached data and session ID
 const loadCachedData = useCallback(async () => {
 try {
 const cachedData = await AsyncStorage.getItem(`${CACHE_KEY}_${shopId}`);
 if (cachedData) {
 const data = JSON.parse(cachedData);
 setPosts(data.posts || []);
 setShop({
 name: data.shop?.name,
 description: data.shop?.description,
 image: data.shop?.image,
 categories: data.shop?.categories,
 category: data.shop?.category,
 products: data.shop?.products,
 address: data.shop?.address,
 shop_id: data.shop?.shop_id,
 is_open: data.shop?.is_open,
 });
 setReviews(data.reviews || []);
 setFollowerCount(data.follower_count || 0);
 setFollowers(data.followers || []);
 console.log("Loaded cached data for shopId:", shopId);
 // Prefetch image
 if (data.shop?.image) {
 Image.prefetch(getFullUrl(data.shop.image));
 }
 }
 } catch (error) {
 console.error("Error loading cached data:", error);
 }

 const sessionId = await AsyncStorage.getItem("sessionToken");
 if (sessionId) {
 setSessionId(sessionId);
 console.log("Session ID loaded:", sessionId ? "Set" : "Not found");
 } else {
 setError("No session token found. Please log in again.");
 }
 }, [shopId]);

 // Save response to cache
 const saveToCache = useCallback(async (data) => {
 try {
 await AsyncStorage.setItem(`${CACHE_KEY}_${shopId}`, JSON.stringify(data));
 console.log("Cached data saved for shopId:", shopId);
 } catch (error) {
 console.error("Error saving to cache:", error);
 }
 }, [shopId]);

 // Fetch fresh data from backend
 const fetchShopData = useCallback(async () => {
 try {
 const sessionId = await AsyncStorage.getItem("sessionToken");
 if (!sessionId) {
 throw new Error("No session token found");
 }
 const response = await api.get(
 `/shops/${shopId}/combined/`,
 {
 headers: {
 Authorization: sessionId,
 },
 timeout: 5000,
 }
 );

 const data = response.data;
 setPosts(data.posts || []);
 setShop({
 name: data.shop.name,
 description: data.shop.description,
 image: data.shop.image,
 categories: data.shop.categories,
 category: data.shop.category,
 products: data.shop.products,
 address: data.shop.address,
 shop_id: data.shop.shop_id,
 is_open: data.shop.is_open,
 });
 setReviews(data.reviews || []);
 setFollowerCount(data.follower_count || 0);
 setFollowers(data.followers || []);
 setError("");
 saveToCache(data);
 // Prefetch image
 if (data.shop.image) {
 Image.prefetch(getFullUrl(data.shop.image));
 }
 } catch (error) {
 console.error("Error fetching shop data:", error.message, error.response?.data);
 setError("Failed to fetch shop data. Using cached data if available.");
 }
 }, [shopId, saveToCache]);

 // Load cache and fetch fresh data on mount
 useEffect(() => {
 const initializeData = async () => {
 await loadCachedData(); // Load cached data first for quick UI display
 if (shopId) {
 await fetchShopData(); // Always fetch fresh data on mount
 }
 };
 initializeData();
 }, [shopId]);

 const handleTabChange = useCallback((tab) => {
 console.log("Switching to tab:", tab);
 setActiveTab(tab);
 }, []);

 const handleReviewSubmitted = useCallback((newReview) => {
 setReviews((prevReviews) => [newReview, ...prevReviews]);
 saveToCache({
 shop,
 posts,
 reviews: [newReview, ...reviews],
 follower_count: followerCount,
 followers,
 });
 }, [shop, posts, reviews, followerCount, followers, saveToCache]);

 const handlePostCreated = useCallback(
 (newPost) => {
 console.log("New post created:", newPost);
 setPosts((prevPosts) => [newPost, ...prevPosts]);
 saveToCache({
 shop,
 posts: [newPost, ...posts],
 reviews,
 follower_count: followerCount,
 followers,
 });
 },
 [shop, posts, reviews, followerCount, followers, saveToCache]
 );

 const handlePostDeleted = useCallback(
 (postId) => {
 console.log("Post deleted:", postId);
 setPosts((prevPosts) => {
 const updatedPosts = prevPosts.filter((post) => post.id !== postId);
 saveToCache({
 shop,
 posts: updatedPosts,
 reviews,
 follower_count: followerCount,
 followers,
 });
 return updatedPosts;
 });
 },
 [shop, posts, reviews, followerCount, followers, saveToCache]
 );

 const copyToClipboard = useCallback(() => {
 if (shop?.shop_id) {
 console.log("Copying shop ID:", shop.shop_id);
 Clipboard.setString(shop.shop_id);
 setCopied(true);
 if (Platform.OS === "android") {
 ToastAndroid.show("Profile ID copied!", ToastAndroid.SHORT);
 } else {
 Alert.alert("Copied", "Profile ID copied to clipboard!");
 }
 setTimeout(() => setCopied(false), 2000);
 }
 }, [shop?.shop_id]);

 const renderContent = useMemo(() => {
 const content = [
 {
 id: "header",
 component: (
 <View style={styles.shopHeader}>
 <Image
 source={{ uri: getFullUrl(shop?.image) }} // Use getFullUrl
 style={styles.shopImage}
 resizeMode="cover" // Add resizeMode
 onError={(e) => console.error(`Shop image load error for shop ${shopId}:`, e.nativeEvent.error)} // Update error handling
 />
 <View style={styles.shopInfo}>
 <Text style={styles.shopName}>{shop?.name || "Loading..."}</Text>
 <View style={styles.shopStatusContainer}>
 <Ionicons
 name={shop?.is_open ? "checkmark-circle" : "alert-circle"}
 size={18}
 color={shop?.is_open ? "#4CAF50" : "#FF9800"}
 />
 <Text
 style={[
 styles.shopStatusText,
 shop?.is_open ? styles.shopOpen : styles.shopClosed,
 ]}
 >
 {shop?.is_open ? "Open" : "Closed"}
 </Text>
 </View>
 <Text style={styles.followerCount}>{followerCount} Followers</Text>
 <View style={styles.addressContainer}>
 <MaterialIcons
 name="location-on"
 size={18}
 color="black"
 style={styles.icon}
 />
 <Text style={styles.shopAddress}>{shop?.address || "No address available"}</Text>
 </View>
 </View>
 </View>
 ),
 },
 {
 id: "details",
 component: (
 <View style={styles.details}>
 <LinearGradient
 colors={["#ffffff", "#f8fafc"]}
 style={styles.descriptionCard}
 >
 <Text style={styles.descriptionTitle}>About</Text>
 <Text style={styles.descriptionText}>
 {shop?.description || "No description available"}
 </Text>
 </LinearGradient>
 <View style={styles.categoriesContainer}>
 <Text style={styles.categoriesTitle}>Categories</Text>
 <View style={styles.categoriesWrapper}>
 {shop?.categories && Array.isArray(shop?.categories) && shop.categories.length > 0 ? (
 shop.categories.map((cat, index) => (
 <LinearGradient
 key={index}
 colors={["#16a085", "#1abc9c"]}
 style={styles.categoryBadge}
 >
 <Text style={styles.categoryBadgeText}>{cat.name}</Text>
 </LinearGradient>
 ))
 ) : (
 <View style={[styles.categoryBadge, styles.noCategoryBadge]}>
 <Text style={[styles.categoryBadgeText, styles.noCategoryBadgeText]}>
 No categories available
 </Text>
 </View>
 )}
 </View>
 </View>
 </View>
 ),
 },
 {
 id: "nav",
 component: (
 <View style={styles.nav}>
 {(shop?.category?.name === "Services"
 ? ["posts", "services", "customers", "reviews"]
 : ["posts", "products", "customers", "reviews"]
 ).map((tab) => (
 <TouchableOpacity
 key={tab}
 style={[styles.navTab, activeTab === tab && styles.activeTab]}
 onPress={() => handleTabChange(tab)}
 activeOpacity={0.7}
 >
 <Text
 style={[
 styles.navTabText,
 activeTab === tab && styles.activeTabText,
 ]}
 >
 {tab.charAt(0).toUpperCase() + tab.slice(1)}
 </Text>
 </TouchableOpacity>
 ))}
 </View>
 ),
 },
 {
 id: "tabContent",
 component: (
 <View style={styles.tabContent}>
 {activeTab === "posts" && (
 <>
 <ShopPostForm shopId={shopId} onPostCreated={handlePostCreated} />
 <AdminShopPosts
 posts={posts}
 shopId={shopId}
 onPostDeleted={handlePostDeleted}
 />
 </>
 )}
 {(activeTab === "products" || activeTab === "services") && (
 <ShopProduct products={shop?.products || []} />
 )}
 {activeTab === "customers" && <Followers followers={followers} />}
 {activeTab === "reviews" && (
 <ShopReview reviews={reviews} onReviewSubmitted={handleReviewSubmitted} />
 )}
 </View>
 ),
 },
 ];

 return content;
 }, [
 shop,
 followerCount,
 activeTab,
 shopId,
 posts,
 followers,
 reviews,
 handleTabChange,
 handlePostCreated,
 handlePostDeleted,
 handleReviewSubmitted,
 ]);

 if (error && !shop) {
 return (
 <View style={styles.errorContainer}>
 <Text style={styles.errorText}>{error}</Text>
 </View>
 );
 }

 if (!shop || sessionId === null) {
 return (
 <View style={styles.loadingContainer}>
 <ActivityIndicator size="large" color="#f39c12" />
 <Text style={styles.loadingText}>Loading space data...</Text>
 </View>
 );
 }

 return (
 <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
 <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
 <KeyboardAvoidingView
 style={{ flex: 1 }}
 behavior={Platform.OS === "ios" ? "padding" : undefined}
 keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
 >
 <View style={styles.container}>
 <View style={styles.header}>
 <TouchableOpacity
 onPress={() => {
 console.log("Back button pressed");
 router.navigate("(tabs)/myshop");
 }}
 style={styles.backButton}
 activeOpacity={0.7}
 >
 <MaterialIcons name="arrow-back" size={24} color="white" />
 </TouchableOpacity>
 <View style={styles.shopIdContainer}>
 <Text style={styles.shopIdLabel}>SHOP ID:</Text>
 <Text style={styles.shopId}>{shop.shop_id}</Text>
 <TouchableOpacity
 onPress={copyToClipboard}
 style={styles.copyButton}
 activeOpacity={0.7}
 >
 <Ionicons
 name={copied ? "checkmark-circle" : "copy-outline"}
 size={22}
 color={copied ? "#4CAF50" : "white"}
 />
 </TouchableOpacity>
 </View>
 </View>

 <FlatList
 data={renderContent}
 keyExtractor={(item) => item.id}
 renderItem={({ item }) => item.component}
 contentContainerStyle={styles.content}
 keyboardShouldPersistTaps="always"
 scrollEnabled={true}
 />
 </View>
 </KeyboardAvoidingView>
 </SafeAreaView>
 );
};

const styles = StyleSheet.create({
 container: {
 flex: 1,
 backgroundColor: "#f4f4f4",
 },
 header: {
 flexDirection: "row",
 alignItems: "center",
 justifyContent: "space-between",
 padding: 16,
 backgroundColor: "#3A7BD5",
 shadowColor: "#000",
 shadowOffset: { width: 0, height: 2 },
 shadowOpacity: 0.1,
 shadowRadius: 4,
 elevation: 3,
 borderBottomLeftRadius: 20,
 borderBottomRightRadius: 20,
 },
 backButton: {
 padding: 5,
 borderRadius: 12,
 backgroundColor: "rgba(255, 255, 255, 0.2)",
 },
 content: {
 padding: 15,
 paddingBottom: 20,
 },
 shopHeader: {
 flexDirection: "row",
 alignItems: "center",
 backgroundColor: "#ffffff",
 padding: 15,
 borderRadius: 10,
 shadowColor: "#000",
 shadowOffset: { width: 0, height: 1 },
 shadowOpacity: 0.08,
 shadowRadius: 3,
 elevation: 2,
 },
 shopImage: {
 width: 80,
 height: 80,
 borderRadius: 40,
 marginRight: 15,
 borderWidth: 1,
 borderColor: "#b0c4de",
 },
 shopInfo: {
 flex: 1,
 },
 shopIdContainer: {
 flexDirection: "row",
 alignItems: "center",
 },
 shopIdLabel: {
 fontSize: 16,
 color: "#FFFFFF",
 marginRight: 8,
 fontWeight: "700",
 },
 shopId: {
 fontSize: 16,
 color: "#FFFFFF",
 marginRight: 1,
 },
 copyButton: {
 padding: 6,
 borderRadius: 8,
 backgroundColor: "rgba(255, 255, 255, 0.2)",
 },
 shopName: {
 fontSize: 20,
 fontWeight: "bold",
 color: "#2c3e50",
 },
 followerCount: {
 fontSize: 14,
 color: "#7f8c8d",
 marginVertical: 5,
 },
 addressContainer: {
 flexDirection: "row",
 alignItems: "center",
 marginTop: 5,
 },
 icon: {
 marginRight: 5,
 },
 shopAddress: {
 fontSize: 14,
 color: "black",
 marginTop: 5,
 },
 details: {
 marginVertical: 15,
 },
 descriptionCard: {
 backgroundColor: "#ffffff",
 borderRadius: 12,
 padding: 20,
 marginBottom: 16,
 shadowColor: "#000",
 shadowOffset: { width: 0, height: 2 },
 shadowOpacity: 0.15,
 shadowRadius: 6,
 elevation: 4,
 borderWidth: 1,
 borderColor: "#e8ecef",
 minHeight: 100,
 },
 descriptionTitle: {
 fontSize: 20,
 fontWeight: "600",
 color: "#2c3e50",
 marginBottom: 10,
 },
 descriptionText: {
 fontSize: 15,
 color: "#34495e",
 lineHeight: 24,
 },
 categoriesContainer: {
 marginBottom: 16,
 },
 categoriesTitle: {
 fontSize: 20,
 fontWeight: "600",
 color: "#2c3e50",
 marginBottom: 10,
 },
 categoriesWrapper: {
 flexDirection: "row",
 flexWrap: "wrap",
 gap: 10,
 },
 categoryBadge: {
 borderRadius: 20,
 paddingVertical: 8,
 paddingHorizontal: 16,
 maxWidth: 200,
 alignItems: "center",
 justifyContent: "center",
 shadowColor: "#000",
 shadowOffset: { width: 0, height: 1 },
 shadowOpacity: 0.2,
 shadowRadius: 3,
 elevation: 3,
 },
 noCategoryBadge: {
 backgroundColor: "#dfe6e9",
 },
 categoryBadgeText: {
 fontSize: 14,
 color: "#ffffff",
 fontWeight: "600",
 textAlign: "center",
 },
 noCategoryBadgeText: {
 color: "#636e72",
 },
 nav: {
 flexDirection: "row",
 justifyContent: "space-between",
 marginVertical: 10,
 paddingBottom: 8,
 borderBottomWidth: 1,
 borderBottomColor: "#e0e0e0",
 },
 navTab: {
 paddingVertical: 8,
 flex: 1,
 alignItems: "center",
 },
 activeTab: {
 borderBottomWidth: 2,
 borderBottomColor: "#1abc9c",
 },
 navTabText: {
 fontSize: 15,
 color: "#7f8c8d",
 },
 activeTabText: {
 color: "#1abc9c",
 fontWeight: "700",
 },
 tabContent: {
 padding: 15,
 backgroundColor: "#ffffff",
 borderRadius: 10,
 shadowColor: "#000",
 shadowOffset: { width: 0, height: 2 },
 shadowOpacity: 0.08,
 shadowRadius: 4,
 elevation: 3,
 marginTop: 8,
 },
 shopStatusContainer: {
 flexDirection: "row",
 alignItems: "flex-start",
 gap: 6,
 marginTop: 4,
 paddingVertical: 4,
 borderRadius: 6,
 backgroundColor: "rgba(0,0,0,0.05)",
 alignSelf: "flex-start",
 },
 shopStatusText: {
 fontSize: 14,
 fontWeight: "bold",
 },
 shopOpen: {
 color: "#4CAF50",
 },
 shopClosed: {
 color: "#FF9800",
 },
 errorContainer: {
 flex: 1,
 justifyContent: "center",
 alignItems: "center",
 backgroundColor: "#f4f4f4",
 padding: 20,
 },
 errorText: {
 fontSize: 16,
 color: "#ff4d4d",
 textAlign: "center",
 marginTop: 20,
 },
 loadingContainer: {
 flex: 1,
 justifyContent: "center",
 alignItems: "center",
 backgroundColor: "#f4f4f4",
 },
 loadingText: {
 marginTop: 10,
 fontSize: 16,
 color: "#7f8c8d",
 },
});

export default AdminShopPage;
