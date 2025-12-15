// src/hooks/useMediaPicker.ts
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

type MediaType = 'image' | 'video' | 'all'; // 'all' for both

interface PickerOptions {
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number; // 0-1 for images
  videoMaxDuration?: number; // in seconds
  mediaTypes?: 'images' | 'videos' | 'all';
}

export const useMediaPicker = () => {
  // Request permissions once (you can call this on app start or screen mount)
  const requestPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return false;
    }
    return true;
  };

  // Main picker function
  const pickMedia = async (options: PickerOptions = {}): Promise<ImagePicker.ImagePickerResult | null> => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return null;

    const mediaTypesMap = {
      images: ImagePicker.MediaTypeOptions.Images,
      videos: ImagePicker.MediaTypeOptions.Videos,
      all: ImagePicker.MediaTypeOptions.All,
    };

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: mediaTypesMap[options.mediaTypes || 'all'],
      allowsEditing: options.allowsEditing ?? true,
      aspect: options.aspect || [4, 3],
      quality: options.quality ?? 0.8,
      videoMaxDuration: options.videoMaxDuration,
      allowsMultipleSelection: false, // Set true if you need multi-select later
    });

    if (!result.canceled) {
      return result;
    }

    return null;
  };

  // Optional: Separate functions for convenience
  const pickImage = (options = {}) => pickMedia({ ...options, mediaTypes: 'images' });
  const pickVideo = (options = {}) => pickMedia({ ...options, mediaTypes: 'videos' });

  return { pickMedia, pickImage, pickVideo };
};