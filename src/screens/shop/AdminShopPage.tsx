import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router'; 
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import ShopReview from '../../components/shop/ShopReview';
import FollowButton from '../../components/shop/FollowButton';
import Followers from '../../components/shop/Followers';
import ShopProduct from '../../components/shop/ShopProduct';
import ShopPostForm from '../../components/shop/ShopPostForm';
import AdminShopPosts from '../../components/shop/AdminShopPost';


const AdminShopPage = () => {
  const params = useLocalSearchParams();
  const { shopId, prevRoute } = params;
  const router = useRouter(); // Router for navigation

  const [shop, setShop] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followers, setFollowers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('posts');
  const [error, setError] = useState('');
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const fetchUserId = async () => {
      const userIdString = await AsyncStorage.getItem('user_id');
      setUserId(parseInt(userIdString, 10));
    };

    fetchUserId();
  }, []);

  useEffect(() => {
    const fetchShopData = async () => {
      try {
        const response = await axios.get(`https://172.27.243.94:8000/shops/${shopId}/combined/`);
        const data = response.data;
        setPosts(data.posts);

        setShop({
          name: data.shop.name,
          description: data.shop.description,
          image: data.shop.image,
          categories: data.shop.categories,
          products: data.shop.products,
          address: data.shop.address,
        });
        setReviews(data.reviews);
        setFollowerCount(data.follower_count);
        setFollowers(data.followers || []);
        
        setError('');
      } catch (error) {
        console.error('Error fetching shop data:', error);
        setError('Failed to fetch shop data. Please try again later.');
      }
    };

    if (shopId) {
      fetchShopData();
    }
  }, [shopId]);

  const handleTabChange = (tab) => setActiveTab(tab);
  const handleReviewSubmitted = (newReview) => {
    setReviews((prevReviews) => [newReview, ...prevReviews]);
  };

  if (error) {
    return <Text style={styles.errorText}>{error}</Text>;
  }

  if (!shop || userId === null) {
    return <ActivityIndicator size="large" color="#f39c12" />;
  }

  return (
    <View style={styles.container}>
      {/* Back Button Header */}
      <View style={styles.header}>
      <TouchableOpacity
        onPress={() => router.replace(prevRoute || '((tabs)/myshop)')}
        style={styles.backButton}
      >
        <MaterialIcons name="arrow-back" size={24} color="#007BFF" />
      </TouchableOpacity>
        
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Shop Header */}
        <View style={styles.shopHeader}>
          <Image
            source={{ uri: `https://172.27.243.94:8000/${shop.image}` }}
            style={styles.shopImage}
          />
          <View style={styles.shopInfo}>
      <Text style={styles.shopName}>{shop.name}</Text>
      <Text style={styles.followerCount}>{followerCount} Followers</Text>
      <View style={styles.addressContainer}>
        <MaterialIcons name="location-on" size={18} color="black" style={styles.icon} />
        <Text style={styles.shopAddress}>{shop.address}</Text>
      </View>

      <View style={styles.buttons}>
  <FollowButton shopId={shopId} />
  <TouchableOpacity style={styles.messageButton}>
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
          {activeTab === 'posts' && 
            <View>
              
              <ShopPostForm shopId={shopId} />
              <View>
                <AdminShopPosts posts={posts} shopId={shopId} />
              </View>
            </View>}
          {activeTab === 'products' && <ShopProduct products={shop.products} />}
          {activeTab === 'followers' && <Followers followers={followers} />}
          {activeTab === 'reviews' && 
            <View>
              
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
    padding: 15,
    
    borderBottomWidth: 1,
    borderBottomColor: '#dcdcdc',
    elevation: 3,
  },
  backButton: {
    marginRight: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: '#0073e6', // A mature and refined blue
    fontWeight: '600',
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
    marginTop: 5,
  },
  icon: {
    marginRight: 5,
  },
  shopAddress: {
    fontSize: 14,
    color: 'black', // Same as followerCount for consistency
    marginTop: 5, // Small spacing above the address
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
});

export default AdminShopPage;