import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Alert, // Added Alert import
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import api from '../api';
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Image } from "expo-image";
import AsyncStorage from "@react-native-async-storage/async-storage"; // Added for session token

const { width } = Dimensions.get("window");

const API_URL = "/complete-registration/";

const COLORS = {
  primary: "#1E3A8A",
  accent: "#FCD34D",
  background: "#f7f8fc",
  cardBackground: "#FFFFFF",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  white: "#FFFFFF",
  gradientStart: "#4B6CB7",
  gradientEnd: "#8B5CF6",
  error: "#EF4444",
  border: "#E5E7EB",
  inputBackground: "#F3F4F6",
  success: "#10B981",
};

const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

const SignUp = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [secureText, setSecureText] = useState(true);
  const [secureConfirmText, setSecureConfirmText] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [sessionId, setSessionId] = useState(null); // Added for session token
  const router = useRouter();
  const params = useLocalSearchParams();
  const { email } = params;

  // Fetch session token
  React.useEffect(() => {
    const fetchSessionId = async () => {
      try {
        const sessionIdString = await AsyncStorage.getItem("sessionToken");
        setSessionId(sessionIdString);
        console.log("Session ID fetched:", sessionIdString);
      } catch (err) {
        console.error("Error fetching session ID:", err);
      }
    };
    fetchSessionId();
  }, []);

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

  const validatePassword = useCallback((password) => ({
    length: password.length >= 8,
    capital: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
  }), []);

  const passwordChecks = validatePassword(password);

  const handleSignUp = useCallback(async () => {
    if (loading) return;

    if (!firstName || !lastName || !password || !confirmPassword) {
      setErrorMessage("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match");
      return;
    }

    if (!passwordChecks.length || !passwordChecks.capital || !passwordChecks.number) {
      setErrorMessage(
        "Password must contain at least 8 characters, one capital letter, and one number"
      );
      return;
    }

    const formData = new FormData();
    formData.append("email", email);
    formData.append("firstname", firstName);
    formData.append("lastname", lastName);
    formData.append("password", password);

    setLoading(true);
    setErrorMessage("");
    try {
      const response = await api.post(API_URL, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(sessionId ? { Authorization: sessionId } : {}), // Include session token if available
        },
      });

      console.log("Sign-up response:", response.data); // Log response for debugging

      // Updated to match backend response
      if (response.status === 201 && response.data.message.includes("Registration successfull")) {
        setErrorMessage("");
        Alert.alert("Success", "Account Created Successfully ✅");
        router.push("/login");
      } else {
        setErrorMessage(response.data.message || "Sign-up failed");
      }
    } catch (error) {
      console.error("Sign-up error:", error.response?.data || error.message);
      const errMsg = error.response?.data?.error || "An error occurred. Please try again.";
      setErrorMessage(errMsg);
    } finally {
      setLoading(false);
    }
  }, [email, firstName, lastName, password, confirmPassword, loading, router, sessionId]);

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
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join Gogo to explore local businesses</Text>
          </Animated.View>

          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={20} color={COLORS.error} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <Animated.View style={[styles.inputContainer, inputAnimatedStyle]}>
            <TextInput
              placeholder="First Name"
              onChangeText={setFirstName}
              value={firstName}
              style={styles.input}
              autoCapitalize="words"
              placeholderTextColor={COLORS.textSecondary}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              accessibilityLabel="First name input"
            />
          </Animated.View>

          <Animated.View style={[styles.inputContainer, inputAnimatedStyle]}>
            <TextInput
              placeholder="Last Name"
              onChangeText={setLastName}
              value={lastName}
              style={styles.input}
              autoCapitalize="words"
              placeholderTextColor={COLORS.textSecondary}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              accessibilityLabel="Last name input"
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
                  console.log("Toggle secure text for password");
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

          <Animated.View style={[styles.inputContainer, inputAnimatedStyle]}>
            <View style={styles.passwordContainer}>
              <TextInput
                placeholder="Confirm Password"
                onChangeText={setConfirmPassword}
                value={confirmPassword}
                secureTextEntry={secureConfirmText}
                style={styles.passwordInput}
                placeholderTextColor={COLORS.textSecondary}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                accessibilityLabel="Confirm password input"
              />
              <TouchableOpacity
                onPress={() => {
                  console.log("Toggle secure text for confirm password");
                  setSecureConfirmText(!secureConfirmText);
                }}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                activeOpacity={0.7}
                style={styles.iconButton}
                accessibilityLabel={secureConfirmText ? "Show confirm password" : "Hide confirm password"}
              >
                <Ionicons
                  name={secureConfirmText ? "eye-off" : "eye"}
                  size={24}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </Animated.View>

          <View style={styles.passwordChecks}>
            <View style={styles.checkItem}>
              <Ionicons
                name={passwordChecks.length ? "checkmark-circle" : "close-circle"}
                size={20}
                color={passwordChecks.length ? COLORS.success : COLORS.error}
              />
              <Text
                style={[
                  styles.checkText,
                  { color: passwordChecks.length ? COLORS.success : COLORS.error },
                ]}
              >
                At least 8 characters
              </Text>
            </View>
            <View style={styles.checkItem}>
              <Ionicons
                name={passwordChecks.capital ? "checkmark-circle" : "close-circle"}
                size={20}
                color={passwordChecks.capital ? COLORS.success : COLORS.error}
              />
              <Text
                style={[
                  styles.checkText,
                  { color: passwordChecks.capital ? COLORS.success : COLORS.error },
                ]}
              >
                At least 1 capital letter
              </Text>
            </View>
            <View style={styles.checkItem}>
              <Ionicons
                name={passwordChecks.number ? "checkmark-circle" : "close-circle"}
                size={20}
                color={passwordChecks.number ? COLORS.success : COLORS.error}
              />
              <Text
                style={[
                  styles.checkText,
                  { color: passwordChecks.number ? COLORS.success : COLORS.error },
                ]}
              >
                At least 1 number
              </Text>
            </View>
          </View>

          <Animated.View style={[styles.buttonContainer, buttonAnimatedStyle]}>
            <TouchableOpacity
              onPress={handleSignUp}
              onPressIn={handleButtonPressIn}
              onPressOut={handleButtonPressOut}
              disabled={loading}
              style={styles.button}
              activeOpacity={0.9}
              accessibilityLabel="Create account button"
            >
              <LinearGradient
                colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                style={styles.buttonGradient}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.buttonText}>Create Account</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.linksContainer}>
            <TouchableOpacity
              onPress={() => {
                console.log("Navigating to login");
                router.push("/login");
              }}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              activeOpacity={0.7}
              accessibilityLabel="Sign in link"
            >
              <Text style={styles.linkText}>Already have an account? Sign In</Text>
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
    backgroundColor: COLORS.background,
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
  passwordChecks: {
    width: "100%",
    marginBottom: SPACING.lg,
  },
  checkItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  checkText: {
    fontSize: 14,
    marginLeft: SPACING.sm,
    color: COLORS.textSecondary,
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

export default SignUp;