import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FollowButton = ({ shopId }) => {
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    const checkFollowingStatus = async () => {
      try {
        const response = await axios.get(`https://172.27.243.94:8000/shops/${shopId}/followers-status/`, {
          params: { user_id: await AsyncStorage.getItem('user_id') },
        });
        setFollowing(response.data.following);
      } catch (error) {
        console.error('Error checking follow status:', error);
      }
    };

    checkFollowingStatus();
  }, [shopId]);

  const handleFollow = async () => {
    try {
      const formData = new FormData();
      formData.append('shop_id', shopId);
      formData.append('user_id', await AsyncStorage.getItem('user_id'));

      await axios.post('https://172.27.243.94:8000/shops/follow/', formData);
      setFollowing(!following);
    } catch (error) {
      console.error('Error following/unfollowing shop:', error);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.sharedButton,
        following ? styles.following : styles.notFollowing,
      ]}
      onPress={handleFollow}
    >
      <Text style={styles.buttonText}>{following ? 'Following' : 'Follow'}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
    buttons: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 10,
    },
    sharedButton: {
      paddingVertical: 10,
      paddingHorizontal: 15,
      borderRadius: 25,
      flex: 1,
      alignItems: 'center',
    },
    messageButton: {
      backgroundColor: '#007bff', // Consistent with FollowButton styling
      
    },
    following: {
      backgroundColor: '#28a745', // Green for "Following"
    },
    notFollowing: {
      backgroundColor: 'black', // Orange for "Follow"
    },
    buttonText: {
      color: '#fff',
      fontWeight: '600',
      textAlign: 'center',
      fontSize: 14,
    },
  });  
  
export default FollowButton;
