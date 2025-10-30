import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, StatusBar } from 'react-native';
import api from '../api';
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { StyleSheet } from 'react-native';

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

      const response = await api.post(
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

      await api.post(
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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor='#2563EB' />
      <LinearGradient colors={['#F7FAFC', '#E5E7EB']} style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.push("/RequestToken")}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verify Your Email</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.contentWrapper}>
          <Text style={styles.title}>Enter Verification Code</Text>
          <Text style={styles.subtitle}>
            A verification code has been sent to {email}.
          </Text>
          <TextInput
            placeholder="6-digit code"
            placeholderTextColor="#5A5A5A"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            style={styles.input}
          />
          <TouchableOpacity 
            onPress={handleVerify} 
            style={[styles.button, loading && styles.buttonDisabled]}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Verify</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleResendCode} 
            style={[styles.resendButton, resendDisabled && styles.buttonDisabled]}
            disabled={resendDisabled}
          >
            <Text style={styles.buttonText}>
              {resendDisabled ? `Wait ${timer}s to Resend` : 'Resend Code'}
            </Text>
          </TouchableOpacity>
        </View>
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
    textAlign: 'center',
    flex: 1,
  },
  headerSpacer: {
    width: 42,
  },
  contentWrapper: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    fontFamily: 'System',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#6B7280',
    marginBottom: 20,
    fontFamily: 'System',
    letterSpacing: 0.3,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
    fontSize: 18,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    textAlign: 'center',
    letterSpacing: 5,
  },
  button: {
    backgroundColor: '#3A7BD5',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  resendButton: {
    backgroundColor: '#28A745',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#A3BFFA',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    fontFamily: 'System',
    letterSpacing: 0.3,
  },
});

export default VerifyEmailScreen;