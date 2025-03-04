import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

const screenWidth = Dimensions.get('window').width;

export default function SearchResults() {
  const params = useLocalSearchParams();
  const { prevRoute } = params;
  const searchResults = params.searchResults
    ? JSON.parse(params.searchResults)
    : [];

  const router = useRouter();

  useEffect(() => {
    console.log('Search Results Updated:', searchResults);
  }, [searchResults]);

  const renderShopCard = ({ item }) => (
    <View style={styles.shopCard}>
      {/* Image Section */}
      <View style={styles.imageContainer}>
        <Text style={styles.shopName}>{item.name || 'Unnamed Shop'}</Text>
        {item.image ? (
          <Image
            source={{ uri: `https://172.27.243.94:8000/${item.image}` }}
            style={styles.shopImage}
          />
        ) : (
          <View style={styles.noImageContainer}>
            <Text style={styles.noImageText}>No Image</Text>
          </View>
        )}
      </View>

      {/* Shop Details Section */}
      <View style={styles.detailsContainer}>
        <View style={styles.row}>
          <MaterialIcons name="store" size={20} color="#4CAF50" style={styles.icon} />
          <Text style={styles.shopAddress}>{item.address || 'No Address'}</Text>
        </View>
        <View style={styles.row}>
          <MaterialIcons name="place" size={20} color="black" style={styles.icon} />
          <Text style={styles.shopDistance}>Distance: {item.distance ?? 'N/A'} km</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <TouchableOpacity
        style={styles.goToShopButton}
        onPress={() => {
          router.push({
            pathname: '/shop/shop-page',
            params: { shopId: item.id },
          });
        }}
      >
        <Text style={styles.buttonText}>Go to Shop</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace(prevRoute || '((tabs)/shop)')} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#007BFF" />
          </TouchableOpacity>
        </View>
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderShopCard}
          ListEmptyComponent={<Text style={styles.noResults}>No shops found.</Text>}
          contentContainerStyle={searchResults.length === 0 && styles.emptyListContainer}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
    padding: 15,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 10,
  },
  backButton: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  shopCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    marginVertical: 10,
    padding: 15,
  },
  imageContainer: {
    marginBottom: 10,
  },
  shopImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    resizeMode: 'cover',
    borderColor: '#e0e0e0',
    borderWidth: 1,
  },
  noImageContainer: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    fontSize: 14,
    color: '#6c757d',
  },
  shopName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  detailsContainer: {
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  icon: {
    marginRight: 8,
  },
  shopAddress: {
    fontSize: 14,
    color: '#6c757d',
  },
  shopDistance: {
    fontSize: 14,
    color: '#6c757d',
  },
  goToShopButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  noResults: {
    textAlign: 'center',
    fontSize: 16,
    color: '#6c757d',
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
