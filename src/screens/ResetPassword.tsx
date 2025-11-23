import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../api';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [visibleConfirm, setVisibleConfirm] = useState(false);

  const router = useRouter();
  const params = useLocalSearchParams();
  const { token, email } = params;

  const scrollViewRef = useRef<ScrollView>(null);
  const inputFocus = useSharedValue(0); // 0 = none, 1 = focused

  const validatePassword = (password) => ({
    length: password.length >= 8,
    capital: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
  });

  const passwordChecks = validatePassword(password);

  const handleReset = async () => {
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (!passwordChecks.length || !passwordChecks.capital || !passwordChecks.number) {
      Alert.alert('Error', 'Password must be at least 8 characters, include a capital letter and a number');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/password-reset/', {
        reset_token: token,
        password,
        confirm_password: confirmPassword,
        email,
      }, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.status === 200 && response.data.message === 'Password reset successful.') {
        Alert.alert('Success', response.data.message, [
          { text: 'OK', onPress: () => router.replace('/login') },
        ]);
      } else {
        Alert.alert('Error', response.data.error || 'Something went wrong.');
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Please check your internet and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Dismiss keyboard & unfocus
  const dismissKeyboard = () => {
    Keyboard.dismiss();
    inputFocus.value = 0;
  };

  // Animated input glow
  const animatedInputStyle = useAnimatedStyle(() => ({
    borderColor: withTiming(inputFocus.value ? '#4f46e5' : '#d1d5db', { duration: 200 }),
    shadowOpacity: withTiming(inputFocus.value ? 0.3 : 0.1),
  }));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <LinearGradient colors={['#f6f9ff', '#e0e7ff']} style={styles.gradient}>
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              <Text style={styles.title}>Reset Password</Text>

              {/* New Password */}
              <Animated.View style={[styles.inputWrapper, animatedInputStyle]}>
                <TextInput
                  style={styles.input}
                  placeholder="New Password"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!visible}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => (inputFocus.value = 1)}
                  onBlur={() => (inputFocus.value = password ? 1 : 0)}
                />
                <TouchableOpacity onPress={() => setVisible(!visible)} style={styles.eyeIcon}>
                  <Ionicons name={visible ? 'eye' : 'eye-off'} size={20} color="#6b7280" />
                </TouchableOpacity>
              </Animated.View>

              {/* Password Requirements */}
              <View style={styles.passwordChecks}>
                <Text style={[styles.checkText, passwordChecks.length && styles.checkValid]}>
                  {passwordChecks.length ? '✓' : '✕'} At least 8 characters
                </Text>
                <Text style={[styles.checkText, passwordChecks.capital && styles.checkValid]}>
                  {passwordChecks.capital ? '✓' : '✕'} At least 1 capital letter
                </Text>
                <Text style={[styles.checkText, passwordChecks.number && styles.checkValid]}>
                  {passwordChecks.number ? '✓' : '✕'} At least 1 number
                </Text>
              </View>

              {/* Confirm Password */}
              <Animated.View style={[styles.inputWrapper, animatedInputStyle]}>
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  secureTextEntry={!visibleConfirm}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={() => (inputFocus.value = 1)}
                  onBlur={() => (inputFocus.value = confirmPassword ? 1 : 0)}
                />
                <TouchableOpacity onPress={() => setVisibleConfirm(!visibleConfirm)} style={styles.eyeIcon}>
                  <Ionicons name={visibleConfirm ? 'eye' : 'eye-off'} size={20} color="#6b7280" />
                </TouchableOpacity>
              </Animated.View>

              <TouchableOpacity
                onPress={handleReset}
                disabled={loading}
                style={[styles.button, loading && styles.disabledButton]}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="lock-closed" size={18} color="white" style={styles.icon} />
                    <Text style={styles.buttonText}>Reset Password</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f6f9ff',
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
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
    marginBottom: 24,
  },
  inputWrapper: {
    position: 'relative',
    marginBottom: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  input: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 14,
  },
  passwordChecks: {
    marginBottom: 16,
    gap: 6,
  },
  checkText: {
    fontSize: 14,
    color: '#ef4444',
  },
  checkValid: {
    color: '#16a34a',
  },
  button: {
    backgroundColor: '#4f46e5',
    paddingVertical: 16,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#4f46e5',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  icon: {
    marginRight: 8,
  },
});