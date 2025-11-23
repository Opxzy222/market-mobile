// components/cart/AddCustomItemModal.tsx
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '@/context/CartContext';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

type Props = {
  visible: boolean;
  onClose: () => void;
  shopId: number;
  shopName: string;
};

export default function AddCustomItemModal({
  visible,
  onClose,
  shopId,
  shopName,
}: Props) {
  const { addItem } = useCart();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setName('');
    setPrice('');
    setNote('');
    setImageUri(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Allow access to photos to upload an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleAdd = async () => {
    if (!name.trim()) {
      Alert.alert('Missing Name', 'Please enter item name.');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price.');
      return;
    }

    setLoading(true);

    try {
      addItem({
        shopId,
        shopName,
        shopProductId: null,
        product_name: name.trim(),
        price: priceNum,
        original_price: priceNum,
        quantity: 1,
        note: note.trim(),
        image: imageUri || undefined,
        is_custom: true,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Added!', `"${name}" has been added to your order.`);
      handleClose();
    } catch (error) {
      console.error('Failed to add custom item:', error);
      Alert.alert('Error', 'Failed to add item. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Add Custom Item</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Item Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Custom Logo Design"
                value={name}
                onChangeText={setName}
                autoFocus
              />
            </View>

            {/* Price */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Price (₦) *</Text>
              <TextInput
                style={styles.input}
                placeholder="25000"
                value={price}
                onChangeText={(text) => setPrice(text.replace(/[^0-9.]/g, ''))}
                keyboardType="numeric"
              />
            </View>

            {/* Note */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Note (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="e.g. Add extra large size, red color"
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Image */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Image (optional)</Text>
              <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                {imageUri ? (
                  <View style={styles.imagePreview}>
                    <Image source={{ uri: imageUri }} style={styles.previewImg} />
                    <TouchableOpacity
                      style={styles.removeImage}
                      onPress={() => setImageUri(null)}
                    >
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.placeholder}>
                    <Ionicons name="camera-outline" size={32} color="#94A3B8" />
                    <Text style={styles.placeholderText}>Tap to add image</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.btn, styles.cancelBtn]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.addBtn, loading && styles.btnDisabled]}
              onPress={handleAdd}
              disabled={loading}
            >
              <Text style={styles.addText}>
                {loading ? 'Adding...' : 'Add to Order'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#F8FAFC',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  imagePicker: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    overflow: 'hidden',
  },
  placeholder: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  placeholderText: {
    marginTop: 8,
    color: '#94A3B8',
    fontSize: 14,
  },
  imagePreview: {
    position: 'relative',
  },
  previewImg: {
    width: '100%',
    height: 120,
    borderRadius: 12,
  },
  removeImage: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 4,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F1F5F9',
  },
  cancelText: {
    color: '#64748B',
    fontWeight: '600',
  },
  addBtn: {
    backgroundColor: '#2563EB',
  },
  addText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});