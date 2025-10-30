import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  Clipboard,
  ToastAndroid,
  Platform,
  StatusBar,
  Animated,
  Modal,
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import api from '../../api';
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
import { format, parseISO } from 'date-fns';

// Constants (aligned with Homepage.tsx for consistency)
const COLORS = {
  primary: "#1E3A8A",
  accent: "#FCD34D",
  background: "#F9FAFB",
  cardBackground: "#FFFFFF",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  white: "#FFFFFF",
  gradientStart: "#4B6CB7",
  gradientEnd: "#8B5CF6",
  goldAccent: "#D4A017",
  statusBar: "#4B6CB7",
  headerBg: "#3A7BD5",
  fabBg: "#4A5ABA",
  darkBackground: "#1F2937",
  darkCardBackground: "#374151",
  darkTextPrimary: "#F9FAFB",
  darkTextSecondary: "#D1D5DB",
  youtubeRed: "#FF0000",
};

const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

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
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);

  const fetchShopData = async () => {
    if (!sessionId || !shopId) return;

    try {
      const response = await api.get(`/shops/${shopId}/combined/`, {
        headers: { Authorization: sessionId },
      });
      const data = response.data;
      console.log('Shop image from API:', data.shop.image);

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
        average_rating:
          typeof data.shop.average_rating === 'number'
            ? data.shop.average_rating
            : null,
        owner_is_verified: data.shop.owner_is_verified || false,
        created_at: data.shop.created_at,
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
        ToastAndroid.show('Space ID copied!', ToastAndroid.SHORT);
      } else {
        Alert.alert('Copied', 'Space ID copied to clipboard!');
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

  const formatCreatedAt = (dateString) => {
    try {
      const date = parseISO(dateString);
      return format(date, 'MMMM d, yyyy');
    } catch (e) {
      console.error('Error formatting created_at date:', e);
      return 'Unknown date';
    }
  };

  const openImageModal = () => {
    if (shop?.image && getFullUrl(shop.image)) {
      console.log('Opening image modal for URL:', getFullUrl(shop.image));
      setIsImageModalVisible(true);
    } else {
      console.log('No valid image URL to open modal');
      if (Platform.OS === 'android') {
        ToastAndroid.show('No image available', ToastAndroid.SHORT);
      } else {
        Alert.alert('Error', 'No image available to display');
      }
    }
  };

  const closeImageModal = () => {
    console.log('Closing image modal');
    setIsImageModalVisible(false);
  };

  const categoryGradients = [
    ['#6B7280', '#4B5563'],
    ['#1D4ED8', '#3B82F6'],
    ['#16A34A', '#22C55E'],
    ['#D97706', '#F59E0B'],
  ];

  if (loading || !shop || sessionId === null) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.statusBar} />
        <LinearGradient
          colors={[COLORS.gradientStart, COLORS.gradientEnd]}
          style={styles.loadingContainer}
        >
          <Animatable.View
            animation={{
              0: { scale: 1, opacity: 1 },
              0.5: { scale: 1.2, opacity: 0.7 },
              1: { scale: 1, opacity: 1 },
            }}
            iterationCount="infinite"
            duration={1500}
            style={styles.loadingLogoContainer}
          >
            <Image
              source={require('../../../assets/images/icon1.png')}
              style={styles.loadingLogo}
              contentFit="contain"
              accessibilityLabel="Gogo Marketplace Loading Logo"
            />
          </Animatable.View>
          <Animatable.Text
            animation={{
              0: { opacity: 0.4 },
              0.5: { opacity: 1 },
              1: { opacity: 0.4 },
            }}
            iterationCount="infinite"
            duration={1500}
            style={styles.loadingText}
          >
            Loading business space...
          </Animatable.Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.statusBar} />
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
            <TouchableOpacity
              style={styles.backButtonError}
              onPress={() => router.back()}
            >
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
      <StatusBar barStyle="light-content" backgroundColor={COLORS.headerBg} />
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
                onError={(e) =>
                  console.error(
                    `Background image load error for shop ${shopId}:`,
                    e.nativeEvent.error
                  )
                }
              />
              <LinearGradient
                colors={['rgba(0, 0, 0, 0.7)', 'rgba(0, 0, 0, 0.5)']}
                style={styles.backgroundOverlay}
              />
              <TouchableOpacity
                onPress={openImageModal}
                activeOpacity={0.7}
                style={styles.imageTouchable}
              >
                <Image
                  source={{ uri: getFullUrl(shop.image) }}
                  style={styles.shopImage}
                  resizeMode="contain"
                  onError={(e) =>
                    console.error(
                      `Shop image load error for shop ${shopId}:`,
                      e.nativeEvent.error
                    )
                  }
                />
              </TouchableOpacity>
              <View style={styles.imageGlow} />
              <LinearGradient
                colors={['rgba(0, 0, 0, 0.5)', 'transparent']}
                style={styles.imageOverlay}
                pointerEvents="none"
              />
              <View style={styles.ratingBadgeContainer}>
                {typeof shop.average_rating === 'number' &&
                  !isNaN(shop.average_rating) && (
                    <View style={styles.ratingBadge}>
                      <MaterialIcons name="star" size={12} color="#FFD700" />
                      <Text style={styles.ratingText}>
                        {shop.average_rating.toFixed(1)}
                      </Text>
                    </View>
                  )}
              </View>
              <View style={styles.verifiedContainer}>
                {shop.owner_is_verified && (
                  <View style={styles.ownerVerifiedBadge}>
                    <MaterialIcons name="person" size={16} color="#0FA958" />
                    <View style={styles.verifiedIconOverlay}>
                      <MaterialIcons name="verified" size={10} color="#0FA958" />
                    </View>
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

          <Modal
            visible={isImageModalVisible}
            transparent={false}
            animationType="fade"
            onRequestClose={closeImageModal}
          >
            <SafeAreaView style={styles.fullScreenContainer}>
              <View style={styles.fullScreenImageContainer}>
                <Image
                  source={{ uri: getFullUrl(shop?.image) }}
                  style={styles.fullScreenImage}
                  resizeMode="contain"
                  onError={(e) =>
                    console.error(
                      `Full-screen image load error for shop ${shopId}:`,
                      e.nativeEvent.error
                    )
                  }
                />
                <TouchableOpacity
                  style={styles.closeModalButton}
                  onPress={closeImageModal}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="close" size={30} color="#FFF" />
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </Modal>

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
              {shop.created_at && (
                <View style={styles.createdAtContainer}>
                  <LinearGradient
                    colors={['#E5E7EB', '#D1D5DB']}
                    style={styles.createdAtBadge}
                  >
                    <MaterialIcons
                      name="calendar-today"
                      size={14}
                      color="#4B5563"
                    />
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
                {shop.categories &&
                Array.isArray(shop.categories) &&
                shop.categories.length > 0 ? (
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
                    <Text
                      style={[styles.categoryBadgeText, styles.noCategoryBadgeText]}
                    >
                      No categories available
                    </Text>
                  </View>
                )}
              </View>
              {selectedCategory && (
                <View style={styles.categoryTooltip}>
                  <Text style={styles.categoryTooltipText}>
                    {selectedCategory.name || 'Category'} - Explore products and
                    services in this category.
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
              <View
                style={[styles.reviewsContainer, { keyboardShouldPersistTaps: 'always' }]}
              >
                <ReviewForm
                  shopId={shopId}
                  onReviewSubmitted={handleReviewSubmitted}
                />
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
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    backgroundColor: COLORS.headerBg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: SPACING.sm,
  },
  backContainer: {},
  backButton: {
    padding: SPACING.sm,
    borderRadius: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  shopIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopIdLabel: {
    fontSize: 16,
    color: COLORS.white,
    marginRight: SPACING.sm,
    fontWeight: '700',
  },
  shopId: {
    fontSize: 16,
    color: COLORS.white,
    marginRight: SPACING.xs,
  },
  copyButton: {
    padding: SPACING.sm,
    borderRadius: SPACING.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  content: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.md,
    marginTop: -14,
  },
  shopHeader: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: SPACING.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: SPACING.md,
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
    borderTopLeftRadius: SPACING.md,
    borderTopRightRadius: SPACING.md,
  },
  backgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: SPACING.md,
    borderTopRightRadius: SPACING.md,
  },
  imageTouchable: {
    width: '100%',
    height: '100%',
    zIndex: 5,
  },
  shopImage: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: SPACING.md,
    borderTopRightRadius: SPACING.md,
    resizeMode: 'contain',
    padding: SPACING.sm,
  },
  imageGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: SPACING.md,
    shadowColor: COLORS.primary,
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
    borderTopLeftRadius: SPACING.md,
    borderTopRightRadius: SPACING.md,
  },
  ratingBadgeContainer: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  verifiedContainer: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    zIndex: 10,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    marginRight: SPACING.xs,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.goldAccent,
    marginLeft: SPACING.xs,
  },
  ownerVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3FCEF',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: SPACING.md,
    borderWidth: 1,
    borderColor: '#0FA958',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
    marginRight: SPACING.xs,
  },
  verifiedIconOverlay: {
    position: 'relative',
    bottom: 8,
    left: -4,
    backgroundColor: '#E3FCEF',
    borderRadius: 8,
    padding: 2,
  },
  shopStatusOverlay: {
    position: 'absolute',
    bottom: SPACING.sm,
    right: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
    zIndex: 10,
  },
  shopStatusText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: SPACING.xs,
    color: COLORS.textPrimary,
  },
  shopInfo: {
    padding: SPACING.md,
  },
  shopName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    marginBottom: SPACING.sm,
    marginLeft: 0,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
    flexWrap: 'wrap',
    marginLeft: 0,
  },
  icon: {
    marginTop: SPACING.xs,
    marginRight: SPACING.sm,
  },
  shopAddress: {
    fontSize: 14,
    color: COLORS.textPrimary,
    flex: 1,
    lineHeight: 20,
  },
  mapContainer: {
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
    marginLeft: 0,
  },
  followerCount: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    textAlign: 'left',
    marginLeft: 0,
  },
  buttonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: SPACING.md,
    marginLeft: 0,
  },
  messageButton: {
    borderRadius: SPACING.lg,
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
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: SPACING.lg,
    minWidth: 100,
    gap: SPACING.sm,
  },
  buttonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  buttonIcon: {
    marginRight: SPACING.sm,
  },
  details: {
    marginVertical: SPACING.lg,
  },
  descriptionCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: SPACING.lg,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: COLORS.white,
    shadowOffset: { width: -4, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  descriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  descriptionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  descriptionText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  createdAtContainer: {
    marginTop: SPACING.md,
    alignItems: 'flex-start',
  },
  createdAtBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: SPACING.md,
    backgroundColor: '#E5E7EB',
  },
  createdAtText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginLeft: SPACING.sm,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  readMoreButton: {
    marginTop: SPACING.md,
    borderRadius: SPACING.md,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  readMoreGradient: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: SPACING.md,
  },
  readMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  categoriesContainer: {
    marginBottom: SPACING.lg,
  },
  categoriesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  categoriesTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  categoriesWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  categoryBadge: {
    borderRadius: SPACING.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  categoryBadgeGradient: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: SPACING.lg,
  },
  noCategoryBadge: {
    backgroundColor: '#E5E7EB',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: SPACING.lg,
  },
  categoryBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  noCategoryBadgeText: {
    color: COLORS.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  categoryTooltip: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: SPACING.md,
    padding: SPACING.lg,
    marginTop: SPACING.md,
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
    color: COLORS.textPrimary,
    lineHeight: 20,
    marginBottom: SPACING.sm,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  closeTooltipButton: {
    alignSelf: 'flex-end',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: '#3B82F6',
    borderRadius: SPACING.sm,
  },
  closeTooltipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.cardBackground,
    borderRadius: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    paddingHorizontal: SPACING.sm,
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderRadius: SPACING.sm,
  },
  activeTab: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  navTabText: {
    fontSize: 16,
    color: COLORS.textSecondary,
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
    marginTop: SPACING.xs,
  },
  tabContent: {
    padding: SPACING.lg,
    backgroundColor: COLORS.cardBackground,
    borderRadius: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    marginTop: SPACING.sm,
  },
  noPostsText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  postsContainer: {},
  reviewsContainer: {
    minHeight: 300,
    maxHeight: 600,
  },
  adContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.cardBackground,
    borderRadius: SPACING.xl,
    margin: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: COLORS.white,
    shadowOffset: { width: -4, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  loadingLogoContainer: {
    marginBottom: SPACING.lg,
  },
  loadingLogo: {
    width: 80,
    height: 80,
  },
  loadingText: {
    fontSize: 18,
    color: COLORS.white,
    textAlign: 'center',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.cardBackground,
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  reloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: SPACING.md,
    overflow: 'hidden',
  },
  reloadButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: SPACING.md,
  },
  reloadButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: SPACING.sm,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  backButtonError: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: SPACING.md,
    overflow: 'hidden',
    marginTop: SPACING.xl,
  },
  backButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: SPACING.md,
  },
  backButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: SPACING.sm,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullScreenImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  closeModalButton: {
    position: 'absolute',
    top: SPACING.xl,
    right: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: SPACING.lg,
    zIndex: 20,
  },
});

export default ShopPage;