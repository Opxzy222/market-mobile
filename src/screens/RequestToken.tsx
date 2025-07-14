import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, StatusBar } from 'react-native';
import axios from 'axios';
import { useRouter, usePathname } from 'expo-router';

const RequestTokenScreen = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  
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
    <View>
      <StatusBar barStyle="light-content" backgroundColor='#2563EB' />
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
        <TouchableOpacity 
          onPress={handleRequestVerification} 
          style={{
            backgroundColor: loading || resendDisabled ? '#ccc' : '#007bff', 
            padding: 15, 
            borderRadius: 5, 
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 10
          }}
          disabled={loading || resendDisabled}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={{ color: '#fff', textAlign: 'center', fontWeight: 'bold' }}>
              Send Verification Code
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default RequestTokenScreen;