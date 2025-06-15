import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import Header from '../../components/shop/Header';
import FollowedShops from '../../components/shop/FollowedShops';
import SearchBar from '../../components/shop/SearchBar';
import Categories from '../../components/shop/Categories';
import RecentShops from '../../components/shop/RecentShops';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

let hasFetchedOnce = false;

const App = () => {
  const [data, setData] = useState({
    categories: [],
    followed_shops: [],
    recently_visited_shops: [],
  });
  const [suggestionsHeight, setSuggestionsHeight] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  useEffect(() => {
    const loadCachedData = async () => {
      try {
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
        const sessionId = await AsyncStorage.getItem('sessionToken');
        const response = await axios.get(
          'https://retail-alvinia-goza-f6a0e4f7.koyeb.app/shop-dashboard-overview/',
          {
            headers: {
              Authorization: sessionId,
            },
          }
        );
        setData(response.data);
        await AsyncStorage.setItem('shopDashboardData', JSON.stringify(response.data));
        console.log('Fetched dashboard data');
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    loadCachedData();
    if (!hasFetchedOnce) {
      fetchData();
      hasFetchedOnce = true;
    }
  }, []);

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
    // Do not interfere with input focus
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
          onScroll={(e) => console.log('Parent FlatList scrolled:', e.nativeEvent.contentOffset)}
          onStartShouldSetResponder={() => !inputFocused} // Block touches when input is focused
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7FAFC",
  },
  container: {
    backgroundColor: "#F7FAFC",
  },
});

export default App;