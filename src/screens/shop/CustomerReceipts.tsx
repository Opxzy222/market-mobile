import React, { useEffect, useState } from "react";
import { View, Text, FlatList, Alert, ActivityIndicator } from "react-native";
import { Card, Button, Divider, Chip, Avatar } from "react-native-paper";
import Animated, { FadeInUp, FadeOut } from "react-native-reanimated";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import ViewReceiptPDF from '../../components/shop/ViewReceipt';

const statusStyles = {
  pending: { color: "#FFA500", label: "Pending", icon: "time-outline" },
  accepted: { color: "#4CAF50", label: "Accepted", icon: "checkmark-circle-outline" },
  rejected: { color: "#F44336", label: "Rejected", icon: "close-circle-outline" },
  voided: { color: "#9E9E9E", label: "Voided", icon: "remove-circle-outline" },
};

const CustomerReceipts = () => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const userIdString = await AsyncStorage.getItem("user_id");
      if (userIdString) {
        setUserId(parseInt(userIdString, 10));
      }
    };

    fetchUserData();
  }, []);
  
  useEffect(() => {
    if (!userId) return;

    const fetchReceipts = async () => {
      try {
        const response = await axios.get(`https://172.27.243.94:8000/receipts/customer/?user=${userId}`);
        setReceipts(response.data.receipts);
      } catch (error) {
        Alert.alert("Error", "Failed to fetch receipts.");
      } finally {
        setLoading(false);
      }
    };

    fetchReceipts();
  }, [userId]);

  const handleAction = async (receiptId, action) => {
    try {
      await axios.post(`https://172.27.243.94:8000/receipts/${receiptId}/${action}/`);
      Alert.alert("Success", `Receipt ${action} successfully.`);
      setReceipts((prev) =>
        prev.map((receipt) =>
          receipt.id === receiptId ? { ...receipt, status: action } : receipt
        )
      );
    } catch (error) {
      Alert.alert("Error", `Failed to ${action} receipt.`);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#6200EE" />
      </View>
    );
  }

  return (
    <FlatList
      data={receipts}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={{ padding: 16 }}
      renderItem={({ item }) => {
        const status = statusStyles[item.status] || {};
        return (
          <Animated.View entering={FadeInUp} exiting={FadeOut}>
            <Card mode="elevated" style={{ marginBottom: 12, borderRadius: 16, padding: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                <Avatar.Icon size={50} icon="store" style={{ backgroundColor: "#6200EE" }} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={{ fontSize: 18, fontWeight: "bold" }}>{item.shop}</Text>
                  <Text style={{ fontSize: 14, color: "#666" }}>Total: ₦{item.total_amount}</Text>
                </View>
              </View>
              
              <Divider style={{ marginVertical: 8 }} />

              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Chip style={{ backgroundColor: status.color, padding: 6 }}>
                  <Ionicons name={status.icon} size={16} color="white" />
                  <Text style={{ color: "white", fontWeight: "bold", marginLeft: 5 }}>
                    {status.label}
                  </Text>
                </Chip>
              </View>

              <Divider style={{ marginVertical: 12 }} />

              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <ViewReceiptPDF pdf_url={item.pdf_url} />
                {item.status === "pending" && (
                  <>
                    <Button
                      mode="contained"
                      icon="check"
                      onPress={() => handleAction(item.id, "accept")}
                      style={{ backgroundColor: "#4CAF50" }}
                    >
                      Accept
                    </Button>
                    <Button
                      mode="contained"
                      icon="close"
                      onPress={() => handleAction(item.id, "reject")}
                      style={{ backgroundColor: "#F44336" }}
                    >
                      Decline
                    </Button>
                  </>
                )}
              </View>
            </Card>
          </Animated.View>
        );
      }}
    />
  );
};

export default CustomerReceipts;
