import React, { useState, useCallback, useEffect } from "react";
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
  Pressable,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import api from "../api";
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
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width, height } = Dimensions.get("window");
const API_URL = "/complete-registration/";

// ────────────────────── THEMING ──────────────────────
const COLORS = {
  primary: "#1E40AF",
  accent: "#FCD34D",
  background: "#f7f8fc",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  white: "#FFFFFF",
  gradientStart: "#3B82F6",
  gradientEnd: "#8B5CF6",
  error: "#EF4444",
  border: "#E5E7EB",
  inputBg: "#F9FAFB",
  glow: "#60A5FA",
  success: "#10B981",
  ctaSignIn: ["#6366F1", "#8B5CF6"],
};

const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

// ────────────────────── SIGN-UP COMPONENT ──────────────────────
const SignUp = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [secureText, setSecureText] = useState(true);
  const [secureConfirmText, setSecureConfirmText] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);

  const router = useRouter();
  const params = useLocalSearchParams();
  const { email } = params;

  const inputFocus = useSharedValue(0);

  // Fetch session token
  useEffect(() => {
    const fetchSessionId = async () => {
      try {
        const token = await AsyncStorage.getItem("sessionToken");
        setSessionId(token);
      } catch (err) {
        console.error("Error fetching session ID:", err);
      }
    };
    fetchSessionId();
  }, []);

  // ────── Animations ──────
  const logoY = useSharedValue(-20);
  const logoOpacity = useSharedValue(0);
  const btnScale = useSharedValue(1);
  const rippleOpacity = useSharedValue(0);
  const rippleScale = useSharedValue(0);

  const logoAnim = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoY.value }],
  }));
  const btnAnim = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));
  const rippleAnim = useAnimatedStyle(() => ({
    opacity: rippleOpacity.value,
    transform: [{ scale: rippleScale.value }],
  }));
  const inputAnim = useAnimatedStyle(() => ({
    borderColor: withTiming(inputFocus.value ? COLORS.glow : COLORS.border, { duration: 250 }),
    shadowOpacity: withTiming(inputFocus.value ? 0.25 : 0.1),
    shadowRadius: withTiming(inputFocus.value ? 12 : 6),
  }));

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 800 });
    logoY.value = withTiming(0, { duration: 800 });
  }, []);

  const startRipple = () => {
    rippleScale.value = withSpring(4);
    rippleOpacity.value = withTiming(0.5, { duration: 150 });
    btnScale.value = withSpring(0.96);
  };
  const endRipple = () => {
    rippleOpacity.value = withTiming(0, { duration: 400 });
    btnScale.value = withSpring(1);
  };

  // ────── Dismiss on Outside Tap ──────
  const dismissKeyboard = () => {
    Keyboard.dismiss();
    inputFocus.value = 0;
  };

  // ────── Password Validation ──────
  const validatePassword = useCallback((pwd: string) => ({
    length: pwd.length >= 8,
    capital: /[A-Z]/.test(pwd),
    number: /[0-9]/.test(pwd),
  }), []);

  const checks = validatePassword(password);

  // ────── Sign Up Handler ──────
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

    if (!checks.length || !checks.capital || !checks.number) {
      setErrorMessage("Password must meet all requirements");
      return;
    }

    const formData = new FormData();
    formData.append("email", email as string);
    formData.append("firstname", firstName);
    formData.append("lastname", lastName);
    formData.append("password", password);

    setLoading(true);
    setErrorMessage("");

    try {
      const response = await api.post(API_URL, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(sessionId ? { Authorization: sessionId } : {}),
        },
      });

      if (response.status === 201 && response.data.message.includes("Registration successful")) {
        Alert.alert("Success", "Account Created Successfully");
        router.push("/login");
      } else {
        setErrorMessage(response.data.message || "Sign-up failed");
      }
    } catch (error: any) {
      const errMsg = error.response?.data?.error || "An error occurred. Please try again.";
      setErrorMessage(errMsg);
    } finally {
      setLoading(false);
    }
  }, [email, firstName, lastName, password, confirmPassword, loading, router, sessionId, checks]);

  // ────── CTA Button ──────
  const CTAButton = ({ title, onPress, gradient }: { title: string; onPress: () => void; gradient: string[] }) => (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.ctaPressable, pressed && { opacity: 0.8 }]}>
      <LinearGradient colors={gradient} style={styles.ctaGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <Text style={styles.ctaText}>{title}</Text>
      </LinearGradient>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        {/* ────── SCROLLVIEW (ONLY IF NEEDED) ────── */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableWithoutFeedback onPress={dismissKeyboard}>
            <View style={styles.container}>
              {/* ────── LOGO & TITLE ────── */}
              <Animated.View style={[styles.logoWrapper, logoAnim]}>
                <View style={styles.logoContainer}>
                  <Image
                    source={require("../../assets/images/icon1.png")}
                    style={styles.logoImage}
                    contentFit="contain"
                    transition={200}
                  />
                </View>
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>Join Gogo to explore local businesses</Text>
              </Animated.View>

              {/* ────── ERROR ────── */}
              {errorMessage ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={18} color={COLORS.error} />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              {/* ────── INPUTS ────── */}
              <Animated.View style={[styles.inputWrapper, inputAnim]}>
                <TextInput
                  placeholder="First Name"
                  value={firstName}
                  onChangeText={setFirstName}
                  style={styles.input}
                  autoCapitalize="words"
                  placeholderTextColor={COLORS.textSecondary}
                  onFocus={() => (inputFocus.value = 1)}
                  onBlur={() => (inputFocus.value = 0)}
                />
              </Animated.View>

              <Animated.View style={[styles.inputWrapper, inputAnim]}>
                <TextInput
                  placeholder="Last Name"
                  value={lastName}
                  onChangeText={setLastName}
                  style={styles.input}
                  autoCapitalize="words"
                  placeholderTextColor={COLORS.textSecondary}
                  onFocus={() => (inputFocus.value = 1)}
                  onBlur={() => (inputFocus.value = 0)}
                />
              </Animated.View>

              <Animated.View style={[styles.inputWrapper, inputAnim]}>
                <View style={styles.passwordRow}>
                  <TextInput
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={secureText}
                    style={styles.passwordInput}
                    placeholderTextColor={COLORS.textSecondary}
                    onFocus={() => (inputFocus.value = 1)}
                    onBlur={() => (inputFocus.value = 0)}
                  />
                  <TouchableOpacity onPress={() => setSecureText(s => !s)} style={styles.eyeBtn}>
                    <Ionicons name={secureText ? "eye-off" : "eye"} size={22} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>
              </Animated.View>

              <Animated.View style={[styles.inputWrapper, inputAnim]}>
                <View style={styles.passwordRow}>
                  <TextInput
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={secureConfirmText}
                    style={styles.passwordInput}
                    placeholderTextColor={COLORS.textSecondary}
                    onFocus={() => (inputFocus.value = 1)}
                    onBlur={() => (inputFocus.value = 0)}
                  />
                  <TouchableOpacity onPress={() => setSecureConfirmText(s => !s)} style={styles.eyeBtn}>
                    <Ionicons name={secureConfirmText ? "eye-off" : "eye"} size={22} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>
              </Animated.View>

              {/* ────── PASSWORD CHECKS ────── */}
              <View style={styles.checksContainer}>
                {[
                  { label: "At least 8 characters", valid: checks.length },
                  { label: "1 capital letter", valid: checks.capital },
                  { label: "1 number", valid: checks.number },
                ].map((item, i) => (
                  <View key={i} style={styles.checkItem}>
                    <Ionicons
                      name={item.valid ? "checkmark-circle" : "close-circle"}
                      size={18}
                      color={item.valid ? COLORS.success : COLORS.error}
                    />
                    <Text
                      style={[
                        styles.checkText,
                        { color: item.valid ? COLORS.success : COLORS.textSecondary },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </View>
                ))}
              </View>

              {/* ────── CREATE ACCOUNT BUTTON ────── */}
              <Animated.View style={[styles.btnWrapper, btnAnim]}>
                <TouchableOpacity
                  onPressIn={startRipple}
                  onPressOut={endRipple}
                  onPress={handleSignUp}
                  disabled={loading}
                  activeOpacity={1}
                  style={styles.btnTouch}
                >
                  <LinearGradient
                    colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                    style={styles.btnGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {loading ? (
                      <ActivityIndicator color={COLORS.white} />
                    ) : (
                      <Text style={styles.btnText}>Create Account</Text>
                    )}
                    <Animated.View style={[styles.ripple, rippleAnim]} />
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              {/* ────── SIGN IN CTA (Always visible via scroll) ────── */}
              <View style={styles.ctaContainer}>
                <CTAButton
                  title="Already have an account? Sign In"
                  onPress={() => router.push("/login")}
                  gradient={COLORS.ctaSignIn}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ────────────────────── STYLES ──────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    minHeight: height * 0.9,
  },
  container: {
    width: "100%",
    alignItems: "center",
  },

  // LOGO
  logoWrapper: { alignItems: "center", marginBottom: SPACING.xl, width: "100%" },
  logoContainer: { width: width * 0.3, height: 80, justifyContent: "center", alignItems: "center", marginBottom: SPACING.md },
  logoImage: { width: "100%", height: "100%", resizeMode: "contain" },
  title: { fontSize: 30, fontWeight: "800", color: COLORS.textPrimary, letterSpacing: -0.5, marginBottom: SPACING.xs, textAlign: "center" },
  subtitle: { fontSize: 15, color: COLORS.textSecondary, textAlign: "center", maxWidth: "80%" },

  // ERROR
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    padding: SPACING.sm,
    borderRadius: SPACING.sm,
    marginBottom: SPACING.md,
    width: "100%",
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  errorText: { fontSize: 13, color: COLORS.error, marginLeft: SPACING.xs, flex: 1 },

  // INPUTS
  inputWrapper: {
    width: "100%",
    marginBottom: SPACING.md,
    backgroundColor: COLORS.inputBg,
    borderRadius: SPACING.md,
    borderWidth: 1.5,
    overflow: "hidden",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  input: { padding: SPACING.md, fontSize: 16, color: COLORS.textPrimary },
  passwordRow: { flexDirection: "row", alignItems: "center" },
  passwordInput: { flex: 1, padding: SPACING.md, fontSize: 16, color: COLORS.textPrimary },
  eyeBtn: { padding: SPACING.sm },

  // PASSWORD CHECKS
  checksContainer: { width: "100%", marginBottom: SPACING.lg },
  checkItem: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.xs },
  checkText: { fontSize: 13.5, marginLeft: SPACING.sm },

  // BUTTON
  btnWrapper: { width: "100%", marginTop: SPACING.md, marginBottom: SPACING.xl, borderRadius: SPACING.md, overflow: "hidden" },
  btnTouch: { position: "relative" },
  btnGradient: { paddingVertical: 16, alignItems: "center", justifyContent: "center" },
  btnText: { fontSize: 17, fontWeight: "700", color: COLORS.white, letterSpacing: 0.5 },
  ripple: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.4)", borderRadius: SPACING.md },

  // CTA
  ctaContainer: { width: "100%", gap: SPACING.sm },
  ctaPressable: { borderRadius: 999, overflow: "hidden", elevation: 5, shadowColor: "#000" },
  ctaGradient: { paddingVertical: 14, alignItems: "center" },
  ctaText: { fontSize: 15, fontWeight: "600", color: COLORS.white, letterSpacing: 0.3 },
});

export default SignUp;