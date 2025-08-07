import React, { useState } from 'react';
import { View, Image, Dimensions, TouchableOpacity, StyleSheet } from 'react-native';
import ImageViewing from 'react-native-image-viewing';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ChatImage({ uri, messageId, sessionId }) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentUri, setCurrentUri] = useState(uri);

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
      const response = await axios.get(
        `https://retail-alvinia-goza-f6a0e4f7.koyeb.app/regenerate-attachment-url/`,
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
    top: 40,
    right: 20,
    zIndex: 10,
  },
  closeButton: {
    padding: 10,
  },
});