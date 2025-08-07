import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Platform,
  KeyboardAvoidingView, ScrollView
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Image } from "expo-image";

const { width } = Dimensions.get("window");

const API_URL = "https://retail-alvinia-goza-f6a0e4f7.koyeb.app/login/";

// Constants for consistent theming (aligned with Homepage)
const COLORS = {
  primary: "#1E3A8A",
  accent: "#FCD34D",
  background: "#f7f8fc", // Kept original background color
  cardBackground: "#FFFFFF",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  white: "#FFFFFF",
  gradientStart: "#4B6CB7",
  gradientEnd: "#8B5CF6",
  error: "#EF4444",
  border: "#E5E7EB",
  inputBackground: "#F3F4F6",
  darkTextPrimary: "#F9FAFB",
  darkTextSecondary: "#D1D5DB",
};

const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

async function login(email, password) {
  try {
    const formData = new URLSearchParams();
    formData.append("email", email);
    formData.append("password", password);

    const response = await axios.post(API_URL, formData.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
    });

    if (response.data.message === "login successful") {
      const { user_id, session_id, user_name, userId, userVerified, phoneVerified } = response.data;
      console.log("Login response user_id:", user_id);
      await AsyncStorage.setItem("sessionToken", session_id);
      await AsyncStorage.setItem("user_id", user_id.toString());
      await AsyncStorage.setItem("userId", userId);
      await AsyncStorage.setItem("user_name", user_name);
      await AsyncStorage.setItem("user_verified", JSON.stringify(userVerified));
      await AsyncStorage.setItem("phone_verified", JSON.stringify(phoneVerified));
      console.log("userVerified:", userVerified);
      return { id: user_id, name: user_name };
    }
    throw new Error(response.data.message || "Login failed");
  } catch (error) {
    console.error("Login API error:", error.response?.data?.error || error.message);
    throw new Error(error.response?.data?.error || "Invalid credentials");
  }
}

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [secureText, setSecureText] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();

  // Animation values
  const buttonScale = useSharedValue(1);
  const inputScale = useSharedValue(1);
  const logoOpacity = useSharedValue(0);
  const logoTranslateY = useSharedValue(20);

  // Animation styles
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const inputAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: inputScale.value }],
  }));

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoTranslateY.value }],
  }));

  // Trigger logo animation on mount
  React.useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.exp) });
    logoTranslateY.value = withTiming(0, { duration: 800, easing: Easing.out(Easing.exp) });
  }, []);

  const handleSignIn = useCallback(async () => {
    console.log("handleSignIn started");
    if (!email || !password) {
      setErrorMessage("Please enter both email and password");
      return;
    }
    setLoading(true);
    setErrorMessage("");
    try {
      console.log("Calling login with:", { email, password });
      const user = await login(email, password);
      console.log("Login successful:", user);
      await AsyncStorage.setItem("userSession", JSON.stringify(user));
      Alert.alert("Welcome", `Logged in as ${user.name}`);
      console.log("Navigating to homepage");
      router.replace("homepage");
    } catch (error) {
      console.error("Login error:", error.message);
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, [email, password, router]);

  const handleButtonPressIn = () => {
    buttonScale.value = withSpring(0.95, { stiffness: 400, damping: 20 });
  };

  const handleButtonPressOut = () => {
    buttonScale.value = withSpring(1, { stiffness: 400, damping: 20 });
  };

  const handleInputFocus = () => {
    inputScale.value = withTiming(1.02, { duration: 200, easing: Easing.out(Easing.ease) });
  };

  const handleInputBlur = () => {
    inputScale.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
            <Image
              source={require("../../assets/images/icon1.png")}
              style={styles.image}
              contentFit="contain"
              accessibilityLabel="Gogo Marketplace Logo"
            />
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to explore local businesses</Text>
          </Animated.View>

          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={20} color={COLORS.error} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <Animated.View style={[styles.inputContainer, inputAnimatedStyle]}>
            <TextInput
              placeholder="Email"
              onChangeText={setEmail}
              value={email}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={COLORS.textSecondary}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              accessibilityLabel="Email input"
            />
          </Animated.View>

          <Animated.View style={[styles.inputContainer, inputAnimatedStyle]}>
            <View style={styles.passwordContainer}>
              <TextInput
                placeholder="Password"
                onChangeText={setPassword}
                value={password}
                secureTextEntry={secureText}
                style={styles.passwordInput}
                placeholderTextColor={COLORS.textSecondary}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                accessibilityLabel="Password input"
              />
              <TouchableOpacity
                onPress={() => {
                  console.log("Toggle secure text");
                  setSecureText(!secureText);
                }}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                activeOpacity={0.7}
                style={styles.iconButton}
                accessibilityLabel={secureText ? "Show password" : "Hide password"}
              >
                <Ionicons
                  name={secureText ? "eye-off" : "eye"}
                  size={24}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </Animated.View>

          <Animated.View style={[styles.buttonContainer, buttonAnimatedStyle]}>
            <TouchableOpacity
              onPress={handleSignIn}
              onPressIn={handleButtonPressIn}
              onPressOut={handleButtonPressOut}
              disabled={loading}
              style={styles.button}
              activeOpacity={0.9}
              accessibilityLabel="Sign in button"
            >
              <LinearGradient
                colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                style={styles.buttonGradient}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.buttonText}>Sign In</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.linksContainer}>
            <TouchableOpacity
              onPress={() => {
                console.log("Navigating to RequestToken");
                router.push("/RequestToken");
              }}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              activeOpacity={0.7}
              accessibilityLabel="Register link"
            >
              <Text style={styles.linkText}>Don't have an account? Register</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                console.log("Navigating to ForgotPassword");
                router.push("/ForgotPassword");
              }}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              activeOpacity={0.7}
              accessibilityLabel="Forgot password link"
            >
              <Text style={styles.linkText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background, // #f7f8fc
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xl,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: SPACING.xxl,
  },
  image: {
    width: width * 0.3,
    height: 100,
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: "80%",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    padding: SPACING.md,
    borderRadius: SPACING.sm,
    marginBottom: SPACING.lg,
    width: "100%",
  },
  errorText: {
    fontSize: 14,
    color: COLORS.error,
    marginLeft: SPACING.sm,
  },
  inputContainer: {
    width: "100%",
    marginBottom: SPACING.lg,
    borderRadius: SPACING.md,
    backgroundColor: COLORS.inputBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.textPrimary,
    borderRadius: SPACING.md,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: SPACING.sm,
  },
  passwordInput: {
    flex: 1,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  iconButton: {
    padding: SPACING.sm,
  },
  buttonContainer: {
    width: "100%",
    marginTop: SPACING.md,
  },
  button: {
    borderRadius: SPACING.md,
    overflow: "hidden",
    elevation: 4,
  },
  buttonGradient: {
    paddingVertical: SPACING.lg,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  linksContainer: {
    marginTop: SPACING.xl,
    alignItems: "center",
  },
  linkText: {
    fontSize: 16,
    color: COLORS.primary,
    marginVertical: SPACING.sm,
    fontWeight: "500",
  },
});

export default SignIn;