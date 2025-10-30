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
} from "react-native-reanimated";
import { Image } from "expo-image";
import { AppResetContext } from "@/context/AppResetContext";

const { width, height } = Dimensions.get("window");
const API_URL = "/login/";

// ────────────────────── THEMING (LIGHT MODE) ──────────────────────
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
  border: "#E5E7EB",
  inputBg: "#F9FAFB",
  glow: "#60A5FA",
  ctaRegister: ["#10B981", "#34D399"],
  ctaForgot: ["#F59E0B", "#FBBF24"],
};

const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

// ────────────────────── LOGIN API ──────────────────────
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
  throw new Error(response.data.message || "Login failed");
}

// ────────────────────── SIGN-IN COMPONENT ──────────────────────
const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [secureText, setSecureText] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const router = useRouter();
  const { resetAppState } = useContext(AppResetContext);

  // Shared focus state for all inputs
  const inputFocus = useSharedValue(0);

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

  // ────── Ripple Effect ──────
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
    inputFocus.value = 0; // Remove glow from all inputs
  };

  // ────── Login Handler ──────
  const handleSignIn = useCallback(async () => {
    if (!email || !password) {
      setErrorMessage("Please enter both email and password");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const user = await login(email, password);
      await AsyncStorage.setItem("userSession", JSON.stringify(user));

      Alert.alert("Welcome", `Logged in as ${user.name}`);

      router.replace("homepage");
      setTimeout(() => resetAppState(), 300);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  }, [email, password, router, resetAppState]);

  // ────── CTA Button ──────
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
        {/* ────── TAP OUTSIDE TO DISMISS ────── */}
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <View style={styles.container}>
            {/* ────── LOGO & TITLE ────── */}
            <Animated.View style={[styles.logoWrapper, logoAnim]}>
              <Image
                source={require("../../assets/images/icon1.png")}
                style={styles.logoImage}
                contentFit="contain"
              />
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to explore local businesses</Text>
            </Animated.View>

            {/* ────── ERROR ────── */}
            {errorMessage ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={18} color={COLORS.error} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* ────── INPUTS (Shared Focus) ────── */}
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

            {/* ────── SIGN IN BUTTON ────── */}
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

            {/* ────── CTA BUTTONS (Always visible) ────── */}
            <View style={styles.ctaContainer}>
              <CTAButton
                title="Register Now"
                onPress={() => router.push("/RequestToken")}
                gradient={COLORS.ctaRegister}
              />
              <CTAButton
                title="Forgot Password?"
                onPress={() => router.push("/ForgotPassword")}
                gradient={COLORS.ctaForgot}
              />
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ────────────────────── STYLES (Unchanged) ──────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    minHeight: height * 0.9,
  },

  // LOGO
  logoWrapper: {
    alignItems: "center",
    marginBottom: SPACING.xl,
  },
  logoImage: {
    width: width * 0.28,
    height: 90,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    maxWidth: "80%",
  },

  // ERROR
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    padding: SPACING.sm,
    borderRadius: SPACING.sm,
    marginBottom: SPACING.lg,
    width: "100%",
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.error,
    marginLeft: SPACING.xs,
    flex: 1,
  },

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
  input: {
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  passwordInput: {
    flex: 1,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  eyeBtn: {
    padding: SPACING.sm,
  },

  // SIGN IN BUTTON
  btnWrapper: {
    width: "100%",
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
    borderRadius: SPACING.md,
    overflow: "hidden",
  },
  btnTouch: {
    position: "relative",
  },
  btnGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  ripple: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.4)",
    borderRadius: SPACING.md,
  },

  // CTA BUTTONS
  ctaContainer: {
    width: "100%",
    gap: SPACING.sm,
  },
  ctaPressable: {
    borderRadius: 999,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
  },
  ctaGradient: {
    paddingVertical: 14,
    alignItems: "center",
  },
  ctaText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.white,
    letterSpacing: 0.3,
  },
});

export default SignIn;