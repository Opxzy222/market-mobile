import React, { useEffect, useState } from "react";
import { 
  View, Text, TextInput, Image, TouchableOpacity, 
  StyleSheet, ScrollView, ActivityIndicator 
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Button } from "react-native-elements";
import { Ionicons } from "@expo/vector-icons";

const ProfileScreen = () => {
  const [user, setUser] = useState(null);
  const [phoneNo, setPhoneNo] = useState("");
  const [image, setImage] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const userIdString = await AsyncStorage.getItem("user_id");
        if (userIdString) {
          setUserId(parseInt(userIdString, 10));
        }
      } catch (error) {
        console.error("Error fetching user ID:", error);
      }
    };
    fetchUserId();
  }, []);

  useEffect(() => {
    if (userId) {
      axios.get(`https://172.27.243.94:8000/user/profile/${userId}/`)
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
  }, [userId]);

  const handleUpdate = async () => {
  if (!userId) {
    console.error("User ID is missing!");
    return;
  }

  const formData = new FormData();
  let hasChanges = false;

  // Append only changed text fields
  if (phoneNo !== user.phone_no) {
    formData.append("phone_no", phoneNo);
    hasChanges = true;
  }

  // Handle image file upload for web
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
      `https://172.27.243.94:8000/user/profile/${userId}/`,
      formData,
      {
        headers: {
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
      setImage(result.assets[0].uri);  // Instant update
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
        <Text style={styles.loadingText}>User profile not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileCard}>
        <View style={styles.imageContainer}>
          <TouchableOpacity onPress={pickImage}>
            <Image source={{ uri: image || user.image }} style={styles.profileImage} />
          </TouchableOpacity>
          <TouchableOpacity onPress={pickImage} style={styles.uploadIcon}>
            <Ionicons name="camera" size={20} color="white" />
          </TouchableOpacity>
        </View>

        <Text style={styles.profileId}>Profile ID: {user.user_id}</Text>

        <Text style={styles.label}>First Name</Text>
        <Text style={styles.input}>{user.firstname}</Text>

        <Text style={styles.label}>Last Name</Text>
        <Text style={styles.input}>{user.lastname}</Text>

        <Text style={styles.label}>Email</Text>
        <Text style={styles.input}>{user.email}</Text>

        <Text style={styles.label}>Confirm Email (Code Verification Placeholder)</Text>
        <TextInput style={styles.input} placeholder="Enter verification code" keyboardType="number-pad" />

        <Text style={styles.label}>Phone Number</Text>
        <TextInput 
          style={styles.input} 
          value={phoneNo} 
          onChangeText={setPhoneNo} 
          keyboardType="phone-pad" 
        />

        <Text style={styles.label}>Confirm Phone Number (Code Verification Placeholder)</Text>
        <TextInput style={styles.input} placeholder="Enter verification code" keyboardType="number-pad" />

        <Button title="Update Profile" onPress={handleUpdate} buttonStyle={styles.updateButton} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafe",
    padding: 20,
  },
  profileCard: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
    alignItems: "center",
  },
  imageContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  profileImage: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 4,
    borderColor: "#007bff",
  },
  uploadIcon: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "#007bff",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  profileId: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 10,
    color: "#333",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 15,
    color: "#444",
    alignSelf: "flex-start",
  },
  input: {
    width: "100%",
    backgroundColor: "#f1f3f6",
    padding: 12,
    borderRadius: 8,
    marginTop: 5,
    borderWidth: 1,
    borderColor: "#dcdfe6",
  },
  updateButton: {
    backgroundColor: "#007bff",
    marginTop: 20,
    borderRadius: 8,
    paddingVertical: 12,
    width: "100%",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 18,
    marginTop: 10,
    color: "#333",
  },
});

export default ProfileScreen;
