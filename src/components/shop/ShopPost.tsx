import { useEffect, useState } from "react";
import { View, Text, FlatList, Image, TouchableOpacity, Modal, StyleSheet, Button } from "react-native";
import * as VideoThumbnails from "expo-video-thumbnails";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEvent } from "expo";

const getFullUrl = (url) => {
  const BASE_URL = "https://retail-alvinia-goza-f6a0e4f7.koyeb.app"; // Replace with your local IP
  return `${BASE_URL}${url}`;
};

const ShopPosts = ({ posts }) => {
  const [selectedPost, setSelectedPost] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [thumbnails, setThumbnails] = useState({});
  const [thumbnailLoading, setThumbnailLoading] = useState({});

  useEffect(() => {
    posts.forEach((post) => {
      post.media.forEach((media) => {
        if (isVideoFile(media)) {
          generateVideoThumbnail(media.url);
        }
      });
    });
  }, [posts]);

  const handleMediaClick = (post) => {
    if (post && post.media.length > 0) {
      setSelectedPost(post);
      setCurrentIndex(0);
    }
  };

  const handleCloseModal = () => {
    setSelectedPost(null);
    setCurrentIndex(0);
  };

  const handleNextMedia = () => {
    if (selectedPost) {
      const nextIndex = (currentIndex + 1) % selectedPost.media.length;
      setCurrentIndex(nextIndex);
    }
  };

  const isVideoFile = (media) =>
    media.url &&
    (media.type?.includes("video") || media.url.match(/\.(mp4|mov|avi|mkv)$/i));

  const generateVideoThumbnail = async (url) => {
    if (!url || thumbnails[url]) return;

    setThumbnailLoading((prev) => ({ ...prev, [url]: true }));

    try {
      const videoUrl = getFullUrl(url);
      console.log("Generating thumbnail for:", videoUrl);

      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUrl, {
        time: 5000, // Try 5 seconds instead of 15
        quality: 0.8, // Higher quality
      });

      console.log("Thumbnail generated:", uri);
      setThumbnails((prev) => ({ ...prev, [url]: uri }));
    } catch (e) {
      console.error("Thumbnail generation failed:", e);
      setThumbnails((prev) => ({ ...prev, [url]: null }));
    } finally {
      setThumbnailLoading((prev) => ({ ...prev, [url]: false }));
    }
  };

  const VideoPlayerComponent = ({ url }) => {
    const player = useVideoPlayer(url, (player) => {
      player.loop = true;
      player.play();
    });

    const { isPlaying } = useEvent(player, "playingChange", { isPlaying: player.playing });

    return (
      <View style={styles.videoContainer}>
        <VideoView
          style={styles.media}
          player={player}
          allowsFullscreen
          allowsPictureInPicture
        />
        
      </View>
    );
  };

  const renderMediaItem = () => {
    const media = selectedPost.media[currentIndex];
    const fullUrl = getFullUrl(media.url);
    const isVideo = isVideoFile(media);

    return isVideo ? (
      <VideoPlayerComponent url={fullUrl} />
    ) : (
      <Image source={{ uri: fullUrl }} style={styles.media} resizeMode="cover" />
    );
  };

  return (
    <View style={styles.container}>
      {posts && posts.length > 0 ? (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          extraData={selectedPost}
          renderItem={({ item }) => {
            const firstMedia = item.media.length > 0 ? item.media[0] : null;
            const isVideo = firstMedia ? isVideoFile(firstMedia) : false;
            const thumbnailUri = thumbnails[firstMedia?.url];

            return (
              <TouchableOpacity
                style={styles.postItem}
                onPress={() => handleMediaClick(item)}
              >
                {firstMedia ? (
                  isVideo ? (
                    <View>
                      {thumbnailLoading[firstMedia.url] ? (
                        <Text>Loading...</Text>
                      ) : thumbnailUri ? (
                        <Image
                          source={{ uri: thumbnailUri }}
                          style={styles.thumbnail}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={styles.errorText}>Thumbnail not available</Text>
                      )}
                      <View style={styles.playIconOverlay}>
                        <Ionicons name="play-circle" size={40} color="white" />
                      </View>
                    </View>
                  ) : (
                    <Image
                      source={{ uri: getFullUrl(firstMedia.url) }}
                      style={styles.thumbnail}
                      resizeMode="cover"
                    />
                  )
                ) : (
                  <Text>No media available</Text>
                )}
              </TouchableOpacity>
            );
          }}
        />
      ) : (
        <Text style={styles.noPostsText}>No posts available</Text>
      )}

      {selectedPost && (
        <Modal visible={true} transparent={true} animationType="fade">
          <View style={styles.modalContainer}>
            <TouchableOpacity style={styles.modalClose} onPress={handleCloseModal}>
              <Text style={styles.closeText}>&times;</Text>
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
  postItem: {
    flex: 1,
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
  media: { width: 300, height: 400, borderRadius: 10 },
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
});

export default ShopPosts;
