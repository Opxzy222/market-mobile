import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { Ionicons } from "@expo/vector-icons";
import SubscriptionRequiredModal from "@/components/RequiredSubscription";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SendVideo = ({ onSend }) => {
  console.log("SendVideo render start");

  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoValid, setVideoValid] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // Subscription from AsyncStorage
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  // Load subscription
  useEffect(() => {
    const loadSubscription = async () => {
      try {
        const cache = await AsyncStorage.getItem("subscription_cache");
        if (cache) {
          const parsed = JSON.parse(cache);
          setSubscriptionStatus(parsed.plan?.toLowerCase() || null);
        } else {
          setSubscriptionStatus(null);
        }
      } catch (error) {
        console.error("Failed to load subscription_cache:", error);
        setSubscriptionStatus(null);
      } finally {
        setSubscriptionLoading(false);
      }
    };
    loadSubscription();
  }, []);

  // Validate video when selected
  useEffect(() => {
    console.log("useEffect: selectedVideo changed:", selectedVideo);
    if (!selectedVideo) {
      setVideoValid(false);
      setIsValidating(false);
      return;
    }

    const validateVideo = async () => {
      let isMounted = true;
      try {
        console.log("Validating URI:", selectedVideo.uri);
        setIsValidating(true);

        const fileName = selectedVideo.name || selectedVideo.uri.split("/").pop() || "";
        if (!fileName.toLowerCase().endsWith(".mp4")) {
          throw new Error("Unsupported video format (only MP4 supported)");
        }

        if (selectedVideo.uri.startsWith("file://") || selectedVideo.uri.startsWith("content://")) {
          const info = await FileSystem.getInfoAsync(selectedVideo.uri);
          if (!info.exists || info.isDirectory) {
            throw new Error("Video file not found");
          }
          console.log("URI valid, size:", info.size);
        } else {
          console.log("Remote URI, skipping FileSystem validation");
        }

        if (isMounted) {
          setVideoValid(true);
        }
      } catch (error) {
        console.error("Video validation failed:", error.message, error.stack);
        if (isMounted) {
          setVideoValid(false);
          Alert.alert("Error", "Invalid video file. Please try another.");
        }
      } finally {
        if (isMounted) {
          setIsValidating(false);
        }
      }

      return () => {
        isMounted = false;
      };
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

        setSelectedVideo({
          uri,
          name: name || `video_${Date.now()}.mp4`,
        });
      } else {
        console.log("Picker canceled or no assets selected.");
      }
    } catch (error) {
      console.error("Error picking video:", error.message, error.stack);
      Alert.alert("Error", "Failed to select video. Please try again.");
    }
  };

  const handleRemoveVideo = () => {
    console.log("Removing video");
    setSelectedVideo(null);
    setVideoValid(false);
    setIsValidating(false);
  };

  const handleSend = () => {
    // Check subscription
    if (!['standard', 'premium'].includes(subscriptionStatus || '')) {
      setShowSubscriptionModal(true);
      return;
    }

    if (selectedVideo && videoValid) {
      console.log("Sending video:", selectedVideo);
      onSend(selectedVideo);
      setSelectedVideo(null);
      setVideoValid(false);
      setIsValidating(false);
    }
  };

  console.log(
    "SendVideo render end, selectedVideo:",
    selectedVideo,
    "videoValid:",
    videoValid,
    "isValidating:",
    isValidating
  );

  // Show loading while subscription loads
  if (subscriptionLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="small" color="#28a745" />
        <Text style={styles.loaderText}>Loading...</Text>
      </View>
    );
  }

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
          {isValidating ? (
            <View style={styles.placeholder}>
              <ActivityIndicator size="small" color="#999" />
              <Text style={styles.loadingText}>Validating video...</Text>
            </View>
          ) : !videoValid ? (
            <View style={styles.placeholder}>
              <Ionicons
                name="videocam-outline"
                size={40}
                color="#999"
                style={styles.playIcon}
              />
              <Text style={styles.errorText}>Invalid video</Text>
            </View>
          ) : (
            <View style={styles.thumbnailContainer}>
              <View style={styles.placeholder}>
                <Ionicons
                  name="videocam-outline"
                  size={40}
                  color="#999"
                  style={styles.playIcon}
                />
                <Text style={styles.previewText}>Video ready</Text>
              </View>
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
              style={[styles.sendButton, (!videoValid || isValidating) && styles.sendButtonDisabled]}
              disabled={!videoValid || isValidating}
            >
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* JUST CALL THE MODAL DIRECTLY */}
      <SubscriptionRequiredModal
        visible={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
      />
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
  placeholder: {
    width: 150,
    height: 150,
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
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
  previewText: {
    color: "#333",
    fontSize: 12,
    textAlign: "center",
  },
  errorText: {
    color: "#ff4d4d",
    fontSize: 12,
    textAlign: "center",
  },
  loadingText: {
    color: "#999",
    fontSize: 12,
    marginTop: 5,
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
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loaderText: {
    marginTop: 8,
    fontSize: 14,
    color: "#555",
  },
});

export default SendVideo;