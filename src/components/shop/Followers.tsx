import React from 'react';
import { View, Text, StyleSheet, FlatList, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const Followers = ({ followers = [] }) => {
  const getColorForAlphabet = (alphabet) => {
    const colors = {
      A: '#FFD700', B: '#FF6347', C: '#4682B4', D: '#32CD32', E: '#FF69B4',
      F: '#8A2BE2', G: '#FF4500', H: '#DA70D6', I: '#20B2AA', J: '#B22222',
      K: '#4B0082', L: '#FF8C00', M: '#808000', N: '#FF1493', O: '#8B4513',
      P: '#B8860B', Q: '#8B0000', R: '#2E8B57', S: '#A0522D', T: '#5F9EA0',
      U: '#D2691E', V: '#9932CC', W: '#FF7F50', X: '#6495ED', Y: '#DC143C',
      Z: '#00CED1',
    };
    return colors[alphabet.toUpperCase()] || '#FFD700';
  };

  const renderFollower = ({ item }) => (
    <View style={styles.followerItem}>
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.followerAvatar} />
      ) : (
        <View
          style={[
            styles.followerAvatar,
            { backgroundColor: getColorForAlphabet(item.username.charAt(0)) },
          ]}
        >
          <Text style={styles.avatarText}>
            {item.username.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.followerInfo}>
        <Text style={styles.followerUsername}>{item.username}</Text>
        {item.is_verified && (
          <LinearGradient
            colors={['#34D399', '#10B981']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.verifiedIconContainer}
          >
            <MaterialIcons name="verified" size={16} color="#FFF" />
          </LinearGradient>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {followers.length > 0 ? (
        <View style={styles.followersContainer}>
          <FlatList
            data={followers}
            keyExtractor={(item) => item.username}
            renderItem={renderFollower}
            contentContainerStyle={styles.followerList}
            scrollEnabled={false}
            initialNumToRender={10}
          />
        </View>
      ) : (
        <Text style={styles.noFollowersText}>No followers yet.</Text>
      )}
    </View>
  );
};

export default Followers;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 0, // Adjusted to fit tabContent padding
    backgroundColor: '#FFFFFF', // Match tabContent
  },
  followersContainer: {
    minHeight: 200, // Ensure visibility
    maxHeight: 400, // Limit height to prevent overflow
  },
  followerList: {
    paddingVertical: 10,
  },
  followerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: '#FFF',
    padding: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  followerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  followerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  followerUsername: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginRight: 8,
  },
  verifiedIconContainer: {
    borderRadius: 12,
    padding: 4,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  noFollowersText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
  },
});