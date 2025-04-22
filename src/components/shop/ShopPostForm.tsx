import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";

const ShopPostForm = ({ shopId }) => {
  console.log("ShopPostForm render start");

  const [description, setDescription] = useState("");
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(false);

  const pickMedia = async () => {
    try {
      console.log("Launching document picker...");
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "video/*"],
        copyToCacheDirectory: true,
        multiple: true,
      });

      console.log("Picker result:", JSON.stringify(result, null, 2));

      if (!result.canceled && result.assets?.length > 0) {
        const newMediaPromises = result.assets.map(async (asset) => {
          const { uri, name, mimeType, size } = asset;
          const isVideo = mimeType?.startsWith("video/");
          const isImage = mimeType?.startsWith("image/");

          if (!isImage && !isVideo) {
            Alert.alert(
              "Warning",
              `File "${name || "selected file"}" is not a valid image or video.`
            );
            return null;
          }

          // Validate URI and size
          try {
            console.log("Validating URI:", uri);
            const info = await FileSystem.getInfoAsync(uri);
            if (!info.exists || info.isDirectory) {
              throw new Error("File not found");
            }
            console.log("URI valid, size:", info.size);

            // Limit file size (e.g., 10 MB)
            if (info.size > 10 * 1024 * 1024) {
              Alert.alert(
                "Warning",
                `File "${name || "selected file"}" is too large (max 10 MB).`
              );
              return null;
            }

            // Skip duration check
            if (isVideo) {
              console.log(
                "Skipping duration check for:",
                name,
                "(videos longer than 2 minutes may be rejected)"
              );
            }

            return {
              id: `${uri}_${Date.now()}`,
              uri,
              name: name || `media_${Date.now()}.${isVideo ? "mp4" : "jpg"}`,
              type: isVideo ? "video" : "image",
              valid: true,
            };
          } catch (error) {
            console.error("Validation failed for:", uri, error);
            Alert.alert(
              "Warning",
              `File "${name || "selected file"}" is invalid and will be skipped.`
            );
            return null;
          }
        });

        const newMedia = (await Promise.all(newMediaPromises)).filter(
          (item) => item !== null
        );
        setMedia((prevMedia) => [...prevMedia, ...newMedia]);
      } else {
        console.log("Picker canceled or no assets selected.");
      }
    } catch (error) {
      console.error("Error picking media:", error);
      Alert.alert("Error", "Failed to select media. Please try again.");
    }
  };

  const removeMedia = (id) => {
    console.log("Removing media:", id);
    setMedia((prevMedia) => prevMedia.filter((m) => m.id !== id));
  };

  const handleSubmit = async () => {
    if (!description.trim() || media.length === 0) {
      Alert.alert("Error", "Please add a description and at least one media file.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("shop_id", shopId);
    formData.append("description", description);

    // Validate media before appending
    const validMedia = [];
    for (const file of media) {
      if (file.valid) {
        try {
          const info = await FileSystem.getInfoAsync(file.uri);
          if (!info.exists) {
            console.log("File inaccessible:", file.uri);
            Alert.alert(
              "Warning",
              `File "${file.name}" is no longer accessible and will be skipped.`
            );
            continue;
          }
          const newFile = {
            uri: file.uri.startsWith("file://") ? file.uri : `file://${file.uri}`,
            type: file.type === "image" ? "image/jpeg" : "video/mp4",
            name: file.name,
          };
          console.log("Appending File:", newFile);
          formData.append("files", newFile);
          validMedia.push(file);
        } catch (error) {
          console.error("File validation failed before submit:", file.uri, error);
          Alert.alert(
            "Warning",
            `File "${file.name}" is invalid and will be skipped.`
          );
        }
      }
    }

    if (validMedia.length === 0) {
      setLoading(false);
      Alert.alert("Error", "No valid media files to submit.");
      setMedia([]);
      return;
    }

    try {
      console.log("Sending FormData with files:", validMedia.length);
      const response = await axios.post(
        `https://retail-alvinia-goza-f6a0e4f7.koyeb.app/shops/${shopId}/posts/create/`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          timeout: 30000, // 30s timeout
        }
      );

      console.log("Server Response:", response.data);
      Alert.alert("Success", "Post created successfully!");
      setDescription("");
      setMedia([]);
    } catch (error) {
      console.error(
        "Error submitting post:",
        error.response?.data || error.message
      );
      let errorMessage = "Failed to submit post.";
      if (error.code === "ECONNABORTED") {
        errorMessage = "Request timed out. Please check your network.";
      } else if (error.response) {
        errorMessage = `Server error: ${
          error.response.data?.message || error.response.status
        }`;
      } else if (error.message.includes("Network Error")) {
        errorMessage = "Network error. Please check your connection.";
      }
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  console.log("ShopPostForm render end, media count:", media.length);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create a Post</Text>

      <Text style={styles.subtitle}>Select Media (Images or Videos)</Text>
      <TouchableOpacity onPress={pickMedia} style={styles.optionCard}>
        <Ionicons
          name="image-outline"
          size={24}
          color="#e67e22"
          style={styles.optionIcon}
        />
        <Text style={styles.optionText}>Add Images or Videos</Text>
      </TouchableOpacity>

      <View style={styles.mediaPreviewContainer}>
        {media.map((item) => (
          <View key={item.id} style={styles.mediaPreviewWrapper}>
            {!item.valid ? (
              <View style={styles.placeholder}>
                <Ionicons
                  name={item.type === "image" ? "image-outline" : "videocam-outline"}
                  size={40}
                  color="#999"
                  style={styles.placeholderIcon}
                />
                <Text style={styles.errorText}>No preview</Text>
              </View>
            ) : item.type === "image" ? (
              <Image
                source={{ uri: item.uri }}
                style={styles.mediaPreview}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.mediaPreview}>
                <Image
                  source={{ uri: item.uri }}
                  style={styles.mediaPreview}
                  resizeMode="cover"
                />
                <View style={styles.playIconContainer}>
                  <Ionicons
                    name="play-circle"
                    size={40}
                    color="rgba(255, 255, 255, 0.8)"
                  />
                </View>
              </View>
            )}
            <TouchableOpacity
              style={styles.removeMediaButton}
              onPress={() => removeMedia(item.id)}
            >
              <Ionicons name="close-circle" size={24} color="#ff4d4d" />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <TextInput
        style={styles.input}
        placeholder="Enter post description"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Post</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#f9f9f9",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 10,
    color: "#555",
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
  mediaPreviewContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
    gap: 10,
  },
  mediaPreviewWrapper: {
    position: "relative",
    marginBottom: 10,
  },
  mediaPreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  playIconContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -20 }, { translateY: -20 }],
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 20,
    padding: 5,
  },
  placeholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderIcon: {
    marginBottom: 5,
  },
  errorText: {
    color: "#ff4d4d",
    fontSize: 10,
    textAlign: "center",
  },
  removeMediaButton: {
    position: "absolute",
    top: -8,
    right: -8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 10,
    fontSize: 16,
    backgroundColor: "#fff",
    marginBottom: 15,
    minHeight: 100,
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: "#28a745",
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#6c757d",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ShopPostForm;