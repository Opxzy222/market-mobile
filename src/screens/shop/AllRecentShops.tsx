import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Modal, Platform
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams } from "expo-router";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import Ionicons from "react-native-vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInUp, ZoomIn } from "react-native-reanimated";
import { format, parseISO, isToday, isYesterday } from "date-fns";
import DatePicker from "react-native-date-picker";
import { getFullUrl } from "../../utils/imageUtils";
import { StyleSheet } from "react-native";

// Format date for display
const formatVisitedAt = (dateStr) => {
  if (!dateStr) return "N/A";
  try {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "dd MMM yyyy"); // e.g., "11 Sep 2025"
  } catch (e) {
    console.error("Error formatting visited_at date:", e);
    return "Unknown date";
  }
};

export default function AllRecentlyVisitedShops() {
  const [shops, setShops] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerType, setPickerType] = useState(null);
  const [tempDate, setTempDate] = useState(new Date());
  const router = useRouter();
  const params = useLocalSearchParams();
  const { prevRoute } = params;

  useEffect(() => {
    const fetchUserId = async () => {
      const sessionIdString = await AsyncStorage.getItem("sessionToken");
      setSessionId(sessionIdString);
    };
    fetchUserId();
  }, []);

  useEffect(() => {
    if (sessionId) {
      const fetchRecentlyVisitedShops = async () => {
        try {
          const response = await axios.get(
            "https://retail-alvinia-goza-f6a0e4f7.koyeb.app/shops/all-recently-visited/",
            {
              headers: {
                Authorization: sessionId,
              },
            }
          );
          const shopsData = response.data.recently_visited_shops;
          setShops(shopsData);
          shopsData.forEach((shop) => {
            if (shop.image) {
              Image.prefetch(getFullUrl(shop.image));
            }
          });
        } catch (error) {
          console.error("Error fetching recently visited shops:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchRecentlyVisitedShops();
    }
  }, [sessionId]);

  // Handle DatePicker change
  const handleDateChange = useCallback(
    (selectedDate) => {
      setPickerVisible(false);
      if (!selectedDate || isNaN(selectedDate.getTime())) {
        setPickerType(null);
        return;
      }
      if (pickerType === "start") {
        if (endDate && selectedDate > endDate) {
          alert("Invalid Date: Start date cannot be after end date.");
          return;
        }
        setStartDate(selectedDate);
      } else if (pickerType === "end") {
        if (startDate && selectedDate < startDate) {
          alert("Invalid Date: End date cannot be before start date.");
          return;
        }
        setEndDate(selectedDate);
      }
      setPickerType(null);
    },
    [pickerType, startDate, endDate]
  );

  // Show DatePicker
  const showDatePicker = useCallback(
    (type) => {
      setPickerType(type);
      setTempDate(
        type === "start" && startDate
          ? startDate
          : type === "end" && endDate
          ? endDate
          : new Date()
      );
      setPickerVisible(true);
    },
    [startDate, endDate]
  );

  // Filter and sort shops
  const filteredShops = useMemo(() => {
    return shops
      .filter((shop) => {
        if (!shop?.id || !shop?.visited_at) return false;
        const visitDate = parseISO(shop.visited_at);
        let matchesDate = true;
        if (startDate)
          matchesDate =
            matchesDate && visitDate >= new Date(startDate.setHours(0, 0, 0, 0));
        if (endDate)
          matchesDate =
            matchesDate &&
            visitDate <= new Date(endDate.setHours(23, 59, 59, 999));
        return matchesDate;
      })
      .sort((a, b) => new Date(b.visited_at) - new Date(a.visited_at));
  }, [shops, startDate, endDate]);

  // Prepare FlatList data with date separators
  const flatData = useMemo(() => {
    const data = [];
    let lastDate = null;
    filteredShops.forEach((shop) => {
      const dateKey = formatVisitedAt(shop.visited_at);
      if (dateKey !== lastDate) {
        data.push({ type: "separator", date: dateKey });
        lastDate = dateKey;
      }
      data.push({ type: "shop", data: shop });
    });
    return data;
  }, [filteredShops]);

  // Render filter modal
  const renderFilterModal = () => (
    <Modal
      visible={filterModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        setFilterModalVisible(false);
        setPickerVisible(false);
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Filter by Visit Date</Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => showDatePicker("start")}
          >
            <Text style={styles.dateInputText}>
              {startDate ? formatVisitedAt(startDate.toISOString()) : "Start Date"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => showDatePicker("end")}
          >
            <Text style={styles.dateInputText}>
              {endDate ? formatVisitedAt(endDate.toISOString()) : "End Date"}
            </Text>
          </TouchableOpacity>
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setFilterModalVisible(false)}
            >
              <LinearGradient
                colors={["#3B82F6", "#1D4ED8"]}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>Apply</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
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
            style={styles.datePicker}
          />
        )}
      </View>
    </Modal>
  );

  // Render FlatList item
  const renderItem = ({ item, index }) => {
    if (item.type === "separator") {
      return (
        <Animated.View entering={FadeInUp.delay(index * 100).duration(300)}>
          <View style={styles.dateHeader}>
            <Text style={styles.dateHeaderText}>{item.date}</Text>
            <LinearGradient
              colors={["#3B82F6", "#1D4ED8"]}
              style={styles.dateHeaderUnderline}
            />
          </View>
        </Animated.View>
      );
    }
    return (
      <Animated.View entering={FadeInUp.delay(index * 100).duration(300)}>
        <TouchableOpacity
          style={styles.shopCard}
          activeOpacity={0.9}
          onPress={() =>
            router.push({ pathname: "/shop/shop-page", params: { shopId: item.data.id } })
          }
        >
          <View style={styles.imageContainer}>
            {item.data.image ? (
              <Image
                source={{ uri: getFullUrl(item.data.image) }}
                style={styles.shopImage}
                resizeMode="cover"
                onError={(e) =>
                  console.error(`Image load error for shop ${item.data.id}:`, e.nativeEvent.error)
                }
              />
            ) : (
              <LinearGradient
                colors={["#E5E7EB", "#D1D5DB"]}
                style={[styles.shopImage, styles.placeholderImage]}
              >
                <MaterialIcons name="store" size={40} color="#6B7280" />
              </LinearGradient>
            )}
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.7)"]}
              style={styles.imageGradient}
            />
            <View style={styles.shopNameContainer}>
              <Text style={styles.shopNameOverlay}>{item.data.name}</Text>
            </View>
          </View>
          <View style={styles.shopContent}>
            <View style={styles.shopInfo}>
              <Text style={styles.shopAddress} numberOfLines={2}>
                {item.data.address}
              </Text>
              <Text style={styles.visitedAt}>
                Visited: {formatVisitedAt(item.data.visited_at)}
              </Text>
              <Text style={styles.shopDescription} numberOfLines={2}>
                {item.data.description}
              </Text>
            </View>
            <Animated.View entering={ZoomIn.delay(index * 100 + 200).duration(200)}>
              {/* Uncomment if you want to restore the Visit button */}
              {/* <TouchableOpacity style={styles.visitButton} activeOpacity={0.7}>
                <LinearGradient
                  colors={["#22C55E", "#15803D"]}
                  style={styles.buttonGradient}
                >
                  <MaterialIcons name="storefront" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Visit</Text>
                </LinearGradient>
              </TouchableOpacity> */}
            </Animated.View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // FlatList item layout for performance
  const getItemLayout = useCallback(
    (data, index) => {
      const isSeparator = data[index]?.type === "separator";
      const length = isSeparator ? 40 : 220; // Adjust based on actual heights
      return { length, offset: length * index, index };
    },
    []
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor="#3B82F6" />
      <LinearGradient
        colors={["#3B82F6", "#1D4ED8"]}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => router.navigate("(tabs)/shop")}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recently Visited Space</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>
      <LinearGradient
        colors={["#F8FAFC", "#E2E8F0"]}
        style={styles.wrapper}
      >
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setFilterModalVisible(true)}
          >
            <LinearGradient
              colors={["#3B82F6", "#1D4ED8"]}
              style={styles.filterButtonGradient}
            >
              <Ionicons name="filter-outline" size={20} color="#fff" />
              <Text style={styles.filterButtonText}>Filter</Text>
            </LinearGradient>
          </TouchableOpacity>
          {(startDate || endDate) && (
            <Text style={styles.filterInfoText}>
              {startDate ? formatVisitedAt(startDate.toISOString()) : "Start"} -{" "}
              {endDate ? formatVisitedAt(endDate.toISOString()) : "End"}
            </Text>
          )}
        </View>
        {loading ? (
          <LinearGradient
            colors={["#F8FAFC", "#E2E8F0"]}
            style={styles.loaderContainer}
          >
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loaderText}>
              Loading your recently visited shops...
            </Text>
          </LinearGradient>
        ) : flatData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="store" size={48} color="#6B7280" />
            <Text style={styles.noDataText}>No recently visited shops yet.</Text>
            <Text style={styles.noDataSubText}>
              Explore shops to start building your visit history!
            </Text>
          </View>
        ) : (
          <FlatList
            data={flatData}
            renderItem={renderItem}
            keyExtractor={(item, index) =>
              item.type === "separator"
                ? `sep-${item.date}-${index}`
                : `shop-${item.data.id}`
            }
            contentContainerStyle={styles.listContainer}
            initialNumToRender={10}
            windowSize={21}
            showsVerticalScrollIndicator={false}
            getItemLayout={getItemLayout}
          />
        )}
        {renderFilterModal()}
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    flex: 1,
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "Roboto",
  },
  headerSpacer: {
    width: 40, // Adjusted to balance layout
  },
  wrapper: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  filterContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  filterButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 12,
  },
  filterButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  filterButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "Roboto",
  },
  filterInfoText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
    textAlign: "right",
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "Roboto",
  },
  listContainer: {
    paddingBottom: 100,
  },
  dateHeader: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  dateHeaderText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "Roboto",
  },
  dateHeaderUnderline: {
    height: 2,
    borderRadius: 1,
    marginTop: 4,
  },
  shopCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 4, height: 4 },
    elevation: 6,
    shadowColor: "#FFFFFF",
    shadowOffset: { width: -4, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  imageContainer: {
    position: "relative",
    height: 140,
  },
  shopImage: {
    width: "100%",
    height: "100%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  placeholderImage: {
    justifyContent: "center",
    alignItems: "center",
  },
  imageGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  shopNameContainer: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  shopNameOverlay: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "left",
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "Roboto",
  },
  shopContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  shopInfo: {
    flex: 1,
    paddingRight: 12,
  },
  shopAddress: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
    marginBottom: 6,
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "Roboto",
  },
  visitedAt: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 6,
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "Roboto",
  },
  shopDescription: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "Roboto",
  },
  visitButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "Roboto",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loaderText: {
    marginTop: 12,
    fontSize: 16,
    color: "#3B82F6",
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "Roboto",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  noDataText: {
    fontSize: 18,
    color: "#1F2937",
    fontWeight: "700",
    marginTop: 16,
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "Roboto",
  },
  noDataSubText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 8,
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "Roboto",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: "90%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 16,
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "Roboto",
  },
  dateInput: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  dateInputText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "Roboto",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  applyButton: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  clearButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  buttonGradient: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "Roboto",
  },
  clearButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#3B82F6",
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "Roboto",
  },
  datePicker: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    alignSelf: "center",
    marginVertical: 10,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
});