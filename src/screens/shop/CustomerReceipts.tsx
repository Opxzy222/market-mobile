import React, { useEffect, useState, useCallback, useMemo } from "react";
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
  Modal,
  StatusBar,
} from "react-native";
import { Card, Divider, Chip } from "react-native-paper";
import Animated, { FadeInUp, FadeOut } from "react-native-reanimated";
import api from '../../api';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import DatePicker from "react-native-date-picker";
import { Picker } from "@react-native-picker/picker";
import ViewReceiptPDF from "../../components/shop/ViewReceipt";
import { useRouter } from "expo-router";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TABS = ["All", "Accepted", "Pending", "Rejected", "Voided"];
const FALLBACK_IMAGE = "https://f003.backblazeb2.com/file/gogo-digital-media/profile_picture/default/user_default.png";

const statusStyles = {
  pending: { color: "#F59E0B", label: "Pending", icon: "time-outline" },
  accepted: { color: "#22C55E", label: "Accepted", icon: "checkmark-circle-outline" },
  rejected: { color: "#EF4444", label: "Rejected", icon: "close-circle-outline" },
  voided: { color: "#6B7280", label: "Voided", icon: "remove-circle-outline" },
};

// Memoized Receipt Card Component
const ReceiptCard = React.memo(({ item, handleAction }) => {
  const receipt = item.data;
  const status = statusStyles[receipt.status?.toLowerCase()] || {};

  return (
    <Animated.View entering={FadeInUp.duration(300)} exiting={FadeOut.duration(200)}>
      <Card mode="elevated" style={styles.card}>
        <TouchableOpacity activeOpacity={0.7} style={styles.cardTouchable}>
          <LinearGradient
            colors={["rgba(255, 255, 255, 0.95)", "rgba(241, 245, 249, 0.95)"]}
            style={styles.cardBackground}
          >
            <View style={styles.cardHeader}>
              <Image
                source={{ uri: receipt.shop_image || FALLBACK_IMAGE }}
                style={styles.image}
                onError={(e) => console.error(`Image load error for ${receipt.shop_image}:`, e.nativeEvent.error)}
              />
              <View style={styles.cardDetails}>
                <Text style={styles.receiptId} numberOfLines={1}>
                  {receipt.shop || "Unknown Shop"}
                </Text>
                <View style={styles.receiptInfo}>
                  <Text style={styles.receiptText}>₦{receipt.total_amount || "0.00"}</Text>
                  <Text style={styles.receiptText}>• {formatDate(receipt.created_at)}</Text>
                </View>
                <View style={styles.statusContainer}>
                  <Chip
                    style={[styles.statusChip, { backgroundColor: status.color || "#6B7280" }]}
                  >
                    <Ionicons name={status.icon || "help-circle-outline"} size={14} color="#FFF" />
                    <Text style={styles.statusText}>{status.label || "Unknown"}</Text>
                  </Chip>
                </View>
              </View>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.buttonContainer}>
              <ViewReceiptPDF receipt={receipt} />
              {receipt.status?.toLowerCase() === "pending" && (
                <>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleAction(receipt.id, "accept")}
                  >
                    <LinearGradient colors={["#22C55E", "#16A34A"]} style={styles.buttonGradient}>
                      <Ionicons name="checkmark-outline" size={16} color="#FFF" />
                      <Text style={styles.actionButtonText}>Accept</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleAction(receipt.id, "reject")}
                  >
                    <LinearGradient colors={["#EF4444", "#DC2626"]} style={styles.buttonGradient}>
                      <Ionicons name="close-outline" size={16} color="#FFF" />
                      <Text style={styles.actionButtonText}>Reject</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Card>
    </Animated.View>
  );
});

// Format date for display
const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Invalid";
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

