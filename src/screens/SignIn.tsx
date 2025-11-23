import React, {
  useState,
  useCallback,
  useEffect,
  useContext,
} from "react";
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
  KeyboardAvoidingView,
  Pressable,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../api";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
} from "react-native-reanimated";
import { Image } from "expo-image";
import { AppResetContext } from "@/context/AppResetContext";

const { width, height } = Dimensions.get("window");
const API_URL = "/login/";

// ────────────────────── THEMING ──────────────────────
const COLORS = {
  primary: "#1E40AF",
  accent: "#FCD34D",
  background: "#f7f8fc",
  cardBackground: "#FFFFFF",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  white: "#FFFFFF",
  gradientStart: "#3B82F6",
  gradientEnd: "#8B5CF6",
  error: "#EF4444",
  warning: "#F59E0B",
  info: "#3B82F6",
  border: "#E5E7EB",
  inputBg: "#F9FAFB",
  glow: "#60A5FA",
  ctaRegister: ["#10B981", "#34D399"],
  ctaForgot: ["#F59E0B", "#FBBF24"],
};

const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

// ────────────────────── LOGIN API (UNCHANGED) ──────────────────────
async function login(email: string, password: string) {
  const formData = new URLSearchParams();
  formData.append("email", email);
  formData.append("password", password);

  const response = await api.post(API_URL, formData.toString(), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
  });

  if (response.data.message === "login successful") {
    const {
      user_id,
      session_id,
      user_name,
      userId,
      userVerified,
      phoneVerified,
      plan,
      is_active,
      start_date,
      end_date,
    } = response.data;

    await AsyncStorage.multiSet([
      ["sessionToken", session_id],
      ["user_id", user_id.toString()],
      ["userId", userId],
      ["user_name", user_name],
      ["email", email],
      ["user_verified", JSON.stringify(userVerified)],
      ["phone_verified", JSON.stringify(phoneVerified)],
      ["subscription_cache", JSON.stringify({
        plan,
        is_active,
        start_date,
        end_date,
      })],
    ]);

    return { id: user_id, name: user_name };
  }
  throw new Error(response.data.error || response.data.message || "Login failed");
}

