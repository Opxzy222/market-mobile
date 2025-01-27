import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from "expo-router";
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const AllRecentlyVisitedShops = () => {
  const [shops, setShops] = useState([]);
  const [userId, setUserId] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUserId = async () => {
      // Replace with AsyncStorage if needed
      const userIdString = await AsyncStorage.getItem('user_id');
      setUserId(parseInt(userIdString, 10));
    };

    const fetchRecentlyVisitedShops = async () => {
      try {
        const response = await axios.get(
          `https://172.27.243.94:8000/shops/recently-visited/${userId}/`
        );
        setShops(response.data.recently_visited_shops);
      } catch (error) {
        console.error('Error fetching recently visited shops:', error);
      }
    };

    fetchUserId();
    if (userId) {
      fetchRecentlyVisitedShops();
    }
  }, [userId]);

  const renderShopCard = ({ item }) => (
    <View style={styles.shopCard}>
      <View style={styles.shopHeader}>
        <View style={styles.imageContainer}>
          {item.image && (
            <Image
              source={{ uri: `https://172.27.243.94:8000/${item.image}` }}
              style={styles.shopImage}
            />
          )}
        </View>
        <View style={styles.shopInfo}>
          <Text style={styles.shopName}>{item.name}</Text>
          <Text style={styles.shopAddress}>{item.address}</Text>
          <Text style={styles.visitedAt}>
            Visited on: {new Date(item.visited_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
      
      <Text style={styles.shopDescription}>{item.description}</Text>
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={styles.messageButton}
          onPress={() =>
            console.log(
              `Navigate to message shop ${item.id} (${item.name})`
            )
          }
        >
          <Text style={styles.buttonText}>Message</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.whatsappButton}
          onPress={() =>
            console.log(`Navigate to shop page ${item.id} (${item.name})`)
          }
        >
          <Text style={styles.buttonText}>Go to Shop</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#007BFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Back</Text>
        </View>
      <Text style={styles.heading}>All Recently Visited Shops</Text>
      <FlatList
        data={shops}
        renderItem={renderShopCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 20,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  listContainer: {
    paddingBottom: 20,
  },
  shopCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 20,
    padding: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  shopHeader: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  imageContainer: {
    marginRight: 10,
  },
  shopImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },
  shopInfo: {
    flex: 1,
  },
  shopName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  shopAddress: {
    fontSize: 14,
    color: '#666',
  },
  visitedAt: {
    fontSize: 12,
    color: '#999',
  },
  categoriesContainer: {
    marginVertical: 10,
  },
  categoryBadge: {
    backgroundColor: '#e0e0e0',
    color: '#555',
    borderRadius: 15,
    paddingVertical: 5,
    paddingHorizontal: 10,
    fontSize: 12,
    marginRight: 5,
  },
  shopDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  messageButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  whatsappButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default AllRecentlyVisitedShops;
