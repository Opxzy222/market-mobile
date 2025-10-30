import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { getFullUrl } from '../../utils/imageUtils';

const FollowedShops = ({ shops }) => {
  const [sessionId, setSessionId] = useState(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const fetchSessionId = async () => {
      const sessionIdString = await AsyncStorage.getItem('sessionToken');
      setSessionId(sessionIdString);
    };
    fetchSessionId();
  }, []);

  // Limit to 5 shops for sliding effect
  const limitedShops = [...shops].slice(0, 5);

  // Sort alphabetically by name
  const sortedShops = [...limitedShops].sort((a, b) => a.name.localeCompare(b.name));

  const renderShopItem = ({ item, index }) => (
    <Animated.View entering={FadeInUp.delay(index * 100).duration(300)}>
      <TouchableOpacity
        style={styles.shopCard}
        activeOpacity={0.9}
        onPress={() => router.push({ pathname: '/shop/shop-page', params: { shopId: item.id } })}
      >
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: getFullUrl(item.image) }}
            style={styles.shopImage}
            onError={(e) => console.error(`Image load error for shop ${item.id}:`, e.nativeEvent.error)}
          />
          <View style={styles.followBadge}>
            <Ionicons name="heart" size={14} color="#FFFFFF" />
          </View>
        </View>
        <View style={styles.shopInfo}>
          <Text style={styles.shopName} numberOfLines={1}>
            {item.name}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#6B7280" style={styles.chevronIcon} />
      </TouchableOpacity>
    </Animated.View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="heart-outline" size={48} color="#9CA3AF" style={styles.emptyIcon} />
      <Text style={styles.emptyTitle}>No Space Followed Yet</Text>
      <Text style={styles.emptySubtitle}>
        Follow your favorite shops to stay updated!
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Favorite Space</Text>
        <TouchableOpacity
          style={styles.seeAllContainer}
          onPress={() => router.push({ pathname: '/shop/AllFollowedShops', params: { prevRoute: pathname } })}
        >
          <LinearGradient
            colors={['#3B82F6', '#1D4ED8']}
            style={styles.seeAllGradient}
          >
            <Text style={styles.seeAll}>See All</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
      {shops.length === 0 ? (
        renderEmpty()
      ) : (
        <FlatList
          key="followed-list"
          data={sortedShops}
          renderItem={renderShopItem}
          keyExtractor={(item) => item.id.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          snapToInterval={120 + 8} // Card width + marginRight
          decelerationRate="fast"
          bounces={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#333',
  },
  seeAllContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  seeAllGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  seeAll: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContainer: {
    paddingBottom: 10,
  },
  shopCard: {
    width: 120, // Fixed width for all cards
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginRight: 8, // Reduced spacing between cards
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  shopImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  followBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopInfo: {
    flex: 1,
    alignItems: 'center',
  },
  shopName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 18,
  },
  shopCategory: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'center',
  },
  chevronIcon: {
    position: 'absolute',
    top: 12,
    right: 8,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default FollowedShops;