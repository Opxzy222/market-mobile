import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  Platform,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";

const ShopPostForm = ({ shopId }) => {
  const [description, setDescription] = useState("");
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const textInputRef = useRef(null);
  const renderCountRef = useRef(0);

  useEffect(() => {
    renderCountRef.current += 1;
    console.log(`ShopPostForm rendered (count: ${renderCountRef.current})`);
    return () => {
      console.log("ShopPostForm unmounted");
    };
  }, []);

  const pickMedia = useCallback(async () => {
    console.log("Picking media");
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "video/*"],
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (!result.canceled && result.assets?.length > 0) {
        if (result.assets.length < 2 && Platform.OS !== "web") {
          Alert.alert(
            "Info",
            "Only one file selected. Want to add more?",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Add More", onPress: pickMedia },
            ]
          );
        }

        const newMediaPromises = result.assets.map(async (asset) => {
          const { uri, name, mimeType, size } = asset;
          const isVideo = mimeType?.startsWith("video/");
          const isImage = mimeType?.startsWith("image/");

          if (!isImage && !isVideo) {
            Alert.alert("Warning", `File "${name}" is not a valid image or video.`);
            return null;
          }

          try {
            const info = await FileSystem.getInfoAsync(uri);
            if (!info.exists || info.isDirectory) {
              throw new Error("File not found");
            }

            if (info.size > 10 * 1024 * 1024) {
              Alert.alert("Warning", `File "${name}" is too large (max 10 MB).`);
              return null;
            }

            return {
              id: `${uri}_${Date.now()}`,
              uri,
              name: name || `media_${Date.now()}.${isVideo ? "mp4" : "jpg"}`,
              type: isVideo ? "video" : "image",
              mimeType,
              valid: true,
            };
          } catch (error) {
            Alert.alert("Warning", `File "${name}" is invalid and will be skipped.`);
            return null;
          }
        });

        const newMedia = (await Promise.all(newMediaPromises)).filter(
          (item) => item !== null
        );
        setMedia((prevMedia) => [...prevMedia, ...newMedia]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to select media. Please try again.");
    }
  }, []);

  const removeMedia = useCallback((id) => {
    console.log("Removing media with id:", id);
    setMedia((prevMedia) => prevMedia.filter((m) => m.id !== id));
  }, []);

  const handleSubmit = useCallback(async () => {
    console.log("Submitting post");
    Keyboard.dismiss();
    if (textInputRef.current) {
      textInputRef.current.blur();
      setIsFocused(false);
    }

    if (!description.trim() && media.length === 0) {
      Alert.alert("Error", "Please add a description or at least one media file.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("shop_id", shopId);
    formData.append("description", description);

    const validMedia = [];
    const failedMedia = [];
    for (const file of media) {
      if (file.valid) {
        try {
          const info = await FileSystem.getInfoAsync(file.uri);
          if (!info.exists) {
            failedMedia.push(file.name);
            continue;
          }
          formData.append("files", {
            uri: file.uri.startsWith("file://") ? file.uri : `file://${file.uri}`,
            type: file.mimeType || (file.type === "image" ? "image/jpeg" : "video/mp4"),
            name: file.name,
          });
          validMedia.push(file);
        } catch (error) {
          failedMedia.push(file.name);
        }
      }
    }

    if (validMedia.length === 0 && !description.trim()) {
      setLoading(false);
      Alert.alert("Error", "No valid media files or description to submit.");
      setMedia([]);
      return;
    }

    try {
      const response = await axios.post(
        `https://retail-alvinia-goza-f6a0e4f7.koyeb.app/shops/${shopId}/posts/create/`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          timeout: 30000,
        }
      );

      let successMessage = "Post created successfully!";
      if (failedMedia.length > 0) {
        successMessage += `\nWarning: ${failedMedia.length} file(s) failed to upload: ${failedMedia.join(", ")}.`;
      }
      Alert.alert("Success", successMessage);
      setDescription("");
      setMedia([]);
    } catch (error) {
      let errorMessage = "Failed to submit post.";
      if (error.code === "ECONNABORTED") {
        errorMessage = "Request timed out. Please check your network.";
      } else if (error.response) {
        errorMessage = `Server error: ${error.response.data?.message || error.response.status}`;
      } else if (error.message.includes("Network Error")) {
        errorMessage = "Network error. Please check your connection.";
      }
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  }, [description, media, shopId]);

  const handleFocus = useCallback(() => {
    console.log("Description input focused");
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    console.log("Description input blurred");
    setIsFocused(false);
  }, []);

  const renderMediaItem = useCallback(
    ({ item }) => (
      <View style={styles.mediaPreviewWrapper}>
        {!item.valid ? (
          <View style={styles.placeholder}>
            <Ionicons
              name={item.type === "image" ? "image-outline" : "videocam-outline"}
              size={40}
              color="#999"
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
          activeOpacity={0.7}
        >
          <Ionicons name="close-circle" size={24} color="#ff4d4d" />
        </TouchableOpacity>
      </View>
    ),
    [removeMedia]
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create a Post</Text>

      <Text style={styles.subtitle}>Select Media (Images or Videos)</Text>
      <TouchableOpacity
        onPress={pickMedia}
        style={styles.optionCard}
        activeOpacity={0.7}
      >
        <Ionicons
          name="image-outline"
          size={24}
          color="#e67e22"
          style={styles.optionIcon}
        />
        <Text style={styles.optionText}>Add Images or Videos</Text>
      </TouchableOpacity>

      <FlatList
        data={media}
        renderItem={renderMediaItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.mediaPreviewContainer}
        numColumns={3}
        scrollEnabled={false}
        keyboardShouldPersistTaps="always"
      />

      <TextInput
        ref={textInputRef}
        style={styles.input}
        placeholder="Enter post description"
        value={description}
        onChangeText={setDescription}
        multiline={false} // Temporarily disable multiline
        returnKeyType="done"
        blurOnSubmit={true}
        onSubmitEditing={() => {
          console.log("Description input submitted");
          Keyboard.dismiss();
          if (textInputRef.current) {
            textInputRef.current.blur();
            setIsFocused(false);
          }
        }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        accessible={true}
        accessibilityLabel="Post description input"
      />

      <TouchableOpacity
        onPress={handleSubmit}
        disabled={loading}
        activeOpacity={0.7}
        style={[styles.button, loading && styles.buttonDisabled]}
        accessible={true}
        accessibilityLabel="Submit post"
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Post</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f9f9f9",
    padding: 20,
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
    paddingBottom: 10,
  },
  mediaPreviewWrapper: {
    position: "relative",
    margin: 5,
  },
  mediaPreview: {
    width: 100,
    height: 100,
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
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
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
    minHeight: 40,
    zIndex: 1,
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