import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const FollowButton = ({ shopId }) => {
  const [following, setFollowing] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    const fetchSessionId = async () => {
      const sessionIdString = await AsyncStorage.getItem("sessionToken");
      setSessionId(sessionIdString);
    };
    fetchSessionId();
  }, []);

  useEffect(() => {
    const checkFollowingStatus = async () => {
      try {
        const userId = await AsyncStorage.getItem('user_id');
        const response = await axios.get(
          `https://retail-alvinia-goza-f6a0e4f7.koyeb.app/shops/${shopId}/followers-status/`,
          {
            params: { user_id: userId },
            headers: {
              Accept: "application/json",
            },
          }
        );
        setFollowing(response.data.following);
      } catch (error) {
        console.error('Error checking follow status:', error);
      }
    };
    checkFollowingStatus();
  }, [shopId]);

  const handleFollow = async () => {
    try {
      const userId = await AsyncStorage.getItem('user_id');
      const formData = new URLSearchParams();
      formData.append('shop_id', shopId);
      formData.append('user_id', userId);

      await axios.post(
        "https://retail-alvinia-goza-f6a0e4f7.koyeb.app/shops/follow/",
        formData.toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: sessionId,
            Accept: "application/json",
          },
        }
      );

      setFollowing(!following);
    } catch (error) {
      console.error('Error following/unfollowing shop:', error);
    }
  };

  return (
    <TouchableOpacity onPress={handleFollow} style={styles.wrapper}>
      <LinearGradient
        colors={following ? ['#4CAF50', '#388E3C'] : ['#1E88E5', '#1565C0']}
        style={styles.messageButton}
      >
        {following ? (
          <MaterialIcons name="storefront" size={16} color="#FFF" />
        ) : (
          <FontAwesome5 name="handshake" size={16} color="#FFF" />
        )}
        <Text style={styles.buttonText}>
          {following ? 'Following' : 'Follow'}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    flexShrink: 1,
    maxWidth: 140,
    minWidth: 90,
    maxHeight: 42,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
    textAlign: 'center',
  },
});

export default FollowButton;
