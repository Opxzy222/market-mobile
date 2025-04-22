import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { useRouter, usePathname } from 'expo-router';

const RequestTokenScreen = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false); // Cooldown for resending
  
  const router = useRouter();
  const pathname = usePathname();

  const handleRequestVerification = async () => {
  if (!email.includes('@')) {
    Alert.alert('Invalid Email', 'Please enter a valid email address.');
    return;
  }

  setLoading(true);
  const formData = new FormData();
  formData.append('email', email);

  try {
    const response = await axios.post(
      'https://retail-alvinia-goza-f6a0e4f7.koyeb.app/request-email-verification/',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );

    const message = response.data?.message;

    if (message === "Email is already verified. Please complete your registration.") {
      Alert.alert(
        'Email Already Verified',
        'This email has already been verified. Please complete your account registration.'
      );

      // Navigate to signup screen
      router.push({ pathname: '/signup', params: { email: email, prevRoute: pathname } });
      return; // exit early, don’t do rest of logic
    }

    Alert.alert('Success', 'A verification email has been sent.');
    router.push({ pathname: '/VerifyEmail', params: { email: email, prevRoute: pathname } });

    // Start resend cooldown
    setResendDisabled(true);
    setTimeout(() => setResendDisabled(false), 30000); // 30 seconds cooldown

  } catch (error) {
    Alert.alert('Error', error.response?.data?.error || 'Something went wrong.');
  } finally {
    setLoading(false);
  }
};

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>Enter Your Email</Text>
      <TextInput
        placeholder="Email Address"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          padding: 10,
          borderRadius: 5,
          marginBottom: 20
        }}
      />
      
      {/* Send Verification Button */}
      <TouchableOpacity 
        onPress={handleRequestVerification} 
        style={{
          backgroundColor: loading ? '#ccc' : '#007bff', 
          padding: 15, 
          borderRadius: 5, 
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 10
        }}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={{ color: '#fff', textAlign: 'center', fontWeight: 'bold' }}>Send Verification Code</Text>
        )}
      </TouchableOpacity>

      
    </View>
  );
};

export default RequestTokenScreen;
