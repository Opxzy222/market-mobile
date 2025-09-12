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
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [visibleConfirm, setVisibleConfirm] = useState(false);

  const router = useRouter();
  const params = useLocalSearchParams();
  const { token, email } = params;

  console.log(email, 'email')
  console.log(token, 'token')

  const validatePassword = (password) => ({
    length: password.length >= 8,
    capital: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
  });

  const passwordChecks = validatePassword(password);

  const handleReset = async () => {
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (!passwordChecks.length || !passwordChecks.capital || !passwordChecks.number) {
      Alert.alert("Error", "Password must be at least 8 characters, include a capital letter and a number");
      return;
    }

    setLoading(true);

    try {
  const res = await fetch('https://retail-alvinia-goza-f6a0e4f7.koyeb.app/password-reset/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reset_token: token,
      password: password,
      confirm_password: confirmPassword,
      email: email
    }),
  });

  const data = await res.json();
  console.log(data, 'data');

  if (res.ok && data.message === "Password reset successful.") {
    Alert.alert("Success", data.message, [
      { text: "OK", onPress: () => router.replace("/login") },
    ]);
  } else {
    Alert.alert("Error", data.error || "Something went wrong.");
  }

} catch (err) {
  Alert.alert("Network Error", "Please check your internet and try again.");
}

    setLoading(false);
  };

  return (
    <LinearGradient colors={['#f6f9ff', '#e0e7ff']} style={styles.gradient}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.wrapper}>
        <View style={styles.card}>
          <Text style={styles.title}>Reset Password</Text>

          {/* New Password */}
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="New Password"
              placeholderTextColor="#5A5A5A"
              secureTextEntry={!visible}
              value={password}
              onChangeText={setPassword}
              placeholderTextColor="#9ca3af"
            />
            <TouchableOpacity onPress={() => setVisible(!visible)} style={styles.eyeIcon}>
              <Ionicons name={visible ? 'eye' : 'eye-off'} size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Password Requirements */}
          <View style={styles.passwordChecks}>
            <Text style={{ color: passwordChecks.length ? 'green' : 'red' }}>✔ At least 8 characters</Text>
            <Text style={{ color: passwordChecks.capital ? 'green' : 'red' }}>✔ At least 1 capital letter</Text>
            <Text style={{ color: passwordChecks.number ? 'green' : 'red' }}>✔ At least 1 number</Text>
          </View>

          {/* Confirm Password */}
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              secureTextEntry={!visibleConfirm}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholderTextColor="#9ca3af"
            />
            <TouchableOpacity onPress={() => setVisibleConfirm(!visibleConfirm)} style={styles.eyeIcon}>
              <Ionicons name={visibleConfirm ? 'eye' : 'eye-off'} size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

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
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  wrapper: {
    width: '100%',
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
  inputWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 14,
  },
  passwordChecks: {
    marginBottom: 16,
    gap: 4,
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
});
