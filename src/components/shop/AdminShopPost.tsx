import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Alert,
} from "react-native";
import { Image } from "expo-image"; // Use expo-image for consistency
import { useVideoPlayer, VideoView } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context"; // Added for better layout control
import api from '../../api';

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const getFullUrl = (url) => {
  const BASE_URL = "";
  return url && url.startsWith("http") ? url : `${BASE_URL}${url || ""}`;
};

// Thumbnail Component
const Thumbnail = ({ media, isVideo }) => {
  const [isThumbnailLoading, setIsThumbnailLoading] = useState(true);
  const thumbnailUri = media && media.thumbnail_url ? getFullUrl(media.thumbnail_url) : getFullUrl(media?.url);

  if (!media || !media.url) {
    return (
      <View style={styles.fallbackContainer}>
        <Ionicons name={isVideo ? "videocam-outline" : "image-outline"} size={40} color="#888" />
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

// Add onPostDeleted to the props type
const AdminShopPosts = ({ posts, shopId, onPostDeleted }) => {
  const [selectedPost, setSelectedPost] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const playerRef = useRef(null);
  const timeoutRef = useRef(null);

  const player = useVideoPlayer(null, (p) => {
    playerRef.current = p;
    p.loop = false;
  });

  // Sort posts by created_at in descending order (most recent first)
  const sortedPosts = [...posts].sort((a, b) => {
    const dateA = new Date(a.created_at || 0);
    const dateB = new Date(b.created_at || 0);
    return dateB - dateA; // Descending order
  });

  console.log("AdminShopPosts Sorted Posts:", JSON.stringify(sortedPosts, null, 2));

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
            console.log("Video loaded:", fullUrl);
          } catch (error) {
            console.error("Video load error:", fullUrl, error.message, error.stack);
            setIsVideoLoading(false);
            setVideoError("Failed to load video");
          }
        };
        loadVideo();
      } else {
        // Handle image loading
        setIsImageLoading(true);
        // Short timeout for cached images
        timeoutRef.current = setTimeout(() => {
          setIsImageLoading(false);
        }, 100);
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
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [selectedPost, currentIndex]);

  const pausePlayer = () => {
    if (playerRef.current && typeof playerRef.current.pause === "function") {
      try {
        playerRef.current.pause();
        console.log("Player paused");
      } catch (error) {
        console.error("Pause error:", error.message);
      }
    }
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
          <>
            {isImageLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.loadingText}>Loading image...</Text>
              </View>
            )}
            <Image
              source={{ uri: fullUrl }}
              style={[styles.media, isImageLoading && { opacity: 0 }]}
              contentFit="contain"
              cachePolicy="memory-disk"
              onLoadStart={() => setIsImageLoading(true)}
              onLoad={() => {
                setIsImageLoading(false);
                if (timeoutRef.current) {
                  clearTimeout(timeoutRef.current);
                }
              }}
              onError={(e) => {
                console.error("Image load error:", fullUrl, e.error);
                setIsImageLoading(false);
                if (timeoutRef.current) {
                  clearTimeout(timeoutRef.current);
                }
              }}
            />
          </>
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
    setIsImageLoading(false);
    setVideoError(null);
  };

  const handleNextMedia = () => {
    if (selectedPost && selectedPost.media) {
      const nextIndex = (currentIndex + 1) % selectedPost.media.length;
      setCurrentIndex(nextIndex);
    }
  };

  useEffect(() => {
    const fetchSessionId = async () => {
      try {
        const sessionIdString = await AsyncStorage.getItem("sessionToken");
        setSessionId(sessionIdString);
        console.log("Fetched sessionId:", sessionIdString ? "Set" : "Not found");
      } catch (error) {
        console.error("Error fetching session ID:", error);
        Alert.alert("Error", "Failed to retrieve authentication token. Please log in again.");
      }
    };
    fetchSessionId();
  }, []);

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
              const response = await api.delete(
                `/shops/${shopId}/posts/${postId}/`,
                {
                  timeout: 3000,
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: sessionId,
                  },
                }
              );
              console.log("Delete response:", response.status, response.data);
              Alert.alert("Success", "Post deleted successfully");
              onPostDeleted(postId);
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
      {sortedPosts && sortedPosts.length > 0 ? (
        <FlatList
          data={sortedPosts}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          renderItem={({ item }) => {
            const firstMedia = item.media && item.media.length > 0 ? item.media[0] : null;
            const isVideo = firstMedia ? isVideoFile(firstMedia) : false;

            return (
              <TouchableOpacity style={styles.postItem} onPress={() => handleImageClick(item)}>
                {firstMedia ? (
                  <View>
                    <Thumbnail media={firstMedia} isVideo={isVideo} />
                    {isVideo && (
                      <View style={styles.playIconOverlay}>
                        <Ionicons name="play-circle" size={40} color="white" />
                      </View>
                    )}
                  </View>
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
          <SafeAreaView style={styles.modalContainer}>
            <TouchableOpacity style={styles.modalClose} onPress={handleCloseModal}>
              <Text style={styles.closeText}>×</Text>
            </TouchableOpacity>

            <View style={styles.mediaWrapper}>
              {renderMediaItem()}
              <Text style={styles.descriptionText}>{selectedPost.description}</Text>
            </View>

            <View style={styles.controlsContainer}>
              <View style={styles.slideControls}>
                <Text style={styles.slideIndicator}>
                  {`${currentIndex + 1} / ${selectedPost.media.length}`}
                </Text>
                <TouchableOpacity style={styles.slideButton} onPress={handleNextMedia}>
                  <Text style={styles.slideText}>Next</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.buttonContainer}>
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
            </View>
          </SafeAreaView>
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
    width: (SCREEN_WIDTH - 80) / 2,
    margin: 5,
    aspectRatio: 1,
  },
  thumbnailContainer: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
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
  mediaWrapper: {
    flex: 1, // Take up available space
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  mediaContainer: {
    width: "100%",
    aspectRatio: 3 / 4, // Maintain aspect ratio for media
    borderRadius: 10,
    overflow: "hidden", // Prevent content from spilling out
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
    flex: 1,
    marginLeft: 5,
    padding: 10,
    backgroundColor: "#dc3545",
    borderRadius: 5,
    alignItems: "center",
  },
  deleteText: {
    color: "#fff",
    fontSize: 16,
  },
  closeViewButton: {
    flex: 1,
    marginRight: 5,
    padding: 10,
    backgroundColor: "#6c757d",
    borderRadius: 5,
    alignItems: "center",
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
    position: "absolute",
    zIndex: 10,
  },
  controlsContainer: {
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 10,
  },
});

export default AdminShopPosts;