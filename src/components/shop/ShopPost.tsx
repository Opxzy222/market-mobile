// src/components/shop/ShopPosts.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import ImageViewer from 'react-native-image-zoom-viewer';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const getFullUrl = (url) => {
  const BASE_URL = 'https://retail-alvinia-goza-f6a0e4f7.koyeb.app';
  return url && url.startsWith('http') ? url : `${BASE_URL}${url || ''}`;
};

const ShopPosts = ({ posts, scrollEnabled = false }) => {
  const [selectedPost, setSelectedPost] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(true); // Default to fullscreen

  const playerRef = useRef(null);
  const player = useVideoPlayer(null, (p) => {
    playerRef.current = p;
    p.loop = false;
  });

  const isVideoFile = (media) => {
    if (!media || !media.url) return false;
    if (media.type) return media.type === 'video';
    const extension = media.url.toLowerCase().split('.').pop();
    return ['mp4', 'mov', 'avi', 'mkv'].includes(extension);
  };

  useEffect(() => {
    if (selectedPost && selectedPost.items && selectedPost.items[currentIndex]) {
      const media = selectedPost.items[currentIndex];
      const fullUrl = getFullUrl(media.url);
      const isVideo = isVideoFile(media);

      if (isVideo && playerRef.current) {
        const loadVideo = async () => {
          try {
            setIsVideoLoading(true);
            setVideoError(null);
            await playerRef.current.replaceAsync({ uri: fullUrl });
            setIsVideoLoading(false);
            playerRef.current.play();
          } catch (error) {
            console.error('Video load error:', fullUrl, error.message);
            setIsVideoLoading(false);
            setVideoError('Failed to load video');
          }
        };
        loadVideo();
      }
    }
  }, [selectedPost, currentIndex]);

  const pausePlayer = () => {
    if (playerRef.current && typeof playerRef.current.pause === 'function') {
      playerRef.current.pause();
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const renderThumbnail = (media) => {
    const thumbnailUri = media && media.thumbnail_url ? getFullUrl(media.thumbnail_url) : null;

    if (thumbnailUri) {
      return (
        <Image
          source={{ uri: thumbnailUri }}
          style={styles.thumbnail}
          resizeMode="cover"
          onError={(e) => console.error('Thumbnail load error:', thumbnailUri, e.nativeEvent.error)}
        />
      );
    }
    return (
      <View style={styles.fallbackContainer}>
        <Ionicons name={isVideoFile(media) ? 'videocam-outline' : 'image-outline'} size={40} color="#888" />
        <Text style={styles.errorText}>No thumbnail available</Text>
      </View>
    );
  };

  const renderMediaItem = () => {
    if (!selectedPost || !selectedPost.items || !selectedPost.items[currentIndex]) {
      return (
        <View style={styles.fallbackContainer}>
          <Text style={styles.errorText}>No media available</Text>
        </View>
      );
    }

    const media = selectedPost.items[currentIndex];
    const fullUrl = getFullUrl(media.url);
    const isVideo = isVideoFile(media);

    if (isVideo) {
      return (
        <View style={[styles.mediaContainer, isFullscreen && styles.fullscreenMedia]}>
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
                console.error('VideoView error:', fullUrl, error);
                setVideoError('Video playback failed');
              }}
            />
          )}
        </View>
      );
    }

    const imageItems = selectedPost.items.filter((item) => !isVideoFile(item));
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
      <View style={[styles.imageViewerContainer, isFullscreen && styles.fullscreenImage]}>
        <ImageViewer
          imageUrls={imageUrls}
          index={currentImageIndex >= 0 ? currentImageIndex : 0}
          onChange={(index) => {
            setCurrentIndex(selectedPost.items.indexOf(imageItems[index]));
          }}
          saveToLocalByLongPress={true}
          backgroundColor="transparent"
          renderIndicator={() => null}
          style={[styles.imageViewer, isFullscreen && styles.fullscreenImageViewer]}
        />
      </View>
    );
  };

  const handleMediaClick = (post) => {
    if (post && post.media && post.media.length > 0) {
      setSelectedPost({ items: post.media, description: post.description });
      setCurrentIndex(0);
      setIsFullscreen(true); // Start in fullscreen
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
    if (selectedPost && selectedPost.items) {
      const nextIndex = (currentIndex + 1) % selectedPost.items.length;
      setCurrentIndex(nextIndex);
    }
  };

  const handlePrevMedia = () => {
    if (selectedPost && selectedPost.items) {
      const prevIndex = (currentIndex - 1 + selectedPost.items.length) % selectedPost.items.length;
      setCurrentIndex(prevIndex);
    }
  };

  return (
    <View style={styles.container}>
      {posts && posts.length > 0 ? (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          scrollEnabled={scrollEnabled}
          renderItem={({ item }) => {
            const firstMedia = item.media && item.media.length > 0 ? item.media[0] : null;
            const isVideo = firstMedia ? isVideoFile(firstMedia) : false;

            return (
              <TouchableOpacity style={styles.postItem} onPress={() => handleMediaClick(item)}>
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
                      onError={(e) => console.error('Post image error:', firstMedia.url, e.nativeEvent.error)}
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
          <SafeAreaView style={[styles.modalContainer, isFullscreen && styles.fullscreenModal]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity style={styles.modalClose} onPress={handleCloseModal}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.fullscreenButton} onPress={toggleFullscreen}>
                <Ionicons
                  name={isFullscreen ? 'contract-outline' : 'expand-outline'}
                  size={24}
                  color="#fff"
                />
              </TouchableOpacity>
            </View>

            {renderMediaItem()}

            <View style={styles.controlsContainer}>
              <Text style={styles.descriptionText}>{selectedPost.description}</Text>

              {selectedPost.items && selectedPost.items.length > 1 && (
                <View style={styles.slideControls}>
                  <TouchableOpacity style={styles.navButton} onPress={handlePrevMedia}>
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                  </TouchableOpacity>
                  <Text style={styles.slideIndicator}>
                    {`${currentIndex + 1} / ${selectedPost.items.length}`}
                  </Text>
                  <TouchableOpacity style={styles.navButton} onPress={handleNextMedia}>
                    <Ionicons name="chevron-forward" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </SafeAreaView>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f9f9f9',
    padding: 0,
  },
  flatListContent: {
    paddingHorizontal: 5,
  },
  postItem: {
    width: (SCREEN_WIDTH - 80) / 2,
    margin: 5,
    aspectRatio: 1,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenModal: {
    padding: 0,
    margin: 0,
  },
  modalHeader: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  modalClose: {
    padding: 10,
  },
  fullscreenButton: {
    padding: 10,
  },
  mediaContainer: {
    width: SCREEN_WIDTH * 0.95,
    height: SCREEN_HEIGHT * 0.7,
    borderRadius: 10,
    overflow: 'hidden',
  },
  fullscreenMedia: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    borderRadius: 0,
  },
  imageViewerContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.75,
    flex: 1,
  },
  fullscreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  imageViewer: {
    width: '100%',
    height: '100%',
  },
  fullscreenImageViewer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  videoView: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  fullscreenVideo: {
    borderRadius: 0,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 20,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  slideControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 10,
  },
  navButton: {
    padding: 8,
  },
  slideIndicator: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 12,
  },
  descriptionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
    fontWeight: '500',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 8,
    paddingVertical: 8,
  },
  noPostsText: {
    textAlign: 'center',
    fontSize: 18,
    color: '#888',
    marginTop: 20,
  },
  playIconOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
    opacity: 0.8,
  },
  fallbackContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eee',
    borderRadius: 8,
  },
  errorText: {
    color: '#888',
    fontSize: 14,
    marginTop: 5,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
  },
  loadingContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 10,
  },
});

export default ShopPosts;