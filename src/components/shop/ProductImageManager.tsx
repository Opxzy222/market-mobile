// components/ProductImageManager.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native'; // optional – safe to remove

type ProductImageManagerProps = {
  /** Unique key for the product – e.g. "suggestion_123" or "custom_0" */
  productKey: string;

  /** URL of the current image (null if none) – comes from the API */
  currentImageUrl: string | null;

  /** Called with the selected file (File‑like) when user picks a photo */
  onImageSelect: (key: string, file: any) => void;

  /** Called when user removes the image */
  onImageRemove: (key: string) => void;
};

export const ProductImageManager: React.FC<ProductImageManagerProps> = ({
  productKey,
  currentImageUrl,
  onImageSelect,
  onImageRemove,
}) => {
  const { colors } = useTheme(); // fallback to default colors if you don’t use theme

  const [modalVisible, setModalVisible] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(currentImageUrl);
  const [pendingFile, setPendingFile] = useState<any>(null); // new file picked this session
  const [isProcessing, setIsProcessing] = useState(false);

  // -----------------------------------------------------------------
  // Sync preview when the server URL changes (e.g. after reload)
  // -----------------------------------------------------------------
  useEffect(() => {
    setPreviewUri(currentImageUrl);
    // If server URL changes, clear any pending file (user replaced it)
    if (currentImageUrl) setPendingFile(null);
  }, [currentImageUrl]);

  // -----------------------------------------------------------------
  // Permission helper
  // -----------------------------------------------------------------
  const requestPermission = async (type: 'camera' | 'library'): Promise<boolean> => {
    const { status } =
      type === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Permission required',
        `Please allow ${type === 'camera' ? 'camera' : 'photo library'} access in settings.`
      );
      return false;
    }
    return true;
  };

  // -----------------------------------------------------------------
  // Open picker
  // -----------------------------------------------------------------
  const openPicker = async (source: 'camera' | 'library') => {
    const hasPermission = await requestPermission(source);
    if (!hasPermission) return;

    setIsProcessing(true);
    try {
      const pickerOpts: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      };

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(pickerOpts)
          : await ImagePicker.launchImageLibraryAsync(pickerOpts);

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];

        const file = {
          uri: asset.uri,
          name: `product_${productKey}_${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        };

        setPreviewUri(asset.uri);
        setPendingFile(file);
        onImageSelect(productKey, file);
      }
    } catch (err) {
      console.warn('Image picker error:', err);
      Alert.alert('Error', 'Could not select image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // -----------------------------------------------------------------
  // Remove image
  // -----------------------------------------------------------------
  const handleRemove = () => {
    Alert.alert('Remove image', 'Are you sure you want to delete this image?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          setPreviewUri(null);
          setPendingFile(null);
          onImageRemove(productKey);
        },
      },
    ]);
  };

  // -----------------------------------------------------------------
  // Icon logic – decides which icon to show in the table cell
  // -----------------------------------------------------------------
  const hasImage = !!previewUri; // true if server image OR pending file
  const iconName = hasImage ? 'image' : 'image-outline';
  const iconColor = hasImage ? '#2563EB' : '#9CA3AF'; // blue vs grey

  // -----------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------
  return (
    <>
      {/* -------------------------------------------------------------
          Tiny icon inside the table row
          ------------------------------------------------------------- */}
      <TouchableOpacity
        style={styles.iconButton}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        {hasImage && previewUri ? (
          <View style={styles.previewWrapper}>
            <Image source={{ uri: previewUri }} style={styles.tinyPreview} />
            <View style={styles.tinyOverlay}>
              <MaterialCommunityIcons name="pencil" size={12} color="#fff" />
            </View>
          </View>
        ) : (
          <MaterialCommunityIcons name={iconName} size={28} color={iconColor} />
        )}
      </TouchableOpacity>

      {/* -------------------------------------------------------------
          Full-screen modal (unchanged logic)
          ------------------------------------------------------------- */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Product Image</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons name="close" size={28} color={colors.text ?? '#000'} />
              </TouchableOpacity>
            </View>

            {/* Preview */}
            <View style={styles.previewContainer}>
              {previewUri ? (
                <Image source={{ uri: previewUri }} style={styles.previewImage} resizeMode="contain" />
              ) : (
                <View style={styles.placeholder}>
                  <MaterialCommunityIcons name="image-off" size={56} color="#bbb" />
                  <Text style={styles.placeholderText}>No image yet</Text>
                </View>
              )}
            </View>

            {/* Action buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cameraButton]}
                onPress={() => openPicker('camera')}
                disabled={isProcessing}
              >
                <MaterialCommunityIcons name="camera" size={24} color="#fff" />
                <Text style={styles.actionButtonText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.galleryButton]}
                onPress={() => openPicker('library')}
                disabled={isProcessing}
              >
                <MaterialCommunityIcons name="image-multiple" size={24} color="#fff" />
                <Text style={styles.actionButtonText}>Choose from Gallery</Text>
              </TouchableOpacity>
            </View>

            {/* Remove button */}
            {previewUri && (
              <TouchableOpacity style={styles.removeButton} onPress={handleRemove} disabled={isProcessing}>
                <MaterialCommunityIcons name="trash-can-outline" size={20} color="#fff" />
                <Text style={styles.removeButtonText}>Remove Image</Text>
              </TouchableOpacity>
            )}

            {/* Done */}
            <TouchableOpacity
              style={[styles.doneButton, isProcessing && styles.doneButtonDisabled]}
              onPress={() => setModalVisible(false)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.doneButtonText}>Done</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

/* -------------------------------------------------------------
   Styles
   ------------------------------------------------------------- */
const styles = StyleSheet.create({
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },

  // Tiny preview shown in the table cell
  previewWrapper: {
    position: 'relative',
  },
  tinyPreview: {
    width: 36,
    height: 36,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  tinyOverlay: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    padding: 2,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContainer: {
    width: '92%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#222',
  },

  previewContainer: {
    width: '100%',
    height: 260,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  previewImage: {
    width: '100%',
    height: '100%',
  },

  placeholder: {
    alignItems: 'center',
  },

  placeholderText: {
    marginTop: 8,
    fontSize: 16,
    color: '#999',
  },

  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },

  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginHorizontal: 6,
  },

  cameraButton: {
    backgroundColor: '#4CAF50',
  },

  galleryButton: {
    backgroundColor: '#2196F3',
  },

  actionButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
    fontSize: 15,
  },

  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F44336',
    paddingVertical: 12,
    borderRadius: 12,
    width: '100%',
    marginBottom: 12,
  },

  removeButtonText: {
    color: '#fff',
    marginLeft: 6,
    fontWeight: '600',
    fontSize: 15,
  },

  doneButton: {
    backgroundColor: '#6200EE',
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },

  doneButtonDisabled: {
    backgroundColor: '#aaa',
  },

  doneButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default ProductImageManager;