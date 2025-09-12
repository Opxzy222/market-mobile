import React, { useState, useEffect, useContext } from 'react';
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
  StatusBar,
  Animated,
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
import AdMobManager from '../../components/AdMobManager';
import { SubscriptionContext } from '../../components/SubscriptionProvider';
import { getFullUrl } from '../../utils/imageUtils';
import { format, parseISO } from 'date-fns'; // Import date-fns for date formatting

const ShopPage = () => {
  const { subscriptionStatus, loading } = useContext(SubscriptionContext);
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
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [descriptionAnim] = useState(new Animated.Value(0));
  const [statusAnim] = useState(new Animated.Value(0));

  const fetchShopData = async () => {
    if (!sessionId || !shopId) return;

    try {
      const response = await axios.get(
        `https://retail-alvinia-goza-f6a0e4f7.koyeb.app/shops/${shopId}/combined/`,
        { headers: { Authorization: sessionId } }
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
        average_rating: typeof data.shop.average_rating === 'number' ? data.shop.average_rating : null,
        owner_is_verified: data.shop.owner_is_verified || false,
        created_at: data.shop.created_at, // Add created_at to shop state
      });
      setReviews(data.reviews);
      setFollowerCount(data.follower_count);
      setFollowers(data.followers || []);
      setPosts(data.posts);
      setPlan(data.plan);
      setError('');
      if (data.shop.image) {
        const imageUrl = getFullUrl(data.shop.image);
        console.log('Prefetching shop image:', imageUrl);
        Image.prefetch(imageUrl);
      }
    } catch (error) {
      console.error('Error fetching shop data:', error);
      if (error.response && error.response.status === 404) {
        setError('This space no longer exists or has been removed.');
      } else {
        setError('Failed to fetch space data. Please try again later.');
      }
    }
  };

  useEffect(() => {
    const fetchSessionId = async () => {
      try {
        const sessionIdString = await AsyncStorage.getItem('sessionToken');
        setSessionId(sessionIdString);
      } catch (error) {
        console.error('Error fetching session token:', error);
      }
    };
    fetchSessionId();
  }, []);

  useEffect(() => {
    fetchShopData();
  }, [sessionId, shopId]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(statusAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(statusAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [statusAnim]);

  const statusAnimStyle = {
    transform: [
      {
        scale: statusAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.1],
        }),
      },
    ],
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleReviewSubmitted = (newReview) => {
    setReviews((prevReviews) => [newReview, ...prevReviews]);
  };

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

  const toggleDescription = () => {
    Animated.timing(descriptionAnim, {
      toValue: isDescriptionExpanded ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setIsDescriptionExpanded(!isDescriptionExpanded);
  };

  const showCategoryTooltip = (category) => {
    setSelectedCategory(category);
  };

  // Format the created_at date
  const formatCreatedAt = (dateString) => {
    try {
      const date = parseISO(dateString);
      return format(date, 'MMMM d, yyyy'); // e.g., "September 11, 2025"
    } catch (e) {
      console.error('Error formatting created_at date:', e);
      return 'Unknown date';
    }
  };

  const categoryGradients = [
    ['#6B7280', '#4B5563'],
    ['#1D4ED8', '#3B82F6'],
    ['#16A34A', '#22C55E'],
    ['#D97706', '#F59E0B'],
  ];

  if (loading || !shop || sessionId === null) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F7FAFC' }}>
        <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f39c12" />
          <Text style={styles.loadingText}>Loading space data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F7FAFC' }}>
        <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
        <LinearGradient colors={['#E3F2FD', '#BBDEFB']} style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          {error !== 'This space no longer exists or has been removed.' ? (
            <TouchableOpacity style={styles.reloadButton} onPress={fetchShopData}>
              <LinearGradient
                colors={['#3B82F6', '#1D4ED8']}
                style={styles.reloadButtonGradient}
              >
                <MaterialIcons name="refresh" size={24} color="#FFF" />
                <Text style={styles.reloadButtonText}>Retry</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.backButtonError} onPress={() => router.back()}>
              <LinearGradient
                colors={['#3B82F6', '#1D4ED8']}
                style={styles.backButtonGradient}
              >
                <MaterialIcons name="arrow-back" size={24} color="#FFF" />
                <Text style={styles.backButtonText}>Go Back</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
      <LinearGradient colors={['#E3F2FD', '#BBDEFB']} style={styles.container}>
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
          <View style={styles.shopHeader}>
            <View style={styles.shopImageContainer}>
              <Image
                source={{ uri: getFullUrl(shop.image) }}
                style={styles.backgroundImage}
                resizeMode="cover"
                onError={(e) => console.error(`Background image load error for shop ${shopId}:`, e.nativeEvent.error)}
              />
              <LinearGradient
                colors={['rgba(0, 0, 0, 0.7)', 'rgba(0, 0, 0, 0.5)']}
                style={styles.backgroundOverlay}
              />
              <Image
                source={{ uri: getFullUrl(shop.image) }}
                style={styles.shopImage}
                resizeMode="contain"
                onError={(e) => console.error(`Shop image load error for shop ${shopId}:`, e.nativeEvent.error)}
              />
              <View style={styles.imageGlow} />
              <LinearGradient
                colors={['rgba(0, 0, 0, 0.5)', 'transparent']}
                style={styles.imageOverlay}
              />
              <View style={styles.ratingBadgeContainer}>
                {typeof shop.average_rating === 'number' && !isNaN(shop.average_rating) && (
                  <View style={styles.ratingBadge}>
                    <MaterialIcons name="star" size={12} color="#FFD700" />
                    <Text style={styles.ratingText}>{shop.average_rating.toFixed(1)}</Text>
                  </View>
                )}
              </View>
              <View style={styles.verifiedContainer}>
                {shop.owner_is_verified && (
                  <View style={styles.verifiedBadge}>
                    <MaterialIcons name="verified" size={12} color="#0FA958" />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                )}
              </View>
              <Animated.View style={[styles.shopStatusOverlay, statusAnimStyle]}>
                <Ionicons
                  name={shop.is_open ? 'checkmark-circle' : 'alert-circle'}
                  size={16}
                  color={shop.is_open ? '#10B981' : '#EF4444'}
                />
                <Text style={styles.shopStatusText}>
                  {shop.is_open ? 'Open' : 'Closed'}
                </Text>
              </Animated.View>
            </View>
            <View style={styles.shopInfo}>
              <Text style={styles.shopName}>{shop.name}</Text>
              <View style={styles.addressContainer}>
                <MaterialIcons
                  name="store"
                  size={16}
                  color="#4CAF50"
                  style={styles.icon}
                />
                <Text style={styles.shopAddress} numberOfLines={3}>
                  {shop.address}
                </Text>
              </View>
              <View style={styles.mapContainer}>
                <ShopLocation shopLat={shop.latitude} shopLng={shop.longitude} />
              </View>
              <Text style={styles.followerCount}>{followers.length} Customers</Text>
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
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#1E40AF', '#1E3A8A']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.messageButtonGradient}
                  >
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={18}
                      color="#FFF"
                      style={styles.buttonIcon}
                    />
                    <Text style={styles.buttonText}>Message</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.details}>
            <LinearGradient
              colors={['#FFFFFF', '#F8FAFC']}
              style={styles.descriptionCard}
            >
              <View style={styles.descriptionHeader}>
                <MaterialIcons name="info-outline" size={24} color="#3B82F6" />
                <Text style={styles.descriptionTitle}>About</Text>
              </View>
              <Animated.Text
                style={[
                  styles.descriptionText,
                  {
                    height: descriptionAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [60, 200],
                    }),
                    overflow: 'hidden',
                  },
                ]}
                numberOfLines={isDescriptionExpanded ? undefined : 3}
              >
                {shop.description || 'No description available'}
              </Animated.Text>
              {/* Add Created At display */}
              {shop.created_at && (
                <View style={styles.createdAtContainer}>
                  <LinearGradient
                    colors={['#E5E7EB', '#D1D5DB']}
                    style={styles.createdAtBadge}
                  >
                    <MaterialIcons name="calendar-today" size={14} color="#4B5563" />
                    <Text style={styles.createdAtText}>
                      Created on {formatCreatedAt(shop.created_at)}
                    </Text>
                  </LinearGradient>
                </View>
              )}
              {shop.description && shop.description.length > 100 && (
                <TouchableOpacity
                  style={styles.readMoreButton}
                  onPress={toggleDescription}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#3B82F6', '#1D4ED8']}
                    style={styles.readMoreGradient}
                  >
                    <Text style={styles.readMoreText}>
                      {isDescriptionExpanded ? 'Read Less' : 'Read More'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </LinearGradient>
            <View style={styles.categoriesContainer}>
              <View style={styles.categoriesHeader}>
                <MaterialIcons name="category" size={24} color="#3B82F6" />
                <Text style={styles.categoriesTitle}>Categories</Text>
              </View>
              <View style={styles.categoriesWrapper}>
                {shop.categories && Array.isArray(shop.categories) && shop.categories.length > 0 ? (
                  shop.categories.map((cat, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => showCategoryTooltip(cat)}
                      style={styles.categoryBadge}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={categoryGradients[index % categoryGradients.length]}
                        style={styles.categoryBadgeGradient}
                      >
                        <Text style={styles.categoryBadgeText}>{cat.name}</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={[styles.categoryBadge, styles.noCategoryBadge]}>
                    <Text style={[styles.categoryBadgeText, styles.noCategoryBadgeText]}>
                      No categories available
                    </Text>
                  </View>
                )}
              </View>
              {selectedCategory && (
                <View style={styles.categoryTooltip}>
                  <Text style={styles.categoryTooltipText}>
                    {selectedCategory.name || 'Category'} - Explore products and services in this category.
                  </Text>
                  <TouchableOpacity
                    style={styles.closeTooltipButton}
                    onPress={() => setSelectedCategory(null)}
                  >
                    <Text style={styles.closeTooltipText}>Close</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          <View style={styles.nav}>
            {(shop.category?.name === 'Services'
              ? ['posts', 'services', 'customers', 'reviews']
              : ['posts', 'products', 'customers', 'reviews']
            ).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.navTab, activeTab === tab && styles.activeTab]}
                onPress={() => handleTabChange(tab)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.navTabText, activeTab === tab && styles.activeTabText]}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
                {activeTab === tab && <View style={styles.activeTabIndicator} />}
              </TouchableOpacity>
            ))}
          </View>

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
                <ShopReview reviews={reviews} />
              </View>
            )}
          </View>
          {!['regular', 'standard', 'premium'].includes(subscriptionStatus) && (
            <View style={styles.adContainer}>
              <AdMobManager />
            </View>
          )}
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
    backgroundColor: '#2563EB',
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
  content: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    marginTop: -14,
  },
  shopHeader: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 12,
    marginHorizontal: -4,
  },
  shopImageContainer: {
    position: 'relative',
    width: '100%',
    height: 140,
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    opacity: 0.1,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  backgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  shopImage: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    resizeMode: 'contain',
    padding: 6,
  },
  imageGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 2,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  ratingBadgeContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  verifiedContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    zIndex: 10,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    marginRight: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFD700',
    marginLeft: 4,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3FCEF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0FA958',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
    marginRight: 4,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0FA958',
    marginLeft: 4,
  },
  shopStatusOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  shopStatusText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 5,
    color: '#1F2937',
  },
  shopInfo: {
    padding: 12,
  },
  shopName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E40AF',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    marginBottom: 6,
    marginLeft: 0,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    flexWrap: 'wrap',
    marginLeft: 0,
  },
  icon: {
    marginTop: 2,
    marginRight: 6,
  },
  shopAddress: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    lineHeight: 20,
  },
  mapContainer: {
    alignItems: 'flex-start',
    marginBottom: 8,
    marginLeft: 0,
  },
  followerCount: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'left',
    marginLeft: 0,
  },
  buttonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10,
    marginLeft: 0,
  },
  messageButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  messageButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    minWidth: 100,
    gap: 6,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  buttonIcon: {
    marginRight: 6,
  },
  details: {
    marginVertical: 15,
  },
  descriptionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: -4, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  descriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  descriptionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  descriptionText: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  createdAtContainer: {
    marginTop: 12,
    alignItems: 'flex-start',
  },
  createdAtBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  createdAtText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '600',
    marginLeft: 6,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  readMoreButton: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  readMoreGradient: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  readMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  categoriesContainer: {
    marginBottom: 16,
  },
  categoriesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  categoriesTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  categoriesWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryBadge: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  categoryBadgeGradient: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  noCategoryBadge: {
    backgroundColor: '#E5E7EB',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  categoryBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  noCategoryBadgeText: {
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  categoryTooltip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryTooltipText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  closeTooltipButton: {
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  closeTooltipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    paddingHorizontal: 8,
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  navTabText: {
    fontSize: 16,
    color: '#4B5563',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  activeTabText: {
    color: '#3B82F6',
    fontWeight: '700',
  },
  activeTabIndicator: {
    width: '60%',
    height: 3,
    backgroundColor: '#3B82F6',
    borderRadius: 2,
    marginTop: 4,
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
  noPostsText: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  postsContainer: {},
  reviewsContainer: {
    minHeight: 300,
    maxHeight: 600,
  },
  adContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F7FAFC',
  },
  loadingText: {
    fontSize: 16,
    color: '#111827',
    textAlign: 'center',
    marginTop: 15,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F7FAFC',
  },
  reloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    overflow: 'hidden',
  },
  reloadButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  reloadButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  backButtonError: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 20,
  },
  backButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default ShopPage;