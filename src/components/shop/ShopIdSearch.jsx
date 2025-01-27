import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ShopIdSearch() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        Shop id based search is under development. Please use the Geolocation option.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  text: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
  },
});
