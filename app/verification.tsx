import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

export default function Verification() {
  const params = useLocalSearchParams();
  const router = useRouter();

  useEffect(() => {
    const handleVerificationResult = async () => {
      if (!params.reference_id) {
        console.log('No reference_id found in params:', params);
        Toast.show({ type: 'error', text1: 'Error', text2: 'No verification data received.' });
        router.back();
        return;
      }

      try {
        console.log('Processing reference_id:', params.reference_id);
        const sessionToken = await AsyncStorage.getItem('sessionToken');
        const response = await fetch('https://retail-alvinia-goza-f6a0e4f7.koyeb.app/verify-user/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': sessionToken || '',
          },
          body: JSON.stringify({
            reference_id: params.reference_id,
          }),
        });
        const result = await response.json();
        console.log('Verification response:', response.status, result);
        if (response.ok) {
          Toast.show({
            type: 'success',
            text1: 'Success',
            text2: 'ID verification successful!',
          });
          router.back();
        } else {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: result.error || 'Verification failed.',
          });
          router.back();
        }
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'An unexpected error occurred.',
        });
        console.error('Verification error:', error);
        router.back();
      }
    };

    handleVerificationResult();
  }, [params, router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#3A7BD5" />
      <Text style={{ marginTop: 10, fontSize: 16, color: '#6B7280' }}>
        Processing verification...
      </Text>
    </View>
  );
}