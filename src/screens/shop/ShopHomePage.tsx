import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  FlatList,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import Header from '../../components/shop/Header';
import FollowedShops from '../../components/shop/FollowedShops';
import SearchBar from '../../components/shop/SearchBar';
import Categories from '../../components/shop/Categories';
import RecentShops from '../../components/shop/RecentShops';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearNonSuggestionData } from '../../storage/storage';

const App = () => {
  const [data, setData] = useState({
    categories: [],
    followed_shops: [],
    recently_visited_shops: [],
  });
  const [suggestionsHeight, setSuggestionsHeight] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const hasFetchedOnceRef = useRef(false);
  const sessionTokenRef = useRef<string | null>(null);
  const router = useRouter();

  const loadCachedData = async () => {
    try {
      const sessionToken = await AsyncStorage.getItem('sessionToken');
      if (!sessionToken) {
        // Clear stale data if no session token
        await clearNonSuggestionData();
        setData({ categories: [], followed_shops: [], recently_visited_shops: [] });
        console.log('No session token, cleared stale data and reset state');
        router.push('/login'); // Navigate to login
        return;
      }

      const cachedData = await AsyncStorage.getItem('shopDashboardData');
      if (cachedData) {
        setData(JSON.parse(cachedData));
        console.log('Loaded cached dashboard data');
      }
    } catch (error) {
      console.error('Error loading cached data:', error);
    }
  };

  const fetchData = async () => {
    try {
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
      console.log('Fetched dashboard data');
      console.log('Fetched shops:', response.data.followed_shops.concat(response.data.recently_visited_shops));
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        console.log('Authentication failed (403), clearing data and navigating to login');
        await clearNonSuggestionData();
        setData({ categories: [], followed_shops: [], recently_visited_shops: [] });
        sessionTokenRef.current = null;
        router.push('/login');
      } else {
        console.error('Error fetching dashboard data:', error);
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      console.log('Screen focused, loading data');
      loadCachedData();
      if (!hasFetchedOnceRef.current) {
        fetchData();
        hasFetchedOnceRef.current = true;
      }
    }, [])
  );

  const handleSuggestionsStateChange = useCallback(({ showSuggestions, suggestionsHeight }) => {
    console.log('App: Suggestions state changed:', { showSuggestions, suggestionsHeight });
    setShowSuggestions(showSuggestions);
    setSuggestionsHeight(showSuggestions ? suggestionsHeight : 0);
  }, []);

  const handleFocusChange = useCallback((focused) => {
    console.log('App: Input focus changed:', focused);
    setInputFocused(focused);
  }, []);

  const handleTouchStart = useCallback(() => {
    console.log('Parent FlatList touched');
  }, []);

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
        return <Header />;
      case 'searchBar':
        return <SearchBar onSuggestionsStateChange={item.onSuggestionsStateChange} onFocusChange={item.onFocusChange} />;
      case 'categories':
        return <Categories categories={item.data} />;
      case 'recentShops':
        return <RecentShops shops={item.data} />;
      case 'followedShops':
        return <FollowedShops shops={item.data} />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <FlatList
          data={sections}
          renderItem={renderSection}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.container, { paddingBottom: 20 + suggestionsHeight }]}
          nestedScrollEnabled={false}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={true}
          onTouchStart={handleTouchStart}
          onScroll={(e) => {
            console.log('Parent FlatList scrolled:', e.nativeEvent.contentOffset);
          }}
          onStartShouldSetResponder={() => !inputFocused}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  container: {
    backgroundColor: '#F7FAFC',
  },
});

export default App;