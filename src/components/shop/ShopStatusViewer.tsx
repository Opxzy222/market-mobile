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
  Alert,
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

const STATUS_DURATION = 5000;
const VIDEO_MAX_DURATION = 30000;
const LOAD_TIMEOUT = 10000;

const StatusViewer = ({ statuses, initialIndex = 0, onClose, authToken, onDelete, canDelete }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const progress = useRef(new Animated.Value(0)).current;
  const playerRef = useRef(null);
  const timerRef = useRef(null);
  const isPaused = useRef(false);
  const pausedTime = useRef(0);
  const cleanupLock = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const loadTimeoutRef = useRef(null);

  const renderCount = useRef(0);
  useEffect(() => {
    renderCount.current += 1;
    console.log(`Render count: ${renderCount.current}`);
  });

  const currentStatus = useMemo(() => statuses[currentIndex] || {}, [statuses, currentIndex]);
  const isVideo = currentStatus.media_type === "video";
  const isImage = currentStatus.media_type === "image";
  const hasMedia = (isImage || isVideo) && !!currentStatus.media;
  const statusText = currentStatus.text || "";

  const cacheVideo = async (url) => {
    try {
      const cacheDir = `${FileSystem.cacheDirectory}videos/`;
      await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
      const fileName = url.split('/').pop();
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

  const retryVideoLoad = useCallback(async () => {
    if (isVideo && playerRef.current && currentStatus.media) {
      console.log("Retrying video load:", currentStatus.media);
      setIsLoading(true);
      setLoadError(null);
      const isAccessible = await checkVideoUrl(currentStatus.media);
      if (!isAccessible) {
        setIsLoading(false);
        setLoadError("Video URL is inaccessible");
        setTimeout(() => handleNext(true), 2000);
        return;
      }
      const cachedUri = await cacheVideo(currentStatus.media);
      try {
        await playerRef.current.replaceAsync({
          uri: cachedUri,
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
        console.log("replaceAsync successful");
      } catch (error) {
        console.error("Retry replaceAsync error:", error);
        setIsLoading(false);
        setLoadError(error.message || "Failed to retry video load");
        setTimeout(() => handleNext(true), 2000);
      }
    }
  }, [isVideo, currentStatus.media, authToken, checkVideoUrl, handleNext]);

  const playerSource = useMemo(() => 
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
    return player && typeof player.pause === 'function';
  };

  const deleteStatus = async (statusId) => {
    try {
      await axios.delete('https://retail-alvinia-goza-f6a0e4f7.koyeb.app/delete_status/', {
        data: { status_id: statusId },
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      Alert.alert('Success', 'Status deleted successfully');
      if (onDelete) onDelete(statusId);
      if (statuses.length === 1) {
        onClose();
      } else {
        handleNext(true);
      }
    } catch (error) {
      console.error('Error deleting status:', error);
      Alert.alert('Error', 'Failed to delete status');
    }
  };

  useEffect(() => {
    if (isVideo && playerRef.current && currentStatus.media) {
      console.log("Updating video source:", currentStatus.media);
      setIsLoading(true);
      setLoadError(null);

      const loadVideo = async () => {
        const isAccessible = await checkVideoUrl(currentStatus.media);
        if (!isAccessible) {
          setIsLoading(false);
          setLoadError("Video URL is inaccessible");
          setTimeout(() => handleNext(true), 2000);
          return;
        }

        const cachedUri = await cacheVideo(currentStatus.media);
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
              setIsLoading(false);
              if (!isPaused.current) {
                playerRef.current.play();
                startProgress(getStatusDuration());
              }
            }
          }, 100);

          loadTimeoutRef.current = setTimeout(() => {
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
          setTimeout(() => handleNext(true), 2000);
        }
      };

      loadVideo();
    } else {
      setIsLoading(false);
      setLoadError(null);
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      if (!isVideo) {
        startProgress(getStatusDuration());
      }
    }

    return () => {
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    };
  }, [currentStatus.media, isVideo, authToken, checkVideoUrl, getStatusDuration, startProgress, handleNext]);

  const getStatusDuration = useCallback(() => {
    if (isVideo) {
      const safeDuration = playerRef.current?.duration
        ? playerRef.current.duration * 1000
        : VIDEO_MAX_DURATION;
      console.log("Video duration:", safeDuration);
      return Math.min(safeDuration, VIDEO_MAX_DURATION);
    }
    console.log("Image/text duration:", STATUS_DURATION);
    return STATUS_DURATION;
  }, [isVideo]);

  const handleNext = useCallback(
    (fromTimer = false) => {
      console.log("handleNext called, fromTimer:", fromTimer);
      if (!fromTimer && isPaused.current) {
        togglePause();
        return;
      }
      if (isPlayerValid(playerRef.current) && !cleanupLock.current) {
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
    if (isPlayerValid(playerRef.current) && !cleanupLock.current) {
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
      setCurrentIndex((prev) => prev - 1);
      if (isPaused.current) {
        isPaused.current = false;
      }
    }
  }, [currentIndex]);

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
    },
    [handleNext]
  );

  const togglePause = useCallback(() => {
    console.log("togglePause called, isPaused:", isPaused.current);
    isPaused.current = !isPaused.current;

    if (isPaused.current) {
      pausedTime.current = progress.__getValue() * getStatusDuration();
      console.log("Pausing, pausedTime:", pausedTime.current);
      Animated.timing(progress).stop();
      if (timerRef.current) clearTimeout(timerRef.current);
      if (isVideo && isPlayerValid(playerRef.current) && !cleanupLock.current) {
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
      if (isVideo && isPlayerValid(playerRef.current) && !cleanupLock.current) {
        try {
          playerRef.current.play();
          console.log("Video resumed");
        } catch (error) {
          console.error("Play error in togglePause:", error);
        }
      }
    }
  }, [isVideo, getStatusDuration, startProgress]);

  const handleVideoLoad = useCallback(() => {
    console.log("Video loaded, source:", currentStatus.media);
    setIsLoading(false);
    setLoadError(null);
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
  }, [currentStatus.media]);

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
      if (status.didJustFinish && !isPaused.current) {
        console.log("Video finished, advancing to next status");
        progress.setValue(1);
        if (timerRef.current) clearTimeout(timerRef.current);
        handleNext(true);
      }
    },
    [handleNext]
  );

  useEffect(() => {
    if (!statuses || currentIndex >= statuses.length) return;

    console.log("State updated:", { isLoading, loadError, currentIndex });
    console.log("Status changed, index:", currentIndex, "status:", currentStatus);
    cleanupLock.current = false;
    progress.setValue(0);
    pausedTime.current = 0;
    isPaused.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!isVideo) {
      startProgress(getStatusDuration());
    }

    return () => {
      console.log("Cleaning up status change");
      if (timerRef.current) clearTimeout(timerRef.current);
      if (isPlayerValid(playerRef.current) && !cleanupLock.current) {
        try {
          playerRef.current.pause();
          console.log("Paused video on cleanup");
        } catch (error) {
          console.error("Pause error in status cleanup:", error);
        }
      }
      cleanupLock.current = true;
    };
  }, [currentIndex, statuses, currentStatus, getStatusDuration, startProgress, isVideo]);

  useEffect(() => {
    return () => {
      console.log("Unmounting StatusViewer");
      cleanupLock.current = true;
      if (isPlayerValid(playerRef.current)) {
        try {
          playerRef.current.pause();
          console.log("Paused player on unmount");
        } catch (error) {
          console.error("Pause error on unmount:", error);
        }
      }
      playerRef.current = null;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        console.log("Cleared timer on unmount");
      }
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        console.log("Cleared load timeout on unmount");
      }
    };
  }, []);

  if (!statuses || statuses.length === 0) {
    console.log("No statuses, rendering null");
    return null;
  }

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
          {isLoading && isVideo ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          ) : loadError && isVideo ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{loadError}</Text>
              <TouchableOpacity onPress={retryVideoLoad} style={styles.retryButton}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
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
                <Image source={{ uri: currentStatus.media }} style={styles.media} resizeMode="contain" />
              ) : null}
              {statusText.trim().length > 0 && (
                <Text style={styles.caption}>{statusText}</Text>
              )}
              {hasMedia && canDelete && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => {
                    Alert.alert(
                      'Delete Status',
                      'Are you sure you want to delete this status?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: () => deleteStatus(currentStatus.id),
                        },
                      ]
                    );
                  }}
                >
                  <Ionicons name="trash-outline" size={24} color="#fff" />
                </TouchableOpacity>
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
  retryButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  retryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  deleteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 8,
    borderRadius: 5,
  },
});

export default StatusViewer;