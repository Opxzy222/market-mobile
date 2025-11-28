import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaView } from "react-native-safe-area-context";
import api from '../api';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const router = useRouter();
  const pathname = usePathname();

  const handleSubmit = async () => {
    if (!email) {
      setError('Please enter your email');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await api.post('/auth/request-reset-token/', { email });

      // Success → 200 (or 201 depending on your backend)
      if (response.status === 200 || response.status === 201) {
        setMessage('A reset link has been sent to your email.');
        router.push({
          pathname: '/EnterOtp',
          params: { email, prevRoute: pathname },
        });
      }
    } catch (err: any) {
      // ──────────────────────────────────────────────────────────────
      // Properly handle all known backend error responses
      // ──────────────────────────────────────────────────────────────
      if (err.response) {
        const data = err.response.data;
        const status = err.response.status;

        if (status === 400) {
          setError(data.error || 'Invalid request. Please check your email.');
        } else if (status === 404) {
          setError(data.error || 'No account found with this email address.');
        } else if (status === 429) {
          const retryAfter = data.retry_after
            ? ` Please try again in ${data.retry_after} seconds.`
            : '';
          setError(data.error + retryAfter || 'Too many requests. Please wait before trying again.');
        } else {
          setError(data.error || `Server error (${status}). Please try again later.`);
        }
      } else if (err.request) {
        // No response received (true network error)
        setError('Network error. Please check your connection and try again.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
      <LinearGradient colors={['#f6f9ff', '#e0e7ff']} style={styles.gradient}>

        {/* === HEADER (kept exactly the same for reuse) === */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Forgot Password</Text>
          <View style={styles.headerSpacer} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.wrapper}
        >
          {/* Added top spacing so card doesn't touch the curved header */}
          <View style={styles.cardContainer}>
            <View style={styles.card}>
              <Text style={styles.title}>Forgot Password</Text>

              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#9ca3af"
              />

              {message && <Text style={styles.successText}>{message}</Text>}
              {error && <Text style={styles.errorText}>{error}</Text>}

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading}
                style={[styles.button, loading && styles.disabledButton]}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="send" size={18} color="white" style={styles.icon} />
                    <Text style={styles.buttonText}>Send Reset Link</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  
  // Header – unchanged (you said you’ll reuse it)
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

  // New container with generous top margin so card sits below header curve
  cardContainer: {
    flex: 1,
    justifyContent: 'center',   // vertically centers when content is short
    paddingTop: 40,             // This pushes the card down
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
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  successText: {
    color: '#16a34a',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#4f46e5',
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4f46e5',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  disabledButton: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  icon: { marginRight: 8 },
});