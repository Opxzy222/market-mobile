import React, { useState } from 'react';
import { View, TouchableOpacity, Image, StyleSheet, Pressable } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent } from 'expo';

export default function ChatVideo({ uri }) {
  const [isPlaying, setIsPlaying] = useState(false);

  const player = useVideoPlayer(uri, (player) => {
    player.loop = false; // Prevent auto-replay
  });

  useEvent(player, 'playingChange', (event) => {
  console.log('Event data:', event);
  if (event?.playing === false) {
    setIsPlaying(false);
  }
});

  const handlePlay = () => {
    setIsPlaying(true);
    player.play();
  };

  const handleOutsidePress = () => {
    setIsPlaying(false);
    player.pause();
  };

  return (
    <View style={styles.container}>
      {!isPlaying ? (
        <TouchableOpacity onPress={handlePlay} style={styles.thumbnailContainer}>
          <Image source={{ uri }} style={styles.thumbnail} />
          <View style={styles.playIconContainer}>
            <Image 
              source={{ uri: 'https://cdn-icons-png.flaticon.com/512/64/64595.png' }}
              style={styles.playIcon} 
            />
          </View>
        </TouchableOpacity>
      ) : (
        <Pressable style={styles.videoContainer} onPress={handleOutsidePress}>
          <VideoView
            style={styles.video}
            player={player}
            allowsFullscreen
            allowsPictureInPicture
          />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailContainer: {
    position: 'relative',
  },
  thumbnail: {
    width: 150,
    height: 150,
    borderRadius: 10,
  },
  playIconContainer: {
    position: 'absolute',
    top: '40%',
    left: '40%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 10,
    borderRadius: 50,
  },
  playIcon: {
    width: 30,
    height: 30,
  },
  videoContainer: {
    width: 250,  // Adjust to your desired video size
    height: 250,
    borderRadius: 10,
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
  },
});
