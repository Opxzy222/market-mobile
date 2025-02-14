import React, { useEffect, useState } from "react";
import { 
  View, Text, FlatList, ActivityIndicator, TouchableOpacity, StyleSheet 
} from "react-native";
import axios from "axios";
import StatusViewer from "../../components/shop/StatusViewer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import StatusRing from "../../components/shop/StatusRing";
import { useFocusEffect } from "@react-navigation/native";

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

  const markStatusesAsViewed = async (statusIds) => {
  if (!statusIds || statusIds.length === 0) {
    console.warn("No valid status IDs to mark as viewed.");
    return;
  }

  try {
    console.log("Marking statuses as viewed:", statusIds);

    // Use FormData to send status_ids[] as an array
    const formData = new FormData();
    formData.append("user_id", userId?.toString() || "");
    statusIds.forEach(id => formData.append("status_ids[]", id)); // Append each ID separately

    await axios.post(
      "https://172.27.243.94:8000/mark_status_viewed/",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } } // Ensure correct content type
    );

    fetchData();
  } catch (error) {
    console.error("Error marking statuses as viewed:", error);
  }
};

  const handleOpenViewer = async (index, isViewed) => {
    setCurrentStatusIndex(index);
    const selectedShopStatuses = isViewed ? viewedStatuses : statuses;
    const selectedStatuses = selectedShopStatuses[index]?.statuses || [];

    console.log("Selected statuses:", selectedStatuses);
    
    const unviewedStatusIds = selectedStatuses
      .filter(s => !s.viewed && s.id)
      .map(s => s.id);

    console.log("Unviewed Status IDs:", unviewedStatusIds);
    
    if (unviewedStatusIds.length > 0) {
      await markStatusesAsViewed(unviewedStatusIds);
    }
  };

  const handleCloseViewer = () => {
    setCurrentStatusIndex(null);
  };

  const renderStatusItem = ({ item, index, isViewed }) => (
    <TouchableOpacity onPress={() => handleOpenViewer(index, isViewed)} style={styles.statusItem}>
      <StatusRing 
  imageUri={item.statuses[0].image} 
  totalStatuses={item.statuses.length} 
  viewedStatuses={isViewed ? item.statuses.length : item.statuses.filter(s => s.viewed).length} 
/>
      <View>
        <Text style={styles.name}>{item.shop}</Text>
        <Text style={styles.time}>{item.statuses[0].created_at}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Followed Shop Status</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#25D366" />
      ) : (
        <>
          <Text style={styles.subHeader}>Recent Updates</Text>
          <FlatList 
            data={statuses} 
            renderItem={({ item, index }) => renderStatusItem({ item, index, isViewed: false })}
            keyExtractor={(item) => item.statuses[0].id.toString()} 
            contentContainerStyle={{ paddingBottom: 10 }}
          />

          <View style={styles.spacer} />

          <Text style={styles.subHeader}>Viewed Updates</Text>
          <FlatList 
            data={viewedStatuses} 
            renderItem={({ item, index }) => renderStatusItem({ item, index, isViewed: true })}
            keyExtractor={(item) => item.statuses[0].id.toString()} 
            contentContainerStyle={{ paddingBottom: 10 }}
          />
        </>
      )}

      {currentStatusIndex !== null && (
        <StatusViewer 
          statuses={[...statuses, ...viewedStatuses]} 
          initialIndex={currentStatusIndex} 
          onClose={handleCloseViewer} 
          visible={currentStatusIndex !== null}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 15 },
  header: { fontSize: 22, fontWeight: "bold", marginBottom: 10 },
  subHeader: { fontSize: 18, fontWeight: "600", marginVertical: 10 },
  spacer: { height: 20 },
  statusItem: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  name: { fontSize: 16, fontWeight: "bold" },
  time: { fontSize: 14, color: "gray" },
});

export default FollowedShopStatusScreen;
