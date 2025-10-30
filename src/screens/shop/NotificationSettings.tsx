import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Provider, Button, Switch } from 'react-native-paper';
import { MaterialIcons } from 'react-native-vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import CheckmarkModal from '@/components/shop/ModalComponent';
import Toast from 'react-native-toast-message';
import api from '../../api';

const NotificationSettings = () => {
  const router = useRouter();
  const [preferences, setPreferences] = useState({
    shop_follower: true,
    shop_review: true,
    shop_post: true,
    receipt_created: true,
    receipt_status: true,
  });
  const [loading, setLoading] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const authToken = await AsyncStorage.getItem('sessionToken');
        if (!authToken) {
          Toast.show({ type: 'error', text1: 'Not authenticated' });
          return;
        }
        const response = await api.get('/api/notification-preferences/', {
          headers: { Authorization: authToken },
        });
        setPreferences(response.data);
      } catch (error) {
        console.error('Error fetching preferences:', error);
        Toast.show({ type: 'error', text1: error.response?.data?.error || 'Network error' });
      } finally {
        setLoading(false);
      }
    };
    fetchPreferences();
  }, []);

  const togglePreference = (key: string) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const savePreferences = async () => {
    try {
      const authToken = await AsyncStorage.getItem('sessionToken');
      if (!authToken) {
        Toast.show({ type: 'error', text1: 'Not authenticated' });
        return;
      }
      const response = await api.post('/api/notification-preferences/', preferences, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: authToken,
        },
      });
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 2000);
    } catch (error) {
      console.error('Error saving preferences:', error);
      Toast.show({ type: 'error', text1: error.response?.data?.error || 'Network error' });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor="#3A7BD5" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notification Settings</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#3A7BD5" />
      <ScrollView>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.navigate("(tabs)/profile")} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notification Settings</Text>
          <View style={styles.headerSpacer} />
        </View>
        <Provider>
          <ScrollView contentContainerStyle={styles.container}>
            {[
              { key: 'shop_follower', label: 'New Space Follower' },
              { key: 'shop_review', label: 'New Space Review' },
              { key: 'shop_post', label: 'New Space Post' },
              { key: 'receipt_created', label: 'New Receipt Created' },
              { key: 'receipt_status', label: 'Receipt Status Update' },
            ].map(({ key, label }) => (
              <View key={key} style={[styles.itemContainer, !preferences[key] && styles.disabledItem]}>
                <Text style={[styles.itemLabel, !preferences[key] && styles.disabledText]}>{label}</Text>
                <Switch
                  value={preferences[key]}
                  onValueChange={() => togglePreference(key)}
                  trackColor={{ false: '#E5E7EB', true: '#3A7BD5' }}
                  thumbColor={preferences[key] ? '#FFFFFF' : '#9CA3AF'}
                />
              </View>
            ))}
            <Button
              mode="contained"
              onPress={savePreferences}
              style={styles.saveButton}
              labelStyle={styles.buttonLabel}
            >
              Save Preferences
            </Button>
            <CheckmarkModal visible={showSuccessModal} message="Preferences saved!" />
          </ScrollView>
        </Provider>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 42,
  },
  container: {
    padding: 24,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    fontSize: 16,
    color: '#1F2A44',
    fontWeight: '600',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  itemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  disabledItem: {
    backgroundColor: '#FFF1F1',
  },
  itemLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2A44',
    fontFamily: 'System',
  },
  disabledText: {
    color: '#EF4444',
  },
  saveButton: {
    marginTop: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#3A7BD5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonLabel: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default NotificationSettings;