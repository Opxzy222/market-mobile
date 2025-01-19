import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const RecentShops = () => {
  return (
    <View>
      <Text style={styles.sectionTitle}>Recent's Doctors</Text>
      {/* Placeholder for doctor section */}
    </View>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 20, 
  },
});

export default RecentShops;
