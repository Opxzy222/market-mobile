import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Alert, ActivityIndicator, TouchableOpacity, StyleSheet } from "react-native";
import { Card, Button, Divider, Chip, Avatar } from "react-native-paper";
import Animated, { FadeInUp, FadeOut } from "react-native-reanimated";
import { useLocalSearchParams, useRouter, usePathname } from "expo-router";
import { MaterialIcons } from '@expo/vector-icons';
import axios from "axios";
import ViewReceiptPDF from "../../components/shop/ViewReceipt";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TABS = ["All", "Accepted", "Pending", "Rejected", "Voided"];

const statusStyles = {
  pending: { color: "#FFA500", label: "Pending", icon: "time-outline" },
  accepted: { color: "#4CAF50", label: "Accepted", icon: "checkmark-circle-outline" },
  rejected: { color: "#F44336", label: "Rejected", icon: "close-circle-outline" },
  voided: { color: "#9E9E9E", label: "Voided", icon: "remove-circle-outline" },
};

const ShopReceipts = () => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [sessionId, setSessionId] = useState(null);

  const params = useLocalSearchParams();
  const { shopId } = params;
  const router = useRouter();

  useEffect(() => {
    const fetchSessionId = async () => {
      const sessionIdString = await AsyncStorage.getItem("sessionToken");
      setSessionId(sessionIdString);
    };

    fetchSessionId();
  }, []);


  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    try {
      const response = await axios.get(`https://172.27.243.94:8000/shop/${shopId}/receipts/`, {
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

  const handleVoidReceipt = async (receiptId) => {
    try {
      await axios.post(`https://172.27.243.94:8000/receipts/${receiptId}/void/`);
      Alert.alert("Success", "Receipt voided successfully.");
      setReceipts((prev) =>
        prev.map((receipt) =>
          receipt.id === receiptId ? { ...receipt, status: "voided" } : receipt
        )
      );
    } catch (error) {
      Alert.alert("Error", "Failed to void receipt.");
    }
  };

  const filteredReceipts = receipts.filter((receipt) =>
    activeTab === "All" ? true : receipt.status === activeTab.toLowerCase()
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6200EE" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#007BFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        {TABS.map((tab) => (
          <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.activeTab]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {filteredReceipts.map((item) => {
        const status = statusStyles[item.status] || {};
        return (
          <Animated.View key={item.id} entering={FadeInUp} exiting={FadeOut}>
            <Card mode="elevated" style={styles.card}>
              <View style={styles.cardHeader}>
                <Avatar.Icon size={50} icon="receipt" style={styles.avatar} />
                <View style={styles.cardDetails}>
                  <Text style={styles.receiptId}>Receipt ID: {item.receipt_id}</Text>
                  <Text style={styles.receiptText}>Total: ₦{item.total_amount}</Text>
                  <Text style={styles.receiptText}>Date: {item.created_at}</Text>
                </View>
              </View>

              <Divider style={styles.divider} />

              <View style={styles.statusContainer}>
                <Chip style={[styles.statusChip, { backgroundColor: status.color }]}>
                  <Text style={styles.statusText}>{status.label}</Text>
                </Chip>
              </View>

              <Divider style={styles.divider} />

              <View style={styles.buttonContainer}>
                <ViewReceiptPDF pdf_url={item.pdf_url} />
                {item.status === "pending" && (
                  <Button
                    mode="contained"
                    icon="close"
                    onPress={() => handleVoidReceipt(item.id)}
                    style={styles.voidButton}
                  >
                    Void
                  </Button>
                )}
              </View>
            </Card>
          </Animated.View>
        );
      })}
    </ScrollView>
  );
};

export default ShopReceipts;

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
    padding: 8,
    borderRadius: 50,
    backgroundColor: "#E0E0E0",
    marginRight: 12,
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  tabText: {
    fontSize: 16,
    color: "black",
  },
  activeTab: {
    fontWeight: "bold",
    color: "#6200EE",
  },
  card: {
    marginBottom: 12,
    borderRadius: 16,
    padding: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  avatar: {
    backgroundColor: "#6200EE",
  },
  cardDetails: {
    marginLeft: 12,
  },
  receiptId: {
    fontSize: 18,
    fontWeight: "bold",
  },
  receiptText: {
    fontSize: 14,
    color: "#666",
  },
  divider: {
    marginVertical: 8,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusChip: {
    padding: 6,
  },
  statusText: {
    color: "white",
    fontWeight: "bold",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  voidButton: {
    backgroundColor: "#F44336",
  },
});
