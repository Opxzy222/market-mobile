import React, { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, Alert, ActivityIndicator, TouchableOpacity } from "react-native";
import { Card, Button, Divider, Chip, Avatar } from "react-native-paper";
import Animated, { FadeInUp, FadeOut } from "react-native-reanimated";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import ViewReceiptPDF from "../../components/shop/ViewReceipt";

const TABS = ["All", "Accepted", "Pending", "Rejected", "Voided"];

const statusStyles = {
  pending: { color: "#FFA500", label: "Pending", icon: "time-outline" },
  accepted: { color: "#4CAF50", label: "Accepted", icon: "checkmark-circle-outline" },
  rejected: { color: "#F44336", label: "Rejected", icon: "close-circle-outline" },
  voided: { color: "#9E9E9E", label: "Voided", icon: "remove-circle-outline" },
};

const CustomerReceipts = () => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState(null);
  const [activeTab, setActiveTab] = useState("All");

  useEffect(() => {
    const fetchSessionId = async () => {
      const sessionIdString = await AsyncStorage.getItem("sessionToken");
      setSessionId(sessionIdString); // No need to parse as an integer
    };

    fetchSessionId();
  }, []);
  const fetchReceipts = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const response = await axios.get(`https://127.0.0.1:8000/receipts/customer/`, {
        headers: {
          Authorization: sessionId, // Send sessionId in headers
        },
      });

      setReceipts(response.data.receipts);
    } catch (error) {
      Alert.alert("Error", "Failed to fetch receipts.");
    } finally {
      setLoading(false);
    }
  };

  // Reload data when the screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchReceipts();
    }, [sessionId])
  );

  const handleAction = async (receiptId, action) => {
  try {
    await axios.post(`https://127.0.0.1:8000/receipts/${receiptId}/${action}/`);
    Alert.alert("Success", `Receipt ${action} successfully.`);

    // Convert action string to correct status format
    const newStatus = action === "accept" ? "accepted" : action === "reject" ? "rejected" : action;

    // Update receipt status immediately in the UI
    setReceipts((prev) =>
      prev.map((receipt) =>
        receipt.id === receiptId ? { ...receipt, status: newStatus } : receipt
      )
    );
  } catch (error) {
    Alert.alert("Error", `Failed to ${action} receipt.`);
  }
};

  const filteredReceipts = receipts.filter((receipt) =>
    activeTab === "All" ? true : receipt.status === activeTab.toLowerCase()
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#6200EE" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-around", marginBottom: 16 }}>
        {TABS.map((tab) => (
          <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)}>
            <Text style={{ fontSize: 16, fontWeight: activeTab === tab ? "bold" : "normal", color: activeTab === tab ? "#6200EE" : "black" }}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredReceipts}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 16 }}
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
                        Reject
                      </Button>
                    </>
                  )}
                </View>
              </Card>
            </Animated.View>
          );
        }}
      />
    </View>
  );
};

export default CustomerReceipts;
