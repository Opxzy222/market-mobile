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
import Video from "react-native-video";
import Carousel from "react-native-snap-carousel";

const { width } = Dimensions.get("window");

const ShopPosts = ({ posts }) => {
  const [selectedPost, setSelectedPost] = useState(null);

  const handleImageClick = (post) => {
    setSelectedPost(post);
  };

  const handleCloseModal = () => {
    setSelectedPost(null);
  };

  const renderMediaItem = ({ item }) => {
    if (item.type === "video") {
      return (
        <Video
          source={{ uri: `https://172.27.243.94:8000/${item.url}` }}
          style={styles.media}
          resizeMode="cover"
          controls
        />
      );
    } else {
      return (
        <Image
          source={{ uri: `https://172.27.243.94:8000/${item.url}` }}
          style={styles.media}
          resizeMode="cover"
        />
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Grid of Posts */}
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
                source={{ uri: `https://172.27.243.94:8000/${item.media[0].url}` }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
            ) : (
              <Text>No image available</Text>
            )}
          </TouchableOpacity>
        )}
      />

      {/* Modal for Viewing Selected Post */}
      {selectedPost && (
        <Modal visible={true} transparent={true} animationType="fade">
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={handleCloseModal}
            >
              <Text style={styles.closeText}>&times;</Text>
            </TouchableOpacity>

            <Carousel
              data={selectedPost.media}
              renderItem={renderMediaItem}
              sliderWidth={width}
              itemWidth={width}
              autoplay={true}
              loop={true}
            />

            {/* Post Description */}
            <Text style={styles.description}>{selectedPost.description}</Text>
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
    aspectRatio: 1, // Makes each grid square
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
  description: {
    color: "#fff",
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
    paddingHorizontal: 20,
  },
});

export default ShopPosts;
