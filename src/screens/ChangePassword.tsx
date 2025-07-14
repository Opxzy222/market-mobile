import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet, StatusBar
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

const ChangePassword = () => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const router = useRouter();
  const params = useLocalSearchParams();
  const { prevRoute } = params;

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert("Error", "All fields are required.");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      // Retrieve session token from AsyncStorage
      const sessionToken = await AsyncStorage.getItem("sessionToken");

      if (!sessionToken) {
        Alert.alert("Error", "Session expired. Please log in again.");
        return;
      }

      // API Request
      const response = await fetch("https://retail-alvinia-goza-f6a0e4f7.koyeb.app/change-password/", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: sessionToken,
        },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        await AsyncStorage.setItem("sessionToken", data.session_id);
        Alert.alert("Success", "Password updated successfully!");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        Alert.alert("Error", data.error || "Failed to update password.");
      }
    } catch (error) {
      console.error("Change Password Error:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#F5F5F5", "#E0E0E0"]} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor='#2563EB' />
      <View style={styles.header}>
      <TouchableOpacity onPress={() => router.navigate('(tabs)/profile')}>
          <MaterialIcons name="arrow-back" size={26} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.card}>

        {/* Old Password Input */}
        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color="#777" />
          <TextInput
            placeholder="Current Password"
            secureTextEntry={!showOldPassword}
            autoCorrect={false}
            autoCapitalize="none"
            style={styles.input}
            value={oldPassword}
            onChangeText={setOldPassword}
          />
          <TouchableOpacity onPress={() => setShowOldPassword(!showOldPassword)}>
            <Ionicons name={showOldPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#777" />
          </TouchableOpacity>
        </View>

        {/* New Password Input */}
        <View style={styles.inputContainer}>
          <Ionicons name="key-outline" size={20} color="#777" />
          <TextInput
            placeholder="New Password"
            secureTextEntry={!showNewPassword}
            autoCorrect={false}
            autoCapitalize="none"
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
            <Ionicons name={showNewPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#777" />
          </TouchableOpacity>
        </View>

        {/* Confirm New Password Input */}
        <View style={styles.inputContainer}>
          <Ionicons name="key-outline" size={20} color="#777" />
          <TextInput
            placeholder="Confirm New Password"
            secureTextEntry={!showConfirmPassword}
            autoCorrect={false}
            autoCapitalize="none"
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
            <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#777" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={handleChangePassword} style={styles.button} disabled={loading}>
          <LinearGradient colors={["#4CAF50", "#45A049"]} style={styles.buttonGradient}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Update Password</Text>}
          </LinearGradient>
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
    padding: 18,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 12,
    backdropFilter: "blur(10px)", // Glass effect
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginLeft: 75,
    color: "black",
  },
  backButton: {
    borderRadius: 50,
    backgroundColor: "#E0E0E0",
    marginRight: 12,
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 12,
    padding: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    marginTop: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 15,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: "#333",
  },
  button: {
    marginTop: 10,
    borderRadius: 8,
    overflow: "hidden",
  },
  buttonGradient: {
    padding: 15,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default ChangePassword;
