import React, { useState, useEffect, useRef, memo } from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Text,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import PropTypes from 'prop-types';
import api from '../../api';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function ChatVideo({ uri, name, thumbnailUrl, pending, messageId, sessionId }) {
  console.log('ChatVideo render', {
    uri,
    name,
    thumbnailUrl,
    pending,
    pendingType: typeof pending,
    messageId,
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [currentUri, setCurrentUri] = useState(uri);
  const [currentThumbnailUrl, setCurrentThumbnailUrl] = useState(thumbnailUrl);
  const [saving, setSaving] = useState(false);

  const playerRef = useRef(null);
  const videoViewRef = useRef(null);
  const isMountedRef = useRef(true);
  const player = useVideoPlayer(null, (p) => {
    console.log('Player initialized', { messageId });
    playerRef.current = p;
    p.loop = false;
  });

  // Handle video and thumbnail load errors
  const handleError = async (type = 'video') => {
    console.error(`${type} load error:`, type === 'video' ? currentUri : currentThumbnailUrl, 'messageId:', messageId);
    try {
      const response = await api.get(
        `/regenerate-attachment-url/`,
        {
          params: { message_id: messageId },
          headers: { Authorization: sessionId },
        }
      );
      const data = response.data;
      if (data.file_url) {
        console.log(`Regenerated ${type} URL:`, data.file_url, 'messageId:', messageId);
        if (type === 'video') {
          setCurrentUri(data.file_url);
          setVideoError(null);
          setIsVideoLoaded(false); // Reset to reload video
        } else {
          setCurrentThumbnailUrl(data.thumbnail_url);
        }
      } else {
        console.error(`No ${type} URL returned from regeneration`, 'messageId:', messageId);
        setVideoError(`Failed to load ${type}`);
      }
    } catch (error) {
      console.error(`Failed to regenerate ${type} URL:`, error, 'messageId:', messageId);
      setVideoError(`Failed to load ${type}`);
    }
  };

  // Monitor player state
  useEffect(() => {
    if (!player) return;

    const playingSubscription = player.addListener('playingChange', ({ isPlaying: playing }) => {
      console.log('Playing state changed:', playing, 'messageId:', messageId);
      if (isMountedRef.current) setIsPlaying(playing);
    });

    const errorSubscription = player.addListener('error', (error) => {
      console.error('Player error:', error, 'messageId:', messageId);
      if (isMountedRef.current) {
        setVideoError('Video playback failed');
        setIsPlaying(false);
        setIsVideoLoading(false);
        handleError('video');
      }
    });

    const statusSubscription = player.addListener('statusChange', (status) => {
      console.log('Player status:', status, 'messageId:', messageId);
      if (status.error && isMountedRef.current) {
        setVideoError('Video playback failed');
        setIsPlaying(false);
        setIsVideoLoading(false);
        handleError('video');
      }
    });

    return () => {
      console.log('Removing player listeners', { messageId });
      playingSubscription?.remove();
      errorSubscription?.remove();
      statusSubscription?.remove();
      isMountedRef.current = false;
    };
  }, [player, messageId, sessionId]);

  // Handle fullscreen updates
  const handleFullscreenUpdate = ({ fullscreenUpdate }) => {
    console.log('Fullscreen update:', fullscreenUpdate, 'messageId:', messageId);
    if (isMountedRef.current) {
      if (fullscreenUpdate === 'entered') {
        setIsFullscreen(true);
      } else if (fullscreenUpdate === 'exited') {
        setIsFullscreen(false);
        if (playerRef.current && isPlaying) {
          try {
            playerRef.current.pause();
            setIsPlaying(false);
            console.log('Video paused on fullscreen exit', { messageId });
          } catch (error) {
            console.error('Pause error on fullscreen exit:', error.message, 'messageId:', messageId);
          }
        }
      }
    }
  };

  const requestPermissions = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Storage permission is required to save videos.');
      return false;
    }
    return true;
  };

  const saveVideo = async () => {
    if (saving || !currentUri) return;
    setSaving(true);

    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        setSaving(false);
        return;
      }

      const fileExtension = name?.toLowerCase().endsWith('.mp4') || currentUri.toLowerCase().endsWith('.mp4')
        ? 'mp4'
        : name?.toLowerCase().endsWith('.mov') || currentUri.toLowerCase().endsWith('.mov')
        ? 'mov'
        : 'mp4'; // Default to mp4 if unknown
      const fileName = `chat_video_${messageId}_${Date.now()}.${fileExtension}`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      console.log(`Downloading video: ${currentUri}`);
      const downloadResult = await FileSystem.downloadAsync(currentUri, fileUri);
      if (downloadResult.status !== 200) {
        throw new Error(`Download failed with status ${downloadResult.status}`);
      }

      // Create asset first
      const asset = await MediaLibrary.createAssetAsync(fileUri);
      console.log(`Created asset: ${asset.id}`);

      // Check for existing album
      let album = await MediaLibrary.getAlbumAsync('ChatVideos');
      if (!album) {
        console.log('Creating ChatVideos album');
        // On Android, createAlbumAsync requires an asset; on iOS, it can be null
        album = await MediaLibrary.createAlbumAsync(
          'ChatVideos',
          Platform.OS === 'android' ? asset : null,
          false
        );
      }

      // Add asset to album (only needed if album already existed or on iOS)
      if (album && Platform.OS !== 'android') {
        console.log(`Adding asset ${asset.id} to ChatVideos album ${album.id}`);
        await MediaLibrary.addAssetsToAlbumAsync([asset], album.id, false);
      }

      // Clean up downloaded file
      await FileSystem.deleteAsync(fileUri, { idempotent: true });

      Alert.alert('Success', 'Video saved to ChatVideos album!');
    } catch (error) {
      console.error('Error saving video:', error);
      Alert.alert('Error', `Failed to save video: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const loadVideo = async () => {
    if (!currentUri || pending) {
      console.log('No URI or pending, skipping load', { currentUri, pending, messageId });
      if (isMountedRef.current && !currentUri) setVideoError('No video available');
      return;
    }

    try {
      console.log('Loading URI:', currentUri, 'messageId:', messageId);
      const fileName = name || currentUri.split('/').pop()?.split('?')[0] || '';
      if (!fileName.toLowerCase().endsWith('.mp4') && !fileName.toLowerCase().endsWith('.mov')) {
        throw new Error('Unsupported video format (only MP4/MOV supported)');
      }

      setIsVideoLoading(true);
      setVideoError(null);

      if (!playerRef.current) {
        console.error('Player not initialized, aborting load', { messageId });
        throw new Error('Video player not initialized');
      }

      console.log('Loading video with URI:', currentUri, 'messageId:', messageId);
      const loadPromise = playerRef.current.replaceAsync({ uri: currentUri });
      const loadTimeout = setTimeout(() => {
        throw new Error('Video load timed out');
      }, 8000);

      await loadPromise;
      clearTimeout(loadTimeout);

      if (isMountedRef.current) {
        setIsVideoLoading(false);
        setIsVideoLoaded(true);
        console.log('Video loaded:', currentUri, 'messageId:', messageId);
      }
    } catch (error) {
      console.error('Video load failed:', error.message, error.stack, 'messageId:', messageId);
      if (isMountedRef.current) {
        setVideoError(error.message || 'Failed to load video');
        setIsVideoLoading(false);
        handleError('video');
      }
    }
  };

  const handlePlayPause = async () => {
    console.log('handlePlayPause called', {
      videoError,
      isVideoLoading,
      pending,
      isPlayerReady: !!playerRef.current,
      isPlaying,
      isFullscreen,
      isVideoLoaded,
      messageId,
    });

    if (!videoError && !isVideoLoading && !pending && playerRef.current) {
      try {
        if (isPlaying) {
          console.log('Pausing video', 'messageId:', messageId);
          playerRef.current.pause();
          setIsPlaying(false);
          if (isFullscreen && videoViewRef.current && typeof videoViewRef.current.exitFullscreen === 'function') {
            await videoViewRef.current.exitFullscreen();
            console.log('Exited fullscreen', { messageId });
          }
        } else {
          console.log('Playing video:', currentUri, 'messageId:', messageId);
          if (!isVideoLoaded) {
            await loadVideo();
          }
          if (!videoError && isVideoLoaded) {
            playerRef.current.play();
            setIsPlaying(true);
            if (!isFullscreen && videoViewRef.current && typeof videoViewRef.current.enterFullscreen === 'function') {
              await videoViewRef.current.enterFullscreen();
              console.log('Entered fullscreen', { messageId });
            }
          }
        }
      } catch (error) {
        console.error('Play/pause error:', error.message, 'messageId:', messageId);
        setVideoError('Video playback failed');
        handleError('video');
      }
    } else {
      console.log('Play blocked:', { videoError, isVideoLoading, pending, messageId });
      if (!isVideoLoaded && !isVideoLoading && !pending) {
        await loadVideo();
      }
    }
  };

  const handleCloseFullscreen = async () => {
    console.log('Close fullscreen pressed', { messageId });
    if (isFullscreen && videoViewRef.current && typeof videoViewRef.current.exitFullscreen === 'function') {
      try {
        await videoViewRef.current.exitFullscreen();
        console.log('Exited fullscreen via close button', { messageId });
      } catch (error) {
        console.error('Exit fullscreen error:', error.message, 'messageId:', messageId);
      }
    }
    if (playerRef.current && isPlaying) {
      try {
        playerRef.current.pause();
        setIsPlaying(false);
        console.log('Video paused on close', { messageId });
      } catch (error) {
        console.error('Pause error on close:', error.message, 'messageId:', messageId);
      }
    }
  };

  const renderContent = () => {
    if (pending) {
      return (
        <View style={styles.placeholder}>
          <Text style={styles.loadingText}>Uploading...</Text>
        </View>
      );
    }

    if (videoError) {
      return (
        <View style={styles.placeholder}>
          {currentThumbnailUrl ? (
            <Image
              source={{ uri: currentThumbnailUrl }}
              style={styles.thumbnail}
              resizeMode="cover"
              onError={(e) => {
                console.error('Thumbnail load error:', currentThumbnailUrl, e.nativeEvent.error, 'messageId:', messageId);
                handleError('thumbnail');
              }}
            />
          ) : (
            <View style={styles.fallbackThumbnail}>
              <Text style={styles.fallbackText}>No thumbnail</Text>
            </View>
          )}
          <Text style={styles.errorText}>{videoError}</Text>
        </View>
      );
    }

    if (isVideoLoading) {
      return (
        <View style={styles.placeholder}>
          {currentThumbnailUrl ? (
            <Image
              source={{ uri: currentThumbnailUrl }}
              style={styles.thumbnail}
              resizeMode="cover"
              onError={(e) => {
                console.error('Thumbnail load error:', currentThumbnailUrl, e.nativeEvent.error, 'messageId:', messageId);
                handleError('thumbnail');
              }}
            />
          ) : (
            <View style={styles.fallbackThumbnail}>
              <Text style={styles.fallbackText}>No thumbnail</Text>
            </View>
          )}
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.loadingText}>Loading video...</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.videoWrapper}>
        {currentThumbnailUrl && !isPlaying && !isVideoLoaded ? (
          <Image
            source={{ uri: currentThumbnailUrl }}
            style={styles.thumbnail}
            resizeMode="cover"
            onError={(e) => {
              console.error('Thumbnail load error:', currentThumbnailUrl, e.nativeEvent.error, 'messageId:', messageId);
              handleError('thumbnail');
            }}
          />
        ) : (
          <VideoView
            ref={videoViewRef}
            style={[styles.video, isFullscreen && styles.fullscreenVideo]}
            player={player}
            contentFit="contain"
            nativeControls={true}
            allowsFullscreen={true}
            allowsPictureInPicture={false}
            onFullscreenUpdate={handleFullscreenUpdate}
            onError={(error) => {
              console.error('VideoView playback error:', error, 'messageId:', messageId);
              if (isMountedRef.current) {
                setVideoError('Video playback failed');
                setIsPlaying(false);
                handleError('video');
              }
            }}
            onLoad={() => {
              console.log('VideoView loaded:', currentUri, 'messageId:', messageId);
              if (isMountedRef.current) {
                setIsVideoLoading(false);
                setIsVideoLoaded(true);
              }
            }}
          />
        )}
        {isFullscreen && (
          <>
            <TouchableOpacity
              onPress={handleCloseFullscreen}
              style={styles.closeButton}
              accessibilityLabel="Close fullscreen video"
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={saveVideo}
              style={styles.downloadButton}
              accessibilityLabel="Download video"
              disabled={saving}
            >
              <Ionicons
                name={saving ? 'hourglass-outline' : 'download-outline'}
                size={28}
                color="#fff"
              />
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handlePlayPause}
        style={styles.videoContainer}
        disabled={!!(videoError || isVideoLoading || pending)}
        activeOpacity={0.7}
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
      >
        {renderContent()}
        {currentThumbnailUrl && !isPlaying && !videoError && !isVideoLoading && !pending && (
          <View style={styles.playIconContainer}>
            <Ionicons name="play-circle" size={40} color="rgba(255, 255, 255, 0.7)" />
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

ChatVideo.propTypes = {
  uri: PropTypes.string,
  name: PropTypes.string,
  thumbnailUrl: PropTypes.string,
  pending: PropTypes.bool,
  messageId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  sessionId: PropTypes.string,
};

ChatVideo.defaultProps = {
  uri: null,
  name: null,
  thumbnailUrl: null,
  pending: false,
  sessionId: null,
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 5,
    maxWidth: SCREEN_WIDTH * 0.6,
  },
  videoContainer: {
    position: 'relative',
    width: 150,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  fallbackThumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    color: '#666',
    fontSize: 12,
  },
  videoWrapper: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  video: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  fullscreenVideo: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    borderRadius: 0,
  },
  playIconContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    padding: 5,
    zIndex: 101,
  },
  placeholder: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#ff4d4d',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
  },
  loadingText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 5,
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    padding: 10,
    zIndex: 10,
  },
  downloadButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 70, // Adjusted to position left of closeButton
    padding: 10,
    zIndex: 10,
  },
});

export default memo(ChatVideo);