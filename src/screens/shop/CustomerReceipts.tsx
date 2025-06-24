// src/screens/CustomerReceipts.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  Platform, Modal, StatusBar
} from "react-native";
import { Card, Divider, Chip } from "react-native-paper";
import Animated, { FadeInUp, FadeOut } from "react-native-reanimated";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import DateTimePicker from "@react-native-community/datetimepicker";
import ViewReceiptPDF from "../../components/shop/ViewReceipt";
import { useRouter } from "expo-router";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
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
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerType, setPickerType] = useState(null);
  const [tempDate, setTempDate] = useState(new Date());
  const router = useRouter();

  // Fetch session ID
  useEffect(() => {
    const fetchSessionId = async () => {
      try {
        const sessionIdString = await AsyncStorage.getItem("sessionToken");
        console.log("Fetched session ID:", sessionIdString);
        setSessionId(sessionIdString);
      } catch (error) {
        console.error("Error fetching session ID:", error);
      }
    };
    fetchSessionId();
  }, []);

  // Fetch receipts
  const fetchReceipts = useCallback(async () => {
    if (!sessionId) {
      console.warn("No session ID, skipping fetch");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      console.log("Fetching receipts from API...");
      const response = await axios.get(
        `https://retail-alvinia-goza-f6a0e4f7.koyeb.app/receipts/customer/`,
        {
          headers: {
            Authorization: sessionId,
          },
        }
      );
      const fetchedReceipts = Array.isArray(response.data.receipts)
        ? response.data.receipts.filter((item) => item && typeof item === "object" && item.id)
        : [];
      console.log("Receipts fetched:", fetchedReceipts.length, "Data:", JSON.stringify(fetchedReceipts, null, 2));
      setReceipts(fetchedReceipts);
    } catch (error) {
      console.error("Error fetching receipts:", error.response?.data || error.message);
      Alert.alert("Error", "Failed to fetch receipts.");
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useFocusEffect(
    useCallback(() => {
      fetchReceipts();
    }, [fetchReceipts])
  );

  // Reset filter states when tab changes
  useEffect(() => {
    console.log("Active tab changed to:", activeTab);
    setStartDate(null);
    setEndDate(null);
    setFilterModalVisible(false);
    setPickerVisible(false);
    setPickerType(null);
  }, [activeTab]);

  // Handle accept/reject actions
  const handleAction = async (receiptId, action) => {
    const actionTitle = action === "accept" ? "Accept" : "Reject";
    return new Promise((resolve) => {
      Alert.alert(
        `${actionTitle} Receipt`,
        `Are you sure you want to ${action} this receipt?`,
        [
          { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
          {
            text: "Confirm",
            onPress: async () => {
              try {
                await axios.post(
                  `https://retail-alvinia-goza-f6a0e4f7.koyeb.app/receipts/${receiptId}/${action}/`,
                  {},
                  {
                    headers: { Authorization: sessionId },
                  }
                );
                Alert.alert("Success", `Receipt ${action}ed successfully.`);
                const newStatus = action === "accept" ? "accepted" : "rejected";
                setReceipts((prev) =>
                  prev.map((receipt) =>
                    receipt.id === receiptId ? { ...receipt, status: newStatus } : receipt
                  )
                );
                resolve(true);
              } catch (error) {
                console.error(`Error ${action}ing receipt:`, error.response?.data || error.message);
                Alert.alert("Error", `Failed to ${action} receipt.`);
                resolve(false);
              }
            },
          },
        ]
      );
    });
  };

  // Format date for display
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) return "Today";
    if (isYesterday) return "Yesterday";
    return date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Handle DateTimePicker change
  const handleDateChange = (event, selectedDate) => {
    console.log("DateTimePicker event:", event.type, "Date:", selectedDate);
    setPickerVisible(Platform.OS === "ios");
    if (event.type === "dismissed" || !selectedDate) {
      setPickerVisible(false);
      setPickerType(null);
      return;
    }

    const date = new Date(selectedDate);
    if (pickerType === "start") {
      if (endDate && date > endDate) {
        Alert.alert("Invalid Date", "Start date cannot be after end date.");
        return;
      }
      setStartDate(date);
    } else {
      if (startDate && date < startDate) {
        Alert.alert("Invalid Date", "End date cannot be before start date.");
        return;
      }
      setEndDate(date);
    }
    setPickerVisible(false);
    setPickerType(null);
  };

  // Show DateTimePicker
  const showDatePicker = (type) => {
    console.log("Showing DateTimePicker for:", type, "Tab:", activeTab);
    setPickerType(type);
    setTempDate(type === "start" && startDate ? startDate : type === "end" && endDate ? endDate : new Date());
    setPickerVisible(true);
  };

  // Filter receipts
  const filteredReceipts = useCallback(() => {
    console.log("Filtering receipts for tab:", activeTab);
    const filtered = receipts.filter((receipt) => {
      if (!receipt || typeof receipt !== "object" || !receipt.id) {
        console.warn("Invalid receipt in filter:", receipt);
        return false;
      }
      const receiptDate = new Date(receipt.created_at);
      const receiptStatus = receipt.status?.toLowerCase() || "";
      const tabStatus = activeTab.toLowerCase();

      const matchesStatus = tabStatus === "all" || receiptStatus === tabStatus;

      let matchesDate = true;
      if (startDate) {
        matchesDate = matchesDate && receiptDate >= new Date(startDate.setHours(0, 0, 0, 0));
      }
      if (endDate) {
        matchesDate = matchesDate && receiptDate <= new Date(endDate.setHours(23, 59, 59, 999));
      }

      const matches = matchesStatus && matchesDate;
      console.log(`Receipt ${receipt.id} matches:`, matches);
      return matches;
    });
    return filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [receipts, activeTab, startDate, endDate]);

  // Prepare data for FlatList with separators
  const flatData = [];
  let lastDate = null;
  filteredReceipts().forEach((receipt) => {
    const dateKey = formatDate(receipt.created_at);
    if (dateKey !== lastDate) {
      flatData.push({ type: "separator", date: dateKey });
      lastDate = dateKey;
    }
    flatData.push({ type: "receipt", data: receipt });
  });

  // Render navigation bar
  const renderNavBar = () => (
    <View style={styles.navBar}>
      <View style={styles.navBarInner}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.navButton, activeTab === tab && styles.activeNavButton]}
            onPress={() => {
              console.log("Switching to tab:", tab);
              setActiveTab(tab);
            }}
            accessibilityLabel={`${tab} Receipts Tab`}
          >
            <Text
              style={[
                styles.navButtonText,
                activeTab === tab && styles.activeNavButtonText,
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {tab}
            </Text>
            {activeTab === tab && (
              <LinearGradient
                colors={["#2563EB", "#10B981"]}
                style={styles.underline}
              />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Render filter modal
  const renderFilterModal = () => (
    <Modal
      visible={filterModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        console.log("Closing filter modal via backdrop");
        setFilterModalVisible(false);
        setPickerVisible(false);
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.bottomSheetHandle} />
          <Text style={styles.modalTitle}>Filter by Date</Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => showDatePicker("start")}
            accessibilityLabel="Select Start Date"
          >
            <Text style={styles.dateInputText}>
              {startDate ? startDate.toLocaleDateString("en-US") : "Select Start Date"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => showDatePicker("end")}
            accessibilityLabel="Select End Date"
          >
            <Text style={styles.dateInputText}>
              {endDate ? endDate.toLocaleDateString("en-US") : "Select End Date"}
            </Text>
          </TouchableOpacity>
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.applyFilterButton}
              onPress={() => {
                console.log("Applying filter");
                setFilterModalVisible(false);
                setPickerVisible(false);
              }}
            >
              <LinearGradient
                colors={["#2563EB", "#10B981"]}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>Apply</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.clearFilterButton}
              onPress={() => {
                console.log("Clearing filter");
                setStartDate(null);
                setEndDate(null);
                setFilterModalVisible(false);
                setPickerVisible(false);
              }}
            >
              <Text style={styles.clearFilterButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
        {pickerVisible && (
          <DateTimePicker
            value={tempDate}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "default"}
            onChange={handleDateChange}
            maximumDate={new Date()}
            style={styles.dateTimePicker}
            textColor="#111827"
          />
        )}
      </View>
    </Modal>
  );

  // Render FlatList item
  const renderItem = ({ item }) => {
    if (item.type === "separator") {
      return (
        <View style={styles.dateHeader}>
          <Text style={styles.dateHeaderText}>{item.date}</Text>
          <LinearGradient
            colors={["#2563EB", "#10B981"]}
            style={styles.dateHeaderUnderline}
          />
        </View>
      );
    }

    const receipt = item.data;
    const status = statusStyles[receipt.status] || {};
    return (
      <Animated.View key={receipt.id} entering={FadeInUp} exiting={FadeOut}>
        <Card mode="elevated" style={styles.card}>
          <View style={styles.cardHeader}>
            <Image
              source={{
                uri: receipt.shop_image || "https://via.placeholder.com/40",
              }}
              style={styles.image}
            />
            <View style={styles.cardDetails}>
              <Text style={styles.receiptId}>{receipt.shop}</Text>
              <Text style={styles.receiptText}>Total: ₦{receipt.total_amount}</Text>
              <Text style={styles.receiptText}>Date: {formatDate(receipt.created_at)}</Text>
            </View>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.statusContainer}>
            <Chip style={[styles.statusChip, { backgroundColor: status.color }]}>
              <Ionicons name={status.icon} size={16} color="white" />
              <Text style={styles.statusText}>{status.label}</Text>
            </Chip>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.buttonContainer}>
            <ViewReceiptPDF receipt={receipt} />
            {receipt.status === "pending" && (
              <>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleAction(receipt.id, "accept")}
                >
                  <Ionicons name="checkmark-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => handleAction(receipt.id, "reject")}
                >
                  <Ionicons name="close-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Reject</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Card>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#6200EE" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor='#2563EB' />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={26} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Customer Receipts</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.content}>
        {renderNavBar()}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => {
              console.log("Opening filter modal for tab:", activeTab);
              setFilterModalVisible(true);
            }}
            accessibilityLabel="Filter by Date"
          >
            <Ionicons name="filter-outline" size={20} color="#2563EB" />
            <Text style={styles.filterButtonText}>Filter by Date</Text>
          </TouchableOpacity>
          {(startDate || endDate) && (
            <Text style={styles.filterInfoText}>
              Filtered: {startDate ? startDate.toLocaleDateString("en-US") : "Start"} -{" "}
              {endDate ? endDate.toLocaleDateString("en-US") : "End"}
            </Text>
          )}
        </View>
        {flatData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={60} color="#9E9E9E" />
            <Text style={styles.emptyText}>No Receipts Yet</Text>
            <Text style={styles.emptySubText}>Start shopping to see your receipts here!</Text>
          </View>
        ) : (
          <FlatList
            data={flatData}
            keyExtractor={(item, index) =>
              item.type === "separator" ? `sep-${item.date}` : `rec-${item.data.id}`
            }
            renderItem={renderItem}
            contentContainerStyle={styles.flatListContent}
          />
        )}
        {renderFilterModal()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7FAFC",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: "#3A7BD5",
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  backButton: {
    padding: 5,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
    flex: 1,
  },
  headerSpacer: {
    width: 42,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  flatListContent: {
    paddingBottom: 100,
  },
  navBar: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    elevation: 4,
    marginBottom: 16,
  },
  navBarInner: {
    flexDirection: "row",
    flex: 1,
  },
  navButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    borderRadius: 5,
    marginHorizontal: 4,
  },
  activeNavButton: {
    backgroundColor: "rgba(37, 99, 235, 0.1)",
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  activeNavButtonText: {
    color: "#2563EB",
  },
  underline: {
    height: 3,
    width: "100%",
    marginTop: 4,
    borderRadius: 2,
  },
  filterContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB",
    marginLeft: 6,
  },
  filterInfoText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1F2A44",
  },
  dateHeader: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    marginTop: 12,
  },
  dateHeaderText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  dateHeaderUnderline: {
    height: 2,
    borderRadius: 1,
    marginTop: 4,
  },
  card: {
    marginBottom: 12,
    borderRadius: 16,
    padding: 10,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  image: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 3,
    borderColor: "#3A7BD5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardDetails: {
    marginLeft: 12,
    flex: 1,
  },
  receiptId: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  receiptText: {
    fontSize: 14,
    color: "#666",
  },
  divider: {
    marginVertical: 8,
    backgroundColor: "#E5E7EB",
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
    fontSize: 13,
    marginLeft: 4,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    gap: 8,
    flexWrap: "wrap",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#4CAF50",
  },
  rejectButton: {
    backgroundColor: "#F44336",
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 32,
    maxHeight: Platform.OS === "ios" ? 400 : 300,
    zIndex: 1001,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#D1D5DB",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 16,
  },
  dateInput: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
    backgroundColor: "#F9FAFB",
  },
  dateInputText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2A44",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 8,
  },
  applyFilterButton: {
    flex: 1,
    borderRadius: 12,
  },
  clearFilterButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  buttonGradient: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  clearFilterButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB",
  },
  dateTimePicker: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    zIndex: 1002,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#9E9E9E",
    textAlign: "center",
    marginTop: 12,
  },
  emptySubText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#9E9E9E",
    textAlign: "center",
    marginTop: 4,
  },
});

export default CustomerReceipts;