import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NotificationDropdown from './NotificationModal';

const Header = () => {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.greeting}>Hi Amrit!</Text>
        <Text style={styles.subGreeting}>Good Evening!</Text>
      </View>
      <NotificationDropdown/>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  greeting: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 10, 
  },
  subGreeting: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 10, 
  },
  notificationIcon: {
    marginLeft: 'auto',
    marginHorizontal: 10, 
  },
});

export default Header;
