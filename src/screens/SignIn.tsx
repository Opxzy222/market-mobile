import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Image,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const API_URL = "https://retail-alvinia-goza-f6a0e4f7.koyeb.app/login/";

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
      const { user_id, session_id, user_name, userId , userVerified} = response.data;
      console.log("Login response user_id:", user_id);
      await AsyncStorage.setItem("sessionToken", session_id);
      await AsyncStorage.setItem("user_id", user_id.toString());
      await AsyncStorage.setItem("userId", userId);
      await AsyncStorage.setItem("user_name", user_name);
      await AsyncStorage.setItem("user_verified", JSON.stringify(userVerified));
      console.log(userVerified)
      return { id: user_id, name: user_name };
    }
    throw new Error(response.data.message || "Login failed");
  } catch (error) {
    console.error("Login API error:", error.response?.data?.error || error.message);
    throw new Error(error.response?.data?.error || "Invalid credentials");
  }
}

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [secureText, setSecureText] = useState(true);
  const router = useRouter();

  const handleSignIn = async () => {
    console.log("handleSignIn started");
    setLoading(true);
    try {
      console.log("Calling login with:", { email, password });
      const user = await login(email, password);
      console.log("Login successful:", user);
      await AsyncStorage.setItem("userSession", JSON.stringify(user));
      Alert.alert("Welcome", `Logged in as ${user.name}`);
      console.log("Navigating to homepage");
      router.push("homepage");
    } catch (error) {
      console.error("Login error:", error.message);
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled" // Allow taps with keyboard open
      >
        <Image
          source={require("../../assets/images/icon1.png")}
          style={styles.image}
          resizeMode="contain"
        />
        <Text style={styles.title}>Login</Text>
        <TextInput
          placeholder="Email"
          onChangeText={setEmail}
          value={email}
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="#bbb"
        />
        <View style={styles.passwordContainer}>
          <TextInput
            placeholder="Password"
            onChangeText={setPassword}
            value={password}
            secureTextEntry={secureText}
            style={styles.passwordInput}
            placeholderTextColor="#bbb"
          />
          <TouchableOpacity
            onPress={() => {
              console.log("Toggle secure text");
              setSecureText(!secureText);
            }}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            activeOpacity={0.7} // Visual feedback
            style={styles.iconButton}
          >
            <Ionicons name={secureText ? "eye-off" : "eye"} size={24} color="#777" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          onPress={() => {
            console.log("Login button pressed");
            handleSignIn();
          }}
          disabled={loading}
          style={styles.button}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          activeOpacity={0.7}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            console.log("Navigating to RequestToken");
            router.push("/RequestToken");
          }}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          activeOpacity={0.7}
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
        >
          <Text style={styles.linkText}>Forgot Password?</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f7f8fc",
  },
  image: {
    width: "70%",
    height: 150,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  input: {
    width: "100%",
    padding: 15,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    marginBottom: 15,
    backgroundColor: "#f9f9f9",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    padding: 7,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    backgroundColor: "#f9f9f9",
  },
  passwordInput: {
    flex: 1,
    paddingRight: 10,
  },
  iconButton: {
    padding: 10, // Add padding for touch area
    zIndex: 1,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
    marginTop: 20,
    zIndex: 1,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  linkText: {
    color: "#007AFF",
    fontSize: 16,
    marginTop: 10,
  },
});