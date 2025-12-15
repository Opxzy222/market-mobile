import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import api from '../api'; // Import axios

const PhoneVerificationScreen = () => {
  const [phoneNo, setPhoneNo] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const validatePhoneNumber = (number) => {
    const phoneRegex = /^\+\d{10,15}$/;
    return phoneRegex.test(number);
  };

  const handleSendOTP = async () => {
    setLoading(true);
    try {
      const authToken = await AsyncStorage.getItem('sessionToken');
      if (!authToken) {
        Toast.show({ type: 'error', text1: 'Not authenticated' });
        setLoading(false);
        return;
      }

      const formattedPhoneNo = (() => {
  let input = phoneNo.trim();

  // If already has +, just clean it
  if (input.startsWith('+')) {
    const cleaned = input.replace(/\D/g, '');
    const withoutLeadingZero = cleaned.replace(/^0+/, '');
    return `+${withoutLeadingZero}`;
  }

  // Otherwise, assume local Nigerian format
  const digitsOnly = input.replace(/\D/g, '');

  // Handle common cases: 08012345678, 8012345678, +2348012345678 → all become +234812345678
  if (digitsOnly.startsWith('0') && digitsOnly.length === 11) {
    return `+234${digitsOnly.slice(1)}`; // Remove the 0, add +234
  }

  if (digitsOnly.startsWith('234') && digitsOnly.length === 13) {
    return `+${digitsOnly}`;
  }

  if (digitsOnly.length === 10) {
    return `+234${digitsOnly}`;
  }

  // Fallback (shouldn't reach here if validation passes)
  return `+234${digitsOnly.replace(/^0+/, '')}`;
})();

      const requestBody = { phone_no: formattedPhoneNo };
      console.log('Request body:', requestBody);

      const response = await api.post(
        '/api/phone-verification/request/',
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
        Toast.show({ type: 'success', text1: 'OTP sent to your phone number' });
        router.push({
          pathname: '/OTPVerification',
          params: { phoneNo: formattedPhoneNo },
        });
      } else {
        Toast.show({
          type: 'error',
          text1: result.error || 'Failed to send OTP',
          text2: result.details || 'Please try again later.',
        });
      }
    } catch (error) {
      console.error('Axios error:', error);
      if (error.response) {
        Toast.show({
          type: 'error',
          text1: error.response.data.error || 'Failed to send OTP',
          text2: error.response.data.details || 'Please try again later.',
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
      <StatusBar barStyle="light-content" backgroundColor="#3A7BD5" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.push('/VerificationStatus')}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Phone Verification</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Content */}
        <Animated.View style={styles.contentContainer} entering={FadeInUp.duration(500)}>
          <Animated.Text style={styles.title} entering={FadeInUp.duration(500).delay(100)}>
            Verify Your Phone
          </Animated.Text>
          <Animated.Text style={styles.subtitle} entering={FadeInUp.duration(500).delay(200)}>
            Enter your phone number to receive a secure OTP
          </Animated.Text>
          <Animated.View style={styles.card} entering={FadeInDown.duration(500).delay(300)}>
            <TextInput
              style={styles.input}
              placeholder="e.g., 08012345678"
              placeholderTextColor="#A3A3A3"
              value={phoneNo}
              onChangeText={setPhoneNo}
              keyboardType="phone-pad"
              autoFocus={true}
            />
            <TouchableOpacity
              style={[styles.button, (loading || !phoneNo.trim()) && styles.buttonDisabled]}
              onPress={handleSendOTP}
              disabled={loading || !phoneNo.trim()}
            >
              <LinearGradient
                colors={loading || !phoneNo.trim() ? ['#D1D5DB', '#B0B0B0'] : ['#4F46E5', '#7C3AED']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.buttonText}>{loading ? 'Sending...' : 'Send OTP'}</Text>
              </LinearGradient>
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
    backgroundColor: '#f5f5f5', // Maintained original background color
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

export default PhoneVerificationScreen;