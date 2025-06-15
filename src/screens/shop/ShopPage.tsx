// src/app/shop/ShopPage.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Clipboard,
  ToastAndroid,
  Platform,
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
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

const ShopPage = () => {
  const params = useLocalSearchParams();
  const { shopId } = params;
  const router = useRouter();

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
    const fetchSessionId = async () => {
      try {
        const sessionIdString = await AsyncStorage.getItem('sessionToken');
        setSessionId(sessionIdString);
        console.log('Session ID:', sessionIdString || 'null');
      } catch (error) {
        console.error('Error fetching session token:', error);
      }
    };

    fetchSessionId();
  }, []);

  useEffect(() => {
    const fetchShopData = async () => {
      if (!sessionId || !shopId) return;

      try {
        const response = await axios.get(
          `https://retail-alvinia-goza-f6a0e4f7.koyeb.app/shops/${shopId}/combined/`,
          {
            headers: {
              Authorization: sessionId,
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
          is_open: data.shop.is_open,
        });
        setReviews(data.reviews);
        setFollowerCount(data.follower_count);
        setFollowers(data.followers || []);
        setPosts(data.posts);
        setPlan(data.plan);
        console.log('Posts:', JSON.stringify(data.posts, null, 2));
        console.log('Plan:', data.plan);

        setError('');
      } catch (error) {
        console.error('Error fetching shop data:', error);
        setError('Failed to fetch shop data. Please try again later.');
      }
    };

    fetchShopData();
  }, [sessionId, shopId]);

  const handleTabChange = (tab) => {
    console.log('Tab tapped:', tab);
    setActiveTab(tab);
  };

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

      if (Platform.OS === 'android') {
        ToastAndroid.show('Profile ID copied!', ToastAndroid.SHORT);
      } else {
        Alert.alert('Copied', 'Profile ID copied to clipboard!');
      }

      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
      <LinearGradient colors={['#E3F2FD', '#BBDEFB']} style={styles.container}>
        {/* Back Button Header */}
        <View style={styles.header}>
          <View style={styles.backContainer}>
            <TouchableOpacity
              onPress={() => {
                console.log('Back button tapped');
                router.back();
              }}
              style={styles.backButton}
            >
              <MaterialIcons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
          </View>
          <View style={styles.shopIdContainer}>
            <Text style={styles.shopIdLabel}>SPACE ID:</Text>
            <Text style={styles.shopId}>{shop.shop_id}</Text>
            <TouchableOpacity onPress={copyToClipboard} style={styles.copyButton}>
              <Ionicons
                name={copied ? 'checkmark-circle' : 'copy-outline'}
                size={22}
                color={copied ? '#4CAF50' : 'white'}
              />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="interactive"
        >
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
                  name={shop.is_open ? 'checkmark-circle' : 'alert-circle'}
                  size={18}
                  color={shop.is_open ? '#4CAF50' : '#FF9800'}
                />
                <Text
                  style={[
                    styles.shopStatusText,
                    shop.is_open ? styles.shopOpen : styles.shopClosed,
                  ]}
                >
                  {shop.is_open ? 'Open' : 'Closed'}
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
                <FollowButton
                  shopId={shopId}
                  onPress={() => console.log('FollowButton tapped')}
                />
                <TouchableOpacity
                  style={styles.messageButton}
                  onPress={() => {
                    console.log('Message button tapped');
                    router.push({
                      pathname: '/shop/StartConversation',
                      params: { shopId: shopId, name: shop.name },
                    });
                  }}
                >
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={18}
                    color="#FFF"
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.buttonText}>Message</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Shop Details */}
          <View style={styles.details}>
            <Text style={styles.description}>{shop.description}</Text>
            <Text style={styles.category}>
              {shop.categories && Array.isArray(shop.categories)
                ? shop.categories.map((cat) => cat.name).join(', ')
                : 'No categories available'}
            </Text>
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
                  style={[styles.navTabText, activeTab === tab && styles.activeTabText]}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab Content */}
          <View style={styles.tabContent}>
            {activeTab === 'posts' &&
              (plan === null || plan === '' ? (
                <Text style={styles.noPostsText}>No posts available</Text>
              ) : (
                <View style={styles.postsContainer}>
                  <ShopPosts posts={posts} scrollEnabled={false} />
                </View>
              ))}
            {activeTab === 'products' && (
              <ShopProduct key={shopId} products={shop.products} />
            )}
            {activeTab === 'services' && (
              <ShopProduct key={shopId} products={shop.products} />
            )}
            {activeTab === 'customers' && <Followers followers={followers} />}
            {activeTab === 'reviews' && (
              <View style={[styles.reviewsContainer, { keyboardShouldPersistTaps: 'always' }]}>
                <ReviewForm shopId={shopId} onReviewSubmitted={handleReviewSubmitted} />
                {/* <ShopReview reviews={reviews} /> */}
                <ShopReview reviews={reviews} />
              </View>
            )}
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
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
    backgroundColor: '#3A7BD5',
    shadowColor: '#000',
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
    padding: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  content: {
    padding: 15,
    marginTop: -25,
    paddingBottom: 20,
  },
  shopHeader: {
    flexDirection: 'row',
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
    paddingHorizontal: 12,
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
    fontSize: 13,
  },
  buttonIcon: {
    marginRight: 5,
  },
  details: {
    marginVertical: 5,
  },
  category: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34495e',
  },
  description: {
    fontSize: 14,
    color: 'black',
    lineHeight: 22,
    marginBottom: 16,
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
  shopIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopIdLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    marginRight: 8,
    fontWeight: '700',
  },
  shopId: {
    fontSize: 16,
    color: '#FFFFFF',
    marginRight: 1,
  },
  copyButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  shopStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 0,
    borderRadius: 6,
    marginBottom: 5,
    alignSelf: 'flex-start',
  },
  shopStatusText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  shopOpen: {
    color: '#4CAF50',
  },
  shopClosed: {
    color: '#FF9800',
  },
  noPostsText: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    marginTop: 20,
  },
  postsContainer: {
    minHeight: 300,
    maxHeight: 600,
  },
  reviewsContainer: {
    minHeight: 300,
    maxHeight: 600,
  },
});

export default ShopPage;