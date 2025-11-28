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
import { useLocalSearchParams, useRouter } from "expo-router";
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

const VerifyEmailScreen = () => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [timer, setTimer] = useState(30);

  const router = useRouter();
  const params = useLocalSearchParams();
  const { email } = params;

  // Countdown Timer
  useEffect(() => {
    if (resendDisabled && timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    } else if (timer === 0) {
      setResendDisabled(false);
      setTimer(30);
    }
  }, [resendDisabled, timer]);

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

  const handleVerify = async () => {
  if (!/^\d{6}$/.test(code)) {
    Alert.alert("Invalid Code", "Please enter a valid 6-digit code.");
    return;
  }

  setLoading(true);
  try {
    const response = await fetch("https://api.gogo-digital.com/verify-email/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: code }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Verification failed");
    }

    Alert.alert("Success", "Email verified successfully!");
    router.push({ pathname: "/signup", params: { email } });
  } catch (error: any) {
    Alert.alert("Verification Failed", error.message || "Invalid or expired code.");
  } finally {
    setLoading(false);
  }
};

  const handleResendCode = async () => {
    setResendDisabled(true);
    setTimer(30);

    try {
      await api.post(
        "/request-email-verification/",
        { email },
        { headers: { "Content-Type": "application/json" } }
      );
      Alert.alert("Success", "A new code has been sent!");
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || "Failed to resend.");
      setResendDisabled(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#3A7BD5" />

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
                onPress={() => router.back()}
                style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="arrow-back" size={26} color="white" />
              </Pressable>
              <Text style={styles.headerTitle}>Verify Your Email</Text>
              <View style={styles.headerSpacer} />
            </View>

            {/* CONTENT */}
            <View style={styles.contentWrapper}>
              <Text style={styles.title}>Enter Verification Code</Text>
              <Text style={styles.subtitle}>
                We sent a 6-digit code to{'\n'}
                <Text style={{ fontWeight: "600" }}>{email}</Text>
              </Text>

              {/* GLASS INPUT */}
              <Animated.View style={[styles.inputWrapper, inputAnim]}>
                <TextInput
                  placeholder="••••••"
                  placeholderTextColor="#6B7280"
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  style={styles.codeInput}
                  autoFocus
                  onFocus={() => (inputFocus.value = 1)}
                  onBlur={() => (inputFocus.value = 0)}
                />
              </Animated.View>

              {/* VERIFY BUTTON */}
              <Animated.View style={[styles.btnWrapper, btnAnim]}>
                <TouchableOpacity
                  onPressIn={startRipple}
                  onPressOut={endRipple}
                  onPress={handleVerify}
                  disabled={loading}
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
                      <Text style={styles.btnText}>Verify Email</Text>
                    )}
                    <Animated.View style={[styles.ripple, rippleAnim]} />
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              {/* RESEND BUTTON */}
              <TouchableOpacity
                onPress={handleResendCode}
                disabled={resendDisabled}
                style={[styles.resendButton, resendDisabled && styles.buttonDisabled]}
              >
                <Text style={styles.resendText}>
                  {resendDisabled ? `Resend in ${timer}s` : "Resend Code"}
                </Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7FAFC" },
  gradient: { flex: 1 },
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
    paddingBottom: 80,
    justifyContent: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 24,
  },

  inputWrapper: {
    width: "100%",
    marginBottom: 32,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  codeInput: {
    padding: 20,
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: 12,
    textAlign: "center",
    color: "#111827",
  },

  btnWrapper: { width: "100%", marginBottom: 20, borderRadius: 16, overflow: "hidden" },
  btnTouch: { position: "relative" },
  btnGradient: { paddingVertical: 18, alignItems: "center", justifyContent: "center" },
  btnText: { fontSize: 17, fontWeight: "700", color: "#FFFFFF" },
  ripple: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.4)",
    borderRadius: 16,
  },

  resendButton: {
    backgroundColor: "#28A745",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonDisabled: { backgroundColor: "#86EFAC" },
  resendText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
});

export default VerifyEmailScreen;