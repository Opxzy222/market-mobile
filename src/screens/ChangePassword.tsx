import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message"; // Replaced Alert with Toast for consistency
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp, FadeInDown } from "react-native-reanimated";

const ChangePassword = () => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const router = useRouter();
  const { prevRoute } = useLocalSearchParams();

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Toast.show({ type: "error", text1: "Error", text2: "All fields are required." });
      return;
    }

    if (newPassword !== confirmPassword) {
      Toast.show({ type: "error", text1: "Error", text2: "New passwords do not match." });
      return;
    }

    try {
      setLoading(true);
      const sessionToken = await AsyncStorage.getItem("sessionToken");

      if (!sessionToken) {
        Toast.show({ type: "error", text1: "Error", text2: "Session expired. Please log in again." });
        return;
      }

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
        Toast.show({ type: "success", text1: "Success", text2: "Password updated successfully!" });
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        router.navigate("(tabs)/profile");
      } else {
        Toast.show({ type: "error", text1: "Error", text2: data.error || "Failed to update password." });
      }
    } catch (error) {
      console.error("Change Password Error:", error);
      Toast.show({ type: "error", text1: "Error", text2: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
      <LinearGradient colors={["#F5F5F5", "#E0E0E0"]} style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.navigate("(tabs)/profile")}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Change Password</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Content */}
        <Animated.View style={styles.contentContainer} entering={FadeInUp.duration(500)}>
          <Animated.Text style={styles.title} entering={FadeInUp.duration(500).delay(100)}>
            Update Your Password
          </Animated.Text>
          <Animated.Text style={styles.subtitle} entering={FadeInUp.duration(500).delay(200)}>
            Enter your current and new password to secure your account
          </Animated.Text>
          <Animated.View style={styles.card} entering={FadeInDown.duration(500).delay(300)}>
            {/* Old Password Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#6B7280" />
              <TextInput
                placeholder="Current Password"
                placeholderTextColor="#A3A3A3"
                secureTextEntry={!showOldPassword}
                autoCorrect={false}
                autoCapitalize="none"
                style={styles.input}
                value={oldPassword}
                onChangeText={setOldPassword}
                accessibilityLabel="Current password input"
              />
              <TouchableOpacity onPress={() => setShowOldPassword(!showOldPassword)}>
                <Ionicons
                  name={showOldPassword ? "eye-off-outline" : "eye-outline"}
                  size={22}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>

            {/* New Password Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="key-outline" size={20} color="#6B7280" />
              <TextInput
                placeholder="New Password"
                placeholderTextColor="#A3A3A3"
                secureTextEntry={!showNewPassword}
                autoCorrect={false}
                autoCapitalize="none"
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                accessibilityLabel="New password input"
              />
              <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                <Ionicons
                  name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                  size={22}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>

            {/* Confirm New Password Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="key-outline" size={20} color="#6B7280" />
              <TextInput
                placeholder="Confirm New Password"
                placeholderTextColor="#A3A3A3"
                secureTextEntry={!showConfirmPassword}
                autoCorrect={false}
                autoCapitalize="none"
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                accessibilityLabel="Confirm new password input"
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Ionicons
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                  size={22}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleChangePassword}
              disabled={loading}
            >
              <LinearGradient
                colors={loading ? ['#D1D5DB', '#B0B0B0'] : ['#4F46E5', '#7C3AED']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Update Password</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: "#3A7BD5",
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  backButton: {
    padding: 5,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
  },
  headerSpacer: {
    width: 42,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
    fontFamily: "System", // Suggest 'Inter_800ExtraBold' or 'Poppins_ExtraBold'
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "400",
    color: "#6B7280",
    marginBottom: 24,
    fontFamily: "System", // Suggest 'Inter_Regular' or 'Poppins_Regular'
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.05)",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.08)",
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
  },
  button: {
    borderRadius: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonGradient: {
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: "System", // Suggest 'Inter_SemiBold' or 'Poppins_SemiBold'
  },
});

export default ChangePassword;