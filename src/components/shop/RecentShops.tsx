import React, { useState } from 'react';
import { View, Text, Image, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getFullUrl } from '../../utils/imageUtils';
import { LinearGradient } from 'expo-linear-gradient';

const RecentlyVisitedShops = ({ shops }) => {
  const [showAll, setShowAll] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleShowMore = () => {
    setShowAll(true);
  };

  const renderShopItem = ({ item }) => (
    <TouchableOpacity
      style={styles.shopCard}
      onPress={() => router.push({ pathname: '/shop/shop-page', params: { shopId: item.id } })}
    >
      <Image
        source={{ uri: getFullUrl(item.image) }}
        style={styles.shopImage}
        onError={(e) => console.error(`Image load error for shop ${item.id}:`, e.nativeEvent.error)}
      />
      <View style={styles.shopInfo}>
        <Text style={styles.shopName}>{item.name}</Text>
        <Text style={styles.visitedAt}>Visited: {new Date(item.visited_at).toLocaleDateString()}</Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#007bff" style={styles.chevronIcon} />
    </TouchableOpacity>
  );

  const shopsToDisplay = showAll ? shops : shops.slice(0, 3);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recently Visited</Text>
        <TouchableOpacity
          style={styles.seeAllContainer}
          onPress={() => router.push({ pathname: '/shop/AllRecentShops', params: { prevRoute: pathname } })}
        >
          <LinearGradient
            colors={['#3B82F6', '#1D4ED8']}
            style={styles.seeAllGradient}
          >
            <Text style={styles.seeAll}>See More</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
      <FlatList
        data={shopsToDisplay}
        renderItem={renderShopItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
      />
      {!showAll && shops.length > 3 && (
        <TouchableOpacity onPress={handleShowMore}>
          {/* <Text style={styles.showMoreText}>Show More</Text> */}
        </TouchableOpacity>
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
    marginBottom: 10,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    marginBottom: 15,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  shopImage: {
    width: 65,
    height: 65,
    borderRadius: 14,
    backgroundColor: '#f2f2f2',
  },
  shopInfo: {
    flex: 1,
    marginLeft: 15,
  },
  shopName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  visitedAt: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  chevronIcon: {
    marginLeft: 10,
  },
  showMoreButton: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#007bff',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  showMoreText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default RecentlyVisitedShops;