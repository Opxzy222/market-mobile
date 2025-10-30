import { View, Text, StyleSheet } from 'react-native';
import React, { useState, useEffect } from "react";
import NotificationDropdown from './NotificationModal';
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context"; // Added for safe area

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
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {name}</Text>
          <Text style={styles.subGreeting}>{timeGreeting}</Text>
        </View>
        
        <NotificationDropdown />
        </View>
      
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#E3F2FD", // Match gradient start color for seamless look
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#3A7BD5',
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  greeting: {
    fontSize: 20,
    fontWeight: 'bold',
    color: "#FFFFFF",
  },
  subGreeting: {
    fontSize: 14,
    color: "whitesmoke",
  },
});

export default Header;