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
    <LinearGradient colors={["#F7F7F7", "#EAEAEA"]} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.container}>
        <Header />
        <SearchBar />
        <Categories />
        <RecentShops />
        <FollowedShops />
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    paddingBottom: 20, // Prevents content from touching the edge
  },
});

export default App;
