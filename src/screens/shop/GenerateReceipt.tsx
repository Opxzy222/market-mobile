import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  ActivityIndicator,
  FlatList,
  Alert,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  StatusBar,
  Linking,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from '../../api';
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { getFullUrl } from "../../utils/imageUtils";
import SubscriptionRequiredModal from "../../components/RequiredSubscription";

const GenerateReceipt = () => {
  const [customerName, setCustomerName] = useState("");
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({ name: "", qty: "", price: "" });
  const [totalAmount, setTotalAmount] = useState(0);
  const [receiptData, setReceiptData] = useState({ pdfUrl: null, imageUrls: [], receipt_id: null });
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [shopProducts, setShopProducts] = useState([]);
  const [nameLoading, setNameLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editIndex, setEditIndex] = useState(null);

  // Subscription state from AsyncStorage
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  // Modal visibility state
  const [showModal, setShowModal] = useState(false);

  const params = useLocalSearchParams();
  const { shopId, senderId } = params;
  const router = useRouter();

  const [customerId, setCustomerId] = useState(senderId || "");

  const isSubscribed = useMemo(() => {
    return subscriptionStatus === "standard" || subscriptionStatus === "premium";
  }, [subscriptionStatus]);

  // Refs for TextInputs
  const customerIdRef = useRef(null);
  const itemNameRef = useRef(null);
  const qtyRef = useRef(null);
  const priceRef = useRef(null);

  // ────── Load subscription from AsyncStorage ──────
  useEffect(() => {
    const loadSubscription = async () => {
      try {
        const cache = await AsyncStorage.getItem("subscription_cache");
        if (cache) {
          const parsed = JSON.parse(cache);
          setSubscriptionStatus(parsed.plan?.toLowerCase() || null);
        } else {
          setSubscriptionStatus(null);
        }
      } catch (error) {
        console.error("Failed to load subscription_cache:", error);
        setSubscriptionStatus(null);
      } finally {
        setSubscriptionLoading(false);
      }
    };

    loadSubscription();
  }, []);

  // ────── Control Modal Visibility ──────
  useEffect(() => {
    if (!subscriptionLoading && !isSubscribed && items.length > 0) {
      setShowModal(true);
    } else {
      setShowModal(false);
    }
  }, [subscriptionLoading, isSubscribed, items.length]);

  // ────── Fetch Shop Products ──────
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await api.get(`/shop/${shopId}/products/`);
        setShopProducts(response.data.shop_products || []);
      } catch (error) {
        console.error("Error fetching shop products:", error);
        Alert.alert("Error", "Failed to fetch shop products.");
      }
    };
    fetchProducts();
  }, [shopId]);

  // ────── Fetch Customer Name on ID Change ──────
  useEffect(() => {
    if (customerId.length === 8) {
      fetchCustomerName(customerId);
    } else if (customerId.length < 8) {
      setCustomerName("");
    }
  }, [customerId]);

  const fetchCustomerName = async (id) => {
    setNameLoading(true);
    try {
      const response = await api.get("/customer-fullname/", {
        params: { customer_id: id },
      });
      setCustomerName(response.data.full_name || "");
    } catch (error) {
      console.error("Error fetching customer name:", error);
      Alert.alert("Error", "Customer not found.");
      setCustomerName("");
    } finally {
      setNameLoading(false);
    }
  };

  const calculateTotal = (itemsList) => {
    const total = itemsList.reduce((sum, item) => sum + Number(item.total || 0), 0);
    setTotalAmount(total);
  };

  const removeItem = (index) => {
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
    calculateTotal(updatedItems);
  };

  const editItem = (index) => {
    const itemToEdit = items[index];
    setNewItem({
      name: itemToEdit.name || "",
      qty: itemToEdit.qty.toString() || "",
      price: itemToEdit.price.toString() || "",
    });
    setEditIndex(index);
    itemNameRef.current?.focus();
  };

  const addItem = () => {
    if (!newItem.name || !newItem.qty || !newItem.price) {
      Alert.alert("Error", "Please fill all item fields.");
      return;
    }

    const qty = Number(newItem.qty);
    const price = Number(newItem.price);
    if (isNaN(qty) || isNaN(price) || qty <= 0 || price <= 0) {
      Alert.alert("Error", "Please enter valid positive quantity and price.");
      return;
    }

    const total = (qty * price).toFixed(2);
    const updatedItems = [...items];

    if (editIndex !== null) {
      updatedItems[editIndex] = { ...newItem, qty, price, total };
      setEditIndex(null);
    } else {
      updatedItems.push({ ...newItem, qty, price, total });
    }

    setItems(updatedItems);
    calculateTotal(updatedItems);
    setNewItem({ name: "", qty: "", price: "" });
    Keyboard.dismiss();
  };

  const handleSearch = (text) => {
    if (text.length > 0) {
      const filtered = shopProducts.filter((product) =>
        product.toLowerCase().startsWith(text.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts([]);
    }
  };

  const selectProduct = (product) => {
    setNewItem({ ...newItem, name: product });
    setFilteredProducts([]);
    qtyRef.current?.focus();
  };

  const generateReceipt = async () => {
    if (!customerName || items.length === 0 || !totalAmount) {
      Alert.alert("Error", "All fields are required!");
      return;
    }

    if (isGenerating || subscriptionLoading) return;

    setIsGenerating(true);
    try {
      const formData = new FormData();
      formData.append("shop_id", shopId);
      formData.append("customer_name", customerName);
      formData.append("items", JSON.stringify({ items }));
      formData.append("total_amount", totalAmount.toString());
      formData.append("customer_id", customerId);

      const response = await api.post("/generate-receipt/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const { pdf_url, image_urls, receipt_id } = response.data;
      setReceiptData({
        pdfUrl: getFullUrl(pdf_url),
        imageUrls: image_urls.map(url => getFullUrl(url)),
        receipt_id,
      });
      Alert.alert("Success", `Receipt ${receipt_id} generated successfully!`);
    } catch (error) {
      console.error("Error generating receipt:", error);
      Alert.alert("Error", "Could not generate receipt");
    } finally {
      setIsGenerating(false);
    }
  };

  const openReceipt = async () => {
    if (receiptData.pdfUrl) {
      try {
        await Linking.openURL(receiptData.pdfUrl);
      } catch (error) {
        console.error("Error opening receipt:", error);
        Alert.alert("Error", "Failed to open receipt.");
      }
    }
  };

  // Memoized filtered products
  const filteredProductsMemo = useMemo(() => {
    if (newItem.name.length > 0) {
      return shopProducts.filter((product) =>
        product.toLowerCase().startsWith(newItem.name.toLowerCase())
      );
    }
    return [];
  }, [newItem.name, shopProducts]);

  // Memoized Header
  const renderHeader = useMemo(
    () => (
      <View style={styles.card}>
        <View>
          <View style={styles.inputContainer}>
            <TextInput
              ref={customerIdRef}
              style={styles.input}
              placeholder="Customer ID"
              placeholderTextColor="#5A5A5A"
              value={customerId}
              keyboardType="numeric"
              maxLength={8}
              onChangeText={setCustomerId}
              returnKeyType="next"
              onSubmitEditing={() => itemNameRef.current?.focus()}
            />
            {nameLoading && <ActivityIndicator size="small" color="#007BFF" />}
          </View>

          <TextInput
            style={styles.disabledInput}
            placeholder="Customer Name"
            placeholderTextColor="#5A5A5A"
            value={customerName}
            editable={false}
          />

          <View style={styles.itemInputRow}>
            <TextInput
              ref={itemNameRef}
              style={[styles.itemInput, styles.itemsInput]}
              placeholder="Item Name"
              placeholderTextColor="#5A5A5A"
              value={newItem.name}
              onChangeText={(text) => {
                setNewItem({ ...newItem, name: text });
                handleSearch(text);
              }}
              returnKeyType="next"
              onSubmitEditing={() => qtyRef.current?.focus()}
            />
            <TextInput
              ref={qtyRef}
              style={[styles.itemInput, styles.qtyInput]}
              placeholder="Qty"
              placeholderTextColor="#5A5A5A"
              keyboardType="numeric"
              value={newItem.qty}
              onChangeText={(text) => setNewItem({ ...newItem, qty: text })}
              returnKeyType="next"
              onSubmitEditing={() => priceRef.current?.focus()}
            />
            <TextInput
              ref={priceRef}
              style={[styles.itemInput, styles.priceInput]}
              placeholder="Price"
              placeholderTextColor="#5A5A5A"
              keyboardType="numeric"
              value={newItem.price}
              onChangeText={(text) => setNewItem({ ...newItem, price: text })}
              returnKeyType="done"
              onSubmitEditing={addItem}
            />
          </View>

          {filteredProductsMemo.length > 0 && (
            <View style={styles.suggestionContainer}>
              <FlatList
                data={filteredProductsMemo}
                style={styles.suggestionsList}
                keyExtractor={(_, index) => index.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.suggestion}
                    onPress={() => selectProduct(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.suggestionText}>{item}</Text>
                  </TouchableOpacity>
                )}
                keyboardShouldPersistTaps="always"
                nestedScrollEnabled
              />
            </View>
          )}

          <TouchableOpacity style={styles.button} onPress={addItem} activeOpacity={0.7}>
            <Text style={styles.buttonText}>
              {editIndex !== null ? "Update Item" : "Add Item"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    ),
    [
      customerId,
      customerName,
      newItem,
      filteredProductsMemo,
      nameLoading,
      editIndex,
    ]
  );

  // Memoized Content
  const renderContent = useMemo(
    () => (
      <View style={styles.card}>
        <FlatList
          data={items}
          keyExtractor={(_, index) => index.toString()}
          ListHeaderComponent={() => (
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.tableRowItem]}>Item</Text>
              <Text style={[styles.tableHeaderText, styles.tableRowQtyy]}>Qty</Text>
              <Text style={[styles.tableHeaderText, styles.tableRowPrice]}>Price</Text>
              <Text style={[styles.tableHeaderText, styles.tableRowTotal]}>Total</Text>
              <View style={styles.removeButton} />
            </View>
          )}
          renderItem={({ item, index }) => (
            <View style={styles.tableRow}>
              <Text style={[styles.tableRowText, styles.tableRowItem]}>
                {item.name || "N/A"}
              </Text>
              <Text style={[styles.tableRowText, styles.tableRowQty]}>
                {item.qty || "0"}
              </Text>
              <Text style={[styles.tableRowText, styles.tableRowPrice]}>
                ₦{item.price || "0"}
              </Text>
              <Text style={[styles.tableRowText, styles.tableRowTotal]}>
                ₦{Number(item.total || 0).toLocaleString(undefined, {
                  minimumFractionDigits: Number(item.total || 0) % 1 === 0 ? 0 : 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
              <TouchableOpacity
                onPress={() => editItem(index)}
                style={styles.removeButton}
                activeOpacity={0.7}
              >
                <MaterialIcons name="edit" size={18} color="#007BFF" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => removeItem(index)}
                style={styles.removeButton}
                activeOpacity={0.7}
              >
                <MaterialIcons name="delete" size={18} color="red" />
              </TouchableOpacity>
            </View>
          )}
          nestedScrollEnabled
          keyboardShouldPersistTaps="always"
        />

        <View style={styles.totalContainer}>
          <Text style={styles.totalText}>
            Total: ₦{Number(totalAmount || 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </Text>
        </View>

        <TouchableOpacity
          onPress={generateReceipt}
          style={[
            styles.primaryButton,
            (isGenerating || subscriptionLoading || !isSubscribed) && styles.disabledButton,
          ]}
          disabled={isGenerating || subscriptionLoading || !isSubscribed}
          activeOpacity={0.7}
        >
          {isGenerating ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={[styles.primaryButtonText, styles.loadingText]}>Generating...</Text>
            </View>
          ) : (
            <Text style={styles.primaryButtonText}>
              {subscriptionLoading ? "Checking Plan..." : "Generate Receipt"}
            </Text>
          )}
        </TouchableOpacity>

        {receiptData.pdfUrl && (
          <TouchableOpacity onPress={openReceipt} style={styles.button} activeOpacity={0.7}>
            <Text style={styles.buttonText}>View Receipt PDF</Text>
          </TouchableOpacity>
        )}

        {receiptData.imageUrls.length > 0 && (
          <View style={styles.imageContainer}>
            <Text style={styles.imageLabel}>Receipt Images</Text>
            <FlatList
              data={receiptData.imageUrls}
              keyExtractor={(_, index) => index.toString()}
              horizontal
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => Linking.openURL(item)}
                  style={styles.imagePreview}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: item }}
                    style={styles.image}
                    onError={(e) => console.error("Image load error:", e.nativeEvent.error)}
                  />
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>
    ),
    [
      items,
      totalAmount,
      receiptData,
      isGenerating,
      subscriptionLoading,
      isSubscribed,
    ]
  );

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
              <MaterialIcons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Generate Receipt</Text>
          </View>

          <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
            enabled
          >
            <FlatList
              data={[{ id: "content" }]}
              keyExtractor={(item) => item.id}
              renderItem={() => renderContent}
              ListHeaderComponent={renderHeader}
              contentContainerStyle={{ flexGrow: 1 }}
              keyboardShouldPersistTaps="always"
            />
          </KeyboardAvoidingView>

          {/* Subscription Modal */}
          <SubscriptionRequiredModal
            visible={showModal}
            onClose={() => setShowModal(false)}
          />
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

// ────── STYLES (Unchanged) ──────
const styles = StyleSheet.create({
  container: { flex: 1 },
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
  card: {
    flex: 1,
    padding: 16,
    backgroundColor: "#F7FAFC",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#DDD",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: "#333",
    paddingHorizontal: 10,
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  disabledInput: {
    height: 50,
    fontSize: 16,
    backgroundColor: "#E0E0E0",
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 12,
    color: "#6C757D",
    borderWidth: 1,
    borderColor: "#CCC",
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  itemInputRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  itemInput: {
    height: 50,
    fontSize: 16,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 10,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#DDD",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 3 },
      android: { elevation: 3 },
    }),
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  itemsInput: { flex: 1.4 },
  qtyInput: { flex: 0.6 },
  priceInput: { flex: 0.9 },
  button: {
    backgroundColor: "#007BFF",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 12,
    ...Platform.select({ android: { elevation: 3 } }),
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#17A2B8",
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  tableHeaderText: {
    fontSize: 14,
    color: "#fff",
    textAlign: "left",
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 8,
    marginBottom: 6,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 2 },
      android: { elevation: 2 },
    }),
  },
  tableRowText: {
    fontSize: 13,
    color: "#333",
    paddingHorizontal: 4,
    textAlign: "left",
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  tableRowItem: { flex: 1.3 },
  tableRowQty: { flex: 0.5, textAlign: "center" },
  tableRowQtyy: { flex: 0.5 },
  tableRowPrice: { flex: 1.3 },
  tableRowTotal: { flex: 1.5 },
  removeButton: { paddingHorizontal: 4 },
  totalContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#FFC107",
    borderRadius: 10,
    alignItems: "center",
  },
  totalText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  primaryButton: {
    backgroundColor: "#28A745",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 12,
    ...Platform.select({ android: { elevation: 3 } }),
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  disabledButton: { backgroundColor: "#6c757d", opacity: 0.7 },
  loadingContainer: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  loadingText: { marginLeft: 8 },
  suggestionContainer: {
    marginTop: 5,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DDD",
    maxHeight: 150,
    zIndex: 1000,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 3 },
    }),
  },
  suggestionsList: { paddingHorizontal: 10 },
  suggestion: { paddingVertical: 10, paddingHorizontal: 10, borderBottomWidth: 1, borderColor: "#EEE" },
  suggestionText: { fontSize: 14, color: "#333", fontFamily: Platform.OS === "ios" ? "System" : "Roboto" },
  imageContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  imageLabel: { fontSize: 16, fontWeight: "700", color: "#1F2937", marginBottom: 8 },
  imagePreview: { marginRight: 8 },
  image: { width: 100, height: 150, borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB" },
});

export default GenerateReceipt;