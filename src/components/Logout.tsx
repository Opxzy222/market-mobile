import React, { useState, useCallback } from 'react';
import { Alert, ActivityIndicator, ToastAndroid, TouchableOpacity, Text, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearNonSuggestionData } from '../storage/storage'; // Adjust path to your storage module
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

interface LogoutProps {
  onLogoutSuccess?: () => void;
  buttonStyle?: object;
  iconColor?: string;
  iconSize?: number;
  textStyle?: object;
}

const Logout: React.FC<LogoutProps> = ({
  onLogoutSuccess,
  buttonStyle,
  iconColor = '#D32F2F',
  iconSize = 24,
  textStyle,
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = useCallback(async () => {
    setLoading(true);

    try {
      const sessionId = await AsyncStorage.getItem('sessionToken');
      console.log('Session ID:', sessionId); // Debug: Log session token
      if (!sessionId) {
        Alert.alert('Error', 'No session found');
        setLoading(false);
        return;
      }

      // Call backend logout API
      const response = await fetch('https://retail-alvinia-goza-f6a0e4f7.koyeb.app/logout/', {
        method: 'POST',
        headers: { Authorization: sessionId },
      });
      console.log('Logout API response status:', response.status); // Debug: Log API response

      if (response.status === 200) {
        // Clear non-suggestion data
        await clearNonSuggestionData();
        console.log('Completed clearNonSuggestionData'); // Debug: Confirm clearing

        // Show success message
        if (Platform.OS === 'android') {
          ToastAndroid.show('Logout successful', ToastAndroid.SHORT);
        } else {
          Alert.alert('Success', 'Logout successful');
        }

        // Call onLogoutSuccess callback if provided
        onLogoutSuccess?.();

        // Navigate to login screen
        router.push('/');
      } else {
        Alert.alert('Error', 'Logout failed');
      }
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'An error occurred during logout');
    } finally {
      setLoading(false);
    }
  }, [onLogoutSuccess, router]);

  const confirmLogout = () => {
    console.log('Logout button pressed'); // Debug: Confirm button press
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes', onPress: handleLogout },
      ],
      { cancelable: true }
    );
  };

  return (
    <TouchableOpacity
      style={[buttonStyle, { flexDirection: 'row', alignItems: 'center' }]}
      onPress={confirmLogout}
      disabled={loading}
    >
      <Ionicons name="log-out-outline" size={iconSize} color={iconColor} />
      <Text style={[textStyle, { color: iconColor, flex: 1, marginLeft: 15 }]}>Logout</Text>
      <MaterialIcons name="navigate-next" size={iconSize} color={iconColor} />
      {loading && <ActivityIndicator size="small" color="#0000ff" style={{ marginLeft: 10 }} />}
    </TouchableOpacity>
  );
};

export default Logout;