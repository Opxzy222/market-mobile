// components/Logout.tsx
import React, { useState, useCallback } from 'react';
import { Alert, ActivityIndicator, ToastAndroid, TouchableOpacity, Text, Platform } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api';
import { clearNonSuggestionData } from '../storage/storage';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAppReset } from '@/context/AppResetContext';

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
  const navigation = useNavigation();
  const { resetAppState } = useAppReset();
  const [loading, setLoading] = useState(false);

  const handleLogout = useCallback(async () => {
    setLoading(true);

    try {
      const sessionId = await AsyncStorage.getItem('sessionToken');
      console.log('Session ID:', sessionId);

      if (!sessionId) {
        Alert.alert('Error', 'No session found');
        setLoading(false);
        return;
      }

      const response = await api.post(
        '/logout/',
        {},
        {
          headers: { Authorization: sessionId },
        }
      );
      console.log('Logout API response status:', response.status);

      if (response.status === 200) {
        await AsyncStorage.multiRemove(['sessionToken', 'user_id']);
        await clearNonSuggestionData();
        console.log('Completed clearNonSuggestionData');

        // Navigate first
        try {
          router.replace('/');
        } catch (error) {
          console.error('Navigation error:', error);
          navigation.reset({
            index: 0,
            routes: [{ name: 'index' }],
          });
        }

        // Call resetAppState after navigation
        setTimeout(() => {
          resetAppState();
          console.log('resetAppState called after navigation');
        }, 100);

        if (Platform.OS === 'android') {
          ToastAndroid.show('Logout successful', ToastAndroid.SHORT);
        } else {
          Alert.alert('Success', 'Logout successful');
        }

        onLogoutSuccess?.();
      } else {
        Alert.alert('Error', 'Logout failed');
      }
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'An error occurred during logout');
    } finally {
      setLoading(false);
    }
  }, [onLogoutSuccess, router, navigation, resetAppState]);

  const confirmLogout = () => {
    console.log('Logout button pressed');
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