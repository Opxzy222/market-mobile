import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Header from '../../components/shop/Header';
import FollowedShops from '../../components/shop/FollowedShops';
import SearchBar from '../../components/shop/SearchBar';
import Categories from '../../components/shop/Categories';
import RecentShops from '../../components/shop/RecentShops';

const App = () => {
  return (
      <ScrollView contentContainerStyle={styles.container}>
        <Header />
        <SearchBar />
        <Categories />
        <RecentShops />
        <FollowedShops />
      </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20, // Prevents content from touching the edge
    backgroundColor: 'white'
  },
});

export default App;