const CustomerReceipts = () => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState(null);
  const [activeTab, setActiveTab] = useState("All");
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [tempStartDate, setTempStartDate] = useState(null); // Temporary start date
  const [tempEndDate, setTempEndDate] = useState(null); // Temporary end date
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerType, setPickerType] = useState(null);
  const [tempDate, setTempDate] = useState(new Date());
  const [spendingMonth, setSpendingMonth] = useState(new Date().getMonth());
  const [spendingYear, setSpendingYear] = useState(new Date().getFullYear());
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const router = useRouter();

  // Fetch session ID
  useEffect(() => {
    const fetchSessionId = async () => {
      try {
        const sessionIdString = await AsyncStorage.getItem("sessionToken");
        console.log("Fetched session ID:", sessionIdString || "null");
        if (!sessionIdString) {
          Alert.alert("Error", "Please log in to view receipts.", [
            { text: "OK", onPress: () => router.push("/login") },
          ]);
          setLoading(false);
          return;
        }
        setSessionId(sessionIdString);
      } catch (error) {
        console.error("Error fetching session ID:", error);
        Alert.alert("Error", "Failed to load session.");
        setLoading(false);
      }
    };
    fetchSessionId();
  }, [router]);

  // Fetch receipts
  const fetchReceipts = useCallback(async () => {
    if (!sessionId) {
      console.warn("No session ID, skipping fetch");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      console.log("Fetching receipts with sessionId:", sessionId);
      const response = await api.get("/receipts/customer/", {
        headers: { Authorization: sessionId },
      });
      const fetchedReceipts = Array.isArray(response.data.receipts)
        ? response.data.receipts.filter(
            (item) => item && typeof item === "object" && item.id && item.created_at
          )
        : [];
      console.log("Fetched receipts:", fetchedReceipts.length);
      setReceipts(fetchedReceipts);
    } catch (error) {
      console.error("Error fetching receipts:", error.response?.data || error.message);
      Alert.alert("Error", "Failed to fetch receipts. Please try again.");
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useFocusEffect(
    useCallback(() => {
      console.log("Screen focused, fetching receipts...");
      fetchReceipts();
    }, [fetchReceipts])
  );

  // Reset filter states when tab changes
  useEffect(() => {
    console.log("Active tab changed to:", activeTab);
    setStartDate(null);
    setEndDate(null);
    setTempStartDate(null); // Reset temporary dates
    setTempEndDate(null);
    setFilterModalVisible(false);
    setPickerVisible(false);
    setPickerType(null);
  }, [activeTab]);

  // Handle accept/reject actions
  const handleAction = useCallback(
    async (receiptId, action) => {
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
                  await api.post(
                    `/receipts/${receiptId}/${action}/`,
                    {},
                    { headers: { Authorization: sessionId } }
                  );
                  Alert.alert("Success", `Receipt ${action}ed.`);
                  setReceipts((prev) =>
                    prev.map((receipt) =>
                      receipt.id === receiptId ? { ...receipt, status: action + "ed" } : receipt
                    )
                  );
                  resolve(true);
                } catch (error) {
                  console.error(`Error ${action}ing receipt:`, error.response?.data || error.message);
                  Alert.alert("Error", `Failed to ${action} receipt. Please try again.`);
                  resolve(false);
                }
              },
            },
          ]
        );
      });
    },
    [sessionId]
  );

  // Handle DatePicker change
  const handleDateChange = useCallback(
    (selectedDate) => {
      console.log("Date selected:", selectedDate);
      if (!selectedDate || isNaN(selectedDate.getTime())) {
        console.log("Invalid date selected");
        setPickerVisible(false);
        setPickerType(null);
        return;
      }
      if (pickerType === "start") {
        setTempStartDate(selectedDate); // Store in temp state
        console.log("Temp start date set:", selectedDate);
      } else if (pickerType === "end") {
        setTempEndDate(selectedDate); // Store in temp state
        console.log("Temp end date set:", selectedDate);
      }
      setPickerVisible(false);
      setPickerType(null);
    },
    [pickerType]
  );

  // Handle Apply button press
  const handleApplyFilters = useCallback(() => {
    // Validate dates before applying
    if (tempStartDate && tempEndDate && tempStartDate > tempEndDate) {
      Alert.alert("Invalid Date", "Start date cannot be after end date.");
      return;
    }
    setStartDate(tempStartDate); // Update actual startDate
    setEndDate(tempEndDate); // Update actual endDate
    console.log("Applying date filter:", { startDate: tempStartDate, endDate: tempEndDate });
    setFilterModalVisible(false); // Close modal
  }, [tempStartDate, tempEndDate]);

  // Show DatePicker
  const showDatePicker = useCallback(
    (type) => {
      console.log("Opening DatePicker for type:", type);
      setPickerType(type);
      setTempDate(
        type === "start" && tempStartDate
          ? tempStartDate
          : type === "end" && tempEndDate
          ? tempEndDate
          : new Date()
      );
      setPickerVisible(true);
    },
    [tempStartDate, tempEndDate]
  );

  // Filter receipts
  const filteredReceipts = useMemo(() => {
    const filtered = receipts.filter((receipt) => {
      if (!receipt?.id || !receipt?.created_at) {
        console.warn("Invalid receipt:", receipt);
        return false;
      }
      const receiptDate = new Date(receipt.created_at);
      const receiptStatus = receipt.status?.toLowerCase() || "";
      const tabStatus = activeTab.toLowerCase();

      const matchesStatus = tabStatus === "all" || receiptStatus === tabStatus;
      let matchesDate = true;
      if (startDate)
        matchesDate = matchesDate && receiptDate >= new Date(startDate.setHours(0, 0, 0, 0));
      if (endDate)
        matchesDate = matchesDate && receiptDate <= new Date(endDate.setHours(23, 59, 59, 999));

      return matchesStatus && matchesDate;
    });
    console.log("Filtered receipts:", filtered.length);
    return filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [receipts, activeTab, startDate, endDate]);

  // Calculate monthly spending
  const calculateMonthlySpending = useMemo(() => {
    const startOfMonth = new Date(spendingYear, spendingMonth, 1);
    const endOfMonth = new Date(spendingYear, spendingMonth + 1, 0, 23, 59, 59, 999);

    const acceptedReceipts = receipts.filter((receipt) => {
      if (!receipt?.id || !receipt?.created_at) return false;
      const receiptDate = new Date(receipt.created_at);
      return (
        receipt.status?.toLowerCase() === "accepted" &&
        receiptDate >= startOfMonth &&
        receiptDate <= endOfMonth
      );
    });

    const total = acceptedReceipts.reduce((sum, receipt) => {
      const amount = parseFloat(receipt.total_amount) || 0;
      return sum + amount;
    }, 0);
    return total.toFixed(2);
  }, [receipts, spendingMonth, spendingYear]);

  // Prepare FlatList data
  const flatData = useMemo(() => {
    const data = [];
    let lastDate = null;
    filteredReceipts.forEach((receipt) => {
      const dateKey = formatDate(receipt.created_at);
      if (dateKey !== lastDate) {
        data.push({ type: "separator", date: dateKey });
        lastDate = dateKey;
      }
      data.push({ type: "receipt", data: receipt });
    });
    return data;
  }, [filteredReceipts]);

  // Render spending summary
  const renderSpendingSummary = useCallback(() => {
    const totalSpending = calculateMonthlySpending;
    const monthName = new Date(spendingYear, spendingMonth).toLocaleString("en-US", { month: "short" });
    return (
      <Card style={styles.spendingCard}>
        <View style={styles.spendingHeader}>
          <Text style={styles.spendingTitle}>
            {monthName} {spendingYear} Spending
          </Text>
          <TouchableOpacity
            style={styles.monthButton}
            onPress={() => {
              console.log("Month button pressed, setting monthPickerVisible to true");
              setMonthPickerVisible(true);
            }}
          >
            <Ionicons name="calendar-outline" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
        <Text style={styles.spendingAmount}>₦{totalSpending}</Text>
      </Card>
    );
  }, [calculateMonthlySpending, spendingMonth, spendingYear]);

  // Render month picker modal
  const renderMonthPickerModal = useCallback(() => {
    console.log("Rendering month picker modal, visible:", monthPickerVisible);
    return (
      <Modal
        visible={monthPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          console.log("Closing month picker modal");
          setMonthPickerVisible(false);
        }}
      >
        <StatusBar barStyle="dark-content" backgroundColor="rgba(0, 0, 0, 0.4)" />
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Month and Year</Text>
            <Picker
              selectedValue={spendingMonth}
              onValueChange={(value) => {
                console.log("Month selected:", value);
                setSpendingMonth(value);
              }}
              style={styles.picker}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <Picker.Item
                  key={i}
                  label={new Date(2025, i).toLocaleString("en-US", { month: "long" })}
                  value={i}
                />
              ))}
            </Picker>
            <Picker
              selectedValue={spendingYear}
              onValueChange={(value) => {
                console.log("Year selected:", value);
                setSpendingYear(value);
              }}
              style={styles.picker}
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((year) => (
                <Picker.Item key={year} label={`${year}`} value={year} />
              ))}
            </Picker>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => {
                  console.log("Applying month/year selection:", spendingMonth, spendingYear);
                  setMonthPickerVisible(false);
                }}
              >
                <LinearGradient colors={["#2563EB", "#10B981"]} style={styles.buttonGradient}>
                  <Text style={styles.buttonText}>Apply</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  console.log("Resetting month/year");
                  setSpendingMonth(new Date().getMonth());
                  setSpendingYear(new Date().getFullYear());
                  setMonthPickerVisible(false);
                }}
              >
                <Text style={styles.clearButtonText}>Reset</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }, [monthPickerVisible, spendingMonth, spendingYear]);

  // Render navigation bar
  const renderNavBar = useCallback(() => (
    <View style={styles.navBar}>
      <View style={styles.navBarInner}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.navButton, activeTab === tab && styles.activeNavButton]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[styles.navButtonText, activeTab === tab && styles.activeNavButtonText]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {tab}
            </Text>
            {activeTab === tab && (
              <LinearGradient colors={["#2563EB", "#10B981"]} style={styles.underline} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  ), [activeTab]);

  // Render filter modal
  const renderFilterModal = useCallback(() => (
    <Modal
      visible={filterModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        console.log("Closing filter modal");
        setFilterModalVisible(false);
        setPickerVisible(false);
        setTempStartDate(startDate); // Reset temporary dates
        setTempEndDate(endDate);
      }}
    >
      <StatusBar barStyle="dark-content" backgroundColor="rgba(0, 0, 0, 0.4)" />
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Filter by Date</Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => showDatePicker("start")}
          >
            <Text style={styles.dateInputText}>
              {tempStartDate ? formatDate(tempStartDate.toISOString()) : "Start Date"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => showDatePicker("end")}
          >
            <Text style={styles.dateInputText}>
              {tempEndDate ? formatDate(tempEndDate.toISOString()) : "End Date"}
            </Text>
          </TouchableOpacity>
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={handleApplyFilters}
            >
              <LinearGradient colors={["#2563EB", "#10B981"]} style={styles.buttonGradient}>
                <Text style={styles.buttonText}>Apply</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                console.log("Clearing date filters");
                setTempStartDate(null);
                setTempEndDate(null);
                setStartDate(null);
                setEndDate(null);
                setFilterModalVisible(false);
                setPickerVisible(false);
              }}
            >
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
        {pickerVisible && (
          <DatePicker
            date={tempDate}
            mode="date"
            maximumDate={new Date()}
            onDateChange={handleDateChange}
            textColor="#1F2A44"
            style={styles.dateTimePicker}
          />
        )}
      </View>
    </Modal>
  ), [
    filterModalVisible,
    tempStartDate,
    tempEndDate,
    pickerVisible,
    tempDate,
    handleDateChange,
    showDatePicker,
    handleApplyFilters,
  ]);

  // Render FlatList item
  const renderItem = useCallback(
    ({ item }) => {
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
      return <ReceiptCard item={item} handleAction={handleAction} />;
    },
    [handleAction]
  );

  // FlatList item layout for performance
  const getItemLayout = useCallback((data, index) => {
    const isSeparator = data && data[index]?.type === "separator";
    const length = isSeparator ? 36 : 180;
    return { length, offset: length * index, index };
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.navigate("(tabs)/account")} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Customer Receipts</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={fetchReceipts}
          >
            <Ionicons name="refresh-outline" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Customer Receipts</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={fetchReceipts}
        >
          <Ionicons name="refresh-outline" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        {renderSpendingSummary()}
        {renderNavBar()}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => {
              console.log("Filter button pressed, setting filterModalVisible to true");
              setTempStartDate(startDate); // Initialize temp dates
              setTempEndDate(endDate);
              setFilterModalVisible(true);
            }}
          >
            <Ionicons name="filter-outline" size={18} color="#FFF" />
          </TouchableOpacity>
          {(startDate || endDate) && (
            <Text style={styles.filterInfoText} numberOfLines={1}>
              {startDate ? formatDate(startDate.toISOString()) : "Start"} -{" "}
              {endDate ? formatDate(endDate.toISOString()) : "End"}
            </Text>
          )}
        </View>
        {flatData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={48} color="#6B7280" />
            <Text style={styles.emptyText}>No Receipts</Text>
          </View>
        ) : (
          <FlatList
            data={flatData}
            keyExtractor={(item, index) =>
              item.type === "separator" ? `sep-${item.date}-${index}` : `rec-${item.data.id}`
            }
            renderItem={renderItem}
            contentContainerStyle={styles.flatListContent}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={21}
            getItemLayout={getItemLayout}
          />
        )}
        {renderFilterModal()}
        {renderMonthPickerModal()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    fontFamily: "System",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#2563EB",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFF",
    flex: 1,
    textAlign: "center",
    fontFamily: "System",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  spendingCard: {
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#FFF",
    marginBottom: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
  },
  spendingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  spendingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2A44",
    fontFamily: "System",
  },
  spendingAmount: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2563EB",
    marginVertical: 4,
    fontFamily: "System",
  },
  monthButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#2563EB",
  },
  navBar: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
  },
  navBarInner: {
    flex: 1,
    flexDirection: "row",
  },
  navButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
    maxWidth: SCREEN_WIDTH / 6,
  },
  activeNavButton: {
    backgroundColor: "#EFF6FF",
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    fontFamily: "System",
  },
  activeNavButtonText: {
    color: "#2563EB",
  },
  underline: {
    height: 3,
    width: "80%",
    marginTop: 4,
    borderRadius: 2,
  },
  filterContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  filterButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#2563EB",
    marginRight: 8,
  },
  filterInfoText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    fontFamily: "System",
    flex: 1,
    textAlign: "right",
  },
  dateHeader: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 6,
    marginTop: 8,
  },
  dateHeaderText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2A44",
    fontFamily: "System",
  },
  dateHeaderUnderline: {
    height: 2,
    borderRadius: 1,
    marginTop: 2,
  },
  card: {
    marginBottom: 12,
    marginHorizontal: 4,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  cardTouchable: {
    borderRadius: 12,
  },
  cardBackground: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "rgba(203, 213, 225, 0.3)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  image: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#2563EB",
    marginRight: 8,
  },
  cardDetails: {
    flex: 1,
  },
  receiptId: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1F2A44",
    fontFamily: "System",
  },
  receiptInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  receiptText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
    fontFamily: "System",
  },
  statusContainer: {
    marginTop: 4,
  },
  statusChip: {
    borderRadius: 16,
    maxWidth: 120,
    paddingHorizontal: 8,
  },
  statusText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 14,
    marginLeft: 4,
    fontFamily: "System",
  },
  divider: {
    marginVertical: 6,
    backgroundColor: "rgba(229, 231, 235, 0.5)",
  },
  buttonContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionButton: {
    borderRadius: 8,
  },
  rejectButton: {
    backgroundColor: "transparent",
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFF",
    marginLeft: 4,
    fontFamily: "System",
    alignSelf: "center",
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 20,
    width: SCREEN_WIDTH * 0.9,
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2A44",
    textAlign: "center",
    marginBottom: 16,
    fontFamily: "System",
  },
  dateInput: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
    marginBottom: 12,
  },
  dateInputText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#374151",
    fontFamily: "System",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  applyButton: {
    flex: 1,
    borderRadius: 10,
  },
  clearButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
  },
  buttonGradient: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFF",
    fontFamily: "System",
  },
  clearButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2563EB",
    textAlign: "center",
    fontFamily: "System",
  },
  dateTimePicker: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    alignSelf: "center",
    marginVertical: 10,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  picker: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    marginBottom: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 8,
    fontFamily: "System",
  },
  flatListContent: {
    paddingBottom: 80,
  },
});

export default CustomerReceipts;