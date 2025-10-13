import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import api from '../../api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const FollowButton = ({ shopId, onPress }) => {
  const [following, setFollowing] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    const fetchSessionId = async () => {
      const sessionIdString = await AsyncStorage.getItem('sessionToken');
      setSessionId(sessionIdString);
    };
    fetchSessionId();
  }, []);

  useEffect(() => {
    const checkFollowingStatus = async () => {
      try {
        const userId = await AsyncStorage.getItem('user_id');
        const response = await api.get(
          `/shops/${shopId}/followers-status/`,
          {
            params: { user_id: userId },
            headers: {
              Accept: 'application/json',
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

      await api.post(
        '/shops/follow/',
        formData.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: sessionId,
            Accept: 'application/json',
          },
        }
      );

      setFollowing(!following);
      onPress?.();
    } catch (error) {
      console.error('Error following/unfollowing shop:', error);
    }
  };

  return (
    <TouchableOpacity
      onPress={handleFollow}
      style={styles.wrapper}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={following ? ['#22C55E', '#16A34A'] : ['#3B82F6', '#1D4ED8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.followButton}
      >
        {following ? (
          <MaterialIcons name="storefront" size={18} color="#FFF" style={styles.icon} />
        ) : (
          <FontAwesome5 name="handshake" size={16} color="#FFF" style={styles.icon} />
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
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    minWidth: 100,
    gap: 6,
  },
  icon: {
    marginRight: 6,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    textAlign: 'center',
  },
});

export default FollowButton;