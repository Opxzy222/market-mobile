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
import SubscriptionProvider, { SubscriptionContext } from '../../components/SubscriptionProvider';
import { LinearGradient } from 'expo-linear-gradient';

const ShopHomePage = () => {
  const { subscriptionStatus, loading: subscriptionLoading } = useContext(SubscriptionContext);
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
  const sessionTokenRef = useRef(null);
  const flatListRef = useRef(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = 60;

  const isValidCache = (parsedData) => {
    return (
      parsedData &&
      (parsedData.categories?.length > 0 ||
       parsedData.followed_shops?.length > 0 ||
       parsedData.recently_visited_shops?.length > 0)
    );
  };

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
        if (isValidCache(parsedData)) {
          setData(parsedData);
          setIsLoading(false); // Display cached data immediately
          console.log('Loaded valid cached dashboard data:', parsedData);
          return true;
        } else {
          console.log('Invalid or empty cached data, keeping loading state');
          return false;
        }
      }
      console.log('No cached data found');
      return false;
    } catch (error) {
      console.error('Error loading cached data:', error);
      setNetworkError(true);
      return false;
    }
  };

  const fetchData = async () => {
    try {
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

      const response = await api.get(
        '/shop-dashboard-overview/',
        {
          headers: {
            Authorization: sessionTokenRef.current,
          },
        }
      );
      const newData = response.data;
      setData(newData); // Update state with backend data
      await AsyncStorage.setItem('shopDashboardData', JSON.stringify(newData));
      await AsyncStorage.setItem('user_verified', JSON.stringify(newData.user_verified));
      await AsyncStorage.setItem('phone_verified', JSON.stringify(newData.phone_verified));
      await AsyncStorage.setItem("user_name", newData.user_name);
      console.log('Fetched and updated dashboard data:', newData);
      hasFetchedOnceRef.current = true;
    } catch (error) {
      console.log('Error details:', {
        isAxiosError: axios.isAxiosError(error),
        status: error.response?.status,
        response: error.response,
        message: error.message,
      });

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
      console.log('Screen focused, initializing data');
      const initializeData = async () => {
        const hasValidCache = await loadCachedData();
        // Always fetch fresh data in the background, even if cache is valid
        fetchData();
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
        setIsLoading(true); // Show loading state during token change
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

  const handlePopulationStateChange = useCallback(({ isPopulating, progress }) => {
    console.log('Population state changed:', { isPopulating, progress });
    setIsPopulating(isPopulating);
    setProgress(progress);
    if (progress >= 99) {
      setModalTitle('Finalizing Your Dashboard');
      setModalSubtitle('Almost ready, just a few more moments...');
    } else {
      setModalTitle('Setting Up Your Dashboard');
      setModalSubtitle('Please hold on this could take a few minutes...');
    }
  }, []);

  const handleReload = useCallback(() => {
    console.log('Reload button pressed');
    setIsLoading(true); // Show loading state during reload
    fetchData();
  }, []);

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

  const renderSection = ({ item }) => {
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

  if (subscriptionLoading || isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: '#F7FAFC' }]}>
        <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
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
        <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
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
      <StatusBar barStyle="dark-content" backgroundColor="#2563EB" />
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
              {
                paddingBottom: suggestionsHeight + insets.bottom + TAB_BAR_HEIGHT + 10,
              },
            ]}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={true}
            scrollEventThrottle={16}
            ListFooterComponent={
              <View style={styles.footerContainer}>
                {!['regular', 'standard', 'premium'].includes(subscriptionStatus) && (
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
      <Modal visible={isPopulating} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <Text style={styles.modalSubtitle}>{modalSubtitle}</Text>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{`${Math.round(progress)}%`}</Text>
            <ActivityIndicator size="large" color="#2563EB" style={styles.modalLoader} />
          </View>
        </View>
      </Modal>
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
  modalLoader: {
    marginTop: 10,
  },
});

export default (props) => (
  <SubscriptionProvider>
    <ShopHomePage {...props} />
  </SubscriptionProvider>
);