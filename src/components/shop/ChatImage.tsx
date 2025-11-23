import React, { useState, useEffect } from 'react';
import {
  View,
  Image,
  Dimensions,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import ImageViewing from 'react-native-image-viewing';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ChatImage({ uri, messageId }) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentUri, setCurrentUri] = useState(uri);
  const [saving, setSaving] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
      const fetchSessionId = async () => {
        try {
          const sessionIdString = await AsyncStorage.getItem("sessionToken");
          setSessionId(sessionIdString);
        } catch (err) {
          console.error("Error fetching session ID:", err);
        }
      };
      fetchSessionId();
    }, []);
  

  const handleImagePress = () => {
    if (currentUri) {
      console.log('Image pressed, opening fullscreen:', currentUri);
      setIsVisible(true);
    } else {
      console.error('No valid URI provided for image');
    }
  };

  const handleError = async () => {
    console.error('Thumbnail image error:', currentUri);
    try {
      const response = await api.get(
        `/regenerate-attachment-url/`,
        {
          params: { message_id: messageId },
          headers: { Authorization: sessionId },
        }
      );
      const data = response.data;
      if (data.attachment) {
        console.log('Regenerated image URL:', data.attachment);
        setCurrentUri(data.attachment);
      } else {
        console.error('No attachment URL returned from regeneration');
      }
    } catch (error) {
      console.error('Failed to regenerate image URL:', error);
    }
  };

  const requestPermissions = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Storage permission is required to save images.');
      return false;
    }
    return true;
  };

  const saveImage = async () => {
    if (saving || !currentUri) return;
    setSaving(true);

    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        setSaving(false);
        return;
      }

      const fileName = `chat_image_${messageId}_${Date.now()}.jpg`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      console.log(`Downloading image: ${currentUri}`);
      const downloadResult = await FileSystem.downloadAsync(currentUri, fileUri);
      if (downloadResult.status !== 200) {
        throw new Error(`Download failed with status ${downloadResult.status}`);
      }

      // Create asset first
      const asset = await MediaLibrary.createAssetAsync(fileUri);
      console.log(`Created asset: ${asset.id}`);

      // Check for existing album
      let album = await MediaLibrary.getAlbumAsync('ChatImages');
      if (!album) {
        console.log('Creating ChatImages album');
        // On Android, createAlbumAsync requires an asset; on iOS, it can be null
        album = await MediaLibrary.createAlbumAsync(
          'ChatImages',
          Platform.OS === 'android' ? asset : null,
          false
        );
      }

      // Add asset to album (only needed if album already existed or on iOS)
      if (album && Platform.OS !== 'android') {
        console.log(`Adding asset ${asset.id} to ChatImages album ${album.id}`);
        await MediaLibrary.addAssetsToAlbumAsync([asset], album.id, false);
      }

      // Clean up downloaded file
      await FileSystem.deleteAsync(fileUri, { idempotent: true });

      Alert.alert('Success', 'Image saved to ChatImages album!');
    } catch (error) {
      console.error('Error saving image:', error);
      Alert.alert('Error', `Failed to save image: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ImageViewing
        images={[{ uri: currentUri }]}
        imageIndex={0}
        visible={isVisible}
        onRequestClose={() => {
          console.log('Close button pressed');
          setIsVisible(false);
        }}
        swipeToCloseEnabled={false}
        HeaderComponent={() => (
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => {
                console.log('Close button pressed');
                setIsVisible(false);
              }}
              style={styles.closeButton}
              accessibilityLabel="Close fullscreen image"
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={saveImage}
              style={styles.downloadButton}
              accessibilityLabel="Download image"
              disabled={saving}
            >
              <Ionicons
                name={saving ? 'hourglass-outline' : 'download-outline'}
                size={28}
                color="#fff"
              />
            </TouchableOpacity>
          </View>
        )}
        backgroundColor="rgba(0, 0, 0, 0.95)"
        animationType="fade"
      />
      <TouchableOpacity onPress={handleImagePress} accessibilityLabel="View image">
        <Image
          source={{ uri: currentUri }}
          style={styles.thumbnail}
          resizeMode="cover"
          onError={(e) => handleError()}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 5,
  },
  thumbnail: {
    width: 150,
    height: 150,
    borderRadius: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 5,
    right: 5,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  closeButton: {
    padding: 10,
  },
  downloadButton: {
    padding: 10,
    marginLeft: 10,
  },
});