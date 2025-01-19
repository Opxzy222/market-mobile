import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Header = () => {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.greeting}>Hi Amrit!</Text>
        <Text style={styles.subGreeting}>Good Evening!</Text>
      </View>
      <Ionicons name="notifications-outline" size={24} style={styles.notificationIcon} />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 10, 
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
  notificationIcon: {
    marginLeft: 'auto',
  },
});

export default Header;
