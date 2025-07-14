import React, { useState, useCallback, useMemo, useRef, useEffect, useContext } from 'react';
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
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '../../components/shop/Header';
import FollowedShops from '../../components/shop/FollowedShops';
import SearchBar from '../../components/shop/SearchBar';
import Categories from '../../components/shop/Categories';
import RecentShops from '../../components/shop/RecentShops';
import AdMobManager from '../../components/AdMobManager';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearNonSuggestionData } from '../../storage/storage';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import SubscriptionProvider, { SubscriptionContext } from '../../components/SubscriptionProvider';
import { LinearGradient } from 'expo-linear-gradient';

const ShopHomePage = () => {
  const { subscriptionStatus, loading } = useContext(SubscriptionContext);
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
  const [showBannerAd, setShowBannerAd] = useState(false);
  const hasFetchedOnceRef = useRef(false);
  const sessionTokenRef = useRef(null);
  const flatListRef = useRef(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = 60;
  const BANNER_AD_HEIGHT = 60;

  const loadCachedData = async () => {
    try {
      const sessionToken = await AsyncStorage.getItem('sessionToken');
      sessionTokenRef.current = sessionToken;
      if (!sessionToken) {
        await clearNonSuggestionData();
        setData({ categories: [], followed_shops: [], recently_visited_shops: [] });
        console.log('No session token, cleared stale data and reset state');
        router.push('/login');
        return false;
      }
      const cachedData = await AsyncStorage.getItem('shopDashboardData');
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        setData(parsedData);
        console.log('Loaded cached dashboard data:', parsedData);
        if (
          !parsedData.categories.length &&
          !parsedData.followed_shops.length &&
          !parsedData.recently_visited_shops.length
        ) {
          return false;
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error loading cached data:', error);
      setNetworkError(true);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setNetworkError(false);
      if (!sessionTokenRef.current) {
        sessionTokenRef.current = await AsyncStorage.getItem('sessionToken');
        console.log('Fetched sessionToken:', sessionTokenRef.current);
      }
      if (!sessionTokenRef.current) {
        console.log('No session token, skipping fetch');
        await clearNonSuggestionData();
        setData({ categories: [], followed_shops: [], recently_visited_shops: [] });
        router.push('/login');
        return;
      }

      const response = await axios.get(
        'https://retail-alvinia-goza-f6a0e4f7.koyeb.app/shop-dashboard-overview/',
        {
          headers: {
            Authorization: sessionTokenRef.current,
          },
        }
      );
      setData(response.data);
      await AsyncStorage.setItem('shopDashboardData', JSON.stringify(response.data));
      console.log('Fetched dashboard data:', response.data);
      hasFetchedOnceRef.current = true;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        console.log('Authentication failed (403), clearing data and navigating to login');
        await clearNonSuggestionData();
        setData({ categories: [], followed_shops: [], recently_visited_shops: [] });
        sessionTokenRef.current = null;
        router.push('/login');
      } else {
        console.error('Network error fetching dashboard data:', error);
        setNetworkError(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      console.log('Screen focused, loading data');
      const initializeData = async () => {
        const hasValidCache = await loadCachedData();
        if (!hasValidCache || !hasFetchedOnceRef.current) {
          await fetchData();
        }
      };
      initializeData();
    }, [])
  );

  useEffect(() => {
    const checkSessionToken = async () => {
      const newToken = await AsyncStorage.getItem('sessionToken');
      if (newToken !== sessionTokenRef.current) {
        console.log('Session token changed, resetting fetch state and fetching data');
        sessionTokenRef.current = newToken;
        hasFetchedOnceRef.current = false;
        await fetchData();
      }
    };
    checkSessionToken();
    const interval = setInterval(checkSessionToken, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSuggestionsStateChange = useCallback(({ showSuggestions, suggestionsHeight }) => {
    console.log('Suggestions state changed:', { showSuggestions, suggestionsHeight });
    setShowSuggestions(showSuggestions);
    setSuggestionsHeight(showSuggestions ? suggestionsHeight : 0);
  }, []);

  const handleFocusChange = useCallback((focused) => {
    console.log('Input focus changed:', focused);
    setInputFocused(focused);
  }, []);

  const handleTouchStart = useCallback(() => {
    console.log('Parent FlatList touched');
  }, []);

  const handleReload = useCallback(() => {
    console.log('Reload button pressed');
    fetchData();
  }, []);

  const handleScroll = useCallback(
    ({ nativeEvent }) => {
      if (!['regular', 'standard', 'premium'].includes(subscriptionStatus)) {
        const { contentOffset, contentSize } = nativeEvent;
        const scrollPercentage = contentOffset.y / contentSize.height;
        const isScrolledEnough = scrollPercentage >= 0.25;
        setShowBannerAd(isScrolledEnough);
        console.log('Scroll position:', contentOffset.y, 'Scroll percentage:', scrollPercentage, 'Show banner ad:', isScrolledEnough);
      } else {
        setShowBannerAd(false);
      }
    },
    [subscriptionStatus]
  );

  const sections = useMemo(
    () => [
      { type: 'header', id: 'header' },
      {
        type: 'searchBar',
        id: 'searchBar',
        onSuggestionsStateChange: handleSuggestionsStateChange,
        onFocusChange: handleFocusChange,
      },
      { type: 'categories', id: 'categories', data: data.categories },
      { type: 'recentShops', id: 'recentShops', data: data.recently_visited_shops },
      { type: 'followedShops', id: 'followedShops', data: data.followed_shops },
    ],
    [data.categories, data.recently_visited_shops, data.followed_shops, handleSuggestionsStateChange, handleFocusChange]
  );

  const renderSection = ({ item }) => {
    switch (item.type) {
      case 'header':
        return <View />;
      case 'searchBar':
        return <SearchBar onSuggestionsStateChange={item.onSuggestionsStateChange} onFocusChange={item.onFocusChange} />;
      case 'categories':
        return <Categories categories={item.data} />;
      case 'recentShops':
        return <RecentShops shops={item.data} />;
      case 'followedShops':
        return <FollowedShops shops={item.data} />;
      default:
        return <View />;
    }
  };

  if (loading || isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: '#F7FAFC' }]}>
        <StatusBar barStyle="light-content" backgroundColor='#2563EB' />
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
        <StatusBar barStyle="dark-content" backgroundColor='#2563EB' />
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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#F7FAFC' }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor='#2563EB' />
      <View style={styles.headerContainer}>
        <Header />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 20}
      >
        <LinearGradient colors={["#E3F2FD", "#BBDEFB"]} style={styles.container}>
          <FlatList
            ref={flatListRef}
            data={sections}
            renderItem={renderSection}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.flatListContent,
              {
                paddingBottom:
                  suggestionsHeight + insets.bottom + TAB_BAR_HEIGHT + (showBannerAd ? BANNER_AD_HEIGHT + 10 : 10),
              },
            ]}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={true}
            onTouchStart={handleTouchStart}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            ListFooterComponent={
              <View style={styles.footerContainer}>
                <View style={[styles.adContainer, { opacity: 0 }]}>
                  <AdMobManager />
                </View>
                <View style={[styles.footerSpacer, { height: insets.bottom + TAB_BAR_HEIGHT }]} />
              </View>
            }
          />
          {showBannerAd && !['regular', 'standard', 'premium'].includes(subscriptionStatus) && (
            <View style={[styles.stickyAdContainer, { bottom: insets.bottom + TAB_BAR_HEIGHT }]}>
              <AdMobManager />
            </View>
          )}
        </LinearGradient>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerContainer: {
    backgroundColor: '#F7FAFC',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  flatListContent: {
   
    paddingTop: 10,
  },
  footerContainer: {
    alignItems: 'center',
  },
  adContainer: {
    width: '100%',
    alignItems: 'center',
  },
  footerSpacer: {
    // Height for tab bar and insets
  },
  stickyAdContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
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
});

export default (props) => (
  <SubscriptionProvider>
    <ShopHomePage {...props} />
  </SubscriptionProvider>
);