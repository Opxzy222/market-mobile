import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
} from "react-native";
import { Video } from "expo-av";
import Carousel from "react-native-reanimated-carousel";
import axios from "axios";

const { width } = Dimensions.get("window");

const ShopPosts = ({ posts, shopId }) => {
  const [selectedPost, setSelectedPost] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  console.log('err', posts)


  const handleImageClick = (post) => {
    setSelectedPost(post);
    setCurrentIndex(0);
  };

  const handleCloseModal = () => {
    setSelectedPost(null);
    setCurrentIndex(0);
  };

  const handleSlide = () => {
    if (selectedPost) {
      const nextIndex = (currentIndex + 1) % selectedPost.media.length;
      setCurrentIndex(nextIndex);
    }
  };

  const renderMediaItem = () => {
    const media = selectedPost.media[currentIndex];
    const isVideo = media.url.endsWith(".mp4") || media.url.endsWith(".mov");

    if (isVideo) {
      return (
        <Video
          source={{ uri: `https://127.0.0.1:8000${media.url}` }}
          style={styles.media}
          resizeMode="cover"
          useNativeControls
        />
      );
    }

    return (
      <Image
        source={{ uri: `https://127.0.0.1:8000${media.url}` }}
        style={styles.media}
        resizeMode="cover"
      />
    );
  };

  return (
    <View style={styles.container}>
      {posts && posts.length > 0 ? (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.postItem}
              onPress={() => handleImageClick(item)}
            >
              {item.media && item.media.length > 0 ? (
                <Image
                  source={{
                    uri: `https://127.0.0.1:8000${item.media[0].url}`,
                  }}
                  style={styles.thumbnail}
                  resizeMode="cover"
                />
              ) : (
                <Text>No image available</Text>
              )}
            </TouchableOpacity>
          )}
        />
      ) : (
        <Text style={styles.noPostsText}>No posts available</Text>
      )}

      {selectedPost && (
        <Modal visible={true} transparent={true} animationType="fade">
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={handleCloseModal}
            >
              <Text style={styles.closeText}>&times;</Text>
            </TouchableOpacity>

            {renderMediaItem()}
            <Text style={styles.descriptionText}>{selectedPost.description}</Text>

            <View style={styles.slideControls}>
              <Text style={styles.slideIndicator}>
                {`${currentIndex + 1} / ${selectedPost.media.length}`}
              </Text>

              <TouchableOpacity
                style={styles.slideButton}
                onPress={handleSlide}
              >
                <Text style={styles.slideText}>Slide</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.closeViewButton}
              onPress={handleCloseModal}
            >
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
  media: {
    width: width,
    height: width,
    borderRadius: 8,
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
