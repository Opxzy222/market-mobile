// src/components/shop/AdminShopPosts.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const getFullUrl = (url) => {
  const BASE_URL = "https://retail-alvinia-goza-f6a0e4f7.koyeb.app";
  return url && url.startsWith("http") ? url : `${BASE_URL}${url || ""}`;
};

const AdminShopPosts = ({ posts, shopId }) => {
  const [selectedPost, setSelectedPost] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const playerRef = useRef(null);

  const player = useVideoPlayer(null, (p) => {
    playerRef.current = p;
    p.loop = false;
  });

  console.log("AdminShopPosts Posts:", JSON.stringify(posts, null, 2));

  const isVideoFile = (media) => {
    if (!media || !media.url) return false;
    if (media.type) return media.type === "video";
    const extension = media.url.toLowerCase().split(".").pop();
    return ["mp4", "mov", "avi", "mkv"].includes(extension);
  };

  useEffect(() => {
    if (selectedPost && selectedPost.media && selectedPost.media[currentIndex]) {
      const media = selectedPost.media[currentIndex];
      const fullUrl = getFullUrl(media.url);
      const isVideo = isVideoFile(media);

      if (isVideo && playerRef.current) {
        const loadVideo = async () => {
          try {
            console.log("Loading video:", fullUrl);
            setIsVideoLoading(true);
            setVideoError(null);
            await playerRef.current.replaceAsync({ uri: fullUrl });
            setIsVideoLoading(false);
            playerRef.current.play();
            console.log('Video loaded:', fullUrl);
          } catch (error) {
            console.error("Video load error:", fullUrl, error.message, error.stack);
            setIsVideoLoading(false);
            setVideoError("Failed to load video");
          }
        };
        loadVideo();
      }
    }
  }, [selectedPost, currentIndex]);

  const pausePlayer = () => {
    if (playerRef.current && typeof playerRef.current.pause === 'function') {
      try {
        playerRef.current.pause();
        console.log('Player paused');
      } catch (error) {
        console.error('Pause error:', error.message);
      }
    }
  };

  const renderThumbnail = (media) => {
    const thumbnailUri = media && media.thumbnail_url ? getFullUrl(media.thumbnail_url) : null;

    if (thumbnailUri) {
      return (
        <Image
          source={{ uri: thumbnailUri }}
          style={styles.thumbnail}
          resizeMode="cover"
          onError={(e) => console.error("Thumbnail load error:", thumbnailUri, e.nativeEvent.error)}
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
    if (!selectedPost || !selectedPost?.media || !selectedPost.media[currentIndex]) {
      return (
        <View style={styles.fallbackContainer}>
          <Text style={styles.errorText}>No media available</Text>
        </View>
      );
    }

    const media = selectedPost.media[currentIndex];
    const fullUrl = getFullUrl(media.url);
    const isVideo = isVideoFile(media);

    return (
      <View style={styles.mediaContainer}>
        {isVideo ? (
          <>
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
                style={styles.videoView}
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
          </>
        ) : (
          <Image
            source={{ uri: fullUrl }}
            style={styles.media}
            resizeMode="contain"
            onError={(e) => console.error("Image load error:", fullUrl, e.nativeEvent.error)}
          />
        )}
      </View>
    );
  };

  const handleImageClick = (post) => {
    if (post && post.media && post.media.length > 0) {
      setSelectedPost(post);
      setCurrentIndex(0);
    }
  };

  const handleCloseModal = () => {
    pausePlayer();
    setSelectedPost(null);
    setCurrentIndex(0);
    setIsVideoLoading(false);
    setVideoError(null);
  };

  const handleNextMedia = () => {
    if (selectedPost && selectedPost.media) {
      const nextIndex = (currentIndex + 1) % selectedPost.media.length;
      setCurrentIndex(nextIndex);
    }
};

  const handleDelete = async (postId) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this post? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await axios.delete(
                `https://retail-alvinia-goza-f6a0e4f7.koyeb.app/shops/${shopId}/posts/${postId}/`
              );
              console.log("Delete response:", response.status, response.data);
              Alert.alert("Success", "Post deleted successfully");
              handleCloseModal();
            } catch (error) {
              console.error("Delete error:", error.message, error.response?.status, error.response?.data);
              Alert.alert("Error", "Failed to delete post. Please try again.");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {posts && posts.length > 0 ? (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          renderItem={({ item }) => {
            const firstMedia = item.media && item.media.length > 0 ? item.media[0] : null;
            const isVideo = firstMedia ? isVideoFile(firstMedia) : false;

            return (
              <TouchableOpacity
                style={styles.postItem}
                onPress={() => handleImageClick(item)}
              >
                {firstMedia ? (
                  isVideo ? (
                    <View>
                      {renderThumbnail(firstMedia)}
                      <View style={styles.playIconOverlay}>
                        <Ionicons name="play-circle" size={40} color="white" />
                      </View>
                    </View>
                  ) : (
                    <Image
                      source={{ uri: getFullUrl(firstMedia.url) }}
                      style={styles.thumbnail}
                      resizeMode="cover"
                      onError={(e) => console.error("Post image error:", firstMedia.url, e.nativeEvent.error)}
                    />
                  )
                ) : (
                  <View style={styles.fallbackContainer}>
                    <Text style={styles.errorText}>No media available</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.flatListContent}
        />
      ) : (
        <Text style={styles.noPostsText}>No posts available</Text>
      )}

      {selectedPost && (
        <Modal visible={true} transparent={true} animationType="fade">
          <View style={styles.modalContainer}>
            <TouchableOpacity style={styles.modalClose} onPress={handleCloseModal}>
              <Text style={styles.closeText}>×</Text>
            </TouchableOpacity>

            {renderMediaItem()}
            <Text style={styles.descriptionText}>{selectedPost.description}</Text>

            <View style={styles.slideControls}>
              <Text style={styles.slideIndicator}>
                {`${currentIndex + 1} / ${selectedPost.media.length}`}
              </Text>
              <TouchableOpacity style={styles.slideButton} onPress={handleNextMedia}>
                <Text style={styles.slideText}>Next</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.closeViewButton} onPress={handleCloseModal}>
              <Text style={styles.closeViewText}>Close View</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDelete(selectedPost.id)}
            >
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    padding: 10,
  },
  flatListContent: {
    paddingHorizontal: 5,
  },
  postItem: {
    width: (SCREEN_WIDTH - 30) / 2,
    margin: 5,
    aspectRatio: 1,
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalClose: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
  },
  closeText: {
    fontSize: 30,
    color: "#fff",
  },
  mediaContainer: {
    position: "relative",
    width: 300,
    height: 400,
    borderRadius: 10,
  },
  media: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  videoView: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  slideControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
  },
  slideIndicator: {
    color: "#fff",
    fontSize: 16,
    marginRight: 10,
  },
  slideButton: {
    padding: 10,
    backgroundColor: "#007bff",
    borderRadius: 5,
  },
  slideText: {
    color: "#fff",
    fontSize: 16,
  },
  deleteButton: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#dc3545",
    borderRadius: 5,
  },
  deleteText: {
    color: "#fff",
    fontSize: 16,
  },
  closeViewButton: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#6c757d",
    borderRadius: 5,
  },
  closeViewText: {
    color: "#fff",
    fontSize: 16,
  },
  descriptionText: {
    color: "#fff",
    fontSize: 16,
    marginTop: 20,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  noPostsText: {
    textAlign: "center",
    fontSize: 18,
    color: "#888",
    marginTop: 20,
  },
  playIconOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -20 }, { translateY: -20 }],
    opacity: 0.8,
  },
  fallbackContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#eee",
    borderRadius: 8,
  },
  errorText: {
    color: "#888",
    fontSize: 14,
    marginTop: 5,
  },
  loadingText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    marginTop: 10,
  },
  loadingContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 10,
  },
});

export default AdminShopPosts;