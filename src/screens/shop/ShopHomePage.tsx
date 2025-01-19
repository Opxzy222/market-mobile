import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import Header from '../../components/shop/Header';
import SearchBar from '../../components/shop/SearchBar';

import Categories from '../../components/shop/Categories';
import RecentShops from '../../components/shop/RecentShops';

const App = () => {
  return (
    <ScrollView style={styles.container}>
      <Header />
      <SearchBar />
      
      <Categories />
      <RecentShops />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
      flex: 1,
      backgroundColor: '#fff',    // Align with other sections
  },
});


export default App;
