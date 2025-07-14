import React, { useState, useEffect } from 'react';
import { View, Text, Switch, StyleSheet, Button } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

const NotificationSettings = () => {
  const [preferences, setPreferences] = useState({
    shop_follower: true,
    shop_review: true,
    shop_post: true,
    receipt_created: true,
    receipt_status: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const authToken = await AsyncStorage.getItem('sessionToken');
        if (!authToken) {
          Toast.show({ type: 'error', text1: 'Not authenticated' });
          return;
        }
        const response = await fetch('https://retail-alvinia-goza-f6a0e4f7.koyeb.app/api/notification-preferences/', {
          headers: { 'Authorization': authToken },
        });
        const data = await response.json();
        if (response.ok) {
          setPreferences(data);
        } else {
          Toast.show({ type: 'error', text1: data.error || 'Failed to fetch preferences' });
        }
      } catch (error) {
        console.error('Error fetching preferences:', error);
        Toast.show({ type: 'error', text1: 'Network error' });
      } finally {
        setLoading(false);
      }
    };
    fetchPreferences();
  }, []);

  const togglePreference = (key) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const savePreferences = async () => {
    try {
      const authToken = await AsyncStorage.getItem('sessionToken');
      if (!authToken) {
        Toast.show({ type: 'error', text1: 'Not authenticated' });
        return;
      }
      const response = await fetch('https://retail-alvinia-goza-f6a0e4f7.koyeb.app/api/notification-preferences/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken,
        },
        body: JSON.stringify(preferences),
      });
      const data = await response.json();
      if (response.ok) {
        Toast.show({ type: 'success', text1: 'Preferences saved' });
      } else {
        Toast.show({ type: 'error', text1: data.error || 'Failed to save preferences' });
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      Toast.show({ type: 'error', text1: 'Network error' });
    }
  };

  if (loading) {
    return <View style={styles.container}><Text>Loading...</Text></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notification Settings</Text>
      <View style={styles.item}>
        <Text>New Shop Follower</Text>
        <Switch
          value={preferences.shop_follower}
          onValueChange={() => togglePreference('shop_follower')}
        />
      </View>
      <View style={styles.item}>
        <Text>New Shop Review</Text>
        <Switch
          value={preferences.shop_review}
          onValueChange={() => togglePreference('shop_review')}
        />
      </View>
      <View style={styles.item}>
        <Text>New Shop Post</Text>
        <Switch
          value={preferences.shop_post}
          onValueChange={() => togglePreference('shop_post')}
        />
      </View>
      <View style={styles.item}>
        <Text>New Receipt Created</Text>
        <Switch
          value={preferences.receipt_created}
          onValueChange={() => togglePreference('receipt_created')}
        />
      </View>
      <View style={styles.item}>
        <Text>Receipt Status Update</Text>
        <Switch
          value={preferences.receipt_status}
          onValueChange={() => togglePreference('receipt_status')}
        />
      </View>
      <Button title="Save Preferences" onPress={savePreferences} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
});

export default NotificationSettings;