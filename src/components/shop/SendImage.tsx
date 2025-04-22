import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  Image,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { Ionicons } from "@expo/vector-icons";

const SendImage = ({ onSend }) => {
  console.log("SendImage render start");

  const [selectedImage, setSelectedImage] = useState(null);
  const [imageValid, setImageValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    console.log("useEffect: selectedImage changed:", selectedImage);
    if (!selectedImage) {
      setImageValid(false);
      setImageError(false);
      return;
    }

    const validateImage = async () => {
      try {
        console.log("Validating URI:", selectedImage.uri);
        const info = await FileSystem.getInfoAsync(selectedImage.uri);
        if (!info.exists || info.isDirectory) {
          throw new Error("Image file not found");
        }
        console.log("URI valid, size:", info.size);
        setImageValid(true);
        setImageError(false);
      } catch (error) {
        console.error("Image validation failed:", error);
        setImageValid(false);
        setImageError(true);
        Alert.alert("Error", "Invalid image file. Please try another.");
      } finally {
        setIsLoading(false);
      }
    };

    setIsLoading(true);
    validateImage();
  }, [selectedImage]);

  const pickImage = async () => {
    try {
      console.log("Requesting permissions...");
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "We need access to your photo library to select images."
        );
        return;
      }

      console.log("Launching image picker...");
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.5, // Lower quality for old devices
      });

      console.log("Picker result:", JSON.stringify(result, null, 2));

      if (!result.canceled && result.assets?.length > 0) {
        const { uri, fileName, mimeType } = result.assets[0];

        if (!mimeType?.startsWith("image/")) {
          Alert.alert("Error", "Please select a valid image file.");
          return;
        }

        setSelectedImage({
          uri,
          name: fileName || `image_${Date.now()}.jpg`,
        });
      } else {
        console.log("Picker canceled or no assets selected.");
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to select image. Please try again.");
    }
  };

  const handleRemoveImage = () => {
    console.log("Removing image");
    setSelectedImage(null);
    setImageValid(false);
    setImageError(false);
    setIsLoading(false);
  };

  const handleSend = () => {
    if (selectedImage && imageValid) {
      console.log("Sending image:", selectedImage);
      onSend(selectedImage);
      setSelectedImage(null);
      setImageValid(false);
      setImageError(false);
      setIsLoading(false);
    }
  };

  console.log(
    "SendImage render end, selectedImage:",
    selectedImage,
    "imageValid:",
    imageValid,
    "imageError:",
    imageError
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={pickImage} style={styles.optionCard}>
        <Ionicons
          name="image-outline"
          size={24}
          color="#e67e22" // Matches original; change to #9b59b6 if preferred
          style={styles.optionIcon}
        />
        <Text style={styles.optionText}>Select Image</Text>
      </TouchableOpacity>

      {selectedImage && (
        <View style={styles.previewContainer}>
          {isLoading ? (
            <View style={styles.placeholder}>
              <ActivityIndicator size="small" color="#999" />
            </View>
          ) : imageError || !imageValid ? (
            <View style={styles.placeholder}>
              <Ionicons
                name="image-outline"
                size={40}
                color="#999"
                style={styles.placeholderIcon}
              />
              <Text style={styles.errorText}>No preview available</Text>
            </View>
          ) : (
            <Image
              source={{ uri: selectedImage.uri }}
              style={styles.previewImage}
              resizeMode="cover" // Matches SendVideo
            />
          )}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              onPress={handleRemoveImage}
              style={styles.removeButton}
            >
              <Ionicons name="trash" size={24} color="#ff4d4d" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSend}
              style={[styles.sendButton, !imageValid && styles.sendButtonDisabled]}
              disabled={!imageValid}
            >
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  optionIcon: {
    marginRight: 10,
  },
  optionText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },
  previewContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  previewImage: {
    width: 150, // Matches SendVideo
    height: 150,
    borderRadius: 10,
  },
  placeholder: {
    width: 150,
    height: 150,
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderIcon: {
    marginBottom: 5,
  },
  errorText: {
    color: "#ff4d4d",
    fontSize: 12,
    textAlign: "center",
  },
  actionButtons: {
    flexDirection: "row",
    marginTop: 10,
    alignItems: "center",
    gap: 20,
  },
  removeButton: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ff4d4d",
  },
  sendButton: {
    backgroundColor: "#28a745",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  sendButtonDisabled: {
    backgroundColor: "#cccccc",
    opacity: 0.5,
  },
  sendButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default SendImage;