import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, Platform, FlatList, Alert, StyleSheet } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

const SendVideo = ({ onSend }) => {
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [allMedia, setAllMedia] = useState([]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setPermissionGranted(true);
    } else {
      requestPermissions();
    }
  }, []);

  const requestPermissions = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status === 'granted') {
      setPermissionGranted(true);
      fetchMedia();
    } else {
      Alert.alert('Permission Denied', 'We need access to your media library.');
    }
  };

  const fetchMedia = async () => {
    if (Platform.OS !== 'web') {
      const { assets } = await MediaLibrary.getAssetsAsync({
        mediaType: ['video'],
        first: 50,
      });
      setAllMedia(assets);
    }
  };

  const handleSelectVideo = (video) => {
    if (video.duration > 120) {
      Alert.alert('Warning', 'Videos longer than 2 minutes are not allowed.');
      return;
    }
    setSelectedVideo(video);
  };

  const handleSelectVideoWeb = (event) => {
    const file = event.target.files[0];
    if (file) {
      const selectedMedia = {
        id: file.name,
        uri: URL.createObjectURL(file),
        mediaType: 'video',
        name: file.name,
      };
      setSelectedVideo(selectedMedia);
    }
  };

  const handleRemoveVideo = () => {
    setSelectedVideo(null);
  };

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? (
        <label style={styles.fileInputLabel}>
          <input type="file" accept="video/*" onChange={handleSelectVideoWeb} style={styles.fileInput} />
          Select Video
        </label>
      ) : (
        <>
          <TouchableOpacity onPress={fetchMedia} style={styles.selectButton}>
            <Text style={styles.selectButtonText}>Select Video</Text>
          </TouchableOpacity>

          <FlatList
            data={allMedia}
            keyExtractor={(item) => item.id}
            numColumns={2}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => handleSelectVideo(item)} style={styles.videoWrapper}>
                <Video source={{ uri: item.uri }} style={styles.video} resizeMode="cover" />
              </TouchableOpacity>
            )}
          />
        </>
      )}

      {selectedVideo && (
        <View style={styles.previewContainer}>
          <Video source={{ uri: selectedVideo.uri }} style={styles.previewVideo} resizeMode="cover" shouldPlay={false} />
          <View style={styles.actionButtons}>
            <TouchableOpacity onPress={handleRemoveVideo} style={styles.removeButton}>
              <Ionicons name="trash" size={24} color="#ff4d4d" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onSend(selectedVideo)} style={styles.sendButton}>
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    flex: 1,
  },
  selectButton: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  selectButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  videoWrapper: {
    margin: 5,
    borderRadius: 8,
    overflow: 'hidden',
  },
  video: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  previewContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  previewVideo: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 10,
    alignItems: 'center',
    gap: 20,
  },
  removeButton: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff4d4d',
  },
  sendButton: {
    backgroundColor: '#28a745',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  fileInputLabel: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 8,
    color: '#fff',
    textAlign: 'center',
    display: 'inline-block',
    cursor: 'pointer',
  },
  fileInput: {
    display: 'none',
  },
});

export default SendVideo;