// ────────────────────── MODERN ANIMATED ERROR TOAST ──────────────────────
const ErrorToast = ({ message, type = "error" }: { message: string; type?: "error" | "warning" | "info" }) => {
  const translateY = useSharedValue(-120);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withSequence(
      withTiming(20, { duration: 400 }),
      withDelay(4500, withTiming(-120, { duration: 400 }))
    );
    opacity.value = withTiming(1, { duration: 400 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const config = {
    error: { icon: "alert-circle-outline", color: COLORS.error },
    warning: { icon: "warning-outline", color: COLORS.warning },
    info: { icon: "information-circle-outline", color: COLORS.info },
  }[type];

  return (
    <Animated.View style={[styles.errorToast, animatedStyle]}>
      <View style={[styles.toastContainer, { backgroundColor: config.color + "18", borderColor: config.color }]}>
        <Ionicons name={config.icon as any} size={24} color={config.color} />
        <Text style={[styles.toastMessage, { color: config.color + "E0" }]}>{message}</Text>
        <TouchableOpacity onPress={() => {
          translateY.value = withTiming(-120, { duration: 300 });
          opacity.value = withTiming(0);
        }}>
          <Ionicons name="close" size={22} color={config.color} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// ────────────────────── MAIN SIGN-IN COMPONENT ──────────────────────
const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [secureText, setSecureText] = useState(true);
  const [error, setError] = useState<{ msg: string; type: "error" | "warning" | "info" } | null>(null);

  const router = useRouter();
  const { resetAppState } = useContext(AppResetContext);

  // Animations
  const inputFocus = useSharedValue(0);
  const logoY = useSharedValue(-20);
  const logoOpacity = useSharedValue(0);
  const btnScale = useSharedValue(1);
  const rippleOpacity = useSharedValue(0);
  const rippleScale = useSharedValue(0);

  const logoAnim = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoY.value }],
  }));
  const btnAnim = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));
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

  const dismissKeyboard = () => {
    Keyboard.dismiss();
    inputFocus.value = 0;
  };

  // ────── SMART LOGIN HANDLER ──────
  const handleSignIn = useCallback(async () => {
    if (!email || !password) {
      setError({ msg: "Please enter both email and password", type: "warning" });
      return;
    }
    if (!email.includes("@") || !email.includes(".")) {
      setError({ msg: "Please enter a valid email address", type: "warning" });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const user = await login(email.trim().toLowerCase(), password);
      await AsyncStorage.setItem("userSession", JSON.stringify(user));

      // Success! (Alert kept as requested)
      Alert.alert("Welcome", `Logged in as ${user.name}`);

      router.replace("homepage");
      setTimeout(() => resetAppState(), 300);
    } catch (err: any) {
      console.log("Login error:", err.message);

      let msg = "Something went wrong. Please try again.";
      let type: "error" | "warning" | "info" = "error";

      const errorText = (err.message || "").toLowerCase();

      if (errorText.includes("invalid credentials") || errorText.includes("incorrect")) {
        msg = "Incorrect email or password. Please try again.";
        type = "warning";
      } else if (errorText.includes("inactive")) {
        msg = "Your account is inactive. Please contact support.";
        type = "error";
      } else if (errorText.includes("network") || errorText.includes("failed to fetch")) {
        msg = "No internet connection. Check your network and try again.";
        type = "warning";
      } else if (errorText.includes("server") || errorText.includes("500")) {
        msg = "Server is temporarily down. Please try again later.";
        type = "error";
      } else if (errorText.includes("json") || errorText.includes("400")) {
        msg = "Invalid request. Please check your input.";
        type = "warning";
      }

      setError({ msg, type });
    } finally {
      setLoading(false);
    }
  }, [email, password, router, resetAppState]);

  // ────── CTA BUTTON ──────
  const CTAButton = ({ title, onPress, gradient }: { title: string; onPress: () => void; gradient: string[] }) => (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.ctaPressable, pressed && { opacity: 0.8 }]}>
      <LinearGradient colors={gradient} style={styles.ctaGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <Text style={styles.ctaText}>{title}</Text>
      </LinearGradient>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <View style={styles.container}>

            {/* Modern Animated Error Toast */}
            {error && <ErrorToast message={error.msg} type={error.type} />}

            {/* Logo & Title */}
            <Animated.View style={[styles.logoWrapper, logoAnim]}>
              <Image
                source={require("../../assets/images/icon1.png")}
                style={styles.logoImage}
                contentFit="contain"
              />
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to explore local businesses</Text>
            </Animated.View>

            {/* Email Input */}
            <Animated.View style={[styles.inputWrapper, inputAnim]}>
              <TextInput
                placeholder="Email"
                placeholderTextColor={COLORS.textSecondary}
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                onFocus={() => (inputFocus.value = 1)}
                onBlur={() => (inputFocus.value = 0)}
              />
            </Animated.View>

            {/* Password Input */}
            <Animated.View style={[styles.inputWrapper, inputAnim]}>
              <View style={styles.passwordRow}>
                <TextInput
                  placeholder="Password"
                  placeholderTextColor={COLORS.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={secureText}
                  style={styles.passwordInput}
                  onFocus={() => (inputFocus.value = 1)}
                  onBlur={() => (inputFocus.value = 0)}
                />
                <TouchableOpacity onPress={() => setSecureText(s => !s)} style={styles.eyeBtn}>
                  <Ionicons name={secureText ? "eye-off" : "eye"} size={22} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* Sign In Button */}
            <Animated.View style={[styles.btnWrapper, btnAnim]}>
              <TouchableOpacity
                onPressIn={startRipple}
                onPressOut={endRipple}
                onPress={handleSignIn}
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
                    <Text style={styles.btnText}>Sign In</Text>
                  )}
                  <Animated.View style={[styles.ripple, rippleAnim]} />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* CTA Buttons */}
            <View style={styles.ctaContainer}>
              <CTAButton title="Register Now" onPress={() => router.push("/RequestToken")} gradient={COLORS.ctaRegister} />
              <CTAButton title="Forgot Password?" onPress={() => router.push("/ForgotPassword")} gradient={COLORS.ctaForgot} />
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ────────────────────── STYLES ──────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: SPACING.xl, paddingVertical: SPACING.lg },

  // Toast
  errorToast: { position: "absolute", top: 60, left: 20, right: 20, zIndex: 9999 },
  toastContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderRadius: 18,
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 14,
    gap: 12,
  },
  toastMessage: { flex: 1, fontSize: 14.5, fontWeight: "600", lineHeight: 21 },

  // Logo
  logoWrapper: { alignItems: "center", marginBottom: SPACING.xl },
  logoImage: { width: width * 0.28, height: 90, marginBottom: SPACING.md },
  title: { fontSize: 30, fontWeight: "800", color: COLORS.textPrimary, letterSpacing: -0.5, marginBottom: SPACING.xs },
  subtitle: { fontSize: 15, color: COLORS.textSecondary, textAlign: "center", maxWidth: "80%" },

  // Inputs
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

  // Button
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

export default SignIn;