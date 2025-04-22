import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  Image,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";

const STATUS_DURATION = 5000; // For text/image
const VIDEO_MAX_DURATION = 30000; // Cap for videos

const StatusViewer = ({ statuses, initialIndex = 0, onClose }) => {
  // State and refs
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const progress = useRef(new Animated.Value(0)).current;
  const playerRef = useRef(null);
  const timerRef = useRef(null);
  const isPaused = useRef(false);
  const pausedTime = useRef(0);

  // Current status
  const currentStatus = statuses[currentIndex] || {};

  // Video player
  const playerSource = currentStatus.media_type === "video" ? currentStatus.media : "";
  const player = useVideoPlayer(playerSource, (p) => {
    console.log("Player initialized, source:", playerSource);
    playerRef.current = p;
    p.loop = false;
    p.onError = (error) => {
      console.error("Video error:", error);
      handleNext(true);
    };
  });

  // Calculate duration
  const getStatusDuration = useCallback(() => {
    if (currentStatus.media_type === "video") {
      const safeDuration = playerRef.current?.duration
        ? playerRef.current.duration * 1000
        : VIDEO_MAX_DURATION;
      console.log("Video duration:", safeDuration);
      return Math.min(safeDuration, VIDEO_MAX_DURATION);
    }
    console.log("Image/text duration:", STATUS_DURATION);
    return STATUS_DURATION;
  }, [currentStatus.media_type]);

  // Navigation
  const handleNext = useCallback(
    (fromTimer = false) => {
      console.log("handleNext called, fromTimer:", fromTimer);
      if (!fromTimer && isPaused.current) {
        togglePause(); // Resume on manual tap
        return;
      }
      if (playerRef.current) {
        try {
          playerRef.current.pause();
          console.log("Paused player before next");
        } catch (error) {
          console.error("Pause error:", error);
        }
      }
      if (currentIndex < statuses.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        onClose();
      }
    },
    [currentIndex, statuses.length, onClose]
  );

  const handlePrev = useCallback(() => {
    console.log("handlePrev called");
    if (playerRef.current) {
      try {
        playerRef.current.pause();
        console.log("Paused player before prev");
      } catch (error) {
        console.error("Pause error:", error);
      }
    }
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      if (isPaused.current) {
        isPaused.current = false;
      }
    }
  }, [currentIndex]);

  // Start progress animation
  const startProgress = useCallback(
    (duration) => {
      console.log("startProgress called, duration:", duration);
      if (isPaused.current) return;
      progress.setValue(progress.__getValue());
      if (timerRef.current) clearTimeout(timerRef.current);
      Animated.timing(progress, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }).start(({ finished }) => {
        console.log("Progress animation finished:", finished);
        if (finished && !isPaused.current) {
          handleNext(true);
        }
      });
      timerRef.current = setTimeout(() => {
        if (!isPaused.current) {
          console.log("Timer advancing");
          handleNext(true);
        }
      }, duration);
    },
    [handleNext]
  );

  // Pause/resume
  const togglePause = useCallback(() => {
    console.log("togglePause called, isPaused:", isPaused.current);
    isPaused.current = !isPaused.current;

    if (isPaused.current) {
      pausedTime.current = progress.__getValue() * getStatusDuration();
      console.log("Pausing, pausedTime:", pausedTime.current);
      Animated.timing(progress).stop();
      if (timerRef.current) clearTimeout(timerRef.current);
      if (currentStatus.media_type === "video" && playerRef.current) {
        try {
          playerRef.current.pause();
          console.log("Video paused");
        } catch (error) {
          console.error("Pause error:", error);
        }
      }
    } else {
      const duration = getStatusDuration();
      const remainingTime = duration - pausedTime.current;
      console.log("Resuming, remainingTime:", remainingTime);
      progress.setValue(pausedTime.current / duration);
      startProgress(remainingTime);
      if (currentStatus.media_type === "video" && playerRef.current) {
        try {
          playerRef.current.play();
          console.log("Video resumed");
        } catch (error) {
          console.error("Resume error:", error);
          handleNext(true);
        }
      }
    }
  }, [currentStatus.media_type, getStatusDuration, startProgress, handleNext]);

  // Handle video load
  const handleVideoLoad = useCallback(() => {
    console.log("Video loaded, source:", currentStatus.media);
    if (currentStatus.media_type === "video" && playerRef.current && !isPaused.current) {
      try {
        playerRef.current.play();
        console.log("Video auto-playing");
        const duration = getStatusDuration();
        startProgress(duration);
      } catch (error) {
        console.error("Auto-play error:", error);
        handleNext(true);
      }
    }
  }, [currentStatus.media_type, currentStatus.media, getStatusDuration, startProgress, handleNext]);

  // Handle video completion
  const handlePlaybackStatusUpdate = useCallback(
    (status) => {
      console.log("Playback status update:", status);
      if (status.didJustFinish && !isPaused.current) {
        console.log("Video finished, advancing to next status");
        progress.setValue(1);
        if (timerRef.current) clearTimeout(timerRef.current);
        handleNext(true);
      }
    },
    [handleNext]
  );

  // Handle status change
  useEffect(() => {
    if (!statuses || currentIndex >= statuses.length) return;

    console.log("Status changed, index:", currentIndex, "status:", currentStatus);
    progress.setValue(0);
    pausedTime.current = 0;
    isPaused.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);

    if (currentStatus.media_type !== "video") {
      startProgress(getStatusDuration());
    }

    return () => {
      console.log("Cleaning up status change");
      if (timerRef.current) clearTimeout(timerRef.current);
      if (playerRef.current) {
        try {
          playerRef.current.pause();
          console.log("Paused video on cleanup");
        } catch (error) {
          console.error("Cleanup pause error:", error);
        }
      }
    };
  }, [currentIndex, statuses, currentStatus, getStatusDuration, startProgress]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log("Unmounting StatusViewer");
      if (playerRef.current) {
        try {
          playerRef.current.pause();
          console.log("Paused player on unmount");
        } catch (error) {
          console.error("Unmount pause error:", error);
        }
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        console.log("Cleared timer on unmount");
      }
    };
  }, []);

  if (!statuses || statuses.length === 0) {
    console.log("No statuses, rendering null");
    return null;
  }

  const isImage = currentStatus.media_type === "image";
  const isVideo = currentStatus.media_type === "video";
  const hasMedia = (isImage || isVideo) && !!currentStatus.media;
  const statusText = currentStatus.text || "";

  console.log("Rendering:", { isImage, isVideo, hasMedia, media: currentStatus.media });

  return (
    <Modal visible={true} animationType="fade" transparent>
      <View style={styles.container}>
        <View style={styles.progressContainer}>
          {statuses.map((_, idx) => (
            <View key={idx} style={styles.progressBackground}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    transform: [
                      {
                        scaleX: idx === currentIndex
                          ? progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] })
                          : idx < currentIndex
                          ? 1
                          : 0,
                      },
                    ],
                  },
                ]}
              />
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.leftExpanded} onPress={handlePrev} />

        <TouchableOpacity style={styles.content} activeOpacity={0.8} onPress={togglePause}>
          {hasMedia ? (
            <>
              {isVideo ? (
                <VideoView
                  style={styles.media}
                  player={player}
                  resizeMode="cover"
                  allowsFullscreen={false}
                  allowsPictureInPicture={false}
                  onLoad={handleVideoLoad}
                  onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                  nativeControls={false}
                />
              ) : isImage ? (
                <Image source={{ uri: currentStatus.media }} style={styles.media} resizeMode="contain" />
              ) : null}
              {statusText.trim().length > 0 && (
                <Text style={styles.caption}>{statusText}</Text>
              )}
            </>
          ) : (
            <View style={styles.plainTextContainer}>
              <Text style={styles.plainText}>{statusText || "No media available"}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.rightExpanded} onPress={() => handleNext(false)} />

        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
  },
  progressContainer: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingTop: 40,
    paddingBottom: 10,
    gap: 4,
    zIndex: 20,
  },
  progressBackground: {
    flex: 1,
    height: 2,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    overflow: "hidden",
  },
  progressBar: {
    height: 2,
    backgroundColor: "#fff",
    width: "100%",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  media: {
    width: "100%",
    height: "80%",
  },
  caption: {
    position: "absolute",
    bottom: 20,
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: 20,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    zIndex: 10,
  },
  plainTextContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  plainText: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
  },
  leftExpanded: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: "40%",
    zIndex: 10,
  },
  rightExpanded: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "40%",
    zIndex: 10,
  },
  closeButton: {
    position: "absolute",
    top: 40,
    right: 15,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 15,
  },
  closeText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default StatusViewer;