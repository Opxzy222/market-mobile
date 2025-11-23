import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  Modal,
  ActivityIndicator,
  Switch,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useInterstitialAd } from '../../components/AdMobManager';
import SubscriptionRequired from '@/components/RequiredSubscription';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { ZoomIn } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFullUrl } from '../../utils/imageUtils';

const screenWidth = Dimensions.get('window').width;
const SEARCH_AD_THRESHOLD = 3;

const SearchResults = () => {
  const params = useLocalSearchParams();
  const { searchTerm, shops } = params;
  const { showInterstitial, adLoaded } = useInterstitialAd();
  const router = useRouter();

  const [modalVisible, setModalVisible] = useState(false);
  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);
  const [showAd, setShowAd] = useState(false);
  const [tempIsVerified, setTempIsVerified] = useState(false);
  const [tempIsPremium, setTempIsPremium] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Filter states
  const [tempMinRating, setTempMinRating] = useState(0);
  const [tempMaxRating, setTempMaxRating] = useState(5);
  const [tempMinDistance, setTempMinDistance] = useState(0);
  const [tempMaxDistance, setTempMaxDistance] = useState(50);
  const [minRating, setMinRating] = useState(0);
  const [maxRating, setMaxRating] = useState(5);
  const [minDistance, setMinDistance] = useState(0);
  const [maxDistance, setMaxDistance] = useState(50);

  // Subscription state from AsyncStorage
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  // Memoize allDistancesNull
  const allDistancesNull = useMemo(
    () => Array.isArray(searchResults) && searchResults.length > 0 && searchResults.every((shop) => shop?.distance == null),
    [searchResults]
  );

  // Refs
  const isMountedRef = useRef(true);
  const isShowingAdRef = useRef(false);
  const lastAdCheckTimeRef = useRef(0);

  // Cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Load subscription from AsyncStorage
  useEffect(() => {
    const loadSubscription = async () => {
      try {
        const cache = await AsyncStorage.getItem("subscription_cache");
        if (cache) {
          const parsed = JSON.parse(cache);
          setSubscriptionStatus(parsed.plan?.toLowerCase() || null);
        } else {
          setSubscriptionStatus(null);
        }
      } catch (error) {
        console.error("Failed to load subscription_cache:", error);
        setSubscriptionStatus(null);
      } finally {
        setSubscriptionLoading(false);
      }
    };
    loadSubscription();
  }, []);

  // Load search results
  useEffect(() => {
    try {
      const shopsArray = shops ? JSON.parse(shops) : [];
      if (Array.isArray(shopsArray) && shopsArray.length > 0) {
        const limitedShops = shopsArray.slice(0, 50);
        setSearchResults(limitedShops);
        setFilteredResults(limitedShops);
        setTimeout(() => {
          limitedShops.forEach((shop) => {
            if (shop.image) {
              Image.prefetch(getFullUrl(shop.image));
            }
          });
        }, 0);
        setIsDataLoaded(true);
      } else {
        setSearchResults([]);
        setFilteredResults([]);
        setIsDataLoaded(true);
      }
    } catch (error) {
      console.error('Error parsing shops:', error);
      setSearchResults([]);
      setFilteredResults([]);
      setIsDataLoaded(true);
    }
  }, [shops]);

  // Filter logic
  useEffect(() => {
    if (!Array.isArray(searchResults) || searchResults.length === 0) {
      setFilteredResults([]);
      return;
    }

    const results = searchResults.filter((shop) => {
      if (!shop || typeof shop !== 'object') return false;

      const rating = shop.average_rating ?? 0;
      const distance = shop.distance ?? null;
      const isShopVerified = shop.verified ?? false;
      const isShopPremium = shop.plan === 'standard' || shop.plan === 'premium';

      const ratingCheck = rating >= minRating && rating <= maxRating;
      let distanceCheck = true;

      if (!allDistancesNull && distance !== null) {
        distanceCheck = distance >= minDistance && distance <= maxDistance;
      }

      const verifiedCheck = !isVerified || (isVerified && isShopVerified);
      const premiumCheck = !isPremium || (isPremium && isShopPremium);

      return ratingCheck && distanceCheck && verifiedCheck && premiumCheck;
    });

    if (isMountedRef.current) {
      setFilteredResults(results);
    }
  }, [minRating, maxRating, minDistance, maxDistance, isVerified, isPremium, searchResults, allDistancesNull]);

  // Ad logic
  useFocusEffect(
    useCallback(() => {
      const checkAd = async () => {
        const now = Date.now();
        if (now - lastAdCheckTimeRef.current < 2000) return;
        lastAdCheckTimeRef.current = now;

        if (subscriptionLoading || !isMountedRef.current || isShowingAdRef.current) return;

        const isFreeUser = !['standard', 'premium'].includes(subscriptionStatus || '');

        if (isFreeUser && adLoaded) {
          const count = parseInt(await AsyncStorage.getItem('searchCount') || '0', 10);
          if (count >= SEARCH_AD_THRESHOLD) {
            isShowingAdRef.current = true;
            setShowAd(true);
            try {
              await showInterstitial();
              await AsyncStorage.setItem('searchCount', '0');
            } catch (error) {
              console.error('Error displaying ad:', error);
            } finally {
              setShowAd(false);
              isShowingAdRef.current = false;
            }
          }
        }
      };

      setTimeout(checkAd, 100);
    }, [subscriptionStatus, subscriptionLoading, adLoaded, showInterstitial])
  );

  // Handle Filter Press
  const handleFilterPress = useCallback(() => {
    if (['standard', 'premium'].includes(subscriptionStatus || '')) {
      setModalVisible(true);
    } else {
      setSubscriptionModalVisible(true);
    }
  }, [subscriptionStatus]);

  // Apply Filters
  const applyFilters = useCallback(() => {
    setMinRating(tempMinRating);
    setMaxRating(tempMaxRating);
    if (!allDistancesNull) {
      setMinDistance(tempMinDistance);
      setMaxDistance(tempMaxDistance);
    }
    setIsVerified(tempIsVerified);
    setIsPremium(tempIsPremium);
    setModalVisible(false);
  }, [tempMinRating, tempMaxRating, tempMinDistance, tempMaxDistance, tempIsVerified, tempIsPremium, allDistancesNull]);

  // Reset Filters
  const resetFilters = useCallback(() => {
    setTempMinRating(0);
    setTempMaxRating(5);
    setMinRating(0);
    setMaxRating(5);
    if (!allDistancesNull) {
      setTempMinDistance(0);
      setTempMaxDistance(50);
      setMinDistance(0);
      setMaxDistance(50);
    }
    setTempIsVerified(false);
    setTempIsPremium(false);
    setIsVerified(false);
    setIsPremium(false);
    setFilteredResults(Array.isArray(searchResults) ? searchResults : []);
    setModalVisible(false);
  }, [allDistancesNull, searchResults]);

  // Render Shop Card
  const renderShopCard = useCallback(
    ({ item }) => (
      <LinearGradient colors={['rgba(255,255,255,0.6)', 'rgba(240,240,240,0.4)']} style={styles.shopCard}>
        <View style={styles.imageContainer}>
          <View style={styles.ratingContainer}>
            {item.verified && (
              <View style={styles.ownerVerifiedBadge}>
                <MaterialIcons name="person" size={16} color="#0FA958" />
                <View style={styles.verifiedIconOverlay}>
                  <MaterialIcons name="verified" size={10} color="#0FA958" />
                </View>
              </View>
            )}
            {item.average_rating !== null && (
              <View style={styles.ratingBadge}>
                <MaterialIcons name="star" size={12} color="#FFD700" />
                <Text style={styles.ratingText}>{item.average_rating.toFixed(1)}</Text>
              </View>
            )}
            {(item.plan === 'standard' || item.plan === 'premium') && (
              <View style={styles.planBadge}>
                <MaterialIcons name="diamond" size={12} color="#FFFFFF" />
              </View>
            )}
          </View>
          {item.image ? (
            <Image
              source={{ uri: getFullUrl(item.image) }}
              style={styles.shopImage}
              resizeMode="cover"
              onError={(e) => console.error(`Image load error for shop ${item.id}:`, e.nativeEvent.error)}
            />
          ) : (
            <View style={styles.noImageContainer}>
              <Text style={styles.noImageText}>No Image</Text>
            </View>
          )}
        </View>
        <View style={styles.detailsContainer}>
          <Text style={styles.shopName}>{item.name || 'Unnamed Shop'}</Text>
          <View style={styles.row}>
            <MaterialIcons name="store" size={16} color="#4CAF50" />
            <Text style={styles.shopAddress}>{item.address || 'No Address'}</Text>
          </View>
          <View style={styles.row}>
            <MaterialIcons name="place" size={16} color="#555" />
            <Text style={styles.shopDistance}>
              Distance: {item.distance !== null && item.distance !== undefined ? `${item.distance.toFixed(1)} km` : 'N/A'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.goToShopButton}
          onPress={() => {
            router.push({
              pathname: '/shop/shop-page',
              params: { shopId: item.id },
            });
          }}
        >
          <Text style={styles.buttonText}>Go to Space</Text>
        </TouchableOpacity>
      </LinearGradient>
    ),
    [router]
  );

  const keyExtractor = useCallback((item) => item.id.toString(), []);
  const getItemLayout = useCallback((data, index) => ({
    length: 150,
    offset: 150 * index,
    index,
  }), []);

  const FilterModalContent = useMemo(() => (
    <Animated.View entering={ZoomIn.duration(500)} style={styles.modalContent}>
      <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseButton}>
        <Ionicons name="close" size={28} color="#333" />
      </TouchableOpacity>
      <View style={{ width: '100%', minHeight: 400 }}>
        <Text style={styles.filterTitle}>Filter Options</Text>
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>Rating: {tempMinRating.toFixed(1)} - {tempMaxRating.toFixed(1)}</Text>
          <Slider
            minimumValue={0}
            maximumValue={5}
            step={0.1}
            value={tempMinRating}
            onValueChange={setTempMinRating}
            minimumTrackTintColor="#2563EB"
            thumbTintColor="#2563EB"
            style={styles.slider}
          />
          <Slider
            minimumValue={0}
            maximumValue={5}
            step={0.1}
            value={tempMaxRating}
            onValueChange={setTempMaxRating}
            minimumTrackTintColor="#2563EB"
            thumbTintColor="#2563EB"
            style={styles.slider}
          />
        </View>
        {!allDistancesNull && (
          <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>
              Distance: {tempMinDistance.toFixed(1)} - {tempMaxDistance.toFixed(1)} km
            </Text>
            <Slider
              minimumValue={0}
              maximumValue={50}
              step={0.1}
              value={tempMinDistance}
              onValueChange={setTempMinDistance}
              minimumTrackTintColor="#2563EB"
              thumbTintColor="#2563EB"
              style={styles.slider}
            />
            <Slider
              minimumValue={0}
              maximumValue={50}
              step={0.1}
              value={tempMaxDistance}
              onValueChange={setTempMaxDistance}
              minimumTrackTintColor="#2563EB"
              thumbTintColor="#2563EB"
              style={styles.slider}
            />
          </View>
        )}
        {allDistancesNull && (
          <Text style={styles.noDistanceText}>Distance filtering unavailable for this search.</Text>
        )}
        <View style={styles.switchContainer}>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Owner Verified Only</Text>
            <Switch
              value={tempIsVerified}
              onValueChange={setTempIsVerified}
              trackColor={{ false: '#D1D5DB', true: '#2563EB' }}
              thumbColor={tempIsVerified ? '#FFFFFF' : '#F4F4F5'}
            />
          </View>
          <Text style={styles.switchDescription}>Show only spaces with verified owners.</Text>
        </View>
        <View style={styles.switchContainer}>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Standard Space Only</Text>
            <Switch
              value={tempIsPremium}
              onValueChange={setTempIsPremium}
              trackColor={{ false: '#D1D5DB', true: '#2563EB' }}
              thumbColor={tempIsPremium ? '#FFFFFF' : '#F4F4F5'}
            />
          </View>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity onPress={resetFilters} style={styles.resetButton}>
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={applyFilters} style={styles.applyButton}>
            <Text style={styles.applyButtonText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  ), [tempMinRating, tempMaxRating, tempMinDistance, tempMaxDistance, tempIsVerified, tempIsPremium, allDistancesNull, applyFilters, resetFilters]);

  // Loading UI
  if (subscriptionLoading || showAd || !isDataLoaded) {
    return (
      <SafeAreaView style={styles.loader}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loaderText}>
          {showAd ? 'Loading Ad...' : !isDataLoaded ? 'Loading Results...' : 'Loading...'}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
      <LinearGradient colors={['#F5F5F5', '#E0E0E0']} style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.navigate('(tabs)/shop')} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Results for: {searchTerm || 'Search'}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <TouchableOpacity onPress={handleFilterPress} style={styles.filterContainer}>
          <Ionicons name="filter-outline" size={20} color="#007BFF" style={styles.filterIcon} />
          <Text style={styles.filterText}>Filter</Text>
        </TouchableOpacity>

        {searchResults.length === 0 ? (
          <Text style={styles.noResults}>No shops found for your search.</Text>
        ) : (
          <FlatList
            data={filteredResults}
            keyExtractor={keyExtractor}
            renderItem={renderShopCard}
            getItemLayout={getItemLayout}
            ListEmptyComponent={
              <Text style={styles.noResults}>No shops match the applied filters.</Text>
            }
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
          />
        )}
      </LinearGradient>

      {/* Subscription Modal - NO WRAPPER, LET COMPONENT HANDLE IT */}
      <SubscriptionRequired
        visible={subscriptionModalVisible}
        onClose={() => setSubscriptionModalVisible(false)}
      />

      {/* Filter Modal */}
      <Modal visible={modalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
              {FilterModalContent}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ────── STYLES (UNCHANGED) ──────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#3A7BD5',
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    shadowColor: '#000',
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
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
    numberOfLines: 1,
    ellipsizeMode: 'tail',
  },
  headerSpacer: {
    width: 42,
  },
  shopCard: {
    borderRadius: 18,
    padding: 12,
    marginVertical: 8,
    marginHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  ratingContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  ownerVerifiedBadge: {
    position: 'relative',
    backgroundColor: '#E3FCEF',
    padding: 4,
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
  verifiedIconOverlay: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#E3FCEF',
    borderRadius: 8,
    padding: 1,
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
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6D28D9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#8B5CF6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
    marginRight: 4,
  },
  imageContainer: {
    marginBottom: 8,
  },
  shopImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  noImageContainer: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    fontSize: 14,
    color: '#888',
  },
  shopName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
  },
  detailsContainer: {
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  shopAddress: {
    fontSize: 14,
    color: '#444',
    marginLeft: 6,
  },
  shopDistance: {
    fontSize: 14,
    color: '#444',
    marginLeft: 6,
  },
  goToShopButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    textTransform: 'uppercase',
  },
  noResults: {
    textAlign: 'center',
    fontSize: 16,
    color: '#6B7280',
    marginTop: 20,
    fontWeight: '500',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  filterText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    flexGrow: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
    width: '100%',
    minHeight: Dimensions.get('window').height * 0.8,
  },
  modalContent: {
    flex: 1,
    justifyContent: 'flex-start',
    width: '100%',
    minHeight: 400,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 10,
    zIndex: 1000,
  },
  filterTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
    color: '#1F2937',
  },
  sliderContainer: {
    marginBottom: 16,
    width: '100%',
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 10,
  },
  slider: {
    width: '100%',
    height: 40,
    marginBottom: 8,
  },
  noDistanceText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  switchContainer: {
    marginBottom: 16,
    width: '100%',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  switchDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    width: '100%',
  },
  resetButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  resetButtonText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginLeft: 8,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loaderText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
});

export default SearchResults;