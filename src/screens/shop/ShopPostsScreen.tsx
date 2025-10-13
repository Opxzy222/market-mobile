import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  RefreshControl,
  FlatList,
  TouchableOpacity,
  Modal,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import ImageViewer from "react-native-image-zoom-viewer";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import api from '../../api';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const getFullUrl = (url) => {
  const BASE_URL = "";
  return url && typeof url === "string" && url.startsWith("http") ? url : `${BASE_URL}${url || ""}`;
};

const isRecentPost = (createdAt) => {
  if (!createdAt) return false;
  const postTime = new Date(createdAt);
  const currentTime = new Date();
  const hoursDifference = (currentTime - postTime) / (1000 * 60 * 60);
  return hoursDifference < 3;
};

// Thumbnail Component
const Thumbnail = ({ media, isVideo }) => {
  const [isThumbnailLoading, setIsThumbnailLoading] = useState(true);
  const thumbnailUri = isVideo && media.thumbnail_url ? getFullUrl(media.thumbnail_url) : getFullUrl(media.url);

  if (!media || !media.url) {
    return (
      <View style={styles.fallbackContainer}>
        <Ionicons name="image-outline" size={40} color="#888" />
        <Text style={styles.errorText}>No thumbnail available</Text>
      </View>
    );
  }

  return (
    <View style={styles.thumbnailContainer}>
      {isThumbnailLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}
      <Image
        source={{ uri: thumbnailUri }}
        style={[styles.thumbnail, isThumbnailLoading && { opacity: 0 }]}
        contentFit="cover"
        cachePolicy="memory-disk"
        onLoadStart={() => setIsThumbnailLoading(true)}
        onLoad={() => setIsThumbnailLoading(false)}
        onError={(e) => {
          console.error("Thumbnail load error:", thumbnailUri, e.error);
          setIsThumbnailLoading(false);
        }}
      />
    </View>
  );
};

// Custom Image Viewer Component
const CustomImageViewer = ({ imageUrls, index, onChange, isFullscreen }) => {
  const [isImageLoading, setIsImageLoading] = useState(true);
  const timeoutRef = useRef(null);

  useEffect(() => {
    setIsImageLoading(true);

    // Short initial timeout to handle cached images
    timeoutRef.current = setTimeout(() => {
      setIsImageLoading(false);
    }, 100); // 100ms for cached images

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [index]);

  return (
    <View style={[styles.imageViewerContainer, isFullscreen && styles.fullscreenImage]}>
      {isImageLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading image...</Text>
        </View>
      )}
      <ImageViewer
        imageUrls={imageUrls}
        index={index}
        onChange={onChange}
        saveToLocalByLongPress={true}
        backgroundColor="transparent"
        renderIndicator={() => null}
        style={[styles.imageViewer, isFullscreen && styles.fullscreenImageViewer]}
      />
      {imageUrls[index] && (
        <Image
          source={{ uri: imageUrls[index].url }}
          style={{ width: 0, height: 0, position: "absolute" }}
          cachePolicy="none" // Disable caching for hidden Image to ensure onLoad fires
          onLoad={() => {
            setIsImageLoading(false);
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
          }}
          onError={(e) => {
            setIsImageLoading(false);
            console.error("Image preload error:", imageUrls[index].url, e.error);
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
          }}
        />
      )}
    </View>
  );
};

