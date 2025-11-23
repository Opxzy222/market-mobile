import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  Image,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import * as FileSystem from "expo-file-system";
import api from "../../api";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const IMAGE_TEXT_DURATION = 6000;
const VIDEO_MAX_DURATION = 30000;
const LOAD_TIMEOUT = 10000;
const CACHE_KEY = "videoCache";

/* --------------------------------------------------------------- */
/*                         HELPERS                                 */
/* --------------------------------------------------------------- */
const formatRelativeTime = (createdAt: string | undefined) => {
  if (!createdAt) return "";
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

/* --------------------------------------------------------------- */
/*                         MAIN COMPONENT                          */
/* --------------------------------------------------------------- */
const StatusViewer = ({
  visible,
  statuses,
  initialIndex = 0,
  onClose,
  onStatusViewed,
  onSingleStatusViewed,
  userId,
  authToken,
}: {
  visible: boolean;
  statuses: any[];
  initialIndex?: number;
  onClose: () => void;
  onStatusViewed?: (payload: any) => void;
  onSingleStatusViewed?: (statusId: number, shopId: number) => void;
  userId: number;
  authToken: string;
}) => {
  /* ------------------- STATE & REFS ------------------- */
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [videoCache, setVideoCache] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const progress = useRef(new Animated.Value(0)).current;
  const playerRef = useRef<any>(null);
  const isPaused = useRef(false);
  const pausedTime = useRef(0);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isNavigating = useRef(false);
  const currentIndexRef = useRef(initialIndex);
  const finishedIds = useRef(new Set<number>());
  const startedWithUnviewed = useRef(false);

  /* ------------------- STABLE LIST ------------------- */
  const flattened = useMemo(() => statuses ?? [], [statuses]);

  /* ------------------- SMART START INDEX ------------------- */
  const smartStartIndex = useMemo(() => {
    if (!flattened.length) return 0;

    const clicked = flattened[initialIndex];
    const shopId = clicked?.shop?.id;
    if (!shopId) return 0;

    const shopStart = flattened.findIndex((s) => s.shop?.id === shopId);
    if (shopStart === -1) return 0;

    const shopSlice = flattened
      .slice(shopStart)
      .filter((s) => s.shop?.id === shopId);
    const firstUnviewed = shopSlice.findIndex(
      (s) => !s.viewed && !finishedIds.current.has(s.id)
    );

    startedWithUnviewed.current = firstUnviewed >= 0;
    return firstUnviewed >= 0 ? shopStart + firstUnviewed : shopStart;
  }, [flattened, initialIndex]);

  useEffect(() => {
    setCurrentIndex(smartStartIndex);
    currentIndexRef.current = smartStartIndex;
  }, [smartStartIndex]);

  /* ------------------- CURRENT STATUS ------------------- */
  const currentStatus = useMemo(() => {
    const s = flattened[currentIndex] ?? {};
    if (
      s.media &&
      /\.(mp4|mov|avi)$/i.test(s.media) &&
      s.media_type !== "video"
    ) {
      return { ...s, media_type: "video" };
    }
    return s;
  }, [flattened, currentIndex]);

  const isImage = currentStatus.media_type === "image";
  const isVideo = currentStatus.media_type === "video";
  const isText = currentStatus.media_type === "text";
  const hasMedia = (isImage || isVideo) && !!currentStatus.media;
  const statusText = currentStatus.text?.trim() ?? "";

  /* ------------------- SHOP PROGRESS BARS ------------------- */
  const { shopStatuses, effectiveIndex } = useMemo(() => {
    const shopId = currentStatus.shop?.id ?? 0;
    const list = flattened.filter((s) => s.shop?.id === shopId);
    const start = flattened.findIndex((s) => s.shop?.id === shopId);
    const effIdx = currentIndex - start;
    return {
      shopStatuses: list,
      effectiveIndex: effIdx >= 0 ? effIdx : 0,
    };
  }, [currentStatus, flattened, currentIndex]);

  /* ------------------- SINGLE PLAYER SOURCE ------------------- */
  const playerSource = useMemo(
    () =>
      isVideo && currentStatus.media
        ? {
            uri: currentStatus.media,
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
          }
        : null,
    [isVideo, currentStatus.media, authToken]
  );

  const player = useVideoPlayer(playerSource, (p) => {
    playerRef.current = p;
    p.loop = false;
    p.onError = (err: any) => {
      console.error("Video player error:", err);
      setIsLoading(false);
      setLoadError(err.message ?? "Failed to load video");
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      setTimeout(() => handleNext(true), 2000);
    };
  });

  /* ------------------- CACHING ------------------- */
  const cacheVideo = async (url: string): Promise<string> => {
    try {
      const cacheDir = `${FileSystem.cacheDirectory}videos/`;
      await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
      const fileName = url.split("/").pop()?.split("?")[0] ?? `video_${Date.now()}`;
      const localUri = `${cacheDir}${fileName}`;
      const info = await FileSystem.getInfoAsync(localUri);
      if (!info.exists) {
        await FileSystem.downloadAsync(url, localUri, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
      }
      return localUri;
    } catch (e) {
      console.error(`Cache failed for ${url}:`, e);
      return url;
    }
  };

  const checkVideoUrl = useCallback(
    async (url: string): Promise<boolean> => {
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(url, {
          method: "HEAD",
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
          signal: controller.signal,
        });
        clearTimeout(tid);
        return res.ok;
      } catch {
        return false;
      }
    },
    [authToken]
  );

  /* ------------------- DURATION & PROGRESS ------------------- */
  const getStatusDuration = useCallback(() => {
    if (isVideo && playerRef.current?.duration) {
      return Math.min(playerRef.current.duration * 1000, VIDEO_MAX_DURATION);
    }
    return IMAGE_TEXT_DURATION;
  }, [isVideo]);

  const startProgress = useCallback(
    (overrideDuration?: number) => {
      if (isPaused.current || isNavigating.current) return;
      const duration = overrideDuration ?? getStatusDuration();
      const current = progress.__getValue();
      const remaining = (1 - current) * duration;

      Animated.timing(progress, {
        toValue: 1,
        duration: remaining,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && !isPaused.current && !isNavigating.current) {
          const statusId = currentStatus.id;
          const shopId = currentStatus.shop?.id;

          // INSTANT UPDATE IN PARENT
          if (statusId && shopId) {
            onSingleStatusViewed?.(statusId, shopId);
          }

          finishedIds.current.add(statusId);
          progress.setValue(1);

          // Check if shop is fully viewed
          if (shopId) {
            const shopSlice = flattened.filter((s) => s.shop?.id === shopId);
            const allDone = shopSlice.every(
              (s) => s.viewed || finishedIds.current.has(s.id)
            );
            if (allDone) {
              onStatusViewed?.({
                shopId,
                shop: currentStatus.shop?.name,
                shopImage: currentStatus.shop?.image,
                statuses: shopSlice.map((s) => ({ ...s, viewed: true })),
              });
            }
          }
          handleNext(true);
        }
      });
    },
    [
      getStatusDuration,
      currentStatus,
      onSingleStatusViewed,
      onStatusViewed,
      handleNext,
      flattened,
    ]
  );

  /* ------------------- NAVIGATION ------------------- */
  const handleNext = useCallback(
    (fromTimer = false) => {
      if (isNavigating.current) return;
      isNavigating.current = true;

      if (!fromTimer && isPaused.current) {
        isPaused.current = false;
        isNavigating.current = false;
        return;
      }

      const p = playerRef.current;
      if (p && typeof p.pause === "function") {
        try { p.pause(); } catch {}
      }

      setIsLoading(false);
      setLoadError(null);
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);

      let nextIdx = currentIndexRef.current + 1;

      while (nextIdx < flattened.length) {
        const nxt = flattened[nextIdx];
        const shopId = nxt.shop?.id;
        const shopStart = flattened.findIndex((s) => s.shop?.id === shopId);
        const shopEnd = flattened
          .slice(shopStart)
          .findIndex((s) => s.shop?.id !== shopId);
        const shopSlice =
          shopEnd === -1
            ? flattened.slice(shopStart)
            : flattened.slice(shopStart, shopStart + shopEnd);

        const hasUnviewed = shopSlice.some(
          (s) => !s.viewed && !finishedIds.current.has(s.id)
        );

        if (hasUnviewed) {
          const first = shopSlice.findIndex(
            (s) => !s.viewed && !finishedIds.current.has(s.id)
          );
          nextIdx = shopStart + first;
          break;
        } else {
          nextIdx = shopStart + shopSlice.length;
        }
      }

      if (nextIdx >= flattened.length) {
        if (startedWithUnviewed.current) {
          const nextViewed = flattened
            .slice(currentIndexRef.current + 1)
            .findIndex((s) => {
              const shopSlice = flattened.filter(
                (st) => st.shop?.id === s.shop?.id
              );
              return shopSlice.every(
                (st) => st.viewed || finishedIds.current.has(st.id)
              );
            });
          if (nextViewed !== -1) {
            nextIdx = currentIndexRef.current + 1 + nextViewed;
          } else {
            onClose();
            isNavigating.current = false;
            return;
          }
        } else {
          const nextViewed = flattened
            .slice(currentIndexRef.current + 1)
            .findIndex((s) => {
              const shopSlice = flattened.filter(
                (st) => st.shop?.id === s.shop?.id
              );
              return shopSlice.every(
                (st) => st.viewed || finishedIds.current.has(st.id)
              );
            });
          if (nextViewed !== -1) {
            nextIdx = currentIndexRef.current + 1 + nextViewed;
          } else {
            onClose();
            isNavigating.current = false;
            return;
          }
        }
      }

      setCurrentIndex(() => {
        currentIndexRef.current = nextIdx;
        return nextIdx;
      });
      isNavigating.current = false;
    },
    [flattened, onClose]
  );

  const handlePrev = useCallback(() => {
    if (isNavigating.current || currentIndexRef.current <= 0) {
      onClose();
      return;
    }
    isNavigating.current = true;

    const p = playerRef.current;
    if (p && typeof p.pause === "function") {
      try { p.pause(); } catch {}
    }

    let prevIdx = currentIndexRef.current - 1;
    const curShopId = flattened[currentIndexRef.current]?.shop?.id;
    if (curShopId) {
      const shopStart = flattened.findIndex((s) => s.shop?.id === curShopId);
      if (prevIdx < shopStart) {
        const prevShopId = flattened[prevIdx]?.shop?.id;
        const lastInPrev = flattened
          .slice(0, shopStart)
          .findLastIndex((s) => s.shop?.id === prevShopId);
        prevIdx = lastInPrev >= 0 ? lastInPrev : prevIdx;
      }
    }

    setCurrentIndex(() => {
      currentIndexRef.current = prevIdx;
      return prevIdx;
    });
    isPaused.current = false;
    isNavigating.current = false;
  }, [flattened, onClose]);
  
  const togglePause = useCallback(() => {
    isPaused.current = !isPaused.current;
    const p = playerRef.current;
    if (isPaused.current) {
      pausedTime.current = progress.__getValue() * getStatusDuration();
      progress.stopAnimation();
      if (p && typeof p.pause === "function") {
        try { p.pause(); } catch {}
      }
    } else {
      const dur = getStatusDuration();
      const rem = dur - pausedTime.current;
      progress.setValue(pausedTime.current / dur);
      startProgress(rem);
      if (p && typeof p.play === "function") {
        try { p.play(); } catch {}
      }
    }
  }, [getStatusDuration, startProgress]);

  /* ------------------- MARK VIEWED (API) ------------------- */
  const markStatusAsViewed = useCallback(
    async (status: any) => {
      if (!status || status.viewed || !userId) return;
      try {
        const fd = new FormData();
        fd.append("user_id", userId.toString());
        fd.append("status_ids[]", status.id.toString());

        await api.post("/mark_status_viewed/", fd, {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: authToken,
          },
        });

        if (
          status.media_type === "video" &&
          status.media &&
          !videoCache[status.media]
        ) {
          const newCache = { ...videoCache, [status.media]: status.media };
          setVideoCache(newCache);
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(newCache));
        }
      } catch (e) {
        console.error("API mark viewed error:", e);
      }
    },
    [userId, videoCache, authToken]
  );

  /* ------------------- VIDEO LOAD HANDLERS ------------------- */
  const handleVideoLoad = useCallback(() => {
    console.log("Video metadata loaded");
  }, []);

  const handleVideoError = useCallback(
    (err: any) => {
      console.error("VideoView error:", err);
      setIsLoading(false);
      setLoadError(err.message ?? "Failed to play video");
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      setTimeout(() => handleNext(true), 2000);
    },
    [handleNext]
  );

  /* ------------------- CACHE LOAD ------------------- */
  useEffect(() => {
    const load = async () => {
      try {
        const data = await AsyncStorage.getItem(CACHE_KEY);
        if (data) setVideoCache(JSON.parse(data));
      } catch (e) {
        console.error("Cache load error:", e);
      }
    };
    load();
  }, []);

  /* ------------------- MAIN EFFECT (INDEX CHANGE) ------------------- */
  useEffect(() => {
    if (!visible || currentIndex >= flattened.length) {
      onClose();
      return;
    }

    const status = flattened[currentIndex];
    progress.setValue(0);
    pausedTime.current = 0;
    isPaused.current = false;
    setIsLoading(false);
    setLoadError(null);
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }

    const shopId = status.shop?.id;
    if (shopId) {
      const shopStart = flattened.findIndex((s) => s.shop?.id === shopId);
      for (let i = shopStart; i < currentIndex; i++) {
        finishedIds.current.add(flattened[i].id);
      }
    }

    markStatusAsViewed(status);

    if (isVideo && status.media && playerRef.current) {
      setIsLoading(true);
      (async () => {
        const ok = await checkVideoUrl(status.media);
        if (!ok) {
          setLoadError("Video URL inaccessible");
          setTimeout(() => handleNext(true), 2000);
          return;
        }

        const cached = await cacheVideo(status.media);

        try {
          await playerRef.current.replaceAsync({
            uri: cached,
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
          });

          await new Promise<void>((resolve) => {
            const onReady = () => {
              playerRef.current?.removeListener('readyForDisplay', onReady);
              resolve();
            };
            playerRef.current?.addListener('readyForDisplay', onReady);

            setTimeout(() => {
              playerRef.current?.removeListener('readyForDisplay', onReady);
              resolve();
            }, 3000);
          });

          setIsLoading(false);
          if (!isPaused.current) {
            const p = playerRef.current;
            if (p && typeof p.play === "function") {
              try {
                p.play();
                startProgress();
              } catch (e) {
                console.error("autoplay error:", e);
                handleNext(true);
              }
            }
          }
        } catch (e) {
          console.warn("replaceAsync failed:", e);
          setLoadError("Load failed");
          setTimeout(() => handleNext(true), 1500);
        }
      })();
    } else {
      setIsLoading(false);
      startProgress();
    }

    return () => {
      progress.stopAnimation();
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
    };
  }, [
    currentIndex,
    visible,
    flattened,
    markStatusAsViewed,
    authToken,
    isVideo,
    startProgress,
    handleNext,
    checkVideoUrl,
  ]);

  /* ------------------- UNMOUNT CLEANUP ------------------- */
  useEffect(() => {
    return () => {
      const player = playerRef.current;
      if (player) {
        try {
          if (typeof player.pause === "function") player.pause();
          if (typeof player.unloadAsync === "function") {
            player.unloadAsync().catch(() => {});
          }
        } catch (e) {
          // Silent fail
        } finally {
          playerRef.current = null;
        }
      }

      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }

      progress.stopAnimation();
    };
  }, [progress]);

  if (!visible || currentIndex >= flattened.length) return null;

  /* --------------------------------------------------------------- */
  /*                         RENDER                                 */
  /* --------------------------------------------------------------- */
  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.shopName}>
            {currentStatus.shop?.name ?? "Unknown Shop"}
          </Text>
          <Text style={styles.createdAt}>
            {formatRelativeTime(currentStatus.created_at)}
          </Text>
        </View>

        {/* Progress bars */}
        <View style={styles.progressContainer}>
          {shopStatuses.map((s, i) => {
            const isCurrent = i === effectiveIndex;
            const isPast = i < effectiveIndex;
            const isViewed = s.viewed || finishedIds.current.has(s.id);

            return (
              <View key={s.id} style={styles.progressBackground}>
                <Animated.View
                  style={[
                    styles.progressBar,
                    {
                      transform: [
                        {
                          scaleX: isCurrent
                            ? progress.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, 1],
                              })
                            : isPast || (isViewed && !isCurrent)
                            ? 1
                            : 0,
                        },
                      ],
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>

        {/* Media or Text */}
        <View style={styles.contentWrapper}>
          {isText && statusText ? (
            <View style={styles.textStatusContainer}>
              <Text style={styles.textStatus}>{statusText}</Text>
            </View>
          ) : isLoading && isVideo ? (
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
                  onReadyForDisplay={() => {
                    if (!isPaused.current && !isLoading) {
                      playerRef.current?.play();
                    }
                  }}
                  onError={handleVideoError}
                  onPlaybackStatusUpdate={() => {}}
                  nativeControls={false}
                />
              ) : isImage ? (
                <Image
                  source={{ uri: currentStatus.media }}
                  style={styles.media}
                  resizeMode="contain"
                />
              ) : null}
            </>
          ) : null}
        </View>

        {/* CAPTION — FAR BOTTOM, BOLD, CLEAR */}
        {hasMedia && statusText && (
          <View style={styles.captionContainer}>
            <View style={styles.captionBubble}>
              <Text style={styles.caption}>{statusText}</Text>
            </View>
          </View>
        )}

        {/* Tap zones */}
        <TouchableOpacity
          style={styles.leftTap}
          onPress={handlePrev}
          activeOpacity={0.8}
        />
        <TouchableOpacity
          style={styles.centerTap}
          onPress={togglePause}
          activeOpacity={0.8}
        />
        <TouchableOpacity
          style={styles.rightTap}
          onPress={() => handleNext(false)}
          activeOpacity={0.8}
        />
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Text style={styles.closeText}>×</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

/* --------------------------------------------------------------- */
/*                            STYLES                               */
/* --------------------------------------------------------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
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
  shopName: { color: "#fff", fontSize: 18, fontWeight: "600" },
  createdAt: { color: "#fff", fontSize: 14, opacity: 0.7 },
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
    backgroundColor: "rgba(255,255,255,0.4)",
    overflow: "hidden",
  },
  progressBar: { height: 2, backgroundColor: "#fff", width: "100%" },
  contentWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  media: { width: "100%", height: "100%" },
  textStatusContainer: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  textStatus: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 34,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  captionContainer: {
    position: "absolute",
    bottom: 50, // FAR BOTTOM
    left: 20,
    right: 20,
    zIndex: 15,
    alignItems: "center",
  },
  captionBubble: {
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    maxWidth: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  caption: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 24,
  },
  leftTap: { position: "absolute", left: 0, top: 0, bottom: 0, width: "40%", zIndex: 10 },
  centerTap: { position: "absolute", left: "40%", right: "40%", top: 0, bottom: 0, zIndex: 10 },
  rightTap: { position: "absolute", right: 0, top: 0, bottom: 0, width: "40%", này: 10 },
  closeButton: {
    position: "absolute",
    top: 20,
    right: 15,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 30,
  },
  closeText: { color: "#fff", fontSize: 28, fontWeight: "300" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  errorText: { color: "#fff", fontSize: 18, textAlign: "center" },
});

export default StatusViewer;