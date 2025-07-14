import React, { useState } from 'react';
import { View, Image, Dimensions, TouchableOpacity, StyleSheet } from 'react-native';
import ImageViewing from 'react-native-image-viewing';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ChatImage({ uri }) {
  const [isVisible, setIsVisible] = useState(false);

  const handleImagePress = () => {
    if (uri) {
      console.log('Image pressed, opening fullscreen:', uri);
      setIsVisible(true);
    } else {
      console.error('No valid URI provided for image');
    }
  };

  return (
    <View style={styles.container}>
      <ImageViewing
        images={[{ uri }]}
        imageIndex={0}
        visible={isVisible}
        onRequestClose={() => setIsVisible(false)}
        swipeToCloseEnabled={false} // Disable swipe-down to close
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
        animationType="fade" // Smooth and fast animation
      />
      <TouchableOpacity onPress={handleImagePress} accessibilityLabel="View image">
        <Image
          source={{ uri }}
          style={styles.thumbnail}
          resizeMode="cover"
          onError={(e) => console.error('Thumbnail image error:', uri, e.nativeEvent.error)}
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
    elevation: 4, // Android shadow
    shadowColor: '#000', // iOS shadow
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