import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
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
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const IMAGE_TEXT_DURATION = 6000;
const VIDEO_MAX_DURATION = 30000;
const CACHE_KEY = "videoCache";

const StatusViewer = ({ visible, statuses, initialIndex = 0, onClose, onStatusViewed, userId }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [sortedStatuses, setSortedStatuses] = useState([]);
  const [videoCache, setVideoCache] = useState({});

  const progress = useRef(new Animated.Value(0)).current;
  const progressAnimation = useRef(null);
  const pausedTime = useRef(0);
  const isPaused = useRef(false);
  const isVideoFinished = useRef(false);
  const playerRef = useRef(null);

  // Current status
  const currentStatus = useMemo(() => {
    return sortedStatuses[currentIndex] || {};
  }, [sortedStatuses, currentIndex]);

  // Next status for preloading
  const nextStatus = useMemo(() => {
    return currentIndex < sortedStatuses.length - 1 ? sortedStatuses[currentIndex + 1] : {};
  }, [sortedStatuses, currentIndex]);

  // Load video cache
  useEffect(() => {
    const loadCache = async () => {
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          console.log("Loaded video cache:", parsed);
          setVideoCache(parsed);
        }
      } catch (error) {
        console.error("Error loading video cache:", error);
      }
    };
    loadCache();
  }, []);

  // Video players
  const currentPlayer = useVideoPlayer(currentStatus?.media_url ?? "", (player) => {
    console.log("Current player initialized:", player);
    playerRef.current = player;
    player.loop = false;
    player.onError = (error) => {
      console.error("Current video error:", error);
      handleNext();
    };
    if (currentStatus.media_type === "video" && videoCache[currentStatus.media_url]) {
      console.log("Using cached video for current:", currentStatus.media_url);
      player.source = { uri: currentStatus.media_url };
    }
  });

  const nextPlayer = useVideoPlayer(nextStatus?.media_url ?? "", (player) => {
    console.log("Next player initialized:", player);
    player.loop = false;
    player.onError = (error) => {
      console.error("Next video error:", error);
    };
    if (nextStatus.media_type === "video" && videoCache[nextStatus.media_url]) {
      console.log("Using cached video for next:", nextStatus.media_url);
      player.source = { uri: nextStatus.media_url };
    }
  });

  // Navigation handlers
  const handleNext = useCallback(() => {
    console.log("handleNext called");
    if (playerRef.current) {
      try {
        playerRef.current.pause();
        console.log("Paused current player before next");
      } catch (error) {
        console.error("Pause error before next:", error);
      }
      playerRef.current = null;
    }

    setTimeout(() => {
      if (currentIndex < sortedStatuses.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        // Mark all statuses for the current shop as viewed
        const currentShopId = currentStatus.shop?.id;
        const shopStatuses = sortedStatuses.filter((s) => s.shop?.id === currentShopId);
        if (shopStatuses.length > 0) {
          onStatusViewed({ shop: currentStatus.shop?.name, statuses: shopStatuses });
        }
        onClose();
      }
    }, 100);
  }, [currentIndex, sortedStatuses, currentStatus, onStatusViewed, onClose]);

  const handlePrev = useCallback(() => {
    console.log("handlePrev called");
    if (playerRef.current) {
      try {
        playerRef.current.pause();
        console.log("Paused current player before prev");
      } catch (error) {
        console.error("Pause error before prev:", error);
      }
      playerRef.current = null;
    }

    setTimeout(() => {
      if (currentIndex > 0) {
        setCurrentIndex((prev) => prev - 1);
      } else {
        onClose();
      }
    }, 100);
  }, [currentIndex, onClose]);

  // Calculate duration
  const getStatusDuration = useCallback(() => {
    const mediaType = currentStatus.media_type;
    if (!mediaType) return IMAGE_TEXT_DURATION;
    if (mediaType === "video") {
      const safeDuration = playerRef.current?.duration
        ? playerRef.current.duration * 1000
        : VIDEO_MAX_DURATION;
      console.log("Video duration:", safeDuration);
      return Math.min(safeDuration, VIDEO_MAX_DURATION);
    }
    console.log("Image/text duration:", IMAGE_TEXT_DURATION);
    return IMAGE_TEXT_DURATION;
  }, [currentStatus.media_type]);

  // Start progress animation
  const startProgress = useCallback(
    (duration) => {
      console.log("startProgress called, duration:", duration);
      if (isPaused.current || isVideoFinished.current) return;
      progress.setValue(progress.__getValue());
      progressAnimation.current?.stop();
      progressAnimation.current = Animated.timing(progress, {
        toValue: 1,
        duration: duration,
        useNativeDriver: true,
      });
      progressAnimation.current.start(({ finished }) => {
        console.log("Progress animation finished:", finished);
        if (finished && !isPaused.current && !isVideoFinished.current) {
          handleNext();
        }
      });
    },
    [handleNext]
  );

  // Mark status as viewed and cache video
  const markStatusAsViewed = useCallback(
    async (status) => {
      if (!status || status.viewed || !userId) return;
      try {
        console.log("Marking status as viewed:", status.id);
        const formData = new FormData();
        formData.append("user_id", userId.toString());
        formData.append("status_ids[]", status.id);

        await axios.post(
          "https://retail-alvinia-goza-f6a0e4f7.koyeb.app/mark_status_viewed/",
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        status.viewed = true;

        if (status.media_type === "video" && status.media_url && !videoCache[status.media_url]) {
          const newCache = { ...videoCache, [status.media_url]: status.media_url };
          setVideoCache(newCache);
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(newCache));
          console.log("Cached video:", status.media_url);
        }
      } catch (error) {
        console.error("Error marking status as viewed:", error);
      }
    },
    [userId, videoCache]
  );

  // Pause/resume
  const togglePause = useCallback(() => {
    console.log("togglePause called, isPaused:", isPaused.current, "playerRef:", playerRef.current);
    isPaused.current = !isPaused.current;

    if (isPaused.current) {
      pausedTime.current = progress.__getValue() * getStatusDuration();
      console.log("Pausing, pausedTime:", pausedTime.current);
      progressAnimation.current?.stop();
      if (
        currentStatus.media_type === "video" &&
        playerRef.current &&
        typeof playerRef.current.pause === "function"
      ) {
        try {
          playerRef.current.pause();
          console.log("Video paused successfully");
        } catch (error) {
          console.error("Pause error:", error);
        }
      }
    } else {
      const remainingTime = getStatusDuration() - pausedTime.current;
      console.log("Resuming, remainingTime:", remainingTime);
      progress.setValue(pausedTime.current / getStatusDuration());
      startProgress(remainingTime);
      if (
        currentStatus.media_type === "video" &&
        playerRef.current &&
        typeof playerRef.current.play === "function"
      ) {
        try {
          playerRef.current.play();
          console.log("Video playing successfully");
        } catch (error) {
          console.error("Play error:", error);
        }
      }
    }
  }, [getStatusDuration, startProgress, currentStatus.media_type]);

  // Initialize statuses
  useEffect(() => {
    if (!visible || !statuses?.length) {
      console.log("Not visible or no statuses:", { visible, statuses });
      setSortedStatuses([]);
      return;
    }

    console.log("Initializing statuses:", statuses);
    // Sort statuses by shop.id and created_at
    const sorted = statuses
      .slice()
      .sort((a, b) => {
        // Sort by shop.id first, then by created_at
        if (a.shop?.id !== b.shop?.id) {
          return a.shop?.id - b.shop?.id;
        }
        return new Date(a.created_at) - new Date(b.created_at);
      });

    let startIndex = initialIndex;
    if (initialIndex >= sorted.length) {
      startIndex = 0;
    }

    console.log("Setting initial index:", startIndex);
    setSortedStatuses(sorted);
    setCurrentIndex(startIndex);
  }, [visible, statuses, initialIndex]);

  // Handle video playback completion
  const handleVideoStatusChange = useCallback(
    (status) => {
      console.log("Video status change:", status);
      if (
        status.isPlaying &&
        status.positionMillis >= status.durationMillis &&
        !isVideoFinished.current &&
        !isPaused.current
      ) {
        console.log("Video finished playing, moving to next status");
        isVideoFinished.current = true;
        progressAnimation.current?.stop();
        handleNext();
      }
    },
    [handleNext]
  );

  // Handle status change and video playback
  useEffect(() => {
    if (!visible || !sortedStatuses.length) return;

    const status = sortedStatuses[currentIndex];
    if (!status) {
      console.log("No status available");
      return;
    }

    console.log("Status changed:", status);

    // Reset state
    progressAnimation.current?.stop();
    progress.setValue(0);
    pausedTime.current = 0;
    isPaused.current = false;
    isVideoFinished.current = false;

    if (playerRef.current) {
      try {
        playerRef.current.pause();
        console.log("Paused player before status change");
      } catch (error) {
        console.error("Pause error before status change:", error);
      }
      playerRef.current = null;
    }

    markStatusAsViewed(status);

    const duration = getStatusDuration();
    if (status.media_type === "video") {
      const checkVideoReady = setInterval(() => {
        if (playerRef.current?.duration && playerRef.current.duration > 0) {
          console.log("Video ready, duration:", playerRef.current.duration);
          clearInterval(checkVideoReady);
          if (!isPaused.current) {
            try {
              playerRef.current.play();
              console.log("Video started playing");
            } catch (error) {
              console.error("Play error on load:", error);
            }
            startProgress(duration);
          }
        } else {
          console.log("Video not ready yet");
        }
      }, 100);
      return () => {
        console.log("Cleaning up video check");
        clearInterval(checkVideoReady);
      };
    } else {
      if (!isPaused.current) {
        startProgress(duration);
      }
    }

    return () => {
      console.log("Cleaning up effect");
      progressAnimation.current?.stop();
      if (playerRef.current && typeof playerRef.current.pause === "function") {
        try {
          playerRef.current.pause();
          console.log("Paused video on cleanup");
        } catch (error) {
          console.error("Cleanup pause error:", error);
        }
        playerRef.current = null;
      }
    };
  }, [visible, currentIndex, sortedStatuses, markStatusAsViewed, startProgress, getStatusDuration]);

  // Reset when modal closes
  useEffect(() => {
    if (!visible) {
      console.log("Modal closing, resetting state");
      setCurrentIndex(0);
      setSortedStatuses([]);
      progress.setValue(0);
      progressAnimation.current?.stop();
      if (playerRef.current && typeof playerRef.current.pause === "function") {
        try {
          playerRef.current.pause();
          console.log("Paused video on modal close");
        } catch (error) {
          console.error("Modal close pause error:", error);
        }
        playerRef.current = null;
      }
    }
  }, [visible]);

  if (!visible || !sortedStatuses.length) {
    console.log("Rendering null, visible:", visible, "statuses length:", sortedStatuses.length);
    return null;
  }

  const isImage = currentStatus.media_type === "image";
  const isVideo = currentStatus.media_type === "video";
  const hasMedia = (isImage || isVideo) && !!currentStatus.media_url;
  const statusText = currentStatus.text || "";

  console.log("Rendering status:", { isImage, isVideo, hasMedia, media_url: currentStatus.media_url });

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.shopName}>{currentStatus.shop?.name || "Unknown Shop"}</Text>
          
        </View>

        <View style={styles.progressContainer}>
          {sortedStatuses
            .filter((s) => s.shop?.id === currentStatus.shop?.id)
            .map((_, idx) => (
              <View key={idx} style={styles.progressBackground}>
                <Animated.View
                  style={[
                    styles.progressBar,
                    {
                      transform: [
                        {
                          scaleX: sortedStatuses.findIndex((s) => s.id === currentStatus.id) === idx
                            ? progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] })
                            : idx < sortedStatuses.findIndex((s) => s.id === currentStatus.id)
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

        <TouchableOpacity style={[styles.leftExpanded, { zIndex: 10 }]} onPress={handlePrev} />

        <TouchableOpacity
          style={[styles.content, { zIndex: 5 }]}
          activeOpacity={0.8}
          onPress={togglePause}
        >
          {hasMedia ? (
            <>
              {isVideo ? (
                <VideoView
                  style={styles.media}
                  player={currentPlayer}
                  resizeMode="cover"
                  allowsFullscreen={false}
                  allowsPictureInPicture={false}
                  onStatusChange={isVideo ? handleVideoStatusChange : undefined}
                />
              ) : isImage ? (
                <Image
                  source={{ uri: currentStatus.media_url }}
                  style={styles.media}
                  resizeMode="contain"
                />
              ) : null}
              {statusText.trim().length > 0 && (
                <Text style={styles.caption}>{statusText}</Text>
              )}
            </>
          ) : (
            <View style={styles.plainTextContainer}>
              <Text style={styles.plainText}>{statusText || "No content available"}</Text>
              {currentStatus.shop?.image && (
                <Image
                  source={{ uri: currentStatus.shop.image }}
                  style={styles.textBackground}
                />
              )}
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.rightExpanded, { zIndex: 10 }]} onPress={handleNext} />

        <TouchableOpacity style={[styles.closeButton, { zIndex: 15 }]} onPress={onClose}>
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
  header: {
    position: "absolute",
    top: 40,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 20,
  },
  shopName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    bottom: 20
  },
  progressContainer: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingTop: 60,
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
    zIndex: 10,
  },
  textBackground: {
    position: "absolute",
    width: "100%",
    height: "100%",
    opacity: 0.3,
  },
  leftExpanded: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: "40%",
  },
  rightExpanded: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "40%",
  },
  closeButton: {
    position: "absolute",
    top: 70,
    right: 15,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default StatusViewer;