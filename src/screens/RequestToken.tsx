import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";
import { useRouter, usePathname } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import api from "../api";

const RequestTokenScreen = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(30);

  const router = useRouter();
  const pathname = usePathname();

  // Countdown timer
  useEffect(() => {
    if (resendDisabled && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setResendDisabled(false);
      setCountdown(30);
    }
  }, [resendDisabled, countdown]);

  // Animations
  const btnScale = useSharedValue(1);
  const rippleOpacity = useSharedValue(0);
  const rippleScale = useSharedValue(0);
  const inputFocus = useSharedValue(0);

  const btnAnim = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));
  const rippleAnim = useAnimatedStyle(() => ({
    opacity: rippleOpacity.value,
    transform: [{ scale: rippleScale.value }],
  }));
  const inputAnim = useAnimatedStyle(() => ({
    borderColor: withTiming(inputFocus.value ? "#60A5FA" : "#E5E7EB", { duration: 250 }),
    shadowOpacity: withTiming(inputFocus.value ? 0.25 : 0.1),
    shadowRadius: withTiming(inputFocus.value ? 12 : 6),
  }));

  const startRipple = () => {
    rippleScale.value = withSpring(4);
    rippleOpacity.value = withTiming(0.5, { duration: 150 });
    btnScale.value = withSpring(0.96);
  };
  const endRipple = () => {
    rippleOpacity.value = withTiming(0, { duration: 400 });
    btnScale.value = withSpring(1);
  };

  const handleRequestVerification = async () => {
    if (!email.includes("@") || !email.includes(".")) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      await api.post(
        "/request-email-verification/",
        { email },
        { headers: { "Content-Type": "application/json" } }
      );

      Alert.alert("Success", "A verification email has been sent.");
      router.push({
        pathname: "/VerifyEmail",
        params: { email, prevRoute: pathname },
      });

      setResendDisabled(true);
      setCountdown(30);
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#3A7BD5" />

      {/* KEYBOARD AVOIDING + SCROLLVIEW */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient colors={["#F7FAFC", "#E5E7EB"]} style={styles.gradient}>
            {/* HEADER */}
            <View style={styles.header}>
              <Pressable
                onPress={() => router.push("/login")}
                style={({ pressed }) => [
                  styles.backButton,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Ionicons name="arrow-back" size={26} color="white" />
              </Pressable>
              <Text style={styles.headerTitle}>Enter Your Email</Text>
              <View style={styles.headerSpacer} />
            </View>

            {/* MAIN CONTENT */}
            <View style={styles.contentWrapper}>
              <Text style={styles.title}>Enter Your Email Address</Text>
              <Text style={styles.subtitle}>
                We’ll send a 6-digit code to verify your account
              </Text>

              {/* GLASS INPUT */}
              <Animated.View style={[styles.inputWrapper, inputAnim]}>
                <TextInput
                  placeholder="Email Address"
                  placeholderTextColor="#6B7280"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                  onFocus={() => (inputFocus.value = 1)}
                  onBlur={() => (inputFocus.value = 0)}
                />
              </Animated.View>

              {/* ANIMATED BUTTON */}
              <Animated.View style={[styles.btnWrapper, btnAnim]}>
                <TouchableOpacity
                  onPressIn={startRipple}
                  onPressOut={endRipple}
                  onPress={handleRequestVerification}
                  disabled={loading || resendDisabled}
                  activeOpacity={1}
                  style={styles.btnTouch}
                >
                  <LinearGradient
                    colors={["#3B82F6", "#8B5CF6"]}
                    style={styles.btnGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.btnText}>
                        {resendDisabled
                          ? `Resend in ${countdown}s`
                          : "Send Verification Code"}
                      </Text>
                    )}
                    <Animated.View style={[styles.ripple, rippleAnim]} />
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              {/* LINK */}
              <Pressable
                onPress={() =>
                  router.push({ pathname: "/VerifyEmail", params: { email } })
                }
                style={({ pressed }) => [pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.linkText}>Already have a code? Verify now</Text>
              </Pressable>
            </View>
          </LinearGradient>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7FAFC",
  },
  gradient: {
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
    textAlign: "center",
    flex: 1,
  },
  headerSpacer: { width: 42 },

  contentWrapper: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 60, // extra space for keyboard
    justifyContent: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
    letterSpacing: -0.3,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    marginBottom: 32,
    lineHeight: 22,
    textAlign: "center",
  },
  inputWrapper: {
    width: "100%",
    marginBottom: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: "hidden",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  input: {
    padding: 18,
    fontSize: 17,
    color: "#111827",
  },
  btnWrapper: {
    width: "100%",
    marginBottom: 20,
    borderRadius: 14,
    overflow: "hidden",
  },
  btnTouch: {
    position: "relative",
  },
  btnGradient: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.4,
  },
  ripple: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.4)",
    borderRadius: 14,
  },
  linkText: {
    textAlign: "center",
    color: "#1E40AF",
    fontSize: 15,
    fontWeight: "500",
    marginTop: 10,
  },
});

export default RequestTokenScreen;