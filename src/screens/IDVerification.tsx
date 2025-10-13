import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Button,
  Platform,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import api from '../api'; // Import axios

const DOJAH_FLOW_ID = '68ec03dacce96e771fff43bc';
const REDIRECT_URI = 'gogo-mobile://verification';
const API_TIMEOUT = 10000; // 10 seconds timeout for API calls

// TypeScript interfaces for type safety
interface VerificationParams {
  reference_id?: string;
  error?: string;
}

interface VerificationResult {
  message: string;
  is_verified: boolean;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  date_of_birth?: string | null;
  error?: string;
}

const IDVerificationScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<VerificationParams>();
  const [verifying, setVerifying] = useState(false);
  const [publicKey, setPublicKey] = useState<string>('');

  // Clear stale AsyncStorage data on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        const [storedIsVerified, storedUserName] = await AsyncStorage.multiGet([
          'user_verified',
          'user_name',
        ]);
        console.log('Stored AsyncStorage:', { storedIsVerified, storedUserName });
        const verified = storedIsVerified[1] ? JSON.parse(storedIsVerified[1]) : false;
        // Clear stale data if user_name exists but is_verified is false
        if (storedUserName[1] && !verified) {
          console.log('Cleaning stale AsyncStorage data');
          await AsyncStorage.multiRemove(['user_verified', 'user_name']);
        }
      } catch (error) {
        console.error('Error loading stored data:', error);
        await AsyncStorage.multiRemove(['user_verified', 'user_name']);
      }
    };
    initialize();
  }, []);

  // Handle deep links
  useEffect(() => {
    const handleDeepLink = ({ url }: { url: string }) => {
      const { queryParams } = Linking.parse(url);
      console.log('Deep link received:', url, queryParams);
      if (queryParams.reference_id) {
        handleVerificationResult({ reference_id: queryParams.reference_id });
      } else if (queryParams.error) {
        Toast.show({
          type: 'error',
          text1: 'Verification Failed',
          text2: `Error: ${queryParams.error}. Please try again.`,
        });
      }
    };
    const subscription = Linking.addEventListener('url', handleDeepLink);
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });
    return () => subscription.remove();
  }, []);

  // Handle redirect with reference_id or error
  useEffect(() => {
    console.log('Received params:', params);
    if (params.reference_id) {
      handleVerificationResult({ reference_id: params.reference_id });
    } else if (params.error) {
      Toast.show({
        type: 'error',
        text1: 'Verification Failed',
        text2: `Error: ${params.error}. Please try again.`,
      });
    }
  }, [params]);

  // Fetch public key
  useEffect(() => {
    const fetchPublicKey = async () => {
      try {
        const sessionToken = await AsyncStorage.getItem('sessionToken');
        if (!sessionToken) {
          throw new Error('Session token not found. Please log in again.');
        }
        const response = await Promise.race([
          api.get('/dojah-public-key/', {
            headers: {
              'Content-Type': 'application/json',
              Authorization: sessionToken,
            },
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timed out')), API_TIMEOUT)
          ),
        ]);

        const data = response.data;
        if (response.status === 200 && data.public_key) {
          console.log('Fetched public key:', data.public_key);
          setPublicKey(data.public_key);
        } else {
          throw new Error('Failed to load Dojah public key');
        }
      } catch (error: any) {
        console.error('Error fetching public key:', error);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: error.message || 'Failed to connect to server. Please try again.',
        });
      }
    };
    fetchPublicKey();
  }, []);

  const handleVerificationResult = async (data: { reference_id: string }) => {
    try {
      setVerifying(true);
      const sessionToken = await AsyncStorage.getItem('sessionToken');
      if (!sessionToken) {
        throw new Error('Session token not found. Please log in again.');
      }
      const response = await Promise.race([
        api.post<VerificationResult>(
          '/verify-user/',
          { reference_id: data.reference_id },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: sessionToken,
            },
          }
        ),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Verification timed out')), API_TIMEOUT)
        ),
      ]);

      const result = response.data;
      if (response.status === 200) {
        const fullName = result.full_name || `${result.first_name || ''} ${result.last_name || ''}`.trim() || 'User';

        // Keep the specified AsyncStorage lines unchanged
        await AsyncStorage.setItem('user_verified', JSON.stringify(result.is_verified));
        await AsyncStorage.setItem('user_name', result.first_name);

        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: `ID verification successful! Welcome, ${fullName}!`,
        });

        setTimeout(() => router.replace('/profile'), 1500);
      } else {
        throw new Error(result.error || 'Verification failed. Please try again.');
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      const errorMessage = error.message.includes('Network')
        ? 'Network error. Please check your connection and try again.'
        : error.message.includes('timed out')
        ? 'Verification took too long. Please try again.'
        : error.message || 'An unexpected error occurred. Please try again.';
      Toast.show({
        type: 'error',
        text1: 'Verification Error',
        text2: errorMessage,
      });
    } finally {
      setVerifying(false);
    }
  };

  const openVerification = async () => {
    if (!publicKey) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Public key not loaded. Please try again.',
      });
      return;
    }
    try {
      const url = `https://identity.dojah.io/?widget_id=${DOJAH_FLOW_ID}&public_key=${publicKey}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
      console.log('Opening Dojah widget URL:', url);
      const result = await WebBrowser.openBrowserAsync(url, {
        enableDefaultShareMenuItem: false,
        showTitle: true,
        browserPackage: Platform.OS === 'android' ? 'com.android.chrome' : undefined,
      });
      console.log('Browser result:', result);
      if (result.type === 'dismiss') {
        Toast.show({
          type: 'info',
          text1: 'Verification Cancelled',
          text2: 'You closed the browser. Please complete verification to continue.',
        });
      }
    } catch (error: any) {
      console.error('Failed to open Dojah widget:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: `Failed to open verification: ${error.message}`,
      });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={styles.header.backgroundColor} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={26} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ID Verification</Text>
        <View style={styles.headerSpacer} />
      </View>
      <Animated.View style={styles.contentContainer} entering={FadeInUp.duration(500)}>
        {publicKey ? (
          verifying ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={styles.buttonContainer.color} />
              <Text style={styles.loadingText}>Verifying your ID...</Text>
            </View>
          ) : (
            <View style={styles.buttonContainer}>
              <Button
                title="Start Verification"
                onPress={openVerification}
                color={styles.buttonContainer.color}
              />
              <Text style={styles.infoText}>Please complete ID verification.</Text>
            </View>
          )
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={styles.buttonContainer.color} />
            <Text style={styles.loadingText}>Loading verification...</Text>
          </View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#2563EB',
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 42,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
    textAlign: 'center',
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    color: '#3A7BD5',
  },
  infoText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 20,
    textAlign: 'center',
  },
});

export default IDVerificationScreen;