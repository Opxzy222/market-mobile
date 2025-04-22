import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from "expo-router";

const EnterOTPScreen = () => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');

  const router = useRouter();
  const params = useLocalSearchParams();
  const { email } = params;

  const handleVerifyOTP = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('https://retail-alvinia-goza-f6a0e4f7.koyeb.app/auth/confirm-reset-token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token: otp }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push({ pathname: '/ResetPassword', params: { email: email, token: otp } });
      } else {
        setError(data.error || 'Invalid OTP. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResendLoading(true);
    try {
      const res = await fetch('https://retail-alvinia-goza-f6a0e4f7.koyeb.app/auth/request-reset-token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Error', data.error || 'Could not resend OTP.');
      } else {
        Alert.alert('Success', 'A new OTP has been sent to your email.');
      }
    } catch (error) {
      Alert.alert('Error', 'Network issue. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter OTP</Text>
      <Text style={styles.subtitle}>
        A 6-digit code was sent to {email}
      </Text>

      <TextInput
        style={styles.input}
        value={otp}
        onChangeText={setOtp}
        placeholder="Enter OTP"
        keyboardType="numeric"
        maxLength={6}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleVerifyOTP} disabled={loading || otp.length !== 6}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify OTP</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={handleResendOTP} disabled={resendLoading}>
        <Text style={styles.resendText}>
          {resendLoading ? 'Sending...' : 'Didn’t receive the code? Resend'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default EnterOTPScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#f9f9fb',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#1e1e2d',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#6c6c80',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
    backgroundColor: '#fff',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 4,
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#3b82f6',
    textDecorationLine: 'underline',
  },
  error: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 12,
  },
});
