import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NotificationDropdown from './NotificationModal';
import { LinearGradient } from "expo-linear-gradient";

const Header = () => {
  return (
    <LinearGradient colors={["#E3F2FD", "#BBDEFB"]} style={styles.header}>
      <View>
        <Text style={styles.greeting}>Hi Amrit!</Text>
        <Text style={styles.subGreeting}>Good Evening!</Text>
      </View>
      <NotificationDropdown />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  greeting: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  subGreeting: {
    fontSize: 14,
    color: '#666',
  },
});

export default Header;
