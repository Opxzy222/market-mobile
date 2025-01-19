import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const Banner = () => {
  return (
    <View style={styles.bannerContainer}>
      <View style={styles.bannerLeft}>
        <Text style={styles.bannerText}>OFFERS On Health</Text>
        <Text style={styles.bannerDescription}>Ayurvedic, Personal Care & More</Text>
      </View>
      <View style={styles.bannerRight}>
        <Text style={styles.bannerDiscount}>30% OFF Products</Text>
        <TouchableOpacity style={styles.shopNowButton}>
          <Text style={styles.shopNowText}>SHOP NOW</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    flexDirection: 'row',
    marginTop: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    elevation: 2,
    alignItems: 'center',
  },
  bannerLeft: {
    flex: 1,
  },
  bannerRight: {
    alignItems: 'flex-end',
  },
  bannerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  bannerDescription: {
    fontSize: 12,
    color: '#666',
  },
  bannerDiscount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  shopNowButton: {
    backgroundColor: '#007bff',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
    marginTop: 5,
  },
  shopNowText: {
    fontSize: 12,
    color: '#fff',
  },
});

export default Banner;
