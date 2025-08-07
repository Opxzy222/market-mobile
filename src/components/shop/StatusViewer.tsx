import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Image,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import * as FileSystem from "expo-file-system";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const IMAGE_TEXT_DURATION = 6000;
const VIDEO_MAX_DURATION = 30000;
const LOAD_TIMEOUT = 10000;
const CACHE_KEY = "videoCache";

const formatRelativeTime = (createdAt) => {
  if (!createdAt) return "";
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now - created;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return `${diffSeconds} second${diffSeconds === 1 ? "" : "s"} ago`;
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
};

const StatusViewer = ({ visible, statuses, initialIndex = 0, onClose, onStatusViewed, userId, authToken }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [sortedStatuses, setSortedStatuses] = useState([]);
  const sortedStatusesRef = useRef([]);
  const [videoCache, setVideoCache] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const lastStatusesRef = useRef(null);
  const isNavigating = useRef(false); // Prevent concurrent navigation

  const progress = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);
  const playerRef = useRef(null);
  const isPaused = useRef(false);
  const pausedTime = useRef(0);
  const loadTimeoutRef = useRef(null);
  const videoReadyRef = useRef(false);

  const currentStatus = useMemo(() => {
    const status = sortedStatuses[currentIndex] || {};
    if (status.media && /\.(mp4|mov|avi)$/i.test(status.media) && status.media_type !== "video") {
      console.warn(`Mismatched media_type for status ${status.id}: expected video, got ${status.media_type}`);
      return { ...status, media_type: "video" };
    }
    return status;
  }, [sortedStatuses, currentIndex]);

  const isImage = currentStatus.media_type === "image";
  const isVideo = currentStatus.media_type === "video";
  const isText = currentStatus.media_type === "text";
  const hasMedia = (isImage || isVideo) && !!currentStatus.media;
  const statusText = currentStatus.text || "";

  const cacheVideo = async (url) => {
    try {
      const cacheDir = `${FileSystem.cacheDirectory}videos/`;
      await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
      const fileName = url.split("/").pop().split("?")[0];
      const localUri = `${cacheDir}${fileName}`;
      const fileInfo = await FileSystem.getInfoAsync(localUri);

      if (!fileInfo.exists) {
        console.log("Caching video from:", url);
        await FileSystem.downloadAsync(url, localUri, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
      }
      console.log("Cached video at:", localUri);
      return localUri;
    } catch (err) {
      console.error(`Failed to cache video at ${url}:`, err);
      return url;
    }
  };

  const checkVideoUrl = useCallback(async (url) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(url, {
        method: "HEAD",
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      console.log("Video URL accessible:", url);
      return true;
    } catch (error) {
      console.error("Video URL check failed:", error);
      return false;
    }
  }, [authToken]);

  const playerSource = useMemo(
    () =>
      isVideo && currentStatus.media
        ? { uri: currentStatus.media, headers: authToken ? { Authorization: `Bearer ${authToken}` } : {} }
        : null,
    [isVideo, currentStatus.media, authToken]
  );

  const player = useVideoPlayer(playerSource, (p) => {
    console.log("Player initialized, source:", playerSource?.uri || "none");
    playerRef.current = p;
    p.loop = false;
    p.onError = (error) => {
      console.error("Video player error:", error);
      setIsLoading(false);
      setLoadError(error.message || "Failed to load video");
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      setTimeout(() => handleNext(true), 2000);
    };
  });

  const isPlayerValid = (player) => {
    return player && typeof player.pause === "function";
  };

  const getStatusDuration = useCallback(() => {
    if (isVideo) {
      const safeDuration = playerRef.current?.duration
        ? playerRef.current.duration * 1000
        : VIDEO_MAX_DURATION;
      console.log("Video duration:", safeDuration);
      return Math.min(safeDuration, VIDEO_MAX_DURATION);
    }
    console.log("Image/text duration:", IMAGE_TEXT_DURATION);
    return IMAGE_TEXT_DURATION;
  }, [isVideo]);

  const startProgress = useCallback(
    (duration) => {
      console.log("startProgress called, duration:", duration);
      if (isPaused.current || isNavigating.current) return;
      progress.setValue(progress.__getValue());
      if (timerRef.current) clearTimeout(timerRef.current);
      Animated.timing(progress, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }).start(({ finished }) => {
        console.log("Progress animation finished:", finished);
        if (finished && !isPaused.current && !isNavigating.current) {
          handleNext(true);
        }
      });
    },
    [handleNext]
  );

  const handleNext = useCallback(
    (fromTimer = false) => {
      if (isNavigating.current) {
        console.log("handleNext blocked: already navigating");
        return;
      }
      isNavigating.current = true;
      console.log("handleNext called", {
        fromTimer,
        currentIndex,
        sortedStatusesLength: sortedStatuses.length,
        sortedStatusesRefLength: sortedStatusesRef.current.length,
        currentStatus: currentStatus.id ? { id: currentStatus.id, shopId: currentStatus.shop?.id } : null,
      });

      if (!fromTimer && isPaused.current) {
        togglePause();
        isNavigating.current = false;
        return;
      }
      if (isVideo && isPlayerValid(playerRef.current)) {
        try {
          playerRef.current.pause();
          console.log("Paused player before next");
        } catch (error) {
          console.error("Pause error in handleNext:", error);
        }
      }
      Animated.timing(progress).stop();
      progress.setValue(0);
      setIsLoading(false);
      setLoadError(null);
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);

      if (currentIndex < sortedStatusesRef.current.length - 1) {
        setCurrentIndex((prev) => {
          const nextIndex = Math.min(prev + 1, sortedStatusesRef.current.length - 1);
          console.log("Moving to next index:", nextIndex);
          return nextIndex;
        });
        isNavigating.current = false;
      } else {
        console.log("Reached end of statuses, calling onClose");
        const currentShopId = currentStatus.shop?.id ?? 0;
        const shopStatuses = sortedStatusesRef.current.filter((s) => s.shop?.id === currentShopId);
        console.log("Shop statuses for onStatusViewed:", { shopStatuses, currentShopId });
        if (shopStatuses.length > 0 && currentStatus.shop?.name) {
          onStatusViewed({ shop: currentStatus.shop.name, statuses: shopStatuses });
        }
        onClose();
        isNavigating.current = false;
      }
    },
    [currentIndex, currentStatus, onStatusViewed, onClose, isVideo]
  );

  const handlePrev = useCallback(() => {
    if (isNavigating.current) {
      console.log("handlePrev blocked: already navigating");
      return;
    }
    isNavigating.current = true;
    console.log("handlePrev called", { currentIndex, sortedStatusesRefLength: sortedStatusesRef.current.length });
    if (isVideo && isPlayerValid(playerRef.current)) {
      try {
        playerRef.current.pause();
        console.log("Paused player before prev");
      } catch (error) {
        console.error("Pause error in handlePrev:", error);
      }
    }
    Animated.timing(progress).stop();
    progress.setValue(0);
    setIsLoading(false);
    setLoadError(null);
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    if (currentIndex > 0) {
      setCurrentIndex((prev) => {
        console.log("Moving to prev index:", prev - 1);
        return prev - 1;
      });
      if (isPaused.current) {
        isPaused.current = false;
      }
    } else {
      console.log("Reached start, calling onClose");
      onClose();
    }
    isNavigating.current = false;
  }, [currentIndex, onClose, isVideo]);

  const togglePause = useCallback(() => {
    console.log("togglePause called", { isPaused: isPaused.current, playerRef: !!playerRef.current });
    isPaused.current = !isPaused.current;

    if (isPaused.current) {
      pausedTime.current = progress.__getValue() * getStatusDuration();
      console.log("Pausing, pausedTime:", pausedTime.current);
      Animated.timing(progress).stop();
      if (timerRef.current) clearTimeout(timerRef.current);
      if (isVideo && isPlayerValid(playerRef.current)) {
        try {
          playerRef.current.pause();
          console.log("Video paused");
        } catch (error) {
          console.error("Pause error in togglePause:", error);
        }
      }
    } else {
      const duration = getStatusDuration();
      const remainingTime = duration - pausedTime.current;
      console.log("Resuming, remainingTime:", remainingTime);
      progress.setValue(pausedTime.current / duration);
      startProgress(remainingTime);
      if (isVideo && isPlayerValid(playerRef.current)) {
        try {
          playerRef.current.play();
          console.log("Video resumed");
        } catch (error) {
          console.error("Play error in togglePause:", error);
          handleNext(true);
        }
      }
    }
  }, [isVideo, getStatusDuration, startProgress, handleNext]);

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
          { headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${authToken}` } }
        );
        status.viewed = true;

        if (status.media_type === "video" && status.media && !videoCache[status.media]) {
          const newCache = { ...videoCache, [status.media]: status.media };
          setVideoCache(newCache);
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(newCache));
          console.log("Cached video:", status.media);
        }
      } catch (error) {
        console.error("Error marking status as viewed:", error);
      }
    },
    [userId, videoCache, authToken]
  );

  const handleVideoLoad = useCallback(() => {
    console.log("Video loaded, source:", currentStatus.media);
    videoReadyRef.current = true;
    setIsLoading(false);
    setLoadError(null);
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    if (!isPaused.current && isVideo) {
      try {
        playerRef.current.play();
        console.log("Video auto-playing");
        startProgress(getStatusDuration());
      } catch (error) {
        console.error("Auto-play error:", error);
        handleNext(true);
      }
    }
  }, [currentStatus.media, isVideo, getStatusDuration, startProgress, handleNext]);

  const handleVideoError = useCallback(
    (error) => {
      console.error("VideoView error:", error);
      setIsLoading(false);
      setLoadError(error.message || "Failed to play video");
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      setTimeout(() => handleNext(true), 2000);
    },
    [handleNext]
  );

  const handlePlaybackStatusUpdate = useCallback(
    (status) => {
      console.log("Playback status update:", status);
      if (status.didJustFinish && !isPaused.current && !isNavigating.current) {
        console.log("Video finished, advancing to next status");
        progress.setValue(1);
        if (timerRef.current) clearTimeout(timerRef.current);
        handleNext(true);
      }
    },
    [handleNext]
  );

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

  useEffect(() => {
    console.log("Statuses prop changed:", { statusesLength: statuses?.length, statuses });
    if (!visible || !statuses?.length) {
      console.log("Not visible or no statuses, preserving sortedStatusesRef");
      return;
    }

    lastStatusesRef.current = statuses;
    console.log("Raw statuses before deduplication:", statuses);
    const uniqueStatuses = Array.from(
      new Map(statuses.map((status) => [status.id, status])).values()
    );
    const sorted = uniqueStatuses
      .map((status) => {
        if (!status.shop?.id) {
          console.warn(`Status ${status.id} has no shop.id, defaulting to 0`);
          return { ...status, shop: { ...status.shop, id: 0 } };
        }
        if (status.media && /\.(mp4|mov|avi)$/i.test(status.media) && status.media_type !== "video") {
          console.warn(`Mismatched media_type for status ${status.id}: expected video, got ${status.media_type}`);
          return { ...status, media_type: "video" };
        }
        return status;
      })
      .sort((a, b) => {
        const shopIdA = a.shop?.id ?? 0;
        const shopIdB = b.shop?.id ?? 0;
        if (shopIdA !== shopIdB) {
          return shopIdA - shopIdB;
        }
        return new Date(b.created_at) - new Date(a.created_at);
      });

    let startIndex = initialIndex;
    if (initialIndex >= sorted.length) {
      startIndex = 0;
    }

    console.log("Setting sorted statuses:", sorted);
    console.log("Setting initial index:", startIndex);
    setSortedStatuses(sorted);
    sortedStatusesRef.current = sorted;
    setCurrentIndex(startIndex);
  }, [visible, statuses, initialIndex]);

  useEffect(() => {
    if (!visible) {
      console.log("Modal closing, resetting state but preserving sortedStatusesRef");
      setSortedStatuses([]);
      setCurrentIndex(0);
      setIsLoading(false);
      setLoadError(null);
      progress.setValue(0);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      if (isPlayerValid(playerRef.current)) {
        try {
          playerRef.current.pause();
          console.log("Paused player on modal close");
        } catch (error) {
          console.error("Modal close pause error:", error);
        }
      }
      return;
    }

    if (currentIndex >= sortedStatusesRef.current.length) {
      console.log("Invalid currentIndex, closing StatusViewer", { currentIndex, sortedStatusesRefLength: sortedStatusesRef.current.length });
      onClose();
      return;
    }

    const status = sortedStatusesRef.current[currentIndex];
    if (!status) {
      console.log("No status available, closing StatusViewer");
      onClose();
      return;
    }

    console.log("Status changed:", status);
    progress.setValue(0);
    pausedTime.current = 0;
    isPaused.current = false;
    setIsLoading(false);
    setLoadError(null);
    videoReadyRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);

    markStatusAsViewed(status);

    if (isVideo && playerRef.current && status.id) {
      console.log("Updating video source:", status.media);
      setIsLoading(true);

      const loadVideo = async () => {
        const isAccessible = await checkVideoUrl(status.media);
        if (!isAccessible) {
          console.error("Video URL inaccessible:", status.media);
          setLoadError("Video URL is inaccessible");
          setTimeout(() => handleNext(true), 2000);
          return;
        }
        const cachedUri = await cacheVideo(status.media);
        try {
          await playerRef.current.replaceAsync({
            uri: cachedUri,
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
          });
          console.log("replaceAsync successful, cachedUri:", cachedUri);

          const checkVideoReady = setInterval(() => {
            if (playerRef.current?.duration > 0) {
              console.log("Video ready, duration:", playerRef.current.duration);
              clearInterval(checkVideoReady);
              videoReadyRef.current = true;
              setIsLoading(false);
              if (!isPaused.current) {
                try {
                  playerRef.current.play();
                  console.log("Video auto-playing");
                  startProgress(getStatusDuration());
                } catch (error) {
                  console.error("Auto-play error:", error);
                  handleNext(true);
                }
              }
            }
          }, 100);

          loadTimeoutRef.current = setTimeout(() => {
            if (videoReadyRef.current) {
              console.log("Video already loaded, ignoring timeout");
              return;
            }
            console.log("Video load timeout reached");
            setIsLoading(false);
            setLoadError("Video took too long to load");
            clearInterval(checkVideoReady);
            handleNext(true);
          }, LOAD_TIMEOUT);

          return () => clearInterval(checkVideoReady);
        } catch (error) {
          console.error("replaceAsync error:", error);
          setIsLoading(false);
          setLoadError(error.message || "Failed to load video");
          handleNext(true);
        }
      };

      loadVideo();
    } else {
      setIsLoading(false);
      setLoadError(null);
      if (!isVideo) {
        startProgress(getStatusDuration());
      }
    }

    return () => {
      console.log("Cleaning up status change");
      if (timerRef.current) clearTimeout(timerRef.current);
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      if (isVideo && isPlayerValid(playerRef.current)) {
        try {
          playerRef.current.pause();
          console.log("Paused player on cleanup");
        } catch (error) {
          console.error("Cleanup pause error:", error);
        }
      }
    };
  }, [visible, currentIndex, isVideo, authToken, checkVideoUrl, getStatusDuration, startProgress, markStatusAsViewed]);

  if (!visible || !sortedStatusesRef.current.length || currentIndex >= sortedStatusesRef.current.length) {
    console.log("Rendering null", {
      visible,
      sortedStatusesLength: sortedStatuses.length,
      sortedStatusesRefLength: sortedStatusesRef.current.length,
      currentIndex,
    });
    return null;
  }

  console.log("Rendering status:", { isImage, isVideo, isText, hasMedia, media: currentStatus.media });

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.shopName}>{currentStatus.shop?.name || "Unknown Shop"}</Text>
          <Text style={styles.createdAt}>{formatRelativeTime(currentStatus.created_at)}</Text>
        </View>

        <View style={styles.progressContainer}>
          {sortedStatusesRef.current
            .filter((s) => s.shop?.id === (currentStatus.shop?.id ?? 0))
            .map((status, idx) => (
              <View key={status.id} style={styles.progressBackground}>
                <Animated.View
                  style={[
                    styles.progressBar,
                    {
                      transform: [
                        {
                          scaleX: status.id === currentStatus.id
                            ? progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] })
                            : idx < sortedStatusesRef.current.filter((s) => s.shop?.id === (currentStatus.shop?.id ?? 0)).findIndex((s) => s.id === currentStatus.id)
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

        <TouchableOpacity style={[styles.leftExpanded, { zIndex: 10 }]} onPress={handlePrev} activeOpacity={0.8} />

        <TouchableOpacity
          style={[styles.content, { zIndex: 5 }]}
          activeOpacity={0.8}
          onPress={togglePause}
        >
          {isLoading && isVideo ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          ) : loadError && isVideo ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{loadError}</Text>
            </View>
          ) : hasMedia ? (
            <>
              {isVideo ? (
                <VideoView
                  style={styles.media}
                  player={player}
                  contentFit="cover"
                  allowsFullscreen={false}
                  allowsPictureInPicture={false}
                  onLoad={handleVideoLoad}
                  onError={handleVideoError}
                  onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                  nativeControls={false}
                />
              ) : isImage ? (
                <Image
                  source={{ uri: currentStatus.media }}
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
              <Text style={styles.plainText}>{isText && statusText ? statusText : "No content available"}</Text>
              {currentStatus.shop?.image && (
                <Image
                  source={{ uri: currentStatus.shop.image }}
                  style={styles.textBackground}
                />
              )}
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.rightExpanded, { zIndex: 10 }]} onPress={() => handleNext(false)} activeOpacity={0.8} />

        <TouchableOpacity
          style={[styles.closeButton, { zIndex: 30 }]}
          onPress={() => {
            console.log("Close button pressed, onClose:", typeof onClose);
            if (onClose) {
              onClose();
            } else {
              console.warn("onClose is undefined, resetting state manually");
              setCurrentIndex(0);
              setSortedStatuses([]);
              sortedStatusesRef.current = [];
              setIsLoading(false);
              setLoadError(null);
            }
          }}
          activeOpacity={0.8}
        >
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
    top: 20,
    left: 16,
    right: 60,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 20,
  },
  shopName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  createdAt: {
    color: "#fff",
    fontSize: 14,
    opacity: 0.7,
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
    top: 20,
    right: 15,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 30,
  },
  closeText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 20,
  },
});

export default StatusViewer;