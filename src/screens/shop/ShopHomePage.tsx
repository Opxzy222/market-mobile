import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import Header from '../../components/shop/Header';
import FollowedShops from '../../components/shop/FollowedShops';
import SearchBar from '../../components/shop/SearchBar';
import Categories from '../../components/shop/Categories';
import RecentShops from '../../components/shop/RecentShops';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const App = () => {
  const [data, setData] = useState({
    categories: [],
    followed_shops: [],
    recently_visited_shops: []
  });

  useEffect(() => {
    const fetchData = async () => {
      const sessionId = await AsyncStorage.getItem("sessionToken");
      console.log(sessionId)
      try {
        const response = await axios.get('https://retail-alvinia-goza-f6a0e4f7.koyeb.app/shop-dashboard-overview/', {
          headers: {
            Authorization: sessionId
          }
        });
        setData(response.data);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      }
    };

    fetchData();
  }, []);
  console.log(data.categories, 'categories ni se')

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Header />
      <SearchBar />
      <Categories categories={data.categories} />
      <RecentShops shops={data.recently_visited_shops} />
      <FollowedShops shops={data.followed_shops} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
    backgroundColor: 'white'
  },
});

export default App;
