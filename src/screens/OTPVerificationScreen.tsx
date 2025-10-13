import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import api from '../api'; // Import axios

const OTPVerificationScreen = () => {
  const { phoneNo } = useLocalSearchParams();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleVerifyOTP = async () => {
    setLoading(true);
    try {
      const authToken = await AsyncStorage.getItem('sessionToken');
      if (!authToken) {
        Toast.show({ type: 'error', text1: 'Not authenticated', text2: 'Please log in again.' });
        setLoading(false);
        return;
      }

      if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
        Toast.show({ type: 'error', text1: 'Invalid OTP', text2: 'Please enter a 6-digit numeric OTP.' });
        setLoading(false);
        return;
      }

      const requestBody = { otp };
      console.log('Request body:', requestBody);

      const response = await api.post(
        '/api/phone-verification/verify/',
        requestBody,
        {
          headers: {
            Authorization: authToken,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Response status:', response.status);
      console.log('Response body:', response.data);

      const result = response.data;

      if (response.status === 200) {
        await AsyncStorage.setItem('phone_verified', JSON.stringify(true));
        Toast.show({ type: 'success', text1: 'Phone number verified successfully' });
        router.push({ pathname: '/VerificationStatus' });
      } else {
        Toast.show({
          type: 'error',
          text1: result.error || 'Failed to verify OTP',
          text2: result.details || 'Please check the OTP and try again.',
        });
      }
    } catch (error) {
      console.error('Axios error:', error);
      if (error.response) {
        Toast.show({
          type: 'error',
          text1: error.response.data.error || 'Failed to verify OTP',
          text2: error.response.data.details || 'Please check the OTP and try again.',
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Something went wrong',
          text2: error.message || 'An unexpected error occurred.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
      <LinearGradient colors={['#E3F2FD', '#BBDEFB']} style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>OTP Verification</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Content */}
        <Animated.View style={styles.contentContainer} entering={FadeInUp.duration(500)}>
          <Animated.Text style={styles.title} entering={FadeInUp.duration(500).delay(100)}>
            Enter Your OTP
          </Animated.Text>
          <Animated.Text style={styles.subtitle} entering={FadeInUp.duration(500).delay(200)}>
            OTP sent to {phoneNo}
          </Animated.Text>
          <Animated.View style={styles.card} entering={FadeInDown.duration(500).delay(300)}>
            <TextInput
              style={styles.input}
              placeholder="Enter 6-digit OTP"
              placeholderTextColor="#A3A3A3"
              value={otp}
              onChangeText={setOtp}
              keyboardType="numeric"
              maxLength={6}
              autoFocus={true}
            />
            <TouchableOpacity
              style={[styles.button, (loading || otp.length !== 6) && styles.buttonDisabled]}
              onPress={handleVerifyOTP}
              disabled={loading || otp.length !== 6}
            >
              <LinearGradient
                colors={loading || otp.length !== 6 ? ['#D1D5DB', '#B0B0B0'] : ['#4F46E5', '#7C3AED']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.buttonText}>{loading ? 'Verifying...' : 'Verify OTP'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    fontFamily: 'System', // Suggest 'Inter_800ExtraBold' or 'Poppins_ExtraBold'
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#6B7280',
    marginBottom: 24,
    fontFamily: 'System', // Suggest 'Inter_Regular' or 'Poppins_Regular'
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
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  button: {
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System', // Suggest 'Inter_SemiBold' or 'Poppins_SemiBold'
  },
});

export default OTPVerificationScreen;