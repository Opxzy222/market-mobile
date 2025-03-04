import React, { useEffect, useState } from "react";
import { 
  View, Text, TextInput, Image, TouchableOpacity, 
  StyleSheet, ScrollView, ActivityIndicator 
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@rneui/themed";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { useRouter, useLocalSearchParams } from "expo-router";

const EditProfileScreen = () => {
  const [user, setUser] = useState(null);
  const [phoneNo, setPhoneNo] = useState("");
  const [image, setImage] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const params = useLocalSearchParams();
  const { shopId, prevRoute } = params;
  const router = useRouter();

  useEffect(() => {
    const fetchSessionId = async () => {
      const sessionIdString = await AsyncStorage.getItem("sessionToken");
      setSessionId(sessionIdString);
    };
    fetchSessionId();
  }, []);

  useEffect(() => {
    if (sessionId) {
      axios.get(`https://172.27.243.94:8000/user/profile/`, {
        headers: {
          Authorization: sessionId,
        },
      })
        .then(response => {
          setUser(response.data);
          setPhoneNo(response.data.phone_no || "");
          setImage(response.data.image);
        })
        .catch(error => console.error("Error fetching profile:", error))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [sessionId]);

  const handleUpdate = async () => {
    if (!sessionId) {
      console.error("User ID is missing!");
      return;
    }

    const formData = new FormData();
    let hasChanges = false;

    if (phoneNo !== user.phone_no) {
      formData.append("phone_no", phoneNo);
      hasChanges = true;
    }

    if (image && image !== user.image) {
      try {
        const response = await fetch(image);
        const blob = await response.blob();
        const file = new File([blob], "profile.jpg", { type: "image/jpeg" });

        formData.append("image", file);
        hasChanges = true;
      } catch (error) {
        console.error("Error converting image to file:", error);
        alert("Failed to process image. Please try again.");
        return;
      }
    }

    if (!hasChanges) {
      alert("No changes made to update.");
      return;
    }

    try {
      const response = await axios.post(
        `https://172.27.243.94:8000/user/profile/`,
        formData,
        {
          headers: {
            Authorization: sessionId,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.status === 200) {
        alert("Profile updated successfully!");
      } else {
        alert("Failed to update profile.");
      }
    } catch (error) {
      console.error("Update error:", error);
      alert("An error occurred while updating the profile.");
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={["#F7F7F7", "#EAEAEA"]} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace(prevRoute || '/(tabs)/profile')}>
          <MaterialIcons name="arrow-back" size={26} color="#6B4226" />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.profileCard}>
          <View style={styles.imageContainer}>
            <TouchableOpacity onPress={pickImage}>
              <Image source={{ uri: user.image }} style={styles.profileImage} />
            </TouchableOpacity>
            <TouchableOpacity onPress={pickImage} style={styles.uploadIcon}>
              <Ionicons name="camera" size={22} color="white" />
            </TouchableOpacity>
          </View>

          <Text style={styles.profileId}>Profile ID: {user.user_id}</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>First Name</Text>
            <Text style={styles.input}>{user.firstname}</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Last Name</Text>
            <Text style={styles.input}>{user.lastname}</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.input}>{user.email}</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Email</Text>
            <TextInput style={styles.inputField} placeholder="Enter verification code" keyboardType="number-pad" />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput 
              style={styles.inputField} 
              value={phoneNo} 
              onChangeText={setPhoneNo} 
              keyboardType="phone-pad" 
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Phone Number</Text>
            <TextInput style={styles.inputField} placeholder="Enter verification code" keyboardType="number-pad" />
          </View>

          <Button title="Update Profile" onPress={handleUpdate} buttonStyle={styles.updateButton} />
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  scrollContainer: {
    paddingVertical: 30,
    alignItems: "center",
  },
  profileCard: {
    width: "90%",
    backgroundColor: "rgba(255, 255, 255, 0.3)", // Adjusted transparency for clarity
    padding: 22,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
    alignItems: "center",
  },
  imageContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  profileImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: "#4F73B6",
  },
  uploadIcon: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: "#4F73B6",
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  profileId: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 12,
    color: "#2D3748",
  },
  inputGroup: {
    width: "100%",
    marginBottom: 14,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4A5568",
    marginBottom: 5,
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.6)", // Softer contrast
    padding: 14,
    borderRadius: 10,
    fontSize: 16,
    color: "#2D3748",
  },
  inputField: {
    backgroundColor: "rgba(255, 255, 255, 0.8)", // More solid for better readability
    padding: 14,
    borderRadius: 10,
    fontSize: 16,
    color: "#2D3748",
  },
  updateButton: {
    backgroundColor: "#4F73B6",
    marginTop: 20,
    borderRadius: 10,
    paddingVertical: 12,
    width: "100%",
  },
});

export default EditProfileScreen;