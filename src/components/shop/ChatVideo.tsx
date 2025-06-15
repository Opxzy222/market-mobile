import React, { useState, useEffect, useRef, memo } from "react";
import {
  View,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Text,
  Dimensions,
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import PropTypes from "prop-types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function ChatVideo({ uri, name, thumbnailUrl, pending, messageId }) {
  console.log("ChatVideo render", {
    uri,
    name,
    thumbnailUrl,
    pending,
    pendingType: typeof pending,
    messageId,
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const playerRef = useRef(null);
  const videoViewRef = useRef(null);
  const isMountedRef = useRef(true);
  const player = useVideoPlayer(null, (p) => {
    console.log("Player initialized", { messageId });
    playerRef.current = p;
    p.loop = false;
  });

  // Construct full URL
  const getFullUrl = (url) => {
    const BASE_URL = "https://retail-alvinia-goza-f6a0e4f7.koyeb.app";
    const fullUrl = url && url.startsWith("http") ? url : `${BASE_URL}${url || ""}`;
    console.log("Constructed full URL:", { url, fullUrl, messageId });
    return fullUrl;
  };

  // Load video
  useEffect(() => {
    let loadTimeout = null;

    const loadVideo = async () => {
      if (!uri || pending) {
        console.log("No URI or pending, skipping load", { uri, pending, messageId });
        if (isMountedRef.current && !uri) setVideoError("No video available");
        return;
      }

      try {
        console.log("Loading URI:", uri, "messageId:", messageId);
        const fileName = name || uri.split("/").pop() || "";
        if (!fileName.toLowerCase().endsWith(".mp4")) {
          throw new Error("Unsupported video format (only MP4 supported)");
        }

        const fullUri = getFullUrl(uri);
        setIsVideoLoading(true);
        setVideoError(null);

        if (!playerRef.current) {
          console.error("Player not initialized, aborting load", { messageId });
          throw new Error("Video player not initialized");
        }

        console.log("Loading video with URI:", fullUri, "messageId:", messageId);
        const loadPromise = playerRef.current.replaceAsync({ uri: fullUri });
        loadTimeout = setTimeout(() => {
          throw new Error("Video load timed out");
        }, 8000);

        await loadPromise;
        clearTimeout(loadTimeout);
        loadTimeout = null;

        if (isMountedRef.current) {
          setIsVideoLoading(false);
          console.log("Video loaded:", fullUri, "messageId:", messageId);
        }
      } catch (error) {
        console.error("Video load failed:", error.message, error.stack, "messageId:", messageId);
        if (isMountedRef.current) {
          setVideoError(error.message || "Failed to load video");
          setIsVideoLoading(false);
        }
      }
    };

    loadVideo();

    return () => {
      isMountedRef.current = false;
      if (loadTimeout) clearTimeout(loadTimeout);
      console.log("Cleaning up useEffect", { messageId });
      // Avoid pausing during cleanup to prevent shared object error
      // Player will be released automatically by expo-video
    };
  }, [uri, name, pending, messageId]);

  // Monitor player state
  useEffect(() => {
    if (!player) return;

    const playingSubscription = player.addListener("playingChange", ({ isPlaying: playing }) => {
      console.log("Playing state changed:", playing, "messageId:", messageId);
      if (isMountedRef.current) setIsPlaying(playing);
    });

    const errorSubscription = player.addListener("error", (error) => {
      console.error("Player error:", error, "messageId:", messageId);
      if (isMountedRef.current) {
        setVideoError("Video playback failed");
        setIsPlaying(false);
        setIsVideoLoading(false);
      }
    });

    return () => {
      console.log("Removing player listeners", { messageId });
      playingSubscription?.remove();
      errorSubscription?.remove();
    };
  }, [player, messageId]);

  // Handle fullscreen updates
  const handleFullscreenUpdate = ({ fullscreenUpdate }) => {
    console.log("Fullscreen update:", fullscreenUpdate, "messageId:", messageId);
    if (isMountedRef.current) {
      if (fullscreenUpdate === "entered") {
        setIsFullscreen(true);
      } else if (fullscreenUpdate === "exited") {
        setIsFullscreen(false);
        if (playerRef.current && isPlaying) {
          try {
            playerRef.current.pause();
            setIsPlaying(false);
            console.log("Video paused on fullscreen exit", { messageId });
          } catch (error) {
            console.error("Pause error on fullscreen exit:", error.message, "messageId:", messageId);
          }
        }
      }
    }
  };

  const handlePlayPause = async () => {
    console.log("handlePlayPause called", {
      videoError,
      isVideoLoading,
      pending,
      isPlayerReady: !!playerRef.current,
      isPlaying,
      isFullscreen,
      messageId,
    });

    if (!videoError && !isVideoLoading && !pending && playerRef.current) {
      try {
        if (isPlaying) {
          console.log("Pausing video", "messageId:", messageId);
          playerRef.current.pause();
          setIsPlaying(false);
          if (isFullscreen && videoViewRef.current && typeof videoViewRef.current.exitFullscreen === "function") {
            await videoViewRef.current.exitFullscreen();
            console.log("Exited fullscreen", { messageId });
          }
        } else {
          console.log("Playing video:", uri, "messageId:", messageId);
          playerRef.current.play();
          setIsPlaying(true);
          if (videoViewRef.current && typeof videoViewRef.current.enterFullscreen === "function") {
            await videoViewRef.current.enterFullscreen();
            console.log("Entered fullscreen", { messageId });
          }
        }
      } catch (error) {
        console.error("Play/pause error:", error.message, "messageId:", messageId);
        setVideoError("Video playback failed");
      }
    } else {
      console.log("Play blocked:", { videoError, isVideoLoading, pending, messageId });
    }
  };

  const renderContent = () => {
    if (pending) {
      return (
        <View style={styles.placeholder}>
          <Text style={styles.loadingText}>Uploading...</Text>
        </View>
      );
    }

    if (videoError) {
      return (
        <View style={styles.placeholder}>
          {thumbnailUrl ? (
            <Image
              source={{ uri: thumbnailUrl }}
              style={styles.thumbnail}
              resizeMode="cover"
              onError={(e) =>
                console.error("Thumbnail load error:", thumbnailUrl, e.nativeEvent.error, "messageId:", messageId)
              }
            />
          ) : (
            <View style={styles.fallbackThumbnail}>
              <Text style={styles.fallbackText}>No thumbnail</Text>
            </View>
          )}
          <Text style={styles.errorText}>{videoError}</Text>
        </View>
      );
    }

    if (isVideoLoading) {
      return (
        <View style={styles.placeholder}>
          {thumbnailUrl ? (
            <Image
              source={{ uri: thumbnailUrl }}
              style={styles.thumbnail}
              resizeMode="cover"
              onError={(e) =>
                console.error("Thumbnail load error:", thumbnailUrl, e.nativeEvent.error, "messageId:", messageId)
              }
            />
          ) : (
            <View style={styles.fallbackThumbnail}>
              <Text style={styles.fallbackText}>No thumbnail</Text>
            </View>
          )}
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.loadingText}>Loading video...</Text>
          </View>
        </View>
      );
    }

    return (
      <VideoView
        ref={videoViewRef}
        style={styles.video}
        player={player}
        contentFit="cover"
        nativeControls={true}
        allowsFullscreen={true}
        allowsPictureInPicture={false}
        onFullscreenUpdate={handleFullscreenUpdate}
        onError={(error) => {
          console.error("VideoView playback error:", error, "messageId:", messageId);
          if (isMountedRef.current) {
            setVideoError("Video playback failed");
            setIsPlaying(false);
          }
        }}
      />
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handlePlayPause}
        style={styles.videoContainer}
        disabled={!!(videoError || isVideoLoading || pending)}
        activeOpacity={0.7}
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
      >
        {renderContent()}
        {thumbnailUrl && !isPlaying && !videoError && !isVideoLoading && !pending && (
          <View style={styles.playIconContainer}>
            <Ionicons name="play-circle" size={40} color="rgba(255, 255, 255, 0.7)" />
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

ChatVideo.propTypes = {
  uri: PropTypes.string,
  name: PropTypes.string,
  thumbnailUrl: PropTypes.string,
  pending: PropTypes.bool,
  messageId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
};

ChatVideo.defaultProps = {
  uri: null,
  name: null,
  thumbnailUrl: null,
  pending: false,
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 5,
    maxWidth: SCREEN_WIDTH * 0.6,
  },
  videoContainer: {
    position: "relative",
    width: 150,
    height: 100,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#000",
    zIndex: 100,
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  fallbackThumbnail: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    backgroundColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
  },
  fallbackText: {
    color: "#666",
    fontSize: 12,
  },
  video: {
    width: "100%",
    height: "100%",
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
    zIndex: 101,
  },
  placeholder: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "#ff4d4d",
    fontSize: 12,
    textAlign: "center",
    marginTop: 5,
  },
  loadingText: {
    color: "#fff",
    fontSize: 12,
    marginTop: 5,
  },
});

export default memo(ChatVideo);