import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';

const Signature = () => {
  const [signature, setSignature] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  
  const { shopId } = useLocalSearchParams();

  useEffect(() => {
    const fetchSessionId = async () => {
      const sessionIdString = await AsyncStorage.getItem('sessionToken');
      setSessionId(sessionIdString);
    };
    fetchSessionId();
  }, []);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setSignature(result.assets[0].uri);
    }
  };

  const uploadSignature = async () => {
    if (!signature) {
      Alert.alert('Error', 'Please select a signature image first.');
      return;
    }

    try {
      const response = await fetch(signature);
      const blob = await response.blob();
      const file = new File([blob], 'signature.jpg', { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('shop_id', shopId);
      formData.append('signature', file);

      const res = await axios.post(
        'https://retail-alvinia-goza-f6a0e4f7.koyeb.app/upload-signature/',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: sessionId,
          },
        }
      );

      Alert.alert('Success', 'Signature uploaded successfully!');
    } catch (error) {
      console.error('Error uploading signature:', error);
      Alert.alert('Error', 'Failed to upload signature.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upload Your Signature</Text>
      <Text style={styles.instructions}>
        Sign on a plain white sheet of paper, take a clear picture, and upload it here.
      </Text>

      {signature && <Image source={{ uri: signature }} style={styles.signaturePreview} />}

      <TouchableOpacity style={styles.button} onPress={pickImage}>
        <Feather name="image" size={24} color="#fff" />
        <Text style={styles.buttonText}>Pick a Signature</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={uploadSignature}>
        <Feather name="upload" size={24} color="#fff" />
        <Text style={styles.buttonText}>Upload Signature</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  instructions: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  signaturePreview: {
    width: 200,
    height: 100,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 10,
    width: '80%',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    marginLeft: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Signature;
