import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import ImagePicker from 'react-native-image-crop-picker';
import Video from 'react-native-video';
import axios from 'axios';

const ShopPostForm = ({ shopId }) => {
  const [description, setDescription] = useState('');
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(false);

  const pickMedia = async () => {
    try {
      const results = await ImagePicker.openPicker({
        mediaType: 'any', // Allow both images and videos
        multiple: true, // Enable multi-selection
        maxFiles: 10, // Limit to 10 files
      });

      const filteredMedia = results.filter(file => {
        if (file.mime.startsWith('video/') && file.duration > 120000) {
          Alert.alert('Warning', 'Videos longer than 2 minutes are not allowed.');
          return false;
        }
        return true;
      });

      const selectedMedia = filteredMedia.map(file => ({
        uri: file.path,
        type: file.mime,
        name: file.filename || file.path.split('/').pop(),
      }));

      setMedia(prevMedia => [...prevMedia, ...selectedMedia]);
    } catch (err) {
      if (err.message !== 'User cancelled image selection') {
        console.error('Error picking media:', err);
        Alert.alert('Error', 'An error occurred while selecting media.');
      }
    }
  };

  const handleSubmit = async () => {
    if (!description.trim() || media.length === 0) {
      Alert.alert('Error', 'Please add a description and at least one media file.');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('shop_id', shopId);
    formData.append('description', description);
    media.forEach((file, index) => {
      formData.append('files', {
        uri: file.uri,
        type: file.type,
        name: file.name || `media_${index + 1}`,
      });
    });

    try {
      await axios.post(`https://172.27.243.94:8000/shops/${shopId}/posts/create/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      Alert.alert('Success', 'Post created successfully!');
      setDescription('');
      setMedia([]);
    } catch (error) {
      console.error('Error submitting post:', error);
      Alert.alert('Error', 'Failed to submit post. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create a Post</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter post description"
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <TouchableOpacity style={styles.mediaPicker} onPress={pickMedia}>
        <Text style={styles.mediaPickerText}>Pick Media (Images or Videos)</Text>
      </TouchableOpacity>
      <View style={styles.mediaPreviewContainer}>
        {media.map((item, index) => {
          if (item.type.startsWith('image/')) {
            return <Image key={index} source={{ uri: item.uri }} style={styles.mediaPreview} />;
          }
          if (item.type.startsWith('video/')) {
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
  mediaPicker: {
    backgroundColor: '#007BFF',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  mediaPickerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
