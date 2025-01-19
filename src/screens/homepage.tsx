import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import Header from '../components/HomeHeader'; // Adjust the path based on your folder structure


export default function Homepage() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <Header />

      {/* Welcome Message */}
      <View style={styles.welcomeMessage}>
        <View style={styles.logoContainer}>
          <Image source={require('../../assets/images/icon1.png')} style={styles.logo} />
          <Text style={styles.heading}>Gogo Digital Marketplace</Text>
        </View>
        <Text style={styles.description}>
          Discover, connect, and grow. Set up your digital shop or explore our peer-to-peer market now.
        </Text>
      </View>

      {/* Market and Shop Links */}
      <View style={styles.linksContainer}>
        <TouchableOpacity
          style={styles.shopButton}
          onPress={() => {
            router.push('/(tabs)/shop');
          }}
        >
          <Text style={styles.buttonText}>Go to Shop</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f0f4f8',
  },
  welcomeMessage: {
    backgroundColor: '#3498db',
    padding: 40,
    borderRadius: 15,
    marginBottom: 30,
    marginTop: 70,
    alignItems: 'center',
    textAlign: 'center',
    boxShadow: '0px 10px 20px rgba(0, 0, 0, 0.15)', // Updated shadow property
    elevation: 10, // For Android shadow
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  logo: {
    width: 70,
    height: 70,
    marginBottom: 20,
  },
  heading: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1.5,
    textShadow: '2px 2px rgba(0, 0, 0, 0.2)', // Updated text shadow property
  },
  description: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Roboto',
    textAlign: 'center',
    marginTop: 20,
  },
  linksContainer: {
    marginTop: 50,
    width: '100%',
    alignItems: 'center',
  },
  shopButton: {
    backgroundColor: '#87CEFA',
    padding: 20,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    boxShadow: '0px 6px 12px rgba(0, 0, 0, 0.1)', // Updated shadow property
    elevation: 5, // For Android shadow
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
