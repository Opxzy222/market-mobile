import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import axios from 'axios';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ScrollView } from 'react-native-gesture-handler';

const categoryIconMap = {
  vehicles: require('../../../assets/Image/car-icon.svg'),
  electronics: require('../../../assets/Image/computer-icon.png'),
  phone: require('../../../assets/Image/phone-icon.png'),
  furniture: require('../../../assets/Image/furniture-icon.png'),
  '': require('../../../assets/Image/home-appliance-icon.png'),
  fashion: require('../../../assets/Image/wear-icon.png'),
  property: require('../../../assets/Image/property-icon.png'),
  'health & beauty': require('../../../assets/Image/health-beauty-icon2.png'),
  services: require('../../../assets/Image/services-icon.jpg'),
  'babies & kiddies': require('../../../assets/Image/babies-icon.jpg'),
  'agriculture & food': require('../../../assets/Image/agric-icon.jpg'),
};

const AllCategories = () => {
  const [categories, setCategories] = useState([]);
  const router = useRouter();
  const params = useLocalSearchParams();
  const { prevRoute } = params;

  useEffect(() => {
    axios
      .get('https://172.27.243.94:8000/all-shop-categories/')
      .then((response) => {
        const categoryArray = Object.values(response.data);
        setCategories(categoryArray);
      })
      .catch((error) => {
        console.error('Error fetching categories:', error);
      });
  }, []);

  const handleCategoryClick = (categoryId, categoryName) => {
    router.push({pathname: '/shop/SubcategoryList', params: { categoryId: categoryId, categoryName: categoryName }, });
  };

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity
      style={styles.categoryItem}
      onPress={() => handleCategoryClick(item.id, item.name)}
    >
      <Image
        source={categoryIconMap[item.name.trim().toLowerCase()]}
        style={styles.icon}
        resizeMode="contain"
      />
      <Text style={styles.categoryName}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
  <View style={{ flex: 1 }}>
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace(prevRoute || '((tabs)/shop)')} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={26} color="#007BFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Categories</Text>
      </View>
      
      <FlatList
        data={categories}
        renderItem={renderCategoryItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
        columnWrapperStyle={styles.row}
      />
    </SafeAreaView>
  </View>
);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    padding: 16,
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
    marginTop: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginLeft: 65,
    color: "black",
    marginTop: 12,
  },
  listContainer: {
    paddingBottom: 16,
  },
  row: {
    justifyContent: 'space-between',
  },
  categoryItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  icon: {
    width: 60,
    height: 60,
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#555',
    textAlign: 'center',
  },
});

export default AllCategories;
