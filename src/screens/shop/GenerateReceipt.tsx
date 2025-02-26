import React, { useState, useEffect } from "react";
import { 
  View, Text, TextInput, ActivityIndicator, FlatList, Alert, TouchableOpacity, StyleSheet, Platform
} from "react-native";
import axios from "axios";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useLocalSearchParams } from 'expo-router';

const GenerateReceipt = () => {
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({ name: "", qty: "", price: "" });
  const [totalAmount, setTotalAmount] = useState("0");
  const [receiptUrl, setReceiptUrl] = useState(null);

  const params = useLocalSearchParams();
  const { shopId } = params;

  useEffect(() => {
    if (customerId.length === 7) {
      fetchCustomerName(customerId);
    }
  }, [customerId]);

  const fetchCustomerName = async (customerId) => {
    setLoading(true);
    try {
      const response = await axios.get("https://172.27.243.94:8000/customer-fullname/", {
        params: { customer_id: customerId },
      });
      setCustomerName(response.data.full_name);
    } catch (error) {
      Alert.alert("Error", "Customer not found.");
      setCustomerName("");
    }
    setLoading(false);
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
          maxLength={7}
          onChangeText={setCustomerId}
        />
        {loading && <ActivityIndicator size="small" color="#007BFF" />}
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
          onChangeText={(text) => setNewItem({ ...newItem, name: text })}
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

      <TouchableOpacity style={styles.button} onPress={addItem}>
        <Text style={styles.buttonText}>Add Item</Text>
      </TouchableOpacity>

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={styles.tableHeaderText}>Item</Text>
        <Text style={styles.tableHeaderText}>Qty</Text>
        <Text style={styles.tableHeaderText}>Unit Price</Text>
        <Text style={styles.tableHeaderText}>Total</Text>
      </View>

      {/* Items List */}
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

      {/* Generate Receipt Button */}
            <TouchableOpacity onPress={generateReceipt} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Generate Receipt</Text>
            </TouchableOpacity>
      
            {/* Show Receipt Link */}
            {receiptUrl && (
              <TouchableOpacity onPress={() => Alert.alert("Download", "Opening Receipt...")} style={styles.button}>
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
});


export default GenerateReceipt;
