import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Clipboard, 
  ToastAndroid,
  Platform,
  Alert
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRouter, usePathname } from 'expo-router';
import AsyncStorage from "@react-native-async-storage/async-storage";

const ProfileScreen = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [userId, setUserId] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchSessionId = async () => {
      const userIdString = await AsyncStorage.getItem("userId");
      setUserId(userIdString);
    };
    fetchSessionId();
  }, []);

  const copyToClipboard = () => {
    if (userId) {
      Clipboard.setString(userId);
      setCopied(true);

      if (Platform.OS === "android") {
        ToastAndroid.show("Profile ID copied!", ToastAndroid.SHORT);
      } else {
        Alert.alert("Copied", "Profile ID copied to clipboard!");
      }

      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <LinearGradient colors={["#E3F2FD", "#BBDEFB"]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Profile ID Section */}
        {userId && (
          <View style={styles.profileCard}>
            <Text style={styles.profileTitle}>Profile ID</Text>
            <View style={styles.profileRow}>
              <Text style={styles.profileIdText}>{userId}</Text>
              <TouchableOpacity onPress={copyToClipboard} style={styles.copyButton}>
                <Ionicons name={copied ? "checkmark-circle" : "copy-outline"} size={22} color={copied ? "#4CAF50" : "#007AFF"} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Menu Options */}
        <View style={styles.menuContainer}>
          <MenuItem icon="person" title="Edit Profile" onPress={() => router.push({ pathname: '/shop/EditProfile', prevRoute: pathname})} />
          <MenuItem icon="lock-closed" title="Change Password" onPress={() => router.push({ pathname: 'ChangePassword', prevRoute: pathname})} />
          <MenuItem icon="shield-checkmark" title="Account Verification" onPress={() => router.push("AccountVerification")} />
          <MenuItem icon="trash" title="Delete Account" onPress={() => router.push("DeleteAccount")} color="#D32F2F" />
          <MenuItem icon="log-out-outline" title="Logout" onPress={() => console.log("Logging out...")} color="#D32F2F" />
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const MenuItem = ({ icon, title, onPress, color = "#333" }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <Ionicons name={icon} size={24} color={color} />
    <Text style={[styles.menuText, { color }]}>{title}</Text>
    <MaterialIcons name="navigate-next" size={24} color={color} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    marginBottom: 25,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  profileTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    width: "100%",
    justifyContent: "space-between",
  },
  profileIdText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  copyButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "rgba(0, 122, 255, 0.1)",
  },
  menuContainer: {
    backgroundColor: "#fff",
    borderRadius: 15,
    paddingVertical: 10,
    paddingHorizontal: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  menuText: {
    flex: 1,
    fontSize: 18,
    fontWeight: "500",
    marginLeft: 15,
  },
});

export default ProfileScreen;
