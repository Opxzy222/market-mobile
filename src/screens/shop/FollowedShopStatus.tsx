import React, { useEffect, useState } from "react";
import { 
  View, Text, FlatList, ActivityIndicator, TouchableOpacity, StyleSheet 
} from "react-native";
import axios from "axios";
import StatusViewer from "../../components/shop/StatusViewer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import StatusRing from "../../components/shop/StatusRing";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";

const FollowedShopStatusScreen = () => {
  const [statuses, setStatuses] = useState([]);
  const [viewedStatuses, setViewedStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentStatusIndex, setCurrentStatusIndex] = useState(null);
  const [userId, setUserId] = useState(null);

  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [])
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      const userIdString = await AsyncStorage.getItem("user_id");
      if (!userIdString) return;

      const userId = parseInt(userIdString, 10);
      setUserId(userId);

      const response = await axios.get(`https://172.27.243.94:8000/statuses/?user_id=${userId}`);
      const fetchedStatuses = response.data.statuses;

      const groupedStatuses = fetchedStatuses.reduce((acc, status) => {
        const shop = status.shop;
        if (!acc[shop]) {
          acc[shop] = [];
        }
        acc[shop].push(status);
        return acc;
      }, {});

      const groupedArray = Object.keys(groupedStatuses).map((shop) => ({
        shop,
        statuses: groupedStatuses[shop],
      }));

      const unviewed = groupedArray.filter(group => group.statuses.some(s => !s.viewed));
      const viewed = groupedArray.filter(group => group.statuses.every(s => s.viewed));

      setStatuses(unviewed);
      setViewedStatuses(viewed);
    } catch (error) {
      console.error("Error fetching followed shop statuses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenViewer = (index) => {
    setCurrentStatusIndex(index);
  };

  const handleCloseViewer = () => {
    setCurrentStatusIndex(null);
    fetchData(); // Refresh data after closing viewer
  };

  const renderStatusItem = ({ item, index, isViewed }) => (
    <TouchableOpacity
      onPress={() => handleOpenViewer(index)}
      style={styles.statusItem}
      activeOpacity={0.8}
    >
      <StatusRing 
        imageUri={item.statuses[0].image} 
        totalStatuses={item.statuses.length} 
        viewedStatuses={isViewed ? item.statuses.length : item.statuses.filter(s => s.viewed).length} 
      />
      <View style={styles.textContainer}>
        <Text style={styles.name}>{item.shop}</Text>
        <Text style={styles.time}>{item.statuses[0].created_at}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
  <LinearGradient colors={["#E3F2FD", "#BBDEFB"]} style={styles.container}>
    <Text style={styles.header}>Followed Shop Status</Text>
    
    {loading ? (
      <ActivityIndicator size="large" color="#25D366" />
    ) : (
      <>
        {statuses.length > 0 && (
          <>
            <Text style={styles.subHeader}>Recent Updates</Text>
            <FlatList 
              data={statuses} 
              renderItem={({ item, index }) => renderStatusItem({ item, index, isViewed: false })}
              keyExtractor={(item) => item.statuses[0].id.toString()} 
              contentContainerStyle={styles.listContainer}
            />
          </>
        )}

        {viewedStatuses.length > 0 && (
          <>
            <View style={styles.spacer} />
            <Text style={styles.subHeader}>Viewed Updates</Text>
            <FlatList 
              data={viewedStatuses} 
              renderItem={({ item, index }) => renderStatusItem({ item, index, isViewed: true })}
              keyExtractor={(item) => item.statuses[0].id.toString()} 
              contentContainerStyle={styles.listContainer}
            />
          </>
        )}

        {statuses.length === 0 && viewedStatuses.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No status updates available.</Text>
          </View>
        )}
      </>
    )}

    {currentStatusIndex !== null && (
      <StatusViewer 
        statuses={[...statuses, ...viewedStatuses]} 
        initialIndex={currentStatusIndex} 
        onClose={handleCloseViewer} 
        visible={currentStatusIndex !== null}
        userId={userId}
      />
    )}
  </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  subHeader: {
    fontSize: 18,
    fontWeight: "600",
    color: "#007bff",
    marginVertical: 12,
  },
  listContainer: {
    paddingBottom: 16,
  },
  spacer: {
    height: 20,
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 12,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  textContainer: {
    marginLeft: 15,
  },
  name: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  time: {
    fontSize: 14,
    color: "#6c757d",
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: "#6c757d",
    fontStyle: "italic",
  },
});

export default FollowedShopStatusScreen;