const ShopPostsScreen = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(2);
  const [hasMore, setHasMore] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(true);

  const playerRef = useRef(null);
  const player = useVideoPlayer(null, (p) => {
    playerRef.current = p;
    p.loop = false;
  });
  const isMountedRef = useRef(true);

  useEffect(() => {
    if (__DEV__) console.log("ShopPostsScreen params:", params);
    let initialPosts = [];
    try {
      if (typeof params.posts === "string" && params.posts.trim()) {
        initialPosts = JSON.parse(params.posts);
      } else {
        console.warn("params.posts is not a valid JSON string or is empty:", params.posts);
        initialPosts = [];
      }
      if (!Array.isArray(initialPosts)) {
        console.warn("initialPosts is not an array:", initialPosts);
        initialPosts = [];
      }
      initialPosts = initialPosts.map((post, index) => ({
        id: post?.id != null ? post.id.toString() : `fallback-id-${index}-${Date.now()}`,
        shop_name: post?.shop_name || "Unknown Shop",
        created_at: post?.created_at || "No date",
        description: post?.description || "No description",
        media: Array.isArray(post?.media)
          ? post.media.map((item) => ({
              url: item?.url || "",
              thumbnail_url: item?.thumbnail_url || "",
              type: item?.type || "image",
            }))
          : [],
        shop_id: post?.shop_id ?? null,
        shop_image: post?.shop_image || null,
        distance: post?.distance ?? null,
      }));
      if (__DEV__) console.log("Initial posts after processing:", initialPosts);
      if (isMountedRef.current) {
        setPosts(initialPosts);
        setHasMore(initialPosts.length >= 20);
      }
    } catch (error) {
      console.error("Error parsing initialPosts:", error);
      if (isMountedRef.current) {
        setPosts([]);
      }
    }
    return () => {
      isMountedRef.current = false;
    };
  }, [params.posts]);

  const isVideoFile = useCallback((media) => {
    return media && media.type === "video";
  }, []);

  useEffect(() => {
    if (selectedPost && selectedPost.media && selectedPost.media[currentIndex]) {
      const media = selectedPost.media[currentIndex];
      const fullUrl = getFullUrl(media.url);
      const isVideo = isVideoFile(media);

      if (isVideo && playerRef.current) {
        const loadVideo = async () => {
          try {
            setIsVideoLoading(true);
            setVideoError(null);
            if (playerRef.current.source?.uri !== fullUrl) {
              await playerRef.current.replaceAsync({ uri: fullUrl });
            }
            setIsVideoLoading(false);
            playerRef.current.play();
          } catch (error) {
            console.error("Video load error:", fullUrl, error.message);
            setVideoError("Failed to load video");
            setIsVideoLoading(false);
          }
        };
        loadVideo();
      } else {
        setIsVideoLoading(false);
        setVideoError(null);
      }
    }

    return () => {
      if (playerRef.current && typeof playerRef.current.pause === "function") {
        try {
          playerRef.current.pause();
        } catch (error) {
          console.warn("Error pausing video during cleanup:", error.message);
        }
      }
    };
  }, [selectedPost, currentIndex, isVideoFile]);

  const pausePlayer = useCallback(() => {
    if (playerRef.current && typeof playerRef.current.pause === "function") {
      try {
        playerRef.current.pause();
      } catch (error) {
        console.warn("Error pausing video:", error.message);
      }
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  const renderMediaItem = useCallback(() => {
    if (!selectedPost || !selectedPost.media || !selectedPost.media[currentIndex]) {
      return (
        <View style={styles.fallbackContainer}>
          <Text style={styles.errorText}>No media available</Text>
        </View>
      );
    }

    const media = selectedPost.media[currentIndex];
    const fullUrl = getFullUrl(media.url);
    const isVideo = isVideoFile(media);

    if (isVideo) {
      return (
        <LinearGradient
          colors={["rgba(0, 0, 0, 0.7)", "rgba(0, 0, 0, 0.9)"]}
          style={[styles.mediaContainer, isFullscreen && styles.fullscreenMedia]}
        >
          {isVideoLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.loadingText}>Loading video...</Text>
            </View>
          ) : videoError ? (
            <View style={styles.fallbackContainer}>
              <Text style={styles.errorText}>{videoError}</Text>
            </View>
          ) : (
            <VideoView
              style={[styles.videoView, isFullscreen && styles.fullscreenVideo]}
              player={player}
              contentFit="cover"
              allowsFullscreen={true}
              allowsPictureInPicture={false}
              nativeControls={true}
              onError={(error) => {
                console.error("VideoView error:", fullUrl, error);
                setVideoError("Video playback failed");
              }}
            />
          )}
        </LinearGradient>
      );
    }

    const imageItems = selectedPost.media.filter((item) => !isVideoFile(item));
    const imageUrls = imageItems.map((item) => ({ url: getFullUrl(item.url) }));
    const currentImageIndex = imageItems.findIndex((item) => getFullUrl(item.url) === fullUrl);

    if (imageUrls.length === 0) {
      return (
        <View style={styles.fallbackContainer}>
          <Text style={styles.errorText}>No images available</Text>
        </View>
      );
    }

    return (
      <LinearGradient
        colors={["rgba(0, 0, 0, 0.7)", "rgba(0, 0, 0, 0.9)"]}
        style={[styles.imageViewerContainer, isFullscreen && styles.fullscreenImage]}
      >
        <CustomImageViewer
          imageUrls={imageUrls}
          index={currentImageIndex >= 0 ? currentImageIndex : 0}
          onChange={(index) => setCurrentIndex(selectedPost.media.indexOf(imageItems[index]))}
          isFullscreen={isFullscreen}
        />
      </LinearGradient>
    );
  }, [selectedPost, currentIndex, isFullscreen, isVideoFile]);

  const handleMediaClick = useCallback((post) => {
    if (post && post.media && post.media.length > 0) {
      setSelectedPost(post);
      setCurrentIndex(0);
      setIsFullscreen(true);
    }
  }, []);

  const handleCloseModal = useCallback(() => {
    pausePlayer();
    setSelectedPost(null);
    setCurrentIndex(0);
    setIsVideoLoading(false);
    setVideoError(null);
    setIsFullscreen(true);
  }, [pausePlayer]);

  const handleNextMedia = useCallback(() => {
    if (selectedPost && selectedPost.media) {
      const nextIndex = (currentIndex + 1) % selectedPost.media.length;
      setCurrentIndex(nextIndex);
    }
  }, [selectedPost, currentIndex]);

  const handlePrevMedia = useCallback(() => {
    if (selectedPost && selectedPost.media) {
      const prevIndex = (currentIndex - 1 + selectedPost.media.length) % selectedPost.media.length;
      setCurrentIndex(prevIndex);
    }
  }, [selectedPost, currentIndex]);

  const renderPostItem = useCallback(
    ({ item }) => {
      const firstMedia = item.media && item.media.length > 0 ? item.media[0] : null;
      const isVideo = firstMedia ? isVideoFile(firstMedia) : false;
      const isNew = isRecentPost(item.created_at);

      return (
        <Animated.View entering={FadeInDown.duration(300)} style={styles.postItem}>
          <TouchableOpacity 
            onPress={() => handleMediaClick(item)} 
            activeOpacity={0.8}
            style={styles.thumbnailWrapper}
          >
            <LinearGradient
              colors={["#ffffff", "#f8fafc"]}
              style={styles.thumbnailContainer}
            >
              {firstMedia ? (
                <>
                  <Thumbnail media={firstMedia} isVideo={isVideo} />
                  {isNew && (
                    <LinearGradient
                      colors={["#f39c12", "#e67e22"]}
                      style={styles.newBadge}
                    >
                      <Text style={styles.newBadgeText}>New</Text>
                    </LinearGradient>
                  )}
                  {isVideo && (
                    <View style={styles.playIconOverlay}>
                      <Ionicons name="play-circle" size={40} color="white" />
                    </View>
                  )}
                  {item.media.length > 1 && (
                    <View style={styles.multiMediaIndicator}>
                      <Ionicons name="images-outline" size={20} color="#fff" />
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.fallbackContainer}>
                  <Text style={styles.errorText}>No media</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.shopInfoContainer}
            onPress={() => {
              router.push({
                pathname: '/shop/shop-page',
                params: { shopId: item.shop_id },
              });
            }}
          >
            <View style={styles.shopInfo}>
              <Text style={styles.shopName} numberOfLines={1}>
                {item.shop_name}
              </Text>
              <Text style={styles.createdAt}>{item.created_at}</Text>
              {params.type === "nearby" && item.distance != null && (
                <Text style={styles.distance}>
                  {(item.distance / 1000).toFixed(1)} km away
                </Text>
              )}
            </View>
            <Text 
              style={styles.description} 
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {item.description}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      );
    },
    [params.type, isVideoFile, handleMediaClick, router]
  );

  const fetchMorePosts = useCallback(async () => {
    if (!loading && hasMore && isMountedRef.current) {
      try {
        setLoading(true);
        const userId = await AsyncStorage.getItem("user_id");
        if (!userId) {
          console.warn("No user_id found in AsyncStorage");
          return;
        }

        const response = await api.get(
          `/shop-posts/?user_id=${userId}&page=${page}&page_size=20`
        );
        const newPosts = response.data[params.type === "followed" ? "followed_posts" : "nearby_posts"] || [];
        const transformPosts = Array.isArray(newPosts)
          ? newPosts.map((post, index) => ({
              id: post?.id != null ? post.id.toString() : `api-post-${index}-${Date.now()}`,
              shop_name: post?.shop_name || "Unknown Shop",
              created_at: post?.created_at || "No date",
              description: post?.description || "No description",
              media: Array.isArray(post?.media)
                ? post.media.map((item) => ({
                    url: item?.url || "",
                    thumbnail_url: item?.thumbnail_url || "",
                    type: item?.type || "image",
                  }))
                : [],
              shop_id: post?.shop_id ?? null,
              shop_image: post?.shop_image || null,
              distance: post?.distance ?? null,
            }))
          : [];
        if (__DEV__) console.log("Fetched more posts:", transformPosts);
        if (isMountedRef.current) {
          setPosts((prev) => [...prev, ...transformPosts]);
          setPage((prev) => prev + 1);
          setHasMore(newPosts.length >= 20);
        }
      } catch (error) {
        console.error("Error fetching more posts:", error);
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    }
  }, [loading, hasMore, page, params.type]);

  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      const userId = await AsyncStorage.getItem("user_id");
      if (!userId) {
        console.warn("No user_id found in AsyncStorage");
        return;
      }

      const response = await api.get(
        `/shop-posts/?user_id=${userId}&page=1&page_size=20`
      );
      const newPosts = response.data[params.type === "followed" ? "followed_posts" : "nearby_posts"] || [];
      const transformPosts = Array.isArray(newPosts)
        ? newPosts.map((post, index) => ({
            id: post?.id != null ? post.id.toString() : `api-post-${index}-${Date.now()}`,
            shop_name: post?.shop_name || "Unknown Shop",
            created_at: post?.created_at || "No date",
            description: post?.description || "No description",
            media: Array.isArray(post?.media)
              ? post.media.map((item) => ({
                  url: item?.url || "",
                  thumbnail_url: item?.thumbnail_url || "",
                  type: item?.type || "image",
                }))
              : [],
            shop_id: post?.shop_id ?? null,
            shop_image: post?.shop_image || null,
            distance: post?.distance ?? null,
          }))
        : [];
      if (__DEV__) console.log("Refreshed posts:", transformPosts);
      if (isMountedRef.current) {
        setPosts(transformPosts);
        setPage(2);
        setHasMore(newPosts.length >= 20);
      }
    } catch (error) {
      console.error("Error refreshing posts:", error);
    } finally {
      if (isMountedRef.current) {
        setRefreshing(false);
      }
    }
  }, [params.type]);

  const keyExtractor = useCallback((item, index) => item.id?.toString() || `post-${index}-${Date.now()}`, []);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <LinearGradient
        colors={["#F5F7FA", "#D6E4FF"]}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <StatusBar barStyle="light-content" backgroundColor="#2563EB" translucent={true} />
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.navigate("(tabs)/myshop")}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {params.type === "followed" ? "Followed Posts" : "Nearby Posts"}
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        {posts.length === 0 && !loading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No posts available</Text>
          </View>
        ) : (
          <FlatList
            data={posts}
            keyExtractor={keyExtractor}
            numColumns={2}
            renderItem={renderPostItem}
            contentContainerStyle={styles.flatListContent}
            onEndReached={fetchMorePosts}
            onEndReachedThreshold={0.5}
            ListFooterComponent={loading && <ActivityIndicator size="large" color="#25D366" />}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={["#25D366"]}
                progressBackgroundColor="#fff"
              />
            }
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
          />
        )}
        {selectedPost && (
          <Modal visible={true} transparent={true} animationType="fade">
            <SafeAreaView style={[styles.modalContainer, isFullscreen && styles.fullscreenModal]}>
              <LinearGradient
                colors={["rgba(0, 0, 0, 0.7)", "rgba(0, 0, 0, 0.9)"]}
                style={styles.modalBackground}
              >
                <View style={styles.modalHeader}>
                  <TouchableOpacity style={styles.modalClose} onPress={handleCloseModal}>
                    <Ionicons name="close" size={28} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.fullscreenButton} onPress={toggleFullscreen}>
                    <Ionicons
                      name={isFullscreen ? "contract-outline" : "expand-outline"}
                      size={24}
                      color="#fff"
                    />
                  </TouchableOpacity>
                </View>
                {renderMediaItem()}
                <View style={styles.controlsContainer}>
                  <Text style={styles.descriptionText}>{selectedPost.description}</Text>
                  {selectedPost.media && selectedPost.media.length > 1 && (
                    <View style={styles.slideControls}>
                      <TouchableOpacity style={styles.navButton} onPress={handlePrevMedia}>
                        <Ionicons name="chevron-back" size={24} color="#fff" />
                      </TouchableOpacity>
                      <Text style={styles.slideIndicator}>
                        {`${currentIndex + 1} / ${selectedPost.media.length}`}
                      </Text>
                      <TouchableOpacity style={styles.navButton} onPress={handleNextMedia}>
                        <Ionicons name="chevron-forward" size={24} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </LinearGradient>
            </SafeAreaView>
          </Modal>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: "#3A7BD5",
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
    marginTop: StatusBar.currentHeight || 0,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
    flex: 1,
    letterSpacing: 0.3,
    fontFamily: "System",
  },
  headerSpacer: {
    width: 40,
  },
  flatListContent: {
    paddingHorizontal: 8,
    paddingBottom: 120,
  },
  postItem: {
    width: SCREEN_WIDTH * 0.44,
    margin: 7,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    backgroundColor: "#fff",
  },
  thumbnailWrapper: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
  },
  thumbnailContainer: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  thumbnail: {
    width: "100%",
    height: 140,
    backgroundColor: "#e0e0e0",
  },
  newBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  newBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  shopInfoContainer: {
    paddingTop: 8,
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: "#fff",
    minHeight: 100,
  },
  shopInfo: {
    flexDirection: "column",
  },
  shopName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    fontFamily: "System",
  },
  createdAt: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    fontFamily: "System",
  },
  distance: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    fontFamily: "System",
  },
  description: {
    fontSize: 13,
    color: "#34495e",
    lineHeight: 18,
    marginTop: 8,
    maxHeight: 36,
    fontFamily: "System",
  },
  multiMediaIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 12,
    padding: 6,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenModal: {
    padding: 0,
    margin: 0,
  },
  modalBackground: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalHeader: {
    position: "absolute",
    top: 20,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  modalClose: {
    padding: 12,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 20,
  },
  fullscreenButton: {
    padding: 12,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 20,
  },
  mediaContainer: {
    width: SCREEN_WIDTH * 0.95,
    height: SCREEN_HEIGHT * 0.7,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e8ecef",
  },
  fullscreenMedia: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    borderRadius: 0,
    borderWidth: 0,
  },
  imageViewerContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.75,
  },
  fullscreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  imageViewer: {
    width: "100%",
    height: "100%",
  },
  fullscreenImageViewer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  videoView: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  fullscreenVideo: {
    borderRadius: 0,
  },
  controlsContainer: {
    position: "absolute",
    bottom: 30,
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  slideControls: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  navButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  slideIndicator: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginHorizontal: 12,
  },
  descriptionText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: 20,
    fontWeight: "500",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 10,
    paddingVertical: 10,
    fontFamily: "System",
  },
  fallbackContainer: {
    width: "100%",
    height: 140,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e0e0e0",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    fontStyle: "italic",
    fontWeight: "500",
    textAlign: "center",
    fontFamily: "System",
  },
  errorText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "500",
    fontFamily: "System",
  },
  loadingContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 12,
    position: "absolute",
    zIndex: 10,
  },
  loadingText: {
    color: "#fff",
    fontSize: 16,
    marginTop: 12,
    fontFamily: "System",
  },
  playIconOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -20 }, { translateY: -20 }],
    opacity: 0.8,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 20,
    padding: 8,
  },
});

export default ShopPostsScreen;