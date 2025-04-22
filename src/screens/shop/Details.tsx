import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter, usePathname } from "expo-router";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";

const Details = () => {
  const router = useRouter();
  const { shopId, prevRoute } = useLocalSearchParams();
  const pathname = usePathname();

  return (
    <LinearGradient colors={["#E3F2FD", "#BBDEFB"]} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.replace(prevRoute || '((tabs)/myshop)')}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color="#007BFF" />
        </TouchableOpacity>    
        <Text style={styles.headerTitle}>Shop Settings</Text>
      </View>

      {/* Settings Options */}
      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={styles.option}
          onPress={() => router.push({ pathname: "/shop/ShopProfile", params: { shopId }, prevRoute: pathname })}
        >
          <View style={styles.iconWrapper}>
            <MaterialIcons name="edit" size={28} color="#007AFF" />
          </View>
          <Text style={styles.text}>Edit Profile</Text>
          <MaterialIcons name="chevron-right" size={26} color="#888" style={styles.chevron} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.option}
          onPress={() => router.push({ pathname: "/shop/WorkingHours", params: { shopId }, prevRoute: pathname })}
        >
          <View style={styles.iconWrapper}>
            <MaterialIcons name="access-time" size={28} color="#007AFF" />
          </View>
          <Text style={styles.text}>Working Hours</Text>
          <MaterialIcons name="chevron-right" size={26} color="#888" style={styles.chevron} />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 10,
  },
  backButton: {
    borderRadius: 50,
    backgroundColor: "#E0E0E0",
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 75,
  },
  optionsContainer: {
    marginTop: 12,
    paddingHorizontal: 13,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    backgroundColor: "#E3F2FD",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  text: {
    fontSize: 18,
    fontWeight: "500",
    color: "#333",
    flex: 1,
  },
  chevron: {
    opacity: 0.6,
  },
});

export default Details;
