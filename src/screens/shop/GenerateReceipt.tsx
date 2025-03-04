import React, { useState, useEffect, useContext, useMemo  } from "react";
import { 
  View, Text, TextInput, ActivityIndicator, FlatList, Alert, TouchableOpacity, StyleSheet, Platform 
} from "react-native";
import axios from "axios";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useLocalSearchParams, useRouter } from 'expo-router';
import SubscriptionProvider, { SubscriptionContext } from '../../components/SubscriptionProvider';
import SubscriptionRequired from "@/components/RequiredSubscription";

const GenerateReceipt = () => {
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({ name: "", qty: "", price: "" });
  const [totalAmount, setTotalAmount] = useState("0");
  const [receiptUrl, setReceiptUrl] = useState(null);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [shopProducts, setShopProducts] = useState([]);
  const [NameLoading, setNameLoading] = useState(false);
  
  const params = useLocalSearchParams();
  const { shopId } = params;
  const router = useRouter();
  const { subscriptionStatus, loading } = useContext(SubscriptionContext);

  const isSubscribed = useMemo(() => {
    return subscriptionStatus === "standard" || subscriptionStatus === "premium";
  }, [subscriptionStatus]);

  useEffect(() => {
    if (customerId.length === 8) {
      fetchCustomerName(customerId);
    }
  }, [customerId]);

  // ✅ Ensure all hooks run before any return
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get(`https://172.27.243.94:8000/shop/${shopId}/products/`);
        setShopProducts(response.data.shop_products);
      } catch (error) {
        console.error("Error fetching shop products:", error);
      }
    };
    fetchProducts();
  }, [shopId]);

  // 🚀 Only return after hooks
  if (loading) {
    return <ActivityIndicator size="large" color="#007BFF" />;
  }

  if (!isSubscribed) {
    return <SubscriptionRequired />;
  }
  // Filter product names as user types
  const handleSearch = (text) => {
    setNewItem({ ...newItem, name: text });

    if (text.length > 0) {
      const filtered = shopProducts.filter((product) =>
        product.toLowerCase().startsWith(text.toLowerCase())
      );
      setFilteredProducts(filtered);
      console.log(filteredProducts, 'omo')
    } else {
      setFilteredProducts([]);
    }
  };

  // Set selected product name in input
  const selectProduct = (product) => {
    setNewItem({ ...newItem, name: product }); // Set item name
    setFilteredProducts([]); // Hide suggestions
  };

  const fetchCustomerName = async (customerId) => {
    setNameLoading(true);
    try {
      const response = await axios.get("https://172.27.243.94:8000/customer-fullname/", {
        params: { customer_id: customerId },
      });
      setCustomerName(response.data.full_name);
      console.log('yes oo', customerName)
    } catch (error) {
      Alert.alert("Error", "Customer not found.");
      setCustomerName("");
    }
    setNameLoading(false);
  };

  const addItem = () => {
    if (!newItem.name || !newItem.qty || !newItem.price) {
      Alert.alert("Error", "Please fill all item fields.");
      return;
    }
    const updatedItems = [...items, { 
      ...newItem, 
      qty: Number(newItem.qty), 
      price: Number(newItem.price),
      total: (Number(newItem.qty) * Number(newItem.price)).toFixed(2)
    }];
    setItems(updatedItems);
    setTotalAmount(updatedItems.reduce((sum, item) => sum + parseFloat(item.total), 0).toFixed(2));
    setNewItem({ name: "", qty: "", price: "" });
  };

  const generateReceipt = async () => {
    if (!customerName || items.length === 0 || !totalAmount) {
      Alert.alert("Error", "All fields are required!");
      return;
    }

    const formData = new FormData();
    formData.append("shop_id", shopId);
    formData.append("customer_name", customerName);
    formData.append("items", JSON.stringify(items));
    formData.append("total_amount", totalAmount);
    formData.append("customer_id", customerId);

    try {
      const response = await axios.post("https://172.27.243.94:8000/generate-receipt/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      if (response.data.template_url) {
        setReceiptUrl(response.data.template_url);
      } else {
        Alert.alert("Success", "Receipt generated! Downloading...");
        downloadReceipt(response.data);
      }
    } catch (error) {
      console.error("Error generating receipt:", error);
      Alert.alert("Error", "Could not generate receipt");
    }
  };

  const downloadReceipt = async (receiptData) => {
    if (!receiptData || !receiptData.pdf_content) {
      Alert.alert("Error", "Receipt file is missing or corrupted.");
      return;
    }

    const fileName = `receipt_₦{receiptData.id}.pdf`;

    if (Platform.OS === "web") {
      try {
        const byteCharacters = atob(receiptData.pdf_content.replace(/\s/g, ""));
        const byteNumbers = new Array(byteCharacters.length).fill(0).map((_, i) => byteCharacters.charCodeAt(i));
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        Alert.alert("Error", "Failed to download receipt.");
      }
    } else {
      const receiptUri = FileSystem.documentDirectory + fileName;
      try {
        await FileSystem.writeAsStringAsync(receiptUri, receiptData.pdf_content, {
          encoding: FileSystem.EncodingType.Base64,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(receiptUri);
        } else {
          Alert.alert("Receipt saved!", `Saved at: ₦{receiptUri}`);
        }
      } catch (error) {
        console.error("Error saving receipt:", error);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Generate Receipt</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Customer Profile ID"
          value={customerId}
          keyboardType="numeric"
          maxLength={8}
          onChangeText={setCustomerId}
        />
        {NameLoading && <ActivityIndicator size="small" color="#007BFF" />}
      </View>

      <TextInput
        style={styles.disabledInput}
        placeholder="Customer Name"
        value={customerName}
        editable={false}
      />

      {/* Item Input Fields */}
      <View style={styles.itemInputRow}>
        <TextInput
          style={styles.itemInput}
          placeholder="Item Name"
          value={newItem.name}
          onChangeText={(text) => {
            setNewItem({ ...newItem, name: text });
            handleSearch(text);
          }}
        />
        <TextInput
          style={[styles.itemInput, styles.qtyInput]}
          placeholder="Qty"
          keyboardType="numeric"
          value={newItem.qty}
          onChangeText={(text) => setNewItem({ ...newItem, qty: text })}
        />
        <TextInput
          style={[styles.itemInput, styles.priceInput]}
          placeholder="Price"
          keyboardType="numeric"
          value={newItem.price}
          onChangeText={(text) => setNewItem({ ...newItem, price: text })}
        />
      </View>

      {/* Product Suggestions */}
      {filteredProducts.length > 0 && (
        <FlatList
          data={filteredProducts}
          style={styles.suggestionsList}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.suggestion, { borderWidth: 0.5, borderColor: "gray", backgroundColor: "white" }]}
              onPress={() => selectProduct(item)}
            >
              <Text style={[styles.suggestionText, { color: "black" }]}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      <TouchableOpacity style={styles.button} onPress={addItem}>
        <Text style={styles.buttonText}>Add Item</Text>
      </TouchableOpacity>

      {/* Added Items */}
      <FlatList
        data={items}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.tableRow}>
            <Text style={styles.tableRowText}>{item.name}</Text>
            <Text style={styles.tableRowText}>{item.qty}</Text>
            <Text style={styles.tableRowText}>₦{item.price}</Text>
            <Text style={styles.tableRowText}>₦{item.total}</Text>
          </View>
        )}
      />

      <View style={styles.totalContainer}>
        <Text style={styles.totalText}>Total: ₦{totalAmount}</Text>
      </View>

      <TouchableOpacity onPress={generateReceipt} style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>Generate Receipt</Text>
      </TouchableOpacity>

      {receiptUrl && (
        <TouchableOpacity
          onPress={() => Alert.alert("Download", "Opening Receipt...")}
          style={styles.button}
        >
          <Text style={{ color: "white" }}>Download Receipt</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#F5F5F5",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#333",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 10, // Reduced padding
    elevation: 4,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    borderWidth: 1,  // Move border styling here
    borderColor: "#DDD",
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: "#333",
    borderRadius: 10,  // Can remove this if needed
    paddingHorizontal: 10, // Adjusted padding
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
  },
  itemInputRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  itemInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    borderRadius: 10,
    marginHorizontal: 5,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    borderWidth: 1,
    borderColor: "#DDD",
  },
  qtyInput: {
    width: 55,
  },
  priceInput: {
    width: 85,
  },
  button: {
    backgroundColor: "#007BFF",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 12,
    elevation: 4,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#17A2B8",
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
  },
  tableHeaderText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
    elevation: 3,
  },
  tableRowText: {
    fontSize: 14,
    color: "#333",
    flex: 1,
    textAlign: "center",
  },
  totalContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#FFC107",
    borderRadius: 10,
    alignItems: "center",
  },
  totalText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  primaryButton: {
    backgroundColor: "#28A745",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 12,
    elevation: 4,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  suggestionContainer: {
    position: "absolute",
    top: 100, // Adjust based on your layout
    left: 20,
    right: 20,
    backgroundColor: "#fff",
    borderRadius: 8,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: "red",
  },
  suggestion: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  suggestionText: {
    fontSize: 16,
    color: "black",
  },
});


export default (props) => (
  <SubscriptionProvider>
    <GenerateReceipt {...props} />
  </SubscriptionProvider>
);
