import { View, Text, StyleSheet } from 'react-native';
import React, { useState, useEffect } from "react";
import NotificationDropdown from './NotificationModal';
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";

const Header = () => {
  const [name, setName] = useState(null);
  const [timeGreeting, setTimeGreeting] = useState("Hello");

  useEffect(() => {
    const fetchNameAndGreeting = async () => {
      const nameString = await AsyncStorage.getItem("user_name");
      setName(nameString);

      const hour = new Date().getHours();

      if (hour >= 5 && hour < 12) {
        setTimeGreeting("Good Morning!");
      } else if (hour >= 12 && hour < 17) {
        setTimeGreeting("Good Afternoon!");
      } else if (hour >= 17 && hour < 21) {
        setTimeGreeting("Good Evening!");
      } else {
        setTimeGreeting("Welcome!");
      }
    };

    fetchNameAndGreeting();
  }, []);

  return (
    <LinearGradient colors={["#E3F2FD", "#BBDEFB"]} style={styles.header}>
      <View>
        <Text style={styles.greeting}>Hello, {name}</Text>
        <Text style={styles.subGreeting}>{timeGreeting}</Text>
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
