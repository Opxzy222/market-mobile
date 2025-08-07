import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
} from "react-native";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import ImageViewer from "react-native-image-zoom-viewer";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const getFullUrl = (url) => {
  const BASE_URL = "https://retail-alvinia-goza-f6a0e4f7.koyeb.app";
  return url && url.startsWith("http") ? url : `${BASE_URL}${url || ""}`;
};

const isRecentPost = (createdAt) => {
  if (!createdAt) return false;
  const postTime = new Date(createdAt);
  const currentTime = new Date();
  const hoursDifference = (currentTime - postTime) / (1000 * 60 * 60);
  return hoursDifference < 3;
};

const ShopPostsFeed = ({ posts, showDistance = false, onSeeMore, hasMore, regenerateMediaUrl, onThumbnailError }) => {
  const [selectedPost, setSelectedPost] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(true);

  const playerRef = useRef(null);

  // Initialize useVideoPlayer at the top level with an empty URI
  const player = useVideoPlayer({ uri: "" }, (p) => {
    playerRef.current = p;
    p.loop = false;
  });

  const isVideoFile = (media) => {
    if (!media || !media.url) return false;
    return media.type === "video";
  };

  useEffect(() => {
    if (selectedPost && selectedPost.media && selectedPost.media[currentIndex]) {
      const media = selectedPost.media[currentIndex];
      const fullUrl = getFullUrl(media.url);
      const isVideo = isVideoFile(media);

      if (isVideo) {
        const loadVideo = async () => {
          try {
            setIsVideoLoading(true);
            setVideoError(null);
            if (playerRef.current && playerRef.current.source?.uri !== fullUrl) {
              await playerRef.current.replaceAsync({ uri: fullUrl });
            }
            playerRef.current.play();
            setIsVideoLoading(false);
          } catch (error) {
            console.error("Video load error:", fullUrl, error.message);
            setVideoError("Failed to load video");
            setIsVideoLoading(false);
          }
        };
        loadVideo();
      }
    }

    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.pause?.();
        } catch (error) {
          console.warn("Error pausing video during cleanup:", error.message);
        }
      }
    };
  }, [selectedPost, currentIndex]);

  const pausePlayer = () => {
    if (playerRef.current && typeof playerRef.current.pause === "function") {
      try {
        playerRef.current.pause();
      } catch (error) {
        console.warn("Error pausing video:", error.message);
      }
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const renderThumbnail = (media, post) => {
    let thumbnailUri;
    if (isVideoFile(media) && media.thumbnail_url) {
      thumbnailUri = getFullUrl(media.thumbnail_url);
    } else {
      thumbnailUri = getFullUrl(media.url);
    }
    if (thumbnailUri) {
      return (
        <Image
          source={{ uri: thumbnailUri }}
          style={styles.thumbnail}
          contentFit="cover"
          cachePolicy="memory-disk"
          onError={(e) => {
            console.error("Thumbnail load error:", thumbnailUri, e.error);
            if (onThumbnailError && post) {
              onThumbnailError(post.id, post.shop_id, post.media.indexOf(media));
            }
          }}
        />
      );
    }
    return (
      <View style={styles.fallbackContainer}>
        <Ionicons name={isVideoFile(media) ? "videocam-outline" : "image-outline"} size={40} color="#888" />
        <Text style={styles.errorText}>No thumbnail available</Text>
      </View>
    );
  };

  const renderMediaItem = () => {
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
    const imageUrls = imageItems.map((item) => ({
      url: getFullUrl(item.url),
    }));
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
        <ImageViewer
          imageUrls={imageUrls}
          index={currentImageIndex >= 0 ? currentImageIndex : 0}
          onChange={(index) => {
            setCurrentIndex(selectedPost.media.indexOf(imageItems[index]));
          }}
          saveToLocalByLongPress={true}
          backgroundColor="transparent"
          renderIndicator={() => null}
          style={[styles.imageViewer, isFullscreen && styles.fullscreenImageViewer]}
        />
      </LinearGradient>
    );
  };

  const handleMediaClick = (post) => {
    if (post && post.media && post.media.length > 0) {
      setSelectedPost(post);
      setCurrentIndex(0);
      setIsFullscreen(true);
    }
  };

  const handleCloseModal = () => {
    pausePlayer();
    setSelectedPost(null);
    setCurrentIndex(0);
    setIsVideoLoading(false);
    setVideoError(null);
    setIsFullscreen(true);
  };

  const handleNextMedia = () => {
    if (selectedPost && selectedPost.media) {
      const nextIndex = (currentIndex + 1) % selectedPost.media.length;
      setCurrentIndex(nextIndex);
    }
  };

  const handlePrevMedia = () => {
    if (selectedPost && selectedPost.media) {
      const prevIndex = (currentIndex - 1 + selectedPost.media.length) % selectedPost.media.length;
      setCurrentIndex(prevIndex);
    }
  };

  const renderPostItem = ({ item }) => {
    const firstMedia = item.media && item.media.length > 0 ? item.media[0] : null;
    const isVideo = firstMedia ? isVideoFile(firstMedia) : false;
    const isNew = isRecentPost(item.created_at);

    return (
      <Animated.View entering={FadeInDown.duration(300)} style={styles.postItem}>
        <TouchableOpacity onPress={() => handleMediaClick(item)} activeOpacity={0.8}>
          <LinearGradient
            colors={["#ffffff", "#f8fafc"]}
            style={styles.thumbnailContainer}
          >
            {firstMedia ? (
              <>
                {renderThumbnail(firstMedia, item)}
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
          <View style={styles.shopInfo}>
            <View>
              <Text style={styles.shopName} numberOfLines={1}>
                {item.shop_name}
              </Text>
              <Text style={styles.createdAt}>{item.created_at}</Text>
              {showDistance && item.distance && (
                <Text style={styles.distance}>
                  {(item.distance / 1000).toFixed(1)} km away
                </Text>
              )}
            </View>
          </View>
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={posts.slice(0, 4)}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        scrollEnabled={false}
        renderItem={renderPostItem}
        contentContainerStyle={styles.flatListContent}
      />

      {selectedPost && (
        <Modal visible={true} transparent={true} animationType="fade">
          <SafeAreaView style={[styles.modalContainer, isFullscreen && styles.fullscreenModal]}>
            <LinearGradient
              colors={["rgba(0, 0, 0, 0.7)", "rgba(0, 0, 0, 0.95)"]}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "transparent",
  },
  flatListContent: {
    paddingBottom: 10,
  },
  postItem: {
    width: (SCREEN_WIDTH - 45) / 2,
    margin: 6,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    right: 7,
  },
  thumbnailContainer: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
  },
  thumbnail: {
    width: "100%",
    height: 120,
    backgroundColor: "#e0e0e0",
  },
  newBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  newBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  shopInfo: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingTop: 8,
    backgroundColor: "#fff",
  },
  shopName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50",
  },
  createdAt: {
    fontSize: 12,
    color: "#7f8c8d",
    marginTop: 4,
  },
  distance: {
    fontSize: 12,
    color: "#7f8c8d",
    marginTop: 4,
  },
  description: {
    fontSize: 13,
    color: "#34495e",
    paddingHorizontal: 10,
    paddingBottom: 10,
    lineHeight: 18,
    backgroundColor: "#fff",
  },
  multiMediaIndicator: {
    position: "absolute",
    top: 10,
    right: 10,
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
    paddingVertical: 10,
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
  },
  fallbackContainer: {
    width: "100%",
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e0e0e0",
    borderRadius: 12,
  },
  errorText: {
    color: "#7f8c8d",
    fontSize: 14,
    fontWeight: "500",
  },
  loadingText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    marginTop: 12,
  },
  loadingContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 12,
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

export default ShopPostsFeed;