import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../api';

const EnterOTPScreen = () => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');

  const router = useRouter();
  const params = useLocalSearchParams();
  const { email, prevRoute } = params;

  const handleVerifyOTP = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/auth/confirm-reset-token/', { email, token: otp });

      if (response.status === 200) {
        router.push({
          pathname: '/ResetPassword',
          params: { email, token: otp },
        });
      }
    } catch (err: any) {
      if (err.response) {
        setError(err.response.data.error || 'Invalid or expired OTP. Please try again.');
      } else {
        setError('Network error. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResendLoading(true);
    try {
      const response = await api.post('/auth/request-reset-token/', { email });

      if (response.status === 200 || response.status === 201) {
        Alert.alert('Success', 'A new OTP has been sent to your email.');
      }
    } catch (err: any) {
      if (err.response?.status === 429) {
        const retryAfter = err.response.data.retry_after
          ? ` in ${err.response.data.retry_after} seconds`
          : '';
        Alert.alert('Too Many Requests', err.response.data.error + retryAfter);
      } else {
        Alert.alert('Error', err.response?.data?.error || 'Failed to resend OTP.');
      }
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#3A7BD5" />

      <LinearGradient colors={['#f6f9ff', '#e0e7ff']} style={styles.gradient}>
        {/* SAME HEADER AS FORGOT PASSWORD SCREEN */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Enter OTP</Text>
          <View style={styles.headerSpacer} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.wrapper}
        >
          <View style={styles.cardContainer}>
            <View style={styles.card}>
              <Text style={styles.title}>Enter OTP</Text>
              <Text style={styles.subtitle}>
                A 6-digit code was sent to{'\n'}
                <Text style={{ fontWeight: '600', color: '#4338ca' }}>{email}</Text>
              </Text>

              <TextInput
                style={styles.input}
                value={otp}
                onChangeText={setOtp}
                placeholder="------"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                maxLength={6}
                textAlign="center"
                letterSpacing={8}
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={[
                  styles.button,
                  (loading || otp.length !== 6) && styles.disabledButton,
                ]}
                onPress={handleVerifyOTP}
                disabled={loading || otp.length !== 6}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="white" style={styles.icon} />
                    <Text style={styles.buttonText}>Verify OTP</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={handleResendOTP} disabled={resendLoading}>
                <Text style={styles.resendText}>
                  {resendLoading ? 'Sending new code...' : 'Didn’t receive the code? Resend'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default EnterOTPScreen;

const styles = StyleSheet.create({
  gradient: { flex: 1 },

  // REUSABLE HEADER — EXACT SAME AS FORGOT PASSWORD
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
    textAlign: 'center',
    flex: 1,
  },
  headerSpacer: { width: 42 },

  wrapper: {
    flex: 1,
    paddingHorizontal: 24,
  },

  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 40, // Keeps card below the curved header
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },

  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#4338ca',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 14,
    paddingVertical: 16,
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    backgroundColor: '#f9fafb',
    marginBottom: 20,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#4f46e5',
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4f46e5',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  icon: {
    marginRight: 8,
  },
  resendText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#4f46e5',
    marginTop: 12,
    textDecorationLine: 'underline',
  },
});