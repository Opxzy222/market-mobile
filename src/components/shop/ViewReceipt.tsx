import React from "react";
import { Alert } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Button } from "react-native-paper"; // Importing Button from react-native-paper

const ViewReceiptPDF = ({ pdf_url }) => {
  const viewReceipt = async () => {
    if (!pdf_url) {
      Alert.alert("Error", "No PDF URL provided");
      return;
    }
    try {
      await WebBrowser.openBrowserAsync(pdf_url);
    } catch (error) {
      console.error("Error opening receipt:", error);
      Alert.alert("Error", "Failed to open the receipt.");
    }
  };

  return (
    <Button mode="outlined" icon="eye" onPress={viewReceipt}>
      View
    </Button>
  );
};

export default ViewReceiptPDF;
