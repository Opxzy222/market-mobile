// app/(tabs)/ShopHomePage.tsx  (or wherever your file is)
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  FlatList,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '../../components/shop/Header';
import FollowedShops from '../../components/shop/FollowedShops';
import SearchBar from '../../components/shop/SearchBar';
import Categories from '../../components/shop/Categories';
import RecentShops from '../../components/shop/RecentShops';
import AdMobManager from '../../components/AdMobManager';
import api from '../../api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearNonSuggestionData } from '../../storage/storage';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';

// ────────────────────── AUTH GUARD ──────────────────────
import { useAuthGuard } from '../../hooks/useAuthGuard'; // ← ADDED

const ShopHomePage = () => {
  // ───── BLOCK RENDER IF NOT LOGGED IN ─────
  useAuthGuard();

  // ───── State ─────
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [data, setData] = useState({
    categories: [],
    followed_shops: [],
    recently_visited_shops: [],
  });
  const [suggestionsHeight, setSuggestionsHeight] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPopulating, setIsPopulating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [modalTitle, setModalTitle] = useState('Setting Up Your Dashboard');
  const [modalSubtitle, setModalSubtitle] = useState('Please hold on this could take a few minutes...');

  const hasFetchedOnceRef = useRef(false);
  const flatListRef = useRef(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = 60;

  // ───── Load Subscription Cache ─────
  useEffect(() => {
    const load = async () => {
      try {
        const cache = await AsyncStorage.getItem('subscription_cache');
        if (cache) {
          const parsed = JSON.parse(cache);
          setSubscriptionPlan(parsed.plan?.toLowerCase() || null);
        }
      } catch (e) {
        console.error('Failed to load subscription_cache:', e);
      } finally {
        setSubscriptionLoading(false);
      }
    };
    load();
  }, []);

  // ───── Cache Helpers ─────
  const isValidCache = (d: any) =>
    d &&
    (d.categories?.length > 0 ||
      d.followed_shops?.length > 0 ||
      d.recently_visited_shops?.length > 0);

  const loadCachedData = async (): Promise<boolean> => {
    try {
      const cached = await AsyncStorage.getItem('shopDashboardData');
      const ts = await AsyncStorage.getItem('shopDashboardDataTimestamp');
      const isFresh = ts && Date.now() - parseInt(ts) < 5 * 60 * 1000;

      if (cached && isFresh) {
        const parsed = JSON.parse(cached);
        if (isValidCache(parsed)) {
          setData(parsed);
          setIsLoading(false);
          return true;
        }
      }
      return false;
    } catch (e) {
      console.error('Cache load error:', e);
      return false;
    }
  };

  // ───── Fetch Dashboard Data ─────
  const fetchData = async () => {
    try {
      setNetworkError(false);
      const token = await AsyncStorage.getItem('sessionToken');
      if (!token) {
        await clearNonSuggestionData();
        setData({ categories: [], followed_shops: [], recently_visited_shops: [] });
        router.replace('/login');
        return;
      }

      const res = await api.get('/shop-dashboard-overview/', {
        headers: { Authorization: token },
      });

      const newData = res.data;
      setData(newData);

      // === CRITICAL: Sync verification_status and clean up old pending flag ===
      const verificationStatus = newData.verification_status || 'not_started';

      // If verification is complete (success or failed), remove old pending flag
      if (verificationStatus === 'verified' || verificationStatus === 'failed') {
        await AsyncStorage.removeItem('pending_qoreid_verification');
      }


      await AsyncStorage.multiSet([
        ['shopDashboardData', JSON.stringify(newData)],
        ['shopDashboardDataTimestamp', Date.now().toString()],
        ['user_verified', JSON.stringify(newData.user_verified)],
        ['phone_verified', JSON.stringify(newData.phone_verified)],
        ['shop_id', JSON.stringify(newData.shop_id)],
        ['verification_status', verificationStatus],
        [
          'subscription_cache',
          JSON.stringify({
            plan: newData.plan,
            is_active: newData.is_active,
            start_date: newData.start_date,
            end_date: newData.end_date,
          }),
        ],
      ]);
      console.log('shop id', newData.shop_id)

      setSubscriptionPlan(newData.plan?.toLowerCase() || null);
      hasFetchedOnceRef.current = true;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        await clearNonSuggestionData();
        await AsyncStorage.removeItem('sessionToken');
        router.replace('/login');
      } else {
        console.error('Network error:', error);
        setNetworkError(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ───── Initialize on Focus (Only if logged in) ─────
  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        const hasCache = await loadCachedData();
        if (!hasCache) {
          await fetchData();
        }
      };
      init();
    }, [])
  );

  // ───── Handlers ─────
  const handleSuggestionsStateChange = useCallback(
    ({ showSuggestions, suggestionsHeight }: { showSuggestions: boolean; suggestionsHeight: number }) => {
      setShowSuggestions(showSuggestions);
      setSuggestionsHeight(showSuggestions ? suggestionsHeight : 0);
    },
    []
  );

  const handleFocusChange = useCallback((focused: boolean) => setInputFocused(focused), []);
  const handlePopulationStateChange = useCallback(
    ({ isPopulating, progress }: { isPopulating: boolean; progress: number }) => {
      setIsPopulating(isPopulating);
      setProgress(progress);
      setModalTitle(progress >= 99 ? 'Finalizing Your Dashboard' : 'Setting Up Your Dashboard');
      setModalSubtitle(progress >= 99 ? 'Almost ready...' : 'Please hold on this could take a few minutes...');
    },
    []
  );

  const handleReload = useCallback(() => {
    setIsLoading(true);
    fetchData();
  }, []);

  // ───── Sections for FlatList ─────
  const sections = useMemo(
    () => [
      { type: 'header', id: 'header' },
      {
        type: 'searchBar',
        id: 'searchBar',
        onSuggestionsStateChange: handleSuggestionsStateChange,
        onFocusChange: handleFocusChange,
        onPopulationStateChange: handlePopulationStateChange,
      },
      { type: 'categories', id: 'categories', data: data.categories },
      { type: 'followedShops', id: 'followedShops', data: data.followed_shops },
      { type: 'recentShops', id: 'recentShops', data: data.recently_visited_shops },
    ],
    [
      data.categories,
      data.followed_shops,
      data.recently_visited_shops,
      handleSuggestionsStateChange,
      handleFocusChange,
      handlePopulationStateChange,
    ]
  );

  const renderSection = ({ item }: { item: any }) => {
    switch (item.type) {
      case 'header':
        return <View />;
      case 'searchBar':
        return (
          <SearchBar
            onSuggestionsStateChange={item.onSuggestionsStateChange}
            onFocusChange={item.onFocusChange}
            onPopulationStateChange={item.onPopulationStateChange}
          />
        );
      case 'categories':
        return <Categories categories={item.data} />;
      case 'followedShops':
        return <FollowedShops shops={item.data} />;
      case 'recentShops':
        return <RecentShops shops={item.data} />;
      default:
        return <View />;
    }
  };

  // ───── Early Returns ─────
  if (subscriptionLoading || isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: '#F7FAFC' }]}>
        <StatusBar barStyle="light-content" backgroundColor="#3A7BD5" />
        <View style={styles.loadingContainer}>
          <MaterialIcons name="store" size={40} color="#2563EB" />
          <Text style={styles.loadingText}>Loading your dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (networkError) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: '#F7FAFC' }]}>
        <StatusBar barStyle="light-content" backgroundColor="#3A7BD5" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load data due to a network issue.</Text>
          <TouchableOpacity style={styles.reloadButton} onPress={handleReload}>
            <MaterialIcons name="refresh" size={24} color="#FFF" />
            <Text style={styles.reloadButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isFreeUser = !['standard', 'premium'].includes(subscriptionPlan || '');

  // ───── Main Render ─────
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#F7FAFC' }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#3A7BD5" />
      <View style={styles.headerContainer}>
        <Header />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 20}
      >
        <LinearGradient colors={['#E3F2FD', '#BBDEFB']} style={styles.container}>
          <FlatList
            ref={flatListRef}
            data={sections}
            renderItem={renderSection}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.flatListContent,
              { paddingBottom: suggestionsHeight + insets.bottom + TAB_BAR_HEIGHT + 10 },
            ]}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            scrollEnabled
            scrollEventThrottle={16}
            ListFooterComponent={
              <View style={styles.footerContainer}>
                {isFreeUser && (
                  <View style={styles.adContainer}>
                    <AdMobManager />
                  </View>
                )}
                <View style={[styles.footerSpacer, { height: insets.bottom + TAB_BAR_HEIGHT }]} />
              </View>
            }
          />
        </LinearGradient>
      </KeyboardAvoidingView>

      {/* Progress Modal */}
      <Modal visible={isPopulating} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <Text style={styles.modalSubtitle}>{modalSubtitle}</Text>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(progress)}%</Text>
            <ActivityIndicator size="large" color="#2563EB" style={styles.modalLoader} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ───── Styles (unchanged) ─────
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerContainer: { backgroundColor: '#F7FAFC' },
  keyboardAvoidingView: { flex: 1 },
  container: { flex: 1, backgroundColor: '#F7FAFC' },
  flatListContent: { paddingTop: 10 },
  footerContainer: { alignItems: 'center' },
  adContainer: { width: '100%', alignItems: 'center' },
  footerSpacer: {},
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
  errorText: {
    fontSize: 16,
    color: '#111827',
    textAlign: 'center',
    marginBottom: 20,
  },
  reloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  reloadButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  progressBarContainer: {
    width: '100%',
    height: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 5,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 20,
  },
  modalLoader: { marginTop: 10 },
});

export default ShopHomePage;