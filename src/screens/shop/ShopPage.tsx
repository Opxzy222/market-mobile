import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator, Alert, Clipboard, ToastAndroid, Platform
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router'; 
import ReviewForm from '../../components/shop/ReviewForm';
import ShopReview from '../../components/shop/ShopReview';
import FollowButton from '../../components/shop/FollowButton';
import Followers from '../../components/shop/Followers';
import ShopProduct from '../../components/shop/ShopProduct';
import ShopPosts from '../../components/shop/ShopPost';
import ShopLocation from '../../components/shop/MapFeatures';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from "expo-linear-gradient";


const ShopPage = () => {
  const params = useLocalSearchParams();
  const { shopId } = params;
  const router = useRouter(); // Router for navigation

  const [shop, setShop] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followers, setFollowers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('posts');
  const [error, setError] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [plan, setPlan] = useState('');
  const [copied, setCopied] = useState(false);


  useEffect(() => {
    const fetchUserId = async () => {
      const sessionIdString = await AsyncStorage.getItem("sessionToken");
      setSessionId(sessionIdString); // No need to parse as an integer
    };

    fetchUserId();
    console.log(sessionId, 'heya')
  }, []);
  
  useEffect(() => {
  const fetchSessionId = async () => {
    try {
      const sessionIdString = await AsyncStorage.getItem("sessionToken");
      setSessionId(sessionIdString);
    } catch (error) {
      console.error("Error fetching session token:", error);
    }
  };

  fetchSessionId();
}, []);

useEffect(() => {
  const fetchShopData = async () => {
    if (!sessionId || !shopId) return; // Ensure sessionId & shopId exist before fetching

    try {
      const response = await axios.get(
        `https://retail-alvinia-goza-f6a0e4f7.koyeb.app/shops/${shopId}/combined/`,
        {
          headers: {
            Authorization: sessionId, // Sending sessionId in headers
          },
        }
      );
      const data = response.data;

      setShop({
        name: data.shop.name,
        description: data.shop.description,
        image: data.shop.image,
        categories: data.shop.categories,
        category: data.shop.category,
        products: data.shop.products,
        address: data.shop.address,
        shop_id: data.shop.shop_id,
        latitude: data.shop.geo_location?.latitude,
        longitude: data.shop.geo_location?.longitude,
        is_open: data.shop.is_open
      });
      setReviews(data.reviews);
      setFollowerCount(data.follower_count);
      setFollowers(data.followers || []);
      setPosts(data.posts);
      setPlan(data.plan);
      console.log("yola", data.plan);

      setError(""); // Clear error on success
    } catch (error) {
      console.error("Error fetching shop data:", error);
      setError("Failed to fetch shop data. Please try again later.");
    }
  };

  fetchShopData();
}, [sessionId, shopId]); // ✅ Runs when sessionId or shopId changes

  const handleTabChange = (tab) => setActiveTab(tab);
  const handleReviewSubmitted = (newReview) => {
    setReviews((prevReviews) => [newReview, ...prevReviews]);
  };

  if (error) {
    return <Text style={styles.errorText}>{error}</Text>;
  }

  if (!shop || sessionId === null) {
    return <ActivityIndicator size="large" color="#f39c12" />;
  }

  const copyToClipboard = () => {
    if (shop.shop_id) {
      Clipboard.setString(shop.shop_id);
      setCopied(true);

      if (Platform.OS === "android") {
        ToastAndroid.show("Profile ID copied!", ToastAndroid.SHORT);
      } else {
        Alert.alert("Copied", "Profile ID copied to clipboard!");
      }

      setTimeout(() => setCopied(false), 2000);
    }
  };


  return (
    <LinearGradient colors={["#E3F2FD", "#BBDEFB"]} style={styles.container}>
      {/* Back Button Header */}
      <View style={styles.header}>
        <View style={styles.backContainer}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <MaterialIcons name="arrow-back" size={24} color="#007BFF" />
        </TouchableOpacity>
        </View>
        <View style={styles.shopIdContainer}>
          <Text style={styles.shopIdLabel}>SPACE ID:</Text>
          <Text style={styles.shopId}>{shop.shop_id}</Text>
        <TouchableOpacity onPress={copyToClipboard} style={styles.copyButton}>
          <Ionicons name={copied ? "checkmark-circle" : "copy-outline"} size={22} color={copied ? "#4CAF50" : "#007AFF"} />
        </TouchableOpacity>
      </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Shop Header */}
        <View style={styles.shopHeader}>
          <View>
          <Image
            source={{ uri: `https://retail-alvinia-goza-f6a0e4f7.koyeb.app${shop.image}` }}
            style={styles.shopImage}
          />
          </View>
          
          
          <View style={styles.shopInfo}>
            <Text style={styles.shopName}>{shop.name}</Text>
            <View style={styles.shopStatusContainer}>
              <Ionicons 
                name={shop.is_open ? "checkmark-circle" : "alert-circle"} 
                size={18} 
                color={shop.is_open ? "#4CAF50" : "#FF9800"}  
              />
              <Text style={[styles.shopStatusText, shop.is_open ? styles.shopOpen : styles.shopClosed]}>
                {shop.is_open ? "Open" : "Closed"}
              </Text>
            </View>

            <View style={styles.addressContainer}>
              <MaterialIcons 
                name="store" 
                size={18} 
                color="#4CAF50" 
                style={styles.icon} 
            />
              <Text style={styles.shopAddress} numberOfLines={2}>
                {shop.address}
              </Text>
            </View>

            <ShopLocation shopLat={shop.latitude} shopLng={shop.longitude} />
            <Text style={styles.followerCount}>{followerCount} Customers</Text>

            <View style={styles.buttonsContainer}>
  <FollowButton shopId={shopId} />
  
  <TouchableOpacity 
    style={styles.messageButton} 
    onPress={() => {
      router.push({
        pathname: '/shop/StartConversation',
        params: { shopId: shopId, name: shop.name },
      });
    }}
  >
    <Ionicons name="chatbubble-ellipses-outline" size={18} color="#FFF" style={styles.buttonIcon} />
    <Text style={styles.buttonText}>Message</Text>
  </TouchableOpacity>
</View>

    </View>
    </View>


        {/* Shop Details */}
        <View style={styles.details}>
          <Text style={styles.category}>
            {shop.categories && Array.isArray(shop.categories)
              ? shop.categories.map((cat) => cat.name).join(', ')
              : 'No categories available'}
          </Text>
          <Text style={styles.description}>{shop.description}</Text>
        </View>

        {/* Tab Navigation */}
        <View style={styles.nav}>
  {(shop.category?.name === 'Services'
    ? ['posts', 'services', 'customers', 'reviews']
    : ['posts', 'products', 'customers', 'reviews']
  ).map((tab) => (
    <TouchableOpacity
      key={tab}
      style={[styles.navTab, activeTab === tab && styles.activeTab]}
      onPress={() => handleTabChange(tab)}
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


        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'posts' && (
            plan === null || plan === "" ? (
            <Text style={styles.noPostsText}>No posts available</Text>
            ) : (
            <ShopPosts posts={posts} />
          )
        )}
          {activeTab === 'products' && <ShopProduct key={shopId} products={shop.products} />}
          {activeTab === 'customers' && <Followers followers={followers} />}
          {activeTab === 'reviews' && 
            <View>
              <ReviewForm shopId={shopId} onReviewSubmitted={handleReviewSubmitted} />
              <ShopReview reviews={reviews} />
            </View>}
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f4',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  backContainer: {},
  backButton: {
    marginRight: 5,
  },
  headerTitle: {
    fontSize: 20,
    color: '#2c3e50',
    fontWeight: 'bold',
  },
  content: {
    padding: 15,
    marginTop: -25,
  },
  shopHeader: {
    flexDirection: 'row',
    marginVertical: 15,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
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
    borderColor: '#b0c4de',
    marginLeft: -15,
  },
  shopInfo: {
    flex: 1,
  },
  shopName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  followerCount: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 10,
    marginLeft: 10,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 5,
  },
  icon: {
    marginTop: 3,
  },
  shopAddress: {
    fontSize: 14,
    color: 'black',
    flex: 1,
    flexShrink: 1,
    marginTop: 2,
  },

  // 🔧 FIXED BUTTON STYLES 🔧
  buttonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    width: '100%',
    marginTop: 2,
    paddingHorizontal: 10,
    gap: 10,
  },
  
  messageButton: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#007BFF',
  paddingVertical: 8,
  paddingHorizontal: 12, // reduced from 18
  borderRadius: 20,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 2,
  flex: 1,
  flexShrink: 1,
  minWidth: 90,
  maxWidth: 140,
  maxHeight: 42,
},

buttonText: {
  color: '#fff',
  fontWeight: '600',
  textAlign: 'center',
  fontSize: 13, // slightly smaller
},

  buttonIcon: {
    marginRight: 5,
  },
  details: {
    marginVertical: 15,
  },
  category: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34495e',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: 'black',
    lineHeight: 22,
  },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  navTab: {
    paddingVertical: 8,
    flex: 1,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#1abc9c',
  },
  navTabText: {
    fontSize: 15,
    color: 'black',
  },
  activeTabText: {
    color: '#1abc9c',
    fontWeight: '700',
  },
  tabContent: {
    padding: 15,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    marginTop: 8,
  },
  tabText: {
    fontSize: 14,
    color: '#34495e',
    lineHeight: 20,
  },
  shopIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopIdLabel: {
    fontSize: 16,
    color: 'black',
    marginRight: 8,
    fontWeight: '700',
  },
  shopId: {
    fontSize: 16,
    color: 'black',
    marginRight: 1,
  },
  copyButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "rgba(0, 122, 255, 0.1)",
  },
  shopStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 0,
    borderRadius: 6,
    marginBottom: 5,
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
});

export default ShopPage;
