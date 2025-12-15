import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Animated, { FadeInUp, FadeInDown, ZoomIn } from 'react-native-reanimated';

interface VerificationStatus {
  phoneVerified: boolean;
  userVerified: boolean;
}

const VerificationStatusScreen = () => {
  const [status, setStatus] = useState<VerificationStatus>({ phoneVerified: false, userVerified: false });
  const router = useRouter();

  const loadVerificationStatus = useCallback(async () => {
    try {
      const sessionToken = await AsyncStorage.getItem('sessionToken');
      console.log('Session Token:', sessionToken); // Debug session token
      if (!sessionToken) {
        Toast.show({ type: 'error', text1: 'Error', text2: 'Please log in again.' });
        router.push('/login');
        return;
      }

      // Retrieve verification statuses from AsyncStorage
      const phoneVerifiedStr = await AsyncStorage.getItem('phone_verified');
      const userVerifiedStr = await AsyncStorage.getItem('user_verified');

      console.log('Phone Verified (raw):', phoneVerifiedStr, 'User Verified (raw):', userVerifiedStr); // Debug raw values

      // Parse JSON strings to booleans, default to false if not found
      const isPhoneVerified = phoneVerifiedStr ? JSON.parse(phoneVerifiedStr) : false;
      const isUserVerified = userVerifiedStr ? JSON.parse(userVerifiedStr) : false;

      // Update state with latest values
      setStatus({ phoneVerified: !!isPhoneVerified, userVerified: !!isUserVerified });
      console.log('Phone Verified:', isPhoneVerified, 'User Verified:', isUserVerified); // Debug state

      Toast.show({
        type: 'info',
        text1: 'Verification Status Loaded',
        text2: `Phone: ${isPhoneVerified ? 'Verified' : 'Not Verified'}, ID: ${isUserVerified ? 'Verified' : 'Not Verified'}`,
      });
    } catch (error) {
      console.error('Error fetching verification status from AsyncStorage:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load verification status. Please try again.',
      });
      // Reset to default state on error to avoid stale data
      setStatus({ phoneVerified: false, userVerified: false });
    }
  }, [router]);

  // Fetch data every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadVerificationStatus();
      // No cleanup needed, as AsyncStorage operations are idempotent
    }, [loadVerificationStatus])
  );

  const handlePhoneVerification = () => {
    if (status.phoneVerified) {
      Toast.show({
        type: 'success',
        text1: 'Already Verified',
        text2: 'Your phone number is already verified.',
      });
      console.log('Phone verification already completed');
      return;
    }
    console.log('Navigating to PhoneVerification');
    router.push('/PhoneVerification');
  };

  const handleIDVerification = () => {
    if (!status.phoneVerified) {
      Toast.show({
        type: 'error',
        text1: 'Phone Verification Required',
        text2: 'Please verify your phone number first.',
      });
      console.log('ID Verification blocked: Phone not verified');
      return;
    }
    if (status.userVerified) {
      Toast.show({
        type: 'success',
        text1: 'Already Verified',
        text2: 'Your ID is already verified.',
      });
      console.log('ID Verification blocked: Already verified');
      return;
    }
    console.log('Navigating to IDVerification');
    router.push('/IDVerification');
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#3A7BD5" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.navigate('(tabs)/profile')} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verification Status</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Content */}
        <Animated.View style={styles.contentContainer} entering={FadeInUp.duration(500)}>
          <Animated.Text style={styles.subtitle} entering={FadeInUp.duration(500).delay(200)}>
            Complete the steps below to secure your account
          </Animated.Text>
          <Animated.View style={styles.card} entering={FadeInDown.duration(500).delay(300)}>
            {/* Phone Verification */}
            <TouchableOpacity
              style={[styles.statusItem, status.phoneVerified && styles.statusItemDisabled]}
              onPress={handlePhoneVerification}
              disabled={status.phoneVerified}
            >
              <View style={styles.statusContent}>
                <View style={styles.statusIconContainer}>
                  <Animated.View entering={ZoomIn.duration(400).delay(400)}>
                    <MaterialIcons
                      name={status.phoneVerified ? 'check-circle' : 'phone'}
                      size={28}
                      color={status.phoneVerified ? '#10B981' : '#6B7280'}
                    />
                  </Animated.View>
                </View>
                <View>
                  <Text style={styles.statusText}>Phone Verification</Text>
                  <Text style={styles.statusSubText}>
                    {status.phoneVerified ? 'Verified' : 'Verify your phone number'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* ID Verification */}
            <TouchableOpacity
              style={[styles.statusItem, (status.userVerified || !status.phoneVerified) && styles.statusItemDisabled]}
              onPress={handleIDVerification}
              disabled={status.userVerified || !status.phoneVerified}
            >
              <View style={styles.statusContent}>
                <View style={styles.statusIconContainer}>
                  <Animated.View entering={ZoomIn.duration(400).delay(500)}>
                    <MaterialIcons
                      name={status.userVerified ? 'check-circle' : 'badge'}
                      size={28}
                      color={status.userVerified ? '#10B981' : !status.phoneVerified ? '#D1D5DB' : '#6B7280'}
                    />
                  </Animated.View>
                </View>
                <View>
                  <Text style={[styles.statusText, !status.phoneVerified && styles.statusTextDisabled]}>
                    ID Verification
                  </Text>
                  <Text style={[styles.statusSubText, !status.phoneVerified && styles.statusSubTextDisabled]}>
                    {status.userVerified ? 'Verified' : !status.phoneVerified ? 'Requires phone verification' : 'Verify your identity'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </View>
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
    backgroundColor: '#3A7BD5',
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  backButton: {
    padding: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 42,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#6B7280',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  statusItemDisabled: {
    opacity: 0.7,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIconContainer: {
    marginRight: 16,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  statusTextDisabled: {
    color: '#6B7280',
  },
  statusSubText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B7280',
  },
  statusSubTextDisabled: {
    color: '#9CA3AF',
  },
});

export default VerificationStatusScreen;