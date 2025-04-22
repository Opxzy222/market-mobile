import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { useLocalSearchParams, useRouter } from "expo-router";

const VerifyEmailScreen = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [timer, setTimer] = useState(30); // Countdown for Resend Code button

  const router = useRouter();
  const params = useLocalSearchParams();
  const { email } = params;

  useEffect(() => {
    if (resendDisabled) {
      const countdown = setInterval(() => {
        setTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);

      if (timer === 0) {
        setResendDisabled(false);
      }

      return () => clearInterval(countdown);
    }
  }, [resendDisabled, timer]);

  const handleVerify = async () => {
  if (code.length !== 6) {
    Alert.alert('Invalid Code', 'Please enter a valid 6-digit code.');
    return;
  }

  setLoading(true);
  try {
    const formData = new FormData();
    formData.append('token', code);

    const response = await axios.post(
      'https://retail-alvinia-goza-f6a0e4f7.koyeb.app/verify-email/',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    Alert.alert('Success', 'Email verified successfully.');
    router.push({ pathname: '/signup', params: { email: email } });
  } catch (error) {
    Alert.alert('Error', error.response?.data?.error || 'Invalid or expired code.');
  } finally {
    setLoading(false);
  }
};

const handleResendCode = async () => {
  setResendDisabled(true);
  setTimer(30); // Reset cooldown timer

  try {
    const formData = new FormData();
    formData.append('email', email);

    await axios.post(
      'https://retail-alvinia-goza-f6a0e4f7.koyeb.app/request-email-verification/',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    Alert.alert('Success', 'A new verification code has been sent.');
  } catch (error) {
    Alert.alert('Error', 'Could not resend code.');
    setResendDisabled(false);
  }
};

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>Enter Verification Code</Text>
      <Text style={{ color: '#666', marginBottom: 20 }}>
        A verification code has been sent to {email}.
      </Text>

      <TextInput
        placeholder="6-digit code"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={6}
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          padding: 10,
          borderRadius: 5,
          textAlign: 'center',
          fontSize: 18,
          letterSpacing: 5,
          marginBottom: 20
        }}
      />

      {/* Verify Button */}
      <TouchableOpacity 
        onPress={handleVerify} 
        style={{
          backgroundColor: loading ? '#ccc' : '#007bff', 
          padding: 15, 
          borderRadius: 5, 
          alignItems: 'center',
          marginBottom: 10
        }}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Verify</Text>
        )}
      </TouchableOpacity>

      {/* Resend Code Button */}
      <TouchableOpacity 
        onPress={handleResendCode} 
        style={{
          backgroundColor: resendDisabled ? '#ccc' : '#28a745', 
          padding: 12, 
          borderRadius: 5, 
          alignItems: 'center'
        }}
        disabled={resendDisabled}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>
          {resendDisabled ? `Wait ${timer}s to Resend` : 'Resend Code'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default VerifyEmailScreen;
