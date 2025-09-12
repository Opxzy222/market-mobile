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
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BASE_URL = 'https://retail-alvinia-goza-f6a0e4f7.koyeb.app';
const FALLBACK_IMAGE = 'https://via.placeholder.com/150';

const getFullUrl = (url) => {
  return url && url.startsWith('http') ? url : `${BASE_URL}${url || ''}`;
};

const isVideoFile = (media) => {
  if (!media || !media.url) return false;
  if (media.type) return media.type === 'video';
  const extension = media.url.toLowerCase().split('.').pop();
  return ['mp4', 'mov', 'avi', 'mkv'].includes(extension);
};

// Thumbnail Component
const Thumbnail = ({ media }) => {
  const [isThumbnailLoading, setIsThumbnailLoading] = useState(true);
  let thumbnailUri = media.thumbnail_url
    ? getFullUrl(media.thumbnail_url)
    : isVideoFile(media)
    ? FALLBACK_IMAGE
    : getFullUrl(media.url);

  if (thumbnailUri) {
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
          resizeMode="cover"
          onLoadStart={() => setIsThumbnailLoading(true)}
          onLoad={() => setIsThumbnailLoading(false)}
          onError={(e) => {
            console.error('Thumbnail load error:', thumbnailUri, e.nativeEvent.error);
            setIsThumbnailLoading(false);
          }}
        />
      </View>
    );
  }
  return (
    <View style={styles.fallbackContainer}>
      <Ionicons
        name={isVideoFile(media) ? 'videocam-outline' : 'image-outline'}
        size={40}
        color="#888"
      />
      <Text style={styles.errorText}>No thumbnail available</Text>
    </View>
  );
};

// Custom Image Viewer Component
const CustomImageViewer = ({ imageUrls, index, onChange, isFullscreen }) => {
  const [isImageLoading, setIsImageLoading] = useState(true);
  const timeoutRef = useRef(null);

  useEffect(() => {
    setIsImageLoading(true);
    // Fallback timeout to hide loading indicator after 5 seconds
    timeoutRef.current = setTimeout(() => {
      setIsImageLoading(false);
    }, 5000);

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
          style={{ width: 0, height: 0, position: 'absolute' }}
          onLoad={() => {
            setIsImageLoading(false);
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
          }}
          onError={() => {
            setIsImageLoading(false);
            console.error('Image preload error:', imageUrls[index].url);
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
          }}
        />
      )}
    </View>
  );
};

const ShopPosts = ({ posts, scrollEnabled = false }) => {
  const [selectedPost, setSelectedPost] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(true);

  const playerRef = useRef(null);
  const player = useVideoPlayer({ uri: '' }, (p) => {
    playerRef.current = p;
    p.loop = false;
  });

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
            if (playerRef.current && playerRef.current.source?.uri !== fullUrl) {
              await playerRef.current.replaceAsync({ uri: fullUrl });
            }
            playerRef.current.play();
            setIsVideoLoading(false);
          } catch (error) {
            console.error('Video load error:', fullUrl, error.message);
            setVideoError('Failed to load video');
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
      if (playerRef.current && typeof playerRef.current.pause === 'function') {
        try {
          playerRef.current.pause();
        } catch (error) {
          console.warn('Error pausing video during cleanup:', error.message);
        }
      }
    };
  }, [selectedPost, currentIndex]);

  const pausePlayer = () => {
    if (playerRef.current && typeof playerRef.current.pause === 'function') {
      try {
        playerRef.current.pause();
      } catch (error) {
        console.warn('Error pausing video:', error.message);
      }
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
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
        <LinearGradient
          colors={['rgba(0, 0, 0, 0.7)', 'rgba(0, 0, 0, 0.9)']}
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
                console.error('VideoView error:', fullUrl, error);
                setVideoError('Video playback failed');
              }}
            />
          )}
        </LinearGradient>
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
      <LinearGradient
        colors={['rgba(0, 0, 0, 0.7)', 'rgba(0, 0, 0, 0.9)']}
        style={[styles.imageViewerContainer, isFullscreen && styles.fullscreenImage]}
      >
        <CustomImageViewer
          imageUrls={imageUrls}
          index={currentImageIndex >= 0 ? currentImageIndex : 0}
          onChange={(index) => {
            setCurrentIndex(selectedPost.items.indexOf(imageItems[index]));
          }}
          isFullscreen={isFullscreen}
        />
      </LinearGradient>
    );
  };

  const handleMediaClick = (post) => {
    if (post && post.media && post.media.length > 0) {
      setSelectedPost({ items: post.media, description: post.description });
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
                      <Thumbnail media={firstMedia} />
                      <View style={styles.playIconOverlay}>
                        <Ionicons name="play-circle" size={40} color="white" />
                      </View>
                    </View>
                  ) : (
                    <Thumbnail media={firstMedia} />
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
            <LinearGradient
              colors={['rgba(0, 0, 0, 0.7)', 'rgba(0, 0, 0, 0.95)']}
              style={styles.modalBackground}
            >
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
            </LinearGradient>
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
  thumbnailContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    position: 'relative',
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
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
  },
  fullscreenButton: {
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
  },
  mediaContainer: {
    width: SCREEN_WIDTH * 0.95,
    height: SCREEN_HEIGHT * 0.7,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e8ecef',
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
    position: 'absolute',
    zIndex: 10,
  },
});

export default ShopPosts;