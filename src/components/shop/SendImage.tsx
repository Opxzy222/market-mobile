import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, Image, Platform, FlatList, Alert, StyleSheet } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { Ionicons } from '@expo/vector-icons';

const SendImage = ({ onSend }) => {
  const [selectedImage, setSelectedImage] = useState(null);
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
        mediaType: ['photo'],
        first: 50,
      });
      setAllMedia(assets);
    }
  };

  const handleSelectImage = (image) => {
    setSelectedImage(image);
  };

  const handleSelectImageWeb = (event) => {
    const file = event.target.files[0];
    if (file) {
      const selectedMedia = {
        id: file.name,
        uri: URL.createObjectURL(file),
        mediaType: 'photo',
        name: file.name,
      };
      setSelectedImage(selectedMedia);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
  };

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? (
        <label style={styles.fileInputLabel}>
          <input type="file" accept="image/*" onChange={handleSelectImageWeb} style={styles.fileInput} />
          Select Image
        </label>
      ) : (
        <>
          <TouchableOpacity onPress={fetchMedia} style={styles.selectButton}>
            <Text style={styles.selectButtonText}>Select Image</Text>
          </TouchableOpacity>

          <FlatList
            data={allMedia}
            keyExtractor={(item) => item.id}
            numColumns={3}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => handleSelectImage(item)} style={styles.imageWrapper}>
                <Image source={{ uri: item.uri }} style={styles.image} />
              </TouchableOpacity>
            )}
          />
        </>
      )}

      {selectedImage && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
          <View style={styles.actionButtons}>
            <TouchableOpacity onPress={handleRemoveImage} style={styles.removeButton}>
              <Ionicons name="trash" size={24} color="#ff4d4d" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onSend(selectedImage)} style={styles.sendButton}>
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
  imageWrapper: {
    margin: 5,
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  previewContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  previewImage: {
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

export default SendImage;
