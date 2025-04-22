import React, { useState, useEffect, memo } from "react";
import {
  View,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Text,
  Modal,
  Dimensions,
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import * as FileSystem from "expo-file-system";
import * as VideoThumbnails from "expo-video-thumbnails";
import { Ionicons } from "@expo/vector-icons";

function ChatVideo({ uri, name }) {
  console.log("ChatVideo render, uri:", uri, "name:", name);

  const [isPlaying, setIsPlaying] = useState(false);
  const [thumbnailUri, setThumbnailUri] = useState(null);
  const [isThumbnailLoading, setIsThumbnailLoading] = useState(true);
  const [thumbnailError, setThumbnailError] = useState(false);
  const [isVideoValid, setIsVideoValid] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const player = useVideoPlayer(uri, (player) => {
    player.loop = false;
  });

  useEffect(() => {
    let isMounted = true;

    const validateVideo = async () => {
      try {
        console.log("Validating URI:", uri);

        const fileName = name || uri.split("/").pop() || "";
        if (!fileName.toLowerCase().endsWith(".mp4")) {
          throw new Error("Unsupported video format (only MP4 supported)");
        }

        if (uri.startsWith("file://") || uri.startsWith("content://")) {
          const info = await FileSystem.getInfoAsync(uri);
          if (!info.exists || info.isDirectory) {
            throw new Error("Video file not found");
          }
          console.log("Local URI valid, size:", info.size);
        } else {
          console.log("Remote URI, skipping FileSystem validation");
        }

        if (isMounted) {
          setIsVideoValid(true);
        }
      } catch (error) {
        console.error("Video validation failed:", error);
        if (isMounted) {
          setIsVideoValid(false);
          setThumbnailError(true);
          setIsThumbnailLoading(false);
        }
      }
    };

    validateVideo();

    return () => {
      isMounted = false;
    };
  }, [uri, name]);

  useEffect(() => {
    let isMounted = true;

    const generateThumbnail = async () => {
      if (!isVideoValid || !isVisible) {
        return;
      }

      try {
        setIsThumbnailLoading(true);
        const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(uri, {
          time: 0,
          quality: 0.3,
        });
        if (isMounted) {
          console.log("Thumbnail generated:", thumbUri);
          setThumbnailUri(thumbUri);
          setThumbnailError(false);
        }
      } catch (error) {
        console.error("Thumbnail error:", error);
        if (isMounted) {
          setThumbnailError(true);
        }
      } finally {
        if (isMounted) {
          setIsThumbnailLoading(false);
        }
      }
    };

    generateThumbnail();

    return () => {
      isMounted = false;
    };
  }, [uri, isVideoValid, isVisible]);

  useEffect(() => {
    const subscription = player.addListener("playingChange", ({ playing }) => {
      console.log("Playing state changed:", playing);
      setIsPlaying(playing);
    });

    return () => {
      console.log("Removing player listener");
      subscription.remove();
    };
  }, [player]);

  useEffect(() => {
    if (!isVisible && isPlaying) {
      console.log("Pausing video (not visible)");
      player.pause();
      setIsPlaying(false);
    }
  }, [isVisible, isPlaying, player]);

  const handlePlay = () => {
    if (isVideoValid && !thumbnailError && !isThumbnailLoading) {
      console.log("Entering full screen");
      setIsFullScreen(true);
      setIsPlaying(true);
      player.play();
    }
  };

  const handleFullScreenClose = () => {
    console.log("Exiting full screen");
    setIsFullScreen(false);
    player.pause();
    setIsPlaying(false);
  };

  if (!isVideoValid) {
    console.log("Unsupported video, rendering placeholder");
    return (
      <View style={styles.container}>
        <View style={styles.placeholder}>
          <Text style={styles.errorText}>Unsupported video format</Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <View
        style={styles.container}
        onLayout={() => {
          console.log("ChatVideo visible, triggering thumbnail");
          setIsVisible(true);
        }}
      >
        <TouchableOpacity
          onPress={handlePlay}
          style={styles.thumbnailContainer}
          disabled={thumbnailError || isThumbnailLoading}
        >
          {isThumbnailLoading && !thumbnailError ? (
            <View style={styles.placeholder}>
              <ActivityIndicator size="small" color="#999" />
            </View>
          ) : thumbnailError ? (
            <View style={styles.placeholder}>
              <Text style={styles.errorText}>Failed to load video</Text>
            </View>
          ) : (
            <>
              <Image
                source={{ uri: thumbnailUri }}
                style={styles.thumbnail}
                resizeMode="cover"
                onError={() => {
                  console.log("Thumbnail load error");
                  setThumbnailError(true);
                }}
              />
              <View style={styles.playIconContainer}>
                <Ionicons
                  name="play-circle"
                  size={40}
                  color="rgba(255, 255, 255, 0.8)"
                />
              </View>
            </>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={isFullScreen}
        animationType="fade"
        onRequestClose={handleFullScreenClose}
      >
        <View style={styles.fullScreenContainer}>
          <VideoView
            style={styles.fullScreenVideo}
            player={player}
            allowsFullscreen
            allowsPictureInPicture
            nativeControls
            onError={(error) => {
              console.error("Video playback error:", error);
              setThumbnailError(true);
              setIsPlaying(false);
              setIsFullScreen(false);
            }}
          />
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleFullScreenClose}
          >
            <Ionicons name="close" size={30} color="#fff" />
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnailContainer: {
    position: "relative",
    width: 120,
    height: 120,
    borderRadius: 10,
    overflow: "hidden",
  },
  thumbnail: {
    width: 120,
    height: 120,
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
  placeholder: {
    width: 120,
    height: 120,
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
  fullScreenContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenVideo: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  },
  closeButton: {
    position: "absolute",
    top: 40,
    right: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 20,
    padding: 5,
  },
});

export default memo(ChatVideo);