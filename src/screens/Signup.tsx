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
} from "react-native";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const navigation = useNavigation();

  const handleSignUp = async () => {
    const formData = new FormData();
    formData.append("email", email);
    formData.append("firstname", firstName);
    formData.append("lastname", lastName);
    formData.append("password", password);

    try {
      const response = await axios.post("https://172.27.243.94:8000/create-user/", formData);
      const responseData = response.data;

      if (responseData.message === "account created successfully") {
        Alert.alert("Success", "User created successfully");
        navigation.navigate("login");
      } else {
        Alert.alert("Error", responseData.message || "Sign up failed");
      }
    } catch (error) {
      console.error("Error during signup", error);
      Alert.alert("Error", "An error occurred. Please try again.");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image
        source={require('../../assets/images/icon1.png')} // Replace with your image path
        style={styles.image}
        resizeMode="contain"
      />
      <Text style={styles.title}>Sign Up</Text>
      <TextInput
        placeholder="Email"
        onChangeText={setEmail}
        value={email}
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholderTextColor="#888"
      />
      <TextInput
        placeholder="First Name"
        onChangeText={setFirstName}
        value={firstName}
        style={styles.input}
        autoCapitalize="words"
        placeholderTextColor="#888"
      />
      <TextInput
        placeholder="Last Name"
        onChangeText={setLastName}
        value={lastName}
        style={styles.input}
        autoCapitalize="words"
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
      <TouchableOpacity onPress={handleSignUp} style={styles.button}>
        <Text style={styles.buttonText}>Create Account</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => navigation.navigate("login")}
        style={styles.link}
      >
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
