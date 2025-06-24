import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Keyboard,
  Platform,
  KeyboardAvoidingView, StatusBar
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@rneui/themed";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from "react-native-reanimated";

const CACHE_KEY = "EditProfile_Cache";

const EditProfileScreen = () => {
  const [user, setUser] = useState(null);
  const [phoneNo, setPhoneNo] = useState("");
  const [image, setImage] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(null);
  const params = useLocalSearchParams();
  const { shopId, prevRoute } = params;
  const router = useRouter();
  const focusTimeoutRef = useRef(null);

  // Animation values
  const cardOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.95);
  const buttonScale = useSharedValue(1);
  const iconScale = useSharedValue(1);

  // Load cached data and session ID
  const loadCachedData = useCallback(async () => {
    try {
      const cachedUser = await AsyncStorage.getItem(CACHE_KEY);
      if (cachedUser) {
        const data = JSON.parse(cachedUser);
        setUser(data);
        setPhoneNo(data.phone_no || "");
        setImage(data.image || "");
        console.log("Loaded cached profile data");
      }
    } catch (error) {
      console.error("Error loading cached data:", error);
    }

    try {
      const sessionIdString = await AsyncStorage.getItem("sessionToken");
      setSessionId(sessionIdString);
      console.log("Fetched session token:", sessionIdString);
      if (!sessionIdString) {
        router.push("/login");
      }
    } catch (error) {
      console.error("Error fetching session token:", error);
      setError("Failed to load session");
    }
  }, [router]);

  // Save to cache
  const saveToCache = useCallback(async (data) => {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
      console.log("Cached profile data saved");
    } catch (error) {
      console.error("Error saving to cache:", error);
    }
  }, []);

  // Fetch profile data
  const fetchProfile = useCallback(async () => {
    if (!sessionId) {
      console.log("No sessionId, skipping fetchProfile");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await axios.get(
        `https://retail-alvinia-goza-f6a0e4f7.koyeb.app/user/profile/`,
        {
          headers: {
            Authorization: sessionId,
          },
        }
      );
      setUser(response.data);
      setPhoneNo(response.data.phone_no || "");
      setImage(response.data.image || "");
      saveToCache(response.data);
      console.log("Fetched profile:", response.data);
    } catch (error) {
      console.error("Error fetching profile:", error);
      setError("Failed to fetch profile. Using cached data if available.");
    } finally {
      setLoading(false);
    }
  }, [sessionId, saveToCache]);

  useEffect(() => {
    // Card entrance animation
    cardOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) });
    cardScale.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) });

    loadCachedData().then(() => {
      if (sessionId) {
        fetchProfile(); // Always fetch fresh data
      }
    });
  }, [sessionId, loadCachedData, fetchProfile]);

  const logStorageUsage = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      let totalSize = 0;
      for (const key of keys) {
        const data = await AsyncStorage.getItem(key);
        totalSize += ((data?.length || 0) * 2) / 1024; // Approximate KB
      }
      console.log(`AsyncStorage usage: ${totalSize.toFixed(2)} KB`);
    } catch (error) {
      console.error("Error logging storage usage:", error);
    }
  };

  useEffect(() => {
    logStorageUsage();
    return () => {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
    };
  }, []);

  const handleUpdate = async () => {
    if (!sessionId) {
      console.error("Session ID is missing!");
      alert("Please log in to update your profile.");
      return;
    }

    const formData = new FormData();
    let hasChanges = false;

    if (phoneNo !== user.phone_no) {
      formData.append("phone_no", phoneNo);
      hasChanges = true;
    }

    if (image && image !== user.image) {
      try {
        const response = await fetch(image);
        const blob = await response.blob();
        formData.append("image", {
          uri: image,
          type: "image/jpeg",
          name: "profile.jpg",
        });
        hasChanges = true;
      } catch (error) {
        console.error("Error processing image:", error);
        alert("Failed to process image. Please try again.");
        return;
      }
    }

    if (!hasChanges) {
      alert("No changes made to update.");
      return;
    }

    try {
      const response = await axios.post(
        `https://retail-alvinia-goza-f6a0e4f7.koyeb.app/user/profile/`,
        formData,
        {
          headers: {
            Authorization: sessionId,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.status === 200) {
        setUser({ ...user, phone_no: phoneNo, image });
        saveToCache({ ...user, phone_no: phoneNo, image });
        alert("Profile updated successfully!");
      } else {
        alert("Failed to update profile.");
      }
    } catch (error) {
      console.error("Update error:", error);
      alert("An error occurred while updating the profile.");
    }
  };

  const pickImage = async () => {
    iconScale.value = withSpring(0.8, { damping: 10 }, () => {
      iconScale.value = withSpring(1);
    });
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
      console.log("Image picked:", result.assets[0].uri);
    }
  };

  // Animated styles
  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const handleButtonPressIn = () => {
    buttonScale.value = withTiming(0.95, { duration: 100 });
  };

  const handleButtonPressOut = () => {
    buttonScale.value = withTiming(1, { duration: 100 });
  };

  const handleFocus = (field) => {
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
    }
    focusTimeoutRef.current = setTimeout(() => {
      console.log(`Input focused: ${field}`);
      setFocused(field);
    }, 100);
  };

  const handleBlur = (field) => {
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
    }
    console.log(`Input blurred: ${field}`);
    setFocused(null);
  };

  if (loading && !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3A7BD5" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor='#2563EB' />
      <LinearGradient colors={["#F7FAFC", "#E5E7EB"]} style={styles.container}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
        >
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.replace(prevRoute || "/(tabs)/profile")}
              style={styles.backButton}
            >
              <MaterialIcons name="arrow-back" size={26} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Profile Edit</Text>
            <View style={styles.headerSpacer} />
          </View>
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
            {error && !user && (
              <Text style={styles.errorText}>{error}</Text>
            )}
            {user && (
              <Animated.View style={[styles.profileCard, animatedCardStyle]}>
                <View style={styles.imageContainer}>
                  <Text style={styles.imageLabel}>Profile Picture</Text>
                  <TouchableOpacity onPress={pickImage}>
                    <Image
                      source={{ uri: image || user.image || "https://via.placeholder.com/150" }}
                      style={styles.profileImage}
                    />
                  </TouchableOpacity>
                  <Animated.View style={[styles.uploadIcon, animatedIconStyle]}>
                    <TouchableOpacity onPress={pickImage}>
                      <Ionicons name="camera" size={26} color="#FFFFFF" />
                    </TouchableOpacity>
                  </Animated.View>
                  <Text style={styles.uploadHint}>Tap to upload new image</Text>
                </View>

                <Text style={styles.profileId}>Profile ID: {user.user_id}</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>First Name</Text>
                  <Text style={styles.input}>{user.firstname}</Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Last Name</Text>
                  <Text style={styles.input}>{user.lastname}</Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email</Text>
                  <Text style={styles.input}>{user.email}</Text>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Phone Number</Text>
                  <TextInput
                    style={[
                      styles.inputField,
                      focused === "phoneNo" && styles.inputFieldFocused,
                    ]}
                    value={phoneNo}
                    onChangeText={setPhoneNo}
                    keyboardType="phone-pad"
                    placeholderTextColor="#6B7280"
                    onFocus={() => handleFocus("phoneNo")}
                    onBlur={() => handleBlur("phoneNo")}
                    blurOnSubmit={true}
                    onSubmitEditing={() => Keyboard.dismiss()}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm Phone Number</Text>
                  <TextInput
                    style={[
                      styles.inputField,
                      focused === "confirmPhone" && styles.inputFieldFocused,
                    ]}
                    placeholder="Enter verification code"
                    keyboardType="number-pad"
                    placeholderTextColor="#6B7280"
                    onFocus={() => handleFocus("confirmPhone")}
                    onBlur={() => handleBlur("confirmPhone")}
                    blurOnSubmit={true}
                    onSubmitEditing={() => Keyboard.dismiss()}
                  />
                </View>

                <Animated.View style={[styles.buttonContainer, animatedButtonStyle]}>
                  <Button
                    title="Update Profile"
                    onPress={handleUpdate}
                    onPressIn={handleButtonPressIn}
                    onPressOut={handleButtonPressOut}
                    buttonStyle={styles.updateButton}
                    titleStyle={styles.updateButtonText}
                  />
                </Animated.View>
              </Animated.View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
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
    padding: 8,
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
  scrollContainer: {
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  profileCard: {
    width: "100%",
    backgroundColor: "white",
    padding: 28,
    borderRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: "rgba(0, 0, 0, 0.03)",
  },
  imageContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginBottom: 16,
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    padding: 16,
    width: "100%",
  },
  imageLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  profileImage: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 4.5,
    borderColor: "#3A7BD5",
  },
  uploadIcon: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "#3A7BD5",
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  uploadHint: {
    fontSize: 15,
    color: "#4B5563",
    fontWeight: "500",
    marginTop: 12,
    textAlign: "center",
  },
  profileId: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginVertical: 16,
    color: "#111827",
    letterSpacing: 0.5,
  },
  inputGroup: {
    width: "100%",
    marginBottom: 20,
  },
  label: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },
  input: {
    backgroundColor: "#F3F4F6",
    padding: 18,
    borderRadius: 14,
    fontSize: 18,
    color: "#111827",
  },
  inputField: {
    backgroundColor: "#F3F4F6",
    padding: 18,
    borderRadius: 14,
    fontSize: 18,
    color: "#111827",
    borderWidth: 0.5,
    borderColor: "transparent",
  },
  inputFieldFocused: {
    borderColor: "rgba(0, 0, 0, 0.05)",
  },
  buttonContainer: {
    width: "100%",
    marginTop: 28,
  },
  updateButton: {
    backgroundColor: "#3A7BD5",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: "#3A7BD5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  updateButtonText: {
    fontSize: 19,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F7FAFC",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 18,
    color: "#4B5563",
    fontWeight: "500",
  },
  errorText: {
    fontSize: 16,
    color: "#f44336",
    textAlign: "center",
    marginVertical: 20,
  },
});

export default EditProfileScreen;