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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";

// Authentication logic
async function login(email: string, password: string) {
  const formData = new FormData();
  formData.append("email", email);
  formData.append("password", password);

  const response = await axios.post("https://172.27.243.94:8000/login/", formData);
  if (response.data.message === "login successful") {
    const { user_id, session_id, user_name } = response.data;
    await AsyncStorage.setItem("sessionToken", session_id);
    await AsyncStorage.setItem("user_id", user_id.toString());
    await AsyncStorage.setItem("user_name", user_name);
    return { id: user_id, name: user_name };
  }
  throw new Error(response.data.message || "Login failed");
}

// SignIn component
export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const handleSignIn = async () => {
    setLoading(true);
    try {
      const user = await login(email, password);
      await AsyncStorage.setItem("userSession", JSON.stringify(user)); // Save session
      Alert.alert("Welcome", `Logged in as ${user.name}`);
      navigation.navigate("homepage");
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/icon1.png')} // Replace with your image path
        style={styles.image}
        resizeMode="contain"
      />
      <Text style={styles.title}>Login</Text>
      <TextInput
        placeholder="Email ID"
        onChangeText={setEmail}
        value={email}
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholderTextColor="#888"
      />
      <TextInput
        placeholder="Password"
        onChangeText={setPassword}
        value={password}
        secureTextEntry
        style={styles.input}
        placeholderTextColor="#888"
      />
      <TouchableOpacity
        onPress={() => navigation.navigate("ForgotPassword")}
        style={styles.forgotPassword}
      >
        <Text style={styles.linkText}>Forgot Password?</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleSignIn} disabled={loading} style={styles.button}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
      </TouchableOpacity>
      <Text style={styles.orText}>OR</Text>
      <TouchableOpacity style={styles.googleButton}>
        <Text style={styles.googleButtonText}>Login with Google</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => navigation.navigate("signup")}
        style={styles.registerLink}
      >
        <Text style={styles.linkText}>Don't have an account yet? Register</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: "#fff",
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 15,
  },
  linkText: {
    color: "blue",
    fontSize: 16,
  },
  button: {
    backgroundColor: "#3498db",
    padding: 15,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  orText: {
    marginVertical: 15,
    fontSize: 14,
    color: "#888",
  },
  googleButton: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    width: "100%",
    alignItems: "center",
    marginBottom: 20,
  },
  googleButtonText: {
    color: "#555",
    fontSize: 16,
  },
  registerLink: {
    marginTop: 20,
  },
});
