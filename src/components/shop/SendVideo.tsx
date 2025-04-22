import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  Alert,
  StyleSheet,
  Image,
  ActivityIndicator,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as VideoThumbnails from "expo-video-thumbnails";
import { Ionicons } from "@expo/vector-icons";

const SendVideo = ({ onSend }) => {
  console.log("SendVideo render start");

  const [selectedVideo, setSelectedVideo] = useState(null);
  const [thumbnailUri, setThumbnailUri] = useState(null);
  const [isThumbnailLoading, setIsThumbnailLoading] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);
  const [videoValid, setVideoValid] = useState(false);

  useEffect(() => {
    console.log("useEffect: selectedVideo changed:", selectedVideo);
    if (!selectedVideo) {
      setVideoValid(false);
      setThumbnailUri(null);
      setThumbnailError(false);
      return;
    }

    const validateVideo = async () => {
      try {
        console.log("Validating URI:", selectedVideo.uri);
        const info = await FileSystem.getInfoAsync(selectedVideo.uri);
        if (!info.exists || info.isDirectory) {
          throw new Error("Video file not found");
        }
        console.log("URI valid, size:", info.size);
        setVideoValid(true);

        // Generate thumbnail
        setIsThumbnailLoading(true);
        try {
          const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(
            selectedVideo.uri,
            { time: 0, quality: 0.5 } // Lower quality for old devices
          );
          console.log("Thumbnail generated:", thumbUri);
          setThumbnailUri(thumbUri);
          setThumbnailError(false);
        } catch (thumbError) {
          console.error("Thumbnail error:", thumbError);
          setThumbnailError(true);
          // Fallback to placeholder
          setThumbnailUri(null);
        } finally {
          setIsThumbnailLoading(false);
        }
      } catch (error) {
        console.error("Video validation failed:", error);
        setVideoValid(false);
        setThumbnailError(true);
        Alert.alert("Error", "Invalid video file. Please try another.");
      }
    };

    validateVideo();
  }, [selectedVideo]);

  const pickVideo = async () => {
    try {
      console.log("Launching document picker...");
      const result = await DocumentPicker.getDocumentAsync({
        type: "video/*",
        copyToCacheDirectory: true,
      });

      console.log("Picker result:", JSON.stringify(result, null, 2));

      if (!result.canceled && result.assets?.length > 0) {
        const { uri, name, mimeType } = result.assets[0];

        if (!mimeType?.startsWith("video/")) {
          Alert.alert("Error", "Please select a valid video file.");
          return;
        }

        console.log("Skipping duration check for:", uri);
        setSelectedVideo({
          uri,
          name: name || `video_${Date.now()}.mp4`,
        });
      } else {
        console.log("Picker canceled or no assets selected.");
      }
    } catch (error) {
      console.error("Error picking video:", error);
      Alert.alert("Error", "Failed to select video. Please try again.");
    }
  };

  const handleRemoveVideo = () => {
    console.log("Removing video");
    setSelectedVideo(null);
    setThumbnailUri(null);
    setThumbnailError(false);
    setVideoValid(false);
  };

  const handleSend = () => {
    if (selectedVideo && videoValid) {
      console.log("Sending video:", selectedVideo);
      onSend(selectedVideo);
      setSelectedVideo(null);
      setThumbnailUri(null);
      setThumbnailError(false);
      setVideoValid(false);
    }
  };

  console.log(
    "SendVideo render end, selectedVideo:",
    selectedVideo,
    "videoValid:",
    videoValid,
    "thumbnailError:",
    thumbnailError
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={pickVideo} style={styles.optionCard}>
        <Ionicons
          name="videocam-outline"
          size={24}
          color="#9b59b6"
          style={styles.optionIcon}
        />
        <Text style={styles.optionText}>Select Video</Text>
      </TouchableOpacity>

      {selectedVideo && (
        <View style={styles.previewContainer}>
          {isThumbnailLoading ? (
            <View style={styles.placeholder}>
              <ActivityIndicator size="small" color="#999" />
            </View>
          ) : thumbnailError || !videoValid ? (
            <View style={styles.placeholder}>
              <Ionicons
                name="play-circle"
                size={40}
                color="#999"
                style={styles.playIcon}
              />
              <Text style={styles.errorText}>No preview available</Text>
            </View>
          ) : (
            <View style={styles.thumbnailContainer}>
              <Image
                source={{ uri: thumbnailUri }}
                style={styles.previewVideo}
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
          <View style={styles.actionButtons}>
            <TouchableOpacity
              onPress={handleRemoveVideo}
              style={styles.removeButton}
            >
              <Ionicons name="trash" size={24} color="#ff4d4d" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSend}
              style={[styles.sendButton, !videoValid && styles.sendButtonDisabled]}
              disabled={!videoValid}
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
  thumbnailContainer: {
    position: "relative",
    width: 150,
    height: 150,
    borderRadius: 10,
    overflow: "hidden",
  },
  previewVideo: {
    width: 150,
    height: 150,
    borderRadius: 10,
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
  playIcon: {
    marginBottom: 5,
  },
  placeholder: {
    width: 150,
    height: 150,
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
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

export default SendVideo;