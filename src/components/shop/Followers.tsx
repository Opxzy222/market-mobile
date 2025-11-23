import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface Follower {
  user_id: string;        // Now REQUIRED from backend
  username: string;
  image?: string | null;
  is_verified: boolean;
}

interface FollowersProps {
  followers?: Follower[] | null;
}

/**
 * Generate a **stable, unique key** for each follower.
 * Priority:
 * 1. user_id (unique per user)
 * 2. image URL (unique per upload)
 * 3. username (unique per account)
 * 4. index (fallback – warns in dev)
 */
const generateKey = (item: Follower, index: number): string => {
  if (item.user_id) {
    return item.user_id;
  }

  if (item.image) {
    // Remove query string to avoid auth token changes breaking key
    return item.image.split('?')[0];
  }

  if (item.username) {
    return item.username;
  }

  if (__DEV__) {
    console.warn(
      `Follower at index ${index} has no stable identifier:`,
      item
    );
  }

  return `fallback_${index}`;
};

const Followers = ({ followers = [] }: FollowersProps) => {
  const getColorForAlphabet = (alphabet: string) => {
    const colors: Record<string, string> = {
      A: '#FFD700', B: '#FF6347', C: '#4682B4', D: '#32CD32', E: '#FF69B4',
      F: '#8A2BE2', G: '#FF4500', H: '#DA70D6', I: '#20B2AA', J: '#B22222',
      K: '#4B0082', L: '#FF8C00', M: '#808000', N: '#FF1493', O: '#8B4513',
      P: '#B8860B', Q: '#8B0000', R: '#2E8B57', S: '#A0522D', T: '#5F9EA0',
      U: '#D2691E', V: '#9932CC', W: '#FF7F50', X: '#6495ED', Y: '#DC143C',
      Z: '#00CED1',
    };
    return colors[alphabet.toUpperCase()] || '#FFD700';
  };

  const keyExtractor = (item: Follower, index: number) =>
    generateKey(item, index);

  const renderFollower = ({ item }: { item: Follower }) => (
    <View style={styles.followerItem}>
      {item.image ? (
        <Image
          source={{ uri: item.image }}
          style={styles.followerAvatar}
          onError={(e) => {
            if (__DEV__) {
              console.warn('Failed to load follower image:', item.image);
            }
          }}
        />
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
      {Array.isArray(followers) && followers.length > 0 ? (
        <FlatList
          data={followers}
          keyExtractor={keyExtractor}
          renderItem={renderFollower}
          contentContainerStyle={styles.followerList}
          scrollEnabled={false}
          initialNumToRender={10}
          removeClippedSubviews={true}
        />
      ) : (
        <Text style={styles.noFollowersText}>No followers yet.</Text>
      )}
    </View>
  );
};

export default Followers;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
  },
  followerList: {
    paddingVertical: 10,
  },
  followerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  followerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  followerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  followerUsername: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginRight: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  verifiedIconContainer: {
    borderRadius: 12,
    padding: 4,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  noFollowersText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 24,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});