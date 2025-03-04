import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  Alert,
  FlatList,
  Platform,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { Video } from 'expo-av';
import axios from 'axios';

const ShopPostForm = ({ shopId }) => {
  const [description, setDescription] = useState('');
  const [media, setMedia] = useState([]);
  const [allMedia, setAllMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      // Skip media library permissions on web
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
        mediaType: ['photo', 'video'],
        first: 50,
      });
      setAllMedia(assets);
    }
  };

  const handleSelectMedia = (item) => {
    const isSelected = media.some((m) => m.id === item.id);

    if (isSelected) {
      setMedia(media.filter((m) => m.id !== item.id));
    } else {
      if (item.mediaType === 'video' && item.duration > 120) {
        Alert.alert('Warning', 'Videos longer than 2 minutes are not allowed.');
        return;
      }
      setMedia([...media, item]);
    }
  };

  const handleSelectMediaWeb = (event) => {
    const files = Array.from(event.target.files);
    const selectedMedia = files.map((file) => ({
      id: file.name,
      uri: URL.createObjectURL(file),
      mediaType: file.type.startsWith('image') ? 'photo' : 'video',
      name: file.name,
    }));
    setMedia((prevMedia) => [...prevMedia, ...selectedMedia]);
  };

  const handleSubmit = async () => {
    if (!description.trim() || media.length === 0) {
      Alert.alert('Error', 'Please add a description and at least one media file.');
      return;
    }
  
    const formData = new FormData();
    formData.append('shop_id', shopId);
    formData.append('description', description);
  
    for (let index = 0; index < media.length; index++) {
      const file = media[index];
      let newFile;
  
      if (file.uri.startsWith('blob:')) {
        const response = await fetch(file.uri);
        const blob = await response.blob();
        newFile = new File([blob], file.name, { type: blob.type || 'application/octet-stream' });
      } else {
        newFile = {
          uri: file.uri.startsWith('file://') ? file.uri.replace('file://', '') : file.uri,
          type: file.mediaType === 'photo' ? 'image/jpeg' : 'video/mp4',
          name: file.name || `file_${index}.${file.mediaType === 'photo' ? 'jpg' : 'mp4'}`,
        };
      }
  
      console.log('Appending File:', newFile); // Debug log
      formData.append('files', newFile);
    }
  
    try {
      const response = await axios.post(
        `https://172.27.243.94:8000/shops/${shopId}/posts/create/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
  
      console.log('Server Response:', response.data); // Debug log
      Alert.alert('Success', 'Post created successfully!');
      setDescription('');
      setMedia([]);
    } catch (error) {
      console.error('Error submitting post:', error.response?.data || error.message);
      Alert.alert('Error', 'Failed to submit post.');
    }
  };
  
  const renderMediaItem = ({ item }) => {
    const isSelected = media.some((m) => m.id === item.id);

    return (
      <TouchableOpacity
        style={[styles.mediaItem, isSelected && styles.mediaItemSelected]}
        onPress={() => handleSelectMedia(item)}
      >
        {item.mediaType === 'photo' ? (
          <Image source={{ uri: item.uri }} style={styles.mediaThumbnail} />
        ) : (
          <Video
            source={{ uri: item.uri }}
            style={styles.mediaThumbnail}
            resizeMode="cover"
            isMuted
          />
        )}
        {isSelected && <View style={styles.selectionOverlay} />}
      </TouchableOpacity>
    );
  };

  if (!permissionGranted) {
    return (
      <View style={styles.container}>
        <Text>Waiting for media library permissions...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create a Post</Text>
      
      <Text style={styles.subtitle}>Select Media (Images or Videos)</Text>
      {Platform.OS === 'web' ? (
        <View>
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleSelectMediaWeb}
            style={{ marginBottom: 20 }}
          />
        </View>
      ) : (
        <FlatList
          data={allMedia}
          renderItem={renderMediaItem}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.mediaList}
        />
      )}
      <View style={styles.mediaPreviewContainer}>
        {media.map((item, index) => {
          if (item.mediaType === 'photo') {
            return <Image key={index} source={{ uri: item.uri }} style={styles.mediaPreview} />;
          }
          if (item.mediaType === 'video') {
            return (
              <Video
                key={index}
                source={{ uri: item.uri }}
                style={styles.mediaPreview}
                resizeMode="cover"
                paused
              />
            );
          }
          return null;
        })}
      </View>
      <TextInput
        style={styles.input}
        placeholder="Enter post description"
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Submitting...' : 'Post'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f9f9f9',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 10,
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 15,
    textAlignVertical: 'top',
  },
  mediaList: {
    marginBottom: 20,
  },
  mediaItem: {
    position: 'relative',
    margin: 5,
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
  },
  mediaItemSelected: {
    borderColor: '#007BFF',
    borderWidth: 2,
  },
  mediaThumbnail: {
    width: '100%',
    height: '100%',
  },
  selectionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 123, 255, 0.5)',
  },
  mediaPreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  mediaPreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 10,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#28a745',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#6c757d',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ShopPostForm;