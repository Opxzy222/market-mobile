import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator, Alert, Clipboard
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
        `https://172.27.243.94:8000/shops/${shopId}/combined/`,
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
        products: data.shop.products,
        address: data.shop.address,
        shop_id: data.shop.shop_id,
        latitude: data.shop.geo_location?.latitude,
        longitude: data.shop.geo_location?.longitude,
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

useEffect(() => {
  const markShopAsVisited = async () => {
    if (!sessionId || !shopId) {
      console.log("Skipping markShopAsVisited - sessionId or shopId not set");
      return; // Exit if either sessionId or shopId is missing
    }

    try {
      console.log("Marking shop as visited:", shopId, sessionId);
      await axios.post(
        "https://172.27.243.94:8000/shops/recently-visited/",
        { shop_id: shopId },
        {
          headers: {
            Authorization: sessionId, // Sending sessionId in headers
          },
        }
      );
    } catch (error) {
      console.error("Error marking shop as visited:", error);
    }
  };

  markShopAsVisited(); // ✅ Call function correctly
}, [sessionId, shopId]); // ✅ Separate useEffect for marking shop as visited

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

  const handleCopyShopId = () => {
    Clipboard.setString(shop.shop_id);
    Alert.alert("Copied!", "Shop ID has been copied to the clipboard.");
  };

  return (
    <View style={styles.container}>
      {/* Back Button Header */}
      <View style={styles.header}>
        <View style={styles.backContainer}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <MaterialIcons name="arrow-back" size={24} color="#007BFF" />
        </TouchableOpacity>
        </View>
        <View style={styles.shopIdContainer}>
          <Text style={styles.shopIdLabel}>SHOP ID:</Text>
          <Text style={styles.shopId}>{shop.shop_id}</Text>
        <TouchableOpacity onPress={handleCopyShopId}>
          <Ionicons name="copy" size={20} color="#007BFF" style={styles.copyIcon} />
        </TouchableOpacity>
      </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Shop Header */}
        <View style={styles.shopHeader}>
          <View>
          <Image
            source={{ uri: `https://172.27.243.94:8000/${shop.image}` }}
            style={styles.shopImage}
          />
          </View>
          
          
          <View style={styles.shopInfo}>
            <Text style={styles.shopName}>{shop.name}</Text>
            <Text style={styles.followerCount}>{followerCount} Followers</Text>
            <View style={styles.addressContainer}>
              <MaterialIcons name="store" size={18} color="#4CAF50" style={styles.icon} />
              <Text style={styles.shopAddress}>{shop.address}</Text>
            </View>
            <ShopLocation shopLat={shop.latitude} shopLng={shop.longitude} />

      <View style={styles.buttons}>
  <FollowButton shopId={shopId} />
  <TouchableOpacity style={styles.messageButton} onPress={() => {
          router.push({
            pathname: '/shop/StartConversation',
            params: { shopId: shopId, name: shop.name},
          });
        }}
        >
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
          {['posts', 'products', 'followers', 'reviews'].map((tab) => (
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
          {activeTab === 'followers' && <Followers followers={followers} />}
          {activeTab === 'reviews' && 
            <View>
              <ReviewForm shopId={shopId} onReviewSubmitted={handleReviewSubmitted} />
              <ShopReview reviews={reviews} />
            </View>}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f4', // Neutral, light background for a professional look
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
  backContainer: {
    
  },
  backButton: {
    marginRight: 5,
  },
  headerTitle: {
    fontSize: 20,
    color: '#2c3e50', // A rich, deep grey-blue
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
    borderRadius: 10,
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
    borderColor: '#b0c4de', // Subtle border for sophistication
  },
  shopInfo: {
    flex: 1,
  },
  shopName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50', // Darker text for better readability
  },
  followerCount: {
    fontSize: 14,
    color: '#7f8c8d', // Subtle, mature secondary text color
    marginVertical: 5,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  icon: {
    marginRight: 5,
  },
  shopAddress: {
    fontSize: 14,
    color: 'black', // Same as followerCount for consistency
    marginTop: 0, // Small spacing above the address
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  followButton: {
    backgroundColor: '#28a745', 
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 25,
    flex: 1,
    alignItems: 'center',
  },
  messageButton: {
    backgroundColor: '#007bff', 
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 25,
    flex: 1,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 14,
  },
  details: {
    marginVertical: 15,
  },
  category: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34495e', // Deep slate grey for text accents
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#5d6d7e', // Refined grey for descriptions
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
    borderBottomColor: '#1abc9c', // Elegant teal for active indicator
  },
  navTabText: {
    fontSize: 15,
    color: '#7f8c8d',
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
    marginTop: 8, // Reduced spacing
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
  copyIcon: {
    marginLeft: 4,
  },
});

export default ShopPage;