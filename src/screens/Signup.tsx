import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function SignUp() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [secureText, setSecureText] = useState(true);
  const [secureConfirmText, setSecureConfirmText] = useState(true);
  const [loading, setLoading] = useState(false); // 👈 loading state

  const router = useRouter();
  const params = useLocalSearchParams();
  const { email } = params;

  const validatePassword = (password) => ({
    length: password.length >= 8,
    capital: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
  });

  const passwordChecks = validatePassword(password);

  const handleSignUp = async () => {
    if (loading) return;

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (!passwordChecks.length || !passwordChecks.capital || !passwordChecks.number) {
      Alert.alert(
        "Error",
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
    try {
      const response = await axios.post(
        "https://retail-alvinia-goza-f6a0e4f7.koyeb.app/complete-registration/",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.message === "Registration successful") {
        Alert.alert("Account Created Successfully ✅");
        router.push("/login");
      } else {
        Alert.alert("Error", response.data.message || "Sign-up failed");
      }
    } catch (error) {
      const errMsg = error.response?.data?.error || "An error occurred. Please try again.";
      Alert.alert("Error", errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image source={require("../../assets/images/icon1.png")} style={styles.image} resizeMode="contain" />
      <Text style={styles.title}>Sign Up</Text>
      <TextInput placeholder="First Name" onChangeText={setFirstName} value={firstName} style={styles.input} autoCapitalize="words" placeholderTextColor="#888" />
      <TextInput placeholder="Last Name" onChangeText={setLastName} value={lastName} style={styles.input} autoCapitalize="words" placeholderTextColor="#888" />
      
      <View style={styles.passwordContainer}>
        <TextInput placeholder="Password" onChangeText={setPassword} value={password} secureTextEntry={secureText} style={styles.passwordInput} placeholderTextColor="#888" />
        <TouchableOpacity onPress={() => setSecureText(!secureText)}>
          <Ionicons name={secureText ? "eye-off" : "eye"} size={24} color="#777" />
        </TouchableOpacity>
      </View>

      <View style={styles.passwordContainer}>
        <TextInput placeholder="Confirm Password" onChangeText={setConfirmPassword} value={confirmPassword} secureTextEntry={secureConfirmText} style={styles.passwordInput} placeholderTextColor="#888" />
        <TouchableOpacity onPress={() => setSecureConfirmText(!secureConfirmText)}>
          <Ionicons name={secureConfirmText ? "eye-off" : "eye"} size={24} color="#777" />
        </TouchableOpacity>
      </View>

      <View style={styles.passwordChecks}>
        <Text style={{ color: passwordChecks.length ? "green" : "red" }}>✔ At least 8 characters</Text>
        <Text style={{ color: passwordChecks.capital ? "green" : "red" }}>✔ At least 1 capital letter</Text>
        <Text style={{ color: passwordChecks.number ? "green" : "red" }}>✔ At least 1 number</Text>
      </View>

      <TouchableOpacity onPress={handleSignUp} style={styles.button} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Create Account</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/login")} style={styles.link}>
        <Text style={styles.linkText}>Already have an account? Sign In</Text>
      </TouchableOpacity>
    </ScrollView>
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
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: "#fff",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    padding: 15,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fff",
    marginBottom: 15,
  },
  passwordInput: {
    flex: 1,
    paddingRight: 10,
  },
  passwordChecks: {
    alignSelf: "flex-start",
    marginBottom: 10,
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
  link: {
    marginTop: 20,
  },
  linkText: {
    color: "#3498db",
    fontSize: 14,
  },
});
